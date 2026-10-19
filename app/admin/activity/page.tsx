import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n";
import { requireSuperAdminPage } from "@/lib/admin";

const actionLabels: Record<string, string> = {
  "student.created": "Student created",
  "student.updated": "Student updated",
  "student.activated": "Student activated",
  "student.blocked": "Student blocked",
  "student.archived": "Student archived",
  "student.deleted": "Student deleted",
  "student.password_reset": "Password reset",
  "student.password_viewed": "Password viewed",
  "class.created": "Class created",
  "assignment.created": "Assignment created",
  "assignment.archived": "Assignment archived",
  "result.approved": "Result approved",
  "result.rejected": "Result rejected",
  "result.annulled": "Результат аннулирован",
  "result.restored": "Результат возвращён",
};

export default async function ActivityPage() {
  await requireSuperAdminPage();
  const [activities, { locale }] = await Promise.all([prisma.adminActivity.findMany({ orderBy: { createdAt: "desc" }, take: 300 }), getI18n()]);
  const ui = locale === "uz" ? { title: "Amallar jurnali", subtitle: "Administratorning oxirgi 300 ta amali.", date: "Sana", admin: "Administrator", action: "Amal", details: "Tafsilotlar", empty: "Administrator amallari hali yo‘q." } : { title: "Журнал действий", subtitle: "Последние 300 действий администратора.", date: "Дата", admin: "Администратор", action: "Действие", details: "Подробности", empty: "Действий администратора пока нет." };
  return <div>
    <p className="page-eyebrow">Audit</p>
    <h1 className="page-title">{ui.title}</h1>
    <p className="page-subtitle mb-8">{ui.subtitle}</p>
    <div className="data-card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
      <thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">{ui.date}</th><th className="p-4">{ui.admin}</th><th className="p-4">{ui.action}</th><th className="p-4">{ui.details}</th></tr></thead>
      <tbody className="divide-y divide-white/5">{activities.map((item) => <tr key={item.id}><td className="whitespace-nowrap p-4 text-xs text-nova-muted">{format(item.createdAt, "dd.MM.yyyy · HH:mm")}</td><td className="p-4 font-mono text-xs">{item.actorUsername}</td><td className="p-4"><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs">{actionLabels[item.action] ?? item.action}</span></td><td className="p-4 text-nova-muted">{item.description}</td></tr>)}{activities.length === 0 && <tr><td colSpan={4} className="p-14 text-center text-nova-muted">{ui.empty}</td></tr>}</tbody>
    </table></div>
  </div>;
}
