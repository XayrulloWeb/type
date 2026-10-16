"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/admin";
import { adminActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";

const languages = new Set(["en", "ru"]);
const difficulties = new Set(["easy", "medium", "hard"]);

export async function createText(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim().replace(/\s+/g, " ");
  const language = String(formData.get("language") ?? "").toLowerCase();
  const difficulty = String(formData.get("difficulty") ?? "").toLowerCase();
  const grade = Number(formData.get("grade"));
  if (title.length < 3 || title.length > 120 || content.length < 20 || content.length > 3000 || !languages.has(language) || !difficulties.has(difficulty) || !Number.isInteger(grade) || grade < 1 || grade > 12) return;

  await prisma.$transaction(async (transaction) => {
    const text = await transaction.text.create({ data: { title, content, language, difficulty, grade, createdBy: session.user.id } });
    await transaction.adminActivity.create({ data: adminActivity(session.user, {
      action: "text.created",
      entityType: "text",
      entityId: text.id,
      description: `Created ${language.toUpperCase()} text “${title}” for grade ${grade}.`,
    }) });
  });
  revalidatePath("/admin/texts");
  revalidatePath("/texts");
}

export async function toggleText(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive")) === "true";
  const text = await prisma.text.findUnique({ where: { id } });
  if (!text) return;
  await prisma.$transaction([
    prisma.text.update({ where: { id }, data: { isActive } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, { action: isActive ? "text.activated" : "text.archived", entityType: "text", entityId: id, description: `${isActive ? "Activated" : "Archived"} text “${text.title}”.` }) }),
  ]);
  revalidatePath("/admin/texts");
  revalidatePath("/texts");
}

export async function deleteText(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const text = await prisma.text.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!text || text._count.assignments > 0) return;
  try {
    await prisma.$transaction([
      prisma.text.delete({ where: { id } }),
      prisma.adminActivity.create({ data: adminActivity(session.user, { action: "text.deleted", entityType: "text", entityId: id, description: `Deleted unused text “${text.title}”.` }) }),
    ]);
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")) throw error;
  }
  revalidatePath("/admin/texts");
  revalidatePath("/texts");
}
