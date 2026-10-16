import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { decryptPassword } from "@/lib/password-vault";
import { adminActivity } from "@/lib/activity";

export async function GET(_request: Request, context: RouteContext<"/api/admin/students/[id]/password">) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const student = await prisma.user.findUnique({
    where: { id },
    select: { role: true, passwordEncrypted: true },
  });
  if (!student || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }
  if (!student.passwordEncrypted) {
    return NextResponse.json({ error: "Saved password is unavailable. Reset it once to create a visible password." }, { status: 404 });
  }

  try {
    await prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "student.password_viewed",
      entityType: "student",
      entityId: id,
      description: "Viewed a student password.",
    }) });
    return NextResponse.json(
      { password: decryptPassword(student.passwordEncrypted) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Decrypt student password error:", error);
    return NextResponse.json({ error: "Saved password could not be opened." }, { status: 500 });
  }
}
