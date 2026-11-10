"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Expand, Gamepad2, Heart, Pause, Play, RotateCcw, Shield, Trophy, Volume2, VolumeX, X } from "lucide-react";
import clsx from "clsx";
import {
  DEFENSE_CONFIG,
  defenseGrade,
  defenseWordScore,
  type DefenseDifficulty,
  type DefenseEvent,
  type DefenseLanguage,
  type DefenseSavedResult,
} from "@/lib/defense-shared";

type Phase = "setup" | "loading" | "countdown" | "playing" | "paused" | "saving" | "result";

interface DefenseChallenge {
  token: string;
  runId: string;
  language: DefenseLanguage;
  difficulty: DefenseDifficulty;
  words: string[];
}

interface TargetWord {
  id: number;
  wordIndex: number;
  word: string;
  x: number;
  y: number;
  progress: number;
  speed: number;
}

interface LiveStats {
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  destroyed: number;
  missed: number;
  correctChars: number;
  errors: number;
  elapsedMs: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
}

const difficultyCopy: Record<DefenseDifficulty, { title: string; text: string }> = {
  easy: { title: "Easy", text: "Медленный темп · 4 жизни" },
  medium: { title: "Medium", text: "Больше целей · 3 жизни" },
  hard: { title: "Hard", text: "Высокая скорость · знаки" },
};

