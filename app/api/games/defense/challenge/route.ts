import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDefenseChallenge } from "@/lib/defense-challenge";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } });
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const language = body?.language;
  const difficulty = body?.difficulty;
  if ((language !== "ru" && language !== "en") || (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard")) {
    return NextResponse.json({ error: "Invalid game settings." }, { status: 400 });
  }

  return NextResponse.json(createDefenseChallenge(session.user.id, language as DefenseLanguage, difficulty as DefenseDifficulty));
}
