const SPACE_VARIANTS = /[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g;
const INVISIBLE_FORMATTING = /[\u200b-\u200d\u2060\ufeff]/g;
const SINGLE_QUOTES = /[\u2018\u2019\u201a\u201b\u2032]/g;
const DOUBLE_QUOTES = /[\u201c\u201d\u201e\u201f\u2033]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;

/**
 * Converts visually equivalent, hard-to-type Unicode characters to the
 * keyboard characters used by the typing engine. It intentionally keeps
 * letter case and alphabet intact: Latin and Cyrillic lookalikes are not the
 * same typing character.
 */
export function normalizeTypingText(value: string) {
  return value
    .normalize("NFC")
    .replace(INVISIBLE_FORMATTING, "")
    .replace(SPACE_VARIANTS, " ")
    .replace(/[\r\n\t]/g, " ")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .replace(/\u2026/g, "...");
}

/** Prepares saved or generated content before it becomes a test. */
export function prepareTypingText(value: string) {
  return normalizeTypingText(value).replace(/ {2,}/g, " ").trim();
}

export function typingCharacters(value: string) {
  return Array.from(normalizeTypingText(value));
}

export function normalizeTypingKey(value: string) {
  if (Array.from(value).length !== 1) return "";
  return normalizeTypingText(value);
}
