import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { addressHash, quoteDelivery } from "@/lib/delivery";
const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  quote: vi.fn(),
  reference: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    restaurantSettings: { findFirst: mocks.settings },
    deliveryQuote: { create: mocks.quote },
    routeReference: { create: mocks.reference },
  },
}));
const address = {
  recipient: "Test",
  line1: "Street 1",
  city: "Test City",
  postalCode: "12345",
  countryCode: "DE",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.settings.mockResolvedValue({ latitude: 0, longitude: 0 });
  mocks.quote.mockResolvedValue({ id: "quote", expiresAt: new Date() });
  vi.stubEnv(
    "DELIVERY_ROUTING_ENDPOINT",
    "https://test-router.example.test/route",
  );
  vi.stubEnv("DELIVERY_ROUTING_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
test("straight radius and road route are distinct, with recorded method and timestamp", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          latitude: 0.01,
          longitude: 0,
          routeMeters: 1800,
          minSeconds: 120,
          maxSeconds: 180,
          method: "TEST_ROUTER",
          mode: "motorcycle",
          matchedAddress: "Street 1, Test City",
        }),
      ),
  );
  const result = await quoteDelivery(address, "customer-a");
  expect(result.band).toBe(2);
  expect(result.routeMeters).toBe(1800);
  expect(result.straightKm).toBeCloseTo(1.112, 2);
  expect(mocks.reference.mock.calls[0][0].data.method).toBe("TEST_ROUTER");
  expect(mocks.quote.mock.calls[0][0].data.addressHash).toBe(
    addressHash(address, "customer-a"),
  );
  expect(addressHash(address, "customer-b")).not.toBe(
    addressHash(address, "customer-a"),
  );
});
test("outside 7km cannot obtain an order quote", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          latitude: 0.1,
          longitude: 0,
          routeMeters: 12000,
          minSeconds: 600,
          maxSeconds: 900,
          method: "TEST_ROUTER",
          mode: "motorcycle",
          matchedAddress: "Street 1",
        }),
      ),
  );
  await expect(quoteDelivery(address, "customer")).rejects.toThrow(
    "OUTSIDE_COVERAGE",
  );
  expect(mocks.quote).not.toHaveBeenCalled();
});
test("missing restaurant origin never guesses a location", async () => {
  mocks.settings.mockResolvedValue({ latitude: null, longitude: null });
  await expect(quoteDelivery(address, "customer")).rejects.toThrow(
    "LOCATION_NOT_CONFIGURED",
  );
  expect(mocks.quote).not.toHaveBeenCalled();
});
test("without provider configuration no external service is called", async () => {
  vi.stubEnv("DELIVERY_ROUTING_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(quoteDelivery(address, "customer")).rejects.toThrow(
    "ROUTE_NOT_CONFIGURED",
  );
  expect(fetch).not.toHaveBeenCalled();
});
