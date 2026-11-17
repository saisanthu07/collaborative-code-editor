import ActivityLog from "../models/ActivityLog.js";

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
  const sanitized = sanitize(meta);
  const entry = {
    type,
    time: new Date().toISOString(),
    ...sanitized,
  };
  console.log(`[event] ${JSON.stringify(entry)}`);

  // Fire-and-forget persistence to ActivityLog (never throws)
  try {
    const { userId, roomId, ...rest } = sanitized;
    ActivityLog.create({
      type,
      userId: userId || undefined,
      roomId: roomId || undefined,
      meta: rest,
    }).catch(() => {});
  } catch {
    // Ignore error
  }
}

export function logError(context, err) {
  console.error(`[error] ${context}:`, err?.message || err);
}
