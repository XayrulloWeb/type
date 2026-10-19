const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptState {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptState>();

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return 0;
  }
  current.count += 1;
  if (current.count < MAX_ATTEMPTS) return 0;
  return Math.min(2_000, 500 + (current.count - MAX_ATTEMPTS) * 250);
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
