import type { DailySales } from "@/lib/kitchen-daily-sales";

type Amount = { toString(): string } | string | number;
export type InventoryCloseReport = {
  currency: string;
  knownPurchaseCents: number;
  purchasesWithoutCost: number;
  knownSoldIngredientCostCents: number;
  soldOrdersWithoutCompleteCost: number;
  purchases: { name: string; quantity: number; unit: string; costCents: number | null }[];
  stock: { name: string; unit: string; quantity: number; reserved: number; available: number; low: boolean }[];
};
export type KitchenCloseSummary = {
  prepared: number;
  effectiveMinutes: number;
  averageMinutes: number | null;
  dailySales?: DailySales;
  inventory?: InventoryCloseReport;
};

export function summarizeInventoryClose(
  ingredients: { name: string; unit: string; stock: Amount; reserved: Amount; minimum: Amount }[],
  movements: { kind: string; quantity: Amount; unitCostCents: Amount | null; ingredient: { name: string; unit: string } }[],
  soldOrders: { currency: string; ingredientCostCents: number | null; inventoryComplete: boolean }[],
  currency: string,
): InventoryCloseReport {
  const purchases = movements.filter((m) => m.kind === "PURCHASE").map((m) => ({
    name: m.ingredient.name, unit: m.ingredient.unit, quantity: Number(m.quantity.toString()),
    costCents: m.unitCostCents === null ? null : Math.round(Number(m.quantity.toString()) * Number(m.unitCostCents.toString())),
  }));
  const matchingOrders = soldOrders.filter((order) => order.currency === currency);
  return {
    currency,
    knownPurchaseCents: purchases.reduce((sum, row) => sum + (row.costCents ?? 0), 0),
    purchasesWithoutCost: purchases.filter((row) => row.costCents === null).length,
    knownSoldIngredientCostCents: matchingOrders.reduce((sum, order) => sum + (order.ingredientCostCents ?? 0), 0),
    soldOrdersWithoutCompleteCost: matchingOrders.filter((order) => order.ingredientCostCents === null || !order.inventoryComplete).length,
    purchases,
    stock: ingredients.map((i) => {
      const quantity = Number(i.stock.toString()), reserved = Number(i.reserved.toString());
      const available = Math.round((quantity - reserved) * 1000) / 1000;
      return { name: i.name, unit: i.unit, quantity, reserved, available, low: available <= Number(i.minimum.toString()) };
    }),
  };
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const money = (cents: number, currency: string) => escape(new Intl.NumberFormat("es", { style: "currency", currency }).format(cents / 100));

export function kitchenCloseEmail(summary: KitchenCloseSummary, name = "Pancho Villa") {
  const sales = summary.dailySales;
  const inventory = summary.inventory;
  const sections = (sales?.currencies ?? []).map((group) => `<h2>Ventas ${escape(group.currency)}</h2><p>${group.orders} comandas · ${group.quantity} productos</p><table><tr><th>Producto y extras</th><th>Cantidad</th><th>Importe</th></tr>${group.products.map((row) => `<tr><td>${escape(row.name)}</td><td>${row.quantity}</td><td>${money(row.totalCents, group.currency)}</td></tr>`).join("")}</table><p>Productos: ${money(group.subtotalCents, group.currency)}<br>Descuentos: −${money(group.discountCents, group.currency)}<br>Impuestos: ${money(group.taxCents, group.currency)}<br>Reparto: ${money(group.deliveryCents, group.currency)}<br><strong>Total vendido: ${money(group.totalCents, group.currency)}</strong></p>`).join("");
  const inventoryHtml = inventory ? `<h2>Compras de ingredientes (${escape(inventory.currency)})</h2><table><tr><th>Ingrediente</th><th>Cantidad</th><th>Coste registrado</th></tr>${inventory.purchases.map((row) => `<tr><td>${escape(row.name)}</td><td>${row.quantity} ${escape(row.unit)}</td><td>${row.costCents === null ? "Pendiente" : money(row.costCents, inventory.currency)}</td></tr>`).join("")}</table><p>Compras con coste conocido: ${money(inventory.knownPurchaseCents, inventory.currency)}. Compras sin coste: ${inventory.purchasesWithoutCost}.</p><p>Coste conocido de ingredientes de ventas en ${escape(inventory.currency)}: ${money(inventory.knownSoldIngredientCostCents, inventory.currency)}. Comandas con coste incompleto: ${inventory.soldOrdersWithoutCompleteCost}.</p><p>Compras y consumo son conceptos distintos: no se suman como un único gasto. No incluye alquiler, salarios, otros gastos ni certifica pagos o beneficio neto.</p><h2>Inventario al cierre</h2><table><tr><th>Ingrediente</th><th>Existencias</th><th>Reservado</th><th>Disponible</th></tr>${inventory.stock.map((row) => `<tr><td>${escape(row.name)}${row.low ? " · STOCK BAJO" : ""}</td><td>${row.quantity} ${escape(row.unit)}</td><td>${row.reserved}</td><td>${row.available}</td></tr>`).join("")}</table>` : "";
  return {
    subject: `Cierre de ventas${sales ? ` · ${sales.date}` : ""} · ${name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto"><h1>${escape(name)}</h1>${sales ? `<p>Día ${escape(sales.date)} · ${escape(sales.timezone)}. Corte: ${escape(sales.through)}.</p>${sections || "<p>Sin comandas entregadas ese día.</p>"}` : "<p>Este cierre anterior no incluye detalle de ventas.</p>"}${inventoryHtml}<h2>Operación del turno</h2><p>Preparados: ${Number(summary.prepared)} · Minutos efectivos: ${Number(summary.effectiveMinutes).toFixed(1)} · Preparación media: ${summary.averageMinutes === null ? "Pendiente" : Number(summary.averageMinutes).toFixed(1)}</p><p>Ventas entregadas acumuladas del día hasta este cierre; excluye cancelados y pendientes. No sumes informes del mismo día. No es una confirmación de efectivo ni de cobros.</p></div>`,
  };
}
