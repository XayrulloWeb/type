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
  if (!id || !["approved", "rejected"].includes(decision)) return;
  const result = await prisma.testResult.findUnique({ where: { id }, include: { user: true } });
  if (!result) return;
  await prisma.$transaction([
    prisma.testResult.update({ where: { id }, data: { reviewStatus: decision, isRanked: decision === "approved" } }),
    prisma.adminActivity.create({ data: adminActivity(session.user, {
      action: `result.${decision}`,
      entityType: "testResult",
      entityId: id,
      description: `${decision === "approved" ? "Approved" : "Rejected"} ${result.wpm} WPM result for ${result.user.username}.`,
    }) }),
  ]);
  revalidatePath("/admin/review");
  revalidatePath("/leaderboard");
}
