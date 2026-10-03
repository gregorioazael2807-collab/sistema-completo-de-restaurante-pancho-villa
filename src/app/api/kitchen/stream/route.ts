import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { kitchenSnapshot } from "@/lib/kitchen-snapshot";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", stop, { once: true });
      const emit = async () => {
        if (stopped) return;
        try {
          // Revalidate the real account on every heartbeat; revoked roles cannot keep a stream.
          const current = await db.user.findUnique({
            where: { id: access.actor.id },
            select: { active: true, role: true, sessionVersion: true },
          });
          if (
            !current ||
            !current.active ||
            current.role !== "ADMIN" ||
            current.sessionVersion !== access.actor.sessionVersion
          ) {
            controller.enqueue(encoder.encode("event: revoked\ndata: {}\n\n"));
            stop();
            return;
          }
          const data = await kitchenSnapshot(current.role === "ADMIN");
          if (stopped) return;
          controller.enqueue(
            encoder.encode(
              `event: snapshot\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          if (!stopped)
            controller.enqueue(
              encoder.encode("event: unavailable\ndata: {}\n\n"),
            );
        }
        if (!stopped) timer = setTimeout(() => void emit(), 5000);
      };
      // Send complete snapshots, including immediately after reconnect. No fragile event-only cursor.
      await emit();
    },
    cancel() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
