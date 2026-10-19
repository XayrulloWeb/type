UPDATE "TestResult"
SET "isRanked" = false,
    "reviewStatus" = 'rejected'
WHERE "accuracy" < 70
  AND ("isRanked" = true OR "reviewStatus" IS DISTINCT FROM 'rejected');
