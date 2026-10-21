import { getSpeedStandard } from "@/lib/speed-standard";
import { getRankingState, type TypingStats, type TypingTelemetry } from "@/lib/typing";

export interface PreviousTypingResult {
  wpm: number;
  accuracy: number;
  duration: number;
  mode: string;
  language: string;
}

export interface TestRiskAnalysis {
  isRanked: boolean;
  reviewStatus: "pending" | "rejected" | null;
  reasons: string[];
  riskScore: number;
  baselineWpm: number | null;
  previousBestWpm: number | null;
}

const automaticRejectionReasons = new Set([
  "accuracy_too_low",
  "paste_attempt",
  "duration_too_short",
  "incomplete_timer",
  "unrealistic_speed",
]);

export function analyzeTestRisk(input: {
  stats: TypingStats;
  telemetry: TypingTelemetry;
  mode: "time" | "words" | "text";
  language: string;
  selectedDuration?: number;
  pasteDetected: boolean;
  grade: number | null;
  previousResults: PreviousTypingResult[];
}): TestRiskAnalysis {
  const technical = getRankingState(input);
  const reasons = [...technical.reasons];
  const hardRejected = technical.reasons.some((reason) => automaticRejectionReasons.has(reason));
  const shortTest = input.mode === "time" && (input.selectedDuration === 15 || input.stats.timeElapsed <= 16);
  const comparable = getComparableResults(input.previousResults, input.language, input.mode, shortTest);
  const recent = comparable.slice(0, 10);
  const previousBestWpm = comparable.length ? Math.max(...comparable.map((item) => item.wpm)) : null;
  const baselineWpm = recent.length ? Math.round(median(recent.map((item) => item.wpm))) : null;
  const bestDifference = previousBestWpm === null ? 0 : input.stats.wpm - previousBestWpm;
  let riskScore = technical.reasons.includes("focus_lost") ? 3 : 0;

  if (previousBestWpm !== null && previousBestWpm >= 10 && bestDifference >= 25) {
    addReason(reasons, "extreme_personal_jump");
    riskScore += 4;
  } else if (previousBestWpm !== null && previousBestWpm >= 10 && bestDifference >= 15 && input.stats.wpm >= previousBestWpm * 1.4) {
    addReason(reasons, "personal_best_jump");
    riskScore += 3;
  }

  if (baselineWpm !== null && recent.length >= 3 && input.stats.wpm - baselineWpm >= 15 && input.stats.wpm >= baselineWpm * 1.6) {
    addReason(reasons, "recent_median_spike");
    riskScore += 3;
  }

  const excellent = input.grade ? getSpeedStandard(input.grade).excellent : null;
  if (excellent !== null && comparable.length < 3 && input.stats.wpm >= excellent + 20) {
    addReason(reasons, "grade_outlier");
    riskScore += 3;
  }
  if (shortTest && excellent !== null && previousBestWpm !== null && bestDifference >= 10 && input.stats.wpm > excellent) {
    addReason(reasons, "short_test_record");
    riskScore += 2;
  }
  if (input.stats.accuracy < 80 && input.stats.accuracy >= 70 && bestDifference >= 10) {
    addReason(reasons, "low_accuracy_record");
    riskScore += 2;
  }
  if (input.stats.rawWpm - input.stats.wpm >= 20 && input.stats.wpm > 0) {
    addReason(reasons, "large_raw_gap");
    riskScore += 1;
  }
  if (input.telemetry.keystrokeCount >= 20 && input.telemetry.maxBurstCps > 20) {
    addReason(reasons, "impossible_burst");
    riskScore += 4;
  }
  if (input.telemetry.keystrokeCount >= 40 && input.telemetry.timingVariation !== null && input.telemetry.timingVariation < 0.08) {
    addReason(reasons, "uniform_timing");
    riskScore += 4;
  }

  const normalizedRisk = Math.min(10, hardRejected ? Math.max(10, riskScore) : riskScore);
  if (hardRejected) return { isRanked: false, reviewStatus: "rejected", reasons, riskScore: normalizedRisk, baselineWpm, previousBestWpm };
  if (normalizedRisk >= 3) return { isRanked: false, reviewStatus: "pending", reasons, riskScore: normalizedRisk, baselineWpm, previousBestWpm };
  return { isRanked: true, reviewStatus: null, reasons, riskScore: normalizedRisk, baselineWpm, previousBestWpm };
}

function getComparableResults(results: PreviousTypingResult[], language: string, mode: string, shortTest: boolean) {
  const sameLanguageAndMode = results.filter((item) => item.language === language && item.mode === mode && (item.duration <= 16) === shortTest);
  if (sameLanguageAndMode.length >= 3) return sameLanguageAndMode;
  const sameDurationGroup = results.filter((item) => (item.duration <= 16) === shortTest);
  return sameDurationGroup.length ? sameDurationGroup : results;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}
