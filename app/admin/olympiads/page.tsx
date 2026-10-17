import Link from "next/link";
import { format } from "date-fns";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { createOlympiad } from "./actions";
import { requireSuperAdminPage } from "@/lib/admin";

const statusLabels: Record<string, string> = {
  WAITING: "Ожидание",
  RUNNING: "Идёт сейчас",
  FINISHED: "Завершена",
  CANCELLED: "Отменена",
};

export default async function AdminOlympiadsPage() {
  await requireSuperAdminPage();
  const [classes, olympiads] = await Promise.all([
    prisma.class.findMany({
      where: { grade: { in: [5, 6, 7] } },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      include: { _count: { select: { students: { where: { role: "STUDENT", isActive: true, archivedAt: null } } } } },
    }),
    prisma.olympiad.findMany({
      include: {
        targetClasses: { include: { class: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <div>
    <p className="page-eyebrow">Соревнования</p>
    <h1 className="page-title">Олимпиады 5–7 классов</h1>
    <p className="page-subtitle">Создайте испытание, дождитесь учеников и запустите его одновременно для всех.</p>

    <form action={createOlympiad} className="data-card mt-8 p-6">
      <h2 className="text-lg font-semibold">Новая олимпиада</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input className="nova-input" name="title" minLength={3} maxLength={120} placeholder="Название олимпиады" required />
        <select className="nova-input" name="durationSeconds" defaultValue="120">
          <option value="30">30 секунд</option><option value="60">60 секунд</option><option value="90">90 секунд</option><option value="120">120 секунд</option><option value="180">180 секунд</option><option value="300">300 секунд</option>
        </select>
        <select className="nova-input" name="language" defaultValue="ru"><option value="ru">Русский</option><option value="en">English</option></select>
        <input className="nova-input" name="description" maxLength={500} placeholder="Описание или правила (необязательно)" />
        <label className="text-xs text-nova-muted"><span className="mb-2 block">Запланированный старт (необязательно)</span><input className="nova-input" type="datetime-local" name="scheduledAt" /></label>
        <fieldset className="rounded-xl border border-white/8 p-4 md:col-span-2">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-nova-muted">Участвующие классы</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{classes.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-3 text-sm"><input type="checkbox" name="classIds" value={item.id} /><span>{item.name}</span><span className="ml-auto text-xs text-nova-muted">{item._count.students}</span></label>)}</div>
          {!classes.length && <p className="text-sm text-nova-muted">Сначала создайте классы 5, 6 или 7.</p>}
        </fieldset>
        <div className="rounded-xl border border-nova-accent/20 bg-nova-accent/5 p-4 text-sm text-nova-text md:col-span-2">Система автоматически создаст два разных текста одинаковой сложности — по одному для каждой попытки.</div>
      </div>
      <button className="nova-button mt-4" disabled={!classes.length}><Trophy size={15} /> Создать зал ожидания</button>
    </form>

    <section className="mt-9">
      <h2 className="mb-3 text-lg font-semibold">Все олимпиады</h2>
      <div className="grid gap-3 lg:grid-cols-2">{olympiads.map((item) => <Link href={`/admin/olympiads/${item.id}`} key={item.id} className="data-card p-5 transition hover:border-nova-accent/30">
        <div className="flex items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-[0.14em] text-nova-accent">{item.language.toUpperCase()} · 2 × {item.durationSeconds} сек.</div><h3 className="mt-2 text-lg font-semibold">{item.title}</h3></div><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-nova-muted">{statusLabels[item.status] ?? item.status}</span></div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-nova-muted"><span>{item.targetClasses.map((target) => target.class.name).join(", ")}</span><span>·</span><span>{item._count.participants} участников</span><span>·</span><span>{item.scheduledAt && item.status === "WAITING" ? `старт ${format(item.scheduledAt, "dd.MM · HH:mm")}` : format(item.createdAt, "dd.MM.yyyy")}</span></div>
      </Link>)}{!olympiads.length && <div className="data-card p-12 text-center text-nova-muted lg:col-span-2">Олимпиад пока нет.</div>}</div>
    </section>
  </div>;
}
