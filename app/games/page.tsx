import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, Check, Coins, Crosshair, Crown, Gamepad2, LockKeyhole, Medal, Shield, Sparkles, Star, Target, Trophy, Users, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { getDefenseRankings } from "@/lib/defense-leaderboard";
import { getDefensePlayerProgress, type DefenseAchievement } from "@/lib/defense-progress";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

type RankingView = "students" | "classes";

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ language?: string; difficulty?: string; view?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [query, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");

  const language: DefenseLanguage = query.language === "ru" ? "ru" : "en";
  const difficulty: DefenseDifficulty = query.difficulty === "medium" || query.difficulty === "hard" ? query.difficulty : "easy";
  const view: RankingView = query.view === "classes" ? "classes" : "students";
  const isAdmin = user.role === "SUPER_ADMIN";
  const [rankings, progress, totalMissions, players] = await Promise.all([
    getDefenseRankings(language, difficulty),
    getDefensePlayerProgress(session.user.id, isAdmin),
    prisma.gameResult.count({ where: { game: "defense", user: { role: "STUDENT", isActive: true, archivedAt: null } } }),
    prisma.gameResult.groupBy({ by: ["userId"], where: { game: "defense", user: { role: "STUDENT", isActive: true, archivedAt: null } } }),
  ]);

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell !max-w-[86rem]">
    <section className="relative overflow-hidden rounded-[2rem] border border-nova-accent/15 bg-[#101416] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[url('/games/nova-defense-arena.webp')] bg-cover bg-center opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080b0d]/96 via-[#080b0d]/72 to-[#080b0d]/15" />
      <div className="absolute bottom-8 right-8 top-8 hidden w-[23rem] grid-cols-1 gap-2 xl:grid">
        <ArenaPreview image="/games/nova-defense-arena.webp" title="NOVA Prime" subtitle="Золотое ядро" />
        <ArenaPreview image="/games/nova-defense-cyber-city.webp" title="Neon City" subtitle="Ночной мегаполис" />
        <ArenaPreview image="/games/nova-defense-ice-citadel.webp" title="Ice Citadel" subtitle="Ледяное сияние" />
      </div>
      <div className="relative max-w-2xl px-7 py-14 sm:px-12 sm:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-nova-accent/25 bg-nova-accent/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-nova-accent"><Sparkles size={12} /> Beta 1.5 · игровая лаборатория</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">NOVA Defense</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Защитите энергетическое ядро, побеждайте командиров и открывайте достижения вместе со своим классом.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/70"><Feature icon={<Crosshair size={13} />} text="Захват слов" /><Feature icon={<Zap size={13} />} text="Комбо и бонусы" /><Feature icon={<Users size={13} />} text="Командный рейтинг" /></div>
        <div className="mt-9 flex flex-wrap items-center gap-3"><Link href={`/games/defense?language=${language}&difficulty=${difficulty}`} className="nova-button !min-h-12 !rounded-xl !px-6"><Gamepad2 size={17} /> Начать миссию</Link><span className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-nova-accent/20 bg-black/35 px-4 text-sm font-semibold text-nova-accent backdrop-blur-md"><Coins size={17} /> {progress.credits.toLocaleString("ru-RU")} Credits</span></div>
      </div>
    </section>

    <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="data-card overflow-hidden">
        <div className="border-b border-white/[0.06] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div><p className="page-eyebrow">Рейтинг игры</p><h2 className="mt-1 text-xl font-semibold">{view === "classes" ? "Командный рейтинг классов" : "Лучшие защитники"}</h2></div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-1.5">
              <Filter active={view === "students"} href={gameFilterHref(language, difficulty, "students")}><Trophy size={12} /> Ученики</Filter>
              <Filter active={view === "classes"} href={gameFilterHref(language, difficulty, "classes")}><Users size={12} /> Классы</Filter>
              <span className="mx-1 w-px bg-white/8" />
              {(["en", "ru"] as DefenseLanguage[]).map((item) => <Filter key={item} active={language === item} href={gameFilterHref(item, difficulty, view)}>{item.toUpperCase()}</Filter>)}
              <span className="mx-1 w-px bg-white/8" />
              {(["easy", "medium", "hard"] as DefenseDifficulty[]).map((item) => <Filter key={item} active={difficulty === item} href={gameFilterHref(language, item, view)}>{item}</Filter>)}
            </div>
          </div>
          {view === "classes" && <p className="mt-3 max-w-3xl text-xs leading-5 text-nova-muted">Считается средний балл пяти лучших учеников класса. Для официального места нужны результаты минимум трёх учеников.</p>}
        </div>

        {view === "students" ? <StudentRanking rankings={rankings.students} /> : <ClassRanking rankings={rankings.classes} />}
      </div>

      <aside className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-nova-accent/20 bg-[linear-gradient(145deg,rgba(227,182,75,0.1),rgba(255,255,255,0.025))] p-6">
          <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-nova-accent/[0.07] blur-2xl" />
          <div className="relative"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl border border-nova-accent/20 bg-nova-accent/10 text-nova-accent"><Coins size={20} /></span><span className="nova-badge">{isAdmin ? "Админ-прогресс" : "Кошелёк"}</span></div><div className="mt-5 text-4xl font-semibold text-nova-accent">{progress.credits.toLocaleString("ru-RU")}</div><div className="mt-1 text-xs font-semibold">NOVA Credits</div><div className="mt-4 text-[10px] leading-5 text-nova-muted">{isAdmin ? "Начисляются за личные миссии администратора и не влияют на рейтинг учеников." : "Начисляются только за подтверждённые рейтинговые миссии."}</div></div>
        </div>
        <div className="data-card p-6"><Award className="text-cyan-200" size={22} /><div className="mt-5 flex items-end gap-2"><div className="text-4xl font-semibold">{progress.unlockedAchievements}</div><div className="pb-1 text-xs text-nova-muted">из {progress.achievements.length}</div></div><div className="mt-1 text-xs text-nova-muted">достижений открыто</div><div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-5"><SmallStat value={progress.missions} label="миссий" /><SmallStat value={progress.bosses} label="боссов" /></div></div>
        <div className="data-card p-6"><Medal className="text-nova-accent" size={22} /><div className="mt-5 text-3xl font-semibold">{totalMissions}</div><div className="mt-1 text-xs text-nova-muted">миссий школы</div><div className="mt-5 border-t border-white/[0.06] pt-5"><div className="text-2xl font-semibold text-nova-accent">{players.length}</div><div className="text-xs text-nova-muted">игроков beta</div></div></div>
      </aside>
    </section>

    <section className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="page-eyebrow">Личный прогресс</p><h2 className="mt-1 text-2xl font-semibold">{isAdmin ? "Достижения администратора" : "Достижения защитника"}</h2></div><div className="text-xs text-nova-muted">Открыто {progress.unlockedAchievements} из {progress.achievements.length}</div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{progress.achievements.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} />)}</div>
    </section>

    <div className="mt-8 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] p-5 text-xs leading-6 text-cyan-100/65"><b className="text-cyan-200">Важно:</b> {isAdmin ? "очки, кредиты и достижения администратора сохраняются в его личном прогрессе, но не участвуют в рейтингах учеников и классов." : "игровые очки, кредиты и достижения хранятся отдельно и не меняют обычный школьный рейтинг WPM."}</div>
  </main></div>;
}

