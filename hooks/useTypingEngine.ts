"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateTypingStats, type TypingStats } from "@/lib/typing";
import { normalizeTypingKey, typingCharacters } from "@/lib/typing-text";

export type TypingStatus = "idle" | "running" | "finished";
export type TypingMode = "time" | "words" | "text";

interface TypingEngineOptions {
  expectedText: string;
  mode: TypingMode;
  durationLimit?: number;
  onFinish?: (stats: TypingStats & { pasteDetected: boolean; typedText: string }) => void;
}

export function useTypingEngine({
  expectedText,
  mode,
  durationLimit = 60,
  onFinish,
}: TypingEngineOptions) {
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<TypingStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(durationLimit);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [pasteDetected, setPasteDetected] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const submittedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const expectedLength = useMemo(() => typingCharacters(expectedText).length, [expectedText]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    endTimeRef.current = Date.now();
    if (startTimeRef.current !== null) {
      setTimeElapsed((endTimeRef.current - startTimeRef.current) / 1000);
    }
    setStatus("finished");
  }, []);

  useEffect(() => {
    if (status !== "running" || startTimeRef.current === null) return;

    const updateClock = () => {
      const elapsed = (Date.now() - (startTimeRef.current ?? Date.now())) / 1000;
      setTimeElapsed(elapsed);

      if (mode === "time") {
        const remaining = Math.max(0, Math.ceil(durationLimit - elapsed));
        setTimeLeft(remaining);
        if (elapsed >= durationLimit) finish();
      }
    };

    updateClock();
    const timer = window.setInterval(updateClock, 100);
    return () => window.clearInterval(timer);
  }, [durationLimit, finish, mode, status]);

  const stats = useMemo(
    () =>
      calculateTypingStats({
        expectedText,
        typedText: typed,
        durationSeconds: timeElapsed,
        countMissed: status === "finished" && mode !== "time",
        focusLostCount,
      }),
    [expectedText, focusLostCount, mode, status, timeElapsed, typed],
  );

  useEffect(() => {
    if (status !== "finished" || submittedRef.current) return;
    submittedRef.current = true;
    onFinishRef.current?.({ ...stats, pasteDetected, typedText: typed });
  }, [pasteDetected, stats, status, typed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        setPasteDetected(true);
        return;
      }

      if (event.key === "Escape" && status === "running") {
        event.preventDefault();
        finish();
        return;
      }

      if (status === "finished") return;

      if (event.key === "Backspace") {
        event.preventDefault();
        setTyped((current) => typingCharacters(current).slice(0, -1).join(""));
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const input = normalizeTypingKey(event.key);
      if (!input) return;

      event.preventDefault();
      if (status === "idle") {
        startTimeRef.current = Date.now();
        setStatus("running");
      }

      setTyped((current) => {
        const nextChars = [...typingCharacters(current), ...typingCharacters(input)];
        if (mode !== "time" && nextChars.length >= expectedLength) {
          window.setTimeout(finish, 0);
          return nextChars.slice(0, expectedLength).join("");
        }
        return nextChars.join("");
      });
    };

    const blockTransfer = (event: Event) => {
      event.preventDefault();
      setPasteDetected(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", blockTransfer);
    window.addEventListener("drop", blockTransfer);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", blockTransfer);
      window.removeEventListener("drop", blockTransfer);
    };
  }, [expectedLength, finish, mode, status]);

  useEffect(() => {
    const handleBlur = () => {
      if (status === "running") setFocusLostCount((count) => count + 1);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [status]);

  const reset = useCallback(() => {
    finishedRef.current = false;
    submittedRef.current = false;
    startTimeRef.current = null;
    endTimeRef.current = null;
    setTyped("");
    setStatus("idle");
    setTimeLeft(durationLimit);
    setTimeElapsed(0);
    setFocusLostCount(0);
    setPasteDetected(false);
  }, [durationLimit]);

  return { typed, status, timeLeft, stats, reset, pasteDetected };
}
