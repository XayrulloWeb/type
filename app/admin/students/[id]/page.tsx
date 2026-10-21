import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarClock, ChevronLeft, ChevronRight, CircleUserRound, Medal, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStudentRankings, type LanguageFilter, type StudentRanking } from "@/lib/leaderboard";
import { requireSuperAdminPage } from "@/lib/admin";
import { ResultModerationControls } from "@/components/admin/ResultModerationControls";

const ATTEMPTS_PER_PAGE = 25;

interface StudentDetailsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attemptsPage?: string | string[] }>;
}

const languageCards: Array<{ value: LanguageFilter; label: string }> = [
  { value: "all", label: "Общий" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export default async function StudentDetailsPage({ params, searchParams }: StudentDetailsPageProps) {
  await requireSuperAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedPage = positivePage(query.attemptsPage);
  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: { class: true },
  });
  if (!student) notFound();

  const testsWhere: Prisma.TestResultWhereInput = { userId: id, language: { in: ["ru", "en"] } };
  const rankedWhere: Prisma.TestResultWhereInput = { ...testsWhere, isRanked: true };
  const [
    attemptsCount,
    overallAggregate,
    ruAggregate,
    enAggregate,
    firstRanked,
    latestRanked,
    schoolAll,
    schoolRu,
    schoolEn,
  ] = await Promise.all([
    prisma.testResult.count({ where: testsWhere }),
    prisma.testResult.aggregate({ where: rankedWhere, _avg: { wpm: true, accuracy: true }, _max: { wpm: true }, _count: { _all: true } }),
    prisma.testResult.aggregate({ where: { ...rankedWhere, language: "ru" }, _avg: { wpm: true, accuracy: true }, _max: { wpm: true }, _count: { _all: true } }),
    prisma.testResult.aggregate({ where: { ...rankedWhere, language: "en" }, _avg: { wpm: true, accuracy: true }, _max: { wpm: true }, _count: { _all: true } }),
    prisma.testResult.findFirst({ where: rankedWhere, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, wpm: true } }),
    prisma.testResult.findFirst({ where: rankedWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, wpm: true } }),
    getStudentRankings("all", undefined, "all"),
    getStudentRankings("all", undefined, "ru"),
    getStudentRankings("all", undefined, "en"),
  ]);

  const totalPages = Math.max(1, Math.ceil(attemptsCount / ATTEMPTS_PER_PAGE));
  const attemptsPage = Math.min(requestedPage, totalPages);
  const attempts = await prisma.testResult.findMany({
    where: testsWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (attemptsPage - 1) * ATTEMPTS_PER_PAGE,
    take: ATTEMPTS_PER_PAGE,
    select: {
      id: true,
      createdAt: true,
      language: true,
      wpm: true,
      accuracy: true,
      duration: true,
      isRanked: true,
      reviewStatus: true,
    },
  });

  const classRankings = (items: StudentRanking[]) => student.classId
    ? items.filter((item) => item.user.classId === student.classId)
    : [];
  const rankings = {
    all: { schoolRank: position(schoolAll, id), classRank: position(classRankings(schoolAll), id) },
    ru: { schoolRank: position(schoolRu, id), classRank: position(classRankings(schoolRu), id) },
    en: { schoolRank: position(schoolEn, id), classRank: position(classRankings(schoolEn), id) },
  };
  const stats = {
    all: aggregateStats(overallAggregate),
    ru: aggregateStats(ruAggregate),
    en: aggregateStats(enAggregate),
  };
  const progress = firstRanked && latestRanked && firstRanked.id !== latestRanked.id
    ? latestRanked.wpm - firstRanked.wpm
    : null;
  const shownFrom = attemptsCount ? (attemptsPage - 1) * ATTEMPTS_PER_PAGE + 1 : 0;
  const shownTo = Math.min(attemptsPage * ATTEMPTS_PER_PAGE, attemptsCount);

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/ranking" className="nova-button-secondary"><ArrowLeft size={15} /> К рейтингу</Link>
      <Link href="/admin/students" className="text-xs font-medium text-nova-muted transition hover:text-nova-accent">Все ученики</Link>
    </div>

    <section className="data-card relative mt-6 overflow-hidden p-6 sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-nova-accent/[0.06] blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-nova-accent/25 bg-gradient-to-br from-nova-accent/20 to-transparent text-2xl font-semibold text-nova-accent">{student.firstName[0]}{student.lastName[0]}</div>
        <div className="min-w-0 flex-1">
          <p className="page-eyebrow">Карточка ученика</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-nova-text">{student.firstName} {student.lastName}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-nova-muted">
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">Класс: <b className="text-nova-text">{student.class?.name ?? "—"}</b></span>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">Логин: <b className="font-mono text-nova-text">{student.username}</b></span>
            <span className={student.isActive && !student.archivedAt ? "rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-emerald-400" : "rounded-full border border-nova-error/20 bg-nova-error/[0.07] px-3 py-1.5 text-nova-error"}>{student.isActive && !student.archivedAt ? "Активен" : "Доступ закрыт"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-nova-accent/15 bg-nova-accent/[0.05] px-5 py-4">
          <Medal size={22} className="text-nova-accent" />
          <div><div className="text-2xl font-semibold text-nova-accent">{rankings.all.schoolRank ? `#${rankings.all.schoolRank}` : "—"}</div><div className="text-[9px] uppercase tracking-wider text-nova-muted">место в школе</div></div>
        </div>
      </div>
    </section>

    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TopStat value={stats.all.tests} label="Тестов в рейтинге" icon={<ShieldCheck size={15} />} />
      <TopStat value={stats.all.averageWpm || "—"} label="Средняя WPM" icon={<BarChart3 size={15} />} />
      <TopStat value={stats.all.bestWpm || "—"} label="Лучшая WPM" accent icon={<Medal size={15} />} />
      <TopStat value={progress === null ? "—" : `${progress > 0 ? "+" : ""}${progress}`} label="Прогресс WPM" accent={progress !== null && progress > 0} icon={<CalendarClock size={15} />} />
    </div>

    <section className="mt-8">
      <div className="mb-4"><h2 className="text-xl font-semibold">Результаты по языкам</h2><p className="mt-1 text-xs text-nova-muted">Место определяется по лучшей WPM; средние показатели сохранены для статистики.</p></div>
      <div className="grid gap-3 xl:grid-cols-3">{languageCards.map((language) => {
        const item = stats[language.value];
        const ranking = rankings[language.value];
        return <div key={language.value} className="data-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nova-accent">{language.value.toUpperCase()}</div><h3 className="mt-1 font-semibold text-nova-text">{language.label}</h3></div>
            <div className="text-right text-xs text-nova-muted"><div><b className="text-nova-text">{ranking.schoolRank ? `#${ranking.schoolRank}` : "—"}</b> школа</div><div className="mt-1"><b className="text-nova-text">{ranking.classRank ? `#${ranking.classRank}` : "—"}</b> класс</div></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2"><Metric value={item.averageWpm || "—"} label="Средняя WPM" /><Metric value={item.bestWpm || "—"} label="Лучшая WPM" accent /><Metric value={item.tests ? `${item.accuracy}%` : "—"} label="Точность" /><Metric value={item.tests} label="Тесты" /></div>
        </div>;
      })}</div>
    </section>

    <section id="attempts" className="mt-8 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Все попытки</h2><p className="mt-1 text-xs text-nova-muted">Загружается по {ATTEMPTS_PER_PAGE} записей. Для рейтинга нужна точность не ниже 70%.</p></div>
        <div className="text-xs text-nova-muted">Показано {shownFrom}–{shownTo} из {attemptsCount}</div>
      </div>
      <div className="data-card overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4">Дата</th><th className="p-4">Язык</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">Точность</th><th className="p-4 text-right">Время</th><th className="p-4 text-right">Статус</th><th className="p-4 text-right">Действие супер-администратора</th></tr></thead>
          <tbody className="divide-y divide-white/5">{attempts.map((test) => <tr key={test.id} className="hover:bg-white/[0.025]"><td className="p-4 text-nova-muted">{formatDate(test.createdAt)}</td><td className="p-4 font-semibold uppercase text-nova-text">{test.language}</td><td className="p-4 text-right font-semibold text-nova-accent">{test.wpm}</td><td className="p-4 text-right text-nova-muted">{test.accuracy.toFixed(0)}%</td><td className="p-4 text-right text-nova-muted">{test.duration} сек.</td><td className="p-4 text-right"><ResultStatus isRanked={test.isRanked} reviewStatus={test.reviewStatus} accuracy={test.accuracy} /></td><td className="p-4"><ResultModerationControls resultId={test.id} isRanked={test.isRanked} reviewStatus={test.reviewStatus} wpm={test.wpm} accuracy={test.accuracy} /></td></tr>)}{attempts.length === 0 && <tr><td colSpan={7} className="p-16 text-center"><CircleUserRound className="mx-auto text-nova-muted" size={24} /><div className="mt-3 text-sm text-nova-muted">У ученика пока нет попыток.</div></td></tr>}</tbody>
        </table>
      </div>
      {totalPages > 1 && <nav aria-label="Страницы попыток" className="mt-4 flex items-center justify-end gap-2">
        {attemptsPage > 1 ? <Link href={`?attemptsPage=${attemptsPage - 1}#attempts`} className="nova-button-secondary"><ChevronLeft size={15} /> Назад</Link> : <span className="nova-button-secondary cursor-not-allowed opacity-40"><ChevronLeft size={15} /> Назад</span>}
        <span className="px-3 text-xs text-nova-muted">Страница <b className="text-nova-text">{attemptsPage}</b> из {totalPages}</span>
        {attemptsPage < totalPages ? <Link href={`?attemptsPage=${attemptsPage + 1}#attempts`} className="nova-button-secondary">Дальше <ChevronRight size={15} /></Link> : <span className="nova-button-secondary cursor-not-allowed opacity-40">Дальше <ChevronRight size={15} /></span>}
      </nav>}
    </section>
  </div>;
}

function positivePage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;
}

function aggregateStats(value: { _avg?: { wpm?: number | null; accuracy?: number | null }; _max?: { wpm?: number | null }; _count?: { _all?: number } }) {
  return {
    tests: value._count?._all ?? 0,
    averageWpm: Math.round(value._avg?.wpm ?? 0),
    bestWpm: value._max?.wpm ?? 0,
    accuracy: Math.round(value._avg?.accuracy ?? 0),
  };
}

function position(list: StudentRanking[], userId: string) {
  const index = list.findIndex((item) => item.userId === userId);
  return index < 0 ? 0 : index + 1;
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

function ResultStatus({ isRanked, reviewStatus, accuracy }: { isRanked: boolean; reviewStatus: string | null; accuracy: number }) {
  if (isRanked) return <span className="text-emerald-400">В рейтинге</span>;
  if (accuracy < 70) return <span className="text-amber-300">Ниже 70%</span>;
  if (reviewStatus === "rejected") return <span className="text-nova-error">Аннулирован</span>;
  return <span className="text-amber-300">На проверке</span>;
}
