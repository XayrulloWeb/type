import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TypingPractice } from "@/components/typing/TypingPractice";

export default async function AssignmentPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/assignments");
  const { id } = await params;
  const [student, assignment] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true, isActive: true } }),
    prisma.assignment.findUnique({ where: { id }, include: { text: true } }),
  ]);
  if (!student?.isActive) redirect("/login");
  if (!assignment?.isActive || assignment.classId !== student.classId || !["ru", "en"].includes(assignment.text.language)) notFound();

  return <TypingPractice user={session.user} assignment={{ id: assignment.id, title: assignment.title, text: assignment.text.content, language: assignment.text.language as "en" | "ru" }} />;
}
