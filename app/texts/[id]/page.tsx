import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { createTestChallenge } from "@/lib/test-challenge";

export default async function LibraryTextPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/texts");
  const { id } = await params;
  const [student, text] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
    prisma.text.findUnique({ where: { id } }),
  ]);
  if (!student?.isActive || student.archivedAt || student.role !== "STUDENT") redirect("/login");
  if (!text?.isActive || !["en", "ru"].includes(text.language)) notFound();
  const initialChallenge = createTestChallenge({ userId: session.user.id, mode: "text", language: text.language as "en" | "ru", expectedText: text.content, textId: text.id });
  return <TypingPractice user={session.user} initialChallenge={initialChallenge} libraryText={{ id: text.id, title: text.title, text: text.content, language: text.language as "en" | "ru" }} />;
}
