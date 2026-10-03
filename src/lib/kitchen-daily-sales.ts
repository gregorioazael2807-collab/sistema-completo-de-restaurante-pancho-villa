import { Temporal } from "@js-temporal/polyfill";

export type DailySales = {
  date: string;
  timezone: string;
  through: string;
  currencies: {
    currency: string;
    orders: number;
    quantity: number;
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    deliveryCents: number;
    totalCents: number;
    products: { name: string; quantity: number; totalCents: number }[];
  }[];
};
type Amount = { toString(): string } | string | number;
type SoldOrder = {
  currency: string;
  subtotal: Amount;
  discountAmount: Amount;
  taxAmount: Amount;
  deliveryFee: Amount;
  total: Amount;
  items: { productName: string; quantity: number; lineTotal: Amount; modifiers: { modifierName: string; priceDelta: Amount }[] }[];
};
const cents = (value: Amount) => Math.round(Number(value.toString()) * 100);

export function dailySalesWindow(now: Date, timezone: string) {
  const local = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timezone);
  return { date: local.toPlainDate().toString(), start: new Date(Number(local.startOfDay().epochMilliseconds)) };
}

export function summarizeDailySales(orders: SoldOrder[], now: Date, timezone: string): DailySales {
  const groups = new Map<string, DailySales["currencies"][number]>();
  const productKeys = new Map<DailySales["currencies"][number], Map<string, DailySales["currencies"][number]["products"][number]>>();
  for (const order of orders) {
    let group = groups.get(order.currency);
    if (!group) {
      group = { currency: order.currency, orders: 0, quantity: 0, subtotalCents: 0, discountCents: 0, taxCents: 0, deliveryCents: 0, totalCents: 0, products: [] };
      groups.set(order.currency, group);
    }
    group.orders++;
    group.subtotalCents += cents(order.subtotal);
    group.discountCents += cents(order.discountAmount);
    group.taxCents += cents(order.taxAmount);
    group.deliveryCents += cents(order.deliveryFee);
    group.totalCents += cents(order.total);
    for (const item of order.items) {
      group.quantity += item.quantity;
      // lineTotal ya incluye extras; no se suman otra vez.
      const extras = item.modifiers.map((m) => `${m.modifierName} (${cents(m.priceDelta)})`).sort();
      const name = extras.length ? `${item.productName} · ${item.modifiers.map((m) => m.modifierName).sort().join(", ")}` : item.productName;
      const key = JSON.stringify([item.productName, extras]);
      const existing = productKeys.get(group)?.get(key);
      if (existing) { existing.quantity += item.quantity; existing.totalCents += cents(item.lineTotal); }
      else {
        const row = { name, quantity: item.quantity, totalCents: cents(item.lineTotal) };
        group.products.push(row);
        if (!productKeys.has(group)) productKeys.set(group, new Map());
        productKeys.get(group)!.set(key, row);
      }
    }
  }
  return { date: dailySalesWindow(now, timezone).date, timezone, through: now.toISOString(), currencies: [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency)) };
}
