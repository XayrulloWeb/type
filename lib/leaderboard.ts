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
  const groups = await prisma.testResult.groupBy({
    by: ["userId"],
    where: {
      isRanked: true,
      ...(createdAt ? { createdAt: { gte: createdAt } } : {}),
      ...(language !== "all" ? { language } : { language: { in: ["ru", "en"] } }),
      ...(classId
        ? { user: { classId, role: "STUDENT", isActive: true, archivedAt: null } }
        : { user: { role: "STUDENT", isActive: true, archivedAt: null } }),
    },
    _avg: { wpm: true, accuracy: true },
    _max: { wpm: true, createdAt: true },
    _count: { _all: true },
  });
  if (!groups.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((item) => item.userId) } },
    include: { class: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return groups
    .flatMap((item): StudentRanking[] => {
      const user = usersById.get(item.userId);
      if (!user || item._max.createdAt === null) return [];
      return [{
        userId: item.userId,
        user,
        averageWpm: Math.round(item._avg.wpm ?? 0),
        bestWpm: item._max.wpm ?? 0,
        averageAccuracy: item._avg.accuracy ?? 0,
        testsCount: item._count._all,
        lastActiveAt: item._max.createdAt,
      }];
    })
    .sort((a, b) => b.bestWpm - a.bestWpm || b.averageAccuracy - a.averageAccuracy || b.averageWpm - a.averageWpm);
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
