import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { prisma } from "@/lib/db";
import { createTestChallenge } from "@/lib/test-challenge";

export default async function TypingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const student = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } });
  if (!student?.isActive || student.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(student.role)) redirect("/login");
  const initialChallenge = createTestChallenge({ userId: session.user.id, mode: "time", language: "en", selectedDuration: 60 });
  return <TypingPractice user={session.user} initialChallenge={initialChallenge} practiceOnly={student.role === "SUPER_ADMIN"} />;
}
