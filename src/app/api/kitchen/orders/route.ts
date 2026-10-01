import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET() {
  const access = await requireRole(["ADMIN", "COCINA"]);
  if ("response" in access) return access.response;
  try {
    const orders = await db.order.findMany({ where: { status: { in: ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO"] } }, orderBy: { createdAt: "asc" }, select: { publicId: true, type: true, status: true, createdAt: true, notes: true, items: { select: { productName: true, quantity: true, instructions: true, modifiers: { select: { modifierName: true } } } } } });
    return Response.json({ orders, canMarkNoShow: access.actor.role === "ADMIN" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[kitchen:orders]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ORDERS_UNAVAILABLE" }, { status: 503 });
  }
}
