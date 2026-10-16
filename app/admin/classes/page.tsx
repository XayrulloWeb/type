import { prisma } from "@/lib/db";
import Link from "next/link";
import { createClass } from "./actions";
import { getI18n } from "@/lib/i18n";

export default async function ClassesPage() {
  const [classes, { locale }] = await Promise.all([prisma.class.findMany({
    orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    include: {
      students: { where: { role: "STUDENT", isActive: true }, include: { testResults: { where: { isRanked: true, language: { in: ["ru", "en"] } } } } },
    },
  }), getI18n()]);
  const ui = locale === "uz" ? { eyebrow: "Maktab tuzilmasi", title: "Sinflar", subtitle: "Dastur kodini o‘zgartirmasdan sinflar yarating.", add: "Sinf qo‘shish", name: "Sinf nomi (masalan, 6A)", grade: "Sinf raqami", section: "Harf", create: "Yaratish", students: "O‘quvchilar", average: "O‘rtacha WPM", details: "Batafsil", open: "Statistikani ochish", empty: "Hali sinflar yaratilmagan." } : { eyebrow: "Структура школы", title: "Классы", subtitle: "Создавайте классы без изменения кода приложения.", add: "Добавить класс", name: "Название класса (например, 6A)", grade: "Номер класса", section: "Буква", create: "Создать", students: "Ученики", average: "Средняя скорость", details: "Подробнее", open: "Открыть статистику", empty: "Классы пока не созданы." };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><p className="page-eyebrow">{ui.eyebrow}</p><h1 className="page-title">{ui.title}</h1><p className="page-subtitle">{ui.subtitle}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="data-card md:col-span-1 p-6 h-fit">
          <h2 className="text-xl font-bold mb-4 text-nova-text">{ui.add}</h2>
          <form action={createClass} className="space-y-4">
            <div>
              <label className="block text-sm text-nova-muted mb-1">{ui.name}</label>
              <input name="name" required className="nova-input" />
            </div>
            <div>
              <label className="block text-sm text-nova-muted mb-1">{ui.grade}</label>
              <input type="number" min="1" max="12" name="grade" required className="nova-input" />
            </div>
            <div>
              <label className="block text-sm text-nova-muted mb-1">{ui.section}</label>
              <input name="section" required className="nova-input" />
            </div>
            <button type="submit" className="nova-button w-full">
              {ui.create}
            </button>
          </form>
        </div>

        <div className="data-card md:col-span-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-nova-muted text-sm uppercase">
              <tr>
                <th className="p-4">{ui.title}</th>
                <th className="p-4">{ui.students}</th>
                <th className="p-4 text-right">{ui.average}</th>
                <th className="p-4 text-right">{ui.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 text-nova-text">
              {classes.map((schoolClass) => {
                const activeStudents = schoolClass.students.filter((student) => student.testResults.length > 0);
                const classAverage = activeStudents.length
                  ? Math.round(activeStudents.reduce((classTotal, student) => classTotal + student.testResults.reduce((total, test) => total + test.wpm, 0) / student.testResults.length, 0) / activeStudents.length)
                  : null;
                return <tr key={schoolClass.id}>
                  <td className="p-4 font-bold">{schoolClass.name}</td>
                  <td className="p-4 text-nova-muted">{schoolClass.students.length}</td>
                  <td className="p-4 text-right text-nova-accent">{classAverage ?? "—"}</td>
                  <td className="p-4 text-right"><Link className="text-xs font-medium text-nova-accent hover:text-nova-text" href={`/admin/classes/${schoolClass.id}`}>{ui.open}</Link></td>
                </tr>;
              })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-nova-muted">{ui.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
