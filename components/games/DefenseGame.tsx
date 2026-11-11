"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Crosshair, Expand, Gamepad2, Gem, Heart, Music2, Pause, Play, RotateCcw, Shield, ShieldCheck, Snowflake, Sparkles, Trophy, Volume2, VolumeX, X, Zap } from "lucide-react";
import clsx from "clsx";
import {
  DEFENSE_CONFIG,
  DEFENSE_MAX_WAVES,
  DEFENSE_TARGETS,
  DEFENSE_WAVE_DURATION_MS,
  defenseGrade,
  defenseTargetKind,
  defenseWave,
  defenseWordScore,
  type DefenseDifficulty,
  type DefenseEvent,
  type DefenseLanguage,
  type DefenseSavedResult,
  type DefenseTargetKind,
} from "@/lib/defense-shared";

type Phase = "setup" | "loading" | "countdown" | "playing" | "paused" | "saving" | "result";
type ArenaTheme = "nova" | "cyber" | "ice";

interface MusicEngine {
  gain: GainNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
}

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
  kind: DefenseTargetKind;
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

const waveCopy = [
  { title: "Разведка", text: "Стандартные сигнатуры" },
  { title: "Ускорение", text: "Быстрые и бронированные цели" },
  { title: "Элитный сигнал", text: "Особые цели дают двойные очки" },
  { title: "Перегрузка", text: "Периметр работает на пределе" },
  { title: "Критический шторм", text: "Плотность целей максимальна" },
  { title: "Последний рубеж", text: "Финальная волна" },
] as const;

const arenaThemes: Record<ArenaTheme, { title: string; subtitle: string; image: string; icon: typeof Sparkles; frequencies: number[] }> = {
  nova: {
    title: "NOVA Prime",
    subtitle: "Золотое ядро",
    image: "/games/nova-defense-arena.webp",
    icon: Sparkles,
    frequencies: [110, 164.81, 220],
  },
  cyber: {
    title: "Neon City",
    subtitle: "Дождь и неон",
    image: "/games/nova-defense-cyber-city.webp",
    icon: Building2,
    frequencies: [98, 146.83, 196],
  },
  ice: {
    title: "Ice Citadel",
    subtitle: "Ледяное сияние",
    image: "/games/nova-defense-ice-citadel.webp",
    icon: Snowflake,
    frequencies: [130.81, 196, 261.63],
  },
};

