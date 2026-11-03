import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { prisma } from "@/lib/db";
import { createTestChallenge } from "@/lib/test-challenge";

export default async function TypingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [student, speedByDifficulty] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true, class: { select: { grade: true } } } }),
    prisma.testResult.groupBy({ by: ["difficulty"], where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] }, difficulty: { in: ["easy", "medium", "hard"] } }, _max: { wpm: true } }),
  ]);
  if (!student?.isActive || student.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(student.role)) redirect("/login");
  const initialChallenge = createTestChallenge({ userId: session.user.id, mode: "time", language: "en", difficulty: "easy", selectedDuration: 60 });
  const bestWpmByDifficulty = {
    easy: speedByDifficulty.find((item) => item.difficulty === "easy")?._max.wpm ?? 0,
    medium: speedByDifficulty.find((item) => item.difficulty === "medium")?._max.wpm ?? 0,
    hard: speedByDifficulty.find((item) => item.difficulty === "hard")?._max.wpm ?? 0,
  };
  const speedStandard = student.role === "STUDENT" && student.class
    ? { grade: student.class.grade, bestWpmByDifficulty }
    : undefined;
  return <TypingPractice user={session.user} initialChallenge={initialChallenge} adminMode={student.role === "SUPER_ADMIN"} speedStandard={speedStandard} />;
}
