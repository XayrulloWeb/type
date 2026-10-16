import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TypingPractice } from "@/components/typing/TypingPractice";

export default async function LibraryTextPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const text = await prisma.text.findUnique({ where: { id } });
  if (!text?.isActive || !["en", "ru"].includes(text.language)) notFound();
  return <TypingPractice user={session.user} libraryText={{ title: text.title, text: text.content, language: text.language as "en" | "ru" }} />;
}
