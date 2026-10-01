import { requireRole } from "@/lib/access";
import { deliveryAddress, quoteDelivery } from "@/lib/delivery";
import { rateLimit } from "@/lib/security";
import { operationError } from "@/lib/kitchen-transaction";
export async function POST(request: Request) {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = deliveryAddress.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  try {
    await rateLimit(`delivery-quote:${access.actor.id}`, 10, 15);
    return Response.json(await quoteDelivery(parsed.data, access.actor.id));
  } catch (error) {
    return operationError(error);
  }
}
