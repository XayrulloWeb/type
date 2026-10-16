import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RotateCcw, Trophy } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { getI18n } from "@/lib/i18n";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const result = await prisma.testResult.findUnique({ where: { id }, include: { user: true } });
  if (!result || !["ru", "en"].includes(result.language) || (result.userId !== session.user.id && session.user.role !== "SUPER_ADMIN")) notFound();
  const previousBetter = result.isRanked ? await prisma.testResult.count({ where: { userId: result.userId, isRanked: true, language: { in: ["ru", "en"] }, createdAt: { lt: result.createdAt }, wpm: { gte: result.wpm } } }) : 1;
  const { t } = await getI18n();

  return <div className="min-h-screen"><Header user={session.user} /><main className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 py-14 text-center sm:px-8">
    {previousBetter === 0 && <div className="mb-5 flex items-center gap-2 rounded-full border border-nova-accent/30 bg-nova-accent/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-nova-accent"><Trophy size={15} /> {t("result.personalBest")}</div>}
    <div className="bg-gradient-to-b from-[#f3ce72] to-nova-accent bg-clip-text text-[clamp(5rem,14vw,9rem)] font-semibold leading-none tracking-[-0.065em] text-transparent drop-shadow-[0_16px_40px_rgba(227,182,75,0.18)]">{result.wpm}</div><div className="mt-2 text-sm uppercase tracking-[0.25em] text-nova-muted">{t("typing.wpm")}</div>
    <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={`${result.accuracy.toFixed(0)}%`} label={t("typing.accuracy")} /><Metric value={result.rawWpm} label={t("typing.rawWpm")} /><Metric value={result.incorrectChars + result.extraChars} label={t("typing.errors")} error /><Metric value={`${result.duration}s`} label={t("typing.timeLabel")} /></div>
    <div className="data-card mt-5 grid w-full grid-cols-2 gap-px overflow-hidden bg-white/[0.06] text-left sm:grid-cols-4"><Small value={`${result.correctChars} / ${result.incorrectChars} / ${result.extraChars} / ${result.missedChars}`} label={t("result.characters")} wide /><Small value={result.language.toUpperCase()} label={t("common.language")} /><Small value={t(`typing.${result.mode}`)} label={t("result.mode")} /></div>
    <div className={`mt-5 rounded-full px-4 py-2 text-xs ${result.isRanked ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-nova-muted"}`}>{result.isRanked ? t("result.ranked") : t("result.notRanked")}</div>
    <div className="mt-9 flex gap-3"><Link className="nova-button" href="/typing"><RotateCcw size={16} /> {t("typing.tryAgain")}</Link><Link className="nova-button-secondary" href="/leaderboard/class">{t("leaderboard.title")}</Link></div>
  </main></div>;
}

function Metric({ value, label, error = false }: { value: string | number; label: string; error?: boolean }) { return <div className="data-card p-5"><div className={`text-2xl font-semibold ${error ? "text-nova-error" : "text-nova-text"}`}>{value}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-nova-muted">{label}</div></div>; }
function Small({ value, label, wide = false }: { value: string | number; label: string; wide?: boolean }) { return <div className={`bg-[#15181a] p-4 ${wide ? "col-span-2" : ""}`}><div className="text-sm font-medium text-nova-text">{value}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-nova-muted">{label}</div></div>; }
