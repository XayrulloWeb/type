import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarClock, CircleUserRound, Medal, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getStudentRankings, type LanguageFilter, type StudentRanking } from "@/lib/leaderboard";
import { requireSuperAdminPage } from "@/lib/admin";

interface StudentDetailsPageProps {
  params: Promise<{ id: string }>;
}

const languageCards: Array<{ value: LanguageFilter; label: string }> = [
  { value: "all", label: "Общий" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export default async function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  await requireSuperAdminPage();
  const { id } = await params;
  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: {
      class: true,
      testResults: { where: { language: { in: ["ru", "en"] } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!student) notFound();

  const [schoolAll, schoolRu, schoolEn, classAll, classRu, classEn] = await Promise.all([
    getStudentRankings("all", undefined, "all"),
    getStudentRankings("all", undefined, "ru"),
    getStudentRankings("all", undefined, "en"),
    student.classId ? getStudentRankings("all", student.classId, "all") : Promise.resolve([]),
    student.classId ? getStudentRankings("all", student.classId, "ru") : Promise.resolve([]),
    student.classId ? getStudentRankings("all", student.classId, "en") : Promise.resolve([]),
  ]);
  const rankings = {
    all: { school: schoolAll, schoolRank: position(schoolAll, id), classRank: position(classAll, id) },
    ru: { school: schoolRu, schoolRank: position(schoolRu, id), classRank: position(classRu, id) },
    en: { school: schoolEn, schoolRank: position(schoolEn, id), classRank: position(classEn, id) },
  };
  const rankedTests = student.testResults.filter((item) => item.isRanked);
  const overall = summary(rankedTests);
  const firstRanked = rankedTests.at(-1);
  const latestRanked = rankedTests[0];
  const progress = firstRanked && latestRanked && firstRanked.id !== latestRanked.id ? latestRanked.wpm - firstRanked.wpm : null;

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/ranking" className="nova-button-secondary"><ArrowLeft size={15} /> К рейтингу</Link><Link href="/admin/students" className="text-xs font-medium text-nova-muted transition hover:text-nova-accent">Все ученики</Link></div>

    <section className="data-card relative mt-6 overflow-hidden p-6 sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-nova-accent/[0.06] blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-nova-accent/25 bg-gradient-to-br from-nova-accent/20 to-transparent text-2xl font-semibold text-nova-accent">{student.firstName[0]}{student.lastName[0]}</div>
        <div className="min-w-0 flex-1"><p className="page-eyebrow">Карточка ученика</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-nova-text">{student.firstName} {student.lastName}</h1><div className="mt-3 flex flex-wrap gap-2 text-xs text-nova-muted"><span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">Класс: <b className="text-nova-text">{student.class?.name ?? "—"}</b></span><span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">Логин: <b className="font-mono text-nova-text">{student.username}</b></span><span className={student.isActive && !student.archivedAt ? "rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-emerald-400" : "rounded-full border border-nova-error/20 bg-nova-error/[0.07] px-3 py-1.5 text-nova-error"}>{student.isActive && !student.archivedAt ? "Активен" : "Доступ закрыт"}</span></div></div>
        <div className="flex items-center gap-3 rounded-2xl border border-nova-accent/15 bg-nova-accent/[0.05] px-5 py-4"><Medal size={22} className="text-nova-accent" /><div><div className="text-2xl font-semibold text-nova-accent">{rankings.all.schoolRank ? `#${rankings.all.schoolRank}` : "—"}</div><div className="text-[9px] uppercase tracking-wider text-nova-muted">место в школе</div></div></div>
      </div>
    </section>

    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TopStat value={rankedTests.length} label="Тестов в рейтинге" icon={<ShieldCheck size={15} />} />
      <TopStat value={overall.averageWpm || "—"} label="Средняя WPM" accent icon={<BarChart3 size={15} />} />
      <TopStat value={overall.bestWpm || "—"} label="Лучшая WPM" icon={<Medal size={15} />} />
      <TopStat value={progress === null ? "—" : `${progress > 0 ? "+" : ""}${progress}`} label="Прогресс WPM" accent={progress !== null && progress > 0} icon={<CalendarClock size={15} />} />
    </div>

    <section className="mt-8"><div className="mb-4"><h2 className="text-xl font-semibold">Результаты по языкам</h2><p className="mt-1 text-xs text-nova-muted">Средние показатели и место ученика для каждого рейтинга.</p></div><div className="grid gap-3 xl:grid-cols-3">{languageCards.map((language) => { const tests = language.value === "all" ? rankedTests : rankedTests.filter((item) => item.language === language.value); const stats = summary(tests); const ranking = rankings[language.value]; return <div key={language.value} className="data-card p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nova-accent">{language.value.toUpperCase()}</div><h3 className="mt-1 font-semibold text-nova-text">{language.label}</h3></div><div className="text-right text-xs text-nova-muted"><div><b className="text-nova-text">{ranking.schoolRank ? `#${ranking.schoolRank}` : "—"}</b> школа</div><div className="mt-1"><b className="text-nova-text">{ranking.classRank ? `#${ranking.classRank}` : "—"}</b> класс</div></div></div><div className="mt-5 grid grid-cols-2 gap-2"><Metric value={stats.averageWpm || "—"} label="Средняя WPM" accent /><Metric value={stats.bestWpm || "—"} label="Лучшая WPM" /><Metric value={tests.length ? `${stats.accuracy}%` : "—"} label="Точность" /><Metric value={tests.length} label="Тесты" /></div></div>; })}</div></section>

    <section className="mt-8"><div className="mb-4"><h2 className="text-xl font-semibold">Последние попытки</h2><p className="mt-1 text-xs text-nova-muted">Здесь видны рейтинговые результаты и попытки, отправленные на проверку.</p></div><div className="data-card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4">Дата</th><th className="p-4">Язык</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">Точность</th><th className="p-4 text-right">Время</th><th className="p-4 text-right">Статус</th></tr></thead><tbody className="divide-y divide-white/5">{student.testResults.slice(0, 12).map((test) => <tr key={test.id} className="hover:bg-white/[0.025]"><td className="p-4 text-nova-muted">{formatDate(test.createdAt)}</td><td className="p-4 font-semibold uppercase text-nova-text">{test.language}</td><td className="p-4 text-right font-semibold text-nova-accent">{test.wpm}</td><td className="p-4 text-right text-nova-muted">{test.accuracy.toFixed(0)}%</td><td className="p-4 text-right text-nova-muted">{test.duration} сек.</td><td className="p-4 text-right"><ResultStatus isRanked={test.isRanked} reviewStatus={test.reviewStatus} /></td></tr>)}{student.testResults.length === 0 && <tr><td colSpan={6} className="p-16 text-center"><CircleUserRound className="mx-auto text-nova-muted" size={24} /><div className="mt-3 text-sm text-nova-muted">У ученика пока нет попыток.</div></td></tr>}</tbody></table></div></section>
  </div>;
}

function position(list: StudentRanking[], userId: string) {
  const index = list.findIndex((item) => item.userId === userId);
  return index < 0 ? 0 : index + 1;
}

function summary(tests: Array<{ wpm: number; accuracy: number }>) {
  return {
    averageWpm: tests.length ? Math.round(tests.reduce((sum, item) => sum + item.wpm, 0) / tests.length) : 0,
    bestWpm: tests.length ? Math.max(...tests.map((item) => item.wpm)) : 0,
    accuracy: tests.length ? Math.round(tests.reduce((sum, item) => sum + item.accuracy, 0) / tests.length) : 0,
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

function TopStat({ value, label, icon, accent = false }: { value: string | number; label: string; icon: React.ReactNode; accent?: boolean }) {
  return <div className="data-card p-5"><div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-nova-muted">{icon}</div><div className={accent ? "text-3xl font-semibold text-nova-accent" : "text-3xl font-semibold text-nova-text"}>{value}</div><div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-nova-muted">{label}</div></div>;
}

function Metric({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3"><div className={accent ? "text-xl font-semibold text-nova-accent" : "text-xl font-semibold text-nova-text"}>{value}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-nova-muted">{label}</div></div>;
}

function ResultStatus({ isRanked, reviewStatus }: { isRanked: boolean; reviewStatus: string | null }) {
  if (isRanked) return <span className="text-emerald-400">В рейтинге</span>;
  if (reviewStatus === "rejected") return <span className="text-nova-error">Отклонён</span>;
  return <span className="text-amber-300">На проверке</span>;
}
