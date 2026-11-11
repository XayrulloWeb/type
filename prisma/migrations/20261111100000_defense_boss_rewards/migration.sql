ALTER TABLE "GameResult"
ADD COLUMN "bossesDestroyed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "GameResult"
ADD CONSTRAINT "GameResult_rewards_range" CHECK ("bossesDestroyed" >= 0 AND "rewardCredits" >= 0);
