"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Medal, ShieldCheck, Trophy, Users } from "lucide-react";
import { TypingArea } from "@/components/typing/TypingArea";
import { CapsLockWarning } from "@/components/typing/CapsLockWarning";
import { calculateTypingStats } from "@/lib/typing";
import { normalizeTypingKey, normalizeTypingText, typingCharacters } from "@/lib/typing-text";

interface AttemptSummary { attemptNumber: number; wpm: number; accuracy: number; needsReview: boolean; }
interface Standing {
  id: string; userId: string; name: string; className: string; submittedAt: string | null; hasResult: boolean;
  wpm: number | null; accuracy: number | null; errors: number; needsReview: boolean; grade: number | null;
  disqualified: boolean; disqualificationReason: string | null; attemptsCompleted: number[]; attempts: AttemptSummary[];
}
interface RoomState {
  id: string; title: string; description: string | null; language: string; durationSeconds: number; attemptLimit: number;
  breakSeconds: number; totalDurationSeconds: number; status: "WAITING" | "RUNNING" | "FINISHED" | "CANCELLED";
  phase: "WAITING" | "COUNTDOWN" | "ATTEMPT_1" | "BREAK" | "ATTEMPT_2" | "FINISHED";
  attemptNumber: number | null; attemptStartedAt: string | null; attemptEndsAt: string | null; startedAt: string | null;
  scheduledAt: string | null; classes: string[]; eligibleCount: number; joinedCount: number; finishedCount: number;
  joined: boolean; submitted: boolean; attemptsCompleted: number[]; attemptText: string | null; participants: Standing[]; ownResult: Standing | null;
}
interface LocalResult { attemptNumber: number; wpm: number; accuracy: number; needsReview: boolean; bestWpm: number | null; }

