import { format } from "date-fns";
import { Archive } from "lucide-react";
import { prisma } from "@/lib/db";
import { archiveAssignment, createAssignment } from "./actions";
import { getI18n } from "@/lib/i18n";
import { requireSuperAdminPage } from "@/lib/admin";

export default async function AssignmentsAdminPage() {
  await requireSuperAdminPage();
  const [classes, assignments, { locale, t }] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    prisma.assignment.findMany({
      where: { text: { language: { in: ["ru", "en"] } } },
      include: {
        class: true,
        text: true,
        _count: { select: { results: { where: { status: "completed" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getI18n(),
  ]);
  const ui = locale === "uz" ? { eyebrow: "Sinf ishi", title: "Topshiriqlar", subtitle: "Sinfga matn bering va bajarilishini kuzating.", create: "Topshiriq yaratish", name: "Topshiriq nomi", select: "Sinfni tanlang", minWpm: "Minimal WPM (ixtiyoriy)", minAccuracy: "Minimal aniqlik % (ixtiyoriy)", content: "O‘quvchilar yozishi kerak bo‘lgan matn…", button: "Topshiriq yaratish", assignment: "Topshiriq", deadline: "Muddat", completed: "Bajarildi", action: "Amal", empty: "Hali topshiriqlar yo‘q." } : { eyebrow: "Работа класса", title: "Задания", subtitle: "Назначайте классу текст и отслеживайте выполнение.", create: "Создать задание", name: "Название задания", select: "Выберите класс", minWpm: "Минимальная скорость (необязательно)", minAccuracy: "Минимальная точность % (необязательно)", content: "Текст, который должны напечатать ученики…", button: "Создать задание", assignment: "Задание", deadline: "Срок", completed: "Выполнено", action: "Действие", empty: "Заданий пока нет." };

  return <div>
    <p className="page-eyebrow">{ui.eyebrow}</p>
    <h1 className="page-title">{ui.title}</h1>
    <p className="page-subtitle">{ui.subtitle}</p>

    <form action={createAssignment} className="data-card mt-8 p-6">
      <h2 className="mb-5 text-lg font-semibold">{ui.create}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="nova-input" name="title" placeholder={ui.name} minLength={3} maxLength={120} required />
        <select className="nova-input" name="classId" required defaultValue=""><option value="" disabled>{ui.select}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="nova-input" name="language" defaultValue="en"><option value="en">English</option><option value="ru">Русский</option></select>
        <select className="nova-input" name="difficulty" defaultValue="medium"><option value="easy">{t("difficulty.easy")}</option><option value="medium">{t("difficulty.medium")}</option><option value="hard">{t("difficulty.hard")}</option></select>
        <input className="nova-input" type="number" name="minimumWpm" min={1} max={300} placeholder={ui.minWpm} />
        <input className="nova-input" type="number" name="minimumAccuracy" min={1} max={100} step="0.1" placeholder={ui.minAccuracy} />
        <input className="nova-input md:col-span-2" type="datetime-local" name="deadline" aria-label="Deadline" />
        <textarea className="nova-input min-h-36 resize-y md:col-span-2" name="content" minLength={20} maxLength={3000} placeholder={ui.content} required />
      </div>
      <button className="nova-button mt-4" disabled={!classes.length}>{ui.button}</button>
    </form>

    <div className="data-card mt-8 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
      <thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">{ui.assignment}</th><th className="p-4">{t("common.class")}</th><th className="p-4">{t("common.language")}</th><th className="p-4">{ui.deadline}</th><th className="p-4 text-right">{ui.completed}</th><th className="p-4 text-right">{ui.action}</th></tr></thead>
      <tbody className="divide-y divide-white/5">{assignments.map((item) => <tr key={item.id} className={!item.isActive ? "opacity-50" : undefined}><td className="p-4"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-nova-muted">{t(`difficulty.${item.text.difficulty}`)}{!item.isActive && ` · ${t("common.archived")}`}</div></td><td className="p-4 text-nova-muted">{item.class.name}</td><td className="p-4 uppercase text-nova-muted">{item.text.language}</td><td className="p-4 text-xs text-nova-muted">{item.deadline ? format(item.deadline, "dd MMM yyyy · HH:mm") : t("common.noDeadline")}</td><td className="p-4 text-right text-nova-accent">{item._count.results}</td><td className="p-4 text-right">{item.isActive && <form action={archiveAssignment}><input type="hidden" name="id" value={item.id} /><button className="icon-button" title={t("common.archived")}><Archive size={15} /></button></form>}</td></tr>)}{assignments.length === 0 && <tr><td colSpan={6} className="p-14 text-center text-nova-muted">{ui.empty}</td></tr>}</tbody>
    </table></div>
  </div>;
}
