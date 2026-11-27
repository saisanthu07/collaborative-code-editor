import {
  registerUser,
  loginUser,
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
  issueEmailVerification,
  verifyEmailWithToken,
  deleteOwnAccount,
} from "../services/authService.js";
import {
  isEmailDeliveryConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService.js";
import { getAllowedOrigins } from "../config/env.js";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  listActiveSessions,
  revokeSessionById,
} from "../services/refreshTokenService.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { logEvent } from "../utils/logger.js";
import User from "../models/User.js";
import ModerationAppeal from "../models/ModerationAppeal.js";

const isProd = () => process.env.NODE_ENV === "production";

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: (Number(process.env.REFRESH_TOKEN_DAYS) || 30) * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: "/api/auth/refresh",
  });
}

export async function register(req, res, next) {
  try {
    const { user, token } = await registerUser(req.body);
    const refreshToken = await issueRefreshToken(user._id, req.headers["user-agent"] || "");
    setRefreshTokenCookie(res, refreshToken);
    logEvent("AUTH_REGISTER", { userId: user._id.toString() });

    let devVerifyToken;
    try {
      const verifyToken = await issueEmailVerification(user);
      const clientOrigin = getAllowedOrigins()[0] || "http://localhost:5173";
      const verifyUrl = `${clientOrigin}/verify-email?token=${encodeURIComponent(verifyToken)}`;
      await sendVerificationEmail({
        to: user.email,
        username: user.username,
        verifyUrl,
        token: verifyToken,
      });
      if (!isProd() && !isEmailDeliveryConfigured()) {
        devVerifyToken = verifyToken;
      }
    } catch {
      // Verification email dispatch should never block account registration
    }

    res.status(201).json({
      user,
      token,
      ...(devVerifyToken ? { devVerifyToken } : {}),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { user, token } = await loginUser(req.body);
    const refreshToken = await issueRefreshToken(user._id, req.headers["user-agent"] || "");
    setRefreshTokenCookie(res, refreshToken);
    logEvent("AUTH_LOGIN", { userId: user._id.toString() });
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const raw = req.cookies?.refreshToken;
    if (!raw) return res.status(401).json({ error: "No refresh token provided" });

    const { newRawToken, userId } = await rotateRefreshToken(raw, req.headers["user-agent"] || "");
    const accessToken = signToken({ sub: userId });

    setRefreshTokenCookie(res, newRawToken);
    res.json({ token: accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  const raw = req.cookies?.refreshToken;
  if (raw) await revokeRefreshToken(raw);
  clearRefreshTokenCookie(res);
  res.json({ success: true });
}

export async function logoutAll(req, res, next) {
  try {
    await revokeAllForUser(req.user._id);
    clearRefreshTokenCookie(res);
    logEvent("AUTH_LOGOUT_ALL", { userId: req.user._id.toString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function sessions(req, res, next) {
  try {
    const activeSessions = await listActiveSessions(req.user._id);
    res.json({ sessions: activeSessions });
  } catch (err) {
    next(err);
  }
}

export async function revokeSession(req, res, next) {
  try {
    const removed = await revokeSessionById(req.user._id, req.params.sessionId);
    if (!removed) return res.status(404).json({ error: "Session not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res, next) {
  try {
    const { name, avatar } = req.body;
    if (name !== undefined) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await changePassword(req.user, currentPassword, newPassword);
    clearRefreshTokenCookie(res);
    logEvent("AUTH_PASSWORD_CHANGE", { userId: req.user._id.toString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const outcome = await requestPasswordReset(req.body.email);
    if (outcome) {
      logEvent("AUTH_PASSWORD_RESET_REQUEST", { userId: outcome.user._id.toString() });
      const clientOrigin = getAllowedOrigins()[0] || "http://localhost:5173";
      const resetUrl = `${clientOrigin}/reset-password?token=${encodeURIComponent(outcome.rawToken)}`;
      try {
        await sendPasswordResetEmail({
          to: outcome.user.email,
          username: outcome.user.username,
          resetUrl,
          token: outcome.rawToken,
        });
      } catch {
        // Do not leak email failure or block dev fallback
      }
    }
    const payload = {
      message: "If an account with that email exists, a reset token has been generated.",
    };
    // Expose resetToken only outside production when no external mailer is configured
    if (!isProd() && !isEmailDeliveryConfigured() && outcome?.rawToken) {
      payload.devResetToken = outcome.rawToken;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const user = await resetPasswordWithToken(req.body.token, req.body.newPassword);
    logEvent("AUTH_PASSWORD_RESET_COMPLETE", { userId: user._id.toString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const user = await verifyEmailWithToken(req.body.token);
    logEvent("AUTH_EMAIL_VERIFIED", { userId: user._id.toString() });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    if (req.user.emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }
    const verifyToken = await issueEmailVerification(req.user);
    const clientOrigin = getAllowedOrigins()[0] || "http://localhost:5173";
    const verifyUrl = `${clientOrigin}/verify-email?token=${encodeURIComponent(verifyToken)}`;
    await sendVerificationEmail({
      to: req.user.email,
      username: req.user.username,
      verifyUrl,
      token: verifyToken,
    });
    logEvent("AUTH_EMAIL_VERIFICATION_SENT", { userId: req.user._id.toString() });

    const payload = {
      success: true,
      message: "Verification instructions sent.",
    };
    if (!isProd() && !isEmailDeliveryConfigured()) {
      payload.devVerifyToken = verifyToken;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req, res, next) {
  try {
    await deleteOwnAccount(req.user, req.body.password);
    clearRefreshTokenCookie(res);
    logEvent("AUTH_ACCOUNT_DELETE", { userId: req.user._id.toString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function submitAppeal(req, res, next) {
  try {
    const { appealToken, message } = req.body;
    let decoded;
    try {
      decoded = verifyToken(appealToken);
    } catch {
      return res.status(401).json({ error: "Appeal session expired. Please log in again to submit an appeal." });
    }

    if (decoded?.typ !== "appeal" || !decoded?.sub) {
      return res.status(401).json({ error: "Invalid appeal token" });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({ error: "Your account is already active. Please sign in." });
    }

    const existingPending = await ModerationAppeal.findOne({
      userId: user._id,
      status: "PENDING",
    }).lean();

    if (existingPending) {
      return res.status(409).json({
        error: "You already have a pending appeal under review",
        appeal: existingPending,
      });
    }

    const appeal = await ModerationAppeal.create({
      userId: user._id,
      username: user.username,
      email: user.email,
      accountStatus: user.status,
      moderationReason: user.moderationReason || "",
      message,
      status: "PENDING",
    });

    logEvent("MODERATION_APPEAL_SUBMITTED", {
      userId: user._id.toString(),
      username: user.username,
      accountStatus: user.status,
      appealId: appeal._id.toString(),
    });

    res.status(201).json({ appeal });
  } catch (err) {
    next(err);
  }
}
