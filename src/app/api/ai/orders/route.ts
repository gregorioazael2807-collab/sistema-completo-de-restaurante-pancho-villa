import { requireRole } from "@/lib/access";
import { getAssistantOrders } from "@/lib/assistant-orders";

export async function GET() {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const orders = await getAssistantOrders(access.actor.id);
    return Response.json({ orders }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[ai:orders]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ORDERS_UNAVAILABLE" }, { status: 503 });
  }
}
