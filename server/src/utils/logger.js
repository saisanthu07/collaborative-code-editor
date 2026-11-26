import crypto from "crypto";
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

export function requestContextMiddleware(req, res, next) {
  const incomingId = req.headers["x-request-id"];
  const requestId =
    typeof incomingId === "string" && incomingId.trim().length > 0 && incomingId.length <= 64
      ? incomingId.trim()
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export function logEvent(type, meta = {}) {
  const sanitized = sanitize(meta);
  const entry = {
    level: "info",
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
  const entry = {
    level: "error",
    context,
    time: new Date().toISOString(),
    message: err?.message || String(err),
  };
  console.error(`[error] ${JSON.stringify(entry)}`);
}