export function OlympiadRoom({ olympiadId, currentUserId }: { olympiadId: string; currentUserId: string }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [competitionText, setCompetitionText] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [now, setNow] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [pasteDetected, setPasteDetected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [localResults, setLocalResults] = useState<LocalResult[]>([]);
  const joinedRef = useRef(false);
  const submittedRef = useRef(false);
  const expectedLength = useMemo(() => typingCharacters(competitionText ?? "").length, [competitionText]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/olympiads/${olympiadId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { serverTime: string; olympiad: RoomState };
    const next = payload.olympiad;
    setServerOffset(new Date(payload.serverTime).getTime() - Date.now());
    setRoom(next);
    if (next.attemptNumber && next.attemptText && next.attemptNumber !== activeAttempt) {
      setActiveAttempt(next.attemptNumber);
      setCompetitionText(normalizeTypingText(next.attemptText));
      setTyped("");
      setFocusLostCount(0);
      setPasteDetected(false);
      const alreadySubmitted = next.attemptsCompleted.includes(next.attemptNumber);
      submittedRef.current = alreadySubmitted;
      setSubmitted(alreadySubmitted);
    } else if (next.attemptNumber === activeAttempt) {
      submittedRef.current = next.submitted;
      setSubmitted(next.submitted);
    }
  }, [activeAttempt, olympiadId]);

  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initial); }, [load]);
  useEffect(() => {
    if (!room || room.status !== "WAITING" || room.joined || joinedRef.current) return;
    joinedRef.current = true;
    void fetch(`/api/olympiads/${olympiadId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join" }) }).then(() => load());
  }, [load, olympiadId, room]);
  useEffect(() => {
    const activelyTyping = room?.status === "RUNNING" && (room.phase === "ATTEMPT_1" || room.phase === "ATTEMPT_2") && !submitted;
    if (activelyTyping) return;
    const timer = window.setInterval(load, 1_000);
    return () => window.clearInterval(timer);
  }, [load, room?.phase, room?.status, submitted]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);

  const officialNow = now + serverOffset;
  const attemptStart = room?.attemptStartedAt ? new Date(room.attemptStartedAt).getTime() : null;
  const attemptEnd = room?.attemptEndsAt ? new Date(room.attemptEndsAt).getTime() : null;
  const countdown = attemptStart ? Math.max(0, Math.ceil((attemptStart - officialNow) / 1_000)) : 0;
  const timeLeft = attemptEnd ? Math.max(0, Math.ceil((attemptEnd - officialNow) / 1_000)) : 0;
  const active = Boolean(room?.status === "RUNNING" && (room.phase === "ATTEMPT_1" || room.phase === "ATTEMPT_2") && competitionText && attemptStart && officialNow >= attemptStart && timeLeft > 0 && !submitted);
  const elapsed = attemptStart ? Math.max(1, Math.min(room?.durationSeconds ?? 1, (officialNow - attemptStart) / 1_000)) : 1;
  const liveStats = useMemo(() => calculateTypingStats({ expectedText: competitionText ?? "", typedText: typed, durationSeconds: elapsed, countMissed: false, focusLostCount }), [competitionText, elapsed, focusLostCount, typed]);

  const submit = useCallback(async (finalText: string) => {
    if (submittedRef.current || !activeAttempt) return;
    submittedRef.current = true;
    setSubmitted(true);
    setSubmitting(true);
    const response = await fetch(`/api/olympiads/${olympiadId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", attemptNumber: activeAttempt, typedText: finalText, focusLostCount, pasteDetected }),
    });
    if (response.ok) {
      const result = await response.json() as LocalResult;
      setLocalResults((items) => [...items.filter((item) => item.attemptNumber !== result.attemptNumber), result]);
      await load();
    } else {
      submittedRef.current = false;
      setSubmitted(false);
    }
    setSubmitting(false);
  }, [activeAttempt, focusLostCount, load, olympiadId, pasteDetected]);

  useEffect(() => {
    if (!active || !competitionText) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") { event.preventDefault(); setPasteDetected(true); return; }
      if (event.key === "Backspace") { event.preventDefault(); setTyped((value) => typingCharacters(value).slice(0, -1).join("")); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const input = normalizeTypingKey(event.key);
      if (!input) return;
      event.preventDefault();
      setTyped((value) => { const next = [...typingCharacters(value), ...typingCharacters(input)].slice(0, expectedLength).join(""); if (typingCharacters(next).length >= expectedLength) window.setTimeout(() => void submit(next), 0); return next; });
    };
    const blockTransfer = (event: Event) => { event.preventDefault(); setPasteDetected(true); };
    window.addEventListener("keydown", handleKeyDown); window.addEventListener("paste", blockTransfer); window.addEventListener("drop", blockTransfer);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("paste", blockTransfer); window.removeEventListener("drop", blockTransfer); };
  }, [active, competitionText, expectedLength, submit]);
  useEffect(() => { if (!active) return; const onBlur = () => setFocusLostCount((value) => value + 1); window.addEventListener("blur", onBlur); return () => window.removeEventListener("blur", onBlur); }, [active]);
  useEffect(() => {
    if (!competitionText || !attemptStart || officialNow < attemptStart || timeLeft !== 0 || submitted) return;
    const timer = window.setTimeout(() => void submit(typed), 0);
    return () => window.clearTimeout(timer);
  }, [attemptStart, competitionText, officialNow, submit, submitted, timeLeft, typed]);

  if (!room) return <div className="data-card mx-auto mt-20 max-w-xl p-12 text-center text-nova-muted">Подключаемся к олимпиаде…</div>;
  if (room.status === "WAITING") return <WaitingRoom room={room} />;
  if (room.status === "RUNNING" && !room.joined) return <Message title="Олимпиада уже началась" text="Войти после старта нельзя. Обратитесь к администратору." />;
  if (room.phase === "COUNTDOWN") return <Countdown value={countdown} title="Первая попытка начнётся через" text="Положите руки на клавиатуру. Текст откроется одновременно для всех." />;
  if (room.phase === "BREAK") return <Countdown value={countdown} title="Перерыв перед второй попыткой" text="Новый текст откроется автоматически. Лучший из двух результатов попадёт в рейтинг." />;

  if (active && competitionText) return <div className="mx-auto w-full max-w-[1120px] px-5 pb-12 pt-8 sm:px-8">
    <div className="mb-12 flex items-center justify-between"><div><div className="text-xs uppercase tracking-[0.18em] text-nova-accent">Олимпиада · {room.language.toUpperCase()} · Попытка {activeAttempt} из {room.attemptLimit}</div><h1 className="mt-2 text-xl font-semibold">{room.title}</h1></div><div className="text-right"><div className="font-mono text-3xl font-semibold text-nova-accent">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div><div className="text-[10px] uppercase tracking-wider text-nova-muted">осталось</div></div></div>
    <CapsLockWarning />
    <TypingArea expectedText={competitionText} typedText={typed} status="running" />
    <div className="mt-12 grid grid-cols-3 gap-3"><Metric value={liveStats.wpm} label="WPM" /><Metric value={`${liveStats.accuracy.toFixed(0)}%`} label="Точность" /><Metric value={liveStats.incorrectChars + liveStats.extraChars} label="Ошибки" /></div>
    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-nova-muted"><ShieldCheck size={14} /> Вставка текста заблокирована, уход со страницы фиксируется.</div>
  </div>;

  if (room.status === "RUNNING" && (submitted || submitting)) {
    const result = localResults.find((item) => item.attemptNumber === activeAttempt) ?? room.ownResult?.attempts.find((item) => item.attemptNumber === activeAttempt);
    const isFirst = activeAttempt === 1;
    return <div className="mx-auto mt-20 max-w-xl px-5 text-center"><CheckCircle2 className="mx-auto text-emerald-400" size={48} /><h1 className="mt-5 text-3xl font-semibold">Попытка {activeAttempt} принята</h1><p className="mt-2 text-sm text-nova-muted">{isFirst ? "Вторая попытка начнётся автоматически после короткого перерыва." : "Дождитесь завершения олимпиады — затем откроется итоговый рейтинг."}</p>{result && <div className="mt-8 grid grid-cols-2 gap-3"><Metric value={result.wpm} label="WPM" /><Metric value={`${result.accuracy.toFixed(0)}%`} label="Точность" /></div>}</div>;
  }
  if (room.status === "FINISHED") return <Results room={room} currentUserId={currentUserId} />;
  return <Message title="Олимпиада недоступна" text="Соревнование отменено или уже закрыто." />;
}

