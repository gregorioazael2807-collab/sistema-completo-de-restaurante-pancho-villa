import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";

export async function POST() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const failed = await db.automationJob.findMany({ where: { status: "FAILED" }, select: { id: true, payload: true } });
    let retried = 0;
    for (const job of failed) {
      const changed = await db.automationJob.updateMany({ where: { id: job.id, status: "FAILED" }, data: { status: "PENDING", attempts: 0, runAt: new Date(), lockedAt: null, lastError: null } });
      if (!changed.count) continue;
      const payload = job.payload as { notificationDedupeKey?: string };
      if (payload.notificationDedupeKey) await db.notification.updateMany({ where: { dedupeKey: payload.notificationDedupeKey, status: "FAILED" }, data: { status: "PENDING", attempts: 0, lastError: null } });
      retried++;
    }
    return Response.json({ retried });
  } catch (error) {
    console.error("[admin:outbox-retry]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "RETRY_UNAVAILABLE" }, { status: 503 });
  }
}
