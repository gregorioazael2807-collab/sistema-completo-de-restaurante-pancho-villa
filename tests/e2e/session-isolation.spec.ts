import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import "dotenv/config";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.pathname !== "/pancho_villa_cocina") throw new Error("Prueba permitida solo en la base independiente de cocina");
const db = new PrismaClient();
const suffix = randomUUID();
const password = `TemporalA1-${randomUUID()}`;
const ownerEmail = `owner-${suffix}@example.invalid`;
const clientEmail = `client-${suffix}@example.invalid`;
let ownerId: string;
let adminId: string;
let clientId: string;

test.beforeAll(async () => {
  const hash = await bcrypt.hash(password, 12);
  const admin = await db.user.create({ data: { email: `internal-${suffix}@internal.invalid`, role: "ADMIN", firstName: "Prueba", locale: "es" } });
  adminId = admin.id;
  const owner = await db.kitchenOwner.create({ data: { email: ownerEmail, name: "Propietario temporal", passwordHash: hash, kitchenUserId: adminId, restaurants: { create: { name: "Restaurante temporal" } } } });
  ownerId = owner.id;
  const client = await db.user.create({ data: { email: clientEmail, role: "CLIENTE", firstName: "Cliente temporal", passwordHash: hash, locale: "es" } });
  clientId = client.id;
});

test.afterAll(async () => {
  if (ownerId) {
    await db.kitchenRestaurant.deleteMany({ where: { ownerId } });
    await db.kitchenOwner.delete({ where: { id: ownerId } });
  }
  if (adminId) await db.user.delete({ where: { id: adminId } });
  if (clientId) await db.user.delete({ where: { id: clientId } });
  await db.$disconnect();
});

test("cliente y cocina mantienen sesiones independientes y permisos separados", async ({ page, context }) => {
  await page.goto("/cocina/login");
  await page.getByLabel("Correo del administrador").fill(ownerEmail);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar a las comandas" }).click();
  await expect(page).toHaveURL(/\/cocina$/);
  const kitchenPage = page;
  expect((await context.request.get("/api/kitchen/orders")).status()).toBe(200);
  expect((await context.request.get("/api/ai/orders")).status()).toBe(401);

  const clientPage = await context.newPage();
  await clientPage.goto("/login");
  await clientPage.getByLabel("Correo electrónico", { exact: true }).fill(clientEmail);
  await clientPage.getByLabel("Contraseña", { exact: true }).fill(password);
  await clientPage.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(clientPage).toHaveURL(/\/cuenta$/);
  await expect(clientPage.getByRole("link", { name: "Administración", exact: true })).toHaveCount(0);
  expect((await context.request.get("/api/ai/orders")).status()).toBe(200);
  expect((await context.request.get("/api/kitchen/orders")).status()).toBe(200);

  const cookies = await context.cookies();
  const sessionCookies = cookies.filter((cookie) => cookie.name.includes("session") && !cookie.name.includes("csrf") && !cookie.name.includes("callback"));
  expect(sessionCookies.some((cookie) => cookie.name.includes(".kitchen.session-token"))).toBe(true);
  expect(sessionCookies.some((cookie) => cookie.name.includes(".customer.session-token"))).toBe(true);

  await kitchenPage.reload();
  await kitchenPage.getByRole("button", { name: "Salir de cocina", exact: true }).click();
  await expect(kitchenPage).toHaveURL(/\/cocina\/login$/);
  expect((await context.request.get("/api/kitchen/orders")).status()).toBe(401);
  expect((await context.request.get("/api/admin/operations")).status()).toBe(401);
  expect((await context.request.get("/api/ai/orders")).status()).toBe(200);
  await clientPage.reload();
  await expect(clientPage).toHaveURL(/\/cuenta$/);

  await kitchenPage.getByLabel("Correo del administrador").fill(ownerEmail);
  await kitchenPage.getByLabel("Contraseña", { exact: true }).fill(password);
  await kitchenPage.getByRole("button", { name: "Entrar a las comandas" }).click();
  await expect(kitchenPage).toHaveURL(/\/cocina$/);
  await clientPage.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(clientPage).toHaveURL(/localhost:3005\/$/);
  expect((await context.request.get("/api/ai/orders")).status()).toBe(401);
  expect((await context.request.get("/api/kitchen/orders")).status()).toBe(200);
});
