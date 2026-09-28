import { processOutboxBatch } from "@/lib/outbox";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try { return Response.json(await processOutboxBatch()); }
  catch (error) { console.error("[cron:outbox]", error instanceof Error ? error.message : "unknown error"); return Response.json({ error: "OUTBOX_UNAVAILABLE" }, { status: 503 }); }
}
