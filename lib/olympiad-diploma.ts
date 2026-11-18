import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, PDFFont, PDFPage, rgb, type RGB } from "pdf-lib";

export interface OlympiadDiplomaWinner {
  firstName: string;
  lastName: string;
  className: string;
  grade: number;
  place: number;
  wpm: number;
  accuracy: number;
}

interface CreateOlympiadDiplomasInput {
  olympiadTitle: string;
  awardDate: Date;
  winners: OlympiadDiplomaWinner[];
  regularFontBytes: Uint8Array;
  boldFontBytes: Uint8Array;
}

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

const palette = {
  paper: rgb(0.972, 0.958, 0.91),
  paperLight: rgb(0.993, 0.987, 0.965),
  ink: rgb(0.045, 0.075, 0.09),
  navy: rgb(0.032, 0.073, 0.092),
  navySoft: rgb(0.063, 0.116, 0.137),
  gold: rgb(0.82, 0.62, 0.17),
  goldLight: rgb(0.944, 0.79, 0.34),
  muted: rgb(0.35, 0.39, 0.4),
  white: rgb(1, 1, 1),
};

const placeStyles: Record<number, { accent: RGB; light: RGB; roman: string; title: string }> = {
  1: { accent: palette.gold, light: palette.goldLight, roman: "I", title: "ДИПЛОМ ПОБЕДИТЕЛЯ" },
  2: { accent: rgb(0.53, 0.58, 0.61), light: rgb(0.78, 0.82, 0.83), roman: "II", title: "ДИПЛОМ ПРИЗЁРА" },
  3: { accent: rgb(0.65, 0.36, 0.18), light: rgb(0.82, 0.55, 0.31), roman: "III", title: "ДИПЛОМ ПРИЗЁРА" },
};

function fitText(font: PDFFont, text: string, maxWidth: number, initial: number, minimum = 16) {
  let size = initial;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function drawCentered(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color: RGB, left = 0, width = PAGE_WIDTH) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: left + (width - textWidth) / 2, y, size, font, color });
}

