import { requireRole } from "@/lib/access";
import { shiftAction, shiftRequest } from "@/lib/kitchen-shifts";
import { operationError } from "@/lib/kitchen-transaction";
import { after } from "next/server";
import { processOutboxBatch } from "@/lib/outbox";
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = shiftRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "INVALID_ACTION" }, { status: 400 });
  try {
    const result = await shiftAction(parsed.data, access.actor.id, access.actor.role === "ADMIN");
    if (parsed.data.action === "CLOSE") {
      // Solo este informe: no envía el resto del backlog al cerrar cocina.
      after(async () => { await processOutboxBatch(1, `shift-summary:${result.id}`); });
    }
    return Response.json(result);
  } catch (error) {
    return operationError(error);
  }
}
