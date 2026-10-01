import { z } from "zod";
import type { OrderStatus, Prisma } from "@prisma/client";
import { serializable } from "@/lib/kitchen-transaction";
import { reserveIngredients, applyInventoryState } from "@/lib/kitchen-recipes";
import { refreshEstimates } from "@/lib/kitchen-estimates";
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  NUEVO: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["LISTO"],
  LISTO: ["EN_CAMINO", "ENTREGADO", "NO_PRESENTADO"],
  EN_CAMINO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
  NO_PRESENTADO: [],
};
export const statusRequest = z.object({
  status: z.enum([
    "NUEVO",
    "CONFIRMADO",
    "EN_PREPARACION",
    "LISTO",
    "EN_CAMINO",
    "ENTREGADO",
    "CANCELADO",
    "NO_PRESENTADO",
  ]),
  requestId: z.string().uuid().optional(),
});
export async function changeOrder(
  publicId: string,
  status: OrderStatus,
  actorId: string,
  requestId?: string,
) {
  return serializable(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      include: { items: true, deliveryQuote: true },
    });
    if (!order) throw Error("NOT_FOUND");
    const key = requestId
      ? `request:${requestId}`
      : `status:${order.id}:${status}`;
    const previous = await tx.orderAction.findUnique({ where: { key } });
    if (previous) {
      if (
        previous.orderId !== order.id ||
        previous.actorId !== actorId ||
        previous.kind !== status
      )
        throw Error("CONFLICT");
      return { status: order.status, replayed: true };
    }
    if (order.status === status) return { status, replayed: true };
    if (
      !transitions[order.status].includes(status) ||
      (status === "EN_CAMINO" && order.type !== "DELIVERY") ||
      (status === "ENTREGADO" &&
        order.type === "DELIVERY" &&
        order.status !== "EN_CAMINO") ||
      (status === "NO_PRESENTADO" && order.type !== "PICKUP")
    )
      throw Error("INVALID_TRANSITION");
    const now = new Date();
    const changes: Prisma.OrderUpdateManyMutationInput = { status };
    if (status === "CONFIRMADO") await reserveIngredients(tx, order.id);
    if (status === "EN_PREPARACION") {
      await applyInventoryState(tx, order.id, "CONSUMED", actorId);
      changes.preparationStartedAt = now;
    }
    if (status === "CANCELADO")
      await applyInventoryState(tx, order.id, "RELEASED", actorId);
    if (status === "LISTO") {
      if (order.items.some((i) => i.cookStatus !== "READY"))
        throw Error("INVALID_TRANSITION");
      changes.readyAt = now;
      await tx.orderItem.updateMany({
        where: { orderId: order.id, finishedAt: null },
        data: { cookStatus: "READY", finishedAt: now },
      });
    }
    if (status === "EN_CAMINO") changes.dispatchedAt = now;
    if (status === "ENTREGADO") {
      changes.deliveredAt = now;
      if (order.dispatchedAt && order.deliveryQuote) {
        const seconds = Math.round(
          (now.getTime() - order.dispatchedAt.getTime()) / 1000,
        );
        if (seconds > 0)
          await tx.routeReference.create({
            data: {
              band: order.deliveryQuote.band,
              minSeconds: seconds,
              maxSeconds: seconds,
              method: "ACTUAL_DELIVERY",
              mode: "motorcycle",
              orderId: order.id,
            },
          });
      }
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: changes,
    });
    if (changed.count !== 1) throw Error("CONFLICT");
    await tx.orderAction.create({
      data: {
        key,
        orderId: order.id,
        actorId,
        kind: status,
        payload: { from: order.status, to: status },
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        from: order.status,
        to: status,
        changedBy: actorId,
      },
    });
    const eventKey = `order-status:${order.id}:${status}`;
    if (order.userId)
      await tx.customerNotice.createMany({
        data: [{ userId: order.userId, orderId: order.id, eventKey, status }],
        skipDuplicates: true,
      });
    await tx.automationJob.createMany({
      data: [
        {
          dedupeKey: eventKey,
          orderId: order.id,
          kind: "ORDER_STATUS_CHANGED",
          payload: {
            publicId,
            status,
            recipient: order.customerEmail,
            locale: order.customerLocale,
            notificationDedupeKey: eventKey,
          },
        },
      ],
      skipDuplicates: true,
    });
    await tx.notification.createMany({
      data: [
        {
          dedupeKey: eventKey,
          orderId: order.id,
          userId: order.userId,
          type: `ORDER_${status}`,
          recipient: order.customerEmail,
          locale: order.customerLocale,
        },
      ],
      skipDuplicates: true,
    });
    await tx.kitchenEvent.createMany({
      data: [{ key: eventKey, kind: status, publicId }],
      skipDuplicates: true,
    });
    await refreshEstimates(tx, now);
    if (status === "EN_PREPARACION") {
      const updated = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { preparationDeadlineAt: updated.estimatedReadyUntil },
      });
    }
    return { status, replayed: false };
  });
}
export const itemRequest = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["PREPARING", "READY"]),
  assignedTo: z.string().max(64).optional(),
});
export async function changeItem(
  itemId: string,
  data: z.infer<typeof itemRequest>,
  actorId: string,
) {
  return serializable(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });
    if (!item) throw Error("NOT_FOUND");
    const key = `item:${data.requestId}`;
    const previous = await tx.orderAction.findUnique({ where: { key } });
    if (previous) {
      if (
        previous.orderId !== item.orderId ||
        previous.actorId !== actorId ||
        previous.kind !== `ITEM_${data.status}` ||
        (previous.payload as { itemId?: string }).itemId !== itemId
      )
        throw Error("CONFLICT");
      return { replayed: true };
    }
    if (
      item.order.status !== "EN_PREPARACION" ||
      (data.status === "READY" && item.cookStatus !== "PREPARING") ||
      (data.status === "PREPARING" && item.cookStatus !== "PENDING")
    )
      throw Error("INVALID_TRANSITION");
    const assignee = data.assignedTo ?? actorId;
    const employee = await tx.user.findFirst({
      where: { id: assignee, active: true, role: { in: ["ADMIN", "COCINA"] } },
    });
    if (!employee) throw Error("INVALID_ACTION");
    const now = new Date();
    await tx.orderItem.update({
      where: { id: item.id },
      data: {
        cookStatus: data.status,
        assignedTo: assignee,
        ...(data.status === "READY" ? { finishedAt: now } : { startedAt: now }),
      },
    });
    await tx.orderAction.create({
      data: {
        key,
        orderId: item.orderId,
        actorId,
        kind: `ITEM_${data.status}`,
        payload: { itemId, assignedTo: assignee },
      },
    });
    await tx.kitchenEvent.create({
      data: { key, publicId: item.order.publicId, kind: "ITEM_CHANGED" },
    });
    await refreshEstimates(tx, now);
    return { replayed: false };
  });
}
