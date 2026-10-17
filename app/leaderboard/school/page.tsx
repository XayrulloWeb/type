import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStudentRankings, normalizeLanguage, normalizePeriod } from "@/lib/leaderboard";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { RankingTable } from "@/components/leaderboard/RankingTable";
import { getI18n } from "@/lib/i18n";

export default async function SchoolLeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; language?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [filters, { t }] = await Promise.all([searchParams, getI18n()]);
  const period = normalizePeriod(filters.period);
  const language = normalizeLanguage(filters.language);
  const [results, studentCount] = await Promise.all([
    getStudentRankings(period, undefined, language),
    prisma.user.count({ where: { role: "STUDENT", isActive: true, archivedAt: null } }),
  ]);
  const testCount = results.reduce((sum, item) => sum + item.testsCount, 0);
  const averageWpm = results.length ? Math.round(results.reduce((sum, item) => sum + item.averageWpm, 0) / results.length) : 0;
  const averageAccuracy = results.length ? results.reduce((sum, item) => sum + item.averageAccuracy, 0) / results.length : 0;

  return (
    <div className="min-h-screen"><Header user={session.user} /><main className="page-shell">
      <LeaderboardTabs active="school" period={period} language={language} />
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="page-eyebrow">{t("leaderboard.topStudents")}</p><h1 className="page-title">{t("leaderboard.school")} · {language === "all" ? t("leaderboard.allLanguageRanking") : language.toUpperCase()}</h1><p className="page-subtitle">{t("leaderboard.schoolDescription")}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat value={studentCount} label={t("admin.students")} />
          <MiniStat value={testCount} label={t("leaderboard.tests")} />
          <MiniStat value={averageWpm} label={t("leaderboard.avgWpm")} />
          <MiniStat value={`${averageAccuracy.toFixed(0)}%`} label={t("typing.accuracy")} />
        </div>
      </div>
      <RankingTable results={results} currentUserId={session.user.id} showClass />
    </main></div>
  );
}

function MiniStat({ value, label }: { value: string | number; label: string }) {
  return <div className="data-card min-w-24 px-4 py-3"><div className="font-semibold text-nova-text">{value}</div><div className="text-[9px] uppercase tracking-[0.12em] text-nova-muted">{label}</div></div>;
}
