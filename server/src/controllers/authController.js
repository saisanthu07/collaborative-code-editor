import {
  registerUser,
  loginUser,
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
  deleteOwnAccount,
} from "../services/authService.js";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  listActiveSessions,
  revokeSessionById,
} from "../services/refreshTokenService.js";
import { signToken } from "../utils/jwt.js";
import { logEvent } from "../utils/logger.js";

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
    res.status(201).json({ user, token });
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
    }
    const payload = {
      message: "If an account with that email exists, a reset token has been generated.",
    };
    // Expose resetToken only outside production for local/dev workflows when no email provider is wired
    if (!isProd() && outcome?.rawToken) {
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
