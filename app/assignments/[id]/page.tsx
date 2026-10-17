import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { createTestChallenge } from "@/lib/test-challenge";

export default async function AssignmentPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/assignments");
  const { id } = await params;
  const [student, assignment] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, classId: true, isActive: true, archivedAt: true } }),
    prisma.assignment.findUnique({ where: { id }, include: { text: true } }),
  ]);
  if (!student?.isActive || student.archivedAt || student.role !== "STUDENT") redirect("/login");
  if (!assignment?.isActive || assignment.classId !== student.classId || !["ru", "en"].includes(assignment.text.language)) notFound();
  const initialChallenge = createTestChallenge({ userId: session.user.id, mode: "text", language: assignment.text.language as "en" | "ru", expectedText: assignment.text.content, assignmentId: assignment.id });

  return <TypingPractice user={session.user} initialChallenge={initialChallenge} assignment={{ id: assignment.id, title: assignment.title, text: assignment.text.content, language: assignment.text.language as "en" | "ru" }} />;
}
