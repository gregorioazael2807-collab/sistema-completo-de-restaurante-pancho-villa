import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.pathname !== "/pancho_villa_cocina") {
    throw new Error("Este activador de pruebas solo permite pancho_villa_cocina.");
  }
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Uso: npx tsx scripts/activate-kitchen-owner.ts correo-del-propietario");
  await db.$transaction(async (tx) => {
    // Serializa activaciones: nunca enlazar dos propietarios a esta instalación.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73419501)`;
    const owner = await tx.kitchenOwner.findUnique({ where: { email }, include: { restaurants: true } });
    if (!owner?.active || owner.restaurants.length !== 1 || !owner.restaurants[0].active) {
      throw new Error("Debe existir un propietario activo con un solo restaurante activo.");
    }
    const bound = await tx.kitchenOwner.findFirst({ where: { kitchenUserId: { not: null } } });
    if (bound && bound.id !== owner.id) throw new Error("Esta copia ya pertenece a otro propietario. Usa otra instalación independiente.");
    if (owner.kitchenUserId) { console.log("La cuenta ya está activada."); return; }
    const user = await tx.user.create({
      data: {
        email: `kitchen-${randomUUID()}@internal.invalid`,
        name: owner.name,
        firstName: owner.name,
        role: "ADMIN",
        locale: "es",
        // No tiene contraseña de cliente: solo autentica el proveedor kitchen-owner.
        passwordHash: null,
      },
    });
    await tx.kitchenOwner.update({ where: { id: owner.id }, data: { kitchenUserId: user.id } });
    console.log("Propietario activado en la copia de cocina. La web original no se modificó.");
  });
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo activar.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
