import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";

export async function GET() {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const orders = await db.order.findMany({ where: { userId: access.actor.id, status: { in: ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO"] } }, orderBy: { createdAt: "desc" }, take: 8, select: { publicId: true, status: true, type: true, createdAt: true, items: { select: { productName: true, quantity: true } } } });
    return Response.json({ orders }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[ai:orders]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ORDERS_UNAVAILABLE" }, { status: 503 });
  }
}
