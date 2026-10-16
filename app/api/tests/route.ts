import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateTypingStats, getRankingState } from "@/lib/typing";

const MODES = new Set(["time", "words", "text"]);
const LANGUAGES = new Set(["en", "ru"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true, classId: true } });
    if (!activeUser?.isActive) {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const clientAttemptId = typeof body.clientAttemptId === "string" ? body.clientAttemptId : "";
    const assignmentId = typeof body.assignmentId === "string" && body.assignmentId ? body.assignmentId : null;
    const mode = typeof body.mode === "string" ? body.mode : "";
    const language = typeof body.language === "string" ? body.language : "";
    const expectedText = typeof body.expectedText === "string" ? body.expectedText : "";
    const typedText = typeof body.typedText === "string" ? body.typedText : "";
    const duration = typeof body.duration === "number" ? body.duration : Number.NaN;
    const selectedDuration = typeof body.selectedDuration === "number" ? body.selectedDuration : undefined;
    const wordsCount = typeof body.wordsCount === "number" ? body.wordsCount : undefined;
    const focusLostCount = typeof body.focusLostCount === "number" ? Math.max(0, Math.round(body.focusLostCount)) : 0;
    const pasteDetected = body.pasteDetected === true;

    if (
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
      language !== assignment.text.language || expectedText !== assignment.text.content
    )) {
      return NextResponse.json({ error: "This assignment is not available to your account." }, { status: 403 });
    }

    const existingResult = await prisma.testResult.findUnique({
      where: { clientAttemptId },
      select: { id: true, userId: true, isRanked: true, wpm: true },
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
        wpm: existingResult.wpm,
        newPersonalBest: false,
        overallAverageWpm: Math.round(overallAverage._avg.wpm ?? 0),
        overallTestsCount: overallAverage._count._all,
        languageAverageWpm: Math.round(languageAverage._avg.wpm ?? 0),
        languageTestsCount: languageAverage._count._all,
        assignmentCompleted: assignmentResult?.status === "completed",
        reviewReasons: [],
      });
    }

    const stats = calculateTypingStats({
      expectedText,
      typedText,
      durationSeconds: duration,
      countMissed: mode !== "time",
      focusLostCount,
    });
    const ranking = getRankingState({ stats, selectedDuration, pasteDetected });

    const previousBest = await prisma.testResult.findFirst({
      where: { userId: session.user.id, isRanked: true, language: { in: ["ru", "en"] } },
      orderBy: { wpm: "desc" },
      select: { wpm: true },
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
          isRanked: ranking.isRanked,
          reviewStatus: ranking.isRanked ? null : "pending",
        },
        select: { id: true, isRanked: true, wpm: true },
      });
      if (assignment) {
        const previous = await transaction.assignmentResult.findUnique({
          where: { assignmentId_userId: { assignmentId: assignment.id, userId: session.user.id } },
          select: { status: true },
        });
        const meetsRequirements =
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
      newPersonalBest: result.isRanked && result.wpm > (previousBest?.wpm ?? 0),
      overallAverageWpm: Math.round(overallAverage._avg.wpm ?? 0),
      overallTestsCount: overallAverage._count._all,
      languageAverageWpm: Math.round(languageAverage._avg.wpm ?? 0),
      languageTestsCount: languageAverage._count._all,
      assignmentCompleted,
      reviewReasons: ranking.reasons,
    });
  } catch (error) {
    console.error("Save test error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
