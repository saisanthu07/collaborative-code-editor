import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests";
  process.env.JWT_EXPIRES_IN = "1h";
});

const { signToken, verifyToken } = await import("../src/utils/jwt.js");

describe("jwt utils", () => {
  test("signs and verifies a token round-trip", () => {
    const token = signToken({ sub: "user123" });
    const decoded = verifyToken(token);
    assert.equal(decoded.sub, "user123");
  });

  test("throws on a tampered token", () => {
    const token = signToken({ sub: "user123" });
    const tampered = token.slice(0, -2) + "xx";
    assert.throws(() => verifyToken(tampered));
  });
});
