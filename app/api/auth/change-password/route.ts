import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptPassword } from "@/lib/password-vault";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8 || !/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json(
      { error: "Use at least 8 characters with a letter and a number." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true } });
  if (!user?.isActive) return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, passwordEncrypted: encryptPassword(password), mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
