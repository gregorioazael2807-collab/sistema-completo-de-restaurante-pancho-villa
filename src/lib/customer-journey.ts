import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAssistantOrders } from "@/lib/assistant-orders";
import { z } from "zod";

export const chatRequest = z.object({
  message: z.string().trim().min(1).max(1000),
  requestId: z.string().uuid().optional(),
  selectedOrderId: z
    .string()
    .regex(/^MX-[A-F0-9]{20}$/)
    .optional(),
  cartItems: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .max(30)
    .default([]),
});
export async function getConversation(userId: string, limit = 50) {
  const messages = await db.assistantMessage.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return messages.reverse();
}
export async function saveExchange(
  userId: string,
  requestId: string,
  input: string,
  reply: string,
  metadata: Prisma.InputJsonObject = {},
) {
  // A transaction and unique request/role key make retries safe across devices.
  await db.assistantMessage.createMany({
    data: [
      {
        userId,
        requestId,
        role: "user",
        content: input,
        createdAt: new Date(Date.now() - 1),
      },
      { userId, requestId, role: "assistant", content: reply, metadata },
    ],
    skipDuplicates: true,
  });
}
export async function getJourney(userId: string) {
  const [orders, messages, notices, unreadCount] = await Promise.all([
    getAssistantOrders(userId),
    getConversation(userId),
    db.customerNotice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        eventKey: true,
        status: true,
        readAt: true,
        createdAt: true,
        order: { select: { publicId: true, type: true } },
      },
    }),
    db.customerNotice.count({ where: { userId, readAt: null } }),
  ]);
  return { orders, messages, notices, unreadCount };
}
