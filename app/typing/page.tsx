import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { prisma } from "@/lib/db";
import { createTestChallenge } from "@/lib/test-challenge";

export default async function TypingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [student, speed] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true, class: { select: { grade: true } } } }),
    prisma.testResult.aggregate({ where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] } }, _avg: { wpm: true } }),
  ]);
  if (!student?.isActive || student.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(student.role)) redirect("/login");
  const initialChallenge = createTestChallenge({ userId: session.user.id, mode: "time", language: "en", selectedDuration: 60 });
  const speedStandard = student.role === "STUDENT" && student.class
    ? { grade: student.class.grade, averageWpm: Math.round(speed._avg.wpm ?? 0) }
    : undefined;
  return <TypingPractice user={session.user} initialChallenge={initialChallenge} practiceOnly={student.role === "SUPER_ADMIN"} speedStandard={speedStandard} />;
}
