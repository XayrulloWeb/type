"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminActivity } from "@/lib/activity";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { generateUniqueOlympiadText } from "@/lib/olympiad-text";

const allowedLanguages = new Set(["ru", "en"]);

export async function createOlympiad(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const language = String(formData.get("language") ?? "").toLowerCase();
  const durationSeconds = Number(formData.get("durationSeconds"));
  const scheduledValue = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = scheduledValue ? new Date(scheduledValue) : null;
  const classIds = [...new Set(formData.getAll("classIds").map(String).filter(Boolean))];

  if (
    title.length < 3 || title.length > 120 || description.length > 500 ||
    !allowedLanguages.has(language) ||
    !Number.isInteger(durationSeconds) || durationSeconds < 30 || durationSeconds > 600 ||
    classIds.length === 0 ||
    (scheduledAt && (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 30_000))
  ) return;

  const classes = await prisma.class.findMany({
    where: { id: { in: classIds }, grade: { in: [5, 6, 7] } },
    select: { id: true, name: true },
  });
  if (classes.length !== classIds.length) return;
  const olympiadLanguage = language as "ru" | "en";
  const previousTexts = await prisma.olympiad.findMany({
    where: { language },
    select: { text: true, textSecond: true },
  });
  const usedTexts = new Set(previousTexts.flatMap((item) => item.textSecond ? [item.text, item.textSecond] : [item.text]));
  const text = generateUniqueOlympiadText(olympiadLanguage, durationSeconds, usedTexts);
  usedTexts.add(text);
  const textSecond = generateUniqueOlympiadText(olympiadLanguage, durationSeconds, usedTexts);

  const olympiad = await prisma.$transaction(async (transaction) => {
    const created = await transaction.olympiad.create({
      data: {
        title,
        description: description || null,
        text,
        textSecond,
        language,
        durationSeconds,
        scheduledAt,
        createdBy: session.user.id,
        targetClasses: { create: classes.map((schoolClass) => ({ classId: schoolClass.id })) },
      },
    });
    await transaction.adminActivity.create({ data: adminActivity(session.user, {
      action: "olympiad.created",
      entityType: "olympiad",
      entityId: created.id,
      description: `Создана олимпиада «${title}» для классов: ${classes.map((item) => item.name).join(", ")}.`,
      metadata: { language, durationSeconds, classIds, scheduledAt: scheduledAt?.toISOString() ?? null },
    }) });
    return created;
  });

  revalidatePath("/admin/olympiads");
  revalidatePath("/olympiads");
  redirect(`/admin/olympiads/${olympiad.id}`);
}

export async function startOlympiad(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const olympiad = await prisma.olympiad.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
  if (!olympiad || olympiad.status !== "WAITING" || olympiad._count.participants < 1) return;

  const startedAt = new Date(Date.now() + 5_000);
  await prisma.$transaction([
    prisma.olympiad.update({ where: { id }, data: { status: "RUNNING", startedAt, scheduledAt: null, endedAt: null } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "olympiad.started",
      entityType: "olympiad",
      entityId: id,
      description: `Запущена олимпиада «${olympiad.title}» с ${olympiad._count.participants} участниками.`,
    }) }),
  ]);

  revalidatePath(`/admin/olympiads/${id}`);
  revalidatePath("/olympiads");
}

export async function disqualifyParticipant(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const participantId = String(formData.get("participantId") ?? "");
  const reason = String(formData.get("reason") ?? "Нарушение правил").trim().slice(0, 240) || "Нарушение правил";
  const participant = await prisma.olympiadParticipant.findUnique({
    where: { id: participantId },
    include: { olympiad: true, user: true },
  });
  if (!participant || participant.wpm === null) return;
  await prisma.$transaction([
    prisma.olympiadParticipant.update({ where: { id: participantId }, data: { disqualifiedAt: new Date(), disqualifiedBy: session.user.id, disqualificationReason: reason } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "olympiad.participant_disqualified",
      entityType: "olympiad",
      entityId: participant.olympiadId,
      description: `${participant.user.firstName} ${participant.user.lastName} дисквалифицирован(а) в олимпиаде «${participant.olympiad.title}». Причина: ${reason}`,
    }) }),
  ]);
  revalidatePath(`/admin/olympiads/${participant.olympiadId}`);
  revalidatePath(`/olympiads/${participant.olympiadId}`);
}

export async function restoreParticipant(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const participantId = String(formData.get("participantId") ?? "");
  const participant = await prisma.olympiadParticipant.findUnique({
    where: { id: participantId },
    include: { olympiad: true, user: true },
  });
  if (!participant?.disqualifiedAt) return;
  await prisma.$transaction([
    prisma.olympiadParticipant.update({ where: { id: participantId }, data: { disqualifiedAt: null, disqualifiedBy: null, disqualificationReason: null } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "olympiad.participant_restored",
      entityType: "olympiad",
      entityId: participant.olympiadId,
      description: `${participant.user.firstName} ${participant.user.lastName} возвращён(а) в рейтинг олимпиады «${participant.olympiad.title}».`,
    }) }),
  ]);
  revalidatePath(`/admin/olympiads/${participant.olympiadId}`);
  revalidatePath(`/olympiads/${participant.olympiadId}`);
}

export async function finishOlympiad(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const olympiad = await prisma.olympiad.findUnique({ where: { id } });
  if (!olympiad || olympiad.status !== "RUNNING") return;

  await prisma.$transaction([
    prisma.olympiad.update({ where: { id }, data: { status: "FINISHED", endedAt: new Date() } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: "olympiad.finished",
      entityType: "olympiad",
      entityId: id,
      description: `Олимпиада «${olympiad.title}» завершена администратором.`,
    }) }),
  ]);

  revalidatePath(`/admin/olympiads/${id}`);
  revalidatePath("/olympiads");
}
