import "server-only";
import { getPreparedText } from "@/lib/words";

export function generateOlympiadText(language: "ru" | "en", durationSeconds: number, exclude?: string) {
  const targetLength = Math.min(4_800, Math.max(900, durationSeconds * 10));
  let result = "";
  let previous = exclude;
  while (result.length < targetLength) {
    const part = getPreparedText(language, previous);
    result = `${result} ${part}`.trim();
    previous = part;
  }
  return result.slice(0, 5_000).trim();
}

export function generateUniqueOlympiadText(language: "ru" | "en", durationSeconds: number, usedTexts: ReadonlySet<string>) {
  let candidate = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    candidate = generateOlympiadText(language, durationSeconds, candidate);
    if (!usedTexts.has(candidate)) return candidate;
  }
  return candidate;
}
