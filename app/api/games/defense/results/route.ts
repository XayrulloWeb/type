import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyDefenseChallenge } from "@/lib/defense-challenge";
import { DEFENSE_POWERUP_DURATION_MS, defenseGrade, defensePowerupDrop, defenseRequiredHits, defenseRewards, defenseTargetKind, defenseWordScore, type DefenseEvent, type DefensePowerup } from "@/lib/defense-shared";

const MAX_EVENTS = 6_000;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } });
    if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const token = typeof body?.token === "string" ? body.token : "";
    const runId = typeof body?.runId === "string" ? body.runId : "";
    const durationMs = typeof body?.durationMs === "number" ? Math.round(body.durationMs) : Number.NaN;
    const events = Array.isArray(body?.events) ? body.events : [];
    const challenge = verifyDefenseChallenge(token);
    if (!challenge || challenge.userId !== session.user.id || challenge.runId !== runId || !Number.isFinite(durationMs) || durationMs < 1_000 || durationMs > 300_000 || events.length < 1 || events.length > MAX_EVENTS) {
      return NextResponse.json({ error: "Invalid game result." }, { status: 400 });
    }

    const existing = await prisma.gameResult.findUnique({ where: { clientRunId: runId } });
    if (existing) {
      if (existing.userId !== session.user.id) return NextResponse.json({ error: "Invalid game result." }, { status: 400 });
      const rewards = defenseRewards(existing);
      return NextResponse.json({ ...existing, grade: defenseGrade(existing.accuracy, existing.maxCombo, existing.destroyed), stars: rewards.stars, medals: rewards.medals });
    }

    const processed = processEvents(events, challenge.words, challenge.difficulty, durationMs);
    if (!processed) return NextResponse.json({ error: "Invalid game event stream." }, { status: 400 });
    const duration = Math.max(1, Math.round(durationMs / 1000));
    const wpm = Math.round((processed.correctChars / 5) / (durationMs / 60_000));
    const accuracy = processed.correctChars + processed.errorCount > 0
      ? processed.correctChars / (processed.correctChars + processed.errorCount) * 100
      : 0;
    if (wpm > 600) return NextResponse.json({ error: "Invalid game speed." }, { status: 400 });

    const isRanked = user.role === "STUDENT" && duration >= 12 && processed.destroyed >= 5 && accuracy >= 70 && wpm <= 220;
    const rewards = defenseRewards({ ...processed, accuracy });
    const rewardCredits = isRanked ? rewards.credits : 0;
    const result = await prisma.gameResult.create({
      data: {
        clientRunId: runId,
        userId: session.user.id,
        game: "defense",
        language: challenge.language,
        difficulty: challenge.difficulty,
        score: processed.score,
        wpm,
        accuracy,
        destroyed: processed.destroyed,
        missed: processed.missed,
        maxCombo: processed.maxCombo,
        duration,
        correctChars: processed.correctChars,
        errorCount: processed.errorCount,
        bossesDestroyed: processed.bossesDestroyed,
        rewardCredits,
        isRanked,
      },
    });

    return NextResponse.json({ ...result, grade: defenseGrade(accuracy, processed.maxCombo, processed.destroyed), stars: rewards.stars, medals: rewards.medals });
  } catch (error) {
    console.error("Save defense result error:", error);
    return NextResponse.json({ error: "Could not save game result." }, { status: 500 });
  }
}

function processEvents(rawEvents: unknown[], words: string[], difficulty: "easy" | "medium" | "hard", durationMs: number) {
  const progress = new Map<number, number>();
  const resolved = new Set<number>();
  let lastTime = 0;
  let correctChars = 0;
  let errorCount = 0;
  let destroyed = 0;
  let missed = 0;
  let combo = 0;
  let maxCombo = 0;
  let score = 0;
  let bossesDestroyed = 0;
  const powerupCharges: Record<DefensePowerup, number> = { shield: 0, freeze: 0, double: 0 };
  const powerupActiveUntil: Record<DefensePowerup, number> = { shield: 0, freeze: 0, double: 0 };

  for (const rawEvent of rawEvents) {
    if (!rawEvent || typeof rawEvent !== "object") return null;
    const event = rawEvent as Partial<DefenseEvent> & { wordIndex?: unknown; charIndex?: unknown; atMs?: unknown; powerup?: unknown; type?: unknown };
    if (typeof event.atMs !== "number" || !Number.isFinite(event.atMs) || event.atMs < lastTime || event.atMs < 0 || event.atMs > durationMs + 1_000) return null;
    lastTime = event.atMs;

    if (event.type === "error") {
      errorCount += 1;
      combo = 0;
      continue;
    }

    if (event.type === "powerup") {
      const powerup = event.powerup;
      if (powerup !== "shield" && powerup !== "freeze" && powerup !== "double") return null;
      if (powerupCharges[powerup] < 1 || powerupActiveUntil[powerup] > event.atMs) return null;
      powerupCharges[powerup] -= 1;
      powerupActiveUntil[powerup] = event.atMs + DEFENSE_POWERUP_DURATION_MS[powerup];
      continue;
    }

    if (!Number.isInteger(event.wordIndex) || (event.wordIndex as number) < 0 || (event.wordIndex as number) >= words.length) return null;
    const wordIndex = event.wordIndex as number;
    if (resolved.has(wordIndex)) return null;
    const targetKind = defenseTargetKind(wordIndex, difficulty);
    const requiredHits = defenseRequiredHits(words[wordIndex], targetKind);

    if (event.type === "hit") {
      const currentProgress = progress.get(wordIndex) ?? 0;
      if (!Number.isInteger(event.charIndex) || event.charIndex !== currentProgress || currentProgress >= requiredHits) return null;
      progress.set(wordIndex, currentProgress + 1);
      correctChars += 1;
      continue;
    }

    if (event.type === "destroyed") {
      if ((progress.get(wordIndex) ?? 0) !== requiredHits) return null;
      resolved.add(wordIndex);
      destroyed += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      const scoreMultiplier = powerupActiveUntil.double > event.atMs ? 2 : 1;
      score += defenseWordScore(words[wordIndex], difficulty, combo, targetKind) * scoreMultiplier;
      if (targetKind === "boss") bossesDestroyed += 1;
      const powerup = defensePowerupDrop(wordIndex);
      if (powerup) powerupCharges[powerup] = Math.min(2, powerupCharges[powerup] + 1);
      continue;
    }

    if (event.type === "missed") {
      resolved.add(wordIndex);
      missed += 1;
      combo = 0;
      continue;
    }

    return null;
  }

  if (destroyed + missed < 1) return null;
  return { correctChars, errorCount, destroyed, missed, maxCombo, score, bossesDestroyed };
}
