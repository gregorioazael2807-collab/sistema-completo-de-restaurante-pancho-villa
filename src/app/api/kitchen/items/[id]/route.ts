import { requireRole } from "@/lib/access";
import { changeItem, itemRequest } from "@/lib/kitchen-orders";
import { operationError } from "@/lib/kitchen-transaction";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireRole(["ADMIN", "COCINA"]);
  if ("response" in access) return access.response;
  const parsed = itemRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "INVALID_ACTION" }, { status: 400 });
  try {
    return Response.json(
      await changeItem((await params).id, parsed.data, access.actor.id),
    );
  } catch (error) {
    return operationError(error);
  }
}