export function DefenseGame({ initialLanguage, initialDifficulty, adminMode }: { initialLanguage: DefenseLanguage; initialDifficulty: DefenseDifficulty; adminMode: boolean }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [phaseState, setPhaseState] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(3);
  const [targets, setTargetsState] = useState<TargetWord[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [stats, setStatsState] = useState<LiveStats>(() => emptyStats(initialDifficulty));
  const [challenge, setChallenge] = useState<DefenseChallenge | null>(null);
  const [result, setResult] = useState<DefenseSavedResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  const phaseRef = useRef<Phase>("setup");
  const challengeRef = useRef<DefenseChallenge | null>(null);
  const targetsRef = useRef<TargetWord[]>([]);
  const statsRef = useRef<LiveStats>(emptyStats(initialDifficulty));
  const eventsRef = useRef<DefenseEvent[]>([]);
  const activeIdRef = useRef<number | null>(null);
  const wordCursorRef = useRef(0);
  const targetIdRef = useRef(1);
  const burstIdRef = useRef(1);
  const elapsedMsRef = useRef(0);
  const lastSpawnAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const saveDurationRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  const setPhase = useCallback((phase: Phase) => {
    phaseRef.current = phase;
    setPhaseState(phase);
  }, []);

  const setTargets = useCallback((next: TargetWord[]) => {
    targetsRef.current = next;
    setTargetsState(next);
  }, []);

  const updateStats = useCallback((update: (current: LiveStats) => LiveStats) => {
    const next = update(statsRef.current);
    statsRef.current = next;
    setStatsState(next);
    return next;
  }, []);

  const setActiveId = useCallback((id: number | null) => {
    activeIdRef.current = id;
    setActiveTargetId(id);
  }, []);

  const playTone = useCallback((kind: "hit" | "destroy" | "error" | "breach") => {
    if (!soundEnabled) return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const settings = kind === "hit"
      ? { frequency: 510, duration: 0.035, volume: 0.025, type: "sine" as OscillatorType }
      : kind === "destroy"
        ? { frequency: 860, duration: 0.11, volume: 0.045, type: "triangle" as OscillatorType }
        : kind === "breach"
          ? { frequency: 105, duration: 0.22, volume: 0.055, type: "sawtooth" as OscillatorType }
          : { frequency: 180, duration: 0.07, volume: 0.035, type: "square" as OscillatorType };
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, context.currentTime);
    if (kind === "destroy") oscillator.frequency.exponentialRampToValueAtTime(1_320, context.currentTime + settings.duration);
    gain.gain.setValueAtTime(settings.volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + settings.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + settings.duration);
  }, [soundEnabled]);

  const saveMission = useCallback(async (durationMs: number) => {
    const currentChallenge = challengeRef.current;
    if (!currentChallenge) return;
    setSaveError(false);
    try {
      const response = await fetch("/api/games/defense/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentChallenge.token, runId: currentChallenge.runId, durationMs, events: eventsRef.current }),
      });
      if (!response.ok) throw new Error("save_failed");
      const saved = await response.json() as DefenseSavedResult;
      setResult(saved);
      setPhase("result");
    } catch {
      const current = statsRef.current;
      const accuracy = liveAccuracy(current);
      setResult({
        id: "local",
        score: current.score,
        wpm: liveWpm(current),
        accuracy,
        destroyed: current.destroyed,
        missed: current.missed,
        maxCombo: current.maxCombo,
        duration: Math.max(1, Math.round(durationMs / 1000)),
        isRanked: false,
        grade: defenseGrade(accuracy, current.maxCombo, current.destroyed),
      });
      setSaveError(true);
      setPhase("result");
    }
  }, [setPhase]);

  const finishMission = useCallback(() => {
    if (phaseRef.current !== "playing" && phaseRef.current !== "paused") return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setActiveId(null);
    const durationMs = Math.max(1_000, Math.round(elapsedMsRef.current));
    saveDurationRef.current = durationMs;
    setPhase("saving");
    void saveMission(durationMs);
  }, [saveMission, setActiveId, setPhase]);

  const startMission = useCallback(async () => {
    if (phaseRef.current === "loading") return;
    setPhase("loading");
    setSaveError(false);
    setResult(null);
    setCombatLog([]);
    try {
      if (soundEnabled) {
        audioRef.current ??= new AudioContext();
        if (audioRef.current.state === "suspended") await audioRef.current.resume();
      }
      const response = await fetch("/api/games/defense/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, difficulty }),
      });
      if (!response.ok) throw new Error("challenge_failed");
      const nextChallenge = await response.json() as DefenseChallenge;
      challengeRef.current = nextChallenge;
      setChallenge(nextChallenge);
      eventsRef.current = [];
      setActiveId(null);
      wordCursorRef.current = 0;
      targetIdRef.current = 1;
      elapsedMsRef.current = 0;
      lastSpawnAtRef.current = -DEFENSE_CONFIG[difficulty].spawnMs;
      const nextStats = emptyStats(difficulty);
      statsRef.current = nextStats;
      setStatsState(nextStats);
      targetsRef.current = [];
      setTargetsState([]);
      setBursts([]);
      setCountdown(3);
      setPhase("countdown");
    } catch {
      setPhase("setup");
      setSaveError(true);
    }
  }, [difficulty, language, setActiveId, setPhase, soundEnabled]);

  useEffect(() => {
    if (phaseState !== "countdown") return;
    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(timer);
        setPhase("playing");
      } else {
        setCountdown(value);
        playTone("hit");
      }
    }, 720);
    return () => window.clearInterval(timer);
  }, [phaseState, playTone, setPhase]);

  useEffect(() => {
    if (phaseState !== "playing" || !challenge) return;
    const config = DEFENSE_CONFIG[difficulty];
    let previousFrame = performance.now();

    const frame = (now: number) => {
      if (phaseRef.current !== "playing") return;
      const deltaMs = Math.min(80, now - previousFrame);
      if (deltaMs < 28) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      previousFrame = now;
      elapsedMsRef.current += deltaMs;
      const elapsedMs = elapsedMsRef.current;
      const speedMultiplier = 1 + Math.min(1.15, elapsedMs / 85_000);
      let nextTargets = targetsRef.current.map((target) => ({ ...target, y: target.y + target.speed * speedMultiplier * deltaMs / 1000 }));
      const breached = nextTargets.filter((target) => target.y >= 82);

      if (breached.length) {
        const breachedIds = new Set(breached.map((target) => target.id));
        nextTargets = nextTargets.filter((target) => !breachedIds.has(target.id));
        for (const target of breached) {
          eventsRef.current.push({ type: "missed", wordIndex: target.wordIndex, atMs: Math.round(elapsedMs) });
          setCombatLog((items) => [`ПРОРЫВ · ${target.word.toUpperCase()}`, ...items].slice(0, 5));
          if (activeIdRef.current === target.id) setActiveId(null);
        }
        playTone("breach");
        const next = updateStats((current) => ({ ...current, lives: Math.max(0, current.lives - breached.length), missed: current.missed + breached.length, combo: 0, elapsedMs }));
        setTargets(nextTargets);
        if (next.lives <= 0) {
          finishMission();
          return;
        }
      }

      const spawnEvery = config.spawnMs / Math.min(1.75, speedMultiplier);
      if (elapsedMs - lastSpawnAtRef.current >= spawnEvery && nextTargets.length < config.maxTargets && wordCursorRef.current < challenge.words.length) {
        const wordIndex = wordCursorRef.current;
        const lane = wordIndex % 6;
        const x = 7 + lane * 12.8 + (wordIndex * 17 % 6);
        nextTargets = [...nextTargets, {
          id: targetIdRef.current++,
          wordIndex,
          word: challenge.words[wordIndex],
          x,
          y: 13,
          progress: 0,
          speed: config.fallPercentPerSecond * (0.9 + (wordIndex % 5) * 0.035),
        }];
        wordCursorRef.current += 1;
        lastSpawnAtRef.current = elapsedMs;
      }

      setTargets(nextTargets);
      updateStats((current) => ({ ...current, elapsedMs }));
      if (elapsedMs >= 180_000 || wordCursorRef.current >= challenge.words.length && nextTargets.length === 0) {
        finishMission();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [challenge, difficulty, finishMission, phaseState, playTone, setActiveId, setTargets, updateStats]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const registerError = () => {
        eventsRef.current.push({ type: "error", atMs: Math.round(elapsedMsRef.current) });
        updateStats((current) => ({ ...current, errors: current.errors + 1, combo: 0 }));
        setErrorFlash(true);
        window.setTimeout(() => setErrorFlash(false), 120);
        playTone("error");
      };

      setCapsLock(event.getModifierState("CapsLock"));
      if (phaseRef.current === "paused" && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setPhase("playing");
        return;
      }
      if (phaseRef.current === "result" && (event.key === "Enter" || event.key === "Tab")) {
        event.preventDefault();
        void startMission();
        return;
      }
      if (phaseRef.current !== "playing") return;
      if (event.key === "Escape") {
        event.preventDefault();
        setPhase("paused");
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        void startMission();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      event.preventDefault();

      let target = activeIdRef.current === null ? undefined : targetsRef.current.find((item) => item.id === activeIdRef.current);
      if (!target) {
        setActiveId(null);
        target = targetsRef.current
          .filter((item) => Array.from(item.word)[0] === event.key)
          .sort((a, b) => b.y - a.y)[0];
        if (target) setActiveId(target.id);
      }

      if (!target) {
        registerError();
        return;
      }

      const letters = Array.from(target.word);
      if (letters[target.progress] !== event.key) {
        registerError();
        return;
      }

      const atMs = Math.round(elapsedMsRef.current);
      eventsRef.current.push({ type: "hit", wordIndex: target.wordIndex, charIndex: target.progress, atMs });
      const nextProgress = target.progress + 1;
      playTone("hit");

      if (nextProgress < letters.length) {
        setTargets(targetsRef.current.map((item) => item.id === target!.id ? { ...item, progress: nextProgress } : item));
        updateStats((current) => ({ ...current, correctChars: current.correctChars + 1 }));
        return;
      }

      eventsRef.current.push({ type: "destroyed", wordIndex: target.wordIndex, atMs });
      const completedTarget = target;
      const nextTargets = targetsRef.current.filter((item) => item.id !== completedTarget.id);
      setActiveId(null);
      setTargets(nextTargets);
      const next = updateStats((current) => {
        const combo = current.combo + 1;
        return {
          ...current,
          correctChars: current.correctChars + 1,
          destroyed: current.destroyed + 1,
          combo,
          maxCombo: Math.max(current.maxCombo, combo),
          score: current.score + defenseWordScore(completedTarget.word, difficulty, combo),
        };
      });
      const burstId = burstIdRef.current++;
      setBursts((items) => [...items, { id: burstId, x: completedTarget.x, y: completedTarget.y }]);
      window.setTimeout(() => setBursts((items) => items.filter((item) => item.id !== burstId)), 620);
      setCombatLog((items) => [`УНИЧТОЖЕНО · ${completedTarget.word.toUpperCase()} · x${next.combo}`, ...items].slice(0, 5));
      playTone("destroy");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [difficulty, playTone, setActiveId, setPhase, setTargets, startMission, updateStats]);

  useEffect(() => {
    const pauseOnBlur = () => {
      if (phaseRef.current === "playing") setPhase("paused");
    };
    window.addEventListener("blur", pauseOnBlur);
    return () => window.removeEventListener("blur", pauseOnBlur);
  }, [setPhase]);

  const activeTarget = activeTargetId === null ? undefined : targets.find((target) => target.id === activeTargetId);
  const accuracy = liveAccuracy(stats);
  const wpm = liveWpm(stats);
  const speedMultiplier = 1 + Math.min(1.15, stats.elapsedMs / 85_000);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }

  function retrySave() {
    setPhase("saving");
    void saveMission(saveDurationRef.current);
  }

  return <main className="relative mx-auto w-full max-w-[1920px] overflow-hidden bg-[#050809]">
    <section className="defense-arena relative h-[calc(100svh-65px)] min-h-[640px] overflow-hidden border-t border-white/[0.04]" aria-label="NOVA Defense game arena">
      <div className="absolute inset-0 bg-[url('/games/nova-defense-arena.webp')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,transparent_0,rgba(3,7,8,0.05)_30%,rgba(3,7,8,0.58)_100%)]" />
      <div className="defense-scan absolute inset-0 opacity-25" />
      <div className={clsx("pointer-events-none absolute inset-0 z-30 bg-red-500/15 opacity-0 transition-opacity", errorFlash && "opacity-100")} />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#050809]/72 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2"><Link href="/games" className="icon-button" aria-label="Выйти в игры"><X size={16} /></Link><div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-nova-accent">NOVA Defense · Beta</div><div className="text-[10px] text-white/40">Survival · {difficultyCopy[difficulty].title} · {language.toUpperCase()}</div></div></div>
        <div className="hidden items-center gap-2 md:flex"><Hud value={stats.score.toLocaleString("ru-RU")} label="Очки" accent /><Hud value={`x${stats.combo}`} label="Комбо" /><Hud value={wpm} label="WPM" /><Hud value={`${accuracy.toFixed(0)}%`} label="Точность" /></div>
        <div className="flex items-center gap-2"><button className="icon-button" onClick={() => setSoundEnabled((value) => !value)} aria-label="Звук">{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button className="icon-button" onClick={toggleFullscreen} aria-label="Полный экран"><Expand size={16} /></button>{phaseState === "playing" && <button className="icon-button" onClick={() => setPhase("paused")} aria-label="Пауза"><Pause size={16} /></button>}</div>
      </div>

      {(phaseState === "playing" || phaseState === "paused" || phaseState === "saving") && <>
        <div className="absolute left-4 top-[4.8rem] z-20 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/35 px-3 py-2 backdrop-blur-md sm:left-6"><div className="flex gap-1">{Array.from({ length: DEFENSE_CONFIG[difficulty].lives }, (_, index) => <Heart key={index} size={15} className={index < stats.lives ? "fill-red-400 text-red-400" : "text-white/15"} />)}</div><span className="text-[10px] uppercase tracking-wider text-white/45">Периметр</span></div>
        <div className="absolute right-4 top-[4.8rem] z-20 rounded-xl border border-cyan-300/15 bg-cyan-950/20 px-3 py-2 text-right backdrop-blur-md sm:right-6"><div className="text-sm font-semibold text-cyan-200">x{speedMultiplier.toFixed(2)}</div><div className="text-[9px] uppercase tracking-wider text-cyan-100/40">скорость атаки</div></div>

        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {activeTarget && <><line x1="50" y1="93" x2={activeTarget.x + 3} y2={activeTarget.y + 2} stroke="rgba(83,221,235,0.28)" strokeWidth="0.7" /><line x1="50" y1="93" x2={activeTarget.x + 3} y2={activeTarget.y + 2} stroke="#8df4ff" strokeWidth="0.16" /></>}
        </svg>

        <div className="absolute inset-0 z-10">
          {targets.map((target) => <div key={target.id} className={clsx("defense-target absolute -translate-x-1/2 rounded-lg border bg-[#071013]/88 px-3 py-2 font-mono text-sm font-semibold tracking-[0.08em] shadow-[0_10px_30px_rgba(0,0,0,0.42)] backdrop-blur-sm", activeTarget?.id === target.id ? "border-cyan-300/65 shadow-[0_0_26px_rgba(83,221,235,0.26)]" : "border-white/12")} style={{ left: `${target.x}%`, top: `${target.y}%` }}>
            {Array.from(target.word).map((character, index) => <span key={`${index}-${character}`} className={index < target.progress ? "text-nova-accent" : index === target.progress && activeTarget?.id === target.id ? "text-cyan-200 underline decoration-cyan-300/70 underline-offset-4" : "text-white/82"}>{character}</span>)}
          </div>)}
          {bursts.map((burst) => <div key={burst.id} className="defense-burst absolute" style={{ left: `${burst.x}%`, top: `${burst.y}%` }} />)}
        </div>

        <div className="absolute inset-x-0 top-[82%] z-10"><div className="defense-perimeter h-px bg-red-400/75 shadow-[0_0_18px_rgba(248,113,113,0.8)]" /><div className="absolute right-4 top-2 text-[8px] font-bold uppercase tracking-[0.22em] text-red-300/75 sm:right-8">Critical perimeter · breach</div></div>
        <div className="defense-core absolute bottom-[1.2%] left-1/2 z-10 h-16 w-16 -translate-x-1/2 rounded-full border border-nova-accent/55 bg-nova-accent/15 shadow-[0_0_35px_rgba(227,182,75,0.42)]"><div className="absolute inset-3 rounded-full border border-cyan-300/45 bg-[#071113] shadow-[inset_0_0_16px_rgba(83,221,235,0.35)]" /><div className="absolute inset-[1.35rem] rounded-full bg-nova-accent shadow-[0_0_20px_rgba(227,182,75,0.9)]" /></div>

        <aside className="absolute bottom-24 right-5 z-20 hidden w-64 rounded-2xl border border-white/[0.08] bg-[#071012]/72 p-4 shadow-2xl backdrop-blur-xl xl:block"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Combat log</span><Crosshair size={14} className="text-cyan-300" /></div><div className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label="Уничтожено" value={stats.destroyed} /><MiniMetric label="Макс. комбо" value={`x${stats.maxCombo}`} /></div><div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">{combatLog.map((item, index) => <div key={`${item}-${index}`} className={index === 0 ? "font-mono text-[9px] text-cyan-200" : "font-mono text-[9px] text-white/32"}>{item}</div>)}{combatLog.length === 0 && <div className="font-mono text-[9px] text-white/25">Ожидание первой цели...</div>}</div></aside>

        <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 text-[10px] text-white/35 sm:left-7"><span>Esc — пауза</span><span>Tab — заново</span><span className="hidden sm:inline">Печатайте первую букву для захвата цели</span></div>
        {capsLock && <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200 backdrop-blur-xl">Caps Lock включён</div>}
      </>}

      {(phaseState === "setup" || phaseState === "loading") && <div className="absolute inset-0 z-40 grid place-items-center bg-[#030708]/42 px-5 backdrop-blur-[3px]"><div className="w-full max-w-3xl rounded-[2rem] border border-white/[0.1] bg-[#081012]/88 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:p-9"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-nova-accent/25 bg-nova-accent/10 text-nova-accent"><Shield size={26} /></div><p className="page-eyebrow mt-5">Survival mission</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Защита периметра</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/48">Выберите режим, нажмите старт и печатайте падающие слова до того, как они достигнут красной линии.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-[10rem_1fr]"><div><div className="mb-2 text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">Язык целей</div><div className="grid grid-cols-2 gap-2">{(["en", "ru"] as DefenseLanguage[]).map((item) => <button key={item} onClick={() => setLanguage(item)} className={language === item ? "test-option test-option-active uppercase" : "test-option border border-white/[0.06] uppercase"}>{item}</button>)}</div></div><div><div className="mb-2 text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">Сложность</div><div className="grid gap-2 sm:grid-cols-3">{(["easy", "medium", "hard"] as DefenseDifficulty[]).map((item) => <button key={item} onClick={() => setDifficulty(item)} className={clsx("rounded-xl border p-3 text-left transition", difficulty === item ? "border-nova-accent/35 bg-nova-accent/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/15")}><div className={difficulty === item ? "text-sm font-semibold text-nova-accent" : "text-sm font-semibold text-white/75"}>{difficultyCopy[item].title}</div><div className="mt-1 text-[9px] text-white/35">{difficultyCopy[item].text}</div></button>)}</div></div></div>{saveError && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-center text-xs text-red-200">Не удалось подготовить миссию. Проверьте соединение и попробуйте снова.</div>}<div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"><button onClick={() => void startMission()} disabled={phaseState === "loading"} className="nova-button !min-h-12 !min-w-52 !rounded-xl"><Gamepad2 size={17} />{phaseState === "loading" ? "Подготовка арены..." : "Начать миссию"}</button><Link href="/games" className="nova-button-secondary !min-h-12 !rounded-xl">Вернуться в игры</Link></div></div></div>}

      {phaseState === "countdown" && <div className="absolute inset-0 z-40 grid place-items-center bg-black/35 backdrop-blur-sm"><div className="text-center"><div className="defense-countdown text-8xl font-semibold text-nova-accent drop-shadow-[0_0_35px_rgba(227,182,75,0.6)]">{countdown}</div><div className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/45">Система активируется</div></div></div>}
      {phaseState === "paused" && <div className="absolute inset-0 z-40 grid place-items-center bg-[#020405]/72 px-5 backdrop-blur-lg"><div className="text-center"><Pause className="mx-auto text-nova-accent" size={34} /><h2 className="mt-5 text-3xl font-semibold">Миссия приостановлена</h2><p className="mt-2 text-sm text-white/40">Цели остановлены. Нажмите пробел или продолжите кнопкой.</p><div className="mt-6 flex justify-center gap-3"><button className="nova-button" onClick={() => setPhase("playing")}><Play size={16} /> Продолжить</button><button className="nova-button-secondary" onClick={finishMission}>Завершить</button></div></div></div>}
      {phaseState === "saving" && <div className="absolute inset-0 z-40 grid place-items-center bg-[#020405]/78 backdrop-blur-xl"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-nova-accent" /><div className="mt-5 text-sm font-semibold">Формирование отчёта...</div><div className="mt-1 text-xs text-white/35">Результат сохраняется отдельно от обычных тестов</div></div></div>}
      {phaseState === "result" && result && <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-[#020405]/78 px-5 py-8 backdrop-blur-xl"><div className="w-full max-w-3xl rounded-[2rem] border border-white/[0.1] bg-[#081012]/92 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.68)] sm:p-9"><div className="text-center"><div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">Mission report</div><h2 className="mt-4 text-2xl font-semibold">Survival · {difficultyCopy[difficulty].title}</h2><div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/[0.06] text-5xl font-semibold text-cyan-200 shadow-[0_0_45px_rgba(83,221,235,0.13)]">{result.grade}</div></div><div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><ResultMetric value={result.score.toLocaleString("ru-RU")} label="Очки" accent /><ResultMetric value={result.wpm} label="WPM" /><ResultMetric value={`${result.accuracy.toFixed(0)}%`} label="Точность" /><ResultMetric value={result.destroyed} label="Уничтожено" /><ResultMetric value={`x${result.maxCombo}`} label="Макс. комбо" /><ResultMetric value={formatTime(result.duration)} label="Время" /></div><div className="mt-5 text-center text-[10px] text-white/35">{adminMode ? "Результат администратора сохранён отдельно и не участвует в рейтинге." : result.isRanked ? "Результат добавлен в игровой рейтинг." : "Результат сохранён как тренировочный."}</div>{saveError && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-center text-xs text-red-200">Сервер не подтвердил сохранение. <button className="font-semibold underline" onClick={retrySave}>Повторить</button></div>}<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button className="nova-button !min-h-12" onClick={() => void startMission()}><RotateCcw size={16} /> Играть снова</button><Link href="/games" className="nova-button-secondary !min-h-12"><Trophy size={16} /> Игровой рейтинг</Link></div><div className="mt-4 text-center text-[9px] uppercase tracking-[0.16em] text-white/25">Enter или Tab — новая миссия</div></div></div>}
    </section>
  </main>;
}

function emptyStats(difficulty: DefenseDifficulty): LiveStats {
  return { score: 0, lives: DEFENSE_CONFIG[difficulty].lives, combo: 0, maxCombo: 0, destroyed: 0, missed: 0, correctChars: 0, errors: 0, elapsedMs: 0 };
}

function liveAccuracy(stats: LiveStats) {
  const total = stats.correctChars + stats.errors;
  return total ? stats.correctChars / total * 100 : 100;
}

function liveWpm(stats: LiveStats) {
  return stats.elapsedMs > 1_000 ? Math.round((stats.correctChars / 5) / (stats.elapsedMs / 60_000)) : 0;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Hud({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div className="min-w-20 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-1.5 text-right"><div className={accent ? "text-sm font-semibold text-nova-accent" : "text-sm font-semibold text-white/85"}>{value}</div><div className="text-[8px] uppercase tracking-wider text-white/30">{label}</div></div>; }
function MiniMetric({ value, label }: { value: string | number; label: string }) { return <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5"><div className="text-sm font-semibold text-cyan-200">{value}</div><div className="mt-1 text-[8px] uppercase tracking-wider text-white/30">{label}</div></div>; }
function ResultMetric({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center"><div className={accent ? "text-xl font-semibold text-nova-accent" : "text-xl font-semibold text-white/90"}>{value}</div><div className="mt-1 text-[8px] uppercase tracking-wider text-white/30">{label}</div></div>; }
