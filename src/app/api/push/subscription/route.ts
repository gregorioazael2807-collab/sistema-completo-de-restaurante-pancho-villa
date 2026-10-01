import { z } from "zod";
import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { operationError } from "@/lib/kitchen-transaction";
const schema = z.object({
  endpoint: z
    .url()
    .max(2048)
    .refine((v) => new URL(v).protocol === "https:"),
  keys: z.object({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(16).max(200),
  }),
});
export async function POST(request: Request) {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  if (process.env.PUSH_DELIVERY_ENABLED !== "true")
    return Response.json({ error: "PUSH_NOT_CONFIGURED" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  try {
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: parsed.data.endpoint },
    });
    if (existing && existing.userId !== access.actor.id)
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: access.actor.id,
        endpoint: parsed.data.endpoint,
        ...parsed.data.keys,
      },
      update: parsed.data.keys,
    });
    return Response.json({ saved: true });
  } catch (error) {
    return operationError(error);
  }
}
export async function DELETE(request: Request) {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint !== "string")
    return Response.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  await db.pushSubscription.deleteMany({
    where: { userId: access.actor.id, endpoint: body.endpoint },
  });
  return Response.json({ deleted: true });
}

export async function GET() {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  return Response.json(
    {
      publicKey:
        process.env.PUSH_DELIVERY_ENABLED === "true"
          ? (process.env.NEXT_PUBLIC_PUSH_VAPID_KEY ?? null)
          : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
