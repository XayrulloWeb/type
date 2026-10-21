import { typingCharacters } from "@/lib/typing-text";

export const MINIMUM_RANKED_ACCURACY = 70;

export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  timeElapsed: number;
  focusLostCount: number;
}

export interface TypingTelemetry {
  keystrokeCount: number;
  backspaceCount: number;
  maxBurstCps: number;
  timingVariation: number | null;
}

interface CalculateTypingStatsInput {
  expectedText: string;
  typedText: string;
  durationSeconds: number;
  countMissed?: boolean;
  focusLostCount?: number;
}

export function calculateTypingStats({
  expectedText,
  typedText,
  durationSeconds,
  countMissed = false,
  focusLostCount = 0,
}: CalculateTypingStatsInput): TypingStats {
  let correctChars = 0;
  let incorrectChars = 0;

  const expectedChars = typingCharacters(expectedText);
  const typedChars = typingCharacters(typedText);
  const comparableLength = Math.min(expectedChars.length, typedChars.length);
  for (let index = 0; index < comparableLength; index += 1) {
    if (typedChars[index] === expectedChars[index]) correctChars += 1;
    else incorrectChars += 1;
  }

  const extraChars = Math.max(0, typedChars.length - expectedChars.length);
  const missedChars = countMissed ? Math.max(0, expectedChars.length - typedChars.length) : 0;
  const totalTyped = correctChars + incorrectChars + extraChars;
  const safeDuration = Math.max(0, durationSeconds);
  const minutes = safeDuration / 60;

  return {
    wpm: minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0,
    rawWpm: minutes > 0 ? Math.round(totalTyped / 5 / minutes) : 0,
    accuracy: totalTyped > 0 ? (correctChars / totalTyped) * 100 : 100,
    correctChars,
    incorrectChars,
    extraChars,
    missedChars,
    timeElapsed: safeDuration,
    focusLostCount,
  };
}

export function getLevel(wpm: number) {
  if (wpm >= 80) return "Master";
  if (wpm >= 60) return "Pro";
  if (wpm >= 40) return "Fast";
  if (wpm >= 20) return "Starter";
  return "Beginner";
}

export function getRankingState(input: {
  stats: TypingStats;
  mode: "time" | "words" | "text";
  selectedDuration?: number;
  pasteDetected?: boolean;
}) {
  const reasons: string[] = [];
  if (input.mode === "time") {
    const minimumRankedDuration = input.selectedDuration === 15 ? 14 : 29;
    if (input.stats.timeElapsed < minimumRankedDuration) reasons.push("duration_too_short");
    if (input.selectedDuration && input.selectedDuration >= 30 && input.stats.timeElapsed < input.selectedDuration - 1) {
      reasons.push("incomplete_timer");
    }
  }
  if (input.stats.wpm > 220 || input.stats.rawWpm > 260) reasons.push("unrealistic_speed");
  if (input.stats.accuracy < MINIMUM_RANKED_ACCURACY) reasons.push("accuracy_too_low");
  if (input.stats.focusLostCount > 3) reasons.push("focus_lost");
  if (input.pasteDetected) reasons.push("paste_attempt");

  return { isRanked: reasons.length === 0, reasons };
}
