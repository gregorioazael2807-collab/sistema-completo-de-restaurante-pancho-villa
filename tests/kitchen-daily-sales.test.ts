import { describe, expect, it } from "vitest";
import { dailySalesWindow, summarizeDailySales } from "../src/lib/kitchen-daily-sales";

const now = new Date("2026-10-03T18:00:00Z");
const order = {
  currency: "EUR", subtotal: "25.00", discountAmount: "2.00", taxAmount: "1.61", deliveryFee: "3.00", total: "27.61",
  items: [{ productName: "Tacos", quantity: 2, lineTotal: "25.00", modifiers: [{ modifierName: "Extra salsa", priceDelta: "1.00" }] }],
};
describe("cierre diario de ventas", () => {
  it("suma históricos sin duplicar los extras", () => {
    const [group] = summarizeDailySales([order, order], now, "Europe/Berlin").currencies;
    expect(group.orders).toBe(2);
    expect(group.quantity).toBe(4);
    expect(group.products[0].totalCents).toBe(5000);
    expect(group.totalCents).toBe(5522);
    expect(group.discountCents).toBe(400);
    expect(group.taxCents).toBe(322);
    expect(group.deliveryCents).toBe(600);
  });
  it("mantiene las monedas separadas", () => {
    expect(summarizeDailySales([order, { ...order, currency: "USD" }], now, "Europe/Berlin").currencies).toHaveLength(2);
  });
  it("permite un día sin ventas", () => {
    expect(summarizeDailySales([], now, "Europe/Berlin").currencies).toEqual([]);
  });
  it("usa medianoche local incluso en días de cambio horario", () => {
    expect(dailySalesWindow(new Date("2026-03-29T20:00:00Z"), "Europe/Berlin").start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(dailySalesWindow(new Date("2026-10-25T20:00:00Z"), "Europe/Berlin").start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
  });
  it("mantiene la fecha local cuando UTC es otro día", () => {
    expect(dailySalesWindow(new Date("2026-10-03T22:30:00Z"), "Europe/Berlin").date).toBe("2026-10-04");
  });
});
