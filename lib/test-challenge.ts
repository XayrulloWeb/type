import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getPreparedText, getRandomWords } from "@/lib/words";

export type TestMode = "time" | "words" | "text";
export type TestLanguage = "en" | "ru";

export interface ChallengePayload {
  version: 1;
  userId: string;
  clientAttemptId: string;
  mode: TestMode;
  language: TestLanguage;
  expectedText: string;
  selectedDuration?: number;
  wordsCount?: number;
  assignmentId?: string;
  textId?: string;
  expiresAt: number;
}

export interface TestChallenge {
  token: string;
  clientAttemptId: string;
  expectedText: string;
  mode: TestMode;
  language: TestLanguage;
  selectedDuration?: number;
  wordsCount?: number;
}

function challengeSecret() {
  const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "nova-type-local-development-secret" : undefined);
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign typing challenges.");
  return secret;
}

function signature(encodedPayload: string) {
  return createHmac("sha256", challengeSecret()).update(encodedPayload).digest("base64url");
}

export function createTestChallenge(input: {
  userId: string;
  mode: TestMode;
  language: TestLanguage;
  selectedDuration?: number;
  wordsCount?: number;
  expectedText?: string;
  assignmentId?: string;
  textId?: string;
}): TestChallenge {
  const expectedText = input.expectedText ?? (input.mode === "text"
    ? getPreparedText(input.language)
    : getRandomWords(input.language, input.mode === "time" ? 260 : input.wordsCount ?? 25));
  const payload: ChallengePayload = {
    version: 1,
    userId: input.userId,
    clientAttemptId: randomUUID(),
    mode: input.mode,
    language: input.language,
    expectedText,
    selectedDuration: input.mode === "time" ? input.selectedDuration : undefined,
    wordsCount: input.mode === "words" ? input.wordsCount : undefined,
    assignmentId: input.assignmentId,
    textId: input.textId,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encodedPayload}.${signature(encodedPayload)}`,
    clientAttemptId: payload.clientAttemptId,
    expectedText: payload.expectedText,
    mode: payload.mode,
    language: payload.language,
    selectedDuration: payload.selectedDuration,
    wordsCount: payload.wordsCount,
  };
}

export function verifyTestChallenge(token: string): ChallengePayload | null {
  if (!token || token.length > 12_000) return null;
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;
  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ChallengePayload;
    if (
      payload.version !== 1 ||
      !payload.userId ||
      !/^[0-9a-f-]{36}$/i.test(payload.clientAttemptId) ||
      !["time", "words", "text"].includes(payload.mode) ||
      !["en", "ru"].includes(payload.language) ||
      !payload.expectedText ||
      payload.expectedText.length > 3000 ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
