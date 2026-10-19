"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "next-auth";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Expand, Keyboard, RotateCcw, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { Header } from "@/components/Header";
import { TypingArea } from "@/components/typing/TypingArea";
import { useTypingEngine, type TypingMode } from "@/hooks/useTypingEngine";
import type { TypingStats } from "@/lib/typing";
import type { TestChallenge } from "@/lib/test-challenge";
import { useI18n } from "@/components/LocaleProvider";
import { SpeedStandardCard } from "@/components/SpeedStandardCard";

type Language = "en" | "ru";

interface SavedResult {
  id: string;
  isRanked: boolean;
  wpm: number;
  newPersonalBest: boolean;
  overallAverageWpm: number;
  overallTestsCount: number;
  languageAverageWpm: number;
  languageTestsCount: number;
  assignmentCompleted?: boolean;
}

interface AssignmentPractice {
  id: string;
  title: string;
  text: string;
  language: Language;
}

interface LibraryPractice {
  id: string;
  title: string;
  text: string;
  language: Language;
}

export function TypingPractice({ user, assignment, libraryText, initialChallenge, practiceOnly = false, speedStandard }: { user: User; assignment?: AssignmentPractice; libraryText?: LibraryPractice; initialChallenge: TestChallenge; practiceOnly?: boolean; speedStandard?: { grade: number; bestWpm: number } }) {
  const fixedText = assignment ?? libraryText;
  const { t } = useI18n();
  const [mode, setMode] = useState<TypingMode>(initialChallenge.mode);
  const [duration, setDuration] = useState(initialChallenge.selectedDuration ?? 60);
  const [wordCount, setWordCount] = useState(initialChallenge.wordsCount ?? 25);
  const [language, setLanguage] = useState<Language>(initialChallenge.language);
  const [challenge, setChallenge] = useState(initialChallenge);
  const [sessionKey, setSessionKey] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState(false);

  const loadChallenge = useCallback(async (nextMode: TypingMode, nextLanguage: Language, nextDuration: number, nextWordCount: number) => {
    if (challengeLoading) return;
    setChallengeLoading(true);
    setChallengeError(false);
    try {
      const response = await fetch("/api/tests/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment ? { assignmentId: assignment.id } : libraryText ? { textId: libraryText.id } : {
          mode: nextMode,
          language: nextLanguage,
          selectedDuration: nextMode === "time" ? nextDuration : undefined,
          wordsCount: nextMode === "words" ? nextWordCount : undefined,
        }),
      });
      if (!response.ok) throw new Error("challenge_failed");
      const nextChallenge = await response.json() as TestChallenge;
      setMode(nextChallenge.mode);
      setLanguage(nextChallenge.language);
      setDuration(nextChallenge.selectedDuration ?? nextDuration);
      setWordCount(nextChallenge.wordsCount ?? nextWordCount);
      setChallenge(nextChallenge);
      setSessionKey((key) => key + 1);
    } catch {
      setChallengeError(true);
    } finally {
      setChallengeLoading(false);
    }
  }, [assignment, challengeLoading, libraryText]);

  const restart = useCallback(() => {
    void loadChallenge(mode, language, duration, wordCount);
  }, [duration, language, loadChallenge, mode, wordCount]);

  function changeMode(next: TypingMode) {
    void loadChallenge(next, language, duration, wordCount);
  }

  function changeLanguage(next: Language) {
    void loadChallenge(mode, next, duration, wordCount);
  }

  function changeDuration(next: number) {
    void loadChallenge(mode, language, next, wordCount);
  }

  function changeWordCount(next: number) {
    void loadChallenge(mode, language, duration, next);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-28 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-nova-accent/[0.035] blur-3xl" />
      <Header user={user} hidden={focusMode} />
      <main className={clsx("relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-5 pb-8", focusMode ? "justify-center pt-8" : "pt-10 sm:pt-14")}>
        {challengeError && <div className="mb-5 w-full max-w-3xl rounded-xl border border-nova-error/25 bg-nova-error/5 px-4 py-3 text-center text-xs text-nova-error">Не удалось подготовить новый текст. Проверьте соединение и попробуйте ещё раз.</div>}
        <TypingSession
          key={sessionKey}
          mode={mode}
          duration={duration}
          wordCount={wordCount}
          language={language}
          expectedText={challenge.expectedText}
          challengeToken={challenge.token}
          clientAttemptId={challenge.clientAttemptId}
          assignmentId={assignment?.id}
          textId={libraryText?.id}
          practiceOnly={practiceOnly}
          speedStandard={speedStandard}
          restart={restart}
          controls={
            <>{speedStandard && <SpeedStandardCard grade={speedStandard.grade} bestWpm={speedStandard.bestWpm} compact className="mb-4" />}{fixedText ? <div className="data-card mb-14 w-full max-w-3xl p-5 text-center sm:mb-20"><Link href={assignment ? "/assignments" : "/texts"} className="mb-2 inline-flex items-center gap-1 text-xs text-nova-muted transition hover:text-nova-text"><ArrowLeft size={13} /> {assignment ? t("typing.backAssignments") : t("typing.backTexts")}</Link><div className="text-sm font-semibold">{fixedText.title}</div><div className="mt-1 text-xs uppercase tracking-[0.14em] text-nova-accent">{t(`language.${fixedText.language}`)} · {t("typing.text")}</div></div> : <TestControls
              mode={mode}
              duration={duration}
              wordCount={wordCount}
              language={language}
              changeMode={changeMode}
              changeDuration={changeDuration}
              changeWordCount={changeWordCount}
              changeLanguage={changeLanguage}
              disabled={challengeLoading}
            />}</>
          }
        />
      </main>
      {!focusMode && (
        <div className="relative z-10 mx-auto flex w-full max-w-[1120px] items-center justify-end gap-3 px-5 pb-7 text-nova-muted">
          <span className="hidden items-center gap-2 text-[11px] sm:flex"><Keyboard size={15} /> {t("typing.restartHint")}</span>
          <button className="icon-button" onClick={() => setSoundEnabled((value) => !value)} aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button className="icon-button" onClick={() => setFocusMode(true)} aria-label="Focus mode"><Expand size={17} /></button>
          <button className="icon-button" onClick={toggleFullscreen} aria-label="Fullscreen"><Expand size={17} /></button>
        </div>
      )}
      {focusMode && <button className="fixed right-5 top-5 text-xs text-nova-muted hover:text-nova-text" onClick={() => setFocusMode(false)}>{t("typing.exitFocus")}</button>}
    </div>
  );
}

