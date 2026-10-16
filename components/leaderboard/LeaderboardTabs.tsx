"use client";

import Link from "next/link";
import type { LanguageFilter, Period } from "@/lib/leaderboard";
import { useI18n } from "@/components/LocaleProvider";

export function LeaderboardTabs({ active, period, language }: { active: "class" | "school" | "classes"; period: Period; language: LanguageFilter }) {
  const { t } = useI18n();
  const typeLabels = { class: t("leaderboard.myClass"), school: t("leaderboard.school"), classes: t("leaderboard.classes") };
  const periodLabels = { today: t("leaderboard.today"), week: t("leaderboard.week"), month: t("leaderboard.month"), all: t("leaderboard.allTime") };
  return (
    <div className="data-card mb-8 flex flex-col gap-3 p-2.5 lg:flex-row lg:items-center lg:justify-between">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Leaderboard type">
        {[
          ["class", typeLabels.class],
          ["school", typeLabels.school],
          ["classes", typeLabels.classes],
        ].map(([key, label]) => (
          <Link key={key} href={`/leaderboard/${key}?period=${period}&language=${language}`} className={key === active ? "test-option test-option-active" : "test-option"}>{label}</Link>
        ))}
      </nav>
      <nav className="flex gap-1 overflow-x-auto" aria-label="Leaderboard period">
        {(["today", "week", "month", "all"] as Period[]).map((value) => (
          <Link key={value} href={`/leaderboard/${active}?period=${value}&language=${language}`} className={value === period ? "test-option test-option-active" : "test-option"}>{periodLabels[value]}</Link>
        ))}
      </nav>
      <nav className="flex gap-1 overflow-x-auto" aria-label="Leaderboard language">
        {(["all", "ru", "en"] as LanguageFilter[]).map((value) => (
          <Link key={value} href={`/leaderboard/${active}?period=${period}&language=${value}`} className={value === language ? "test-option test-option-active" : "test-option"}>{value === "all" ? t("leaderboard.allLanguages") : value.toUpperCase()}</Link>
        ))}
      </nav>
    </div>
  );
}
