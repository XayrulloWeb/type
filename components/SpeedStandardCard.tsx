"use client";

import { Gauge, Target } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/components/LocaleProvider";
import { getSpeedStandard } from "@/lib/speed-standard";

export function SpeedStandardCard({ grade, bestWpm, compact = false, className }: { grade: number; bestWpm: number; compact?: boolean; className?: string }) {
  const { t } = useI18n();
  const standard = getSpeedStandard(grade);
  const progress = Math.min(100, Math.max(0, (bestWpm / standard.excellent) * 100));
  const level = bestWpm === 0
    ? { label: t("speedStandard.noResults"), tone: "text-nova-muted border-white/[0.08] bg-white/[0.03]" }
    : bestWpm < standard.minimum
      ? { label: t("speedStandard.belowMinimum"), tone: "text-nova-error border-nova-error/20 bg-nova-error/[0.06]" }
      : bestWpm < standard.average
        ? { label: t("speedStandard.minimumLevel"), tone: "text-amber-300 border-amber-300/20 bg-amber-300/[0.06]" }
        : bestWpm < standard.excellent
          ? { label: t("speedStandard.averageLevel"), tone: "text-sky-300 border-sky-300/20 bg-sky-300/[0.06]" }
          : { label: t("speedStandard.excellentLevel"), tone: "text-emerald-300 border-emerald-300/20 bg-emerald-300/[0.06]" };
  const next = bestWpm < standard.minimum
    ? { value: standard.minimum, label: t("speedStandard.minimum") }
    : bestWpm < standard.average
      ? { value: standard.average, label: t("speedStandard.average") }
      : bestWpm < standard.excellent
        ? { value: standard.excellent, label: t("speedStandard.excellent") }
        : null;

  return (
    <section className={clsx("data-card w-full max-w-3xl", compact ? "p-4" : "p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-nova-accent/20 bg-nova-accent/[0.07] text-nova-accent"><Gauge size={18} /></span>
          <div>
            <div className="text-sm font-semibold text-nova-text">{t("speedStandard.title")} · {grade} {t("speedStandard.grade")}</div>
            {!compact && <p className="mt-1 text-xs leading-5 text-nova-muted">{t("speedStandard.description")}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <span className="text-2xl font-semibold text-nova-text">{bestWpm || "—"}</span>
          <span className="text-[9px] uppercase tracking-[0.14em] text-nova-muted">{t("speedStandard.bestWpm")}</span>
          <span className={clsx("ml-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold", level.tone)}>{level.label}</span>
        </div>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-nova-accent to-emerald-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          {[standard.minimum, standard.average].map((value) => <span key={value} className="absolute top-0 h-full w-px bg-nova-bg/80" style={{ left: `${(value / standard.excellent) * 100}%` }} />)}
        </div>
        <div className="mt-2 grid grid-cols-3 text-[9px] uppercase tracking-[0.1em] text-nova-muted">
          <div><span className="block text-nova-text">{standard.minimum} WPM</span>{t("speedStandard.minimum")}</div>
          <div className="text-center"><span className="block text-nova-text">{standard.average} WPM</span>{t("speedStandard.average")}</div>
          <div className="text-right"><span className="block text-nova-text">{standard.excellent}+ WPM</span>{t("speedStandard.excellent")}</div>
        </div>
      </div>

      {!compact && <div className="mt-4 flex items-center gap-2 text-xs text-nova-muted"><Target size={14} className="text-nova-accent" />{next ? <>{t("speedStandard.nextLevel")} <b className="text-nova-text">{next.label} · +{next.value - bestWpm} WPM</b></> : <b className="text-emerald-300">{t("speedStandard.excellentReached")}</b>}</div>}
    </section>
  );
}
