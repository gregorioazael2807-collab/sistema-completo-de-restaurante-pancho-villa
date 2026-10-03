import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn(), transaction: vi.fn(), send: vi.fn() }));
vi.mock("../src/lib/db", () => ({ db: {
  automationJob: { updateMany: mocks.updateMany, findMany: mocks.findMany, update: mocks.update },
  $transaction: mocks.transaction,
} }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { processOutboxBatch } from "../src/lib/outbox";
const job = {
  id: "test-job", dedupeKey: "shift-summary:test-shift", kind: "KITCHEN_SUMMARY", status: "PENDING", attempts: 0,
  payload: { recipient: "owner@example.invalid", name: "Restaurante de prueba", summary: { prepared: 2, effectiveMinutes: 30, averageMinutes: 4 } },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-not-a-real-key");
  vi.stubEnv("EMAIL_FROM", "Prueba <sender@example.invalid>");
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findMany.mockResolvedValue([job]);
  mocks.update.mockResolvedValue({});
  mocks.transaction.mockImplementation((operations) => Promise.all(operations));
  mocks.send.mockResolvedValue({ data: { id: "test-email" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("envío dedicado al cierre", () => {
  it("selecciona solo el informe de ese turno y usa idempotencia", async () => {
    expect(await processOutboxBatch(1, job.dedupeKey)).toMatchObject({ sent: 1 });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ dedupeKey: job.dedupeKey }), take: 1 }));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: job.payload.recipient }), { idempotencyKey: job.dedupeKey });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED" }) }));
  });
  it("deja pendiente para reintento cuando el proveedor falla", async () => {
    mocks.send.mockResolvedValue({ error: { message: "TEST_FAILURE" } });
    expect(await processOutboxBatch(1, job.dedupeKey)).toMatchObject({ failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", lastError: "TEST_FAILURE" }) }));
  });
  it("no envía si otro trabajador ya reclamó el informe", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 });
    expect(await processOutboxBatch(1, job.dedupeKey)).toMatchObject({ skipped: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
