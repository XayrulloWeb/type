import { prisma } from "@/lib/db";
import { StudentManager } from "@/components/admin/StudentManager";
import { requireSuperAdminPage } from "@/lib/admin";
import { getStudentDefenseCreditBalances } from "@/lib/defense-progress";

export default async function StudentsPage() {
  await requireSuperAdminPage();
  const [classes, students] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: { class: true, _count: { select: { testResults: true } } },
      orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }],
    }),
  ]);
  const creditBalances = await getStudentDefenseCreditBalances(students.map((student) => student.id));

  return <StudentManager
    classes={classes.map((item) => ({ id: item.id, name: item.name }))}
    students={students.map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      username: item.username,
      className: item.class?.name ?? "—",
      initialWpm: item.initialWpm,
      isActive: item.isActive,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      passwordAvailable: Boolean(item.passwordEncrypted),
      tests: item._count.testResults,
      credits: creditBalances.get(item.id) ?? 0,
      createdAt: item.createdAt.toISOString(),
    }))}
  />;
}
