import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLevel } from "@/lib/typing";
import { Header } from "@/components/Header";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { getI18n } from "@/lib/i18n";
import { SpeedStandardCard } from "@/components/SpeedStandardCard";

function calculateStreak(dates: Date[]) {
  const days = [...new Set(dates.map((date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())))] .sort((a, b) => b - a);
  if (!days.length) return 0;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const day = 86_400_000;
  if (todayUtc - days[0] > day) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] !== day) break;
    streak += 1;
  }
  return streak;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [user, tests, { t }] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, include: { class: true } }),
    prisma.testResult.findMany({ where: { userId: session.user.id, language: { in: ["ru", "en"] } }, orderBy: { createdAt: "asc" } }),
    getI18n(),
  ]);
  if (!user) redirect("/login");
  const adminMode = user.role === "SUPER_ADMIN";
  const ranked = tests.filter((test) => test.isRanked);
  const bestWpm = ranked.length ? Math.max(...ranked.map((test) => test.wpm)) : 0;
  const avgWpm = ranked.length ? Math.round(ranked.reduce((sum, test) => sum + test.wpm, 0) / ranked.length) : 0;
  const avgAccuracy = ranked.length ? ranked.reduce((sum, test) => sum + test.accuracy, 0) / ranked.length : 0;
  const typingSeconds = tests.reduce((sum, test) => sum + test.duration, 0);
  const streak = calculateStreak(ranked.map((test) => test.createdAt));
  const recent = [...tests].reverse().slice(0, 8);
  const chart = ranked.slice(-30).map((test) => ({ date: format(test.createdAt, "MMM dd"), wpm: test.wpm }));
  const languageStats = (["ru", "en"] as const).map((language) => {
    const languageTests = ranked.filter((test) => test.language === language);
    return {
      language,
      tests: languageTests.length,
      averageWpm: languageTests.length ? Math.round(languageTests.reduce((sum, test) => sum + test.wpm, 0) / languageTests.length) : 0,
      bestWpm: languageTests.length ? Math.max(...languageTests.map((test) => test.wpm)) : 0,
      accuracy: languageTests.length ? languageTests.reduce((sum, test) => sum + test.accuracy, 0) / languageTests.length : 0,
    };
  });

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell">
    <section className="data-card overflow-hidden p-6 sm:p-8"><div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-nova-accent/[0.07] blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-20 w-20 place-items-center rounded-2xl border border-nova-accent/25 bg-gradient-to-br from-nova-accent/15 to-transparent text-2xl font-semibold text-nova-accent shadow-inner">{user.firstName[0]}{user.lastName[0]}</div><div className="flex-1"><div className="page-eyebrow">Личный профиль</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{user.firstName} {user.lastName}</h1><p className="mt-2 text-sm text-nova-muted">{adminMode ? t("role.admin") : user.class?.name ?? t("profile.noClass")} · <span className="font-semibold uppercase text-nova-accent">{getLevel(bestWpm)}</span></p></div><Link href="/history" className="nova-button-secondary">{t("profile.fullHistory")}</Link></div></section>
    <section className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><Stat value={bestWpm} label={t("profile.bestWpm")} accent /><Stat value={avgWpm} label={t("profile.avgWpm")} /><Stat value={`${avgAccuracy.toFixed(0)}%`} label={t("typing.accuracy")} /><Stat value={tests.length} label={t("profile.tests")} /><Stat value={`${Math.floor(typingSeconds / 60)}m`} label={t("profile.typingTime")} /><Stat value={streak} label={t("profile.streak")} /></section>
    {user.class && <SpeedStandardCard grade={user.class.grade} bestWpm={bestWpm} className="mb-8 !max-w-none" />}
    <section className="mb-8"><div className="mb-4"><h2 className="text-xl font-semibold">{t("profile.byLanguage")}</h2><p className="mt-1 text-xs text-nova-muted">{t(adminMode ? "profile.adminSeparate" : "profile.rankedOnly")}</p></div><div className="grid gap-3 sm:grid-cols-2">{languageStats.map((item) => <div key={item.language} className="data-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-nova-accent">{item.language}</span><span className="text-[10px] text-nova-muted">{item.tests} {t("profile.tests").toLowerCase()}</span></div><div className="mt-5 text-3xl font-semibold">{item.averageWpm}</div><div className="text-[9px] uppercase tracking-wider text-nova-muted">{t("profile.avgWpm")}</div><div className="mt-4 flex gap-5 text-xs text-nova-muted"><span>{t("profile.best")} <b className="text-nova-text">{item.bestWpm}</b></span><span>{t("typing.accuracy")} <b className="text-nova-text">{item.accuracy.toFixed(0)}%</b></span></div></div>)}</div></section>
    <section className="data-card h-80 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{t("profile.progress")}</h2><span className="text-xs text-nova-muted">{t("profile.last30")}</span></div><div className="h-[calc(100%-2rem)]"><ProgressChart data={chart} /></div></section>
    <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{t("profile.recent")}</h2><Link href="/history" className="text-xs text-nova-accent">{t("profile.allTests")}</Link></div><div className="data-card divide-y divide-white/5">{recent.map((test) => <Link key={test.id} href={`/results/${test.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-6 px-5 py-4 hover:bg-white/[0.025]"><div><div className="text-sm font-medium">{format(test.createdAt, "dd.MM · HH:mm")}</div><div className="text-xs text-nova-muted">{t(`typing.${test.mode}`)} · {test.language.toUpperCase()} · {test.duration}s</div></div><div className="text-right"><div className="font-semibold text-nova-accent">{test.wpm}</div><div className="text-[9px] text-nova-muted">WPM</div></div><div className="w-16 text-right text-xs text-nova-muted">{test.accuracy.toFixed(0)}%</div></Link>)}{recent.length === 0 && <div className="p-14 text-center text-nova-muted">{t("history.empty")}</div>}</div></section>
  </main></div>;
}

function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div className="data-card p-4"><div className={`text-2xl font-semibold tracking-[-0.03em] ${accent ? "text-nova-accent" : "text-nova-text"}`}>{value}</div><div className="mt-1.5 text-[9px] uppercase tracking-wider text-nova-muted">{label}</div></div>; }
