-- Base de identidad comercial. No altera las cuentas ni pedidos existentes.
CREATE TABLE "KitchenOwner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenOwner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenRestaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenRestaurant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KitchenOwner_email_key" ON "KitchenOwner"("email");
CREATE INDEX "KitchenRestaurant_ownerId_idx" ON "KitchenRestaurant"("ownerId");
ALTER TABLE "KitchenRestaurant" ADD CONSTRAINT "KitchenRestaurant_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "KitchenOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
