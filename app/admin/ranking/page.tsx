import Link from "next/link";
import { BarChart3, Medal, School, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getStudentRankings, normalizeLanguage, type LanguageFilter, type StudentRanking } from "@/lib/leaderboard";
import { requireSuperAdminPage } from "@/lib/admin";

interface RankingPageProps {
  searchParams: Promise<{ classId?: string; language?: string }>;
}

const languages: Array<{ value: LanguageFilter; label: string; shortLabel: string }> = [
  { value: "all", label: "Общий рейтинг", shortLabel: "ALL" },
  { value: "ru", label: "Русский", shortLabel: "RU" },
  { value: "en", label: "English", shortLabel: "EN" },
];

export default async function AdminRankingPage({ searchParams }: RankingPageProps) {
  await requireSuperAdminPage();
  const [filters, classes] = await Promise.all([
    searchParams,
    prisma.class.findMany({
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      select: { id: true, name: true, _count: { select: { students: { where: { role: "STUDENT", isActive: true } } } } },
    }),
  ]);
  const language = normalizeLanguage(filters.language);
  const selectedClass = classes.find((item) => item.id === filters.classId);
  const results = await getStudentRankings("all", selectedClass?.id, language);
  const testsCount = results.reduce((sum, item) => sum + item.testsCount, 0);
  const averageWpm = average(results.map((item) => item.averageWpm));
  const averageAccuracy = average(results.map((item) => item.averageAccuracy));
  const totalStudents = selectedClass
    ? selectedClass._count.students
    : classes.reduce((sum, item) => sum + item._count.students, 0);
  const activeLanguage = languages.find((item) => item.value === language) ?? languages[0];

  return <div>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="page-eyebrow">Успеваемость школы</p><h1 className="page-title">Рейтинг учеников</h1><p className="page-subtitle">Вся школа или отдельный класс — общий рейтинг, русский и английский язык.</p></div>
      <div className="nova-badge w-fit"><Medal size={13} /> Место по лучшей скорости ученика</div>
    </div>

    <section className="data-card mt-8 overflow-hidden">
      <div className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-nova-text"><School size={16} className="text-nova-accent" /> Выберите школу или класс</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterLink href={rankingHref(undefined, language)} active={!selectedClass}>Вся школа</FilterLink>
          {classes.map((schoolClass) => <FilterLink key={schoolClass.id} href={rankingHref(schoolClass.id, language)} active={selectedClass?.id === schoolClass.id}>{schoolClass.name}</FilterLink>)}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-nova-text"><BarChart3 size={16} className="text-nova-accent" /> Выберите язык рейтинга</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {languages.map((item) => <Link key={item.value} href={rankingHref(selectedClass?.id, item.value)} className={item.value === language ? "rounded-xl border border-nova-accent/30 bg-nova-accent/10 p-4 text-nova-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-nova-muted transition hover:border-white/[0.12] hover:text-nova-text"}><div className="text-[10px] font-semibold tracking-[0.16em]">{item.shortLabel}</div><div className="mt-1 text-sm font-semibold">{item.label}</div></Link>)}
        </div>
      </div>
    </section>

    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat value={totalStudents} label="Всего учеников" />
      <Stat value={testsCount} label="Тестов в рейтинге" />
      <Stat value={averageWpm || "—"} label="Средняя скорость · WPM" accent />
      <Stat value={results.length ? `${averageAccuracy}%` : "—"} label="Средняя точность" />
    </div>

    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-xl font-semibold">{selectedClass?.name ?? "Вся школа"} · {activeLanguage.label}</h2><p className="mt-1 text-xs text-nova-muted">Участников с результатами: {results.length} из {totalStudents}</p></div>
        <div className="text-xs text-nova-muted">Место определяется по лучшей скорости, затем по точности и средней WPM.</div>
      </div>
      <RankingTable results={results} showClass={!selectedClass} />
    </section>
  </div>;
}

function rankingHref(classId: string | undefined, language: LanguageFilter) {
  const params = new URLSearchParams();
  if (classId) params.set("classId", classId);
  if (language !== "all") params.set("language", language);
  const query = params.toString();
  return `/admin/ranking${query ? `?${query}` : ""}`;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={active ? "rounded-xl border border-nova-accent/30 bg-nova-accent/10 px-4 py-2.5 text-xs font-semibold text-nova-accent" : "rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-2.5 text-xs font-medium text-nova-muted transition hover:border-white/[0.12] hover:text-nova-text"}>{children}</Link>;
}

function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return <div className="data-card p-5"><div className={accent ? "text-3xl font-semibold text-nova-accent" : "text-3xl font-semibold text-nova-text"}>{value}</div><div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-nova-muted">{label}</div></div>;
}

function RankingTable({ results, showClass }: { results: StudentRanking[]; showClass: boolean }) {
  return <div className="data-card overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="px-5 py-4 text-center">Место</th><th className="px-5 py-4">Ученик</th>{showClass && <th className="px-5 py-4">Класс</th>}<th className="px-5 py-4 text-right">Лучшая WPM</th><th className="px-5 py-4 text-right">Средняя WPM</th><th className="px-5 py-4 text-right">Точность</th><th className="px-5 py-4 text-right">Тесты</th><th className="px-5 py-4 text-right">Профиль</th></tr></thead><tbody className="divide-y divide-white/5">{results.map((result, index) => <tr key={result.userId} className="transition hover:bg-white/[0.025]"><td className="px-5 py-4 text-center"><span className={index < 3 ? "inline-grid h-7 w-7 place-items-center rounded-full border border-nova-accent/20 bg-nova-accent/10 text-xs font-bold text-nova-accent" : "text-nova-muted"}>{index + 1}</span></td><td className="px-5 py-4"><div className="font-medium text-nova-text">{result.user.firstName} {result.user.lastName}</div><div className="mt-1 font-mono text-[10px] text-nova-muted">{result.user.username}</div></td>{showClass && <td className="px-5 py-4 text-nova-muted">{result.user.class?.name ?? "—"}</td>}<td className="px-5 py-4 text-right text-base font-semibold text-nova-accent">{result.bestWpm}</td><td className="px-5 py-4 text-right font-medium text-nova-text">{result.averageWpm}</td><td className="px-5 py-4 text-right text-nova-muted">{result.averageAccuracy.toFixed(0)}%</td><td className="px-5 py-4 text-right text-nova-muted">{result.testsCount}</td><td className="px-5 py-4 text-right"><Link href={`/admin/students/${result.userId}`} className="inline-flex rounded-lg border border-nova-accent/20 bg-nova-accent/[0.06] px-3 py-2 text-[11px] font-semibold text-nova-accent transition hover:border-nova-accent/40 hover:bg-nova-accent/10">Информация</Link></td></tr>)}{results.length === 0 && <tr><td colSpan={showClass ? 8 : 7} className="px-6 py-20 text-center"><Users className="mx-auto text-nova-muted" size={24} /><div className="mt-3 font-medium text-nova-text">Пока нет результатов</div><div className="mt-1 text-xs text-nova-muted">Рейтинг заполнится автоматически после первых тестов.</div></td></tr>}</tbody></table></div>;
}
