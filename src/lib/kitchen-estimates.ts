import { Prisma } from "@prisma/client";
import { estimateKitchen, arrivalWindow } from "@/lib/kitchen-math";
import { snapshotSchema } from "@/lib/kitchen-recipes";
export async function refreshEstimates(
  tx: Prisma.TransactionClient,
  now = new Date(),
) {
  const [orders, stations, settings] = await Promise.all([
    tx.order.findMany({
      where: {
        status: {
          in: ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO"],
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { items: true, deliveryQuote: true },
    }),
    tx.kitchenStation.findMany({ where: { active: true } }),
    tx.restaurantSettings.findFirst(),
  ]);
  const pending = orders.filter(
    (o) => !["LISTO", "EN_CAMINO"].includes(o.status),
  );
  const estimates = estimateKitchen(
    pending.flatMap((o) =>
      o.items.map((i) => {
        const snapshot = snapshotSchema.safeParse(i.recipeSnapshot);
        return {
          id: i.id,
          orderId: o.id,
          createdAt: o.createdAt,
          startedAt: i.startedAt,
          finishedAt: i.finishedAt,
          tasks: snapshot.success ? snapshot.data.tasks : null,
          unknown: !snapshot.success || !snapshot.data.complete,
        };
      }),
    ),
    Object.fromEntries(stations.map((s) => [s.id, s.capacity])),
    now,
  );
  for (const order of orders) {
    let from: Date | null = order.readyAt,
      until: Date | null = order.readyAt;
    if (!["LISTO", "EN_CAMINO"].includes(order.status)) {
      const rows = order.items.map((i) => estimates[i.id]);
      if (rows.length && rows.every((r) => r?.from && r.until)) {
        from = new Date(Math.max(...rows.map((r) => r.from!.getTime())));
        until = new Date(Math.max(...rows.map((r) => r.until!.getTime())));
      } else {
        from = null;
        until = null;
      }
      for (const item of order.items) {
        const row = estimates[item.id];
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            estimatedAt: row?.from ?? null,
            estimatedUntil: row?.until ?? null,
          },
        });
      }
    }
    const quote = order.deliveryQuote;
    const arrival = arrivalWindow(
      from,
      until,
      settings?.dispatchMinMinutes ?? null,
      settings?.dispatchMaxMinutes ?? null,
      quote?.minSeconds ?? null,
      quote?.maxSeconds ?? null,
      order.dispatchedAt,
    );
    // Avoid a new customer notice on every timer tick. Notify changes >= 2 min or known/unknown changes.
    const significant = (a: Date | null, b: Date | null) =>
      Boolean(a) !== Boolean(b) ||
      (a && b ? Math.abs(a.getTime() - b.getTime()) >= 120000 : false);
    if (
      significant(order.estimatedReadyUntil, until) ||
      significant(order.estimatedArrivalUntil, arrival.until)
    ) {
      const key = `estimate:${order.id}:${until?.toISOString() ?? "unknown"}:${arrival.until?.toISOString() ?? "unknown"}`;
      if (order.userId)
        await tx.customerNotice.createMany({
          data: [
            {
              userId: order.userId,
              orderId: order.id,
              eventKey: key,
              status: order.status,
            },
          ],
          skipDuplicates: true,
        });
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        estimatedReadyAt: from,
        estimatedReadyUntil: until,
        estimatedArrivalAt: arrival.from,
        estimatedArrivalUntil: arrival.until,
      },
    });
  }
}
