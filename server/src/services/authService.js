import bcrypt from "bcrypt";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

const SALT_ROUNDS = 12;

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

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  if (user.status === "SUSPENDED") {
    const err = new Error("This account has been suspended");
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid email or password");
    err.status = 401;
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
}
