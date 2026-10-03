import { describe, expect, it } from "vitest";
import { kitchenCloseEmail, summarizeInventoryClose } from "../src/lib/kitchen-close-report";
import { summarizeDailySales } from "../src/lib/kitchen-daily-sales";

const ingredient = { name: "Maíz", unit: "g", stock: "50", reserved: "10", minimum: "45" };
const now = new Date("2026-10-03T18:00:00Z");
describe("correo de cierre e inventario", () => {
  it("calcula compras en unidades base y separa consumo", () => {
    const report = summarizeInventoryClose([ingredient], [{ kind: "PURCHASE", quantity: "1000", unitCostCents: "0.2", ingredient }], [{ currency: "EUR", ingredientCostCents: 75, inventoryComplete: true }], "EUR");
    expect(report.knownPurchaseCents).toBe(200);
    expect(report.knownSoldIngredientCostCents).toBe(75);
    expect(report.stock[0].available).toBe(40);
    expect(report.stock[0].low).toBe(true);
  });
  it("no inventa costes cuando faltan", () => {
    const report = summarizeInventoryClose([], [{ kind: "PURCHASE", quantity: 2, unitCostCents: null, ingredient }], [{ currency: "EUR", ingredientCostCents: null, inventoryComplete: false }], "EUR");
    expect(report.purchasesWithoutCost).toBe(1);
    expect(report.purchases[0].costCents).toBeNull();
    expect(report.soldOrdersWithoutCompleteCost).toBe(1);
  });
  it("no trata entradas gratuitas como compras ni mezcla monedas", () => {
    const report = summarizeInventoryClose([], [{ kind: "ENTRY", quantity: 100, unitCostCents: 2, ingredient }], [{ currency: "USD", ingredientCostCents: 900, inventoryComplete: true }], "EUR");
    expect(report.knownPurchaseCents).toBe(0);
    expect(report.knownSoldIngredientCostCents).toBe(0);
  });
  it("escapa nombres en el correo y detalla costes pendientes", () => {
    const inventory = summarizeInventoryClose([{ ...ingredient, name: "<script>" }], [{ kind: "PURCHASE", quantity: 1, unitCostCents: null, ingredient }], [], "EUR");
    const email = kitchenCloseEmail({ prepared: 1, effectiveMinutes: 30, averageMinutes: null, inventory, dailySales: summarizeDailySales([], now, "Europe/Berlin") }, "<img>");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Pendiente");
    expect(email.html).toContain("STOCK BAJO");
    expect(email.subject).toContain("2026-10-03");
  });
  it("permite cierres anteriores sin inventario histórico", () => {
    expect(kitchenCloseEmail({ prepared: 2, effectiveMinutes: 60, averageMinutes: 5 }).html).toContain("no incluye detalle de ventas");
  });
});
