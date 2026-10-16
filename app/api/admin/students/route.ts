import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createUniqueUsername, generateTemporaryPassword, requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { encryptPassword } from "@/lib/password-vault";
import { adminActivity } from "@/lib/activity";

interface StudentRow {
  firstName?: unknown;
  lastName?: unknown;
  className?: unknown;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { rows?: StudentRow[] } | null;
  if (!Array.isArray(body?.rows) || body.rows.length < 1 || body.rows.length > 500) {
    return NextResponse.json({ error: "Provide between 1 and 500 valid students." }, { status: 400 });
  }

  const classes = await prisma.class.findMany();
  const classByName = new Map(classes.map((item) => [item.name.toUpperCase(), item]));
  const accounts: Array<{ student: string; className: string; username: string; temporaryPassword: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (const [index, row] of body.rows.entries()) {
    const firstName = clean(row.firstName);
    const lastName = clean(row.lastName);
    const className = clean(row.className).toUpperCase();
    const schoolClass = classByName.get(className);
    if (!firstName || !lastName || !schoolClass) {
      errors.push({ row: index + 1, message: !schoolClass ? `Class ${className || "is missing"} does not exist.` : "First and last name are required." });
      continue;
    }

    const username = await createUniqueUsername(firstName, className);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const created = await prisma.$transaction(async (transaction) => {
      const student = await transaction.user.create({
        data: {
        firstName,
        lastName,
        username,
        passwordHash,
        passwordEncrypted: encryptPassword(temporaryPassword),
        role: "STUDENT",
        classId: schoolClass.id,
        mustChangePassword: false,
        },
      });
      await transaction.adminActivity.create({ data: adminActivity(session.user, {
        action: "student.created",
        entityType: "student",
        entityId: student.id,
        description: `Created student ${firstName} ${lastName} (${username}) in ${className}.`,
      }) });
      return student;
    });
    void created;
    accounts.push({ student: `${firstName} ${lastName}`, className, username, temporaryPassword });
  }

  return NextResponse.json({ accounts, errors, count: accounts.length });
}
