import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), find: vi.fn(), update: vi.fn(), history: vi.fn(), job: vi.fn(), notification: vi.fn(), notice: vi.fn() }));
vi.mock("@/lib/access", () => ({ requireRole: mocks.access }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (callback: (tx: unknown) => unknown) => callback({ order: { findUnique: mocks.find, updateMany: mocks.update }, orderStatusHistory: { create: mocks.history }, automationJob: { create: mocks.job }, notification: { create: mocks.notification }, customerNotice: { create: mocks.notice } }) } }));
import { PATCH } from "@/app/api/orders/[publicId]/route";
const publicId = "MX-0123456789ABCDEF0123";
async function change(status: string) { return PATCH(new Request("http://localhost/api/orders/" + publicId, { method: "PATCH", body: JSON.stringify({ status }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ publicId }) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ actor: { id: "staff", role: "COCINA" } }); mocks.find.mockResolvedValue({ id: "order", status: "LISTO", type: "DELIVERY", customerEmail: "test@example.test", customerLocale: "es", userId: "client" }); mocks.update.mockResolvedValue({ count: 1 }); });
test("dispatches delivery with history and queued notification", async () => { expect((await change("EN_CAMINO"))!.status).toBe(200); expect(mocks.history).toHaveBeenCalledOnce(); expect(mocks.job).toHaveBeenCalledOnce(); expect(mocks.notification).toHaveBeenCalledOnce(); expect(mocks.notice).toHaveBeenCalledOnce(); });
test("rejects dispatch for pickup", async () => { mocks.find.mockResolvedValue({ id: "order", status: "LISTO", type: "PICKUP" }); expect((await change("EN_CAMINO"))!.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled(); });
test("kitchen cannot mark no-show", async () => { expect((await change("NO_PRESENTADO"))!.status).toBe(403); expect(mocks.update).not.toHaveBeenCalled(); });
test("admin can close uncollected pickup", async () => { mocks.access.mockResolvedValue({ actor: { id: "admin", role: "ADMIN" } }); mocks.find.mockResolvedValue({ id: "order", status: "LISTO", type: "PICKUP" }); expect((await change("NO_PRESENTADO"))!.status).toBe(200); });
test("cannot cancel an order already being prepared", async () => { mocks.find.mockResolvedValue({ id: "order", status: "EN_PREPARACION", type: "PICKUP" }); expect((await change("CANCELADO"))!.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled(); });
test("can cancel a new order", async () => { mocks.find.mockResolvedValue({ id: "order", status: "NUEVO", type: "PICKUP" }); expect((await change("CANCELADO"))!.status).toBe(200); });
test("can close delivery after dispatch", async () => { mocks.find.mockResolvedValue({ id: "order", status: "EN_CAMINO", type: "DELIVERY" }); expect((await change("ENTREGADO"))!.status).toBe(200); });
test("concurrent transition does not queue notifications", async () => { mocks.update.mockResolvedValue({ count: 0 }); expect((await change("EN_CAMINO"))!.status).toBe(409); expect(mocks.job).not.toHaveBeenCalled(); });
