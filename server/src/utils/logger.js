// Minimal structured logger. Deliberately never accepts raw request bodies
// or credential-shaped fields — callers must pass only the fields they want
// logged, never `password`, `passwordHash`, tokens, or API keys.
const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "jwt",
  "apiKey",
  "authorization",
]);

function sanitize(meta = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACTED_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export function logEvent(type, meta = {}) {
  const entry = {
    type,
    time: new Date().toISOString(),
    ...sanitize(meta),
  };
  console.log(`[event] ${JSON.stringify(entry)}`);
}

export function logError(context, err) {
  console.error(`[error] ${context}:`, err?.message || err);
}
