"use client";

import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import type { TypingStatus } from "@/hooks/useTypingEngine";

interface TypingAreaProps {
  expectedText: string;
  typedText: string;
  status: TypingStatus;
}

export function TypingArea({ expectedText, typedText, status }: TypingAreaProps) {
  const expectedChars = useMemo(() => expectedText.split(""), [expectedText]);
  const currentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [typedText.length]);

  return (
    <div
      className="typing-window relative w-full overflow-hidden outline-none"
      tabIndex={0}
      role="textbox"
      aria-label="Typing test. Start typing to begin."
      aria-readonly="true"
    >
      <div className="typing-copy select-none break-words text-center font-mono text-[clamp(1.35rem,2.2vw,2rem)] leading-[1.6] tracking-[0.025em]">
        {expectedChars.map((char, index) => {
          const typedChar = typedText[index];
          const isTyped = index < typedText.length;
          const isCorrect = isTyped && typedChar === char;
          const isIncorrect = isTyped && typedChar !== char;
          const isCurrent = index === typedText.length && status !== "finished";

          return (
            <span
              key={`${index}-${char}`}
              ref={isCurrent ? currentRef : undefined}
              className={clsx(
                "relative transition-colors duration-100",
                !isTyped && "text-[#5b5d60]",
                isCorrect && "text-nova-text",
                isIncorrect && "text-nova-error",
              )}
            >
              {char === " " && isIncorrect ? "_" : char}
              {isCurrent && <span aria-hidden className="nova-caret absolute left-0 top-[10%] h-[80%] w-[2px] bg-nova-accent" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
