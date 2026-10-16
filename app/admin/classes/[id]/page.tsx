import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n";

export default async function ClassAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { locale }] = await Promise.all([params, getI18n()]);
  const ui = locale === "uz" ? { back: "Barcha sinflar", eyebrow: "Sinf statistikasi", subtitle: "Natijalar, tillar bo‘yicha o‘rtacha va topshiriqlar bajarilishi.", students: "O‘quvchilar", tests: "Reyting testlari", avg: "O‘rtacha WPM", accuracy: "O‘rtacha aniqlik", status: "Holat", best: "Eng yaxshi WPM", activity: "Oxirgi faollik", active: "Faol", blocked: "Bloklangan", none: "Faollik yo‘q", emptyStudents: "Bu sinfda o‘quvchilar yo‘q.", assignments: "Topshiriqlar", deadline: "Muddat", completed: "Bajarildi", progress: "Jarayon", noAssignments: "Bu sinf uchun topshiriqlar yo‘q." } : { back: "Все классы", eyebrow: "Статистика класса", subtitle: "Результаты, средние показатели по языкам и выполнение заданий.", students: "Ученики", tests: "Рейтинговые тесты", avg: "Средняя скорость", accuracy: "Средняя точность", status: "Статус", best: "Лучшая скорость", activity: "Последняя активность", active: "Активен", blocked: "Заблокирован", none: "Нет активности", emptyStudents: "В этом классе нет учеников.", assignments: "Задания", deadline: "Срок", completed: "Выполнено", progress: "Прогресс", noAssignments: "Для этого класса нет заданий." };
  const schoolClass = await prisma.class.findUnique({
    where: { id },
    include: {
      students: {
        where: { role: "STUDENT", archivedAt: null },
        include: { testResults: { where: { isRanked: true, language: { in: ["ru", "en"] } }, orderBy: { createdAt: "desc" } } },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      },
      assignments: {
        where: { text: { language: { in: ["ru", "en"] } } },
        include: { results: { where: { status: "completed" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!schoolClass) notFound();

  const tests = schoolClass.students.flatMap((student) => student.testResults);
  const averageWpm = tests.length ? Math.round(tests.reduce((sum, test) => sum + test.wpm, 0) / tests.length) : 0;
  const averageAccuracy = tests.length ? Math.round(tests.reduce((sum, test) => sum + test.accuracy, 0) / tests.length) : 0;
  const languageStats = ["en", "ru"].map((language) => {
    const items = tests.filter((test) => test.language === language);
    return { language, tests: items.length, average: items.length ? Math.round(items.reduce((sum, test) => sum + test.wpm, 0) / items.length) : 0 };
  });

  return <div>
    <Link href="/admin/classes" className="mb-5 inline-flex items-center gap-2 text-xs text-nova-muted hover:text-nova-text"><ArrowLeft size={14} /> {ui.back}</Link>
    <p className="text-xs uppercase tracking-[0.18em] text-nova-accent">{ui.eyebrow}</p>
    <h1 className="mt-2 text-3xl font-semibold">{schoolClass.name}</h1>
    <p className="mt-2 text-sm text-nova-muted">{ui.subtitle}</p>

    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {[[ui.students, schoolClass.students.length], [ui.tests, tests.length], [ui.avg, averageWpm || "—"], [ui.accuracy, tests.length ? `${averageAccuracy}%` : "—"]].map(([label, value]) => <div className="data-card p-5" key={label}><div className="text-3xl font-semibold text-nova-accent">{value}</div><div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-nova-muted">{label}</div></div>)}
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2">{languageStats.map((item) => <div className="data-card p-5" key={item.language}><div className="flex items-end justify-between"><span className="text-sm font-semibold uppercase">{item.language}</span><span className="text-2xl font-semibold text-nova-accent">{item.tests ? item.average : "—"}</span></div><div className="mt-2 text-xs text-nova-muted">{item.tests} ranked tests · average WPM</div></div>)}</div>

    <h2 className="mb-3 mt-9 text-lg font-semibold">{ui.students}</h2>
    <div className="data-card overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4 text-right">Tests</th><th className="p-4 text-right">Average WPM</th><th className="p-4 text-right">Best WPM</th><th className="p-4">Last activity</th></tr></thead><tbody className="divide-y divide-white/5">{schoolClass.students.map((student) => { const count = student.testResults.length; const average = count ? Math.round(student.testResults.reduce((sum, test) => sum + test.wpm, 0) / count) : 0; const best = count ? Math.max(...student.testResults.map((test) => test.wpm)) : 0; return <tr key={student.id}><td className="p-4 font-medium">{student.firstName} {student.lastName}<div className="font-mono text-xs font-normal text-nova-muted">{student.username}</div></td><td className={student.isActive ? "p-4 text-emerald-400" : "p-4 text-nova-error"}>{student.isActive ? "Active" : "Blocked"}</td><td className="p-4 text-right text-nova-muted">{count}</td><td className="p-4 text-right text-nova-accent">{average || "—"}</td><td className="p-4 text-right">{best || "—"}</td><td className="p-4 text-xs text-nova-muted">{student.testResults[0] ? format(student.testResults[0].createdAt, "dd MMM · HH:mm") : "No activity"}</td></tr>; })}{schoolClass.students.length === 0 && <tr><td colSpan={6} className="p-14 text-center text-nova-muted">No students in this class.</td></tr>}</tbody></table></div>

    <h2 className="mb-3 mt-9 text-lg font-semibold">{ui.assignments}</h2>
    <div className="data-card overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/6 text-[10px] uppercase tracking-wider text-nova-muted"><tr><th className="p-4">Title</th><th className="p-4">Deadline</th><th className="p-4 text-right">Completed</th><th className="p-4 text-right">Progress</th></tr></thead><tbody className="divide-y divide-white/5">{schoolClass.assignments.map((assignment) => { const total = schoolClass.students.length; const complete = assignment.results.length; const progress = total ? Math.round(complete / total * 100) : 0; return <tr key={assignment.id} className={!assignment.isActive ? "opacity-50" : undefined}><td className="p-4 font-medium">{assignment.title}{!assignment.isActive && <span className="ml-2 text-xs text-nova-muted">Archived</span>}</td><td className="p-4 text-xs text-nova-muted">{assignment.deadline ? format(assignment.deadline, "dd MMM yyyy · HH:mm") : "No deadline"}</td><td className="p-4 text-right">{complete} / {total}</td><td className="p-4 text-right text-nova-accent">{progress}%</td></tr>; })}{schoolClass.assignments.length === 0 && <tr><td colSpan={4} className="p-14 text-center text-nova-muted">No assignments for this class.</td></tr>}</tbody></table></div>
  </div>;
}
