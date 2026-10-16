import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { authOptions } from "@/lib/auth";
import { getClassRankings, normalizeLanguage, normalizePeriod } from "@/lib/leaderboard";
import { getI18n } from "@/lib/i18n";

export default async function ClassesLeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; language?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [filters, { t }] = await Promise.all([searchParams, getI18n()]);
  const period = normalizePeriod(filters.period);
  const language = normalizeLanguage(filters.language);
  const classes = await getClassRankings(period, language);

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell">
    <LeaderboardTabs active="classes" period={period} language={language} />
    <p className="page-eyebrow">{t("leaderboard.classCompetition")}</p><h1 className="page-title">{t("leaderboard.classes")} · {language === "all" ? t("leaderboard.allLanguageRanking") : language.toUpperCase()}</h1><p className="page-subtitle mb-8">{t("leaderboard.classDescription")}</p>
    <div className="space-y-3">{classes.map((item, index) => <div key={item.id} className="data-card flex items-center gap-5 p-5"><span className="grid h-9 w-9 place-items-center rounded-full bg-nova-accent/10 font-semibold text-nova-accent">{index + 1}</span><div className="flex-1"><div className="font-semibold">{item.name}</div><div className="text-xs text-nova-muted">{item.students} {t("leaderboard.activeStudents")} · {item.tests} {t("leaderboard.tests")} · {item.averageAccuracy.toFixed(0)}% {t("typing.accuracy").toLowerCase()}</div></div><div className="text-right"><div className="text-2xl font-semibold text-nova-accent">{item.averageWpm}</div><div className="text-[9px] uppercase tracking-wider text-nova-muted">{t("leaderboard.avgWpm")}</div></div></div>)}{classes.length === 0 && <div className="data-card p-14 text-center text-nova-muted">{t("leaderboard.noClasses")}</div>}</div>
  </main></div>;
}
