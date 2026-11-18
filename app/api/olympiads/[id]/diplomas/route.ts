import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { createOlympiadDiplomas } from "@/lib/olympiad-diploma";
import { getOlympiadExportData, rankedParticipants } from "@/lib/olympiad-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const olympiad = await getOlympiadExportData(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ranked = rankedParticipants(olympiad.participants);
  const winners = [5, 6, 7].flatMap((grade) => ranked.filter((item) => item.user.class?.grade === grade).slice(0, 3).map((item, index) => ({ item, grade, place: index + 1 })));
  if (!winners.length) return NextResponse.json({ error: "Нет результатов для дипломов" }, { status: 409 });

  const fontDir = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontDir, "DejaVuSans.ttf")),
    readFile(path.join(fontDir, "DejaVuSans-Bold.ttf")),
  ]);
  const bytes = await createOlympiadDiplomas({
    olympiadTitle: olympiad.title,
    awardDate: olympiad.endedAt ?? olympiad.startedAt ?? new Date(),
    regularFontBytes: regularBytes,
    boldFontBytes: boldBytes,
    winners: winners.map(({ item, grade, place }) => ({
      firstName: item.user.firstName,
      lastName: item.user.lastName,
      className: item.user.class?.name ?? `${grade} класс`,
      grade,
      place,
      wpm: item.wpm ?? 0,
      accuracy: item.accuracy ?? 0,
    })),
  });
  const filename = encodeURIComponent(`diplomas-${olympiad.title}.pdf`);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${filename}` } });
}
