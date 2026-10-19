"use client";

import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { useCapsLock } from "@/hooks/useCapsLock";

export function CapsLockWarning() {
  const capsLockOn = useCapsLock();
  const { t } = useI18n();

  if (!capsLockOn) return null;

  return (
    <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-sm font-medium text-amber-300" role="status" aria-live="polite">
      <TriangleAlert size={17} />
      {t("typing.capsLock")}
    </div>
  );
}
