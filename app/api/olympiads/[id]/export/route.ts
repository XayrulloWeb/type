import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getOlympiadExportData, rankedParticipants } from "@/lib/olympiad-data";

const gold = "D8AD47";
const dark = "17191B";
const light = "F2F0E8";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const olympiad = await getOlympiadExportData(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ranked = rankedParticipants(olympiad.participants);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NOVA TYPE";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Итоги", { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 20 }, { width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }];
  summary.mergeCells("A1:E1");
  summary.getCell("A1").value = `NOVA TYPE — ${olympiad.title}`;
  summary.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: dark } };
  summary.getCell("A1").alignment = { vertical: "middle" };
  summary.getRow(1).height = 30;
  summary.addRow([]);
  summary.addRow(["Язык", olympiad.language.toUpperCase(), "Формат", `${olympiad.attemptLimit} × ${olympiad.durationSeconds} сек.`, `перерыв ${olympiad.breakSeconds} сек.`]);
  summary.addRow(["Классы", olympiad.targetClasses.map((item) => item.class.name).join(", "), "Статус", olympiad.status]);
  summary.addRow(["Дата старта", olympiad.startedAt ?? olympiad.scheduledAt ?? "—"]);
  if (olympiad.startedAt || olympiad.scheduledAt) summary.getCell("B5").numFmt = "dd.mm.yyyy hh:mm";
  summary.addRow([]);
  summary.addRow(["Победители по параллелям"]);
  const winnerHeader = summary.addRow(["Параллель", "Победитель", "Класс", "WPM", "Точность"]);
  for (const grade of [5, 6, 7]) {
    const winner = ranked.find((item) => item.user.class?.grade === grade);
    summary.addRow([`${grade} класс`, winner ? `${winner.user.firstName} ${winner.user.lastName}` : "Нет результата", winner?.user.class?.name ?? "—", winner?.wpm ?? null, winner?.accuracy ? winner.accuracy / 100 : null]);
  }
  summary.addRow([]);
  summary.addRow(["Командный рейтинг"]);
  const teamHeader = summary.addRow(["Место", "Класс", "Участники", "Средний WPM", "Средняя точность"]);
  const teams = [...ranked.reduce((map, item) => {
    const className = item.user.class?.name ?? "Без класса";
    const team = map.get(className) ?? { className, count: 0, wpm: 0, accuracy: 0 };
    team.count += 1; team.wpm += item.wpm ?? 0; team.accuracy += item.accuracy ?? 0; map.set(className, team); return map;
  }, new Map<string, { className: string; count: number; wpm: number; accuracy: number }>()).values()].map((team) => ({ ...team, avgWpm: Math.round(team.wpm / team.count), avgAccuracy: team.accuracy / team.count / 100 })).sort((a, b) => b.avgWpm - a.avgWpm || b.avgAccuracy - a.avgAccuracy);
  teams.forEach((team, index) => summary.addRow([index + 1, team.className, team.count, team.avgWpm, team.avgAccuracy]));

  const detail = workbook.addWorksheet("Участники", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  detail.columns = [
    { header: "Место", key: "rank", width: 10 }, { header: "Ученик", key: "name", width: 32 }, { header: "Класс", key: "class", width: 12 }, { header: "Параллель", key: "grade", width: 12 },
    { header: "Лучший WPM", key: "wpm", width: 14 }, { header: "Попытка 1 WPM", key: "attempt1", width: 17 }, { header: "Попытка 2 WPM", key: "attempt2", width: 17 }, { header: "Точность", key: "accuracy", width: 14 }, { header: "Ошибки", key: "errors", width: 12 }, { header: "Время, сек.", key: "duration", width: 14 },
    { header: "Проверка", key: "review", width: 20 }, { header: "Статус", key: "status", width: 22 }, { header: "Причина", key: "reason", width: 32 },
  ];
  const rankById = new Map(ranked.map((item, index) => [item.id, index + 1]));
  for (const item of olympiad.participants) detail.addRow({
    rank: item.disqualifiedAt ? "DQ" : rankById.get(item.id) ?? null,
    name: `${item.user.firstName} ${item.user.lastName}`,
    class: item.user.class?.name ?? "—",
    grade: item.user.class?.grade ?? null,
    wpm: item.wpm,
    attempt1: item.attempts.find((attempt) => attempt.attemptNumber === 1)?.wpm ?? null,
    attempt2: item.attempts.find((attempt) => attempt.attemptNumber === 2)?.wpm ?? null,
    accuracy: item.accuracy === null ? null : item.accuracy / 100,
    errors: item.wpm !== null ? (item.incorrectChars ?? 0) + (item.extraChars ?? 0) + (item.missedChars ?? 0) : null,
    duration: item.duration,
    review: item.needsReview ? "Требует проверки" : "Нет",
    status: item.disqualifiedAt ? "Дисквалифицирован" : item.attempts.length === olympiad.attemptLimit ? "2 попытки" : item.attempts.length ? `${item.attempts.length} попытка` : "Вошёл в зал",
    reason: item.disqualificationReason ?? "",
  });
  detail.autoFilter = { from: "A1", to: "M1" };

  for (const sheet of [summary, detail]) {
    sheet.eachRow((row) => { row.font = { name: "Arial", size: 10, color: { argb: dark } }; row.alignment = { vertical: "middle" }; });
  }
  for (const header of [winnerHeader, teamHeader, detail.getRow(1)]) {
    header.font = { name: "Arial", size: 10, bold: true, color: { argb: light } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark } };
    header.alignment = { horizontal: "center", vertical: "middle" };
    header.height = 24;
  }
  summary.getCell("A7").font = { name: "Arial", size: 12, bold: true, color: { argb: gold } };
  summary.getCell("A13").font = { name: "Arial", size: 12, bold: true, color: { argb: gold } };
  summary.getColumn(5).numFmt = "0.0%";
  detail.getColumn("accuracy").numFmt = "0.0%";
  detail.getRow(1).eachCell((cell) => { cell.border = { bottom: { style: "thin", color: { argb: gold } } }; });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = encodeURIComponent(`olympiad-${olympiad.title}.xlsx`);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename*=UTF-8''${filename}` } });
}
