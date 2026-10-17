"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin";
import { adminActivity } from "@/lib/activity";

export async function createClass(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const requestedName = String(formData.get("name") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const grade = parseInt(formData.get("grade") as string);
  const section = String(formData.get("section") ?? "").trim().toUpperCase();

  if (Number.isNaN(grade) || grade < 1 || grade > 12 || !/^[A-Z]$/.test(section)) return;
  const name = `${grade}${section}`;
  if (requestedName && requestedName !== name) return;

  const existing = await prisma.class.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return;

  await prisma.$transaction(async (transaction) => {
    const schoolClass = await transaction.class.create({ data: { name, grade, section } });
    await transaction.adminActivity.create({ data: adminActivity(session.user, {
      action: "class.created",
      entityType: "class",
      entityId: schoolClass.id,
      description: `Created class ${name}.`,
    }) });
  });

  revalidatePath("/admin/classes");
}
