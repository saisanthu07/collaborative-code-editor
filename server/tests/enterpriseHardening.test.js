import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { verifyEmailSchema } from "../src/validators/authValidators.js";
import {
  getSmtpConfig,
  isEmailDeliveryConfigured,
  resetEmailTransporter,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../src/services/emailService.js";
import { formatPrometheusMetrics } from "../src/utils/metrics.js";
import { requireTrustedOrigin } from "../src/middleware/csrfOriginMiddleware.js";

describe("verifyEmailSchema", () => {
  test("accepts valid 16-128 char token", () => {
    const res = verifyEmailSchema.safeParse({ token: "a".repeat(48) });
    assert.equal(res.success, true);
  });

  test("rejects short token", () => {
    const res = verifyEmailSchema.safeParse({ token: "short" });
    assert.equal(res.success, false);
  });
});

describe("emailService (SMTP)", () => {
  test("parses SMTP configuration and defaults secure=true only for port 465 unless specified", () => {
    const origHost = process.env.SMTP_HOST;
    const origPort = process.env.SMTP_PORT;
    const origSecure = process.env.SMTP_SECURE;

    try {
      process.env.SMTP_HOST = "smtp.internal.local";
      process.env.SMTP_PORT = "587";
      delete process.env.SMTP_SECURE;

      assert.equal(isEmailDeliveryConfigured(), true);
      const cfg587 = getSmtpConfig();
      assert.equal(cfg587.host, "smtp.internal.local");
      assert.equal(cfg587.port, 587);
      assert.equal(cfg587.secure, false);

      process.env.SMTP_PORT = "465";
      const cfg465 = getSmtpConfig();
      assert.equal(cfg465.secure, true);
    } finally {
      resetEmailTransporter();
      if (origHost !== undefined) process.env.SMTP_HOST = origHost;
      else delete process.env.SMTP_HOST;
      if (origPort !== undefined) process.env.SMTP_PORT = origPort;
      else delete process.env.SMTP_PORT;
      if (origSecure !== undefined) process.env.SMTP_SECURE = origSecure;
      else delete process.env.SMTP_SECURE;
    }
  });

  test("falls back cleanly when SMTP_HOST is not configured", async () => {
    const origHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    resetEmailTransporter();

    try {
      assert.equal(isEmailDeliveryConfigured(), false);
      const resetRes = await sendPasswordResetEmail({
        to: "user@example.com",
        username: "devuser",
        resetUrl: "http://localhost:5173/reset-password?token=abc",
        token: "abc",
      });
      assert.equal(resetRes.delivered, false);
      assert.equal(resetRes.fallback, true);

      const verifyRes = await sendVerificationEmail({
        to: "user@example.com",
        username: "devuser",
        verifyUrl: "http://localhost:5173/verify-email?token=xyz",
        token: "xyz",
      });
      assert.equal(verifyRes.delivered, false);
      assert.equal(verifyRes.fallback, true);
    } finally {
      if (origHost !== undefined) process.env.SMTP_HOST = origHost;
    }
  });
});

describe("formatPrometheusMetrics", () => {
  test("formats Prometheus text exposition metrics", () => {
    const output = formatPrometheusMetrics({
      uptimeSeconds: 120,
      memoryMb: { rss: 64, heapUsed: 32, heapTotal: 48 },
      http: { totalRequests: 15, status2xx: 12, status4xx: 2, status5xx: 1 },
      sockets: { connectedClients: 4 },
      yjs: { activeDocs: 2, activeConnections: 5 },
    });

    assert.match(output, /codetogether_uptime_seconds 120/);
    assert.match(output, /codetogether_http_requests_total 15/);
    assert.match(output, /codetogether_http_responses_total\{class="2xx"\} 12/);
    assert.match(output, /codetogether_sockets_connected 4/);
    assert.match(output, /codetogether_yjs_active_docs 2/);
  });
});

describe("requireTrustedOrigin CSRF protection", () => {
  function runOriginCheck(headers) {
    let nextCalled = false;
    let statusCode = null;
    let body = null;
    const req = { headers };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    requireTrustedOrigin(req, res, () => {
      nextCalled = true;
    });
    return { nextCalled, statusCode, body };
  }

  test("allows requests without Origin or Referer headers", () => {
    const result = runOriginCheck({});
    assert.equal(result.nextCalled, true);
  });

  test("allows requests from configured CLIENT_URL origin", () => {
    const orig = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "https://app.codetogether.dev";
    try {
      const result = runOriginCheck({ origin: "https://app.codetogether.dev" });
      assert.equal(result.nextCalled, true);
    } finally {
      if (orig !== undefined) process.env.CLIENT_URL = orig;
      else delete process.env.CLIENT_URL;
    }
  });

  test("blocks requests from untrusted Origin", () => {
    const orig = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "https://app.codetogether.dev";
    try {
      const result = runOriginCheck({ origin: "https://evil.example.com" });
      assert.equal(result.nextCalled, false);
      assert.equal(result.statusCode, 403);
      assert.equal(result.body.error, "Untrusted request origin");
    } finally {
      if (orig !== undefined) process.env.CLIENT_URL = orig;
      else delete process.env.CLIENT_URL;
    }
  });
});
