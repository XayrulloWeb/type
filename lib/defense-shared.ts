export type DefenseLanguage = "ru" | "en";
export type DefenseDifficulty = "easy" | "medium" | "hard";

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

const difficultyScoreMultiplier: Record<DefenseDifficulty, number> = { easy: 1, medium: 1.2, hard: 1.45 };

export function defenseWordScore(word: string, difficulty: DefenseDifficulty, combo: number) {
  const comboMultiplier = Math.min(2.5, 1 + Math.floor(Math.max(0, combo - 1) / 5) * 0.25);
  return Math.round((Array.from(word).length * 10 + 20) * difficultyScoreMultiplier[difficulty] * comboMultiplier);
}

export function defenseGrade(accuracy: number, maxCombo: number, destroyed: number) {
  if (accuracy >= 97 && maxCombo >= 30 && destroyed >= 35) return "S";
  if (accuracy >= 92 && maxCombo >= 20 && destroyed >= 24) return "A";
  if (accuracy >= 85 && destroyed >= 15) return "B";
  if (accuracy >= 75 && destroyed >= 8) return "C";
  return "D";
}
