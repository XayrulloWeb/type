import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isShort(result) {
  return result.mode === "time" && result.duration <= 16;
}

function comparableResults(history, result) {
  const sameLanguageAndMode = history.filter((item) => (
    item.language === result.language &&
    item.mode === result.mode &&
    isShort(item) === isShort(result)
  ));
  if (sameLanguageAndMode.length >= 3) return sameLanguageAndMode;
  const sameDurationGroup = history.filter((item) => isShort(item) === isShort(result));
  return sameDurationGroup.length ? sameDurationGroup : history;
}

function analyzeHistoricalResult(result, history) {
  const comparable = comparableResults(history, result);
  if (!comparable.length) return null;
  const recent = comparable.slice(-10);
  const previousBestWpm = Math.max(...comparable.map((item) => item.wpm));
  const baselineWpm = Math.round(median(recent.map((item) => item.wpm)));
  const difference = result.wpm - previousBestWpm;
  const reasons = [];
  let riskScore = 0;

  if (previousBestWpm >= 10 && difference >= 25) {
    reasons.push("extreme_personal_jump");
    riskScore += 4;
  } else if (previousBestWpm >= 10 && difference >= 15 && result.wpm >= previousBestWpm * 1.4) {
    reasons.push("personal_best_jump");
    riskScore += 3;
  }

  if (recent.length >= 3 && result.wpm - baselineWpm >= 15 && result.wpm >= baselineWpm * 1.6) {
    reasons.push("recent_median_spike");
    riskScore += 3;
  }

  if (result.accuracy < 80 && result.accuracy >= 70 && difference >= 10) {
    reasons.push("low_accuracy_record");
    riskScore += 2;
  }

  if (riskScore < 3) return null;
  return {
    reasons,
    riskScore: Math.min(10, riskScore),
    baselineWpm,
    previousBestWpm,
  };
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      username: true,
      testResults: {
        where: { language: { in: ["ru", "en"] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          wpm: true,
          accuracy: true,
          duration: true,
          mode: true,
          language: true,
          isRanked: true,
          reviewStatus: true,
          createdAt: true,
        },
      },
    },
  });

  const candidates = [];
  for (const user of users) {
    const acceptedHistory = [];
    for (const result of user.testResults) {
      if (!result.isRanked || result.reviewStatus === "rejected") continue;
      if (result.reviewStatus === "approved") {
        acceptedHistory.push(result);
        continue;
      }
      const risk = analyzeHistoricalResult(result, acceptedHistory);
      if (!risk) {
        acceptedHistory.push(result);
        continue;
      }
      candidates.push({ user, result, risk });
    }
  }

  console.log(`${applyChanges ? "APPLY" : "DRY RUN"}: ${candidates.length} suspicious result(s)`);
  for (const candidate of candidates.slice(0, 100)) {
    const { user, result, risk } = candidate;
    console.log(`${user.username}: ${risk.previousBestWpm} -> ${result.wpm} WPM (${result.language}, ${risk.reasons.join(", ")})`);
  }
  if (candidates.length > 100) console.log(`...and ${candidates.length - 100} more`);

  if (!applyChanges || !candidates.length) return;
  const batchSize = 50;
  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    await prisma.$transaction(batch.map(({ result, risk }) => prisma.testResult.update({
      where: { id: result.id },
      data: {
        isRanked: false,
        reviewStatus: "pending",
        reviewReasons: risk.reasons,
        riskScore: risk.riskScore,
        baselineWpm: risk.baselineWpm,
        previousBestWpm: risk.previousBestWpm,
      },
    })));
  }
  console.log(`Updated ${candidates.length} result(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
