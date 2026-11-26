import { getAllowedOrigins } from "../config/env.js";

/**
 * Verifies Origin / Referer on cookie-authenticated endpoints (e.g. /refresh, /logout)
 * to mitigate cross-site request forgery when browser cookies are attached.
 */
export function requireTrustedOrigin(req, res, next) {
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let candidateOrigin = originHeader;
  if (!candidateOrigin && refererHeader) {
    try {
      candidateOrigin = new URL(refererHeader).origin;
    } catch {
      return res.status(403).json({ error: "Invalid request origin" });
    }
  }

  // Non-browser clients (curl/mobile/tests) often omit Origin and Referer
  if (!candidateOrigin) {
    return next();
  }

  const allowed = getAllowedOrigins();
  if (allowed.includes(candidateOrigin)) {
    return next();
  }

  return res.status(403).json({ error: "Untrusted request origin" });
}
