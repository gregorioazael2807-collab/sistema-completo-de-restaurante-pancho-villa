import { db } from "@/lib/db";
export async function kitchenSnapshot(admin: boolean) {
  const [orders, settings, shift, ingredients, events, stations, staff] =
    await Promise.all([
      db.order.findMany({
        where: {
          OR: [
            {
              status: {
                in: [
                  "NUEVO",
                  "CONFIRMADO",
                  "EN_PREPARACION",
                  "LISTO",
                  "EN_CAMINO",
                ],
              },
            },
            {
              status: { in: ["ENTREGADO", "CANCELADO", "NO_PRESENTADO"] },
              updatedAt: { gte: new Date(Date.now() - 24 * 3600000) },
            },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: {
          publicId: true,
          type: true,
          status: true,
          createdAt: true,
          notes: true,
          deliveryNote: true,
          estimatedReadyAt: true,
          estimatedReadyUntil: true,
          inventoryComplete: true,
          preparationDeadlineAt: true,
          readyAt: true,
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              instructions: true,
              allergens: true,
              allergensRecorded: true,
              stationName: true,
              stationId: true,
              cookStatus: true,
              assignedTo: true,
              startedAt: true,
              finishedAt: true,
              estimatedAt: true,
              estimatedUntil: true,
              modifiers: { select: { modifierName: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
            select: { to: true, createdAt: true, changedBy: true },
          },
        },
      }),
      db.restaurantSettings.findFirst({
        select: { acceptingOrders: true, timezone: true, serviceMode: true },
      }),
      db.kitchenShift.findFirst({
        where: { closedAt: null },
        select: {
          id: true,
          openedAt: true,
          pauses: { select: { startedAt: true, endedAt: true } },
        },
      }),
      db.ingredient.findMany({
        select: {
          id: true,
          name: true,
          unit: true,
          stock: true,
          reserved: true,
          minimum: true,
        },
      }),
      db.kitchenEvent.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: { id: true, kind: true, publicId: true },
      }),
      db.kitchenStation.findMany({
        select: { id: true, name: true, capacity: true, active: true },
      }),
      db.user.findMany({
        where: { role: { in: ["ADMIN", "COCINA"] }, active: true },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);
  return {
    orders,
    settings,
    shift,
    stations,
    staff,
    events,
    canMarkNoShow: admin,
    canManage: admin,
    lowStock: ingredients
      .filter((i) => i.stock.sub(i.reserved).lte(i.minimum))
      .map((i) => ({
        ...i,
        stock: i.stock.toNumber(),
        reserved: i.reserved.toNumber(),
        minimum: i.minimum.toNumber(),
      })),
    mariachiResource: process.env.NEXT_PUBLIC_MARIACHI_RIVE ?? null,
  };
}
