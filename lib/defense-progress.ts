import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface DefenseAchievement {
  id:
    | "first-mission"
    | "mission-squad"
    | "veteran"
    | "legend"
    | "boss-hunter"
    | "commander-slayer"
    | "boss-veteran"
    | "precision"
    | "precision-master"
    | "perfect-defense"
    | "combo-starter"
    | "combo-master"
    | "elite-score"
    | "legend-score"
    | "destroyer"
    | "hard-survivor"
    | "marathon"
    | "bilingual";
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export async function getStudentDefenseCreditBalances(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Map<string, number>();

  const [earnedRows, spentRows] = await Promise.all([
    prisma.gameResult.groupBy({
      by: ["userId"],
      where: { userId: { in: uniqueUserIds }, game: "defense", isRanked: true },
      _sum: { rewardCredits: true },
    }),
    prisma.gamePurchase.groupBy({
      by: ["userId"],
      where: { userId: { in: uniqueUserIds } },
      _sum: { price: true },
    }),
  ]);

  const earnedByUser = new Map(earnedRows.map((row) => [row.userId, row._sum.rewardCredits ?? 0]));
  const spentByUser = new Map(spentRows.map((row) => [row.userId, row._sum.price ?? 0]));
  return new Map(uniqueUserIds.map((userId) => [
    userId,
    Math.max(0, (earnedByUser.get(userId) ?? 0) - (spentByUser.get(userId) ?? 0)),
  ]));
}

export async function getDefensePlayerProgress(userId: string, includePrivateMissions = false) {
  const where = {
    game: "defense",
    userId,
    ...(includePrivateMissions ? {} : { isRanked: true }),
  } satisfies Prisma.GameResultWhereInput;
  const [summary, purchases, precisionResult, precisionMasterResult, perfectResult, hardResult, marathonResult, languages] = await Promise.all([
    prisma.gameResult.aggregate({
      where,
      _count: { _all: true },
      _sum: { rewardCredits: true, bossesDestroyed: true },
      _max: { score: true, maxCombo: true, destroyed: true },
    }),
    prisma.gamePurchase.aggregate({ where: { userId }, _count: { _all: true }, _sum: { price: true } }),
    prisma.gameResult.findFirst({ where: { ...where, accuracy: { gte: 95 }, destroyed: { gte: 5 } }, select: { id: true } }),
    prisma.gameResult.findFirst({ where: { ...where, accuracy: { gte: 98 }, destroyed: { gte: 15 } }, select: { id: true } }),
    prisma.gameResult.findFirst({ where: { ...where, missed: 0, destroyed: { gte: 12 } }, select: { id: true } }),
    prisma.gameResult.findFirst({ where: { ...where, difficulty: "hard", destroyed: { gte: 12 } }, select: { id: true } }),
    prisma.gameResult.findFirst({ where: { ...where, duration: { gte: 120 }, destroyed: { gte: 20 } }, select: { id: true } }),
    prisma.gameResult.groupBy({ by: ["language"], where }),
  ]);

  const missions = summary._count._all;
  const earnedCredits = summary._sum.rewardCredits ?? 0;
  const spentCredits = purchases._sum.price ?? 0;
  const credits = Math.max(0, earnedCredits - spentCredits);
  const bosses = summary._sum.bossesDestroyed ?? 0;
  const bestScore = summary._max.score ?? 0;
  const bestCombo = summary._max.maxCombo ?? 0;
  const bestDestroyed = summary._max.destroyed ?? 0;
  const languageCount = new Set(languages.map((item) => item.language).filter((item) => item === "ru" || item === "en")).size;
  const missionLabel = includePrivateMissions ? "личную миссию" : "рейтинговую миссию";
  const pluralMissions = includePrivateMissions ? "личных миссий" : "рейтинговых миссий";
  const achievements: DefenseAchievement[] = [
    achievement("first-mission", "Первый рубеж", `Завершить ${missionLabel}`, missions, 1),
    achievement("mission-squad", "Боевой отряд", `Завершить 5 ${pluralMissions}`, missions, 5),
    achievement("veteran", "Ветеран защиты", `Завершить 25 ${pluralMissions}`, missions, 25),
    achievement("legend", "Легенда периметра", `Завершить 100 ${pluralMissions}`, missions, 100),
    achievement("boss-hunter", "Охотник", "Победить первого командира", bosses, 1),
    achievement("commander-slayer", "Гроза командиров", "Победить 5 командиров", bosses, 5),
    achievement("boss-veteran", "Истребитель командиров", "Победить 20 командиров", bosses, 20),
    achievement("precision", "Точный стрелок", "Получить 95% точности при 5 целях", precisionResult ? 1 : 0, 1),
    achievement("precision-master", "Безошибочный расчёт", "Получить 98% точности при 15 целях", precisionMasterResult ? 1 : 0, 1),
    achievement("perfect-defense", "Идеальный периметр", "Уничтожить 12 целей без прорыва", perfectResult ? 1 : 0, 1),
    achievement("combo-starter", "Серия огня", "Собрать комбо x10", bestCombo, 10),
    achievement("combo-master", "Мастер комбо", "Собрать комбо x30", bestCombo, 30),
    achievement("elite-score", "Элитный защитник", "Набрать 3 000 очков за миссию", bestScore, 3_000),
    achievement("legend-score", "Золотой реактор", "Набрать 10 000 очков за миссию", bestScore, 10_000),
    achievement("destroyer", "Неудержимый", "Уничтожить 40 целей за миссию", bestDestroyed, 40),
    achievement("hard-survivor", "Выживший", "Уничтожить 12 целей на Hard", hardResult ? 1 : 0, 1),
    achievement("marathon", "Долгая вахта", "Продержаться 2 минуты и уничтожить 20 целей", marathonResult ? 1 : 0, 1),
    achievement("bilingual", "Два языка", "Завершить миссии на русском и английском", languageCount, 2),
  ];

  return {
    achievements,
    bosses,
    credits,
    earnedCredits,
    spentCredits,
    purchases: purchases._count._all,
    missions,
    unlockedAchievements: achievements.filter((item) => item.unlocked).length,
  };
}

function achievement(id: DefenseAchievement["id"], title: string, description: string, current: number, target: number): DefenseAchievement {
  return { id, title, description, current, target, unlocked: current >= target };
}
