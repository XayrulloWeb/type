import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale === "ru" ? "ru" : null;
  if (!locale) return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  const response = NextResponse.json({ locale });
  response.cookies.set("nova_locale", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31_536_000,
  });
  return response;
}
