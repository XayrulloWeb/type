import { prisma } from "@/lib/db";
import { StudentManager } from "@/components/admin/StudentManager";

export default async function StudentsPage() {
  const [classes, students] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: { class: true, _count: { select: { testResults: true } } },
      orderBy: [{ class: { name: "asc" } }, { firstName: "asc" }],
    }),
  ]);

  return <StudentManager
    classes={classes.map((item) => ({ id: item.id, name: item.name }))}
    students={students.map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      username: item.username,
      className: item.class?.name ?? "—",
      isActive: item.isActive,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      passwordAvailable: Boolean(item.passwordEncrypted),
      tests: item._count.testResults,
      createdAt: item.createdAt.toISOString(),
    }))}
  />;
}
