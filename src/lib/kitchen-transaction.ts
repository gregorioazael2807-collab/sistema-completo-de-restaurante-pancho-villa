import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
export async function serializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: "Serializable",
        timeout: 20000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2034", "P2002"].includes(error.code) ||
        attempt >= 4
      )
        throw error;
    }
  }
}
export function operationError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNAVAILABLE";
  const known = [
    "STOCK_SHORTAGE",
    "INVALID_TRANSITION",
    "CONFLICT",
    "SHIFT_PAUSED",
    "SHIFT_NOT_OPEN",
    "SHIFT_ALREADY_OPEN",
    "SHIFT_CLOSED",
    "INVALID_UNIT",
    "PRECISION_EXCEEDED",
    "RECIPE_REQUIRED",
    "PAYMENT_CONFLICT",
    "NOT_FOUND",
    "INVALID_RECIPE",
    "INVALID_ACTION",
    "ROUTE_NOT_CONFIGURED",
    "LOCATION_NOT_CONFIGURED",
    "OUTSIDE_COVERAGE",
    "DELIVERY_QUOTE_REQUIRED",
    "INVALID_QUOTE",
  ];
  return Response.json(
    { error: known.includes(message) ? message : "OPERATIONS_UNAVAILABLE" },
    {
      status:
        message === "AUTH_RATE_LIMITED"
          ? 429
          : message === "NOT_FOUND"
            ? 404
            : known.includes(message)
              ? 409
              : 503,
    },
  );
}
