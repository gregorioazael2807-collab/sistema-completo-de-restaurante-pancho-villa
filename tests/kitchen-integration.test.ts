import { afterAll, beforeAll, expect, test } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { changeOrder, changeItem } from "@/lib/kitchen-orders";
import { manageOperation } from "@/lib/operations-admin";
import { shiftAction } from "@/lib/kitchen-shifts";
import { runKitchenJobs } from "@/lib/kitchen-jobs";
import { snapshotRecipe } from "@/lib/kitchen-recipes";
const suite = process.env.RUN_KITCHEN_DB_TESTS === "1" ? test : test.skip;
const suffix = randomUUID();
let ingredientId = "",
  stationId = "",
  productId = "",
  categoryId = "",
  actorId = "";
const orders: string[] = [];
let settings: {
  id: string;
  acceptingOrders: boolean;
  serviceMode: string;
} | null = null;
let shiftId = "";
beforeAll(async () => {
  if (process.env.RUN_KITCHEN_DB_TESTS !== "1") return;
  if (new URL(process.env.DATABASE_URL!).pathname !== "/pancho_villa_cocina")
    throw Error("Use only independent kitchen database");
  const actor = await db.user.create({
    data: {
      email: `kitchen-test-${suffix}@example.test`,
      role: "ADMIN",
      firstName: "Test",
    },
  });
  actorId = actor.id;
  const ingredient = await db.ingredient.create({
    data: {
      name: `Test ingredient ${suffix}`,
      unit: "unit",
      stock: 1,
      unitCostCents: 100,
    },
  });
  ingredientId = ingredient.id;
  const station = await db.kitchenStation.create({
    data: { name: `Test station ${suffix}`, capacity: 2 },
  });
  stationId = station.id;
  const category = await db.category.create({
    data: { slug: `test-${suffix}`, name: "Test" },
  });
  categoryId = category.id;
  const product = await db.product.create({
    data: {
      categoryId,
      slug: `test-${suffix}`,
      name: "Test taco",
      description: "Temporary fixture",
      price: 10,
      ingredients: [],
      allergens: ["milk"],
      recipe: {
        create: {
          stationId,
          minMinutes: 5,
          maxMinutes: 8,
          ingredients: { create: { ingredientId, quantity: 1 } },
        },
      },
    },
  });
  productId = product.id;
  settings = await db.restaurantSettings.findFirst({
    select: { id: true, acceptingOrders: true, serviceMode: true },
  });
});
async function order() {
  const snapshot = await db.$transaction((tx) =>
    snapshotRecipe(tx, productId, [], 1),
  );
  const o = await db.order.create({
    data: {
      publicId: `MX-${randomBytes(10).toString("hex").toUpperCase()}`,
      type: "PICKUP",
      customerName: "Temporary test",
      customerEmail: "test@example.test",
      customerPhone: "00000",
      subtotal: 10,
      total: 10,
      taxAmount: 0,
      payment: { create: { amount: 10 } },
      items: {
        create: {
          productId,
          productName: "Historical taco",
          allergens: ["milk"],
          allergensRecorded: true,
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
          ...snapshot,
        },
      },
    },
    include: { items: true, payment: true },
  });
  orders.push(o.id);
  return o;
}
suite(
  "simultaneous acceptances cannot over-reserve the same ingredient",
  async () => {
    const a = await order(),
      b = await order();
    const results = await Promise.allSettled([
      changeOrder(a.publicId, "CONFIRMADO", actorId),
      changeOrder(b.publicId, "CONFIRMADO", actorId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const stock = await db.ingredient.findUniqueOrThrow({
      where: { id: ingredientId },
    });
    expect(Number(stock.stock)).toBe(1);
    expect(Number(stock.reserved)).toBe(1);
    const accepted = await db.order.findFirstOrThrow({
      where: { id: { in: [a.id, b.id] }, status: "CONFIRMADO" },
    });
    await changeOrder(accepted.publicId, "CANCELADO", actorId);
    expect(
      Number(
        (await db.ingredient.findUniqueOrThrow({ where: { id: ingredientId } }))
          .reserved,
      ),
    ).toBe(0);
  },
);
suite(
  "retry is idempotent, consumption happens once, cancelled prepared food is not restocked",
  async () => {
    const o = await order(),
      key = randomUUID();
    await changeOrder(o.publicId, "CONFIRMADO", actorId, key);
    await changeOrder(o.publicId, "CONFIRMADO", actorId, key);
    expect(await db.stockReservation.count({ where: { orderId: o.id } })).toBe(
      1,
    );
    await changeOrder(o.publicId, "EN_PREPARACION", actorId);
    await changeOrder(o.publicId, "EN_PREPARACION", actorId);
    expect(
      await db.inventoryMovement.count({
        where: { orderId: o.id, kind: "CONSUMED" },
      }),
    ).toBe(1);
    expect(
      Number(
        (await db.ingredient.findUniqueOrThrow({ where: { id: ingredientId } }))
          .stock,
      ),
    ).toBe(0);
    await expect(changeOrder(o.publicId, "CANCELADO", actorId)).rejects.toThrow(
      "INVALID_TRANSITION",
    );
    await manageOperation(
      {
        action: "COOKED_WASTE",
        requestId: randomUUID(),
        publicId: o.publicId,
        note: "Prepared dish discarded",
      },
      actorId,
    );
    expect(
      Number(
        (await db.ingredient.findUniqueOrThrow({ where: { id: ingredientId } }))
          .stock,
      ),
    ).toBe(0);
    await expect(changeOrder(o.publicId, "LISTO", actorId)).rejects.toThrow(
      "INVALID_TRANSITION",
    );
    await changeItem(
      o.items[0].id,
      { status: "PREPARING", requestId: randomUUID() },
      actorId,
    );
    await changeItem(
      o.items[0].id,
      { status: "READY", requestId: randomUUID() },
      actorId,
    );
    await changeOrder(o.publicId, "LISTO", actorId);
    await changeOrder(o.publicId, "ENTREGADO", actorId);
    expect(
      await db.kitchenEvent.count({
        where: { key: `order-status:${o.id}:LISTO` },
      }),
    ).toBe(1);
  },
);
suite("historical recipe and costs survive later menu changes", async () => {
  await db.ingredient.update({
    where: { id: ingredientId },
    data: { stock: 5 },
  });
  const o = await order();
  await db.product.update({
    where: { id: productId },
    data: { name: "New name", allergens: ["soy"], price: 99 },
  });
  await db.ingredient.update({
    where: { id: ingredientId },
    data: { unitCostCents: 900 },
  });
  await changeOrder(o.publicId, "CONFIRMADO", actorId);
  const historical = await db.order.findUniqueOrThrow({
    where: { id: o.id },
    include: { items: true },
  });
  expect(historical.items[0].productName).toBe("Historical taco");
  expect(historical.items[0].allergens).toEqual(["milk"]);
  expect(historical.ingredientCostCents).toBe(100);
  await changeOrder(o.publicId, "CANCELADO", actorId);
});
suite(
  "payments distinguish pending, collected and partial/full refunds with retries",
  async () => {
    const o = await order();
    expect(o.payment?.status).toBe("PAYMENT_PENDING");
    const capture = {
      action: "PAYMENT" as const,
      publicId: o.publicId,
      requestId: randomUUID(),
      kind: "CAPTURE" as const,
      method: "CASH" as const,
      amountCents: 1000,
    };
    await manageOperation(capture, actorId);
    await manageOperation(capture, actorId);
    expect(
      await db.paymentEntry.count({
        where: { paymentId: o.payment!.id, kind: "CAPTURE" },
      }),
    ).toBe(1);
    await manageOperation(
      { ...capture, kind: "REFUND", requestId: randomUUID(), amountCents: 400 },
      actorId,
    );
    let p = await db.payment.findUniqueOrThrow({
      where: { id: o.payment!.id },
    });
    expect(p.status).toBe("PAID");
    expect(Number(p.refundedAmount)).toBe(4);
    await expect(
      manageOperation(
        {
          ...capture,
          kind: "REFUND",
          requestId: randomUUID(),
          amountCents: 700,
        },
        actorId,
      ),
    ).rejects.toThrow("PAYMENT_CONFLICT");
    await manageOperation(
      { ...capture, kind: "REFUND", requestId: randomUUID(), amountCents: 600 },
      actorId,
    );
    p = await db.payment.findUniqueOrThrow({ where: { id: o.payment!.id } });
    expect(p.status).toBe("REFUNDED");
  },
);
suite(
  "opening, pause, resume, stopping orders and closing retains active tickets",
  async () => {
    const active = await db.kitchenShift.findFirst({
      where: { closedAt: null },
    });
    if (active)
      throw Error("Integration tests require no existing active shift");
    const opened = await shiftAction(
      { action: "OPEN", openingCashCents: 1000 },
      actorId,
      true,
    );
    shiftId = opened.id;
    expect(
      (
        await shiftAction(
          { action: "OPEN", openingCashCents: 1000 },
          actorId,
          true,
        )
      ).id,
    ).toBe(shiftId);
    await shiftAction({ action: "PAUSE" }, actorId, true);
    await shiftAction({ action: "PAUSE" }, actorId, true);
    expect(await db.shiftPause.count({ where: { shiftId } })).toBe(1);
    expect(
      (
        await db.restaurantSettings.findUniqueOrThrow({
          where: { id: settings!.id },
        })
      ).acceptingOrders,
    ).toBe(false);
    await shiftAction({ action: "RESUME" }, actorId, true);
    expect(
      (await db.shiftPause.findFirstOrThrow({ where: { shiftId } })).endedAt,
    ).not.toBeNull();
    await shiftAction({ action: "STOP_ORDERS" }, actorId, true);
    const o = await order();
    await db.order.update({ where: { id: o.id }, data: { shiftId } });
    await shiftAction(
      { action: "CLOSE", countedCashCents: 1100 },
      actorId,
      true,
    );
    const closed = await db.kitchenShift.findUniqueOrThrow({
      where: { id: shiftId },
    });
    expect(closed.closedAt).not.toBeNull();
    expect(closed.differenceCents).toBe(100);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: o.id } })).status,
    ).toBe("NUEVO");
    await runKitchenJobs();
    await runKitchenJobs();
    expect(
      await db.kitchenEvent.count({
        where: { key: `shift-summary:${shiftId}` },
      }),
    ).toBe(1);
  },
);
afterAll(async () => {
  if (process.env.RUN_KITCHEN_DB_TESTS !== "1") return;
  await db.customerNotice.deleteMany({ where: { orderId: { in: orders } } });
  await db.notification.deleteMany({ where: { orderId: { in: orders } } });
  await db.automationJob.deleteMany({ where: { orderId: { in: orders } } });
  await db.orderAction.deleteMany({ where: { orderId: { in: orders } } });
  await db.stockReservation.deleteMany({ where: { orderId: { in: orders } } });
  await db.inventoryMovement.deleteMany({ where: { ingredientId } });
  const payments = await db.payment.findMany({
    where: { orderId: { in: orders } },
    select: { id: true },
  });
  await db.paymentEntry.deleteMany({
    where: { paymentId: { in: payments.map((p) => p.id) } },
  });
  await db.payment.deleteMany({ where: { orderId: { in: orders } } });
  const tickets = await db.order.findMany({
    where: { id: { in: orders } },
    select: { publicId: true },
  });
  await db.kitchenEvent.deleteMany({
    where: {
      OR: [
        { publicId: { in: tickets.map((o) => o.publicId) } },
        { key: `shift-summary:${shiftId}` },
        { key: { startsWith: `shift:${shiftId}:` } },
      ],
    },
  });
  await db.order.deleteMany({ where: { id: { in: orders } } });
  if (shiftId) {
    await db.shiftPause.deleteMany({ where: { shiftId } });
    await db.kitchenShift.delete({ where: { id: shiftId } });
  }
  if (settings)
    await db.restaurantSettings.update({
      where: { id: settings.id },
      data: {
        acceptingOrders: settings.acceptingOrders,
        serviceMode: settings.serviceMode,
      },
    });
  if (productId) await db.recipe.deleteMany({ where: { productId } });
  if (productId) await db.product.delete({ where: { id: productId } });
  if (categoryId) await db.category.delete({ where: { id: categoryId } });
  if (ingredientId) await db.ingredient.delete({ where: { id: ingredientId } });
  if (stationId) await db.kitchenStation.delete({ where: { id: stationId } });
  if (actorId) await db.user.delete({ where: { id: actorId } });
  await db.$disconnect();
});
suite(
  "delivery dispatch uses travel time only and saves observed travel reference",
  async () => {
    const { addressHash } = await import("@/lib/delivery");
    const quote = await db.deliveryQuote.create({
      data: {
        addressHash: addressHash(
          {
            recipient: "Test",
            line1: "Test 1",
            city: "Test",
            postalCode: "12345",
            countryCode: "DE",
          },
          actorId,
        ),
        latitude: 0,
        longitude: 0.001,
        straightKm: 0.1,
        band: 1,
        routeMeters: 200,
        minSeconds: 60,
        maxSeconds: 90,
        method: "TEST_ONLY",
        mode: "motorcycle",
        expiresAt: new Date(Date.now() + 900000),
      },
    });
    const o = await order();
    try {
      await db.order.update({
        where: { id: o.id },
        data: { type: "DELIVERY", deliveryQuoteId: quote.id },
      });
      await changeOrder(o.publicId, "CONFIRMADO", actorId);
      await changeOrder(o.publicId, "EN_PREPARACION", actorId);
      await changeItem(
        o.items[0].id,
        { status: "PREPARING", requestId: randomUUID() },
        actorId,
      );
      await changeItem(
        o.items[0].id,
        { status: "READY", requestId: randomUUID() },
        actorId,
      );
      await changeOrder(o.publicId, "LISTO", actorId);
      await expect(
        changeOrder(o.publicId, "ENTREGADO", actorId),
      ).rejects.toThrow("INVALID_TRANSITION");
      await changeOrder(o.publicId, "EN_CAMINO", actorId);
      let row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(
        row.estimatedArrivalAt!.getTime() - row.dispatchedAt!.getTime(),
      ).toBe(60000);
      expect(
        row.estimatedArrivalUntil!.getTime() - row.dispatchedAt!.getTime(),
      ).toBe(90000);
      await db.order.update({
        where: { id: o.id },
        data: { dispatchedAt: new Date(Date.now() - 60000) },
      });
      await changeOrder(o.publicId, "ENTREGADO", actorId);
      expect(
        await db.routeReference.count({
          where: { orderId: o.id, method: "ACTUAL_DELIVERY" },
        }),
      ).toBe(1);
      await changeOrder(o.publicId, "ENTREGADO", actorId);
      expect(await db.routeReference.count({ where: { orderId: o.id } })).toBe(
        1,
      );
      row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(row.deliveredAt).not.toBeNull();
    } finally {
      await db.order.update({
        where: { id: o.id },
        data: { deliveryQuoteId: null },
      });
      await db.routeReference.deleteMany({ where: { orderId: o.id } });
      await db.deliveryQuote.delete({ where: { id: quote.id } });
    }
  },
);
