import { Prisma } from "@prisma/client";
import { z } from "zod";
export const snapshotSchema = z.object({
  complete: z.boolean(),
  tasks: z.array(
    z.object({
      stationId: z.string(),
      minMinutes: z.number().int().positive(),
      maxMinutes: z.number().int().positive(),
      quantity: z.number().int().positive(),
    }),
  ),
  ingredients: z.array(
    z.object({
      ingredientId: z.string(),
      quantity: z.string(),
      unitCostCents: z.string(),
    }),
  ),
});
export type RecipeSnapshot = z.infer<typeof snapshotSchema>;
export async function snapshotRecipe(
  tx: Prisma.TransactionClient,
  productId: string,
  modifierIds: string[],
  quantity: number,
) {
  const recipes = await tx.recipe.findMany({
    where: { OR: [{ productId }, { modifierId: { in: modifierIds } }] },
    include: { station: true, ingredients: { include: { ingredient: true } } },
  });
  const complete =
    recipes.some((r) => r.productId === productId) &&
    modifierIds.every((id) => recipes.some((r) => r.modifierId === id)) &&
    recipes.every((r) => r.station.active);
  const base = recipes.find((r) => r.productId === productId);
  const snapshot: RecipeSnapshot = {
    complete,
    tasks: recipes.map((r) => ({
      stationId: r.stationId,
      minMinutes: r.minMinutes,
      maxMinutes: r.maxMinutes,
      quantity,
    })),
    ingredients: recipes.flatMap((r) =>
      r.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity.mul(quantity).toString(),
        unitCostCents: i.ingredient.unitCostCents.toString(),
      })),
    ),
  };
  return {
    recipeSnapshot: snapshot as Prisma.InputJsonObject,
    stationId: base?.stationId,
    stationName: base?.station.name,
    prepMinutes: base?.minMinutes,
    prepMaxMinutes: base?.maxMinutes,
  };
}
export async function reserveIngredients(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const needs = new Map<
    string,
    { quantity: Prisma.Decimal; cost: Prisma.Decimal }
  >();
  let complete = true;
  for (const item of items) {
    const parsed = snapshotSchema.safeParse(item.recipeSnapshot);
    if (!parsed.success || !parsed.data.complete) {
      complete = false;
      continue;
    }
    let itemCost = new Prisma.Decimal(0);
    for (const ingredient of parsed.data.ingredients) {
      const quantity = new Prisma.Decimal(ingredient.quantity),
        cost = quantity.mul(ingredient.unitCostCents);
      const previous = needs.get(ingredient.ingredientId);
      needs.set(ingredient.ingredientId, {
        quantity: quantity.add(previous?.quantity ?? 0),
        cost: cost.add(previous?.cost ?? 0),
      });
      itemCost = itemCost.add(cost);
    }
    await tx.orderItem.update({
      where: { id: item.id },
      data: { ingredientCostCents: itemCost.toDecimalPlaces(0).toNumber() },
    });
  }
  // All-or-nothing tracking: never silently reserve a partial recipe.
  if (!complete) {
    await tx.order.update({
      where: { id: orderId },
      data: { inventoryComplete: false, ingredientCostCents: null },
    });
    return;
  }
  let total = 0;
  for (const [ingredientId, need] of [...needs].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: ingredientId },
    });
    if (ingredient.stock.sub(ingredient.reserved).lt(need.quantity))
      throw Error("STOCK_SHORTAGE");
    const changed = await tx.ingredient.updateMany({
      where: {
        id: ingredientId,
        stock: ingredient.stock,
        reserved: ingredient.reserved,
      },
      data: { reserved: { increment: need.quantity } },
    });
    if (changed.count !== 1) throw Error("CONFLICT");
    const cost = need.cost.toDecimalPlaces(0).toNumber();
    total += cost;
    await tx.stockReservation.create({
      data: { orderId, ingredientId, quantity: need.quantity, costCents: cost },
    });
    await tx.inventoryMovement.create({
      data: {
        key: `reserve:${orderId}:${ingredientId}`,
        orderId,
        ingredientId,
        quantity: need.quantity,
        kind: "RESERVE",
        actorId: "system",
        note: "Order accepted",
      },
    });
  }
  await tx.order.update({
    where: { id: orderId },
    data: { inventoryComplete: true, ingredientCostCents: total },
  });
}
export async function applyInventoryState(
  tx: Prisma.TransactionClient,
  orderId: string,
  state: "CONSUMED" | "RELEASED",
  actorId: string,
) {
  const reservations = await tx.stockReservation.findMany({
    where: { orderId, state: "RESERVED" },
    orderBy: { ingredientId: "asc" },
  });
  for (const reservation of reservations) {
    const claimed = await tx.stockReservation.updateMany({
      where: { id: reservation.id, state: "RESERVED" },
      data: { state },
    });
    if (!claimed.count) continue;
    await tx.ingredient.update({
      where: { id: reservation.ingredientId },
      data: {
        reserved: { decrement: reservation.quantity },
        ...(state === "CONSUMED"
          ? { stock: { decrement: reservation.quantity } }
          : {}),
      },
    });
    await tx.inventoryMovement.create({
      data: {
        key: `${state}:${orderId}:${reservation.ingredientId}`,
        orderId,
        ingredientId: reservation.ingredientId,
        quantity:
          state === "CONSUMED"
            ? reservation.quantity.neg()
            : reservation.quantity,
        kind: state,
        actorId,
        note:
          state === "CONSUMED"
            ? "Preparation started"
            : "Cancelled before preparation",
      },
    });
  }
}
export async function availability(
  tx: Prisma.TransactionClient,
  productIds: string[],
  modifierIds: string[] = [],
) {
  const recipes = await tx.recipe.findMany({
    where: {
      OR: [
        { productId: { in: productIds } },
        { modifierId: { in: modifierIds } },
      ],
    },
    include: { ingredients: { include: { ingredient: true } } },
  });
  return new Set(
    recipes
      .filter((r) =>
        r.ingredients.some((i) =>
          i.ingredient.stock.sub(i.ingredient.reserved).lt(i.quantity),
        ),
      )
      .flatMap((r) =>
        r.productId ? [r.productId] : r.modifierId ? [r.modifierId] : [],
      ),
  );
}
