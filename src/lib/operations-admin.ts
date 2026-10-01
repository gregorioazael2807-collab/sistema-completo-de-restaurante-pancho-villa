import { z } from "zod";
import { Prisma } from "@prisma/client";
import { serializable } from "@/lib/kitchen-transaction";
import { toBaseQuantity } from "@/lib/kitchen-math";
import { refreshEstimates } from "@/lib/kitchen-estimates";
const id = z.string().min(1).max(64),
  cents = z.number().int().nonnegative().max(100000000);
export const adminOperation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("STATION"),
    id: id.optional(),
    name: z.string().trim().min(1).max(80),
    capacity: z.number().int().min(1).max(30),
  }),
  z.object({
    action: z.literal("INGREDIENT"),
    id: id.optional(),
    name: z.string().trim().min(1).max(100),
    unit: z.enum(["g", "ml", "unit"]),
    minimum: z.number().nonnegative().max(1e9),
    unitCostCents: z.number().nonnegative().max(1e8),
  }),
  z.object({
    action: z.literal("RECIPE"),
    productId: id.optional(),
    modifierId: id.optional(),
    stationId: id,
    minMinutes: z.number().int().min(1).max(480),
    maxMinutes: z.number().int().min(1).max(480),
    ingredients: z
      .array(
        z.object({
          ingredientId: id,
          quantity: z.number().positive().max(1e9),
          unit: z.enum(["g", "kg", "ml", "l", "unit"]),
        }),
      )
      .min(1)
      .max(100),
  }),
  z.object({
    action: z.literal("MOVEMENT"),
    requestId: z.string().uuid(),
    ingredientId: id,
    kind: z.enum(["PURCHASE", "ENTRY", "ADJUSTMENT", "WASTE"]),
    quantity: z.number().min(-1e9).max(1e9),
    unit: z.enum(["g", "kg", "ml", "l", "unit"]),
    unitCostCents: z.number().nonnegative().max(1e8).optional(),
    note: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("COOKED_WASTE"),
    requestId: z.string().uuid(),
    publicId: z.string(),
    note: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("SOLD_OUT"),
    productId: id,
    available: z.boolean(),
  }),
  z.object({
    action: z.literal("PAYMENT"),
    requestId: z.string().uuid(),
    publicId: z.string(),
    kind: z.enum(["CAPTURE", "REFUND"]),
    method: z.enum(["CASH", "CARD", "OTHER"]),
    amountCents: cents.refine((n) => n > 0),
  }),
  z.object({
    action: z.literal("LOCATION"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    dispatchMinMinutes: z.number().int().min(0).max(120),
    dispatchMaxMinutes: z.number().int().min(0).max(120),
  }),
]);
export async function manageOperation(
  data: z.infer<typeof adminOperation>,
  actorId: string,
) {
  return serializable(async (tx) => {
    if (data.action === "STATION") {
      const { action: _, id, ...fields } = data;
      void _;
      const station = id
        ? await tx.kitchenStation.update({ where: { id }, data: fields })
        : await tx.kitchenStation.create({ data: fields });
      await refreshEstimates(tx);
      return { id: station.id };
    }
    if (data.action === "INGREDIENT") {
      const { action: _, id, ...fields } = data;
      void _;
      if (id) {
        const old = await tx.ingredient.findUniqueOrThrow({ where: { id } });
        if (old.unit !== data.unit) throw Error("INVALID_UNIT");
      }
      const ingredient = id
        ? await tx.ingredient.update({ where: { id }, data: fields })
        : await tx.ingredient.create({ data: fields });
      return { id: ingredient.id };
    }
    if (data.action === "RECIPE") {
      if (
        Boolean(data.productId) === Boolean(data.modifierId) ||
        data.maxMinutes < data.minMinutes ||
        new Set(data.ingredients.map((i) => i.ingredientId)).size !==
          data.ingredients.length
      )
        throw Error("INVALID_RECIPE");
      const lines = [];
      for (const i of data.ingredients) {
        const ingredient = await tx.ingredient.findUniqueOrThrow({
          where: { id: i.ingredientId },
        });
        lines.push({
          ingredientId: i.ingredientId,
          quantity: toBaseQuantity(i.quantity, i.unit, ingredient.unit),
        });
      }
      const previous = await tx.recipe.findFirst({
        where: data.productId
          ? { productId: data.productId }
          : { modifierId: data.modifierId },
      });
      const recipe = previous
        ? await tx.recipe.update({
            where: { id: previous.id },
            data: {
              stationId: data.stationId,
              minMinutes: data.minMinutes,
              maxMinutes: data.maxMinutes,
              ingredients: { deleteMany: {}, create: lines },
            },
          })
        : await tx.recipe.create({
            data: {
              productId: data.productId,
              modifierId: data.modifierId,
              stationId: data.stationId,
              minMinutes: data.minMinutes,
              maxMinutes: data.maxMinutes,
              ingredients: { create: lines },
            },
          });
      return { id: recipe.id };
    }
    if (data.action === "MOVEMENT") {
      const ingredient = await tx.ingredient.findUniqueOrThrow({
        where: { id: data.ingredientId },
      });
      const quantity = toBaseQuantity(
        data.quantity,
        data.unit,
        ingredient.unit,
      );
      if (quantity === 0 || (data.kind !== "ADJUSTMENT" && quantity < 0))
        throw Error("INVALID_ACTION");
      const delta = data.kind === "WASTE" ? -quantity : quantity;
      const key = `manual:${data.requestId}`;
      const previous = await tx.inventoryMovement.findUnique({
        where: { key },
      });
      if (previous) {
        if (
          previous.ingredientId !== ingredient.id ||
          previous.kind !== data.kind ||
          !previous.quantity.eq(delta) ||
          previous.actorId !== actorId
        )
          throw Error("CONFLICT");
        return { id: previous.id, replayed: true };
      }
      if (ingredient.stock.add(delta).lt(ingredient.reserved))
        throw Error("STOCK_SHORTAGE");
      let cost = ingredient.unitCostCents;
      if (
        data.unitCostCents !== undefined &&
        (data.kind === "PURCHASE" || data.kind === "ENTRY")
      )
        cost = ingredient.stock.add(quantity).isZero()
          ? new Prisma.Decimal(data.unitCostCents)
          : ingredient.stock
              .mul(ingredient.unitCostCents)
              .add(new Prisma.Decimal(quantity).mul(data.unitCostCents))
              .div(ingredient.stock.add(quantity));
      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { stock: { increment: delta }, unitCostCents: cost },
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          key,
          ingredientId: ingredient.id,
          quantity: delta,
          kind: data.kind,
          actorId,
          note: data.note,
          unitCostCents: data.unitCostCents,
        },
      });
      return { id: movement.id };
    }
    if (data.action === "COOKED_WASTE") {
      const order = await tx.order.findUnique({
        where: { publicId: data.publicId },
      });
      if (!order?.preparationStartedAt) throw Error("INVALID_ACTION");
      const key = `waste:${data.requestId}`;
      const previous = await tx.orderAction.findUnique({ where: { key } });
      if (previous) {
        if (previous.orderId !== order.id || previous.actorId !== actorId)
          throw Error("CONFLICT");
        return { replayed: true };
      }
      await tx.orderAction.create({
        data: {
          key,
          orderId: order.id,
          actorId,
          kind: "COOKED_WASTE",
          payload: { note: data.note, costCents: order.ingredientCostCents },
        },
      });
      return { recorded: true };
    }
    if (data.action === "SOLD_OUT") {
      await tx.product.update({
        where: { id: data.productId },
        data: { available: data.available },
      });
      return { updated: true };
    }
    if (data.action === "PAYMENT") {
      const order = await tx.order.findUnique({
        where: { publicId: data.publicId },
        include: { payment: true },
      });
      if (!order?.payment) throw Error("NOT_FOUND");
      const payment = order.payment;
      const key = `payment:${data.requestId}`;
      const prior = await tx.paymentEntry.findUnique({ where: { key } });
      const amount = new Prisma.Decimal(data.amountCents).div(100);
      if (prior) {
        if (
          prior.paymentId !== payment.id ||
          prior.kind !== data.kind ||
          prior.method !== data.method ||
          !prior.amount.eq(amount) ||
          prior.actorId !== actorId
        )
          throw Error("CONFLICT");
        return { replayed: true };
      }
      if (data.kind === "CAPTURE") {
        if (
          payment.status !== "PAYMENT_PENDING" ||
          !payment.amount.eq(amount) ||
          order.status === "CANCELADO"
        )
          throw Error("PAYMENT_CONFLICT");
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", method: data.method, paidAt: new Date() },
        });
      } else {
        if (
          payment.status !== "PAID" ||
          payment.refundedAmount.add(amount).gt(payment.amount) ||
          payment.method !== data.method
        )
          throw Error("PAYMENT_CONFLICT");
        const refunded = payment.refundedAmount.add(amount);
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: refunded.eq(payment.amount) ? "REFUNDED" : "PAID",
            refundedAmount: refunded,
            refundedAt: new Date(),
          },
        });
      }
      await tx.paymentEntry.create({
        data: {
          key,
          paymentId: payment.id,
          kind: data.kind,
          method: data.method,
          amount,
          actorId,
        },
      });
      return { recorded: true };
    }
    if (data.action === "LOCATION") {
      if (data.dispatchMaxMinutes < data.dispatchMinMinutes)
        throw Error("INVALID_ACTION");
      const settings = await tx.restaurantSettings.findFirst();
      if (!settings) throw Error("NOT_FOUND");
      const { action: _, ...fields } = data;
      void _;
      await tx.restaurantSettings.update({
        where: { id: settings.id },
        data: fields,
      });
      await refreshEstimates(tx);
      return { updated: true };
    }
    throw Error("INVALID_ACTION");
  });
}
