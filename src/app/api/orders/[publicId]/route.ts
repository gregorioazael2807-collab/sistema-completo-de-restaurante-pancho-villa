import { db } from "@/lib/db";
import { requireRole } from "@/lib/access";

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!/^MX-[A-F0-9]{20}$/.test(publicId)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const order = await db.order.findUnique({
      where: { publicId },
      select: { publicId: true, type: true, status: true, createdAt: true, estimatedReadyAt: true, items: { select: { productName: true, quantity: true, instructions: true, modifiers: { select: { modifierName: true } } } }, statusHistory: { orderBy: { createdAt: "asc" }, select: { to: true, createdAt: true } } },
    });
    if (!order) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    return Response.json(order, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[orders:track]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ORDER_UNAVAILABLE" }, { status: 503 });
  }
}

const transitions: Record<string, string[]> = {
  NUEVO: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["LISTO"],
  LISTO: ["EN_CAMINO", "ENTREGADO", "NO_PRESENTADO"],
  EN_CAMINO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
  NO_PRESENTADO: [],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const access = await requireRole(["ADMIN", "COCINA"]);
  if ("response" in access) return access.response;
  const { publicId } = await params;
  const body = await request.json().catch(() => null);
  if (!/^MX-[A-F0-9]{20}$/.test(publicId) || !body || typeof body.status !== "string" || !Object.hasOwn(transitions, body.status)) return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  if (body.status === "NO_PRESENTADO" && access.actor.role !== "ADMIN") return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { publicId }, select: { id: true, status: true, customerEmail: true, customerLocale: true, userId: true } });
      if (!order) return { error: "NOT_FOUND" as const };
      if (!transitions[order.status].includes(body.status)) return { error: "INVALID_TRANSITION" as const };
      const changed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: body.status } });
      if (changed.count !== 1) return { error: "CONFLICT" as const };
      await tx.orderStatusHistory.create({ data: { orderId: order.id, from: order.status, to: body.status, changedBy: access.actor.id } });
      await tx.automationJob.create({ data: { dedupeKey: `order-status:${order.id}:${body.status}`, orderId: order.id, kind: "ORDER_STATUS_CHANGED", payload: { publicId, status: body.status, recipient: order.customerEmail, locale: order.customerLocale, notificationDedupeKey: `order-status:${order.id}:${body.status}` } } });
      await tx.notification.create({ data: { dedupeKey: `order-status:${order.id}:${body.status}`, orderId: order.id, userId: order.userId, type: `ORDER_${body.status}`, recipient: order.customerEmail, locale: order.customerLocale } });
      return { status: body.status };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : result.error === "CONFLICT" ? 409 : 400 });
    return Response.json(result);
  } catch (error) {
    console.error("[orders:status]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ORDER_UNAVAILABLE" }, { status: 503 });
  }
}
