import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, MonitorUp, Play, Sheet, Square } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminOlympiadMonitor } from "@/components/olympiads/AdminOlympiadMonitor";
import { finishOlympiad, startOlympiad } from "../actions";
import { requireSuperAdminPage } from "@/lib/admin";

export default async function AdminOlympiadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminPage();
  const { id } = await params;
  const olympiad = await prisma.olympiad.findUnique({
    where: { id },
    include: { targetClasses: { include: { class: true } }, _count: { select: { participants: true } } },
  });
  if (!olympiad) notFound();

  return <div>
    <Link href="/admin/olympiads" className="inline-flex items-center gap-2 text-xs text-nova-muted hover:text-nova-text"><ArrowLeft size={14} /> Все олимпиады</Link>
    <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs uppercase tracking-[0.18em] text-nova-accent">{olympiad.language.toUpperCase()} · {olympiad.targetClasses.map((item) => item.class.name).join(", ")}</p><h1 className="mt-2 text-3xl font-semibold">{olympiad.title}</h1>{olympiad.description && <p className="mt-2 max-w-2xl text-sm text-nova-muted">{olympiad.description}</p>}</div>
      <div className="flex flex-wrap gap-2"><Link className="nova-button-secondary" href={`/projector/olympiads/${id}`} target="_blank"><MonitorUp size={15} /> Проектор</Link><a className="nova-button-secondary" href={`/api/olympiads/${id}/export`}><Sheet size={15} /> Excel</a><a className="nova-button-secondary" href={`/api/olympiads/${id}/diplomas`}><FileDown size={15} /> Дипломы PDF</a>{olympiad.status === "WAITING" && <form action={startOlympiad}><input type="hidden" name="id" value={id} /><button className="nova-button"><Play size={15} /> Начать сейчас</button></form>}{olympiad.status === "RUNNING" && <form action={finishOlympiad}><input type="hidden" name="id" value={id} /><button className="nova-button-secondary"><Square size={14} /> Завершить</button></form>}</div>
    </div>
    {olympiad.status === "WAITING" && <div className="mt-6 rounded-xl border border-nova-accent/20 bg-nova-accent/5 p-4 text-sm text-nova-text">Две автоматические попытки по {olympiad.durationSeconds} сек., между ними перерыв {olympiad.breakSeconds} сек. В рейтинг попадёт лучший результат. {olympiad.scheduledAt ? `Старт запланирован на ${olympiad.scheduledAt.toLocaleString("ru-RU")}.` : "После запуска у всех участников появится общий отсчёт 5 секунд."}</div>}
    <AdminOlympiadMonitor olympiadId={id} initialStatus={olympiad.status} />
    <details className="data-card mt-6 p-5"><summary className="cursor-pointer text-sm font-semibold">Показать автоматические тексты</summary><div className="mt-4 grid gap-5 lg:grid-cols-2"><div><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nova-accent">Попытка 1</div><p className="whitespace-pre-wrap text-sm leading-7 text-nova-muted">{olympiad.text}</p></div><div><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nova-accent">Попытка 2</div><p className="whitespace-pre-wrap text-sm leading-7 text-nova-muted">{olympiad.textSecond ?? olympiad.text}</p></div></div></details>
  </div>;
}
