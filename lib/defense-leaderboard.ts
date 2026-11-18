import "server-only";

import { prisma } from "@/lib/db";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

export interface DefenseClassRanking {
  classId: string;
  className: string;
  score: number;
  players: number;
  bossesDestroyed: number;
  averageWpm: number;
  averageAccuracy: number;
  isQualified: boolean;
}

export async function getDefenseRankings(language: DefenseLanguage, difficulty: DefenseDifficulty) {
  const baseWhere = {
    game: "defense",
    language,
    difficulty,
    user: { role: "STUDENT", isActive: true, archivedAt: null },
  } as const;
  const rankedWhere = { ...baseWhere, isRanked: true } as const;

  const [bestScores, participantBestScores] = await Promise.all([
    prisma.gameResult.groupBy({
      by: ["userId"],
      where: rankedWhere,
      _max: { score: true },
      orderBy: { _max: { score: "desc" } },
      take: 500,
    }),
    prisma.gameResult.groupBy({
      by: ["userId"],
      where: baseWhere,
      _max: { score: true },
      orderBy: { _max: { score: "desc" } },
      take: 500,
    }),
  ]);

  if (participantBestScores.length === 0) {
    return { classes: [] as DefenseClassRanking[], students: [], pendingStudents: [], participantCount: 0 };
  }

  const [candidates, participantCandidates] = await Promise.all([
    bestScores.length > 0
      ? prisma.gameResult.findMany({
          where: {
            ...rankedWhere,
            OR: bestScores.map((item) => ({ userId: item.userId, score: item._max.score ?? -1 })),
          },
          orderBy: [{ score: "desc" }, { wpm: "desc" }, { accuracy: "desc" }, { createdAt: "asc" }],
          include: { user: { include: { class: true } } },
        })
      : Promise.resolve([]),
    prisma.gameResult.findMany({
      where: {
        ...baseWhere,
        OR: participantBestScores.map((item) => ({ userId: item.userId, score: item._max.score ?? -1 })),
      },
      orderBy: [{ score: "desc" }, { wpm: "desc" }, { accuracy: "desc" }, { createdAt: "asc" }],
      include: { user: { include: { class: true } } },
    }),
  ]);

  const seen = new Set<string>();
  const bestPerStudent = candidates.filter((result) => {
    if (seen.has(result.userId)) return false;
    seen.add(result.userId);
    return true;
  });
  const participantSeen = new Set<string>();
  const bestPerParticipant = participantCandidates.filter((result) => {
    if (participantSeen.has(result.userId)) return false;
    participantSeen.add(result.userId);
    return true;
  });
  const rankedStudentIds = new Set(bestPerStudent.map((result) => result.userId));
  const pendingStudents = bestPerParticipant.filter((result) => !rankedStudentIds.has(result.userId));

  const byClass = new Map<string, typeof bestPerStudent>();
  for (const result of bestPerStudent) {
    if (!result.user.class) continue;
    const current = byClass.get(result.user.class.id) ?? [];
    current.push(result);
    byClass.set(result.user.class.id, current);
  }

  const classes = Array.from(byClass.entries()).map(([classId, results]) => {
    const topFive = results.sort((a, b) => b.score - a.score).slice(0, 5);
    const total = topFive.length || 1;
    return {
      classId,
      className: topFive[0].user.class?.name ?? "—",
      score: Math.round(topFive.reduce((sum, item) => sum + item.score, 0) / total),
      players: results.length,
      bossesDestroyed: topFive.reduce((sum, item) => sum + item.bossesDestroyed, 0),
      averageWpm: Math.round(topFive.reduce((sum, item) => sum + item.wpm, 0) / total),
      averageAccuracy: topFive.reduce((sum, item) => sum + item.accuracy, 0) / total,
      isQualified: results.length >= 3,
    } satisfies DefenseClassRanking;
  }).sort((a, b) => Number(b.isQualified) - Number(a.isQualified) || b.score - a.score || b.bossesDestroyed - a.bossesDestroyed || a.className.localeCompare(b.className, "ru"));

  return { classes, students: bestPerStudent, pendingStudents, participantCount: bestPerParticipant.length };
}
