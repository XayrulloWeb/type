import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Clock3, Trophy, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";

export default async function OlympiadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/olympiads");
  const student = await prisma.user.findUnique({ where: { id: session.user.id }, include: { class: true } });
  if (!student?.isActive || student.archivedAt || student.role !== "STUDENT") redirect("/login");

  const olympiads = student.classId && student.class && [5, 6, 7].includes(student.class.grade) ? await prisma.olympiad.findMany({
    where: { targetClasses: { some: { classId: student.classId } }, status: { in: ["WAITING", "RUNNING", "FINISHED"] } },
    include: { targetClasses: { include: { class: true } }, _count: { select: { participants: true } }, participants: { where: { userId: student.id }, select: { submittedAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  }) : [];

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell"><p className="page-eyebrow">Соревнования</p><h1 className="page-title">Олимпиады</h1><p className="page-subtitle">Войдите в зал ожидания. Старт будет общим для всех участников.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2">{olympiads.map((item) => { const own = item.participants[0]; const label = item.status === "WAITING" ? "Войти в зал" : item.status === "RUNNING" ? own ? "Продолжить" : "Уже началась" : "Посмотреть итоги"; return <Link key={item.id} href={`/olympiads/${item.id}`} className="data-card flex flex-col p-6 transition hover:border-nova-accent/30"><div className="flex items-start justify-between gap-4"><Trophy className="text-nova-accent" size={22} /><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-nova-muted">{item.status === "WAITING" ? "Ожидание" : item.status === "RUNNING" ? "Идёт" : "Завершена"}</span></div><h2 className="mt-5 text-xl font-semibold">{item.title}</h2><p className="mt-2 line-clamp-2 text-sm text-nova-muted">{item.description || `Олимпиада для ${item.targetClasses.map((target) => target.class.name).join(", ")}`}</p><div className="mt-6 flex gap-4 text-xs text-nova-muted"><span className="flex items-center gap-1"><Clock3 size={13} /> 2 × {item.durationSeconds} сек.</span><span className="flex items-center gap-1"><Users size={13} /> {item._count.participants}</span><span>{item.language.toUpperCase()}</span></div><div className="mt-6 text-xs font-semibold text-nova-accent">{label} →</div></Link>; })}{!olympiads.length && <div className="data-card p-14 text-center text-nova-muted md:col-span-2">Для вашего класса активных олимпиад пока нет.</div>}</div>
  </main></div>;
}
