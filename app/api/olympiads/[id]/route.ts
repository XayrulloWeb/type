import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateTypingStats } from "@/lib/typing";

type CompetitionPhase = "WAITING" | "COUNTDOWN" | "ATTEMPT_1" | "BREAK" | "ATTEMPT_2" | "FINISHED";

function timeline(startedAt: Date, durationSeconds: number, breakSeconds: number) {
  const firstStart = startedAt.getTime();
  const firstEnd = firstStart + durationSeconds * 1_000;
  const secondStart = firstEnd + breakSeconds * 1_000;
  const secondEnd = secondStart + durationSeconds * 1_000;
  return { firstStart, firstEnd, secondStart, secondEnd };
}

function phaseFor(status: string, startedAt: Date | null, durationSeconds: number, breakSeconds: number, now = Date.now()): CompetitionPhase {
  if (status === "WAITING" || !startedAt) return "WAITING";
  if (status === "FINISHED" || status === "CANCELLED") return "FINISHED";
  const times = timeline(startedAt, durationSeconds, breakSeconds);
  if (now < times.firstStart) return "COUNTDOWN";
  if (now < times.firstEnd) return "ATTEMPT_1";
  if (now < times.secondStart) return "BREAK";
  if (now < times.secondEnd) return "ATTEMPT_2";
  return "FINISHED";
}

async function syncOlympiadState(id: string, status: string, scheduledAt: Date | null, startedAt: Date | null, durationSeconds: number, breakSeconds: number) {
  if (status === "WAITING" && scheduledAt && Date.now() >= scheduledAt.getTime()) {
    await prisma.olympiad.updateMany({
      where: { id, status: "WAITING" },
      data: { status: "RUNNING", startedAt: scheduledAt },
    });
    status = "RUNNING";
    startedAt = scheduledAt;
  }
  if (status !== "RUNNING" || !startedAt) return status;
  const { secondEnd } = timeline(startedAt, durationSeconds, breakSeconds);
  if (Date.now() < secondEnd) return status;
  await prisma.olympiad.updateMany({
    where: { id, status: "RUNNING" },
    data: { status: "FINISHED", endedAt: new Date(secondEnd) },
  });
  return "FINISHED";
}

async function getOlympiad(id: string) {
  return prisma.olympiad.findUnique({
    where: { id },
    include: {
      targetClasses: { include: { class: true } },
      participants: {
        include: {
          user: { include: { class: true } },
          attempts: { orderBy: { attemptNumber: "asc" } },
        },
        orderBy: [{ wpm: "desc" }, { accuracy: "desc" }, { submittedAt: "asc" }],
      },
    },
  });
}

type LoadedOlympiad = NonNullable<Awaited<ReturnType<typeof getOlympiad>>>;
type LoadedParticipant = LoadedOlympiad["participants"][number];

function participantJson(item: LoadedParticipant) {
  return {
    id: item.id,
    userId: item.userId,
    name: `${item.user.firstName} ${item.user.lastName}`,
    className: item.user.class?.name ?? "—",
    joinedAt: item.joinedAt,
    submittedAt: item.submittedAt,
    hasResult: item.wpm !== null,
    wpm: item.wpm,
    accuracy: item.accuracy,
    errors: (item.incorrectChars ?? 0) + (item.extraChars ?? 0) + (item.missedChars ?? 0),
    needsReview: item.needsReview,
    grade: item.user.class?.grade ?? null,
    disqualified: Boolean(item.disqualifiedAt),
    disqualificationReason: item.disqualificationReason,
    attemptsCompleted: item.attempts.map((attempt) => attempt.attemptNumber),
    attempts: item.attempts.map((attempt) => ({
      attemptNumber: attempt.attemptNumber,
      wpm: attempt.wpm,
      accuracy: attempt.accuracy,
      needsReview: attempt.needsReview,
    })),
  };
}

