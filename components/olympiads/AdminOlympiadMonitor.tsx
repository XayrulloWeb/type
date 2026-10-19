"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, RotateCcw, ShieldX, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { disqualifyParticipant, restoreParticipant } from "@/app/admin/olympiads/actions";
import { MINIMUM_RANKED_ACCURACY } from "@/lib/typing";

interface Participant {
  id: string;
  userId: string;
  name: string;
  className: string;
  joinedAt: string;
  submittedAt: string | null;
  hasResult: boolean;
  wpm: number | null;
  accuracy: number | null;
  errors: number;
  needsReview: boolean;
  grade: number | null;
  disqualified: boolean;
  disqualificationReason: string | null;
  attemptsCompleted: number[];
  attempts: { attemptNumber: number; wpm: number; accuracy: number; needsReview: boolean }[];
}

interface OlympiadState {
  title: string;
  status: string;
  eligibleCount: number;
  joinedCount: number;
  finishedCount: number;
  startedAt: string | null;
  durationSeconds: number;
  attemptLimit: number;
  breakSeconds: number;
  phase: string;
  participants: Participant[];
}

export function AdminOlympiadMonitor({ olympiadId, initialStatus }: { olympiadId: string; initialStatus: string }) {
  const [state, setState] = useState<OlympiadState | null>(null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/olympiads/${olympiadId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { olympiad: OlympiadState };
    setState(payload.olympiad);
  }, [olympiadId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(refresh, 2_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    if (state && state.status !== initialStatus) router.refresh();
  }, [initialStatus, router, state]);

  if (!state) return <div className="data-card mt-6 flex items-center gap-3 p-6 text-sm text-nova-muted"><RefreshCw className="animate-spin" size={16} /> Загружаем зал ожидания…</div>;

  const sorted = [...state.participants].sort((a, b) => {
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    if (a.wpm === null && b.wpm !== null) return 1;
    if (a.wpm !== null && b.wpm === null) return -1;
    return (b.wpm ?? 0) - (a.wpm ?? 0) || (b.accuracy ?? 0) - (a.accuracy ?? 0) || a.errors - b.errors;
  });
  const validResults = sorted.filter((item) => item.hasResult && (item.accuracy ?? 0) >= MINIMUM_RANKED_ACCURACY && !item.disqualified);
  const rankById = new Map(validResults.map((item, index) => [item.id, index + 1]));
  const gradeWinners = [5, 6, 7].map((grade) => ({ grade, winner: validResults.find((item) => item.grade === grade) }));
  const teams = [...validResults.reduce((map, item) => {
    const team = map.get(item.className) ?? { className: item.className, total: 0, accuracy: 0, students: 0 };
    team.total += item.wpm ?? 0;
    team.accuracy += item.accuracy ?? 0;
    team.students += 1;
    map.set(item.className, team);
    return map;
  }, new Map<string, { className: string; total: number; accuracy: number; students: number }>()).values()].map((team) => ({ ...team, averageWpm: Math.round(team.total / team.students), averageAccuracy: team.accuracy / team.students })).sort((a, b) => b.averageWpm - a.averageWpm || b.averageAccuracy - a.averageAccuracy);

  return <>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <StatusCard icon={Users} value={`${state.joinedCount} / ${state.eligibleCount}`} label="Вошли в зал" />
      <StatusCard icon={CheckCircle2} value={state.finishedCount} label="Завершили" />
      <StatusCard icon={Clock3} value={state.status === "WAITING" ? "Ожидание" : state.phase === "ATTEMPT_1" ? "Попытка 1" : state.phase === "BREAK" ? "Перерыв" : state.phase === "ATTEMPT_2" ? "Попытка 2" : state.status === "RUNNING" ? "Отсчёт" : "Завершена"} label={`${state.attemptLimit} × ${state.durationSeconds} сек.`} />
    </div>
    {state.status === "WAITING" && state.joinedCount === state.eligibleCount && state.eligibleCount > 0 && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">Все приглашённые ученики вошли. Автоматический старт уже запущен.</div>}
    {validResults.length > 0 && <div className="mt-6 grid gap-3 lg:grid-cols-3">{gradeWinners.map(({ grade, winner }) => <div key={grade} className="data-card p-5"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-nova-muted">Победитель {grade} класса</span><Trophy className="text-nova-accent" size={16} /></div><div className="mt-4 text-lg font-semibold">{winner?.name ?? "Пока нет результата"}</div><div className="mt-1 text-xs text-nova-muted">{winner ? `${winner.className} · ${winner.wpm} WPM · ${winner.accuracy?.toFixed(0)}%` : "—"}</div></div>)}</div>}
    {teams.length > 0 && <div className="data-card mt-6 overflow-x-auto"><div className="border-b border-white/6 p-5"><h3 className="font-semibold">Командный рейтинг классов</h3><p className="mt-1 text-xs text-nova-muted">Средняя скорость всех завершивших участников класса без дисквалифицированных результатов.</p></div><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">Место</th><th className="p-4">Класс</th><th className="p-4 text-right">Участники</th><th className="p-4 text-right">Средний WPM</th><th className="p-4 text-right">Точность</th></tr></thead><tbody className="divide-y divide-white/5">{teams.map((team, index) => <tr key={team.className}><td className="p-4 font-semibold text-nova-accent">{index + 1}</td><td className="p-4 font-medium">{team.className}</td><td className="p-4 text-right text-nova-muted">{team.students}</td><td className="p-4 text-right font-semibold text-nova-accent">{team.averageWpm}</td><td className="p-4 text-right text-nova-muted">{team.averageAccuracy.toFixed(0)}%</td></tr>)}</tbody></table></div>}
    <div className="data-card mt-6 overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm">
      <thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">Место</th><th className="p-4">Ученик</th><th className="p-4">Класс</th><th className="p-4">Попытки</th><th className="p-4 text-right">Лучший WPM</th><th className="p-4 text-right">Точность</th><th className="p-4 text-right">Ошибки</th><th className="p-4 text-right">Решение</th></tr></thead>
      <tbody className="divide-y divide-white/5">{sorted.map((item) => { const hasLowAccuracyAttempt = item.attempts.some((attempt) => attempt.accuracy < MINIMUM_RANKED_ACCURACY); return <tr key={item.id} className={item.disqualified ? "opacity-50" : undefined}><td className="p-4 font-semibold text-nova-accent">{item.disqualified ? "DQ" : rankById.get(item.id) ?? "—"}</td><td className="p-4"><div className="font-medium">{item.name}</div>{hasLowAccuracyAttempt && !item.disqualified && <div className="mt-1 text-[10px] text-amber-300">Попытка ниже {MINIMUM_RANKED_ACCURACY}% не учитывается</div>}{item.needsReview && !hasLowAccuracyAttempt && !item.disqualified && <div className="mt-1 text-[10px] text-nova-error">Требует проверки</div>}{item.disqualified && <div className="mt-1 text-[10px] text-nova-error">{item.disqualificationReason}</div>}</td><td className="p-4 text-nova-muted">{item.className}</td><td className="p-4 text-xs"><span className={item.attemptsCompleted.length === state.attemptLimit ? "text-emerald-400" : "text-nova-muted"}>{item.attemptsCompleted.length}/{state.attemptLimit}</span>{item.attempts.length > 0 && <div className="mt-1 text-[10px] text-nova-muted">{item.attempts.map((attempt) => `${attempt.attemptNumber}: ${attempt.wpm}`).join(" · ")}</div>}</td><td className="p-4 text-right font-semibold text-nova-accent">{item.wpm ?? "—"}</td><td className="p-4 text-right text-nova-muted">{item.accuracy === null ? "—" : `${item.accuracy.toFixed(0)}%`}</td><td className="p-4 text-right text-nova-muted">{item.hasResult ? item.errors : "—"}</td><td className="p-4"><div className="flex justify-end">{item.hasResult && (item.disqualified ? <form action={restoreParticipant}><input type="hidden" name="participantId" value={item.id} /><button className="icon-button" title="Вернуть в рейтинг"><RotateCcw size={14} /></button></form> : <form action={disqualifyParticipant} className="flex items-center gap-2"><input type="hidden" name="participantId" value={item.id} /><input className="w-32 rounded-md border border-white/8 bg-nova-bg px-2 py-1 text-[10px]" name="reason" defaultValue={item.needsReview ? "Подозрительный результат" : "Нарушение правил"} /><button className="icon-button text-nova-error" title="Дисквалифицировать"><ShieldX size={14} /></button></form>)}</div></td></tr>; })}{!sorted.length && <tr><td colSpan={8} className="p-14 text-center text-nova-muted">Ученики ещё не вошли.</td></tr>}</tbody>
    </table></div>
  </>;
}

function StatusCard({ icon: Icon, value, label }: { icon: typeof Users; value: string | number; label: string }) {
  return <div className="data-card p-5"><Icon className="text-nova-accent" size={18} /><div className="mt-4 text-2xl font-semibold">{value}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-nova-muted">{label}</div></div>;
}
