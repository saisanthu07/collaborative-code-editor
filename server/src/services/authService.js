import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";
import DocRevision from "../models/DocRevision.js";
import CodeComment from "../models/CodeComment.js";
import RefreshToken from "../models/RefreshToken.js";
import { signToken } from "../utils/jwt.js";
import { revokeAllForUser } from "./refreshTokenService.js";
import { deleteRoomYjsDocs, disconnectAllRoomYjs } from "../sockets/yjsServer.js";

const SALT_ROUNDS = 12;
const DUMMY_HASH = "$2b$12$e80yqZepxX4.B31K2d9Zl.U89/d9rCqH7Yl3d1zNfRzU2y9q1jIje";

export async function registerUser({ name, username, email, password }) {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? "Email" : "Username";
    const err = new Error(`${field} is already in use`);
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, username, email, passwordHash });
  const token = signToken({ sub: user._id.toString(), role: user.role });
  return { user, token };
}

export async function loginUser({ identifier, email, username, password }) {
  const raw = (identifier || email || username || "").trim().toLowerCase();
  const normalized = raw.startsWith("@") ? raw.slice(1) : raw;
  const query = normalized.includes("@")
    ? { email: normalized }
    : { $or: [{ username: normalized }, { email: normalized }] };

  const user = await User.findOne(query);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    const err = new Error("Invalid email, username, or password");
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid email, username, or password");
    err.status = 401;
    throw err;
  }

  if (user.status === "BANNED") {
    const err = new Error("This account has been banned");
    err.status = 403;
    throw err;
  }

  if (user.status === "SUSPENDED") {
    const err = new Error("This account has been suspended");
    err.status = 403;
    throw err;
  }

  user.lastActiveAt = new Date();
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role });
  return { user, token };
}

export async function changePassword(user, currentPassword, newPassword) {
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const err = new Error("Current password is incorrect");
    err.status = 400;
    throw err;
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  // Invalidate existing refresh tokens when password changes
  await revokeAllForUser(user._id);
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    // Do not leak email existence
    return null;
  }
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  return { user, rawToken };
}

export async function resetPasswordWithToken(rawToken, newPassword) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Invalid or expired password reset token");
    err.status = 400;
    throw err;
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();
  await revokeAllForUser(user._id);
  return user;
}

export async function issueEmailVerification(user) {
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  return rawToken;
}

export async function verifyEmailWithToken(rawToken) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Invalid or expired email verification token");
    err.status = 400;
    throw err;
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();
  return user;
}

export async function deleteOwnAccount(user, password) {
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Password is incorrect");
    err.status = 400;
    throw err;
  }

  const ownedRooms = await Room.find({ ownerId: user._id }).select("roomId").lean();
  for (const r of ownedRooms) {
    disconnectAllRoomYjs(r.roomId);
    await deleteRoomYjsDocs(r.roomId);
    await Promise.all([
      Message.deleteMany({ roomId: r.roomId }),
      DocRevision.deleteMany({ roomId: r.roomId }),
      CodeComment.deleteMany({ roomId: r.roomId }),
    ]);
  }

  await Promise.all([
    Room.deleteMany({ ownerId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
    Message.updateMany(
      { userId: user._id },
      { $unset: { userId: 1 }, $set: { username: "Deleted User" } }
    ),
    Room.updateMany(
      { "members.userId": user._id },
      { $pull: { members: { userId: user._id } } }
    ),
    user.deleteOne(),
  ]);
}