function currentAttemptDetails(olympiad: LoadedOlympiad, now = Date.now()) {
  const phase = phaseFor(olympiad.status, olympiad.startedAt, olympiad.durationSeconds, olympiad.breakSeconds, now);
  if (!olympiad.startedAt) return { phase, attemptNumber: null, attemptStartedAt: null, attemptEndsAt: null };
  const times = timeline(olympiad.startedAt, olympiad.durationSeconds, olympiad.breakSeconds);
  if (phase === "ATTEMPT_1" || phase === "COUNTDOWN") {
    return { phase, attemptNumber: 1, attemptStartedAt: new Date(times.firstStart), attemptEndsAt: new Date(times.firstEnd) };
  }
  if (phase === "BREAK" || phase === "ATTEMPT_2") {
    return { phase, attemptNumber: 2, attemptStartedAt: new Date(times.secondStart), attemptEndsAt: new Date(times.secondEnd) };
  }
  return { phase, attemptNumber: null, attemptStartedAt: null, attemptEndsAt: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let olympiad = await getOlympiad(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStatus = await syncOlympiadState(id, olympiad.status, olympiad.scheduledAt, olympiad.startedAt, olympiad.durationSeconds, olympiad.breakSeconds);
  if (nextStatus !== olympiad.status) olympiad = await getOlympiad(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const classIds = olympiad.targetClasses.map((item) => item.classId);
  const eligibleCount = await prisma.user.count({ where: { role: "STUDENT", isActive: true, classId: { in: classIds } } });
  const isAdmin = session.user.role === "SUPER_ADMIN";
  const ownEntry = olympiad.participants.find((item) => item.userId === session.user.id);
  if (!isAdmin) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true, isActive: true, class: { select: { grade: true } } } });
    if (!user?.isActive || !user.classId || !classIds.includes(user.classId) || !user.class || ![5, 6, 7].includes(user.class.grade)) {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }
  }

  const timing = currentAttemptDetails(olympiad);
  const currentSubmitted = timing.attemptNumber ? Boolean(ownEntry?.attempts.some((attempt) => attempt.attemptNumber === timing.attemptNumber)) : false;
  const attemptText = timing.attemptNumber === 1
    ? olympiad.text
    : timing.attemptNumber === 2
      ? olympiad.textSecond ?? olympiad.text
      : null;
  const revealStandings = isAdmin || olympiad.status === "FINISHED";
  return NextResponse.json({
    serverTime: new Date(),
    olympiad: {
      id: olympiad.id,
      title: olympiad.title,
      description: olympiad.description,
      language: olympiad.language,
      durationSeconds: olympiad.durationSeconds,
      attemptLimit: olympiad.attemptLimit,
      breakSeconds: olympiad.breakSeconds,
      totalDurationSeconds: olympiad.durationSeconds * olympiad.attemptLimit + olympiad.breakSeconds,
      status: olympiad.status,
      phase: timing.phase,
      attemptNumber: timing.attemptNumber,
      attemptStartedAt: timing.attemptStartedAt,
      attemptEndsAt: timing.attemptEndsAt,
      startedAt: olympiad.startedAt,
      scheduledAt: olympiad.scheduledAt,
      endedAt: olympiad.endedAt,
      classes: olympiad.targetClasses.map((item) => item.class.name),
      eligibleCount,
      joinedCount: olympiad.participants.length,
      finishedCount: olympiad.participants.filter((item) => item.attempts.length >= olympiad.attemptLimit).length,
      joined: Boolean(ownEntry),
      submitted: currentSubmitted,
      attemptsCompleted: ownEntry?.attempts.map((attempt) => attempt.attemptNumber) ?? [],
      attemptText: (isAdmin || (ownEntry && olympiad.status === "RUNNING" && ["ATTEMPT_1", "ATTEMPT_2"].includes(timing.phase))) ? attemptText : null,
      participants: revealStandings ? olympiad.participants.map(participantJson) : [],
      ownResult: ownEntry && ownEntry.wpm !== null ? participantJson(ownEntry) : null,
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;
  let olympiad = await getOlympiad(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const nextStatus = await syncOlympiadState(id, olympiad.status, olympiad.scheduledAt, olympiad.startedAt, olympiad.durationSeconds, olympiad.breakSeconds);
  if (nextStatus !== olympiad.status) olympiad = await getOlympiad(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const classIds = olympiad.targetClasses.map((item) => item.classId);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { classId: true, isActive: true, class: { select: { grade: true } } } });
  if (!user?.isActive || !user.classId || !classIds.includes(user.classId) || !user.class || ![5, 6, 7].includes(user.class.grade)) {
    return NextResponse.json({ error: "Not eligible" }, { status: 403 });
  }

  if (action === "join") {
    if (olympiad.status !== "WAITING") return NextResponse.json({ error: "Olympiad already started" }, { status: 409 });
    await prisma.olympiadParticipant.upsert({
      where: { olympiadId_userId: { olympiadId: id, userId: session.user.id } },
      create: { olympiadId: id, userId: session.user.id },
      update: {},
    });
    const [eligibleCount, joinedCount] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", isActive: true, classId: { in: classIds } } }),
      prisma.olympiadParticipant.count({ where: { olympiadId: id } }),
    ]);
    if (!olympiad.scheduledAt && eligibleCount > 0 && joinedCount >= eligibleCount) {
      await prisma.olympiad.updateMany({
        where: { id, status: "WAITING" },
        data: { status: "RUNNING", startedAt: new Date(Date.now() + 5_000) },
      });
    }
    return NextResponse.json({ joined: true });
  }

  if (action === "submit") {
    const attemptNumber = Number(body?.attemptNumber);
    if (attemptNumber !== 1 && attemptNumber !== 2) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    const participant = olympiad.participants.find((item) => item.userId === session.user.id);
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 409 });
    if (participant.attempts.some((attempt) => attempt.attemptNumber === attemptNumber)) return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    if (!olympiad.startedAt || !["RUNNING", "FINISHED"].includes(olympiad.status)) return NextResponse.json({ error: "Olympiad not running" }, { status: 409 });

    const times = timeline(olympiad.startedAt, olympiad.durationSeconds, olympiad.breakSeconds);
    const officialStart = attemptNumber === 1 ? times.firstStart : times.secondStart;
    const officialEnd = attemptNumber === 1 ? times.firstEnd : times.secondEnd;
    const now = new Date();
    if (now.getTime() < officialStart - 500) return NextResponse.json({ error: "Too early" }, { status: 409 });
    if (now.getTime() > officialEnd + 30_000) return NextResponse.json({ error: "Submission window closed" }, { status: 409 });

    const expectedText = attemptNumber === 1 ? olympiad.text : olympiad.textSecond ?? olympiad.text;
    const typedText = typeof body?.typedText === "string" ? body.typedText : "";
    const focusLostCount = typeof body?.focusLostCount === "number" ? Math.max(0, Math.round(body.focusLostCount)) : 0;
    const pasteDetected = body?.pasteDetected === true;
    if (typedText.length > expectedText.length + 100) return NextResponse.json({ error: "Invalid result" }, { status: 400 });

    const duration = Math.max(1, Math.min(olympiad.durationSeconds, (Math.min(now.getTime(), officialEnd) - officialStart) / 1_000));
    const stats = calculateTypingStats({ expectedText, typedText, durationSeconds: duration, countMissed: true, focusLostCount });
    const needsReview = pasteDetected || focusLostCount > 3 || stats.wpm > 220 || stats.rawWpm > 260;
    const isBetter = participant.wpm === null || stats.wpm > participant.wpm || (stats.wpm === participant.wpm && stats.accuracy > (participant.accuracy ?? 0));

    await prisma.$transaction([
      prisma.olympiadAttempt.create({
        data: {
          participantId: participant.id,
          attemptNumber,
          submittedAt: now,
          duration: Math.round(duration),
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          correctChars: stats.correctChars,
          incorrectChars: stats.incorrectChars,
          extraChars: stats.extraChars,
          missedChars: stats.missedChars,
          focusLostCount,
          pasteDetected,
          needsReview,
        },
      }),
      prisma.olympiadParticipant.update({
        where: { id: participant.id },
        data: {
          submittedAt: attemptNumber === 2 ? now : participant.submittedAt,
          ...(isBetter ? {
            duration: Math.round(duration),
            wpm: stats.wpm,
            rawWpm: stats.rawWpm,
            accuracy: stats.accuracy,
            correctChars: stats.correctChars,
            incorrectChars: stats.incorrectChars,
            extraChars: stats.extraChars,
            missedChars: stats.missedChars,
            focusLostCount,
            pasteDetected,
            needsReview,
          } : {}),
        },
      }),
    ]);
    return NextResponse.json({ attemptNumber, wpm: stats.wpm, accuracy: stats.accuracy, needsReview, bestWpm: isBetter ? stats.wpm : participant.wpm });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