function TestControls(props: {
  mode: TypingMode;
  duration: number;
  wordCount: number;
  language: Language;
  changeMode: (mode: TypingMode) => void;
  changeDuration: (duration: number) => void;
  changeWordCount: (count: number) => void;
  changeLanguage: (language: Language) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-16 flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/[0.07] bg-[#141718]/90 p-1.5 text-[11px] font-medium shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:mb-20">
      {(["time", "words", "text"] as TypingMode[]).map((item) => (
        <button key={item} disabled={props.disabled} onClick={() => props.changeMode(item)} className={clsx("test-option capitalize", props.mode === item && "test-option-active")}>{t(`typing.${item}`)}</button>
      ))}
      <span className="mx-1 h-5 w-px bg-white/8" />
      {(props.mode === "time" ? [15, 30, 60, 120] : props.mode === "words" ? [10, 25, 50, 100] : []).map((value) => (
        <button key={value} disabled={props.disabled} onClick={() => props.mode === "time" ? props.changeDuration(value) : props.changeWordCount(value)} className={clsx("test-option", (props.mode === "time" ? props.duration : props.wordCount) === value && "test-option-active")}>{value}{props.mode === "time" ? "s" : ""}</button>
      ))}
      <span className="mx-1 h-5 w-px bg-white/8" />
      {(["en", "ru"] as Language[]).map((item) => (
        <button key={item} disabled={props.disabled} onClick={() => props.changeLanguage(item)} className={clsx("test-option uppercase", props.language === item && "test-option-active")}>{item}</button>
      ))}
    </div>
  );
}

function TypingSession(props: {
  mode: TypingMode;
  duration: number;
  wordCount: number;
  language: Language;
  expectedText: string;
  challengeToken: string;
  clientAttemptId: string;
  assignmentId?: string;
  textId?: string;
  practiceOnly: boolean;
  speedStandard?: { grade: number; bestWpm: number };
  restart: () => void;
  controls: React.ReactNode;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState<SavedResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastResultRef = useRef<(TypingStats & { pasteDetected: boolean; typedText: string }) | null>(null);

  const persistResult = useCallback(async (finalStats: TypingStats & { pasteDetected: boolean; typedText: string }) => {
    setSaving(true);
    setSaveError(false);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: props.mode,
            assignmentId: props.assignmentId,
            textId: props.textId,
            challengeToken: props.challengeToken,
            clientAttemptId: props.clientAttemptId,
            language: props.language,
            selectedDuration: props.mode === "time" ? props.duration : undefined,
            wordsCount: props.mode === "words" ? props.wordCount : undefined,
            expectedText: props.expectedText,
            typedText: finalStats.typedText,
            duration: finalStats.timeElapsed,
            focusLostCount: finalStats.focusLostCount,
            pasteDetected: finalStats.pasteDetected,
          }),
        });
        if (!response.ok) throw new Error("save_failed");
        setSaved((await response.json()) as SavedResult);
        setSaving(false);
        return;
      } catch {
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    setSaving(false);
    setSaveError(true);
  }, [props.assignmentId, props.challengeToken, props.clientAttemptId, props.duration, props.expectedText, props.language, props.mode, props.textId, props.wordCount]);

  const saveResult = useCallback((finalStats: TypingStats & { pasteDetected: boolean; typedText: string }) => {
    lastResultRef.current = finalStats;
    void persistResult(finalStats);
  }, [persistResult]);

  const retrySave = useCallback(() => {
    if (lastResultRef.current && !saving) void persistResult(lastResultRef.current);
  }, [persistResult, saving]);

  const { typed, status, timeLeft, stats } = useTypingEngine({
    expectedText: props.expectedText,
    mode: props.mode,
    durationLimit: props.duration,
    onFinish: props.practiceOnly ? undefined : saveResult,
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (status === "finished" && event.key === "Enter") {
        event.preventDefault();
        props.restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props, status]);

  if (status === "finished") {
    return (
      <section className="flex w-full flex-1 flex-col items-center justify-center pb-24 text-center">
        {saved?.newPersonalBest && <div className="mb-5 flex items-center gap-2 rounded-full border border-nova-accent/30 bg-nova-accent/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-nova-accent"><CheckCircle2 size={15} /> {t("typing.newBest")}</div>}
        <div className="bg-gradient-to-b from-[#f3ce72] to-nova-accent bg-clip-text text-[clamp(5rem,12vw,8.5rem)] font-semibold leading-none tracking-[-0.06em] text-transparent drop-shadow-[0_12px_34px_rgba(227,182,75,0.16)]">{stats.wpm}</div>
        <div className="mt-2 text-sm uppercase tracking-[0.25em] text-nova-muted">{t("typing.wpm")}</div>
        <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:grid-cols-4">
          <ResultMetric value={`${stats.accuracy.toFixed(0)}%`} label={t("typing.accuracy")} />
          <ResultMetric value={stats.rawWpm} label={t("typing.rawWpm")} />
          <ResultMetric value={stats.incorrectChars + stats.extraChars} label={t("typing.errors")} error />
          <ResultMetric value={`${stats.timeElapsed.toFixed(1)}s`} label={t("typing.timeLabel")} />
        </div>
        {saved && <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-3"><LiveMetric value={saved.overallAverageWpm} label={`Overall average · ${saved.overallTestsCount} tests`} /><LiveMetric value={saved.languageAverageWpm} label={`${props.language.toUpperCase()} average · ${saved.languageTestsCount} tests`} /></div>}
        {saved && props.speedStandard && <SpeedStandardCard grade={props.speedStandard.grade} bestWpm={Math.max(props.speedStandard.bestWpm, saved.wpm)} compact className="mt-5" />}
        <p className={clsx("mt-5 text-xs", saved ? "text-emerald-400" : saveError ? "text-nova-error" : "text-nova-muted")}>{props.practiceOnly ? "Режим администратора: результат не сохраняется." : saved ? (props.assignmentId ? (saved.assignmentCompleted ? t("typing.assignmentDone") : t("typing.assignmentImprove")) : saved.isRanked ? `${t("typing.savedRanked")} · ${props.language.toUpperCase()}` : t("typing.savedPractice")) : saveError ? t("typing.saveFailed") : saving ? t("typing.saving") : "..."}</p>
        {saveError && <button className="mt-3 text-xs font-medium text-nova-accent hover:text-nova-text" onClick={retrySave}>{t("typing.retrySave")}</button>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={props.restart} className="nova-button"><RotateCcw size={16} /> {t("typing.tryAgain")}</button>
          {props.assignmentId && <Link href="/assignments" className="nova-button-secondary">{t("typing.backAssignments")}</Link>}
          {saved && <Link href={`/results/${saved.id}`} className="nova-button-secondary">{t("typing.viewResult")}</Link>}
        </div>
      </section>
    );
  }

  return (
    <>
      {status === "idle" && props.controls}
      <section className="flex w-full flex-1 flex-col items-center">
        <TypingArea expectedText={props.expectedText} typedText={typed} status={status} />
        <div className="mt-14 text-center sm:mt-18">
          <div className="font-mono text-5xl font-medium tracking-[-0.05em] text-nova-text">{props.mode === "time" ? timeLeft : Math.max(0, props.wordCount - typed.trim().split(/\s+/).filter(Boolean).length)}</div>
          <div className="mt-2 h-4 text-[11px] text-nova-muted">{status === "idle" ? t("typing.typeToStart") : ""}</div>
        </div>
        <div className="mt-8 grid w-full max-w-[520px] grid-cols-3 gap-3 sm:mt-12">
          <LiveMetric value={stats.wpm} label={t("typing.wpm")} />
          <LiveMetric value={`${stats.accuracy.toFixed(0)}%`} label={t("typing.accuracy")} />
          <LiveMetric value={stats.incorrectChars + stats.extraChars} label={t("typing.errors")} />
        </div>
      </section>
    </>
  );
}

function LiveMetric({ value, label }: { value: string | number; label: string }) {
  return <div className="data-card px-4 py-3.5 text-center"><div className="text-lg font-semibold text-nova-text">{value}</div><div className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-nova-muted">{label}</div></div>;
}

function ResultMetric({ value, label, error = false }: { value: string | number; label: string; error?: boolean }) {
  return <div className="bg-[#15181a] px-5 py-6"><div className={clsx("text-2xl font-semibold", error ? "text-nova-error" : "text-nova-text")}>{value}</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-nova-muted">{label}</div></div>;
}
