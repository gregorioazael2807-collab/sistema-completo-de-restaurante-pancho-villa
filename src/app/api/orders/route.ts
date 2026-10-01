import { randomBytes } from "node:crypto";
import { OrderType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calculateOrderTotals, centsToDecimal, validateModifierSelection } from "@/lib/order-math";
import { rateLimit } from "@/lib/security";

const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  locale: z.enum(["es", "en", "de"]).default("es"),
  type: z.enum(["PICKUP", "DELIVERY"]),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.email().max(254),
  customerPhone: z.string().trim().min(5).max(32),
  address: z
    .object({
      recipient: z.string().trim().min(2).max(120),
      line1: z.string().trim().min(3).max(180),
      line2: z.string().trim().max(180).optional(),
      city: z.string().trim().min(2).max(100),
      postalCode: z.string().trim().min(3).max(20),
      countryCode: z.string().length(2).default("DE"),
      deliveryNote: z.string().trim().max(1000).optional(),
    })
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(20),
        instructions: z.string().trim().max(500).optional(),
        modifierIds: z.array(z.string().min(1).max(64)).max(10).default([]),
      }),
    )
    .min(1)
    .max(30),
}).superRefine((value, context) => {
  if (value.type === "DELIVERY" && !value.address) {
    context.addIssue({ code: "custom", path: ["address"], message: "Required for delivery" });
  }
});

