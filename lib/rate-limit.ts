const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptState {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptState>();

export function canAttemptLogin(key: string) {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || now - state.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);
    return true;
  }
  return state.count < MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }
  current.count += 1;
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
