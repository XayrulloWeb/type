UPDATE "GameResult" AS result
SET "rewardCredits" = GREATEST(
  1,
  LEAST(
    9999,
    FLOOR(result."score"::numeric / 200)::integer
      + result."bossesDestroyed" * 12
      + CASE
          WHEN result."destroyed" >= 24 AND result."accuracy" >= 92 AND result."bossesDestroyed" >= 2 THEN 10
          WHEN result."destroyed" >= 12 AND result."accuracy" >= 82 THEN 5
          ELSE 0
        END
  )
)
FROM "User" AS account
WHERE result."userId" = account."id"
  AND account."role" = 'SUPER_ADMIN'
  AND result."game" = 'defense'
  AND result."rewardCredits" = 0;
