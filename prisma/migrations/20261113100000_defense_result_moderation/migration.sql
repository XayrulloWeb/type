ALTER TABLE "GameResult"
ADD COLUMN "moderationStatus" TEXT,
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderatedBy" TEXT;

ALTER TABLE "GameResult"
ADD CONSTRAINT "GameResult_moderationStatus_values"
CHECK ("moderationStatus" IS NULL OR "moderationStatus" IN ('annulled', 'restored'));

CREATE INDEX "GameResult_moderationStatus_createdAt_idx"
ON "GameResult"("moderationStatus", "createdAt");