const PREFERENCES_KEY = "nova-defense-preferences-v1";

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
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [effectsVolume, setEffectsVolume] = useState(0.72);
  const [musicVolume, setMusicVolume] = useState(0.42);
  const [arena, setArena] = useState<ArenaTheme>("nova");
  const [capsLock, setCapsLock] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [wave, setWaveState] = useState(1);
  const [waveBanner, setWaveBanner] = useState<number | null>(null);

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
  const waveRef = useRef(1);
  const waveBannerTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const saveDurationRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<MusicEngine | null>(null);
  const preferencesReadyRef = useRef(false);

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

  const setWave = useCallback((nextWave: number) => {
    waveRef.current = nextWave;
    setWaveState(nextWave);
  }, []);

  const announceWave = useCallback((nextWave: number) => {
    setWaveBanner(nextWave);
    if (waveBannerTimerRef.current !== null) window.clearTimeout(waveBannerTimerRef.current);
    waveBannerTimerRef.current = window.setTimeout(() => setWaveBanner(null), 2_100);
  }, []);

  useEffect(() => () => {
    if (waveBannerTimerRef.current !== null) window.clearTimeout(waveBannerTimerRef.current);
  }, []);

  const stopAmbientMusic = useCallback(() => {
    const engine = musicRef.current;
    if (!engine) return;
    const context = audioRef.current;
    if (context) {
      engine.gain.gain.cancelScheduledValues(context.currentTime);
      engine.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
    }
    window.setTimeout(() => {
      for (const oscillator of engine.oscillators) {
        try { oscillator.stop(); } catch { /* already stopped */ }
      }
      try { engine.lfo.stop(); } catch { /* already stopped */ }
    }, 420);
    musicRef.current = null;
  }, []);

  const startAmbientMusic = useCallback(async () => {
    if (!musicEnabled) return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    if (context.state === "suspended") await context.resume();
    stopAmbientMusic();

    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    const frequencies = arenaThemes[arena].frequencies;
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const voice = context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.detune.setValueAtTime(index === 1 ? -7 : index === 2 ? 6 : 0, context.currentTime);
      voice.gain.setValueAtTime(index === 0 ? 0.48 : 0.22, context.currentTime);
      oscillator.connect(voice).connect(filter);
      oscillator.start();
      return oscillator;
    });

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(arena === "ice" ? 1_250 : arena === "cyber" ? 920 : 1_080, context.currentTime);
    filter.Q.setValueAtTime(0.7, context.currentTime);
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.075, context.currentTime);
    lfoDepth.gain.setValueAtTime(170, context.currentTime);
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, musicVolume * 0.038), context.currentTime + 0.9);
    filter.connect(compressor).connect(master).connect(context.destination);
    musicRef.current = { gain: master, oscillators, lfo };
  }, [arena, musicEnabled, musicVolume, stopAmbientMusic]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null") as Partial<{ arena: ArenaTheme; musicEnabled: boolean; soundEnabled: boolean; musicVolume: number; effectsVolume: number }> | null;
        if (saved?.arena && saved.arena in arenaThemes) setArena(saved.arena);
        if (typeof saved?.musicEnabled === "boolean") setMusicEnabled(saved.musicEnabled);
        if (typeof saved?.soundEnabled === "boolean") setSoundEnabled(saved.soundEnabled);
        if (typeof saved?.musicVolume === "number") setMusicVolume(clampVolume(saved.musicVolume));
        if (typeof saved?.effectsVolume === "number") setEffectsVolume(clampVolume(saved.effectsVolume));
      } catch {
        window.localStorage.removeItem(PREFERENCES_KEY);
      }
      preferencesReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReadyRef.current) return;
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ arena, musicEnabled, soundEnabled, musicVolume, effectsVolume }));
  }, [arena, effectsVolume, musicEnabled, musicVolume, soundEnabled]);

  useEffect(() => {
    const activePhase = phaseState === "countdown" || phaseState === "playing" || phaseState === "paused";
    if (!musicEnabled || !activePhase) {
      stopAmbientMusic();
      return;
    }
    void startAmbientMusic();
    return stopAmbientMusic;
  }, [musicEnabled, phaseState, startAmbientMusic, stopAmbientMusic]);

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
    gain.gain.setValueAtTime(settings.volume * effectsVolume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + settings.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + settings.duration);
  }, [effectsVolume, soundEnabled]);

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
      if (soundEnabled || musicEnabled) {
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
      setWave(1);
      setWaveBanner(null);
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
  }, [difficulty, language, musicEnabled, setActiveId, setPhase, setWave, soundEnabled]);

  useEffect(() => {
    if (phaseState !== "countdown") return;
    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(timer);
        announceWave(1);
        setPhase("playing");
      } else {
        setCountdown(value);
        playTone("hit");
      }
    }, 720);
    return () => window.clearInterval(timer);
  }, [announceWave, phaseState, playTone, setPhase]);

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
      const currentWave = defenseWave(elapsedMs);
      if (currentWave !== waveRef.current) {
        setWave(currentWave);
        announceWave(currentWave);
        setCombatLog((items) => [`ВОЛНА ${currentWave} · ${waveCopy[currentWave - 1].title.toUpperCase()}`, ...items].slice(0, 5));
      }
      const speedMultiplier = 1 + Math.min(0.5, elapsedMs / 160_000) + (currentWave - 1) * 0.06;
      let nextTargets = targetsRef.current.map((target) => ({ ...target, y: target.y + target.speed * speedMultiplier * deltaMs / 1000 }));
      const breached = nextTargets.filter((target) => target.y >= 82);

      if (breached.length) {
        const breachedIds = new Set(breached.map((target) => target.id));
        nextTargets = nextTargets.filter((target) => !breachedIds.has(target.id));
        for (const target of breached) {
          eventsRef.current.push({ type: "missed", wordIndex: target.wordIndex, atMs: Math.round(elapsedMs) });
          const damage = DEFENSE_TARGETS[target.kind].breachDamage;
          setCombatLog((items) => [`ПРОРЫВ · ${target.word.toUpperCase()} · -${damage}`, ...items].slice(0, 5));
          if (activeIdRef.current === target.id) setActiveId(null);
        }
        playTone("breach");
        const breachDamage = breached.reduce((total, target) => total + DEFENSE_TARGETS[target.kind].breachDamage, 0);
        const next = updateStats((current) => ({ ...current, lives: Math.max(0, current.lives - breachDamage), missed: current.missed + breached.length, combo: 0, elapsedMs }));
        setTargets(nextTargets);
        if (next.lives <= 0) {
          finishMission();
          return;
        }
      }

      const spawnEvery = config.spawnMs / (1 + (currentWave - 1) * 0.09);
      if (elapsedMs - lastSpawnAtRef.current >= spawnEvery && nextTargets.length < config.maxTargets && wordCursorRef.current < challenge.words.length) {
        const wordIndex = wordCursorRef.current;
        const kind = defenseTargetKind(wordIndex, difficulty);
        const targetProfile = DEFENSE_TARGETS[kind];
        const lane = wordIndex % 6;
        const x = 7 + lane * 12.8 + (wordIndex * 17 % 6);
        nextTargets = [...nextTargets, {
          id: targetIdRef.current++,
          wordIndex,
          word: challenge.words[wordIndex],
          x,
          y: 13,
          progress: 0,
          speed: config.fallPercentPerSecond * targetProfile.speedMultiplier * (0.9 + (wordIndex % 5) * 0.035),
          kind,
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
  }, [announceWave, challenge, difficulty, finishMission, phaseState, playTone, setActiveId, setTargets, setWave, updateStats]);

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
          score: current.score + defenseWordScore(completedTarget.word, difficulty, combo, completedTarget.kind),
        };
      });
      const burstId = burstIdRef.current++;
      setBursts((items) => [...items, { id: burstId, x: completedTarget.x, y: completedTarget.y }]);
      window.setTimeout(() => setBursts((items) => items.filter((item) => item.id !== burstId)), 620);
      const targetLabel = completedTarget.kind === "normal" ? "" : ` · ${DEFENSE_TARGETS[completedTarget.kind].shortLabel}`;
      setCombatLog((items) => [`УНИЧТОЖЕНО · ${completedTarget.word.toUpperCase()}${targetLabel} · x${next.combo}`, ...items].slice(0, 5));
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
  const speedMultiplier = 1 + Math.min(0.5, stats.elapsedMs / 160_000) + (wave - 1) * 0.06;
  const waveProgress = wave >= DEFENSE_MAX_WAVES ? Math.min(100, (stats.elapsedMs - (DEFENSE_MAX_WAVES - 1) * DEFENSE_WAVE_DURATION_MS) / DEFENSE_WAVE_DURATION_MS * 100) : stats.elapsedMs % DEFENSE_WAVE_DURATION_MS / DEFENSE_WAVE_DURATION_MS * 100;

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
      <div className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-700" style={{ backgroundImage: `url(${arenaThemes[arena].image})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,transparent_0,rgba(3,7,8,0.05)_30%,rgba(3,7,8,0.58)_100%)]" />
      <div className="defense-scan absolute inset-0 opacity-25" />
      <div className={clsx("pointer-events-none absolute inset-0 z-30 bg-red-500/15 opacity-0 transition-opacity", errorFlash && "opacity-100")} />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#050809]/72 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2"><Link href="/games" className="icon-button" aria-label="Выйти в игры"><X size={16} /></Link><div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-nova-accent">NOVA Defense · Beta</div><div className="text-[10px] text-white/40">{arenaThemes[arena].title} · {difficultyCopy[difficulty].title} · {language.toUpperCase()}</div></div></div>
        <div className="hidden items-center gap-2 lg:flex"><Hud value={`${wave}/${DEFENSE_MAX_WAVES}`} label="Волна" /><Hud value={stats.score.toLocaleString("ru-RU")} label="Очки" accent /><Hud value={`x${stats.combo}`} label="Комбо" /><Hud value={wpm} label="WPM" /><Hud value={`${accuracy.toFixed(0)}%`} label="Точность" /></div>
        <div className="flex items-center gap-2"><button className={clsx("icon-button", musicEnabled && "!text-cyan-200")} onClick={() => setMusicEnabled((value) => !value)} aria-label={musicEnabled ? "Выключить музыку" : "Включить музыку"}><Music2 size={16} /></button><button className="icon-button" onClick={() => setSoundEnabled((value) => !value)} aria-label="Звуковые эффекты">{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button className="icon-button" onClick={toggleFullscreen} aria-label="Полный экран"><Expand size={16} /></button>{phaseState === "playing" && <button className="icon-button" onClick={() => setPhase("paused")} aria-label="Пауза"><Pause size={16} /></button>}</div>
      </div>

      {(phaseState === "playing" || phaseState === "paused" || phaseState === "saving") && <>
        <div className="absolute left-4 top-[4.8rem] z-20 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/35 px-3 py-2 backdrop-blur-md sm:left-6"><div className="flex gap-1">{Array.from({ length: DEFENSE_CONFIG[difficulty].lives }, (_, index) => <Heart key={index} size={15} className={index < stats.lives ? "fill-red-400 text-red-400" : "text-white/15"} />)}</div><span className="text-[10px] uppercase tracking-wider text-white/45">Периметр</span></div>
        <div className="absolute right-4 top-[4.8rem] z-20 w-48 rounded-xl border border-cyan-300/15 bg-cyan-950/25 px-3 py-2.5 backdrop-blur-md sm:right-6"><div className="flex items-end justify-between gap-3"><div><div className="text-[9px] uppercase tracking-[0.16em] text-cyan-100/40">Волна {wave}</div><div className="mt-0.5 text-xs font-semibold text-cyan-100">{waveCopy[wave - 1].title}</div></div><div className="text-right"><div className="text-sm font-semibold text-cyan-200">x{speedMultiplier.toFixed(2)}</div><div className="text-[8px] uppercase tracking-wider text-cyan-100/35">темп</div></div></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-nova-accent transition-[width] duration-300" style={{ width: `${waveProgress}%` }} /></div></div>

        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {activeTarget && <><line x1="50" y1="93" x2={activeTarget.x + 3} y2={activeTarget.y + 2} stroke="rgba(83,221,235,0.28)" strokeWidth="0.7" /><line x1="50" y1="93" x2={activeTarget.x + 3} y2={activeTarget.y + 2} stroke="#8df4ff" strokeWidth="0.16" /></>}
        </svg>

        <div className="absolute inset-0 z-10">
          {targets.map((target) => <div key={target.id} data-target-kind={target.kind} className={clsx("defense-target absolute -translate-x-1/2 rounded-lg border bg-[#071013]/88 px-3 py-2 font-mono text-sm font-semibold tracking-[0.08em] shadow-[0_10px_30px_rgba(0,0,0,0.42)] backdrop-blur-sm", targetKindClass(target.kind), activeTarget?.id === target.id ? "border-cyan-200/80 shadow-[0_0_30px_rgba(83,221,235,0.34)]" : "border-white/12")} style={{ left: `${target.x}%`, top: `${target.y}%` }}>
            {target.kind !== "normal" && <span className="mb-1 flex items-center gap-1 font-sans text-[7px] font-bold uppercase tracking-[0.16em] opacity-80"><TargetKindIcon kind={target.kind} size={9} />{DEFENSE_TARGETS[target.kind].shortLabel}</span>}
            <span className="whitespace-nowrap">{Array.from(target.word).map((character, index) => <span key={`${index}-${character}`} className={index < target.progress ? "text-nova-accent" : index === target.progress && activeTarget?.id === target.id ? "text-cyan-200 underline decoration-cyan-300/70 underline-offset-4" : "text-white/82"}>{character}</span>)}</span>
          </div>)}
          {bursts.map((burst) => <div key={burst.id} className="defense-burst absolute" style={{ left: `${burst.x}%`, top: `${burst.y}%` }} />)}
        </div>

        <div className="absolute inset-x-0 top-[82%] z-10"><div className="defense-perimeter h-px bg-red-400/75 shadow-[0_0_18px_rgba(248,113,113,0.8)]" /><div className="absolute right-4 top-2 text-[8px] font-bold uppercase tracking-[0.22em] text-red-300/75 sm:right-8">Critical perimeter · breach</div></div>
        <div className="defense-core absolute bottom-[1.2%] left-1/2 z-10 h-16 w-16 -translate-x-1/2 rounded-full border border-nova-accent/55 bg-nova-accent/15 shadow-[0_0_35px_rgba(227,182,75,0.42)]"><div className="absolute inset-3 rounded-full border border-cyan-300/45 bg-[#071113] shadow-[inset_0_0_16px_rgba(83,221,235,0.35)]" /><div className="absolute inset-[1.35rem] rounded-full bg-nova-accent shadow-[0_0_20px_rgba(227,182,75,0.9)]" /></div>

        <aside className="absolute bottom-24 right-5 z-20 hidden w-64 rounded-2xl border border-white/[0.08] bg-[#071012]/72 p-4 shadow-2xl backdrop-blur-xl xl:block"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Combat log</span><Crosshair size={14} className="text-cyan-300" /></div><div className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label="Уничтожено" value={stats.destroyed} /><MiniMetric label="Макс. комбо" value={`x${stats.maxCombo}`} /></div><div className="mt-3 grid grid-cols-3 gap-1 border-t border-white/[0.06] pt-3"><TargetLegend kind="swift" /><TargetLegend kind="armored" /><TargetLegend kind="special" /></div><div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">{combatLog.map((item, index) => <div key={`${item}-${index}`} className={index === 0 ? "font-mono text-[9px] text-cyan-200" : "font-mono text-[9px] text-white/32"}>{item}</div>)}{combatLog.length === 0 && <div className="font-mono text-[9px] text-white/25">Ожидание первой цели...</div>}</div></aside>

        <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 text-[10px] text-white/35 sm:left-7"><span>Esc — пауза</span><span>Tab — заново</span><span className="hidden sm:inline">Печатайте первую букву для захвата цели</span></div>
        {capsLock && <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200 backdrop-blur-xl">Caps Lock включён</div>}
      </>}

      {waveBanner && phaseState === "playing" && <div className="defense-wave-banner pointer-events-none absolute left-1/2 top-28 z-30 -translate-x-1/2 text-center"><div className="text-[9px] font-bold uppercase tracking-[0.42em] text-cyan-200/65">Волна {waveBanner} / {DEFENSE_MAX_WAVES}</div><div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white drop-shadow-[0_0_24px_rgba(83,221,235,0.42)]">{waveCopy[waveBanner - 1].title}</div><div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/38">{waveCopy[waveBanner - 1].text}</div></div>}

      {(phaseState === "setup" || phaseState === "loading") && <MissionSetup
        arena={arena}
        difficulty={difficulty}
        effectsVolume={effectsVolume}
        language={language}
        loading={phaseState === "loading"}
        musicEnabled={musicEnabled}
        musicVolume={musicVolume}
        saveError={saveError}
        soundEnabled={soundEnabled}
        onArenaChange={setArena}
        onDifficultyChange={setDifficulty}
        onEffectsVolumeChange={setEffectsVolume}
        onLanguageChange={setLanguage}
        onMusicEnabledChange={setMusicEnabled}
        onMusicVolumeChange={setMusicVolume}
        onSoundEnabledChange={setSoundEnabled}
        onStart={() => void startMission()}
      />}

      {phaseState === "countdown" && <div className="absolute inset-0 z-40 grid place-items-center bg-black/35 backdrop-blur-sm"><div className="text-center"><div className="defense-countdown text-8xl font-semibold text-nova-accent drop-shadow-[0_0_35px_rgba(227,182,75,0.6)]">{countdown}</div><div className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/45">Система активируется</div></div></div>}
      {phaseState === "paused" && <div className="absolute inset-0 z-40 grid place-items-center bg-[#020405]/72 px-5 backdrop-blur-lg"><div className="text-center"><Pause className="mx-auto text-nova-accent" size={34} /><h2 className="mt-5 text-3xl font-semibold">Миссия приостановлена</h2><p className="mt-2 text-sm text-white/40">Цели остановлены. Нажмите пробел или продолжите кнопкой.</p><div className="mt-6 flex justify-center gap-3"><button className="nova-button" onClick={() => setPhase("playing")}><Play size={16} /> Продолжить</button><button className="nova-button-secondary" onClick={finishMission}>Завершить</button></div></div></div>}
      {phaseState === "saving" && <div className="absolute inset-0 z-40 grid place-items-center bg-[#020405]/78 backdrop-blur-xl"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-nova-accent" /><div className="mt-5 text-sm font-semibold">Формирование отчёта...</div><div className="mt-1 text-xs text-white/35">Результат сохраняется отдельно от обычных тестов</div></div></div>}
      {phaseState === "result" && result && <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-[#020405]/78 px-5 py-8 backdrop-blur-xl"><div className="w-full max-w-3xl rounded-[2rem] border border-white/[0.1] bg-[#081012]/92 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.68)] sm:p-9"><div className="text-center"><div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">Mission report</div><h2 className="mt-4 text-2xl font-semibold">Survival · {difficultyCopy[difficulty].title}</h2><div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/[0.06] text-5xl font-semibold text-cyan-200 shadow-[0_0_45px_rgba(83,221,235,0.13)]">{result.grade}</div></div><div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><ResultMetric value={result.score.toLocaleString("ru-RU")} label="Очки" accent /><ResultMetric value={result.wpm} label="WPM" /><ResultMetric value={`${result.accuracy.toFixed(0)}%`} label="Точность" /><ResultMetric value={result.destroyed} label="Уничтожено" /><ResultMetric value={`x${result.maxCombo}`} label="Макс. комбо" /><ResultMetric value={formatTime(result.duration)} label="Время" /></div><div className="mt-5 text-center text-[10px] text-white/35">{adminMode ? "Результат администратора сохранён отдельно и не участвует в рейтинге." : result.isRanked ? "Результат добавлен в игровой рейтинг." : "Результат сохранён как тренировочный."}</div>{saveError && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-center text-xs text-red-200">Сервер не подтвердил сохранение. <button className="font-semibold underline" onClick={retrySave}>Повторить</button></div>}<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button className="nova-button !min-h-12" onClick={() => void startMission()}><RotateCcw size={16} /> Играть снова</button><Link href="/games" className="nova-button-secondary !min-h-12"><Trophy size={16} /> Игровой рейтинг</Link></div><div className="mt-4 text-center text-[9px] uppercase tracking-[0.16em] text-white/25">Enter или Tab — новая миссия</div></div></div>}
    </section>
  </main>;
}

function MissionSetup({
  arena,
  difficulty,
  effectsVolume,
  language,
  loading,
  musicEnabled,
  musicVolume,
  saveError,
  soundEnabled,
  onArenaChange,
  onDifficultyChange,
  onEffectsVolumeChange,
  onLanguageChange,
  onMusicEnabledChange,
  onMusicVolumeChange,
  onSoundEnabledChange,
  onStart,
}: {
  arena: ArenaTheme;
  difficulty: DefenseDifficulty;
  effectsVolume: number;
  language: DefenseLanguage;
  loading: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  saveError: boolean;
  soundEnabled: boolean;
  onArenaChange: (arena: ArenaTheme) => void;
  onDifficultyChange: (difficulty: DefenseDifficulty) => void;
  onEffectsVolumeChange: (volume: number) => void;
  onLanguageChange: (language: DefenseLanguage) => void;
  onMusicEnabledChange: (enabled: boolean) => void;
  onMusicVolumeChange: (volume: number) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
  onStart: () => void;
}) {
  return <div className="absolute inset-0 z-40 overflow-y-auto bg-[#030708]/38 px-4 py-5 backdrop-blur-[3px] sm:px-6 sm:py-8">
    <div className="mx-auto grid min-h-full w-full max-w-6xl place-items-center">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[0.11] bg-[#071012]/88 shadow-[0_45px_140px_rgba(0,0,0,0.68)] backdrop-blur-2xl lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative overflow-hidden border-b border-white/[0.07] p-7 lg:border-b-0 lg:border-r lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(227,182,75,0.13),transparent_36%),linear-gradient(160deg,rgba(255,255,255,0.035),transparent_58%)]" />
          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-nova-accent/20 bg-nova-accent/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-nova-accent"><Shield size={12} /> Mission control</div>
            <div className="mt-8 grid h-16 w-16 place-items-center rounded-2xl border border-nova-accent/25 bg-nova-accent/10 text-nova-accent shadow-[0_0_38px_rgba(227,182,75,0.13)]"><Shield size={29} /></div>
            <h1 className="mt-6 max-w-md text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl">Защита<br /><span className="text-nova-accent">периметра</span></h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/48">Выберите арену и режим. Печатайте падающие цели, создавайте комбо и не позволяйте им пройти критическую линию.</p>
            <div className="mt-8 grid gap-2 text-[11px] text-white/48 sm:grid-cols-3 lg:grid-cols-1">
              <SetupFeature number="01" title="Шесть волн" text="Каждая волна быстрее предыдущей" />
              <SetupFeature number="02" title="Четыре типа целей" text="Быстрые, броня и особые сигнатуры" />
              <SetupFeature number="03" title="Удержать ядро" text="Броня при прорыве отнимает 2 жизни" />
            </div>
            <div className="mt-auto hidden pt-8 text-[9px] uppercase tracking-[0.18em] text-white/20 lg:block">NOVA Defense Systems · Beta 1.2</div>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-end justify-between gap-4"><div><p className="page-eyebrow">Подготовка миссии</p><h2 className="mt-1 text-xl font-semibold">Настройте свою арену</h2></div><div className="nova-badge hidden sm:inline-flex">Настройки сохраняются</div></div>

          <div className="mt-6">
            <SettingLabel title="Арена" hint="Выберите атмосферу боя" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(Object.keys(arenaThemes) as ArenaTheme[]).map((item) => {
                const theme = arenaThemes[item];
                const Icon = theme.icon;
                return <button key={item} type="button" aria-pressed={arena === item} onClick={() => onArenaChange(item)} className={clsx("group relative min-h-24 overflow-hidden rounded-xl border text-left transition duration-200", arena === item ? "border-cyan-300/55 shadow-[0_0_28px_rgba(83,221,235,0.12)]" : "border-white/[0.08] hover:border-white/20")}>
                  <span className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${theme.image})` }} />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#030708] via-[#030708]/45 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 p-2.5"><span><span className="block text-[11px] font-semibold text-white/90">{theme.title}</span><span className="mt-0.5 block text-[8px] text-white/45">{theme.subtitle}</span></span><Icon size={13} className={arena === item ? "text-cyan-200" : "text-white/45"} /></span>
                </button>;
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div><SettingLabel title="Язык" hint="Цели" /><div className="mt-2 grid grid-cols-2 gap-2">{(["en", "ru"] as DefenseLanguage[]).map((item) => <button key={item} type="button" onClick={() => onLanguageChange(item)} className={language === item ? "test-option test-option-active uppercase" : "test-option border border-white/[0.06] uppercase"}>{item}</button>)}</div></div>
            <div><SettingLabel title="Сложность" hint="Темп атаки" /><div className="mt-2 grid grid-cols-3 gap-2">{(["easy", "medium", "hard"] as DefenseDifficulty[]).map((item) => <button key={item} type="button" onClick={() => onDifficultyChange(item)} className={clsx("rounded-xl border px-3 py-2.5 text-left transition", difficulty === item ? "border-nova-accent/35 bg-nova-accent/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/15")}><span className={difficulty === item ? "block text-xs font-semibold text-nova-accent" : "block text-xs font-semibold text-white/72"}>{difficultyCopy[item].title}</span><span className="mt-1 hidden text-[8px] text-white/32 sm:block">{item === "easy" ? "4 жизни" : item === "medium" ? "3 жизни" : "Знаки · 3 жизни"}</span></button>)}</div></div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AudioControl icon={<Music2 size={15} />} title="Музыка" enabled={musicEnabled} volume={musicVolume} onEnabledChange={onMusicEnabledChange} onVolumeChange={onMusicVolumeChange} />
              <AudioControl icon={soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} title="Эффекты" enabled={soundEnabled} volume={effectsVolume} onEnabledChange={onSoundEnabledChange} onVolumeChange={onEffectsVolumeChange} />
            </div>
          </div>

          {saveError && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-center text-xs text-red-200">Не удалось подготовить миссию. Проверьте соединение и попробуйте снова.</div>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button onClick={onStart} disabled={loading} className="nova-button !min-h-12 !flex-1 !rounded-xl"><Gamepad2 size={17} />{loading ? "Подготовка арены..." : "Запустить миссию"}</button><Link href="/games" className="nova-button-secondary !min-h-12 !rounded-xl">Назад</Link></div>
        </section>
      </div>
    </div>
  </div>;
}

function SetupFeature({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.022] p-3"><span className="font-mono text-[9px] text-nova-accent">{number}</span><span><span className="block font-semibold text-white/72">{title}</span><span className="mt-0.5 block text-[9px] text-white/30">{text}</span></span></div>;
}

function targetKindClass(kind: DefenseTargetKind) {
  if (kind === "swift") return "defense-target-swift !border-amber-300/35 text-amber-200";
  if (kind === "armored") return "defense-target-armored !border-sky-300/40 text-sky-200";
  if (kind === "special") return "defense-target-special !border-fuchsia-300/45 text-fuchsia-200";
  return "";
}

function TargetKindIcon({ kind, size = 10 }: { kind: DefenseTargetKind; size?: number }) {
  if (kind === "swift") return <Zap size={size} />;
  if (kind === "armored") return <ShieldCheck size={size} />;
  if (kind === "special") return <Gem size={size} />;
  return <Crosshair size={size} />;
}

function TargetLegend({ kind }: { kind: Exclude<DefenseTargetKind, "normal"> }) {
  return <div className={clsx("rounded-lg border px-1.5 py-2 text-center", kind === "swift" ? "border-amber-300/15 bg-amber-300/[0.05] text-amber-200" : kind === "armored" ? "border-sky-300/15 bg-sky-300/[0.05] text-sky-200" : "border-fuchsia-300/15 bg-fuchsia-300/[0.05] text-fuchsia-200")}><span className="flex justify-center"><TargetKindIcon kind={kind} size={11} /></span><span className="mt-1 block text-[6px] font-bold uppercase tracking-wider">{DEFENSE_TARGETS[kind].shortLabel}</span></div>;
}

function SettingLabel({ title, hint }: { title: string; hint: string }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/45">{title}</span><span className="text-[8px] text-white/22">{hint}</span></div>;
}

function AudioControl({ icon, title, enabled, volume, onEnabledChange, onVolumeChange }: { icon: React.ReactNode; title: string; enabled: boolean; volume: number; onEnabledChange: (enabled: boolean) => void; onVolumeChange: (volume: number) => void }) {
  return <div><div className="flex items-center justify-between"><button type="button" onClick={() => onEnabledChange(!enabled)} className={clsx("flex items-center gap-2 text-[11px] font-semibold transition", enabled ? "text-cyan-200" : "text-white/35")}>{icon}{title}</button><span className="font-mono text-[9px] text-white/28">{enabled ? `${Math.round(volume * 100)}%` : "Выкл"}</span></div><input aria-label={`Громкость: ${title}`} className="defense-volume mt-3 w-full" type="range" min="0" max="100" step="1" disabled={!enabled} value={Math.round(volume * 100)} onChange={(event) => onVolumeChange(clampVolume(Number(event.target.value) / 100))} /></div>;
}

function emptyStats(difficulty: DefenseDifficulty): LiveStats {
  return { score: 0, lives: DEFENSE_CONFIG[difficulty].lives, combo: 0, maxCombo: 0, destroyed: 0, missed: 0, correctChars: 0, errors: 0, elapsedMs: 0 };
}

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
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
