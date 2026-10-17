import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { adminActivity } from "@/lib/activity";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/students/[id]">) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const student = await prisma.user.findUnique({ where: { id }, include: { class: true } });
  if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "Student not found." }, { status: 404 });

  if (body.archive === true && Object.keys(body).length === 1) {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } }),
      prisma.adminActivity.create({ data: adminActivity(session.user, {
        action: "student.archived",
        entityType: "student",
        entityId: id,
        description: `Archived ${student.username}; results were preserved.`,
      }) }),
    ]);
    return NextResponse.json({ success: true, outcome: "archived" });
  }

  if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
    const isActive = body.isActive;
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { isActive, archivedAt: isActive ? null : student.archivedAt } }),
      prisma.adminActivity.create({ data: adminActivity(session.user, {
        action: isActive ? "student.activated" : "student.blocked",
        entityType: "student",
        entityId: id,
        description: `${isActive ? "Activated" : "Blocked"} ${student.username}.`,
      }) }),
    ]);
    return NextResponse.json({ success: true });
  }

  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const username = clean(body.username).toLowerCase();
  const className = clean(body.className).toUpperCase();
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 || !/^[a-z0-9._-]{3,40}$/.test(username) || !className) {
    return NextResponse.json({ error: "Fill in the name, username and class correctly." }, { status: 400 });
  }
  const [schoolClass, usernameOwner] = await Promise.all([
    prisma.class.findUnique({ where: { name: className } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (!schoolClass) return NextResponse.json({ error: `Class ${className} does not exist.` }, { status: 400 });
  if (usernameOwner && usernameOwner.id !== id) return NextResponse.json({ error: "This username is already in use." }, { status: 409 });

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { firstName, lastName, username, classId: schoolClass.id } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "student.updated",
      entityType: "student",
      entityId: id,
      description: `Updated ${student.username}: ${firstName} ${lastName}, ${className}, ${username}.`,
      metadata: { previousUsername: student.username, previousClass: student.class?.name ?? null },
    }) }),
  ]);
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/students/[id]">) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const student = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { testResults: true, assignmentResults: true, olympiadEntries: true } } },
  });
  if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const hasHistory = student._count.testResults > 0 || student._count.assignmentResults > 0 || student._count.olympiadEntries > 0;
  try {
    if (hasHistory) {
      return NextResponse.json({ error: "This student has results. Archive the account instead of deleting it." }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.user.delete({ where: { id } }),
      prisma.adminActivity.create({ data: adminActivity(session.user, {
        action: "student.deleted",
        entityType: "student",
        entityId: id,
        description: `Deleted unused student account ${student.username}.`,
      }) }),
    ]);
    return NextResponse.json({ success: true, outcome: "deleted" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "This account has related records and cannot be deleted. Archive it instead." }, { status: 409 });
    }
    throw error;
  }
}
