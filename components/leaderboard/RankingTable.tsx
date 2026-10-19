"use client";

import type { StudentRanking } from "@/lib/leaderboard";
import { useI18n } from "@/components/LocaleProvider";

export function RankingTable({ results, currentUserId, showClass = false }: { results: StudentRanking[]; currentUserId: string; showClass?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="data-card overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-white/6 text-[10px] uppercase tracking-[0.12em] text-nova-muted">
          <tr>
            <th className="px-5 py-4 text-center">#</th>
            <th className="px-5 py-4">{t("leaderboard.student")}</th>
            {showClass && <th className="px-5 py-4">{t("common.class")}</th>}
            <th className="px-5 py-4 text-right">{t("leaderboard.bestWpm")}</th>
            <th className="px-5 py-4 text-right">{t("leaderboard.avgWpm")}</th>
            <th className="px-5 py-4 text-right">{t("typing.accuracy")}</th>
            <th className="px-5 py-4 text-right">{t("leaderboard.tests")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {results.map((result, index) => (
            <tr key={result.userId} className={result.userId === currentUserId ? "bg-nova-accent/6" : "hover:bg-white/[0.025]"}>
              <td className="px-5 py-4 text-center"><span className={index < 3 ? "inline-grid h-6 w-6 place-items-center rounded-full bg-nova-accent/12 text-[11px] font-bold text-nova-accent" : "text-nova-muted"}>{index + 1}</span></td>
              <td className="px-5 py-4 font-medium text-nova-text">{result.user.firstName} {result.user.lastName}{result.userId === currentUserId && <span className="ml-2 text-[10px] text-nova-accent">{t("leaderboard.you")}</span>}</td>
              {showClass && <td className="px-5 py-4 text-nova-muted">{result.user.class?.name ?? "—"}</td>}
              <td className="px-5 py-4 text-right font-semibold text-nova-accent">{result.bestWpm}</td>
              <td className="px-5 py-4 text-right text-nova-text">{result.averageWpm}</td>
              <td className="px-5 py-4 text-right text-nova-muted">{result.averageAccuracy.toFixed(0)}%</td>
              <td className="px-5 py-4 text-right text-nova-muted">{result.testsCount}</td>
            </tr>
          ))}
          {results.length === 0 && <tr><td colSpan={showClass ? 7 : 6} className="px-6 py-16 text-center text-nova-muted">{t("leaderboard.empty")}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
