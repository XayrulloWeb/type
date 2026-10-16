import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n";
import { getStudentRankings, type StudentRanking } from "@/lib/leaderboard";

function averageSpeed(students: StudentRanking[]) {
  return students.length ? Math.round(students.reduce((sum, student) => sum + student.averageWpm, 0) / students.length) : 0;
}

function rankingsByClass(students: StudentRanking[]) {
  const grouped = new Map<string, StudentRanking[]>();
  for (const student of students) {
    const classId = student.user.classId;
    if (!classId) continue;
    grouped.set(classId, [...(grouped.get(classId) ?? []), student]);
  }
  return grouped;
}

export default async function AdminOverview() {
  const { locale } = await getI18n();
  const ui = locale === "uz" ? { eyebrow: "Boshqaruv paneli", title: "Maktab holati", subtitle: "Maktabdagi mashqlar va faollikning umumiy ko‘rinishi.", students: "O‘quvchilar", assignments: "Faol topshiriqlar", classes: "Sinflar", today: "Bugungi testlar", total: "Jami testlar", accuracy: "O‘rtacha aniqlik", active: "Bugun faol", reviewLabel: "Tekshirish kerak", reviewMessage: "ta natijani tekshirish kerak.", schoolSpeed: "Maktabning o‘rtacha tezligi", schoolSpeedHelp: "Har bir o‘quvchining o‘rtacha natijasi asosida hisoblanadi.", overall: "Umumiy", classSpeed: "Sinflar bo‘yicha o‘rtacha tezlik", class: "Sinf", activeStudents: "Faol o‘quvchilar", tests: "Testlar", start: "Boshlash", one: "Sinflarni yarating", two: "O‘quvchilarni qo‘shing yoki import qiling", three: "Login va parollarni yuklab oling" } : { eyebrow: "Панель управления", title: "Обзор школы", subtitle: "Общая картина тренировок и активности в школе.", students: "Ученики", assignments: "Активные задания", classes: "Классы", today: "Тесты сегодня", total: "Всего тестов", accuracy: "Средняя точность", active: "Активны сегодня", reviewLabel: "Требуют проверки", reviewMessage: " результатов требуют проверки.", schoolSpeed: "Средняя скорость школы", schoolSpeedHelp: "Рассчитывается по среднему результату каждого ученика, без перекоса из-за количества тестов.", overall: "Общая", classSpeed: "Средняя скорость каждого класса", class: "Класс", activeStudents: "Активные ученики", tests: "Тесты", start: "С чего начать", one: "Создайте классы", two: "Добавьте или импортируйте учеников", three: "Скачайте логины и пароли" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [students, assignments, classCount, tests, testsToday, aggregate, activeToday, reviewCount, allRankings, ruRankings, enRankings, classRows] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.assignment.count({ where: { isActive: true, text: { language: { in: ["ru", "en"] } } } }),
    prisma.class.count(),
    prisma.testResult.count({ where: { language: { in: ["ru", "en"] } } }),
    prisma.testResult.count({ where: { createdAt: { gte: today }, language: { in: ["ru", "en"] } } }),
    prisma.testResult.aggregate({ where: { isRanked: true, language: { in: ["ru", "en"] } }, _avg: { wpm: true, accuracy: true } }),
    prisma.testResult.groupBy({ by: ["userId"], where: { createdAt: { gte: today }, language: { in: ["ru", "en"] } } }),
    prisma.testResult.count({ where: { reviewStatus: "pending", language: { in: ["ru", "en"] } } }),
    getStudentRankings("all", undefined, "all"),
    getStudentRankings("all", undefined, "ru"),
    getStudentRankings("all", undefined, "en"),
    prisma.class.findMany({
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      include: { _count: { select: { students: { where: { role: "STUDENT", isActive: true } } } } },
    }),
  ]);
  const overallAverage = averageSpeed(allRankings);
  const languageAverages = [
    { label: ui.overall, code: "ALL", value: overallAverage, students: allRankings.length },
    { label: "Русский", code: "RU", value: averageSpeed(ruRankings), students: ruRankings.length },
    { label: "English", code: "EN", value: averageSpeed(enRankings), students: enRankings.length },
  ];
  const grouped = {
    all: rankingsByClass(allRankings),
    ru: rankingsByClass(ruRankings),
    en: rankingsByClass(enRankings),
  };
  const stats = [
    [ui.students, students], [ui.assignments, assignments], [ui.classes, classCount], [ui.today, testsToday],
    [ui.total, tests], [ui.accuracy, `${Math.round(aggregate._avg.accuracy ?? 0)}%`], [ui.active, activeToday.length], [ui.reviewLabel, reviewCount],
  ];

  return <div><p className="page-eyebrow">{ui.eyebrow}</p><h1 className="page-title">{ui.title}</h1><p className="page-subtitle">{ui.subtitle}</p>
    {reviewCount > 0 && <div className="mt-6 rounded-xl border border-nova-accent/20 bg-nova-accent/5 p-4 text-sm text-nova-text">{reviewCount}{ui.reviewMessage}</div>}
    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="data-card p-5"><div className="text-3xl font-semibold text-nova-accent">{value}</div><div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-nova-muted">{label}</div></div>)}</div>

    <section className="mt-8"><div className="mb-4"><h2 className="text-xl font-semibold">{ui.schoolSpeed}</h2><p className="mt-1 text-xs text-nova-muted">{ui.schoolSpeedHelp}</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{languageAverages.map((item) => <div key={item.code} className="data-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-[0.16em] text-nova-accent">{item.code}</span><span className="text-[10px] text-nova-muted">{item.students} {ui.students.toLowerCase()}</span></div><div className="mt-4 text-4xl font-semibold text-nova-text">{item.value || "—"}</div><div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-nova-muted">{item.label} · WPM</div></div>)}</div></section>

    <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">{ui.classSpeed}</h2><div className="data-card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/6 text-[10px] uppercase tracking-[0.12em] text-nova-muted"><tr><th className="p-4">{ui.class}</th><th className="p-4 text-right">{ui.activeStudents}</th><th className="p-4 text-right">{ui.tests}</th><th className="p-4 text-right">{ui.overall}</th><th className="p-4 text-right">RU</th><th className="p-4 text-right">EN</th></tr></thead><tbody className="divide-y divide-white/5">{classRows.map((schoolClass) => { const all = grouped.all.get(schoolClass.id) ?? []; const ru = grouped.ru.get(schoolClass.id) ?? []; const en = grouped.en.get(schoolClass.id) ?? []; return <tr key={schoolClass.id}><td className="p-4 font-semibold">{schoolClass.name}</td><td className="p-4 text-right text-nova-muted">{schoolClass._count.students}</td><td className="p-4 text-right text-nova-muted">{all.reduce((sum, student) => sum + student.testsCount, 0)}</td><SpeedCell value={averageSpeed(all)} /><SpeedCell value={averageSpeed(ru)} /><SpeedCell value={averageSpeed(en)} /></tr>; })}</tbody></table></div></section>

    <div className="data-card mt-8 p-8"><h2 className="font-semibold">{ui.start}</h2><ol className="mt-4 grid gap-3 text-sm text-nova-muted sm:grid-cols-3"><li><span className="mr-2 text-nova-accent">01</span>{ui.one}</li><li><span className="mr-2 text-nova-accent">02</span>{ui.two}</li><li><span className="mr-2 text-nova-accent">03</span>{ui.three}</li></ol></div>
  </div>;
}

function SpeedCell({ value }: { value: number }) {
  return <td className="p-4 text-right"><span className={value ? "font-semibold text-nova-accent" : "text-nova-muted"}>{value || "—"}</span>{value ? <span className="ml-1 text-[9px] text-nova-muted">WPM</span> : null}</td>;
}
