import { describe, expect, it } from "vitest";
import { calculateOrderTotals, centsToDecimal, validateModifierSelection } from "@/lib/order-math";

describe("order totals", () => {
  it("calculates quantity, tax and delivery in integer cents", () => {
    expect(calculateOrderTotals([{ unitCents: 1250, quantity: 2 }, { unitCents: 420, quantity: 1 }], 0.19, 250)).toEqual({ subtotalCents: 2920, taxCents: 555, deliveryFeeCents: 250, discountCents: 0, totalCents: 3725 });
  });
  it("applies discounts before tax without a negative total", () => {
    expect(calculateOrderTotals([{ unitCents: 1000, quantity: 1 }], 0.2, 0, 1200)).toEqual({ subtotalCents: 1000, taxCents: 0, deliveryFeeCents: 0, discountCents: 1000, totalCents: 0 });
  });
  it("formats cents as exact decimal money", () => {
    expect(centsToDecimal(3725)).toBe("37.25");
  });
  it("validates option group limits, unknown choices and duplicate ids", () => {
    const groups = [{ id: "extra", minSelect: 1, maxSelect: 2, modifiers: [{ id: "guac", priceDelta: 250 }, { id: "cheese", priceDelta: 150 }] }];
    expect(validateModifierSelection(groups, ["guac"])?.[0].modifier.id).toBe("guac");
    expect(validateModifierSelection(groups, [])).toBeNull();
    expect(validateModifierSelection(groups, ["guac", "cheese", "guac"])).toBeNull();
    expect(validateModifierSelection(groups, ["unknown"])).toBeNull();
  });
});
