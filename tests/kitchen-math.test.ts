import { expect, test } from "vitest";
import {
  estimateKitchen,
  toBaseQuantity,
  straightDistanceKm,
  deliveryBand,
  arrivalWindow,
} from "@/lib/kitchen-math";
const now = new Date("2026-10-01T12:00:00Z");
const item = (id: string, stationId = "grill", quantity = 1) => ({
  id,
  orderId: id,
  createdAt: now,
  startedAt: null,
  finishedAt: null,
  tasks: [{ stationId, minMinutes: 10, maxMinutes: 12, quantity }],
  unknown: false,
});
test("two dishes run simultaneously when station capacity permits", () => {
  const r = estimateKitchen([item("a"), item("b")], { grill: 2 }, now);
  expect(r.a.until).toEqual(new Date("2026-10-01T12:12:00Z"));
  expect(r.b.until).toEqual(r.a.until);
});
test("previous tickets and station capacity produce waiting intervals", () => {
  const r = estimateKitchen([item("a"), item("b")], { grill: 1 }, now);
  expect(r.b.from).toEqual(new Date("2026-10-01T12:20:00Z"));
  expect(r.b.until).toEqual(new Date("2026-10-01T12:24:00Z"));
});
test("independent stations prepare in parallel, including quantities", () => {
  const r = estimateKitchen(
    [item("a", "grill", 2), item("b", "cold")],
    { grill: 1, cold: 1 },
    now,
  );
  expect(r.b.until).toEqual(new Date("2026-10-01T12:12:00Z"));
  expect(r.a.until).toEqual(new Date("2026-10-01T12:24:00Z"));
});
test("missing recipe or station never invents an ETA", () => {
  const r = estimateKitchen(
    [{ ...item("a"), unknown: true }, item("b")],
    {},
    now,
  );
  expect(r.a.until).toBeNull();
  expect(r.b.until).toBeNull();
});
test("conversions reject mass/volume mixing and fractional counts", () => {
  expect(toBaseQuantity(1.25, "kg", "g")).toBe(1250);
  expect(toBaseQuantity(0.5, "l", "ml")).toBe(500);
  expect(() => toBaseQuantity(1, "g", "ml")).toThrow("INVALID_UNIT");
  expect(() => toBaseQuantity(0.5, "unit", "unit")).toThrow();
});
test("seven coverage bands include boundary at 7km", () => {
  expect([0, 1, 1.01, 2, 2.01, 3, 4, 5, 6, 7].map(deliveryBand)).toEqual([
    1, 1, 2, 2, 3, 3, 4, 5, 6, 7,
  ]);
  expect(deliveryBand(7.001)).toBeNull();
  expect(deliveryBand(-1)).toBeNull();
  expect(
    straightDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    ),
  ).toBe(0);
  expect(
    straightDistanceKm(
      { latitude: 52.5, longitude: 13.4 },
      { latitude: 52.6, longitude: 13.4 },
    ),
  ).toBeGreaterThan(7);
});
test("departure ETA does not add preparation or dispatch a second time", () => {
  const r = arrivalWindow(
    now,
    new Date("2026-10-01T12:05:00Z"),
    3,
    5,
    600,
    900,
    new Date("2026-10-01T12:10:00Z"),
  );
  expect(r.from).toEqual(new Date("2026-10-01T12:20:00Z"));
  expect(r.until).toEqual(new Date("2026-10-01T12:25:00Z"));
  expect(arrivalWindow(null, null, null, null, null, null).from).toBeNull();
});

test("elapsed time is not deducted twice from a multi-unit batch", () => {
  const later = new Date("2026-10-01T12:06:00Z");
  const r = estimateKitchen(
    [{ ...item("a", "grill", 2), startedAt: now }],
    { grill: 1 },
    later,
  );
  expect(r.a.from).toEqual(new Date("2026-10-01T12:20:00Z"));
  expect(r.a.until).toEqual(new Date("2026-10-01T12:24:00Z"));
});
