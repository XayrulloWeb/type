ALTER TABLE "TestResult"
ADD COLUMN "pasteDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "keystrokeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "backspaceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxBurstCps" DOUBLE PRECISION,
ADD COLUMN "timingVariation" DOUBLE PRECISION,
ADD COLUMN "reviewReasons" JSONB,
ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "baselineWpm" INTEGER,
ADD COLUMN "previousBestWpm" INTEGER;

CREATE INDEX "TestResult_riskScore_createdAt_idx" ON "TestResult"("riskScore", "createdAt");
