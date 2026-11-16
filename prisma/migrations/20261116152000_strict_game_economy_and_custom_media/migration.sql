ALTER TABLE "GameResult"
ADD COLUMN "rewardBox" TEXT,
ADD COLUMN "boxCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "GameLoadout"
ADD COLUMN "customAvatarUrl" TEXT,
ADD COLUMN "customMusicUrl" TEXT;

-- Keep every mission, but recalculate the historical economy with the stricter rules.
-- A mission earns credits only after 45 seconds, 10 destroyed targets and 80% accuracy.
UPDATE "GameResult" AS result
SET
  "rewardBox" = NULL,
  "boxCredits" = 0,
  "rewardCredits" = CASE
    WHEN result."moderationStatus" = 'annulled' THEN 0
    WHEN account.role = 'STUDENT' AND result."isRanked" = FALSE THEN 0
    WHEN result.duration < 45 OR result.destroyed < 10 OR result.accuracy < 80 THEN 0
    ELSE (
      1
      + CASE
          WHEN result.destroyed >= 24 AND result.accuracy >= 92 AND result."bossesDestroyed" >= 2 THEN 2
          WHEN result.destroyed >= 12 AND result.accuracy >= 82 THEN 1
          ELSE 0
        END
      + CASE result.difficulty WHEN 'hard' THEN 2 WHEN 'medium' THEN 1 ELSE 0 END
      + LEAST(2, result."bossesDestroyed")
    ) * CASE WHEN account.role = 'SUPER_ADMIN' THEN 2 ELSE 1 END
  END
FROM "User" AS account
WHERE result."userId" = account.id AND result.game = 'defense';
