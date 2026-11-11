import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(48).toString("hex");
}

// Issues a brand new refresh token (used at login/register).
export async function issueRefreshToken(userId, userAgent = "") {
  const raw = generateRawToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent,
  });

  return raw;
}

// Rotates a refresh token: validates the presented one, revokes it, and
// issues a new one in its place. Detects reuse of an already-rotated token
// (a strong signal of theft) and revokes the whole chain if seen.
export async function rotateRefreshToken(rawToken, userAgent = "") {
  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) {
    const err = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }

  if (record.revokedAt) {
    // This token was already used once before — possible token theft/replay.
    // Revoke every other active token for this user as a precaution.
    await RefreshToken.updateMany(
      { userId: record.userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    const err = new Error("Refresh token reuse detected — all sessions revoked");
    err.status = 401;
    throw err;
  }

  if (record.expiresAt < new Date()) {
    const err = new Error("Refresh token expired");
    err.status = 401;
    throw err;
  }

  const newRaw = generateRawToken();
  const newHash = hashToken(newRaw);

  record.revokedAt = new Date();
  record.replacedByHash = newHash;
  await record.save();

  await RefreshToken.create({
    userId: record.userId,
    tokenHash: newHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    userAgent,
  });

  return { newRawToken: newRaw, userId: record.userId.toString() };
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}
