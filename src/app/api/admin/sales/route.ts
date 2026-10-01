import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { operationError } from "@/lib/kitchen-transaction";
export async function GET(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const url = new URL(request.url);
  const from = new Date(
      url.searchParams.get("from") ??
        new Date(Date.now() - 30 * 86400000).toISOString(),
    ),
    until = new Date(url.searchParams.get("until") ?? new Date().toISOString());
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(until.getTime()) ||
    from > until
  )
    return Response.json({ error: "INVALID_RANGE" }, { status: 400 });
  try {
    const where = { createdAt: { gte: from, lte: until } };
    const [orders, count] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          publicId: true,
          status: true,
          type: true,
          createdAt: true,
          currency: true,
          subtotal: true,
          discountAmount: true,
          taxRate: true,
          taxAmount: true,
          deliveryFee: true,
          total: true,
          ingredientCostCents: true,
          inventoryComplete: true,
          preparationStartedAt: true,
          payment: {
            select: {
              status: true,
              method: true,
              amount: true,
              paidAt: true,
              refundedAt: true,
              refundedAmount: true,
              entries: {
                select: {
                  kind: true,
                  method: true,
                  amount: true,
                  createdAt: true,
                },
              },
            },
          },
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              ingredientCostCents: true,
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);
    const currencies: Record<
      string,
      {
        pendingCents: number;
        collectedCents: number;
        refundedCents: number;
        ingredientCostCents: number;
        ingredientMarginCents: number;
        unknownCosts: number;
      }
    > = {};
    for (const order of orders) {
      const total = (currencies[order.currency] ??= {
        pendingCents: 0,
        collectedCents: 0,
        refundedCents: 0,
        ingredientCostCents: 0,
        ingredientMarginCents: 0,
        unknownCosts: 0,
      });
      const money = (v: unknown) => Math.round(Number(v) * 100);
      const paid =
        order.payment && ["PAID", "REFUNDED"].includes(order.payment.status);
      if (paid) {
        total.collectedCents += money(order.payment!.amount);
        total.refundedCents += money(order.payment!.refundedAmount);
      } else if (order.payment?.status === "PAYMENT_PENDING")
        total.pendingCents += money(order.total);
      if (
        order.ingredientCostCents !== null &&
        order.preparationStartedAt !== null
      ) {
        total.ingredientCostCents += order.ingredientCostCents;
        if (paid)
          total.ingredientMarginCents +=
            money(order.subtotal) -
            money(order.discountAmount) -
            money(order.payment!.refundedAmount) -
            order.ingredientCostCents;
      } else total.unknownCosts++;
    }
    return Response.json(
      {
        orders,
        count,
        truncated: count > 500,
        from,
        until,
        currencies,
        fiscalComplete: false,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return operationError(error);
  }
}
