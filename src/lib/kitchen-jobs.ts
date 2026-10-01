import { serializable } from "@/lib/kitchen-transaction";
import { refreshEstimates } from "@/lib/kitchen-estimates";
export async function runKitchenJobs(now = new Date()) {
  return serializable(async (tx) => {
    const overdue = await tx.order.findMany({
      where: { status: "EN_PREPARACION", preparationDeadlineAt: { lt: now } },
    });
    for (const order of overdue) {
      await tx.kitchenEvent.createMany({
        data: [
          { key: `delay:${order.id}`, kind: "DELAY", publicId: order.publicId },
        ],
        skipDuplicates: true,
      });
      if (order.userId)
        await tx.customerNotice.createMany({
          data: [
            {
              userId: order.userId,
              orderId: order.id,
              eventKey: `delay:${order.id}`,
              status: order.status,
            },
          ],
          skipDuplicates: true,
        });
    }
    await refreshEstimates(tx, now);
    const shifts = await tx.kitchenShift.findMany({
      where: { closedAt: { not: null } },
    });
    const settings = await tx.restaurantSettings.findFirst();
    for (const shift of shifts) {
      const key = `shift-summary:${shift.id}`;
      await tx.kitchenEvent.createMany({
        data: [{ key, kind: "SHIFT_SUMMARY" }],
        skipDuplicates: true,
      });
      if (process.env.ADMIN_REPORT_EMAIL) {
        const summary = shift.summary as Record<string, unknown> | null;
        await tx.automationJob.createMany({
          data: [
            {
              dedupeKey: key,
              kind: "KITCHEN_SUMMARY",
              payload: {
                recipient: process.env.ADMIN_REPORT_EMAIL,
                locale: "es",
                summary: {
                  prepared: summary?.prepared ?? 0,
                  effectiveMinutes: summary?.effectiveMinutes ?? 0,
                  averageMinutes: summary?.averageMinutes ?? null,
                },
                name: settings?.name ?? "Pancho Villa",
              },
            },
          ],
          skipDuplicates: true,
        });
      }
    }
    return { delayed: overdue.length, summaries: shifts.length };
  });
}
