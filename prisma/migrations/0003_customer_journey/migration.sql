CREATE TABLE "AssistantMessage" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 "role" VARCHAR(10) NOT NULL, "content" TEXT NOT NULL, "metadata" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssistantMessage_userId_requestId_role_key" ON "AssistantMessage"("userId", "requestId", "role");
CREATE INDEX "AssistantMessage_userId_createdAt_idx" ON "AssistantMessage"("userId", "createdAt");
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "CustomerNotice" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
 "eventKey" TEXT NOT NULL, "status" "OrderStatus" NOT NULL,
 "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CustomerNotice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerNotice_userId_eventKey_key" ON "CustomerNotice"("userId", "eventKey");
CREATE INDEX "CustomerNotice_userId_readAt_createdAt_idx" ON "CustomerNotice"("userId", "readAt", "createdAt");
ALTER TABLE "CustomerNotice" ADD CONSTRAINT "CustomerNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNotice" ADD CONSTRAINT "CustomerNotice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Give existing customers an initial notice for orders still in progress.
INSERT INTO "CustomerNotice" ("id","userId","orderId","eventKey","status")
SELECT 'initial-' || "id", "userId", "id", 'initial:' || "id" || ':' || "status"::text, "status"
FROM "Order" WHERE "userId" IS NOT NULL AND "status" IN ('NUEVO','CONFIRMADO','EN_PREPARACION','LISTO','EN_CAMINO');
