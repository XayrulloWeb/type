import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface DefenseAchievement {
  id: "first-mission" | "boss-hunter" | "commander-slayer" | "precision" | "perfect-defense" | "combo-master" | "veteran" | "elite-score";
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export async function getDefensePlayerProgress(userId: string, includePrivateMissions = false) {
  const where = {
    game: "defense",
    userId,
    ...(includePrivateMissions ? {} : { isRanked: true }),
  } satisfies Prisma.GameResultWhereInput;
  const [summary, precisionResult, perfectResult] = await Promise.all([
    prisma.gameResult.aggregate({
      where,
      _count: { _all: true },
      _sum: { rewardCredits: true, bossesDestroyed: true },
      _max: { score: true, maxCombo: true },
    }),
    prisma.gameResult.findFirst({ where: { ...where, accuracy: { gte: 95 }, destroyed: { gte: 5 } }, select: { id: true } }),
    prisma.gameResult.findFirst({ where: { ...where, missed: 0, destroyed: { gte: 12 } }, select: { id: true } }),
  ]);

  const missions = summary._count._all;
  const credits = summary._sum.rewardCredits ?? 0;
  const bosses = summary._sum.bossesDestroyed ?? 0;
  const bestScore = summary._max.score ?? 0;
  const bestCombo = summary._max.maxCombo ?? 0;
  const missionLabel = includePrivateMissions ? "личную миссию" : "рейтинговую миссию";
  const achievements: DefenseAchievement[] = [
    achievement("first-mission", "Первый рубеж", `Завершить ${missionLabel}`, missions, 1),
    achievement("boss-hunter", "Охотник", "Победить первого командира", bosses, 1),
    achievement("commander-slayer", "Гроза командиров", "Победить 5 командиров", bosses, 5),
    achievement("precision", "Точный стрелок", "Получить 95% точности при 5 целях", precisionResult ? 1 : 0, 1),
    achievement("perfect-defense", "Идеальный периметр", "Уничтожить 12 целей без прорыва", perfectResult ? 1 : 0, 1),
    achievement("combo-master", "Мастер комбо", "Собрать комбо x20", bestCombo, 20),
    achievement("veteran", "Ветеран защиты", `Завершить 25 ${includePrivateMissions ? "личных миссий" : "рейтинговых миссий"}`, missions, 25),
    achievement("elite-score", "Элитный защитник", "Набрать 3 000 очков за миссию", bestScore, 3_000),
  ];

  return {
    achievements,
    bosses,
    credits,
    missions,
    unlockedAchievements: achievements.filter((item) => item.unlocked).length,
  };
}

function achievement(id: DefenseAchievement["id"], title: string, description: string, current: number, target: number): DefenseAchievement {
  return { id, title, description, current, target, unlocked: current >= target };
}
