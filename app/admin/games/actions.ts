"use server";

import { revalidatePath } from "next/cache";
import { adminActivity } from "@/lib/activity";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

const reasons: Record<string, string> = {
  suspicious_result: "подозрительный результат",
  technical_error: "техническая ошибка или баг",
  rules_violation: "нарушение правил игры",
  manual_review: "решение после ручной проверки",
};

export async function moderateGameResult(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return;

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const requestedReason = String(formData.get("reason") ?? "manual_review");
  if (!id || id.length > 100 || !["annul", "restore"].includes(decision)) return;

  const result = await prisma.gameResult.findUnique({
    where: { id },
    include: { user: { select: { username: true, role: true, isActive: true, archivedAt: true } } },
  });
  if (!result || result.game !== "defense" || result.user.role !== "STUDENT") return;

  const restoreAllowed = result.moderationStatus === "annulled"
    && result.user.isActive
    && !result.user.archivedAt
    && result.duration >= 12
    && result.destroyed >= 5
    && result.accuracy >= 70
    && result.wpm <= 220;

  if (decision === "annul" && !result.isRanked) return;
  if (decision === "restore" && !restoreAllowed) return;

  const isRanked = decision === "restore";
  const moderationStatus = decision === "restore" ? "restored" : "annulled";
  const reason = reasons[requestedReason] ?? reasons.manual_review;
  const action = decision === "restore" ? "game_result.restored" : "game_result.annulled";
  const verb = decision === "restore" ? "Вернул в рейтинг" : "Аннулировал";

  await prisma.$transaction([
    prisma.gameResult.update({
      where: { id },
      data: {
        isRanked,
        moderationStatus,
        moderationReason: reason,
        moderatedAt: new Date(),
        moderatedBy: session.user.id,
      },
    }),
    prisma.adminActivity.create({
      data: adminActivity(session.user, {
        action,
        entityType: "gameResult",
        entityId: id,
        description: `${verb} миссию NOVA Defense ученика ${result.user.username}: ${result.score} очков, ${result.wpm} WPM. Причина: ${reason}`,
        metadata: {
          studentId: result.userId,
          username: result.user.username,
          score: result.score,
          wpm: result.wpm,
          accuracy: result.accuracy,
          language: result.language,
          difficulty: result.difficulty,
          reason,
          previousIsRanked: result.isRanked,
          previousModerationStatus: result.moderationStatus ?? "none",
        },
      }),
    }),
  ]);

  revalidatePath("/admin/games");
  revalidatePath("/admin/activity");
  revalidatePath("/games");
}
