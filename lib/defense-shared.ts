export type DefenseLanguage = "ru" | "en";
export type DefenseDifficulty = "easy" | "medium" | "hard";
export type DefenseTargetKind = "normal" | "swift" | "armored" | "special" | "boss";
export type DefensePowerup = "shield" | "freeze" | "double";
export type DefenseRewardBox = "common" | "rare" | "epic" | "legendary";

export type DefenseEvent =
  | { type: "hit"; wordIndex: number; charIndex: number; atMs: number }
  | { type: "destroyed"; wordIndex: number; atMs: number }
  | { type: "missed"; wordIndex: number; atMs: number }
  | { type: "powerup"; powerup: DefensePowerup; atMs: number }
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
  bossesDestroyed: number;
  rewardCredits: number;
  rewardBox: DefenseRewardBox | null;
  boxCredits: number;
  stars: number;
  medals: string[];
}

export const DEFENSE_CONFIG = {
  easy: { label: "Easy", lives: 4, spawnMs: 2_250, fallPercentPerSecond: 4.25, maxTargets: 6 },
  medium: { label: "Medium", lives: 3, spawnMs: 1_850, fallPercentPerSecond: 5.25, maxTargets: 7 },
  hard: { label: "Hard", lives: 3, spawnMs: 1_500, fallPercentPerSecond: 6.25, maxTargets: 8 },
} satisfies Record<DefenseDifficulty, { label: string; lives: number; spawnMs: number; fallPercentPerSecond: number; maxTargets: number }>;

export const DEFENSE_WAVE_DURATION_MS = 30_000;
export const DEFENSE_MAX_WAVES = 6;
export const DEFENSE_POWERUP_DURATION_MS = {
  shield: 8_000,
  freeze: 5_000,
  double: 10_000,
} satisfies Record<DefensePowerup, number>;

export const DEFENSE_TARGETS = {
  normal: { label: "Обычная / Normal", shortLabel: "СТАНДАРТ / NORMAL", speedMultiplier: 1, scoreMultiplier: 1, breachDamage: 1 },
  swift: { label: "Быстрая / Swift", shortLabel: "БЫСТРАЯ / SWIFT", speedMultiplier: 1.55, scoreMultiplier: 1.25, breachDamage: 1 },
  armored: { label: "Бронированная / Armored", shortLabel: "БРОНЯ / ARMOR", speedMultiplier: 0.74, scoreMultiplier: 1.6, breachDamage: 2 },
  special: { label: "Особая / Special", shortLabel: "ОСОБАЯ / SPECIAL", speedMultiplier: 1.1, scoreMultiplier: 2, breachDamage: 1 },
  boss: { label: "Командир / Boss", shortLabel: "КОМАНДИР / BOSS", speedMultiplier: 0.42, scoreMultiplier: 4.5, breachDamage: 3 },
} satisfies Record<DefenseTargetKind, { label: string; shortLabel: string; speedMultiplier: number; scoreMultiplier: number; breachDamage: number }>;

const difficultyScoreMultiplier: Record<DefenseDifficulty, number> = { easy: 1, medium: 1.2, hard: 1.45 };

export function defenseWave(elapsedMs: number) {
  return Math.min(DEFENSE_MAX_WAVES, Math.floor(Math.max(0, elapsedMs) / DEFENSE_WAVE_DURATION_MS) + 1);
}

export function defenseTargetKind(wordIndex: number, difficulty: DefenseDifficulty): DefenseTargetKind {
  const bossCadence = difficulty === "easy" ? 12 : difficulty === "medium" ? 15 : 19;
  if (wordIndex > 0 && (wordIndex + 1) % bossCadence === 0) return "boss";

  const unlocks = difficulty === "easy"
    ? { swift: 4, armored: 12, special: 24 }
    : difficulty === "medium"
      ? { swift: 5, armored: 15, special: 30 }
      : { swift: 6, armored: 19, special: 38 };
  const marker = (wordIndex * 11 + (difficulty === "easy" ? 3 : difficulty === "medium" ? 7 : 13)) % 24;

  if (wordIndex === unlocks.special) return "special";
  if (wordIndex === unlocks.armored) return "armored";
  if (wordIndex === unlocks.swift) return "swift";
  if (wordIndex >= unlocks.special && marker <= 2) return "special";
  if (wordIndex >= unlocks.armored && marker >= 3 && marker <= 6) return "armored";
  if (wordIndex >= unlocks.swift && marker >= 7 && marker <= 13) return "swift";
  return "normal";
}

export function defenseRequiredHits(word: string, targetKind: DefenseTargetKind) {
  return Array.from(word).length * (targetKind === "boss" ? 3 : 1);
}

export function defensePowerupDrop(wordIndex: number): DefensePowerup | null {
  const slot = wordIndex % 15;
  if (slot === 4) return "shield";
  if (slot === 9) return "freeze";
  if (slot === 14) return "double";
  return null;
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

export function defenseRewards({ accuracy, bossesDestroyed, destroyed, duration, difficulty, maxCombo, missed }: { accuracy: number; bossesDestroyed: number; destroyed: number; duration: number; difficulty: DefenseDifficulty; maxCombo: number; missed: number }) {
  let stars = 1;
  if (destroyed >= 12 && accuracy >= 82) stars = 2;
  if (destroyed >= 24 && accuracy >= 92 && bossesDestroyed >= 2) stars = 3;

  const medals: string[] = [];
  if (bossesDestroyed >= 1) medals.push("Охотник на командиров");
  if (destroyed >= 5 && missed === 0) medals.push("Идеальный периметр");
  if (destroyed >= 5 && accuracy >= 95) medals.push("Точный стрелок");
  if (maxCombo >= 20) medals.push("Мастер комбо");

  const qualifiesForCredits = duration >= 45 && destroyed >= 10 && accuracy >= 80;
  const baseCredits = difficulty === "hard" ? 26 : difficulty === "medium" ? 18 : 12;
  const starBonus = (stars - 1) * 4;
  const accuracyBonus = accuracy >= 95 ? 4 : accuracy >= 90 ? 2 : 0;
  const enduranceBonus = duration >= 120 ? 6 : duration >= 90 ? 3 : 0;
  const bossBonus = Math.min(3, bossesDestroyed) * 3;
  const credits = qualifiesForCredits ? baseCredits + starBonus + accuracyBonus + enduranceBonus + bossBonus : 0;
  return { credits, medals, stars };
}

export function defenseBoxReward({ accuracy, destroyed, difficulty, duration, stars, wpm, roll }: { accuracy: number; destroyed: number; difficulty: DefenseDifficulty; duration: number; stars: number; wpm: number; roll: number }): { box: DefenseRewardBox | null; credits: number } {
  if (duration < 60 || destroyed < 12 || accuracy < 85) return { box: null, credits: 0 };

  const difficultyChance = difficulty === "hard" ? 0.07 : difficulty === "medium" ? 0.035 : 0;
  const chance = Math.min(0.35, 0.035 + Math.min(0.15, wpm / 420) + difficultyChance + (stars - 1) * 0.025);
  const normalizedRoll = Math.max(0, Math.min(0.999_999, roll));
  if (normalizedRoll >= chance) return { box: null, credits: 0 };

  const rarityRoll = normalizedRoll / chance;
  if (wpm >= 55 && accuracy >= 96 && difficulty === "hard" && rarityRoll < 0.025) return { box: "legendary", credits: 300 };
  if (wpm >= 40 && accuracy >= 93 && rarityRoll < 0.13) return { box: "epic", credits: 120 };
  if (rarityRoll < 0.42) return { box: "rare", credits: 45 };
  return { box: "common", credits: 20 };
}
