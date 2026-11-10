import "server-only";

import { prisma } from "@/lib/db";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

export async function getDefenseLeaderboard(language: DefenseLanguage, difficulty: DefenseDifficulty, take = 12) {
  const results = await prisma.gameResult.findMany({
    where: {
      game: "defense",
      language,
      difficulty,
      isRanked: true,
      user: { role: "STUDENT", isActive: true, archivedAt: null },
    },
    orderBy: [{ score: "desc" }, { wpm: "desc" }, { accuracy: "desc" }, { createdAt: "asc" }],
    take: 500,
    include: { user: { include: { class: true } } },
  });

  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.userId)) return false;
    seen.add(result.userId);
    return true;
  }).slice(0, take);
}
