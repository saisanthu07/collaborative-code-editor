import { registerUser, loginUser, changePassword } from "../services/authService.js";
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from "../services/refreshTokenService.js";
import { signToken } from "../utils/jwt.js";
import { logEvent } from "../utils/logger.js";

const isProd = () => process.env.NODE_ENV === "production";

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // short-lived access token
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: (Number(process.env.REFRESH_TOKEN_DAYS) || 30) * 24 * 60 * 60 * 1000,
  });
}

export async function register(req, res, next) {
  try {
    const { user, token } = await registerUser(req.body);
    const refreshToken = await issueRefreshToken(user._id, req.headers["user-agent"] || "");
    setAuthCookies(res, token, refreshToken);
    logEvent("AUTH_REGISTER", { userId: user._id.toString() });
    res.status(201).json({ user, token, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { user, token } = await loginUser(req.body);
    const refreshToken = await issueRefreshToken(user._id, req.headers["user-agent"] || "");
    setAuthCookies(res, token, refreshToken);
    logEvent("AUTH_LOGIN", { userId: user._id.toString() });
    res.json({ user, token, refreshToken });
  } catch (err) {
    next(err);
  }
}

// Exchanges a valid, non-revoked refresh token for a new short-lived access
// token plus a rotated refresh token (rotation detects theft/replay).
export async function refresh(req, res, next) {
  try {
    const raw = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!raw) return res.status(401).json({ error: "No refresh token provided" });

    const { newRawToken, userId } = await rotateRefreshToken(raw, req.headers["user-agent"] || "");
    const accessToken = signToken({ sub: userId });

    setAuthCookies(res, accessToken, newRawToken);
    res.json({ token: accessToken, refreshToken: newRawToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  const raw = req.cookies?.refreshToken || req.body?.refreshToken;
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({ success: true });
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
    logEvent("AUTH_PASSWORD_CHANGE", { userId: req.user._id.toString() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
