import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTestChallenge, type TestLanguage, type TestMode } from "@/lib/test-challenge";

const MODES = new Set<TestMode>(["time", "words", "text"]);
const LANGUAGES = new Set<TestLanguage>(["en", "ru"]);
const DURATIONS = new Set([15, 30, 60, 120]);
const WORD_COUNTS = new Set([10, 25, 50, 100]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true, archivedAt: true, classId: true },
  });
  if (!student?.isActive || student.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(student.role)) {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid challenge request." }, { status: 400 });
  const assignmentId = typeof body.assignmentId === "string" && body.assignmentId ? body.assignmentId : undefined;
  const textId = typeof body.textId === "string" && body.textId ? body.textId : undefined;
  if (assignmentId && textId) return NextResponse.json({ error: "Invalid challenge source." }, { status: 400 });

  if (assignmentId) {
    if (student.role !== "STUDENT") return NextResponse.json({ error: "This assignment is not available to your account." }, { status: 403 });
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { text: true } });
    if (!assignment?.isActive || assignment.classId !== student.classId || !LANGUAGES.has(assignment.text.language as TestLanguage)) {
      return NextResponse.json({ error: "This assignment is not available to your account." }, { status: 403 });
    }
    return NextResponse.json(createTestChallenge({
      userId: session.user.id,
      mode: "text",
      language: assignment.text.language as TestLanguage,
      expectedText: assignment.text.content,
      assignmentId,
    }));
  }

  if (textId) {
    const text = await prisma.text.findUnique({ where: { id: textId } });
    if (!text?.isActive || !LANGUAGES.has(text.language as TestLanguage)) {
      return NextResponse.json({ error: "This text is not available." }, { status: 404 });
    }
    return NextResponse.json(createTestChallenge({
      userId: session.user.id,
      mode: "text",
      language: text.language as TestLanguage,
      expectedText: text.content,
      textId,
    }));
  }

  const modeValue = typeof body.mode === "string" ? body.mode : "";
  const languageValue = typeof body.language === "string" ? body.language : "";
  const selectedDuration = typeof body.selectedDuration === "number" ? body.selectedDuration : undefined;
  const wordsCount = typeof body.wordsCount === "number" ? body.wordsCount : undefined;
  if (
    !MODES.has(modeValue as TestMode) ||
    !LANGUAGES.has(languageValue as TestLanguage) ||
    (modeValue === "time" && (!selectedDuration || !DURATIONS.has(selectedDuration))) ||
    (modeValue === "words" && (!wordsCount || !WORD_COUNTS.has(wordsCount)))
  ) return NextResponse.json({ error: "Invalid challenge request." }, { status: 400 });

  const mode = modeValue as TestMode;
  const language = languageValue as TestLanguage;
  return NextResponse.json(createTestChallenge({ userId: session.user.id, mode, language, selectedDuration, wordsCount }));
}
