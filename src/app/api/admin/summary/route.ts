import { requireRole } from "@/lib/access";
import { getAdminSummary } from "@/lib/admin-summary";

export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try { return Response.json(await getAdminSummary(), { headers: { "cache-control": "no-store" } }); }
  catch (error) { console.error("[admin:summary]", error instanceof Error ? error.message : "unknown error"); return Response.json({ error: "SUMMARY_UNAVAILABLE" }, { status: 503 }); }
}
