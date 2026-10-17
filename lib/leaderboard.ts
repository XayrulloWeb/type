import type { Class, User } from "@prisma/client";
import { prisma } from "@/lib/db";

export type Period = "today" | "week" | "month" | "all";
export type LanguageFilter = "all" | "en" | "ru";

export interface StudentRanking {
  userId: string;
  user: User & { class: Class | null };
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  testsCount: number;
  lastActiveAt: Date;
}

export function normalizePeriod(value: string | string[] | undefined): Period {
  return value === "today" || value === "week" || value === "month" ? value : "all";
}

export function normalizeLanguage(value: string | string[] | undefined): LanguageFilter {
  return value === "en" || value === "ru" ? value : "all";
}

function periodStart(period: Period) {
  if (period === "all") return undefined;
  const date = new Date();
  if (period === "today") date.setHours(0, 0, 0, 0);
  if (period === "week") date.setDate(date.getDate() - 7);
  if (period === "month") date.setMonth(date.getMonth() - 1);
  return date;
}

export async function getStudentRankings(period: Period, classId?: string, language: LanguageFilter = "all") {
  const createdAt = periodStart(period);
  const results = await prisma.testResult.findMany({
    where: {
      isRanked: true,
      ...(createdAt ? { createdAt: { gte: createdAt } } : {}),
      ...(language !== "all" ? { language } : { language: { in: ["ru", "en"] } }),
      ...(classId
        ? { user: { classId, role: "STUDENT", isActive: true, archivedAt: null } }
        : { user: { role: "STUDENT", isActive: true, archivedAt: null } }),
    },
    include: { user: { include: { class: true } } },
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<string, {
    user: StudentRanking["user"];
    totalWpm: number;
    bestWpm: number;
    totalAccuracy: number;
    testsCount: number;
    lastActiveAt: Date;
  }>();

  for (const result of results) {
    const item = grouped.get(result.userId) ?? {
      user: result.user,
      totalWpm: 0,
      bestWpm: 0,
      totalAccuracy: 0,
      testsCount: 0,
      lastActiveAt: result.createdAt,
    };
    item.totalWpm += result.wpm;
    item.bestWpm = Math.max(item.bestWpm, result.wpm);
    item.totalAccuracy += result.accuracy;
    item.testsCount += 1;
    if (result.createdAt > item.lastActiveAt) item.lastActiveAt = result.createdAt;
    grouped.set(result.userId, item);
  }

  return [...grouped.entries()]
    .map(([userId, item]): StudentRanking => ({
      userId,
      user: item.user,
      averageWpm: Math.round(item.totalWpm / item.testsCount),
      bestWpm: item.bestWpm,
      averageAccuracy: item.totalAccuracy / item.testsCount,
      testsCount: item.testsCount,
      lastActiveAt: item.lastActiveAt,
    }))
    .sort((a, b) => b.averageWpm - a.averageWpm || b.averageAccuracy - a.averageAccuracy || b.bestWpm - a.bestWpm);
}

export async function getClassRankings(period: Period, language: LanguageFilter = "all") {
  const students = await getStudentRankings(period, undefined, language);
  const groups = new Map<string, {
    id: string;
    name: string;
    totalAverageWpm: number;
    totalAccuracy: number;
    students: number;
    tests: number;
  }>();

  for (const student of students) {
    if (!student.user.class) continue;
    const item = groups.get(student.user.class.id) ?? {
      id: student.user.class.id,
      name: student.user.class.name,
      totalAverageWpm: 0,
      totalAccuracy: 0,
      students: 0,
      tests: 0,
    };
    item.totalAverageWpm += student.averageWpm;
    item.totalAccuracy += student.averageAccuracy;
    item.students += 1;
    item.tests += student.testsCount;
    groups.set(item.id, item);
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      averageWpm: Math.round(item.totalAverageWpm / item.students),
      averageAccuracy: item.totalAccuracy / item.students,
    }))
    .sort((a, b) => b.averageWpm - a.averageWpm || b.averageAccuracy - a.averageAccuracy);
}
