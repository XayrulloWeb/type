import "server-only";
import { randomInt } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

function usernamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "student";
}

export async function createUniqueUsername(firstName: string, className: string) {
  const base = `${usernamePart(firstName)}.${usernamePart(className)}`;
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }
  return username;
}

export function generateTemporaryPassword() {
  return `NOVA-${randomInt(1000, 10_000)}`;
}
