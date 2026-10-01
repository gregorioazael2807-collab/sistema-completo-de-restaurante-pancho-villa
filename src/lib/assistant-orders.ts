import { db } from "@/lib/db";

// The authenticated actor, never a browser-supplied user ID, defines ownership.
export async function getAssistantOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      publicId: true,
      status: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      estimatedReadyAt: true,
      estimatedReadyUntil: true,
      estimatedArrivalAt: true,
      estimatedArrivalUntil: true,
      currency: true,
      subtotal: true,
      taxAmount: true,
      deliveryFee: true,
      total: true,
      notes: true,
      payment: { select: { status: true } },
      items: {
        select: {
          productName: true,
          quantity: true,
          instructions: true,
          modifiers: { select: { modifierName: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { to: true, createdAt: true },
      },
    },
  });
}
