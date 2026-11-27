import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import { buildModerationPayload } from "../services/moderationService.js";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

// Requires a valid, non-suspended authenticated user.
export async function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.status === "BANNED") {
      return res.status(403).json({
        error: "Account banned",
        ...(await buildModerationPayload(user)),
      });
    }
    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        error: "Account suspended",
        ...(await buildModerationPayload(user)),
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Attaches req.user if a valid token is present. If a guest token is present,
// attaches req.guest. If a token is supplied but invalid/expired, returns 401
// so client refresh interceptor fires. A completely missing authorization header
// proceeds as guest.
export async function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return next();
  }
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next();
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.typ === "guest" || decoded.guestId) {
      req.guest = decoded;
      return next();
    }
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.status === "BANNED") {
      return res.status(403).json({
        error: "Account banned",
        ...(await buildModerationPayload(user)),
      });
    }
    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        error: "Account suspended",
        ...(await buildModerationPayload(user)),
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
