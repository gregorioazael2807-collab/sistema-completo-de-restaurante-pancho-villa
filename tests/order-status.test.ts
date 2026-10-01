import { expect, test, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  change: vi.fn(),
  actor: vi.fn(),
  find: vi.fn(),
}));
vi.mock("@/lib/access", () => ({
  requireRole: mocks.access,
  getActor: mocks.actor,
}));
vi.mock("@/lib/kitchen-orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/kitchen-orders")>()),
  changeOrder: mocks.change,
}));
vi.mock("@/lib/db", () => ({ db: { order: { findFirst: mocks.find } } }));
import { GET, PATCH } from "@/app/api/orders/[publicId]/route";
import { transitions } from "@/lib/kitchen-orders";
const publicId = "MX-0123456789ABCDEF0123";
const params = { params: Promise.resolve({ publicId }) };
const change = (status: string) =>
  PATCH(
    new Request("http://localhost/api/orders/" + publicId, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    params,
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ actor: { id: "cook", role: "COCINA" } });
  mocks.change.mockResolvedValue({ status: "LISTO" });
  mocks.actor.mockResolvedValue({ id: "customer", role: "CLIENTE" });
  mocks.find.mockResolvedValue(null);
});
test("unauthenticated clients cannot update states", async () => {
  mocks.access.mockResolvedValue({
    response: Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
  });
  expect((await change("LISTO"))!.status).toBe(401);
  expect(mocks.change).not.toHaveBeenCalled();
});
test("customer cannot update kitchen state", async () => {
  mocks.access.mockResolvedValue({
    response: Response.json({ error: "FORBIDDEN" }, { status: 403 }),
  });
  expect((await change("CONFIRMADO"))!.status).toBe(403);
  expect(mocks.change).not.toHaveBeenCalled();
});
test("kitchen cannot mark no-show", async () => {
  expect((await change("NO_PRESENTADO"))!.status).toBe(403);
  expect(mocks.change).not.toHaveBeenCalled();
});
test("tracking authenticates and restricts ownership", async () => {
  expect((await GET(new Request("http://localhost"), params)).status).toBe(404);
  expect(mocks.find.mock.calls[0][0].where).toEqual({
    publicId,
    userId: "customer",
  });
  expect(mocks.find.mock.calls[0][0].select).not.toHaveProperty(
    "ingredientCostCents",
  );
  expect(mocks.find.mock.calls[0][0].select).not.toHaveProperty(
    "recipeSnapshot",
  );
});
test("anonymous tracking blocked", async () => {
  mocks.actor.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost"), params)).status).toBe(401);
  expect(mocks.find).not.toHaveBeenCalled();
});
test("preparation cannot be cancelled under current transitions", () => {
  expect(transitions.EN_PREPARACION).toEqual(["LISTO"]);
  expect(transitions.CONFIRMADO).toContain("CANCELADO");
});
test("malformed statuses do not reach transaction", async () => {
  expect((await change("DESTROY"))!.status).toBe(400);
  expect(mocks.change).not.toHaveBeenCalled();
});
