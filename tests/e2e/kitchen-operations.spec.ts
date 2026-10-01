import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
const db = new PrismaClient();
test("checkout → private kitchen → dish → ready → dispatch → owner tracking; permissions and reconnect", async ({
  browser,
}) => {
  if (new URL(process.env.DATABASE_URL!).pathname !== "/pancho_villa_cocina")
    throw Error("Only independent kitchen database is allowed");
  const suffix = randomUUID();
  const ids: string[] = [];
  let ingredientId = "",
    stationId = "",
    categoryId = "",
    productId = "",
    orderId = "",
    publicId = "";
  const contexts: BrowserContext[] = [];
  const initialSettings = await db.restaurantSettings.findFirstOrThrow();
  async function actor(role: "ADMIN" | "COCINA" | "CLIENTE", label: string) {
    const user = await db.user.create({
      data: {
        email: `e2e-${label}-${suffix}@example.test`,
        firstName: label,
        locale: "es",
        role,
      },
    });
    ids.push(user.id);
    const context = await browser.newContext();
    contexts.push(context);
    const salt = process.env.AUTH_COOKIE_NAME ?? "authjs.session-token";
    const token = await encode({
      token: { sub: user.id, role, sessionVersion: 0 },
      secret: process.env.AUTH_SECRET!,
      salt,
    });
    await context.addCookies([
      {
        name: salt,
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    return { user, context };
  }
  try {
    await db.restaurantSettings.update({
      where: { id: initialSettings.id },
      data: { acceptingOrders: true, serviceMode: "LEGACY" },
    });
    const admin = await actor("ADMIN", "admin"),
      cook = await actor("COCINA", "cook"),
      owner = await actor("CLIENTE", "owner"),
      foreign = await actor("CLIENTE", "foreign");
    const i = await db.ingredient.create({
      data: {
        name: `E2E ingredient ${suffix}`,
        unit: "g",
        stock: 1000,
        minimum: 10,
        unitCostCents: 1,
      },
    });
    ingredientId = i.id;
    const s = await db.kitchenStation.create({
      data: { name: `E2E station ${suffix}`, capacity: 2 },
    });
    stationId = s.id;
    const c = await db.category.create({
      data: { slug: `e2e-${suffix}`, name: "Test category" },
    });
    categoryId = c.id;
    const p = await db.product.create({
      data: {
        categoryId,
        slug: `e2e-${suffix}`,
        name: "E2E taco",
        description: "Test",
        ingredients: ["corn"],
        allergens: ["milk"],
        price: 10,
        recipe: {
          create: {
            stationId,
            minMinutes: 5,
            maxMinutes: 8,
            ingredients: { create: { ingredientId, quantity: 100 } },
          },
        },
      },
    });
    productId = p.id;
    for (const path of [
      "/api/kitchen/orders",
      "/api/kitchen/stream",
      "/api/admin/operations",
      "/api/admin/sales",
    ])
      expect(
        (
          await owner.context.request.get("http://localhost:3005" + path)
        ).status(),
        path,
      ).toBe(403);
    expect(
      (
        await owner.context.request.post(
          "http://localhost:3005/api/kitchen/shift",
          { data: { action: "OPEN" } },
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await owner.context.request.patch(
          "http://localhost:3005/api/kitchen/items/fake",
          { data: { requestId: randomUUID(), status: "READY" } },
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await cook.context.request.get("http://localhost:3005/api/admin/sales")
      ).status(),
    ).toBe(403);
    const customerPage = await owner.context.newPage();
    await customerPage.goto("http://localhost:3005/cocina");
    await expect(customerPage).toHaveURL(/\/cuenta/);
    await customerPage.goto("http://localhost:3005/admin/inventario");
    await expect(customerPage).toHaveURL(/\/cuenta/);
    const key = randomUUID(),
      payload = {
        idempotencyKey: key,
        type: "PICKUP",
        locale: "es",
        customerName: "E2E Customer",
        customerEmail: owner.user.email,
        customerPhone: "1234567",
        notes: "Kitchen observation",
        items: [
          {
            productId,
            quantity: 1,
            instructions: "No chilli",
            modifierIds: [],
          },
        ],
      };
    const placed = await owner.context.request.post(
      "http://localhost:3005/api/orders",
      { data: payload },
    );
    expect(placed.status(), await placed.text()).toBe(201);
    const o = await placed.json();
    orderId = o.id;
    publicId = o.publicId;
    const retried = await owner.context.request.post(
      "http://localhost:3005/api/orders",
      { data: payload },
    );
    expect(retried.status()).toBe(200);
    expect((await retried.json()).publicId).toBe(publicId);
    expect(
      (
        await foreign.context.request.get(
          "http://localhost:3005/api/orders/" + publicId,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await foreign.context.request.post("http://localhost:3005/api/orders", {
          data: payload,
        })
      ).status(),
    ).toBe(409);
    const owned = await owner.context.request.get(
      "http://localhost:3005/api/orders/" + publicId,
    );
    expect(owned.status()).toBe(200);
    expect(await owned.json()).not.toHaveProperty("ingredientCostCents");
    expect((await owned.json()).items[0]).not.toHaveProperty("recipeSnapshot");
    const kitchen = await cook.context.newPage();
    await kitchen.goto("http://localhost:3005/cocina");
    await expect(kitchen.getByText("Conectado en directo")).toBeVisible();
    const ticket = kitchen
      .locator(".kitchen-order")
      .filter({ hasText: publicId });
    await expect(ticket).toContainText("milk");
    await expect(ticket).toContainText("No chilli");
    await expect(ticket).toContainText("Kitchen observation");
    await ticket.getByRole("button", { name: "Aceptar", exact: true }).click();
    await expect(
      ticket.getByRole("button", { name: "Empezar preparación", exact: true }),
    ).toBeVisible();
    await ticket
      .getByRole("button", { name: "Empezar preparación", exact: true })
      .click();
    await expect(
      ticket.getByRole("button", { name: "Confirmar listo", exact: true }),
    ).toBeDisabled();
    await ticket
      .getByRole("button", { name: "Empezar preparación", exact: true })
      .click();
    await ticket
      .getByRole("button", { name: "Plato listo", exact: true })
      .click();
    await ticket
      .getByRole("button", { name: "Confirmar listo", exact: true })
      .click();
    await expect(
      ticket.getByRole("button", { name: "Confirmar entregado", exact: true }),
    ).toBeVisible();
    const tracking = await owner.context.newPage();
    await tracking.goto("http://localhost:3005/pedido/" + publicId);
    await expect(tracking.getByText("Listos", { exact: true })).toBeVisible();
    await kitchen.context().setOffline(true);
    await expect(kitchen.locator(".kitchen-alert[role=alert]")).toContainText(
      "Sin conexión",
      { timeout: 25000 },
    );
    await kitchen.context().setOffline(false);
    await expect(kitchen.getByText("Conectado en directo")).toBeVisible();
    await expect(kitchen.locator(".kitchen-alert[role=alert]")).toHaveCount(0);
    kitchen.on("dialog", (dialog) => dialog.accept());
    await ticket
      .getByRole("button", { name: "Confirmar entregado", exact: true })
      .click();
    await expect(
      tracking.getByText("Confirmar entregado", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const row = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    expect(row.status).toBe("ENTREGADO");
    expect(row.items[0].startedAt).not.toBeNull();
    expect(row.items[0].finishedAt).not.toBeNull();
    expect(
      await db.inventoryMovement.count({
        where: { orderId, kind: "CONSUMED" },
      }),
    ).toBe(1);
    expect(
      await db.customerNotice.count({
        where: { orderId, eventKey: `order-status:${orderId}:LISTO` },
      }),
    ).toBe(1);
    const reply = await owner.context.request.post(
      "http://localhost:3005/api/ai/chat",
      {
        data: {
          message: "estado de mi pedido",
          selectedOrderId: publicId,
          requestId: randomUUID(),
        },
      },
    );
    expect(reply.status()).toBe(200);
    expect((await reply.json()).reply).toContain("entregado");
    await kitchen.setViewportSize({ width: 390, height: 844 });
    expect(
      await kitchen.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await kitchen.screenshot({
      path: "/tmp/pancho-cocina-mobile.png",
      fullPage: true,
    });
    await kitchen.setViewportSize({ width: 1024, height: 768 });
    await kitchen.screenshot({
      path: "/tmp/pancho-cocina-tablet.png",
      fullPage: true,
    });
    const adminPage = await admin.context.newPage();
    await adminPage.goto("http://localhost:3005/admin/inventario");
    await expect(
      adminPage.getByRole("heading", { name: "Inventario y recetas" }),
    ).toBeVisible();
    await adminPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await adminPage.goto("http://localhost:3005/admin/ventas");
    await expect(
      adminPage.getByRole("heading", { name: "Ventas y caja" }),
    ).toBeVisible();
    await db.user.update({
      where: { id: cook.user.id },
      data: { role: "CLIENTE" },
    });
    await expect(kitchen).toHaveURL(/\/cuenta/, { timeout: 15000 });
  } finally {
    for (const context of contexts) await context.close();
    if (orderId) {
      await db.customerNotice.deleteMany({ where: { orderId } });
      await db.notification.deleteMany({ where: { orderId } });
      await db.automationJob.deleteMany({ where: { orderId } });
      await db.orderAction.deleteMany({ where: { orderId } });
      await db.stockReservation.deleteMany({ where: { orderId } });
      await db.inventoryMovement.deleteMany({ where: { orderId } });
      await db.payment.deleteMany({ where: { orderId } });
      await db.kitchenEvent.deleteMany({ where: { publicId } });
      await db.order.delete({ where: { id: orderId } });
    }
    if (productId) {
      await db.recipe.deleteMany({ where: { productId } });
      await db.product.delete({ where: { id: productId } });
    }
    if (categoryId) await db.category.delete({ where: { id: categoryId } });
    if (ingredientId)
      await db.ingredient.delete({ where: { id: ingredientId } });
    if (stationId) await db.kitchenStation.delete({ where: { id: stationId } });
    await db.aIAuditEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.restaurantSettings.update({
      where: { id: initialSettings.id },
      data: {
        acceptingOrders: initialSettings.acceptingOrders,
        serviceMode: initialSettings.serviceMode,
      },
    });
    await db.$disconnect();
  }
});
