import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getOlympiadExportData, rankedParticipants } from "@/lib/olympiad-data";

function fit(font: { widthOfTextAtSize(text: string, size: number): number }, text: string, maxWidth: number, initial: number) {
  let size = initial;
  while (size > 18 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const olympiad = await getOlympiadExportData(id);
  if (!olympiad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ranked = rankedParticipants(olympiad.participants);
  const winners = [5, 6, 7].flatMap((grade) => ranked.filter((item) => item.user.class?.grade === grade).slice(0, 3).map((item, index) => ({ item, grade, place: index + 1 })));
  if (!winners.length) return NextResponse.json({ error: "Нет результатов для дипломов" }, { status: 409 });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontDir = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontDir, "DejaVuSans.ttf")),
    readFile(path.join(fontDir, "DejaVuSans-Bold.ttf")),
  ]);
  const regular = await pdf.embedFont(regularBytes);
  const bold = await pdf.embedFont(boldBytes);
  const pageWidth = 842;
  const pageHeight = 595;
  const gold = rgb(0.85, 0.68, 0.28);
  const charcoal = rgb(0.08, 0.09, 0.1);
  const muted = rgb(0.38, 0.4, 0.42);

  for (const { item, grade, place } of winners) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.96, 0.95, 0.91) });
    page.drawRectangle({ x: 22, y: 22, width: pageWidth - 44, height: pageHeight - 44, borderColor: gold, borderWidth: 3 });
    page.drawRectangle({ x: 33, y: 33, width: pageWidth - 66, height: pageHeight - 66, borderColor: charcoal, borderWidth: 0.8 });
    const center = (text: string, y: number, size: number, activeFont = regular, color = charcoal) => page.drawText(text, { x: (pageWidth - activeFont.widthOfTextAtSize(text, size)) / 2, y, size, font: activeFont, color });
    center("NOVA TYPE", 515, 14, bold, gold);
    center("ДИПЛОМ", 438, 46, bold, charcoal);
    center(`${place} МЕСТО · ${grade} КЛАСС`, 397, 16, bold, gold);
    center("награждается", 345, 13, regular, muted);
    const fullName = `${item.user.firstName} ${item.user.lastName}`;
    const nameSize = fit(bold, fullName, 690, 34);
    center(fullName, 292, nameSize, bold, charcoal);
    center(item.user.class?.name ?? "", 260, 15, regular, muted);
    center(`за результат в олимпиаде «${olympiad.title}»`, 211, 14, regular, charcoal);
    center(`${item.wpm ?? 0} WPM · точность ${(item.accuracy ?? 0).toFixed(1)}%`, 174, 18, bold, gold);
    center(new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(olympiad.endedAt ?? olympiad.startedAt ?? new Date()), 80, 11, regular, muted);
  }

  const bytes = await pdf.save();
  const filename = encodeURIComponent(`diplomas-${olympiad.title}.pdf`);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${filename}` } });
}
