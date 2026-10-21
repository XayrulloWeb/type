import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateTypingStats, MINIMUM_RANKED_ACCURACY, type TypingTelemetry } from "@/lib/typing";
import { verifyTestChallenge } from "@/lib/test-challenge";
import { prepareTypingText } from "@/lib/typing-text";
import { analyzeTestRisk } from "@/lib/test-risk";

const MODES = new Set(["time", "words", "text"]);
const LANGUAGES = new Set(["en", "ru"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true, classId: true, class: { select: { grade: true } } } });
    if (!activeUser?.isActive || activeUser.archivedAt || activeUser.role !== "STUDENT") {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const clientAttemptId = typeof body.clientAttemptId === "string" ? body.clientAttemptId : "";
    const assignmentId = typeof body.assignmentId === "string" && body.assignmentId ? body.assignmentId : null;
    const textId = typeof body.textId === "string" && body.textId ? body.textId : null;
    const challengeToken = typeof body.challengeToken === "string" ? body.challengeToken : "";
    const mode = typeof body.mode === "string" ? body.mode : "";
    const language = typeof body.language === "string" ? body.language : "";
    const expectedText = typeof body.expectedText === "string" ? body.expectedText : "";
    const typedText = typeof body.typedText === "string" ? body.typedText : "";
    const duration = typeof body.duration === "number" ? body.duration : Number.NaN;
    const selectedDuration = typeof body.selectedDuration === "number" ? body.selectedDuration : undefined;
    const wordsCount = typeof body.wordsCount === "number" ? body.wordsCount : undefined;
    const focusLostCount = typeof body.focusLostCount === "number" ? Math.max(0, Math.round(body.focusLostCount)) : 0;
    const pasteDetected = body.pasteDetected === true;
    const telemetry = parseTelemetry(body.telemetry);
    const challenge = verifyTestChallenge(challengeToken);

    if (
      !challenge ||
      challenge.userId !== session.user.id ||
      challenge.clientAttemptId !== clientAttemptId ||
      challenge.mode !== mode ||
      challenge.language !== language ||
      challenge.expectedText !== expectedText ||
      (challenge.assignmentId ?? null) !== assignmentId ||
      (challenge.textId ?? null) !== textId ||
      challenge.selectedDuration !== selectedDuration ||
      challenge.wordsCount !== wordsCount ||
      !MODES.has(mode) ||
      !/^[0-9a-f-]{36}$/i.test(clientAttemptId) ||
      !LANGUAGES.has(language) ||
      !expectedText ||
      expectedText.length > 3000 ||
      typedText.length > 3500 ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 900
    ) {
      return NextResponse.json({ error: "Invalid test result." }, { status: 400 });
    }

    const assignment = assignmentId ? await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { text: true },
    }) : null;
    if (assignmentId && (
      !assignment?.isActive || assignment.classId !== activeUser.classId || mode !== "text" ||
      language !== assignment.text.language || expectedText !== prepareTypingText(assignment.text.content)
    )) {
      return NextResponse.json({ error: "This assignment is not available to your account." }, { status: 403 });
    }
    const libraryText = textId ? await prisma.text.findUnique({ where: { id: textId } }) : null;
    if (textId && (
      !libraryText?.isActive || mode !== "text" || language !== libraryText.language || expectedText !== prepareTypingText(libraryText.content) ||
      !["ru", "en"].includes(libraryText.language)
    )) {
      return NextResponse.json({ error: "This text is not available." }, { status: 403 });
    }

    const existingResult = await prisma.testResult.findUnique({
      where: { clientAttemptId },
      select: { id: true, userId: true, isRanked: true, reviewStatus: true, reviewReasons: true, riskScore: true, wpm: true, accuracy: true },
    });
    if (existingResult) {
      if (existingResult.userId !== session.user.id) {
        return NextResponse.json({ error: "Invalid test result." }, { status: 400 });
      }
      const [overallAverage, languageAverage, assignmentResult] = await Promise.all([
        prisma.testResult.aggregate({ where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] } }, _avg: { wpm: true }, _count: { _all: true } }),
        prisma.testResult.aggregate({ where: { userId: session.user.id, isRanked: true, language }, _avg: { wpm: true }, _count: { _all: true } }),
        assignmentId ? prisma.assignmentResult.findUnique({ where: { assignmentId_userId: { assignmentId, userId: session.user.id } }, select: { status: true } }) : null,
      ]);
      return NextResponse.json({
        id: existingResult.id,
        isRanked: existingResult.isRanked,
        reviewStatus: existingResult.reviewStatus,
        riskScore: existingResult.riskScore,
        wpm: existingResult.wpm,
        newPersonalBest: false,
        overallAverageWpm: Math.round(overallAverage._avg.wpm ?? 0),
        overallTestsCount: overallAverage._count._all,
        languageAverageWpm: Math.round(languageAverage._avg.wpm ?? 0),
        languageTestsCount: languageAverage._count._all,
        assignmentCompleted: assignmentResult?.status === "completed",
        reviewReasons: readReasons(existingResult.reviewReasons, existingResult.accuracy),
      });
    }

    const stats = calculateTypingStats({
      expectedText,
      typedText,
      durationSeconds: duration,
      countMissed: mode !== "time",
      focusLostCount,
    });
    const previousResults = await prisma.testResult.findMany({
      where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { wpm: true, accuracy: true, duration: true, mode: true, language: true },
    });
    const risk = analyzeTestRisk({
      stats,
      telemetry,
      mode: mode as "time" | "words" | "text",
      language,
      selectedDuration,
      pasteDetected,
      grade: activeUser.class?.grade ?? null,
      previousResults,
    });

    let assignmentCompleted = false;
    const result = await prisma.$transaction(async (transaction) => {
      const created = await transaction.testResult.create({
        data: {
          clientAttemptId,
          userId: session.user.id,
          mode,
          language,
          duration: Math.max(1, Math.round(stats.timeElapsed)),
          wordsCount,
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          correctChars: stats.correctChars,
          incorrectChars: stats.incorrectChars,
          extraChars: stats.extraChars,
          missedChars: stats.missedChars,
          focusLostCount: stats.focusLostCount,
          pasteDetected,
          keystrokeCount: telemetry.keystrokeCount,
          backspaceCount: telemetry.backspaceCount,
          maxBurstCps: telemetry.maxBurstCps,
          timingVariation: telemetry.timingVariation,
          isRanked: risk.isRanked,
          reviewStatus: risk.reviewStatus,
          reviewReasons: risk.reasons,
          riskScore: risk.riskScore,
          baselineWpm: risk.baselineWpm,
          previousBestWpm: risk.previousBestWpm,
        },
        select: { id: true, isRanked: true, reviewStatus: true, riskScore: true, wpm: true },
      });
      if (assignment) {
        const previous = await transaction.assignmentResult.findUnique({
          where: { assignmentId_userId: { assignmentId: assignment.id, userId: session.user.id } },
          select: { status: true },
        });
        const meetsRequirements = risk.isRanked &&
          (assignment.minimumWpm === null || stats.wpm >= assignment.minimumWpm) &&
          (assignment.minimumAccuracy === null || stats.accuracy >= assignment.minimumAccuracy);
        assignmentCompleted = meetsRequirements || previous?.status === "completed";
        await transaction.assignmentResult.upsert({
          where: { assignmentId_userId: { assignmentId: assignment.id, userId: session.user.id } },
          create: {
            assignmentId: assignment.id,
            userId: session.user.id,
            testResultId: created.id,
            status: assignmentCompleted ? "completed" : "not_completed",
            completedAt: assignmentCompleted ? new Date() : null,
          },
          update: {
            testResultId: created.id,
            status: assignmentCompleted ? "completed" : "not_completed",
            completedAt: assignmentCompleted && previous?.status !== "completed" ? new Date() : undefined,
          },
        });
      }
      return created;
    });

    const [overallAverage, languageAverage] = await Promise.all([
      prisma.testResult.aggregate({
        where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] } },
        _avg: { wpm: true },
        _count: { _all: true },
      }),
      prisma.testResult.aggregate({
        where: { userId: session.user.id, isRanked: true, language },
        _avg: { wpm: true },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      ...result,
      newPersonalBest: result.isRanked && result.wpm > (risk.previousBestWpm ?? 0),
      overallAverageWpm: Math.round(overallAverage._avg.wpm ?? 0),
      overallTestsCount: overallAverage._count._all,
      languageAverageWpm: Math.round(languageAverage._avg.wpm ?? 0),
      languageTestsCount: languageAverage._count._all,
      assignmentCompleted,
      reviewReasons: risk.reasons,
    });
  } catch (error) {
    console.error("Save test error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

function parseTelemetry(value: unknown): TypingTelemetry {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    keystrokeCount: boundedInteger(source.keystrokeCount, 0, 10_000),
    backspaceCount: boundedInteger(source.backspaceCount, 0, 10_000),
    maxBurstCps: boundedNumber(source.maxBurstCps, 0, 200),
    timingVariation: source.timingVariation === null ? null : boundedNumber(source.timingVariation, 0, 10),
  };
}

function boundedInteger(value: unknown, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : minimum));
}

function boundedNumber(value: unknown, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, typeof value === "number" && Number.isFinite(value) ? value : minimum));
}

function readReasons(value: unknown, accuracy: number) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return accuracy < MINIMUM_RANKED_ACCURACY ? ["accuracy_too_low"] : [];
}
