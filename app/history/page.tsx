import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { getI18n } from "@/lib/i18n";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const adminMode = session.user.role === "SUPER_ADMIN";
  const [tests, { t }] = await Promise.all([prisma.testResult.findMany({ where: { userId: session.user.id, language: { in: ["ru", "en"] } }, orderBy: { createdAt: "desc" }, take: 100 }), getI18n()]);

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell"><p className="page-eyebrow">{t("history.eyebrow")}</p><h1 className="page-title">{t("history.title")}</h1><p className="page-subtitle mb-8">{t("history.subtitle")}</p>
    <div className="data-card overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">{t("history.date")}</th><th className="p-4">{t("history.mode")}</th><th className="p-4 text-right">WPM</th><th className="p-4 text-right">{t("typing.accuracy")}</th><th className="p-4 text-right">{t("history.status")}</th></tr></thead><tbody className="divide-y divide-white/5">{tests.map((test) => <tr key={test.id} className="hover:bg-white/[0.025]"><td className="p-4"><Link href={`/results/${test.id}`} className="font-medium hover:text-nova-accent">{format(test.createdAt, "dd.MM.yyyy · HH:mm")}</Link></td><td className="p-4 text-nova-muted">{t(`typing.${test.mode}`)} · {test.language.toUpperCase()} · {test.duration}s</td><td className="p-4 text-right font-semibold text-nova-accent">{test.wpm}</td><td className="p-4 text-right text-nova-muted">{test.accuracy.toFixed(0)}%</td><td className="p-4 text-right"><span className={adminMode || test.isRanked ? "text-emerald-400" : "text-nova-muted"}>{adminMode ? t("history.adminPersonal") : test.isRanked ? t("history.ranked") : t("history.notRanked")}</span></td></tr>)}{tests.length === 0 && <tr><td colSpan={5} className="p-16 text-center text-nova-muted">{t("history.empty")}</td></tr>}</tbody></table></div>
  </main></div>;
}
