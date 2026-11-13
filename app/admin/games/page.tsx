import Link from "next/link";
import { format } from "date-fns";
import { Coins, Crosshair, Gamepad2, ShieldCheck, Skull, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireSuperAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { moderateGameResult } from "./actions";

const PAGE_SIZE = 40;
const statuses = [
  { value: "all", label: "Все" },
  { value: "ranked", label: "В рейтинге" },
  { value: "annulled", label: "Аннулированы" },
  { value: "training", label: "Тренировочные" },
] as const;
const languages = [
  { value: "all", label: "Все языки" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
] as const;
const difficulties = [
  { value: "all", label: "Все сложности" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

interface GamesAdminPageProps {
  searchParams: Promise<{
    status?: string;
    language?: string;
    difficulty?: string;
    classId?: string;
    scope?: string;
    page?: string;
  }>;
}

export default async function GamesAdminPage({ searchParams }: GamesAdminPageProps) {
  await requireSuperAdminPage();
  const raw = await searchParams;
  const status = statuses.some((item) => item.value === raw.status) ? raw.status! : "all";
  const language = languages.some((item) => item.value === raw.language) ? raw.language! : "all";
  const difficulty = difficulties.some((item) => item.value === raw.difficulty) ? raw.difficulty! : "all";
  const scope = raw.scope === "admins" ? "admins" : "students";
  const requestedPage = Math.max(1, Math.min(10_000, Number.parseInt(raw.page ?? "1", 10) || 1));

  const classes = await prisma.class.findMany({
    orderBy: [{ grade: "asc" }, { section: "asc" }],
    select: { id: true, name: true },
  });
  const classId = scope === "students" && classes.some((item) => item.id === raw.classId) ? raw.classId : undefined;
  const where = gameResultWhere({ status, language, difficulty, classId, scope });

  const [totalResults, rankedResults, annulledResults, rankedSummary, playerGroups, filteredCount] = await Promise.all([
    prisma.gameResult.count({ where: { game: "defense", user: { role: "STUDENT" } } }),
    prisma.gameResult.count({ where: { game: "defense", isRanked: true, user: { role: "STUDENT" } } }),
    prisma.gameResult.count({ where: { game: "defense", moderationStatus: "annulled", user: { role: "STUDENT" } } }),
    prisma.gameResult.aggregate({
      where: { game: "defense", isRanked: true, user: { role: "STUDENT" } },
      _sum: { bossesDestroyed: true, rewardCredits: true },
    }),
    prisma.gameResult.groupBy({ by: ["userId"], where: { game: "defense", user: { role: "STUDENT" } } }),
    prisma.gameResult.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const results = await prisma.gameResult.findMany({
    where,
    include: { user: { include: { class: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const current = { status, language, difficulty, classId, scope };
  const stats = [
    { label: "Всего миссий", value: totalResults, icon: Gamepad2 },
    { label: "Игроки", value: playerGroups.length, icon: Users },
    { label: "В рейтинге", value: rankedResults, icon: ShieldCheck },
    { label: "Аннулированы", value: annulledResults, icon: Skull },
    { label: "Побеждено боссов", value: rankedSummary._sum.bossesDestroyed ?? 0, icon: Crosshair },
    { label: "Выдано кредитов", value: rankedSummary._sum.rewardCredits ?? 0, icon: Coins },
  ];

  return <div>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="page-eyebrow">Игровой центр</p><h1 className="page-title">NOVA Defense</h1><p className="page-subtitle">Статистика миссий и управление игровыми результатами без удаления истории.</p></div>
      <Link href="/games/defense" className="nova-button-secondary w-fit"><Gamepad2 size={15} /> Открыть игру</Link>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((item) => <div key={item.label} className="data-card p-5"><item.icon size={16} className="text-nova-accent" /><div className="mt-3 text-2xl font-semibold text-nova-text">{item.value.toLocaleString("ru-RU")}</div><div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-nova-muted">{item.label}</div></div>)}
    </div>

    <section className="data-card mt-7 p-5 sm:p-6">
      <FilterGroup title="Чьи результаты">
        <FilterLink href={gamesHref(current, { scope: "students", classId: undefined })} active={scope === "students"}>Ученики</FilterLink>
        <FilterLink href={gamesHref(current, { scope: "admins", classId: undefined, status: "all" })} active={scope === "admins"}>Администраторы</FilterLink>
      </FilterGroup>
      <FilterGroup title="Статус">
        {statuses.map((item) => <FilterLink key={item.value} href={gamesHref(current, { status: item.value })} active={status === item.value}>{item.label}</FilterLink>)}
      </FilterGroup>
      <FilterGroup title="Язык">
        {languages.map((item) => <FilterLink key={item.value} href={gamesHref(current, { language: item.value })} active={language === item.value}>{item.label}</FilterLink>)}
      </FilterGroup>
      <FilterGroup title="Сложность">
        {difficulties.map((item) => <FilterLink key={item.value} href={gamesHref(current, { difficulty: item.value })} active={difficulty === item.value}>{item.label}</FilterLink>)}
      </FilterGroup>
      {scope === "students" && <FilterGroup title="Класс" last>
        <FilterLink href={gamesHref(current, { classId: undefined })} active={!classId}>Вся школа</FilterLink>
        {classes.map((item) => <FilterLink key={item.id} href={gamesHref(current, { classId: item.id })} active={classId === item.id}>{item.name}</FilterLink>)}
      </FilterGroup>}
    </section>

    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Последние результаты</h2><p className="mt-1 text-xs text-nova-muted">Найдено: {filteredCount.toLocaleString("ru-RU")}. На странице показывается не более {PAGE_SIZE} записей.</p></div><div className="text-xs text-nova-muted">Аннулирование убирает миссию из рейтинга, наград и достижений, но сохраняет её в истории.</div></div>
      <div className="data-card overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4">Дата</th><th className="p-4">Игрок</th><th className="p-4">Режим</th><th className="p-4 text-right">Очки</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">Точность</th><th className="p-4 text-right">Цели</th><th className="p-4 text-right">Боссы</th><th className="p-4">Статус</th><th className="p-4 text-right">Действие</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {results.map((result) => <tr key={result.id} className="align-middle transition hover:bg-white/[0.02]">
              <td className="whitespace-nowrap p-4 text-xs text-nova-muted">{format(result.createdAt, "dd.MM.yyyy · HH:mm")}</td>
              <td className="p-4"><div className="font-medium text-nova-text">{result.user.firstName} {result.user.lastName}</div><div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-nova-muted"><span>{result.user.username}</span><span>·</span><span>{result.user.class?.name ?? (result.user.role === "SUPER_ADMIN" ? "Админ" : "—")}</span></div></td>
              <td className="p-4"><span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[10px] font-semibold uppercase text-nova-muted">{result.language} · {result.difficulty}</span></td>
              <td className="p-4 text-right font-semibold text-nova-accent">{result.score.toLocaleString("ru-RU")}</td>
              <td className="p-4 text-right font-medium">{result.wpm}</td>
              <td className="p-4 text-right text-nova-muted">{result.accuracy.toFixed(0)}%</td>
              <td className="p-4 text-right text-nova-muted">{result.destroyed}</td>
              <td className="p-4 text-right text-red-200">{result.bossesDestroyed}</td>
              <td className="p-4"><ResultStatus result={result} /></td>
              <td className="p-4 text-right"><ResultAction result={result} /></td>
            </tr>)}
            {results.length === 0 && <tr><td colSpan={10} className="p-20 text-center"><Gamepad2 className="mx-auto text-nova-muted" size={25} /><div className="mt-3 font-medium text-nova-text">Результатов нет</div><div className="mt-1 text-xs text-nova-muted">Измените фильтры или дождитесь новых миссий.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    {totalPages > 1 && <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Страницы результатов">
      {page > 1 && <Link className="nova-button-secondary" href={gamesHref(current, { page: page - 1 })}>← Назад</Link>}
      <span className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-2.5 text-xs text-nova-muted">Страница {page} из {totalPages}</span>
      {page < totalPages && <Link className="nova-button-secondary" href={gamesHref(current, { page: page + 1 })}>Дальше →</Link>}
    </nav>}
  </div>;
}

function gameResultWhere(filters: { status: string; language: string; difficulty: string; classId?: string; scope: string }): Prisma.GameResultWhereInput {
  const where: Prisma.GameResultWhereInput = {
    game: "defense",
    user: {
      role: filters.scope === "admins" ? "SUPER_ADMIN" : "STUDENT",
      ...(filters.classId ? { classId: filters.classId } : {}),
    },
  };
  if (filters.language !== "all") where.language = filters.language;
  if (filters.difficulty !== "all") where.difficulty = filters.difficulty;
  if (filters.status === "ranked") where.isRanked = true;
  if (filters.status === "annulled") where.moderationStatus = "annulled";
  if (filters.status === "training") {
    where.isRanked = false;
    where.OR = [{ moderationStatus: null }, { moderationStatus: { not: "annulled" } }];
  }
  return where;
}

function ResultStatus({ result }: { result: { isRanked: boolean; moderationStatus: string | null; moderationReason: string | null; user: { role: string } } }) {
  if (result.moderationStatus === "annulled") return <div><span className="inline-flex rounded-full border border-red-400/20 bg-red-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-red-300">Аннулирован</span>{result.moderationReason && <div className="mt-1 max-w-48 text-[9px] leading-4 text-nova-muted">{result.moderationReason}</div>}</div>;
  if (result.isRanked) return <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">В рейтинге</span>;
  if (result.user.role === "SUPER_ADMIN") return <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-sky-300">Админ-тест</span>;
  return <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-nova-muted">Тренировка</span>;
}

function ResultAction({ result }: { result: { id: string; isRanked: boolean; moderationStatus: string | null; user: { role: string } } }) {
  if (result.user.role !== "STUDENT") return <span className="text-xs text-nova-muted">—</span>;
  if (result.moderationStatus === "annulled") return <form action={moderateGameResult}><input type="hidden" name="id" value={result.id} /><input type="hidden" name="decision" value="restore" /><input type="hidden" name="reason" value="manual_review" /><button className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-3 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.12]">Вернуть</button></form>;
  if (!result.isRanked) return <span className="text-xs text-nova-muted">—</span>;
  return <form action={moderateGameResult} className="flex items-center justify-end gap-2"><select name="reason" aria-label="Причина аннулирования" className="h-9 rounded-lg border border-white/[0.08] bg-[#111415] px-2 text-[10px] text-nova-muted outline-none focus:border-red-400/30"><option value="suspicious_result">Подозрительный</option><option value="technical_error">Техническая ошибка</option><option value="rules_violation">Нарушение правил</option><option value="manual_review">Ручная проверка</option></select><input type="hidden" name="id" value={result.id} /><input type="hidden" name="decision" value="annul" /><button className="inline-flex h-9 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.07] px-3 text-[10px] font-semibold text-red-300 transition hover:bg-red-400/[0.12]">Аннулировать</button></form>;
}

function FilterGroup({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return <div className={last ? "pt-5" : "border-b border-white/[0.05] pb-5 pt-5 first:pt-0"}><div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-nova-muted">{title}</div><div className="flex flex-wrap gap-2">{children}</div></div>;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={active ? "rounded-lg border border-nova-accent/30 bg-nova-accent/10 px-3 py-2 text-[11px] font-semibold text-nova-accent" : "rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-nova-muted transition hover:border-white/[0.12] hover:text-nova-text"}>{children}</Link>;
}

function gamesHref(current: { status: string; language: string; difficulty: string; classId?: string; scope: string }, changes: Partial<{ status: string; language: string; difficulty: string; classId: string | undefined; scope: string; page: number }>) {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  if (next.scope === "admins") params.set("scope", "admins");
  if (next.status !== "all") params.set("status", next.status);
  if (next.language !== "all") params.set("language", next.language);
  if (next.difficulty !== "all") params.set("difficulty", next.difficulty);
  if (next.classId && next.scope !== "admins") params.set("classId", next.classId);
  if (changes.page && changes.page > 1) params.set("page", String(changes.page));
  const query = params.toString();
  return `/admin/games${query ? `?${query}` : ""}`;
}
