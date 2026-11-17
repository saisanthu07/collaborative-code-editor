import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests-at-least-32-chars-long";
  process.env.JWT_EXPIRES_IN = "1h";
});

const { signToken, verifyToken, validateJwtSecret } = await import("../src/utils/jwt.js");

describe("jwt utils", () => {
  test("validates jwt secret requirements", () => {
    assert.doesNotThrow(() => validateJwtSecret());

    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "";
    assert.throws(() => validateJwtSecret(), /missing/);

    process.env.JWT_SECRET = "short-secret";
    assert.throws(() => validateJwtSecret(), /at least 32/);

    process.env.JWT_SECRET = "change-this-to-a-long-random-string";
    assert.throws(() => validateJwtSecret(), /placeholder/);

    process.env.JWT_SECRET = original;
  });
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
