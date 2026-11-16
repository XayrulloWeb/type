-- CreateTable
CREATE TABLE "GamePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePurchase_pkey" PRIMARY KEY ("id")
);

-- Existing administrator missions were originally paid at the student rate.
-- Apply the administrator x2 bonus once while this migration is deployed.
UPDATE "GameResult" AS result
SET "rewardCredits" = result."rewardCredits" * 2
FROM "User" AS account
WHERE result."userId" = account."id"
  AND result."game" = 'defense'
  AND result."rewardCredits" > 0
  AND account."role" = 'SUPER_ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "GamePurchase_userId_itemId_key" ON "GamePurchase"("userId", "itemId");

-- CreateIndex
CREATE INDEX "GamePurchase_userId_createdAt_idx" ON "GamePurchase"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GamePurchase" ADD CONSTRAINT "GamePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
