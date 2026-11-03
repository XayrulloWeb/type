ALTER TABLE "User"
ADD COLUMN "initialWpm" INTEGER;

ALTER TABLE "TestResult"
ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'easy';

ALTER TABLE "User"
ADD CONSTRAINT "User_initialWpm_range" CHECK ("initialWpm" IS NULL OR ("initialWpm" >= 0 AND "initialWpm" <= 300));

ALTER TABLE "TestResult"
ADD CONSTRAINT "TestResult_difficulty_values" CHECK ("difficulty" IN ('easy', 'medium'));

CREATE INDEX "TestResult_difficulty_language_isRanked_wpm_idx"
ON "TestResult"("difficulty", "language", "isRanked", "wpm");
