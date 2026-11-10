CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "clientRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL DEFAULT 'defense',
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "wpm" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "destroyed" INTEGER NOT NULL,
    "missed" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "correctChars" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "isRanked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GameResult_language_values" CHECK ("language" IN ('ru', 'en')),
    CONSTRAINT "GameResult_difficulty_values" CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
    CONSTRAINT "GameResult_score_range" CHECK ("score" >= 0 AND "score" <= 10000000),
    CONSTRAINT "GameResult_wpm_range" CHECK ("wpm" >= 0 AND "wpm" <= 600),
    CONSTRAINT "GameResult_accuracy_range" CHECK ("accuracy" >= 0 AND "accuracy" <= 100),
    CONSTRAINT "GameResult_counters_range" CHECK ("destroyed" >= 0 AND "missed" >= 0 AND "maxCombo" >= 0 AND "duration" > 0 AND "correctChars" >= 0 AND "errorCount" >= 0)
);

CREATE UNIQUE INDEX "GameResult_clientRunId_key" ON "GameResult"("clientRunId");
CREATE INDEX "GameResult_game_difficulty_language_isRanked_score_idx" ON "GameResult"("game", "difficulty", "language", "isRanked", "score");
CREATE INDEX "GameResult_userId_createdAt_idx" ON "GameResult"("userId", "createdAt");

ALTER TABLE "GameResult"
ADD CONSTRAINT "GameResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
