import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";

export async function POST() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Use the reviewed import flow on the Students page." },
    { status: 410 },
  );
}
