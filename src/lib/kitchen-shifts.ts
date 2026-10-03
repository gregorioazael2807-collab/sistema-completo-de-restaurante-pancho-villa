import { z } from "zod";
import { serializable } from "@/lib/kitchen-transaction";
import { dailySalesWindow, summarizeDailySales } from "@/lib/kitchen-daily-sales";
export const shiftRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("OPEN"),
    openingCashCents: z.number().int().nonnegative().max(100000000).default(0),
  }),
  z.object({ action: z.literal("PAUSE") }),
  z.object({ action: z.literal("RESUME") }),
  z.object({ action: z.literal("STOP_ORDERS") }),
  z.object({
    action: z.literal("CLOSE"),
    countedCashCents: z.number().int().nonnegative().max(100000000).optional(),
  }),
]);
export async function shiftAction(
  data: z.infer<typeof shiftRequest>,
  actorId: string,
  admin: boolean,
) {
  return serializable(async (tx) => {
    const settings = await tx.restaurantSettings.findFirst();
    if (!settings) throw Error("NOT_FOUND");
    const shift = await tx.kitchenShift.findUnique({
      where: { activeKey: settings.id },
      include: { pauses: true },
    });
    if (data.action === "OPEN") {
      if (shift) return { id: shift.id, replayed: true };
      if (data.openingCashCents && !admin) throw Error("INVALID_ACTION");
      const opened = await tx.kitchenShift.create({
        data: {
          settingsId: settings.id,
          activeKey: settings.id,
          openedBy: actorId,
          openingCashCents: data.openingCashCents,
        },
      });
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: { acceptingOrders: true, serviceMode: "SHIFT" },
      });
      return { id: opened.id };
    }
    if (!shift) throw Error("SHIFT_NOT_OPEN");
    const pause = shift.pauses.find((p) => !p.endedAt);
    const now = new Date();
    if (data.action === "PAUSE") {
      if (!pause)
        await tx.shiftPause.create({ data: { shiftId: shift.id, actorId } });
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: { acceptingOrders: false },
      });
    }
    if (data.action === "RESUME") {
      if (pause)
        await tx.shiftPause.update({
          where: { id: pause.id },
          data: { endedAt: now },
        });
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: { acceptingOrders: true },
      });
    }
    if (data.action === "STOP_ORDERS")
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: { acceptingOrders: false },
      });
    if (data.action === "CLOSE") {
      if (data.countedCashCents !== undefined && !admin)
        throw Error("INVALID_ACTION");
      if (pause)
        await tx.shiftPause.update({
          where: { id: pause.id },
          data: { endedAt: now },
        });
      const orders = await tx.order.findMany({
        where: { shiftId: shift.id },
        include: { items: true },
      });
      const { start } = dailySalesWindow(now, settings.timezone);
      const soldToday = await tx.order.findMany({
        where: { status: "ENTREGADO", deliveredAt: { gte: start, lte: now } },
        include: { items: { include: { modifiers: true } } },
      });
      const dailySales = summarizeDailySales(soldToday, now, settings.timezone);
      const completed = orders.filter((o) => o.readyAt);
      const times = completed
        .filter((o) => o.preparationStartedAt)
        .map(
          (o) =>
            (o.readyAt!.getTime() - o.preparationStartedAt!.getTime()) / 60000,
        );
      const pausedMs = shift.pauses.reduce(
        (sum, p) => sum + (p.endedAt ?? now).getTime() - p.startedAt.getTime(),
        0,
      );
      const entries = await tx.paymentEntry.findMany({
        where: { createdAt: { gte: shift.openedAt, lte: now } },
      });
      const totals: Record<string, number> = { CASH: 0, CARD: 0, OTHER: 0 };
      for (const e of entries)
        totals[e.method] =
          (totals[e.method] ?? 0) +
          Math.round(Number(e.amount) * 100) * (e.kind === "REFUND" ? -1 : 1);
      const expected = shift.openingCashCents + totals.CASH;
      const stationLoad: Record<string, number> = {};
      for (const o of orders)
        for (const i of o.items)
          if (i.startedAt && i.finishedAt)
            stationLoad[i.stationName ?? "unknown"] =
              (stationLoad[i.stationName ?? "unknown"] ?? 0) +
              (i.finishedAt.getTime() - i.startedAt.getTime()) / 60000;
      await tx.kitchenShift.update({
        where: { id: shift.id },
        data: {
          activeKey: null,
          closedAt: now,
          closedBy: actorId,
          expectedCashCents: expected,
          countedCashCents: data.countedCashCents,
          differenceCents:
            data.countedCashCents === undefined
              ? null
              : data.countedCashCents - expected,
          summary: {
            openMinutes: (now.getTime() - shift.openedAt.getTime()) / 60000,
            effectiveMinutes:
              (now.getTime() - shift.openedAt.getTime() - pausedMs) / 60000,
            prepared: completed.length,
            delays: completed.filter(
              (o) =>
                o.preparationDeadlineAt && o.readyAt! > o.preparationDeadlineAt,
            ).length,
            averageMinutes: times.length
              ? times.reduce((a, b) => a + b, 0) / times.length
              : null,
            stationLoad,
            totals,
            dailySales,
          },
        },
      });
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: { acceptingOrders: false },
      });
    }
    await tx.kitchenEvent.create({
      data: {
        key: `shift:${shift.id}:${data.action}:${now.toISOString()}`,
        kind: "SHIFT_CHANGED",
      },
    });
    return { id: shift.id };
  });
}
