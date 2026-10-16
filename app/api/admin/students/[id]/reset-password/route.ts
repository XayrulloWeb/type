import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { generateTemporaryPassword, requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { encryptPassword } from "@/lib/password-vault";
import { adminActivity } from "@/lib/activity";

export async function POST(_request: Request, context: RouteContext<"/api/admin/students/[id]/reset-password">) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const student = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordEncrypted: encryptPassword(temporaryPassword),
        mustChangePassword: false,
        isActive: true,
        archivedAt: null,
      },
    }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "student.password_reset",
      entityType: "student",
      entityId: id,
      description: "Reset a student password.",
    }) }),
  ]);
  return NextResponse.json({ temporaryPassword });
}
