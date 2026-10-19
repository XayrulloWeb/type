"use client";

import { useCallback, useEffect, useState } from "react";
import { Medal, Trophy, Users } from "lucide-react";
import { MINIMUM_RANKED_ACCURACY } from "@/lib/typing";

interface Entry { id: string; name: string; className: string; grade: number | null; wpm: number | null; accuracy: number | null; hasResult: boolean; attemptsCompleted: number[]; disqualified: boolean; }
interface Board { title: string; status: string; phase: string; attemptNumber: number | null; attemptStartedAt: string | null; attemptEndsAt: string | null; scheduledAt: string | null; durationSeconds: number; attemptLimit: number; eligibleCount: number; joinedCount: number; finishedCount: number; participants: Entry[]; }

export function ProjectorBoard({ olympiadId }: { olympiadId: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [now, setNow] = useState(0);
  const load = useCallback(async () => {
    const response = await fetch(`/api/olympiads/${olympiadId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { serverTime: string; olympiad: Board };
    setBoard(payload.olympiad);
    setServerOffset(new Date(payload.serverTime).getTime() - Date.now());
  }, [olympiadId]);

  useEffect(() => { const first = window.setTimeout(() => void load(), 0); const timer = window.setInterval(load, 1_000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  if (!board) return <div className="grid min-h-screen place-items-center bg-nova-bg text-nova-muted">Подключение к табло…</div>;

  const valid = board.participants.filter((item) => item.hasResult && (item.accuracy ?? 0) >= MINIMUM_RANKED_ACCURACY && !item.disqualified).sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0) || (b.accuracy ?? 0) - (a.accuracy ?? 0));
  const winners = [5, 6, 7].map((grade) => ({ grade, winner: valid.find((item) => item.grade === grade) }));
  const teams = [...valid.reduce((map, item) => { const team = map.get(item.className) ?? { name: item.className, count: 0, total: 0 }; team.count += 1; team.total += item.wpm ?? 0; map.set(item.className, team); return map; }, new Map<string, { name: string; count: number; total: number }>()).values()].map((team) => ({ ...team, average: Math.round(team.total / team.count) })).sort((a, b) => b.average - a.average);
  const target = board.phase === "COUNTDOWN" || board.phase === "BREAK" ? board.attemptStartedAt : board.attemptEndsAt;
  const remaining = target ? Math.max(0, Math.ceil((new Date(target).getTime() - (now + serverOffset)) / 1000)) : 0;
  const phaseLabel = board.phase === "COUNTDOWN" ? "до старта" : board.phase === "ATTEMPT_1" ? "попытка 1 из 2" : board.phase === "BREAK" ? "перерыв" : board.phase === "ATTEMPT_2" ? "попытка 2 из 2" : "завершено";

  return <main className="min-h-screen bg-nova-bg p-[3vw] text-nova-text">
    <header className="flex items-end justify-between border-b border-white/8 pb-6"><div><div className="text-sm font-bold tracking-[0.35em] text-nova-accent">NOVA TYPE · LIVE</div><h1 className="mt-3 text-[clamp(2rem,4vw,4rem)] font-semibold">{board.title}</h1></div><div className="text-right"><div className="font-mono text-[clamp(2rem,5vw,5rem)] font-semibold leading-none text-nova-accent">{board.status === "WAITING" ? `${board.joinedCount}/${board.eligibleCount}` : board.status === "FINISHED" ? "ИТОГ" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</div><div className="mt-2 text-sm uppercase tracking-wider text-nova-muted">{board.status === "WAITING" ? "в зале" : phaseLabel}</div></div></header>
    {board.status === "WAITING" ? <section className="grid min-h-[65vh] place-items-center text-center"><div><Users className="mx-auto text-nova-accent" size={64} /><div className="mt-8 text-[clamp(4rem,12vw,11rem)] font-semibold leading-none">{board.joinedCount}<span className="text-nova-muted">/{board.eligibleCount}</span></div><p className="mt-6 text-2xl text-nova-muted">Участники подключаются к залу ожидания</p>{board.scheduledAt && <p className="mt-4 text-xl text-nova-accent">Старт: {new Date(board.scheduledAt).toLocaleString("ru-RU")}</p>}</div></section> : <div className="mt-8 grid gap-7 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="data-card overflow-hidden"><div className="border-b border-white/6 px-6 py-5 text-xl font-semibold">Личный рейтинг · лучший результат</div><div className="divide-y divide-white/5">{valid.slice(0, 10).map((item, index) => <div key={item.id} className="grid grid-cols-[4rem_1fr_auto_auto] items-center gap-5 px-7 py-4"><div className={`text-3xl font-semibold ${index < 3 ? "text-nova-accent" : "text-nova-muted"}`}>{index + 1}</div><div><div className="text-xl font-semibold">{item.name}</div><div className="text-sm text-nova-muted">{item.className} · {item.attemptsCompleted.length}/2 попытки</div></div><div className="text-right text-2xl font-semibold text-nova-accent">{item.wpm}<small className="ml-1 text-xs">WPM</small></div><div className="w-20 text-right text-lg text-nova-muted">{item.accuracy?.toFixed(0)}%</div></div>)}{!valid.length && <div className="p-16 text-center text-xl text-nova-muted">Ждём первые результаты…</div>}</div></section>
      <div className="space-y-7"><section className="data-card p-6"><div className="mb-5 flex items-center gap-2 text-lg font-semibold"><Trophy className="text-nova-accent" size={20} /> Победители параллелей</div>{winners.map(({ grade, winner }) => <div key={grade} className="flex items-center gap-4 border-t border-white/5 py-4 first:border-0"><span className="grid h-11 w-11 place-items-center rounded-full bg-nova-accent/10 font-semibold text-nova-accent">{grade}</span><div><div className="font-semibold">{winner?.name ?? "—"}</div><div className="text-sm text-nova-muted">{winner ? `${winner.className} · ${winner.wpm} WPM` : "Нет результата"}</div></div></div>)}</section><section className="data-card p-6"><div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Medal className="text-nova-accent" size={20} /> Рейтинг классов</div>{teams.slice(0, 6).map((team, index) => <div key={team.name} className="grid grid-cols-[2rem_1fr_auto] border-t border-white/5 py-3 first:border-0"><span className="text-nova-accent">{index + 1}</span><span>{team.name}</span><span className="font-semibold">{team.average} WPM</span></div>)}{!teams.length && <div className="py-6 text-center text-nova-muted">Пока нет данных</div>}</section></div>
    </div>}
  </main>;
}