function Countdown({ value, title, text }: { value: number; title: string; text: string }) { return <div className="mx-auto mt-20 max-w-2xl px-5 text-center"><div className="text-sm uppercase tracking-[0.22em] text-nova-muted">{title}</div><div className="mt-6 text-[9rem] font-semibold leading-none text-nova-accent">{value}</div><p className="mt-7 text-sm text-nova-muted">{text}</p></div>; }
function WaitingRoom({ room }: { room: RoomState }) { return <div className="mx-auto mt-14 max-w-2xl px-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-nova-accent/25 bg-nova-accent/8 text-nova-accent"><Clock3 size={28} /></div><p className="mt-7 text-xs uppercase tracking-[0.2em] text-nova-accent">Зал ожидания</p><h1 className="mt-2 text-3xl font-semibold">{room.title}</h1>{room.description && <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-nova-muted">{room.description}</p>}<div className="mx-auto mt-5 w-fit rounded-full border border-nova-accent/20 bg-nova-accent/5 px-4 py-2 text-xs text-nova-accent">2 попытки по {room.durationSeconds} сек. · перерыв {room.breakSeconds} сек. · лучший результат</div>{room.scheduledAt && <div className="mx-auto mt-3 w-fit rounded-full border border-nova-accent/20 bg-nova-accent/5 px-4 py-2 text-xs text-nova-accent">Старт: {new Date(room.scheduledAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}<div className="data-card mt-8 p-7"><Users className="mx-auto text-nova-muted" size={22} /><div className="mt-3 text-4xl font-semibold">{room.joinedCount} / {room.eligibleCount}</div><div className="mt-2 text-xs text-nova-muted">участников вошли · {room.classes.join(", ")}</div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-nova-accent transition-all" style={{ width: `${room.eligibleCount ? Math.min(100, room.joinedCount / room.eligibleCount * 100) : 0}%` }} /></div></div><p className="mt-6 text-sm text-nova-muted">Не закрывайте страницу. Олимпиада начнётся одновременно для всех автоматически или по команде администратора.</p></div>; }

function Results({ room, currentUserId }: { room: RoomState; currentUserId: string }) {
  const standings = [...room.participants].filter((item) => item.hasResult && !item.disqualified).sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0) || (b.accuracy ?? 0) - (a.accuracy ?? 0) || a.errors - b.errors);
  const gradeWinners = [5, 6, 7].map((grade) => ({ grade, winner: standings.find((item) => item.grade === grade) }));
  const teams = [...standings.reduce((map, item) => { const team = map.get(item.className) ?? { className: item.className, total: 0, accuracy: 0, students: 0 }; team.total += item.wpm ?? 0; team.accuracy += item.accuracy ?? 0; team.students += 1; map.set(item.className, team); return map; }, new Map<string, { className: string; total: number; accuracy: number; students: number }>()).values()].map((team) => ({ ...team, averageWpm: Math.round(team.total / team.students), averageAccuracy: team.accuracy / team.students })).sort((a, b) => b.averageWpm - a.averageWpm || b.averageAccuracy - a.averageAccuracy);
  return <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8"><div className="text-center"><Medal className="mx-auto text-nova-accent" size={42} /><p className="mt-5 text-xs uppercase tracking-[0.2em] text-nova-accent">Итоги · лучший результат из двух попыток</p><h1 className="mt-2 text-3xl font-semibold">{room.title}</h1></div><div className="mt-8 grid gap-3 md:grid-cols-3">{gradeWinners.map(({ grade, winner }) => <div className="data-card p-5 text-center" key={grade}><div className="text-xs uppercase tracking-wider text-nova-muted">Победитель {grade} класса</div><Trophy className="mx-auto mt-4 text-nova-accent" size={22} /><div className="mt-3 font-semibold">{winner?.name ?? "Нет результата"}</div><div className="mt-1 text-xs text-nova-muted">{winner ? `${winner.className} · ${winner.wpm} WPM` : "—"}</div></div>)}</div>{teams.length > 0 && <div className="data-card mt-6 overflow-hidden"><div className="border-b border-white/6 p-4 font-semibold">Командный рейтинг классов</div>{teams.map((team, index) => <div key={team.className} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-0"><span className="font-semibold text-nova-accent">{index + 1}</span><span>{team.className}<small className="ml-2 text-nova-muted">{team.students} участников</small></span><span className="font-semibold">{team.averageWpm} WPM</span></div>)}</div>}<div className="data-card mt-6 overflow-hidden"><div className="divide-y divide-white/5">{standings.map((item, index) => <div key={item.id} className={`grid grid-cols-[3rem_1fr_auto_auto] items-center gap-4 px-5 py-4 ${item.userId === currentUserId ? "bg-nova-accent/5" : ""}`}><div className={`text-xl font-semibold ${index < 3 ? "text-nova-accent" : "text-nova-muted"}`}>{index + 1}</div><div><div className="font-medium">{item.name}</div><div className="text-xs text-nova-muted">{item.className} · {item.attemptsCompleted.length}/2 попытки{item.needsReview ? " · проверка" : ""}</div></div><div className="text-right"><div className="font-semibold text-nova-accent">{item.wpm}</div><div className="text-[9px] text-nova-muted">WPM</div></div><div className="w-16 text-right text-xs text-nova-muted">{item.accuracy?.toFixed(0)}%</div></div>)}{!standings.length && <div className="p-12 text-center text-nova-muted">Нет результатов.</div>}</div></div><div className="mt-6 text-center"><Link href="/olympiads" className="nova-button-secondary">Все олимпиады</Link></div></div>;
}

function Metric({ value, label }: { value: string | number; label: string }) { return <div className="data-card p-5 text-center"><div className="text-2xl font-semibold text-nova-accent">{value}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-nova-muted">{label}</div></div>; }
function Message({ title, text }: { title: string; text: string }) { return <div className="data-card mx-auto mt-20 max-w-xl p-12 text-center"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-3 text-sm text-nova-muted">{text}</p><Link href="/olympiads" className="nova-button-secondary mt-6">Назад</Link></div>; }
