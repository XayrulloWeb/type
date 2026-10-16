import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, Clock3, Play } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { getI18n } from "@/lib/i18n";

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/assignments");
  const [{ t }, student] = await Promise.all([getI18n(), prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true, isActive: true } })]);
  if (!student?.isActive) redirect("/login");
  const assignments = student.classId ? await prisma.assignment.findMany({
    where: { classId: student.classId, isActive: true, text: { language: { in: ["ru", "en"] } } },
    include: { text: true, results: { where: { userId: session.user.id } } },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  }) : [];

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell">
    <p className="page-eyebrow">{t("assignment.eyebrow")}</p>
    <h1 className="page-title">{t("assignment.title")}</h1>
    <p className="page-subtitle">{t("assignment.subtitle")}</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2">{assignments.map((item) => {
      const result = item.results[0];
      const complete = result?.status === "completed";
      const overdue = Boolean(item.deadline && item.deadline < new Date() && !complete);
      return <article className="data-card flex flex-col p-6" key={item.id}>
        <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-nova-accent">{t(`language.${item.text.language}`)} · {t(`difficulty.${item.text.difficulty}`)}</div><h2 className="mt-2 text-xl font-semibold">{item.title}</h2></div>{complete ? <CheckCircle2 className="shrink-0 text-emerald-400" size={22} /> : <Clock3 className={overdue ? "shrink-0 text-nova-error" : "shrink-0 text-nova-muted"} size={22} />}</div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-nova-muted">{item.text.content}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-nova-muted"><span>{item.minimumWpm ? `${item.minimumWpm}+ WPM` : t("assignment.anySpeed")}</span><span>·</span><span>{item.minimumAccuracy ? `${item.minimumAccuracy}%+` : t("assignment.anyAccuracy")}</span></div>
        <div className="mt-auto flex items-end justify-between gap-4 pt-6"><div className={overdue ? "text-xs text-nova-error" : "text-xs text-nova-muted"}>{item.deadline ? `${overdue ? t("assignment.overdue") : t("assignment.due")} ${format(item.deadline, "dd MMM · HH:mm")}` : t("common.noDeadline")}</div><Link className={complete ? "nova-button-secondary" : "nova-button"} href={`/assignments/${item.id}`}><Play size={14} /> {complete ? t("assignment.retry") : t("assignment.start")}</Link></div>
      </article>;
    })}{assignments.length === 0 && <div className="data-card p-14 text-center text-nova-muted md:col-span-2">{t("assignment.empty")}</div>}</div>
  </main></div>;
}
