import fs from "node:fs";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv[3] !== "--confirm-original") throw Error("Indica el correo y --confirm-original para importar únicamente al propietario elegido.");
const targetEnv = dotenv.parse(fs.readFileSync(".env"));
const sourceEnv = dotenv.parse(fs.readFileSync("../Pancho Villa Cocina/.env"));
if (new URL(targetEnv.DATABASE_URL).pathname !== "/pancho_villa" || new URL(sourceEnv.DATABASE_URL).pathname !== "/pancho_villa_cocina") throw Error("Bases inesperadas; importación cancelada.");
const source = new PrismaClient({ datasourceUrl: sourceEnv.DATABASE_URL });
const target = new PrismaClient({ datasourceUrl: targetEnv.DATABASE_URL });
try {
  const owner = await source.kitchenOwner.findUnique({ where: { email }, include: { restaurants: true } });
  if (!owner?.active || owner.restaurants.length !== 1 || !owner.restaurants[0].active) throw Error("Propietario de origen inválido.");
  await target.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73419501)`;
    const existing = await tx.kitchenOwner.findUnique({ where: { email } });
    if (existing) {
      if (!existing.kitchenUserId) throw Error("La cuenta de destino requiere activación manual.");
      console.log("El propietario ya existe y está activado; no se sobrescribió.");
      return;
    }
    if (await tx.kitchenOwner.findFirst({ where: { kitchenUserId: { not: null } } })) throw Error("La instalación original ya está asignada a otro propietario.");
    const user = await tx.user.create({ data: { email: `kitchen-${randomUUID()}@internal.invalid`, role: "ADMIN", name: owner.name, firstName: owner.name, locale: "es", passwordHash: null } });
    await tx.kitchenOwner.create({ data: { email: owner.email, name: owner.name, passwordHash: owner.passwordHash, emailVerified: owner.emailVerified, kitchenUserId: user.id, restaurants: { create: { name: owner.restaurants[0].name } } } });
    console.log("Propietario importado y activado. Se conserva su contraseña; no se copiaron pedidos ni clientes.");
  });
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
