export type DefenseLanguage = "ru" | "en";
export type DefenseDifficulty = "easy" | "medium" | "hard";
export type DefenseTargetKind = "normal" | "swift" | "armored" | "special";

export type DefenseEvent =
  | { type: "hit"; wordIndex: number; charIndex: number; atMs: number }
  | { type: "destroyed"; wordIndex: number; atMs: number }
  | { type: "missed"; wordIndex: number; atMs: number }
  | { type: "error"; atMs: number };

export interface DefenseSavedResult {
  id: string;
  score: number;
  wpm: number;
  accuracy: number;
  destroyed: number;
  missed: number;
  maxCombo: number;
  duration: number;
  isRanked: boolean;
  grade: string;
}

export const DEFENSE_CONFIG = {
  easy: { label: "Easy", lives: 4, spawnMs: 2_250, fallPercentPerSecond: 4.25, maxTargets: 6 },
  medium: { label: "Medium", lives: 3, spawnMs: 1_850, fallPercentPerSecond: 5.25, maxTargets: 7 },
  hard: { label: "Hard", lives: 3, spawnMs: 1_500, fallPercentPerSecond: 6.25, maxTargets: 8 },
} satisfies Record<DefenseDifficulty, { label: string; lives: number; spawnMs: number; fallPercentPerSecond: number; maxTargets: number }>;

export const DEFENSE_WAVE_DURATION_MS = 30_000;
export const DEFENSE_MAX_WAVES = 6;

export const DEFENSE_TARGETS = {
  normal: { label: "Обычная", shortLabel: "СТАНДАРТ", speedMultiplier: 1, scoreMultiplier: 1, breachDamage: 1 },
  swift: { label: "Быстрая", shortLabel: "БЫСТРАЯ", speedMultiplier: 1.55, scoreMultiplier: 1.25, breachDamage: 1 },
  armored: { label: "Бронированная", shortLabel: "БРОНЯ", speedMultiplier: 0.74, scoreMultiplier: 1.6, breachDamage: 2 },
  special: { label: "Особая", shortLabel: "ОСОБАЯ", speedMultiplier: 1.1, scoreMultiplier: 2, breachDamage: 1 },
} satisfies Record<DefenseTargetKind, { label: string; shortLabel: string; speedMultiplier: number; scoreMultiplier: number; breachDamage: number }>;

const difficultyScoreMultiplier: Record<DefenseDifficulty, number> = { easy: 1, medium: 1.2, hard: 1.45 };

export function defenseWave(elapsedMs: number) {
  return Math.min(DEFENSE_MAX_WAVES, Math.floor(Math.max(0, elapsedMs) / DEFENSE_WAVE_DURATION_MS) + 1);
}

export function defenseTargetKind(wordIndex: number, difficulty: DefenseDifficulty): DefenseTargetKind {
  const unlocks = difficulty === "easy"
    ? { swift: 4, armored: 12, special: 24 }
    : difficulty === "medium"
      ? { swift: 5, armored: 15, special: 30 }
      : { swift: 6, armored: 19, special: 38 };
  const marker = (wordIndex * 11 + (difficulty === "easy" ? 3 : difficulty === "medium" ? 7 : 13)) % 24;

  if (wordIndex >= unlocks.special && marker <= 2) return "special";
  if (wordIndex >= unlocks.armored && marker >= 3 && marker <= 6) return "armored";
  if (wordIndex >= unlocks.swift && marker >= 7 && marker <= 13) return "swift";
  return "normal";
}

export function defenseWordScore(word: string, difficulty: DefenseDifficulty, combo: number, targetKind: DefenseTargetKind = "normal") {
  const comboMultiplier = Math.min(2.5, 1 + Math.floor(Math.max(0, combo - 1) / 5) * 0.25);
  return Math.round((Array.from(word).length * 10 + 20) * difficultyScoreMultiplier[difficulty] * comboMultiplier * DEFENSE_TARGETS[targetKind].scoreMultiplier);
}

export function defenseGrade(accuracy: number, maxCombo: number, destroyed: number) {
  if (accuracy >= 97 && maxCombo >= 30 && destroyed >= 35) return "S";
  if (accuracy >= 92 && maxCombo >= 20 && destroyed >= 24) return "A";
  if (accuracy >= 85 && destroyed >= 15) return "B";
  if (accuracy >= 75 && destroyed >= 8) return "C";
  return "D";
}
