import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentRankings, normalizeLanguage, normalizePeriod } from "@/lib/leaderboard";
import { Header } from "@/components/Header";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { RankingTable } from "@/components/leaderboard/RankingTable";
import { getI18n } from "@/lib/i18n";

export default async function ClassLeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; language?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [filters, { t }] = await Promise.all([searchParams, getI18n()]);
  const period = normalizePeriod(filters.period);
  const language = normalizeLanguage(filters.language);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { class: true } });
  const results = user?.classId ? await getStudentRankings(period, user.classId, language) : [];

  return (
    <div className="min-h-screen"><Header user={session.user} /><main className="page-shell">
      <LeaderboardTabs active="class" period={period} language={language} />
      <p className="page-eyebrow">{t("leaderboard.title")}</p>
      <h1 className="page-title">{user?.class?.name ? `${user.class.name} · ${language === "all" ? t("leaderboard.allLanguageRanking") : language.toUpperCase()}` : t("leaderboard.classRanking")}</h1>
      <p className="page-subtitle mb-8">{t("leaderboard.studentDescription")}</p>
      {!user?.classId ? <div className="data-card p-12 text-center text-nova-muted">{t("leaderboard.noClass")}</div> : <RankingTable results={results} currentUserId={session.user.id} />}
    </main></div>
  );
}
