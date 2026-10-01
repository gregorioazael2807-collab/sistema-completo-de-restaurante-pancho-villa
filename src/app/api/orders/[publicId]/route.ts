import { db } from "@/lib/db";
import { getActor, requireRole } from "@/lib/access";
import { changeOrder, statusRequest } from "@/lib/kitchen-orders";
import { operationError } from "@/lib/kitchen-transaction";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const actor = await getActor();
  if (!actor)
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { publicId } = await params;
  if (!/^MX-[A-F0-9]{20}$/.test(publicId))
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const order = await db.order.findFirst({
      where: {
        publicId,
        ...(actor.role === "ADMIN" || actor.role === "COCINA"
          ? {}
          : { userId: actor.id }),
      },
      select: {
        publicId: true,
        type: true,
        status: true,
        createdAt: true,
        estimatedReadyAt: true,
        estimatedReadyUntil: true,
        estimatedArrivalAt: true,
        estimatedArrivalUntil: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            instructions: true,
            modifiers: { select: { modifierName: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: { to: true, createdAt: true },
        },
      },
    });
    return order
      ? Response.json(order, { headers: { "cache-control": "no-store" } })
      : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return operationError(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const access = await requireRole(["ADMIN", "COCINA"]);
  if ("response" in access) return access.response;
  const { publicId } = await params;
  const parsed = statusRequest.safeParse(
    await request.json().catch(() => null),
  );
  if (!/^MX-[A-F0-9]{20}$/.test(publicId) || !parsed.success)
    return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  if (parsed.data.status === "NO_PRESENTADO" && access.actor.role !== "ADMIN")
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    return Response.json(
      await changeOrder(
        publicId,
        parsed.data.status,
        access.actor.id,
        parsed.data.requestId,
      ),
    );
  } catch (error) {
    return operationError(error);
  }
}
