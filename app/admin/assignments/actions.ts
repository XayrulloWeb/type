"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin";
import { adminActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";

const languages = new Set(["en", "ru"]);
const difficulties = new Set(["easy", "medium", "hard"]);

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

export async function createAssignment(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const title = String(formData.get("title") ?? "").trim();
  const classId = String(formData.get("classId") ?? "");
  const content = String(formData.get("content") ?? "").trim().replace(/\s+/g, " ");
  const language = String(formData.get("language") ?? "").toLowerCase();
  const difficulty = String(formData.get("difficulty") ?? "").toLowerCase();
  const minimumWpm = optionalNumber(formData.get("minimumWpm"));
  const minimumAccuracy = optionalNumber(formData.get("minimumAccuracy"));
  const deadlineValue = String(formData.get("deadline") ?? "");
  const deadline = deadlineValue ? new Date(deadlineValue) : null;

  if (
    title.length < 3 || title.length > 120 || content.length < 20 || content.length > 3000 ||
    !languages.has(language) || !difficulties.has(difficulty) ||
    Number.isNaN(minimumWpm) || Number.isNaN(minimumAccuracy) ||
    (minimumWpm !== null && (minimumWpm < 1 || minimumWpm > 300)) ||
    (minimumAccuracy !== null && (minimumAccuracy < 1 || minimumAccuracy > 100)) ||
    (deadline && Number.isNaN(deadline.getTime()))
  ) return;

  const schoolClass = await prisma.class.findUnique({ where: { id: classId } });
  if (!schoolClass) return;

  await prisma.$transaction(async (transaction) => {
    const text = await transaction.text.create({
      data: { title, content, language, difficulty, grade: schoolClass.grade, createdBy: session.user.id },
    });
    const assignment = await transaction.assignment.create({
      data: { title, textId: text.id, classId, teacherId: session.user.id, minimumWpm, minimumAccuracy, deadline },
    });
    await transaction.adminActivity.create({ data: adminActivity(session.user, {
      action: "assignment.created",
      entityType: "assignment",
      entityId: assignment.id,
      description: `Created assignment “${title}” for ${schoolClass.name}.`,
    }) });
  });

  revalidatePath("/admin/assignments");
  revalidatePath("/assignments");
}

export async function archiveAssignment(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { class: true } });
  if (!assignment) return;
  await prisma.$transaction([
    prisma.assignment.update({ where: { id }, data: { isActive: false } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "assignment.archived",
      entityType: "assignment",
      entityId: id,
      description: `Archived assignment “${assignment.title}” for ${assignment.class.name}.`,
    }) }),
  ]);
  revalidatePath("/admin/assignments");
  revalidatePath("/assignments");
}