function StudentRanking({ rankings }: { rankings: Awaited<ReturnType<typeof getDefenseRankings>>["students"] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4 text-center">Место</th><th className="p-4">Ученик</th><th className="p-4">Класс</th><th className="p-4 text-right">Очки</th><th className="p-4 text-right">Боссы</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">Точность</th></tr></thead><tbody className="divide-y divide-white/5">{rankings.map((item, index) => <tr key={item.id}><td className="p-4 text-center"><Place value={index + 1} /></td><td className="p-4 font-medium">{item.user.firstName} {item.user.lastName}</td><td className="p-4 text-nova-muted">{item.user.class?.name ?? "—"}</td><td className="p-4 text-right font-semibold text-nova-accent">{item.score.toLocaleString("ru-RU")}</td><td className="p-4 text-right text-red-200">{item.bossesDestroyed}</td><td className="p-4 text-right">{item.wpm}</td><td className="p-4 text-right text-nova-muted">{item.accuracy.toFixed(0)}%</td></tr>)}{rankings.length === 0 && <tr><td colSpan={7} className="p-14 text-center text-nova-muted">В этом режиме пока нет рейтинговых результатов.</td></tr>}</tbody></table></div>;
}

function ClassRanking({ rankings }: { rankings: Awaited<ReturnType<typeof getDefenseRankings>>["classes"] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4 text-center">Место</th><th className="p-4">Класс</th><th className="p-4 text-right">Командный балл</th><th className="p-4 text-right">Участники</th><th className="p-4 text-right">Боссы</th><th className="p-4 text-right">Средний WPM</th><th className="p-4 text-right">Точность</th></tr></thead><tbody className="divide-y divide-white/5">{rankings.map((item, index) => { const officialPlace = rankings.slice(0, index + 1).filter((entry) => entry.isQualified).length; return <tr key={item.classId} className={item.isQualified ? "" : "opacity-55"}><td className="p-4 text-center">{item.isQualified ? <Place value={officialPlace} /> : <span className="text-xs text-nova-muted">ожидание</span>}</td><td className="p-4"><div className="font-semibold">{item.className}</div><div className="mt-1 text-[9px] text-nova-muted">{item.isQualified ? "официальный результат" : `нужно ещё ${Math.max(0, 3 - item.players)} участ.`}</div></td><td className="p-4 text-right font-semibold text-nova-accent">{item.score.toLocaleString("ru-RU")}</td><td className="p-4 text-right">{item.players}</td><td className="p-4 text-right text-red-200">{item.bossesDestroyed}</td><td className="p-4 text-right">{item.averageWpm}</td><td className="p-4 text-right text-nova-muted">{item.averageAccuracy.toFixed(0)}%</td></tr>; })}{rankings.length === 0 && <tr><td colSpan={7} className="p-14 text-center text-nova-muted">Классы появятся здесь после первых рейтинговых миссий учеников.</td></tr>}</tbody></table></div>;
}

function AchievementCard({ achievement }: { achievement: DefenseAchievement }) {
  const progress = Math.min(100, achievement.current / achievement.target * 100);
  return <article className={achievement.unlocked ? "relative overflow-hidden rounded-2xl border border-nova-accent/20 bg-nova-accent/[0.045] p-5" : "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5"}>
    {achievement.unlocked && <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-nova-accent/10 blur-2xl" />}
    <div className="relative flex items-start justify-between gap-3"><span className={achievement.unlocked ? "grid h-10 w-10 place-items-center rounded-xl border border-nova-accent/20 bg-nova-accent/10 text-nova-accent" : "grid h-10 w-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/28"}><AchievementIcon id={achievement.id} /></span><span className={achievement.unlocked ? "inline-flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300" : "inline-flex items-center gap-1 rounded-full border border-white/[0.06] px-2 py-1 text-[8px] uppercase tracking-wider text-white/28"}>{achievement.unlocked ? <><Check size={10} /> Открыто</> : <><LockKeyhole size={10} /> Закрыто</>}</span></div>
    <h3 className={achievement.unlocked ? "relative mt-4 font-semibold text-white" : "relative mt-4 font-semibold text-white/55"}>{achievement.title}</h3><p className="relative mt-1 min-h-10 text-[11px] leading-5 text-nova-muted">{achievement.description}</p>
    <div className="relative mt-4"><div className="flex items-center justify-between text-[9px] text-white/35"><span>Прогресс</span><span>{Math.min(achievement.current, achievement.target).toLocaleString("ru-RU")} / {achievement.target.toLocaleString("ru-RU")}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className={achievement.unlocked ? "h-full rounded-full bg-nova-accent" : "h-full rounded-full bg-cyan-300/35"} style={{ width: `${progress}%` }} /></div></div>
  </article>;
}

function AchievementIcon({ id }: { id: DefenseAchievement["id"] }) {
  if (id === "boss-hunter" || id === "commander-slayer") return <Crown size={19} />;
  if (id === "precision") return <Target size={19} />;
  if (id === "perfect-defense") return <Shield size={19} />;
  if (id === "combo-master") return <Zap size={19} />;
  if (id === "veteran") return <Medal size={19} />;
  if (id === "elite-score") return <Star size={19} />;
  return <Award size={19} />;
}

function Place({ value }: { value: number }) { return <span className={value <= 3 ? "inline-grid h-7 w-7 place-items-center rounded-full bg-nova-accent/10 font-semibold text-nova-accent" : "text-nova-muted"}>{value}</span>; }
function SmallStat({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3"><div className="font-semibold text-cyan-100">{value}</div><div className="mt-1 text-[9px] text-nova-muted">{label}</div></div>; }
function Feature({ icon, text }: { icon: React.ReactNode; text: string }) { return <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-sm">{icon}{text}</span>; }
function ArenaPreview({ image, title, subtitle }: { image: string; title: string; subtitle: string }) { return <div className="group relative overflow-hidden rounded-2xl border border-white/[0.1] shadow-xl"><div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${image})` }} /><div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" /><div className="relative flex h-full items-end p-4"><div><div className="text-xs font-semibold text-white/90">{title}</div><div className="mt-0.5 text-[9px] text-white/45">{subtitle}</div></div></div></div>; }
function Filter({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) { return <Link href={href} className={active ? "test-option test-option-active flex items-center gap-1 capitalize" : "test-option flex items-center gap-1 capitalize"}>{children}</Link>; }
function gameFilterHref(language: DefenseLanguage, difficulty: DefenseDifficulty, view: RankingView) { return `/games?language=${language}&difficulty=${difficulty}&view=${view}`; }
