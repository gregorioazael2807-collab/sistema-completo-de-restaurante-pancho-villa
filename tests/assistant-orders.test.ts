import { expect, test, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/lib/db", () => ({ db: { order: { findMany } } }));
import { getAssistantOrders } from "@/lib/assistant-orders";

test("assistant context is scoped to its actor and omits personal contact data", async () => {
  await getAssistantOrders("customer-a");
  await getAssistantOrders("customer-b");
  expect(findMany.mock.calls.map(([query]) => query.where)).toEqual([
    { userId: "customer-a" }, { userId: "customer-b" },
  ]);
  const selection = findMany.mock.calls[0][0].select;
  expect(selection).not.toHaveProperty("customerEmail");
  expect(selection).not.toHaveProperty("customerPhone");
  expect(selection).not.toHaveProperty("deliveryLine1");
  expect(selection.payment.select.status).toBe(true);
  expect(selection.statusHistory.select.to).toBe(true);
});
