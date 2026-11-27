import mongoose from "mongoose";
import ModerationAppeal from "../models/ModerationAppeal.js";
import { signToken } from "../utils/jwt.js";

export function signAppealToken(userId) {
  if (!process.env.JWT_SECRET) return null;
  try {
    return signToken({ sub: userId.toString(), typ: "appeal" }, { expiresIn: "24h" });
  } catch {
    return null;
  }
}

export async function getLatestAppealForUser(userId) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const appeal = await ModerationAppeal.findOne({ userId })
      .sort({ createdAt: -1 })
      .select("_id status message adminNote accountStatus createdAt reviewedAt reviewedByUsername")
      .lean();
    return appeal || null;
  } catch {
    return null;
  }
}

export async function buildModerationPayload(user, fallbackReason = "") {
  const latestAppeal = await getLatestAppealForUser(user._id);
  const appealToken = signAppealToken(user._id);
  const code = user.status === "BANNED" ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED";

  return {
    code,
    moderation: {
      status: user.status,
      username: user.username,
      reason: user.moderationReason || fallbackReason || "",
      moderatedAt: user.moderatedAt || null,
      latestAppeal,
      appealToken,
    },
  };
}