function drawTrackingText(page: PDFPage, text: string, x: number, y: number, size: number, tracking: number, font: PDFFont, color: RGB) {
  let cursor = x;
  for (const character of Array.from(text)) {
    page.drawText(character, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(character, size) + tracking;
  }
}

function trackingWidth(font: PDFFont, text: string, size: number, tracking: number) {
  const characters = Array.from(text);
  return font.widthOfTextAtSize(text, size) + Math.max(0, characters.length - 1) * tracking;
}

function drawMetric(page: PDFPage, x: number, label: string, value: string, bold: PDFFont, regular: PDFFont, accent: RGB) {
  page.drawRectangle({ x, y: 120, width: 146, height: 58, color: palette.paperLight, borderColor: rgb(0.82, 0.79, 0.69), borderWidth: 0.75 });
  page.drawRectangle({ x, y: 120, width: 4, height: 58, color: accent });
  page.drawText(label, { x: x + 17, y: 157, size: 7.5, font: bold, color: palette.muted });
  page.drawText(value, { x: x + 17, y: 132, size: 18, font: bold, color: palette.ink });
}

function drawCornerOrnaments(page: PDFPage, accent: RGB) {
  const corners = [
    { x: 27, y: 27, sx: 1, sy: 1 },
    { x: PAGE_WIDTH - 27, y: 27, sx: -1, sy: 1 },
    { x: 27, y: PAGE_HEIGHT - 27, sx: 1, sy: -1 },
    { x: PAGE_WIDTH - 27, y: PAGE_HEIGHT - 27, sx: -1, sy: -1 },
  ];
  for (const corner of corners) {
    page.drawLine({ start: { x: corner.x, y: corner.y }, end: { x: corner.x + corner.sx * 42, y: corner.y }, thickness: 2.2, color: accent });
    page.drawLine({ start: { x: corner.x, y: corner.y }, end: { x: corner.x, y: corner.y + corner.sy * 42 }, thickness: 2.2, color: accent });
    page.drawCircle({ x: corner.x + corner.sx * 8, y: corner.y + corner.sy * 8, size: 2.2, color: accent });
  }
}

function drawLaurel(page: PDFPage, centerX: number, centerY: number, accent: RGB) {
  for (let index = 0; index < 7; index += 1) {
    const y = centerY - 34 + index * 12;
    const distance = Math.abs(index - 3) * 2.6;
    page.drawEllipse({ x: centerX - 56 - distance, y, xScale: 7, yScale: 3, rotate: degrees(28), color: accent, opacity: 0.72 });
    page.drawEllipse({ x: centerX + 56 + distance, y, xScale: 7, yScale: 3, rotate: degrees(-28), color: accent, opacity: 0.72 });
  }
}

function drawDiplomaPage(page: PDFPage, winner: OlympiadDiplomaWinner, olympiadTitle: string, awardDate: Date, regular: PDFFont, bold: PDFFont) {
  const style = placeStyles[winner.place] ?? placeStyles[3];
  const contentLeft = 244;
  const contentWidth = 540;

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: palette.paper });
  page.drawRectangle({ x: 14, y: 14, width: PAGE_WIDTH - 28, height: PAGE_HEIGHT - 28, color: palette.paperLight, borderColor: style.accent, borderWidth: 2.4 });
  page.drawRectangle({ x: 21, y: 21, width: PAGE_WIDTH - 42, height: PAGE_HEIGHT - 42, borderColor: palette.navy, borderWidth: 0.7 });
  drawCornerOrnaments(page, style.accent);

  page.drawRectangle({ x: 28, y: 456, width: PAGE_WIDTH - 56, height: 111, color: palette.navy });
  page.drawRectangle({ x: 28, y: 452, width: PAGE_WIDTH - 56, height: 4, color: style.accent });
  page.drawRectangle({ x: 610, y: 456, width: 204, height: 111, color: palette.navySoft, opacity: 0.32 });
  page.drawLine({ start: { x: 635, y: 456 }, end: { x: 745, y: 567 }, thickness: 1, color: style.light, opacity: 0.22 });
  page.drawLine({ start: { x: 676, y: 456 }, end: { x: 786, y: 567 }, thickness: 1, color: style.light, opacity: 0.13 });

  page.drawCircle({ x: 76, y: 510, size: 27, color: style.accent });
  page.drawCircle({ x: 76, y: 510, size: 21.5, color: palette.navy, borderColor: style.light, borderWidth: 0.8 });
  drawCentered(page, "N", 499, 28, bold, style.light, 48, 56);
  page.drawText("NOVA TYPE", { x: 113, y: 516, size: 19, font: bold, color: palette.white });
  const schoolLine = "ШКОЛЬНАЯ ОЛИМПИАДА ПО СКОРОСТНОЙ ПЕЧАТИ";
  drawTrackingText(page, schoolLine, 113, 495, 7.4, 0.65, bold, style.light);

  page.drawText(`${winner.grade} КЛАСС`, { x: 687, y: 515, size: 10, font: bold, color: palette.white });
  page.drawText("2026 · NOVA SCHOOL", { x: 687, y: 494, size: 7.5, font: regular, color: style.light });

  const awardTitleWidth = trackingWidth(bold, style.title, 27, 1.25);
  drawTrackingText(page, style.title, (PAGE_WIDTH - awardTitleWidth) / 2, 410, 27, 1.25, bold, palette.ink);
  const subtitle = `${style.roman} МЕСТО · ${winner.grade} КЛАСС`;
  const subtitleWidth = trackingWidth(bold, subtitle, 10.5, 1.4);
  drawTrackingText(page, subtitle, (PAGE_WIDTH - subtitleWidth) / 2, 387, 10.5, 1.4, bold, style.accent);

  page.drawRectangle({ x: 92, y: 222, width: 29, height: 92, color: style.accent, rotate: degrees(-7), opacity: 0.9 });
  page.drawRectangle({ x: 132, y: 219, width: 29, height: 95, color: style.light, rotate: degrees(7), opacity: 0.9 });
  drawLaurel(page, 128, 304, style.accent);
  page.drawCircle({ x: 128, y: 304, size: 57, color: palette.paperLight, borderColor: style.accent, borderWidth: 4 });
  page.drawCircle({ x: 128, y: 304, size: 47, color: palette.navy, borderColor: style.light, borderWidth: 1.2 });
  drawCentered(page, style.roman, 298, winner.place === 1 ? 35 : 29, bold, style.light, 82, 92);
  drawCentered(page, "МЕСТО", 279, 8, bold, palette.white, 82, 92);

  const awardedText = "НАГРАЖДАЕТСЯ";
  const awardedWidth = trackingWidth(bold, awardedText, 8.5, 1.6);
  drawTrackingText(page, awardedText, contentLeft + (contentWidth - awardedWidth) / 2, 349, 8.5, 1.6, bold, palette.muted);

  const fullName = `${winner.firstName} ${winner.lastName}`.trim();
  const nameSize = fitText(bold, fullName, contentWidth - 20, 33, 20);
  drawCentered(page, fullName, 306, nameSize, bold, palette.ink, contentLeft, contentWidth);
  page.drawLine({ start: { x: contentLeft + 58, y: 292 }, end: { x: contentLeft + contentWidth - 58, y: 292 }, thickness: 1, color: style.accent, opacity: 0.75 });
  drawCentered(page, winner.className, 273, 11, bold, palette.muted, contentLeft, contentWidth);

  drawCentered(page, "за выдающийся результат в школьной олимпиаде", 235, 11.5, regular, palette.ink, contentLeft, contentWidth);
  const quotedTitle = `«${olympiadTitle}»`;
  const olympiadTitleSize = fitText(bold, quotedTitle, contentWidth - 32, 15, 10);
  drawCentered(page, quotedTitle, 211, olympiadTitleSize, bold, style.accent, contentLeft, contentWidth);

  drawMetric(page, 286, "СКОРОСТЬ", `${winner.wpm} WPM`, bold, regular, style.accent);
  drawMetric(page, 448, "ТОЧНОСТЬ", `${winner.accuracy.toFixed(1)}%`, bold, regular, style.accent);
  drawMetric(page, 610, "КЛАСС", winner.className, bold, regular, style.accent);

  const formattedDate = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(awardDate);
  page.drawText("ДАТА ПРОВЕДЕНИЯ", { x: 54, y: 87, size: 7.5, font: bold, color: palette.muted });
  page.drawText(formattedDate, { x: 54, y: 66, size: 10.5, font: bold, color: palette.ink });

  page.drawLine({ start: { x: 410, y: 72 }, end: { x: 553, y: 72 }, thickness: 0.8, color: palette.muted });
  drawCentered(page, "РУКОВОДИТЕЛЬ ОЛИМПИАДЫ", 54, 6.6, bold, palette.muted, 400, 163);
  page.drawLine({ start: { x: 618, y: 72 }, end: { x: 761, y: 72 }, thickness: 0.8, color: palette.muted });
  drawCentered(page, "ДИРЕКТОР ШКОЛЫ", 54, 6.6, bold, palette.muted, 608, 163);

  page.drawCircle({ x: 581, y: 72, size: 18, color: palette.paperLight, borderColor: style.accent, borderWidth: 1.2 });
  drawCentered(page, "N", 65, 17, bold, style.accent, 563, 36);
  drawCentered(page, "NOVA TYPE · OFFICIAL AWARD", 27, 6.8, bold, palette.muted);
}

export async function createOlympiadDiplomas(input: CreateOlympiadDiplomasInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Дипломы · ${input.olympiadTitle}`);
  pdf.setAuthor("NOVA TYPE");
  pdf.setSubject("Результаты школьной олимпиады по скоростной печати");
  pdf.setCreator("NOVA TYPE School Platform");

  const regular = await pdf.embedFont(input.regularFontBytes);
  const bold = await pdf.embedFont(input.boldFontBytes);

  for (const winner of input.winners) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawDiplomaPage(page, winner, input.olympiadTitle, input.awardDate, regular, bold);
  }

  return pdf.save();
}
