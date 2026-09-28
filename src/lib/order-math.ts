export type PricedLine = { unitCents: number; quantity: number };

export function calculateOrderTotals(
  lines: PricedLine[],
  taxRate: number,
  deliveryFeeCents: number,
  discountCents = 0,
) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitCents * line.quantity,
    0,
  );
  const appliedDiscountCents = Math.min(subtotalCents, Math.max(0, discountCents));
  const taxableCents = subtotalCents - appliedDiscountCents;
  const taxCents = Math.round(taxableCents * taxRate);
  return {
    subtotalCents,
    taxCents,
    deliveryFeeCents,
    discountCents: appliedDiscountCents,
    totalCents: taxableCents + taxCents + deliveryFeeCents,
  };
}

export function centsToDecimal(cents: number) {
  return (cents / 100).toFixed(2);
}

export function validateModifierSelection<
  T extends { id: string; priceDelta: number },
>(groups: { id: string; minSelect: number; maxSelect: number; modifiers: T[] }[], selectedIds: string[]) {
  if (new Set(selectedIds).size !== selectedIds.length) return null;
  const allowed = new Map(groups.flatMap((group) => group.modifiers.map((modifier) => [modifier.id, { modifier, group }] as const)));
  const selected = selectedIds.map((id) => allowed.get(id));
  if (selected.some((item) => !item)) return null;
  for (const group of groups) {
    const count = selected.filter((item) => item?.group.id === group.id).length;
    if (count < group.minSelect || count > group.maxSelect) return null;
  }
  return selected.flatMap((item) => item ? [item] : []);
}
