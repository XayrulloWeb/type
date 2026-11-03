ALTER TABLE "TestResult"
DROP CONSTRAINT "TestResult_difficulty_values";

ALTER TABLE "TestResult"
ADD CONSTRAINT "TestResult_difficulty_values" CHECK ("difficulty" IN ('easy', 'medium', 'hard'));
