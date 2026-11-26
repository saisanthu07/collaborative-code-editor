import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const GRACE_PERIOD_MS = 10_000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(48).toString("hex");
}

export async function issueRefreshToken(userId, userAgent = "") {
  const raw = generateRawToken();
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    familyId,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent,
  });

  return raw;
}

export async function rotateRefreshToken(rawToken, userAgent = "") {
  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) {
    const err = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }

  if (record.revokedAt) {
    const elapsed = Date.now() - new Date(record.revokedAt).getTime();
    if (elapsed <= GRACE_PERIOD_MS && record.successorToken) {
      return { newRawToken: record.successorToken, userId: record.userId.toString() };
    }

    await RefreshToken.updateMany(
      { familyId: record.familyId, revokedAt: null },
      { revokedAt: new Date() }
    );
    const err = new Error("Refresh token reuse detected — session revoked");
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
  const now = new Date();

  const updated = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: now, replacedByHash: newHash, successorToken: newRaw },
    { new: false }
  );

  if (!updated) {
    const concurrent = await RefreshToken.findOne({ tokenHash });
    if (
      concurrent &&
      concurrent.revokedAt &&
      Date.now() - new Date(concurrent.revokedAt).getTime() <= GRACE_PERIOD_MS &&
      concurrent.successorToken
    ) {
      return { newRawToken: concurrent.successorToken, userId: concurrent.userId.toString() };
    }

    await RefreshToken.updateMany(
      { familyId: record.familyId, revokedAt: null },
      { revokedAt: new Date() }
    );
    const err = new Error("Refresh token reuse detected — session revoked");
    err.status = 401;
    throw err;
  }

  await RefreshToken.create({
    userId: record.userId,
    familyId: record.familyId,
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

export async function listActiveSessions(userId) {
  const sessions = await RefreshToken.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select("_id familyId userAgent createdAt expiresAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return sessions;
}

export async function revokeSessionById(userId, sessionId) {
  const res = await RefreshToken.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { revokedAt: new Date() }
  );
  return res.modifiedCount > 0;
}
