import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getRandomWords } from "@/lib/words";
import type { DefenseDifficulty, DefenseLanguage } from "@/lib/defense-shared";

interface DefenseChallengePayload {
  version: 1;
  userId: string;
  runId: string;
  language: DefenseLanguage;
  difficulty: DefenseDifficulty;
  words: string[];
  expiresAt: number;
}

export interface DefenseChallenge {
  token: string;
  runId: string;
  language: DefenseLanguage;
  difficulty: DefenseDifficulty;
  words: string[];
}

function challengeSecret() {
  const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "nova-type-local-development-secret" : undefined);
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign game challenges.");
  return secret;
}

function signature(encodedPayload: string) {
  return createHmac("sha256", challengeSecret()).update(`nova-defense:${encodedPayload}`).digest("base64url");
}

export function createDefenseChallenge(userId: string, language: DefenseLanguage, difficulty: DefenseDifficulty): DefenseChallenge {
  const words = getRandomWords(language, 240, undefined, difficulty).split(/\s+/).filter(Boolean);
  const payload: DefenseChallengePayload = {
    version: 1,
    userId,
    runId: randomUUID(),
    language,
    difficulty,
    words,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encodedPayload}.${signature(encodedPayload)}`, runId: payload.runId, language, difficulty, words };
}

export function verifyDefenseChallenge(token: string): DefenseChallengePayload | null {
  if (!token || token.length > 30_000) return null;
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;
  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as DefenseChallengePayload;
    if (
      payload.version !== 1 ||
      !payload.userId ||
      !/^[0-9a-f-]{36}$/i.test(payload.runId) ||
      !["ru", "en"].includes(payload.language) ||
      !["easy", "medium", "hard"].includes(payload.difficulty) ||
      !Array.isArray(payload.words) ||
      payload.words.length < 100 ||
      payload.words.length > 260 ||
      payload.words.some((word) => typeof word !== "string" || word.length < 1 || word.length > 32) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
