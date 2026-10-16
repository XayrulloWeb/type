import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { adminActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { decryptPassword } from "@/lib/password-vault";

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { class: true },
    orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }, { lastName: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NOVA TYPE";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Логины и пароли", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.columns = [
    { header: "Ученик", key: "student", width: 34 },
    { header: "Класс", key: "className", width: 12 },
    { header: "Логин", key: "username", width: 25 },
    { header: "Пароль", key: "password", width: 26 },
    { header: "Статус", key: "status", width: 18 },
  ];

  for (const student of students) {
    let password = "Нужно сбросить пароль";
    if (student.passwordEncrypted) {
      try { password = decryptPassword(student.passwordEncrypted); }
      catch { password = "Пароль недоступен"; }
    }
    sheet.addRow({
      student: `${student.firstName} ${student.lastName}`,
      className: student.class?.name ?? "—",
      username: student.username,
      password,
      status: student.archivedAt ? "Архив" : student.isActive ? "Активен" : "Заблокирован",
    });
  }

  const header = sheet.getRow(1);
  header.height = 26;
  header.font = { name: "Arial", size: 10, bold: true, color: { argb: "F2F0E8" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "17191B" } };
  header.alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: "E1" };
  sheet.eachRow((row, index) => {
    if (index > 1) row.font = { name: "Arial", size: 10, color: { argb: "17191B" } };
    row.alignment = { vertical: "middle" };
  });

  await prisma.adminActivity.create({ data: adminActivity(session.user, {
    action: "student.accounts_exported",
    entityType: "student",
    description: `Exported ${students.length} student accounts with saved passwords.`,
  }) });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=nova-type-all-accounts.xlsx",
    },
  });
}
