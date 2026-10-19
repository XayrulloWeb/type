"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { adminActivity } from "@/lib/activity";

export async function reviewResult(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const requestedReason = String(formData.get("reason") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) return;
  const result = await prisma.testResult.findUnique({ where: { id }, include: { user: true } });
  if (!result) return;

  const reason = resultReasons[requestedReason] ?? resultReasons.manual_review;
  const action = getAction(result.isRanked, result.reviewStatus, decision);
  const isRanked = decision === "approved";
  const descriptionVerb = action === "result.annulled"
    ? "Аннулировал"
    : action === "result.rejected"
      ? "Отклонил"
      : action === "result.restored"
        ? "Вернул в рейтинг"
        : "Одобрил";
  if (result.isRanked === isRanked && result.reviewStatus === decision) return;

  await prisma.$transaction([
    prisma.testResult.update({ where: { id }, data: { reviewStatus: decision, isRanked } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action,
      entityType: "testResult",
      entityId: id,
      description: `${descriptionVerb} результат ${result.wpm} WPM ученика ${result.user.username}. Причина: ${reason}`,
      metadata: {
        reason,
        studentId: result.userId,
        username: result.user.username,
        wpm: result.wpm,
        language: result.language,
        previousIsRanked: result.isRanked,
        previousReviewStatus: result.reviewStatus ?? "none",
      },
    }) }),
  ]);
  revalidatePath("/admin/review");
  revalidatePath(`/admin/students/${result.userId}`);
  revalidatePath("/admin/ranking");
  revalidatePath("/admin/classes");
  if (result.user.classId) revalidatePath(`/admin/classes/${result.user.classId}`);
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/history");
  revalidatePath(`/results/${id}`);
}

const resultReasons: Record<string, string> = {
  suspicious_speed: "подозрительно высокая скорость",
  technical_error: "техническая ошибка или баг",
  rules_violation: "нарушение правил",
  manual_review: "решение после ручной проверки",
  other: "другая причина",
};

function getAction(isRanked: boolean, reviewStatus: string | null, decision: string) {
  if (decision === "rejected") return isRanked ? "result.annulled" : "result.rejected";
  return !isRanked && reviewStatus === "rejected" ? "result.restored" : "result.approved";
}
