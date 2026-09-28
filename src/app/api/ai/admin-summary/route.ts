import { AIEventKind } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/access";
import { getAdminSummary } from "@/lib/admin-summary";
import { db } from "@/lib/db";

const outputSchema = z.object({ analysis: z.string().trim().min(1).max(500) }).strict();

export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL || !process.env.AI_MODEL) return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  try {
    const stats = await getAdminSummary();
    const locale = (await db.user.findUnique({ where: { id: access.actor.id }, select: { locale: true } }))?.locale ?? "es";
    const facts = { paidSalesToday: stats.today.sales, ordersToday: stats.today.orders, paidAverageTicketToday: stats.today.average, activeOrders: stats.today.active, cancellationsToday: stats.today.cancelled, uncollectedToday: stats.today.noShows, paidSalesByDayThisWeek: stats.week.map(({ date, sales, orders }) => ({ date, sales, orders })), mostOrderedProducts: stats.topProducts.slice(0, 3), peakOrderHour: stats.peakHour };
    const response = await fetch(`${process.env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${process.env.AI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.AI_MODEL, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: `You analyze Pancho Villa restaurant metrics. Answer in locale ${locale}. Only describe patterns directly supported by these exact backend-calculated facts. Do not state any digits, amounts, quantities, dates, named products or unprovided statistics. Do not invent. Return JSON {"analysis":"one brief sentence, no digits"}. Facts: ${JSON.stringify(facts)}` }, { role: "user", content: "Summarize the most useful operational pattern." }] }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("AI_PROVIDER_ERROR");
    const body = await response.json() as { choices?: { message?: { content?: string | null } }[] };
    const raw = body.choices?.[0]?.message?.content;
    if (!raw || raw.length > 3000) throw new Error("AI_INVALID_RESPONSE");
    const parsed = outputSchema.safeParse(JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")));
    if (!parsed.success || /\d/.test(parsed.data.analysis)) throw new Error("AI_INVALID_RESPONSE");
    await db.aIAuditEvent.create({ data: { userId: access.actor.id, kind: AIEventKind.ADMIN_SUMMARY, output: parsed.data.analysis, metadata: facts } });
    return Response.json({ analysis: parsed.data.analysis, facts });
  } catch (error) {
    console.error("[ai:admin-summary]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 502 });
  }
}
