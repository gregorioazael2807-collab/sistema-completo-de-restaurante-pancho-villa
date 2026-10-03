-- Puente privado para la instalación independiente de pruebas.
ALTER TABLE "KitchenOwner" ADD COLUMN "kitchenUserId" TEXT;
CREATE UNIQUE INDEX "KitchenOwner_kitchenUserId_key" ON "KitchenOwner"("kitchenUserId");
ALTER TABLE "KitchenOwner" ADD CONSTRAINT "KitchenOwner_kitchenUserId_fkey"
FOREIGN KEY ("kitchenUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