const moneyToCents = (value: Prisma.Decimal | number | string) =>
  Math.round(Number(value) * 100);

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CHECKOUT", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try { await rateLimit(`order-create:${ip}`, 10, 15); }
  catch (error) {
    if (error instanceof Error && error.message === "AUTH_RATE_LIMITED") return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    return NextResponse.json({ error: "ORDER_UNAVAILABLE" }, { status: 503 });
  }
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const existing = await db.order.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
    if (existing) return NextResponse.json({ id: existing.id, publicId: existing.publicId, status: existing.status }, { status: 200 });

    const created = await db.$transaction(async (tx) => {
      const [settings, products, user] = await Promise.all([
        tx.restaurantSettings.findFirst(),
        tx.product.findMany({ where: { id: { in: [...new Set(data.items.map((item) => item.productId))] }, available: true, category: { active: true } }, include: { translations: true, modifierGroups: { where: { group: { active: true } }, include: { group: { include: { modifiers: { where: { available: true }, include: { translations: true } }, translations: true } } } } } }),
        userId ? tx.user.findUnique({ where: { id: userId }, select: { id: true, active: true, customer: { select: { id: true } } } }) : null,
      ]);
      if (!settings?.acceptingOrders) throw new Error("ORDERS_CLOSED");
      if (userId && (!user || !user.active)) throw new Error("UNAUTHENTICATED");
      if (data.type === "DELIVERY" && (!settings.deliveryEnabled || !data.address)) throw new Error("DELIVERY_UNAVAILABLE");
      if (data.type === "PICKUP" && !settings.pickupEnabled) throw new Error("PICKUP_UNAVAILABLE");
      const productById = new Map(products.map((product) => [product.id, product]));
      if (productById.size !== new Set(data.items.map((item) => item.productId)).size) throw new Error("PRODUCT_UNAVAILABLE");
      const resolved = data.items.map((line) => {
        const product = productById.get(line.productId)!;
        const groups = product.modifierGroups.map((link) => link.group);
        const chosen = validateModifierSelection(groups.map((group) => ({ id: group.id, minSelect: group.minSelect, maxSelect: group.maxSelect, modifiers: group.modifiers.map((modifier) => ({ ...modifier, priceDelta: moneyToCents(modifier.priceDelta) })) })), line.modifierIds);
        if (!chosen) throw new Error("INVALID_MODIFIERS");
        const price = moneyToCents(product.price) + chosen.reduce((sum, choice) => sum + choice.modifier.priceDelta, 0);
        const translated = product.translations.find((translation) => translation.locale === data.locale);
        return { line, product, chosen, unitCents: price, displayName: translated?.name ?? product.name };
      });
      const totals = calculateOrderTotals(resolved.map(({ line, unitCents }) => ({ unitCents, quantity: line.quantity })), Number(settings.taxRate), data.type === "DELIVERY" ? moneyToCents(settings.deliveryFee) : 0);
      if (data.type === "DELIVERY" && totals.subtotalCents < moneyToCents(settings.minDeliveryAmount)) throw new Error("DELIVERY_MINIMUM");
      const publicId = `MX-${randomBytes(10).toString("hex").toUpperCase()}`;
      const address = data.address;
      return tx.order.create({
        data: {
          publicId,
          idempotencyKey: data.idempotencyKey,
          userId: user?.id ?? null,
          customerId: user?.customer?.id ?? null,
          type: data.type as OrderType,
          customerName: data.customerName,
          customerEmail: data.customerEmail.toLowerCase(),
          customerPhone: data.customerPhone,
          customerLocale: data.locale,
          deliveryRecipient: address?.recipient,
          deliveryLine1: address?.line1,
          deliveryLine2: address?.line2,
          deliveryCity: address?.city,
          deliveryPostalCode: address?.postalCode,
          deliveryCountryCode: address?.countryCode.toUpperCase(),
          deliveryNote: address?.deliveryNote,
          notes: data.notes,
          currency: settings.currency,
          subtotal: centsToDecimal(totals.subtotalCents),
          taxRate: settings.taxRate,
          taxAmount: centsToDecimal(totals.taxCents),
          deliveryFee: centsToDecimal(totals.deliveryFeeCents),
          discountAmount: centsToDecimal(totals.discountCents),
          total: centsToDecimal(totals.totalCents),
          estimatedReadyAt: new Date(Date.now() + settings.estimatedPrepMinutes * 60_000),
          items: { create: resolved.map(({ line, product, chosen, unitCents, displayName }) => ({
            productId: product.id,
            productName: displayName,
            quantity: line.quantity,
            unitPrice: centsToDecimal(unitCents),
            lineTotal: centsToDecimal(unitCents * line.quantity),
            instructions: line.instructions,
            modifiers: { create: chosen.map(({ modifier }) => ({
              modifierId: modifier.id,
              modifierName: modifier.translations.find((translation) => translation.locale === data.locale)?.name ?? modifier.name,
              priceDelta: centsToDecimal(modifier.priceDelta),
            })) },
          })) },
          ...(user?.id ? { customerNotices: { create: { userId: user.id, eventKey: `order-created:${data.idempotencyKey}`, status: "NUEVO" as const } } } : {}),
          statusHistory: { create: { to: "NUEVO", note: "Order placed" } },
          payment: { create: { amount: centsToDecimal(totals.totalCents), currency: settings.currency, status: "PAYMENT_PENDING" } },
          automationJobs: { create: { dedupeKey: `order-created:${data.idempotencyKey}`, kind: "ORDER_CREATED", payload: { publicId, notifyEmail: data.customerEmail, locale: data.locale, notificationDedupeKey: `order-confirmation:${data.idempotencyKey}` } } },
          notifications: { create: { dedupeKey: `order-confirmation:${data.idempotencyKey}`, type: "ORDER_CONFIRMATION", recipient: data.customerEmail.toLowerCase(), locale: data.locale, userId: user?.id ?? null } },
        },
        select: { id: true, publicId: true, status: true, total: true, currency: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ["INVALID_MODIFIERS", "ORDERS_CLOSED", "UNAUTHENTICATED", "DELIVERY_UNAVAILABLE", "PICKUP_UNAVAILABLE", "PRODUCT_UNAVAILABLE", "DELIVERY_MINIMUM"].includes(error.message)) {
      const status = error.message === "UNAUTHENTICATED" ? 401 : error.message === "ORDERS_CLOSED" || error.message === "PRODUCT_UNAVAILABLE" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      const duplicate = await db.order.findUnique({ where: { idempotencyKey: data.idempotencyKey }, select: { id: true, publicId: true, status: true } });
      if (duplicate) return NextResponse.json(duplicate, { status: 200 });
    }
    console.error("[orders:create]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "ORDER_UNAVAILABLE" }, { status: 503 });
  }
}
