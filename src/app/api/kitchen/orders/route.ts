import { requireRole } from "@/lib/access";
import { kitchenSnapshot } from "@/lib/kitchen-snapshot";
import { operationError } from "@/lib/kitchen-transaction";
export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try {
    return Response.json(await kitchenSnapshot(access.actor.role === "ADMIN"), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return operationError(error);
  }
}
