import { requireRole } from "@/lib/access";
import { shiftAction, shiftRequest } from "@/lib/kitchen-shifts";
import { operationError } from "@/lib/kitchen-transaction";
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "COCINA"]);
  if ("response" in access) return access.response;
  const parsed = shiftRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "INVALID_ACTION" }, { status: 400 });
  try {
    return Response.json(
      await shiftAction(
        parsed.data,
        access.actor.id,
        access.actor.role === "ADMIN",
      ),
    );
  } catch (error) {
    return operationError(error);
  }
}
