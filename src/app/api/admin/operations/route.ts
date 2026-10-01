import { requireRole } from "@/lib/access";
import { db } from "@/lib/db";
import { adminOperation, manageOperation } from "@/lib/operations-admin";
import { operationError } from "@/lib/kitchen-transaction";
export async function GET() {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const [
      ingredients,
      stations,
      recipes,
      products,
      modifiers,
      movements,
      settings,
      shifts,
      routeReferences,
      observations,
    ] = await Promise.all([
      db.ingredient.findMany({ orderBy: { name: "asc" } }),
      db.kitchenStation.findMany(),
      db.recipe.findMany({ include: { ingredients: true } }),
      db.product.findMany({
        select: { id: true, name: true, available: true },
      }),
      db.modifier.findMany({
        select: { id: true, name: true, available: true },
      }),
      db.inventoryMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { ingredient: { select: { name: true, unit: true } } },
      }),
      db.restaurantSettings.findFirst({
        select: {
          latitude: true,
          longitude: true,
          dispatchMinMinutes: true,
          dispatchMaxMinutes: true,
        },
      }),
      db.kitchenShift.findMany({ orderBy: { openedAt: "desc" }, take: 30 }),
      db.routeReference.findMany({ orderBy: { createdAt: "desc" } }),
      db.orderItem.findMany({
        where: {
          startedAt: { not: null },
          finishedAt: { not: null },
          productId: { not: null },
          modifiers: { none: {} },
        },
        select: {
          productId: true,
          quantity: true,
          startedAt: true,
          finishedAt: true,
        },
      }),
    ]);
    const referenceMap = new Map<
      string,
      {
        productId: string;
        quantity: number;
        count: number;
        minutes: number[];
        observedAt: Date;
      }
    >();
    for (const item of observations) {
      const key = `${item.productId}:${item.quantity}`;
      const row = referenceMap.get(key) ?? {
        productId: item.productId!,
        quantity: item.quantity,
        count: 0,
        minutes: [],
        observedAt: item.finishedAt!,
      };
      row.count++;
      row.minutes.push(
        (item.finishedAt!.getTime() - item.startedAt!.getTime()) / 60000,
      );
      if (item.finishedAt! > row.observedAt) row.observedAt = item.finishedAt!;
      referenceMap.set(key, row);
    }
    const recipeReferences = [...referenceMap.values()].map((r) => ({
      productId: r.productId,
      quantity: r.quantity,
      count: r.count,
      observedAt: r.observedAt,
      averageMinutes: r.minutes.reduce((a, b) => a + b, 0) / r.count,
      minimumMinutes: Math.min(...r.minutes),
      maximumMinutes: Math.max(...r.minutes),
    }));
    return Response.json(
      {
        ingredients,
        stations,
        recipes,
        products,
        modifiers,
        movements,
        settings,
        shifts,
        routeReferences,
        recipeReferences,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return operationError(error);
  }
}
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  const parsed = adminOperation.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "INVALID_ACTION", issues: parsed.error.issues },
      { status: 400 },
    );
  try {
    return Response.json(await manageOperation(parsed.data, access.actor.id));
  } catch (error) {
    return operationError(error);
  }
}
