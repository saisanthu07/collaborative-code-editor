import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getAllowedOrigins, validateStartupEnv } from "../src/config/env.js";
import { collectMetricsSnapshot } from "../src/utils/metrics.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} from "../src/validators/authValidators.js";
import { timerSyncSchema } from "../src/validators/socketValidators.js";

describe("Env Validation, Observability & Auth Lifecycle Schemas", () => {
  test("getAllowedOrigins parses comma-separated CLIENT_URL values", () => {
    const orig = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "https://app.example.com, https://staging.example.com";
    try {
      const origins = getAllowedOrigins();
      assert.deepEqual(origins, [
        "https://app.example.com",
        "https://staging.example.com",
      ]);
    } finally {
      if (orig === undefined) delete process.env.CLIENT_URL;
      else process.env.CLIENT_URL = orig;
    }
  });

  test("validateStartupEnv throws when MONGO_URI is missing", () => {
    const orig = process.env.MONGO_URI;
    delete process.env.MONGO_URI;
    try {
      assert.throws(() => validateStartupEnv(), /MONGO_URI/i);
    } finally {
      if (orig !== undefined) process.env.MONGO_URI = orig;
    }
  });

  test("collectMetricsSnapshot returns structured operational telemetry", () => {
    const snap = collectMetricsSnapshot();
    assert.equal(typeof snap.uptimeSeconds, "number");
    assert.equal(typeof snap.memoryMb.rss, "number");
    assert.equal(typeof snap.http.totalRequests, "number");
    assert.equal(typeof snap.yjs.activeDocs, "number");
  });

  test("auth lifecycle schemas validate forgot/reset password and account deletion", () => {
    assert.equal(forgotPasswordSchema.safeParse({ email: "Alice@Example.COM" }).success, true);
    assert.equal(
      resetPasswordSchema.safeParse({ token: "a".repeat(24), newPassword: "Password1" }).success,
      true
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: "short", newPassword: "Password1" }).success,
      false
    );
    assert.equal(deleteAccountSchema.safeParse({ password: "secret" }).success, true);
    assert.equal(deleteAccountSchema.safeParse({ password: "" }).success, false);
  });

  test("timerSyncSchema supports countdown and stopwatch payloads", () => {
    assert.equal(
      timerSyncSchema.safeParse({
        roomId: "abcdef1234",
        mode: "countdown",
        durationSeconds: 1800,
        remainingSeconds: 1795,
        isRunning: true,
      }).success,
      true
    );
    assert.equal(
      timerSyncSchema.safeParse({
        roomId: "abcdef1234",
        isRunning: false,
      }).success,
      false
    );
  });
});
