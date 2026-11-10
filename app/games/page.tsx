import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Crosshair, Gamepad2, Medal, Shield, Sparkles, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { getDefenseLeaderboard } from "@/lib/defense-leaderboard";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ language?: string; difficulty?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const [query, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");

  const language: DefenseLanguage = query.language === "ru" ? "ru" : "en";
  const difficulty: DefenseDifficulty = query.difficulty === "medium" || query.difficulty === "hard" ? query.difficulty : "easy";
  const [leaders, totalMissions, players] = await Promise.all([
    getDefenseLeaderboard(language, difficulty),
    prisma.gameResult.count({ where: { game: "defense" } }),
    prisma.gameResult.groupBy({ by: ["userId"], where: { game: "defense" } }),
  ]);

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell !max-w-[86rem]">
    <section className="relative overflow-hidden rounded-[2rem] border border-nova-accent/15 bg-[#101416] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[url('/games/nova-defense-arena.webp')] bg-cover bg-center opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080b0d]/96 via-[#080b0d]/72 to-[#080b0d]/15" />
      <div className="relative max-w-2xl px-7 py-14 sm:px-12 sm:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-nova-accent/25 bg-nova-accent/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-nova-accent"><Sparkles size={12} /> Beta · игровая лаборатория</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">NOVA Defense</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Защитите энергетическое ядро: находите цели, печатайте без ошибок и удерживайте периметр как можно дольше.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/70"><Feature icon={<Crosshair size={13} />} text="Захват слов" /><Feature icon={<Zap size={13} />} text="Комбо и ускорение" /><Feature icon={<Shield size={13} />} text="Отдельный рейтинг" /></div>
        <Link href={`/games/defense?language=${language}&difficulty=${difficulty}`} className="nova-button mt-9 !min-h-12 !rounded-xl !px-6"><Gamepad2 size={17} /> Начать миссию</Link>
      </div>
    </section>

    <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="data-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="page-eyebrow">Рейтинг игры</p><h2 className="mt-1 text-xl font-semibold">Лучшие защитники</h2></div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-1.5">
            {(["en", "ru"] as DefenseLanguage[]).map((item) => <Filter key={item} active={language === item} href={gameFilterHref(item, difficulty)}>{item.toUpperCase()}</Filter>)}
            <span className="mx-1 w-px bg-white/8" />
            {(["easy", "medium", "hard"] as DefenseDifficulty[]).map((item) => <Filter key={item} active={difficulty === item} href={gameFilterHref(language, item)}>{item}</Filter>)}
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4 text-center">Место</th><th className="p-4">Ученик</th><th className="p-4">Класс</th><th className="p-4 text-right">Очки</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">Точность</th></tr></thead><tbody className="divide-y divide-white/5">{leaders.map((item, index) => <tr key={item.id}><td className="p-4 text-center"><span className={index < 3 ? "inline-grid h-7 w-7 place-items-center rounded-full bg-nova-accent/10 font-semibold text-nova-accent" : "text-nova-muted"}>{index + 1}</span></td><td className="p-4 font-medium">{item.user.firstName} {item.user.lastName}</td><td className="p-4 text-nova-muted">{item.user.class?.name ?? "—"}</td><td className="p-4 text-right font-semibold text-nova-accent">{item.score.toLocaleString("ru-RU")}</td><td className="p-4 text-right">{item.wpm}</td><td className="p-4 text-right text-nova-muted">{item.accuracy.toFixed(0)}%</td></tr>)}{leaders.length === 0 && <tr><td colSpan={6} className="p-14 text-center text-nova-muted">В этом режиме пока нет результатов. Станьте первым защитником.</td></tr>}</tbody></table></div>
      </div>
      <aside className="space-y-4"><div className="data-card p-6"><Medal className="text-nova-accent" size={22} /><div className="mt-5 text-4xl font-semibold">{totalMissions}</div><div className="mt-1 text-xs text-nova-muted">завершённых миссий</div><div className="mt-5 border-t border-white/[0.06] pt-5"><div className="text-2xl font-semibold text-nova-accent">{players.length}</div><div className="text-xs text-nova-muted">игроков beta</div></div></div><div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] p-5 text-xs leading-6 text-cyan-100/65"><b className="text-cyan-200">Важно:</b> игровые очки хранятся отдельно и не меняют обычный школьный рейтинг WPM.</div></aside>
    </section>
  </main></div>;
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) { return <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-sm">{icon}{text}</span>; }
function Filter({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) { return <Link href={href} className={active ? "test-option test-option-active capitalize" : "test-option capitalize"}>{children}</Link>; }
function gameFilterHref(language: DefenseLanguage, difficulty: DefenseDifficulty) { return `/games?language=${language}&difficulty=${difficulty}`; }
