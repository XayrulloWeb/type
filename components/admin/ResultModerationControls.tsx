"use client";

import { useFormStatus } from "react-dom";
import { RotateCcw, ShieldX } from "lucide-react";
import { reviewResult } from "@/app/admin/review/actions";
import { MINIMUM_RANKED_ACCURACY } from "@/lib/typing";

interface ResultModerationControlsProps {
  resultId: string;
  isRanked: boolean;
  reviewStatus: string | null;
  wpm: number;
  accuracy: number;
}

export function ResultModerationControls({ resultId, isRanked, reviewStatus, wpm, accuracy }: ResultModerationControlsProps) {
  if (!isRanked && accuracy < MINIMUM_RANKED_ACCURACY) {
    return <div className="text-right text-xs text-amber-300">Автоматически исключён<br /><span className="text-[10px] text-nova-muted">минимум {MINIMUM_RANKED_ACCURACY}% точности</span></div>;
  }
  if (!isRanked) {
    const label = reviewStatus === "rejected" ? "Вернуть в рейтинг" : "Одобрить";
    return <form
      action={reviewResult}
      onSubmit={(event) => {
        if (!window.confirm(`${label} результат ${wpm} WPM?`)) event.preventDefault();
      }}
      className="flex justify-end"
    >
      <input type="hidden" name="id" value={resultId} />
      <input type="hidden" name="decision" value="approved" />
      <input type="hidden" name="reason" value="manual_review" />
      <ActionButton label={label} icon={<RotateCcw size={13} />} />
    </form>;
  }

  return <form
    action={reviewResult}
    onSubmit={(event) => {
      if (!window.confirm(`Аннулировать результат ${wpm} WPM? Он перестанет учитываться в рейтинге и статистике.`)) event.preventDefault();
    }}
    className="flex min-w-[305px] items-center justify-end gap-2"
  >
    <input type="hidden" name="id" value={resultId} />
    <input type="hidden" name="decision" value="rejected" />
    <select name="reason" defaultValue="suspicious_speed" aria-label="Причина аннулирования" className="nova-input h-9 min-w-0 py-1.5 text-xs">
      <option value="suspicious_speed">Подозрительная скорость</option>
      <option value="technical_error">Ошибка или баг</option>
      <option value="rules_violation">Нарушение правил</option>
      <option value="other">Другая причина</option>
    </select>
    <ActionButton label="Аннулировать" danger icon={<ShieldX size={13} />} />
  </form>;
}

function ActionButton({ label, icon, danger = false }: { label: string; icon: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button
    type="submit"
    disabled={pending}
    className={danger
      ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 text-xs font-medium text-red-300 transition hover:border-red-500/35 hover:bg-red-500/[0.12] disabled:cursor-wait disabled:opacity-50"
      : "nova-button-secondary h-9 shrink-0 px-3 text-xs disabled:cursor-wait disabled:opacity-50"}
  >
    {icon}
    {pending ? "Сохранение…" : label}
  </button>;
}
