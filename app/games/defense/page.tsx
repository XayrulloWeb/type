import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { DefenseGame } from "@/components/games/DefenseGame";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

export default async function DefensePage({ searchParams }: { searchParams: Promise<{ language?: string; difficulty?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [query, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");
  const language: DefenseLanguage = query.language === "ru" ? "ru" : "en";
  const difficulty: DefenseDifficulty = query.difficulty === "medium" || query.difficulty === "hard" ? query.difficulty : "easy";

  return <div className="min-h-screen bg-[#06090a]"><Header user={session.user} /><DefenseGame initialLanguage={language} initialDifficulty={difficulty} adminMode={user.role === "SUPER_ADMIN"} /></div>;
}
