import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
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
    if (user.status === "SUSPENDED") {
      return res.status(403).json({ error: "Account suspended" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Attaches req.user if a valid token is present, but does not reject the
// request otherwise. Used for routes guests can access (e.g. joining a
// public room), where we still want to know if the caller is logged in.
export async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (user && user.status !== "SUSPENDED") {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}
