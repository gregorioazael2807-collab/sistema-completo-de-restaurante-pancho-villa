import { AIEventKind } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { filterRecommendations, isAllergyQuestion, parseAiOutput } from "@/lib/ai-output";

const inputSchema = z.object({ message: z.string().trim().min(1).max(1000), selectedOrderId: z.string().max(40).optional() });
const orderCopy = {
  es: { noOrders: "No tienes pedidos activos vinculados a esta cuenta ahora mismo.", order: "Tu pedido", status: "está", question: "Estas son las actualizaciones reales de tus pedidos activos:" },
  en: { noOrders: "There are no active orders linked to your account right now.", order: "Your order", status: "is", question: "Here are the current updates from your active orders:" },
  de: { noOrders: "Deinem Konto sind derzeit keine aktiven Bestellungen zugeordnet.", order: "Deine Bestellung", status: "ist", question: "Hier sind die aktuellen Updates deiner aktiven Bestellungen:" },
} as const;
const statusName = {
  es: { NUEVO: "recibido", CONFIRMADO: "confirmado", EN_PREPARACION: "en preparación", LISTO: "listo para recoger", EN_CAMINO: "en camino", ENTREGADO: "entregado", CANCELADO: "cancelado", NO_PRESENTADO: "no recogido" },
  en: { NUEVO: "received", CONFIRMADO: "confirmed", EN_PREPARACION: "being prepared", LISTO: "ready for pickup", EN_CAMINO: "on the way", ENTREGADO: "delivered", CANCELADO: "cancelled", NO_PRESENTADO: "not collected" },
  de: { NUEVO: "eingegangen", CONFIRMADO: "bestätigt", EN_PREPARACION: "in Zubereitung", LISTO: "abholbereit", EN_CAMINO: "unterwegs", ENTREGADO: "zugestellt", CANCELADO: "storniert", NO_PRESENTADO: "nicht abgeholt" },
} as const;

export async function POST(request: Request) {
  const access = await requireRole(["CLIENTE", "ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_MESSAGE" }, { status: 400 });
  const locale = access.actor ? (await db.user.findUnique({ where: { id: access.actor.id }, select: { locale: true } }))?.locale ?? "es" : "es";
  const lang = locale === "en" || locale === "de" ? locale : "es";
  const msg = parsed.data.message;
  try {
    const [products, orders] = await Promise.all([
      db.product.findMany({ where: { available: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 80, select: { id: true, slug: true, name: true, description: true, ingredients: true, allergens: true, price: true, currency: true, image: { select: { src: true } }, translations: { where: { locale }, select: { name: true, description: true } } } }),
      db.order.findMany({ where: { userId: access.actor.id, status: { in: ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO"] } }, orderBy: { createdAt: "desc" }, take: 8, select: { publicId: true, status: true, createdAt: true, type: true, items: { select: { productName: true, quantity: true } } } }),
    ]);
    if (isAllergyQuestion(msg)) {
      const reply = lang === "es" ? "Puedo mostrarte los alérgenos registrados en la ficha de cada plato, pero no puedo garantizar la ausencia de alérgenos ni de contaminación cruzada. Confirma siempre tu caso con el restaurante antes de pedir." : lang === "en" ? "I can show the allergens listed on each dish, but I cannot guarantee the absence of allergens or cross-contamination. Always confirm your situation with the restaurant before ordering." : "Ich kann die in den Gerichtekarten erfassten Allergene anzeigen, aber weder Allergenfreiheit noch Schutz vor Kreuzkontamination garantieren. Bitte kläre deinen Fall vor der Bestellung mit dem Restaurant.";
      await db.aIAuditEvent.create({ data: { userId: access.actor.id, kind: AIEventKind.SAFETY_REFUSAL, input: msg, output: reply } });
      return Response.json({ reply, recommendations: [], orders: [], safetyNotice: true });
    }
    if (/\b(order|pedido|bestellung|estado|status|tracking|seguimiento|verfolgen)\b/i.test(msg)) {
      const c = orderCopy[lang];
      const actionRequested = /cancel|anula|cancelar|stornier|cambia|cambiar|change|modify|reprogram|umbuch|ändern/i.test(msg);
      const notice = lang === "es" ? "No he cambiado ni cancelado nada; contacta con el restaurante para solicitarlo." : lang === "en" ? "I have not changed or cancelled anything; contact the restaurant to request it." : "Ich habe nichts geändert oder storniert. Bitte wende dich für eine Anfrage an das Restaurant.";
      const statusReply = orders.length === 0 ? c.noOrders : `${c.question} ${orders.map((order) => `${c.order} ${order.publicId} ${c.status} ${statusName[lang][order.status] ?? order.status}.`).join(" ")}`;
      const reply = actionRequested ? `${notice} ${statusReply}` : statusReply;
      await db.aIAuditEvent.create({ data: { userId: access.actor.id, kind: AIEventKind.ORDER_LOOKUP, input: msg, output: reply } });
      return Response.json({ reply, recommendations: [], orders: orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() })) });
    }
    if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL || !process.env.AI_MODEL) return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    const menu = products.map((product) => ({ id: product.id, slug: product.slug, name: product.translations[0]?.name ?? product.name, description: product.translations[0]?.description ?? product.description, ingredients: product.ingredients, allergens: product.allergens, price: product.price.toString(), currency: product.currency, image: product.image?.src ?? null }));
    const response = await fetch(`${process.env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${process.env.AI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.AI_MODEL, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: `You are SaborMX, the helpful menu assistant for Pancho Villa. Answer in ${lang}. Only recommend available products using exact slugs in the supplied menu. Do not invent prices, ingredients, allergens, availability, order data, statistics, or claim food is allergen-safe. Never place, cancel, modify or charge an order. Return only JSON: {"intent":"MENU_RECOMMENDATION"|"GENERAL","reply":"short helpful answer","recommendationSlugs":["valid menu slug"]}. Menu data: ${JSON.stringify(menu)}` }, { role: "user", content: msg }] }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("AI_PROVIDER_ERROR");
    const body = await response.json() as { choices?: { message?: { content?: string | null } }[] };
    const raw = body.choices?.[0]?.message?.content;
    if (!raw || raw.length > 5000) throw new Error("AI_INVALID_RESPONSE");
    const normalized = raw.replace(/^```(?:json)?\s*|\s*```$/g, "");
    const output = parseAiOutput(JSON.parse(normalized));
    if (!output.success) throw new Error("AI_INVALID_RESPONSE");
    const recommendations = filterRecommendations(output.data.recommendationSlugs, menu);
    await db.aIAuditEvent.create({ data: { userId: access.actor.id, kind: AIEventKind.RECOMMENDATION, input: msg, output: output.data.reply, metadata: { recommendationSlugs: recommendations.map((product) => product.slug) } } });
    return Response.json({ reply: output.data.reply, recommendations, orders: [] });
  } catch (error) {
    console.error("[ai:chat]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: error instanceof Error && error.message === "AI_NOT_CONFIGURED" ? "AI_NOT_CONFIGURED" : "AI_UNAVAILABLE" }, { status: error instanceof Error && error.message === "AI_NOT_CONFIGURED" ? 503 : 502 });
  }
}
