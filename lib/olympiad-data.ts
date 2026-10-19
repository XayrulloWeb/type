import "server-only";
import { prisma } from "@/lib/db";
import { MINIMUM_RANKED_ACCURACY } from "@/lib/typing";

export async function getOlympiadExportData(id: string) {
  return prisma.olympiad.findUnique({
    where: { id },
    include: {
      targetClasses: { include: { class: true } },
      participants: {
        include: { user: { include: { class: true } }, attempts: { orderBy: { attemptNumber: "asc" } } },
        orderBy: [{ wpm: "desc" }, { accuracy: "desc" }, { submittedAt: "asc" }],
      },
    },
  });
}

export function rankedParticipants<T extends { disqualifiedAt: Date | null; wpm: number | null; accuracy: number | null; incorrectChars: number | null; extraChars: number | null; missedChars: number | null }>(participants: T[]) {
  return participants.filter((item) => item.wpm !== null && (item.accuracy ?? 0) >= MINIMUM_RANKED_ACCURACY && !item.disqualifiedAt).sort((a, b) =>
    (b.wpm ?? 0) - (a.wpm ?? 0) ||
    (b.accuracy ?? 0) - (a.accuracy ?? 0) ||
    ((a.incorrectChars ?? 0) + (a.extraChars ?? 0) + (a.missedChars ?? 0)) - ((b.incorrectChars ?? 0) + (b.extraChars ?? 0) + (b.missedChars ?? 0)),
  );
}
