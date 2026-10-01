-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryQuoteId" TEXT,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedArrivalAt" TIMESTAMP(3),
ADD COLUMN     "estimatedArrivalUntil" TIMESTAMP(3),
ADD COLUMN     "estimatedReadyUntil" TIMESTAMP(3),
ADD COLUMN     "ingredientCostCents" INTEGER,
ADD COLUMN     "inventoryComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparationStartedAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "shiftId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "cookStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "estimatedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedUntil" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "ingredientCostCents" INTEGER,
ADD COLUMN     "prepMaxMinutes" INTEGER,
ADD COLUMN     "prepMinutes" INTEGER,
ADD COLUMN     "recipeSnapshot" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "stationId" TEXT,
ADD COLUMN     "stationName" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "dispatchMaxMinutes" INTEGER,
ADD COLUMN     "dispatchMinMinutes" INTEGER,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ADD COLUMN     "serviceMode" TEXT NOT NULL DEFAULT 'LEGACY';

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "modifierId" TEXT,
    "stationId" TEXT NOT NULL,
    "minMinutes" INTEGER NOT NULL,
    "maxMinutes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "minimum" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "unitCostCents" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId","ingredientId")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "orderId" TEXT,
    "note" TEXT NOT NULL,
    "unitCostCents" DECIMAL(14,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenShift" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "activeKey" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "openingCashCents" INTEGER NOT NULL DEFAULT 0,
    "countedCashCents" INTEGER,
    "expectedCashCents" INTEGER,
    "differenceCents" INTEGER,
    "summary" JSONB,

    CONSTRAINT "KitchenShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPause" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ShiftPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAction" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryQuote" (
    "id" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "straightKm" DECIMAL(10,4) NOT NULL,
    "band" INTEGER NOT NULL,
    "routeMeters" INTEGER,
    "minSeconds" INTEGER,
    "maxSeconds" INTEGER,
    "method" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteReference" (
    "id" TEXT NOT NULL,
    "band" INTEGER NOT NULL,
    "minSeconds" INTEGER NOT NULL,
    "maxSeconds" INTEGER NOT NULL,
    "routeMeters" INTEGER,
    "method" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_name_key" ON "KitchenStation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_modifierId_key" ON "Recipe"("modifierId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StockReservation_orderId_ingredientId_key" ON "StockReservation"("orderId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_key_key" ON "InventoryMovement"("key");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenShift_activeKey_key" ON "KitchenShift"("activeKey");

-- CreateIndex
CREATE INDEX "KitchenShift_closedAt_openedAt_idx" ON "KitchenShift"("closedAt", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenEvent_key_key" ON "KitchenEvent"("key");

-- CreateIndex
CREATE INDEX "KitchenEvent_createdAt_idx" ON "KitchenEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAction_key_key" ON "OrderAction"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEntry_key_key" ON "PaymentEntry"("key");

-- CreateIndex
CREATE INDEX "PaymentEntry_createdAt_idx" ON "PaymentEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteReference_orderId_key" ON "RouteReference"("orderId");

-- CreateIndex
CREATE INDEX "RouteReference_band_createdAt_idx" ON "RouteReference"("band", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryQuoteId_key" ON "Order"("deliveryQuoteId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "KitchenShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryQuoteId_fkey" FOREIGN KEY ("deliveryQuoteId") REFERENCES "DeliveryQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenShift" ADD CONSTRAINT "KitchenShift_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "RestaurantSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPause" ADD CONSTRAINT "ShiftPause_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "KitchenShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAction" ADD CONSTRAINT "OrderAction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enforce base quantities and nonnegative available stock even across concurrent writers.
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_quantities_check" CHECK ("stock" >= 0 AND "reserved" >= 0 AND "stock" >= "reserved" AND "minimum" >= 0 AND "unitCostCents" >= 0 AND "unit" IN ('g','ml','unit'));
ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_capacity_check" CHECK ("capacity" BETWEEN 1 AND 30);
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_target_check" CHECK (("productId" IS NULL) <> ("modifierId" IS NULL));
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_time_check" CHECK ("minMinutes" > 0 AND "maxMinutes" >= "minMinutes");
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_quantity_check" CHECK ("quantity" > 0 AND "state" IN ('RESERVED','CONSUMED','RELEASED'));
ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_coverage_check" CHECK ("band" BETWEEN 1 AND 7 AND "straightKm" BETWEEN 0 AND 7);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refund_check" CHECK ("refundedAmount" >= 0 AND "refundedAmount" <= "amount");
