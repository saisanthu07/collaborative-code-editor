import nodemailer from "nodemailer";
import { logEvent } from "../utils/logger.js";

let cachedTransporter = null;
let cachedSignature = "";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS || "";
  const from =
    process.env.EMAIL_FROM?.trim() || "CodeTogether <noreply@codetogether.dev>";

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

export function isEmailDeliveryConfigured() {
  return Boolean(getSmtpConfig().host);
}

export function resetEmailTransporter() {
  cachedTransporter = null;
  cachedSignature = "";
}

function getTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.host) return null;

  const signature = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}:${cfg.pass}`;
  if (cachedTransporter && cachedSignature === signature) {
    return { transporter: cachedTransporter, from: cfg.from };
  }

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.pass } } : {}),
  });
  cachedSignature = signature;

  return { transporter: cachedTransporter, from: cfg.from };
}

export async function sendTransactionalEmail({ to, subject, html, text }) {
  const smtp = getTransporter();
  if (!smtp) {
    logEvent("EMAIL_DEV_FALLBACK", { to, subject });
    return { delivered: false, fallback: true };
  }

  const info = await smtp.transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html,
  });

  logEvent("EMAIL_SENT", {
    provider: "smtp",
    to,
    subject,
    messageId: info.messageId,
  });

  return { delivered: true, provider: "smtp", messageId: info.messageId };
}

export async function sendPasswordResetEmail({ to, username, resetUrl, token }) {
  const safeName = escapeHtml(username || "there");
  const safeUrl = escapeHtml(resetUrl);
  const safeToken = escapeHtml(token);

  return sendTransactionalEmail({
    to,
    subject: "Reset your CodeTogether password",
    text: `Hi ${username || "there"},\n\nUse the link below to reset your CodeTogether password (expires in 15 minutes):\n${resetUrl}\n\nReset token: ${token}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #F7F4EB; color: #221C16; border: 1px solid #DDD5C7; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #C2542D;">CodeTogether Password Reset</h2>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">Hi ${safeName},</p>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
        <p style="margin: 20px 0;">
          <a href="${safeUrl}" style="display: inline-block; background: #C2542D; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-family: sans-serif; font-size: 13px; font-weight: 600;">Reset Password</a>
        </p>
        <p style="font-family: monospace; font-size: 12px; color: #73685C; word-break: break-all;">Token: ${safeToken}</p>
        <p style="font-family: sans-serif; font-size: 12px; color: #73685C;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail({ to, username, verifyUrl, token }) {
  const safeName = escapeHtml(username || "there");
  const safeUrl = escapeHtml(verifyUrl);
  const safeToken = escapeHtml(token);

  return sendTransactionalEmail({
    to,
    subject: "Verify your CodeTogether email",
    text: `Hi ${username || "there"},\n\nVerify your CodeTogether email address (expires in 24 hours):\n${verifyUrl}\n\nVerification token: ${token}\n`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #F7F4EB; color: #221C16; border: 1px solid #DDD5C7; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #3C6E47;">Verify your CodeTogether email</h2>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">Welcome, ${safeName}!</p>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">Confirm your email address so your account recovery and notifications stay protected.</p>
        <p style="margin: 20px 0;">
          <a href="${safeUrl}" style="display: inline-block; background: #3C6E47; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-family: sans-serif; font-size: 13px; font-weight: 600;">Verify Email</a>
        </p>
        <p style="font-family: monospace; font-size: 12px; color: #73685C; word-break: break-all;">Token: ${safeToken}</p>
      </div>
    `,
  });
}

export async function sendModerationDecisionEmail({ to, username, decision, adminNote = "" }) {
  const safeName = escapeHtml(username || "there");
  const isApproved = decision === "APPROVED";
  const safeNote = escapeHtml(adminNote || "");
  const subject = isApproved
    ? "Your CodeTogether appeal has been approved"
    : "Update on your CodeTogether account appeal";

  return sendTransactionalEmail({
    to,
    subject,
    text: `Hi ${username || "there"},\n\nYour account moderation appeal has been ${
      isApproved ? "approved and your account access is restored" : "declined"
    }.${adminNote ? `\n\nReviewer note: ${adminNote}` : ""}\n`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #F7F4EB; color: #221C16; border: 1px solid #DDD5C7; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: ${isApproved ? "#3C6E47" : "#C2542D"};">${
      isApproved ? "Account Access Restored" : "Appeal Decision Update"
    }</h2>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">Hi ${safeName},</p>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">${
          isApproved
            ? "An administrator reviewed and approved your appeal. Your CodeTogether account is now active again."
            : "An administrator reviewed your appeal and declined reactivation at this time."
        }</p>
        ${
          safeNote
            ? `<div style="margin: 14px 0; padding: 12px; background: #FFFFFF; border: 1px solid #DDD5C7; border-radius: 8px; font-family: sans-serif; font-size: 13px;"><strong>Reviewer Note:</strong> ${safeNote}</div>`
            : ""
        }
      </div>
    `,
  });
}
