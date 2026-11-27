import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from "../src/validators/authValidators.js";

describe("registerSchema", () => {
  test("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Santhu Dev",
      username: "santhu_dev",
      email: "santhu@example.com",
      password: "StrongPass1",
    });
    assert.equal(result.success, true);
  });

  test("rejects a password with no uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Santhu",
      username: "santhu",
      email: "santhu@example.com",
      password: "weakpass1",
    });
    assert.equal(result.success, false);
  });

  test("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Santhu",
      username: "santhu",
      email: "santhu@example.com",
      password: "Sh0rt",
    });
    assert.equal(result.success, false);
  });

  test("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Santhu",
      username: "santhu",
      email: "not-an-email",
      password: "StrongPass1",
    });
    assert.equal(result.success, false);
  });

  test("rejects a password longer than 72 characters", () => {
    const result = registerSchema.safeParse({
      name: "Santhu",
      username: "santhu",
      email: "santhu@example.com",
      password: "A1" + "a".repeat(71),
    });
    assert.equal(result.success, false);
  });

  test("trims and lowercases email and username", () => {
    const result = registerSchema.safeParse({
      name: "  Santhu Dev  ",
      username: "  Santhu_Dev  ",
      email: "  SANTHU@Example.COM  ",
      password: "StrongPass1",
    });
    assert.equal(result.success, true);
    assert.equal(result.data.username, "santhu_dev");
    assert.equal(result.data.email, "santhu@example.com");
  });
});

describe("loginSchema", () => {
  test("accepts valid email login credentials", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "anything" });
    assert.equal(result.success, true);
    assert.equal(result.data.identifier, "a@b.com");
  });

  test("accepts identifier with username or email", () => {
    const byUsername = loginSchema.safeParse({
      identifier: "  Santhu_Dev ",
      password: "anything",
    });
    assert.equal(byUsername.success, true);
    assert.equal(byUsername.data.identifier, "santhu_dev");

    const byEmail = loginSchema.safeParse({
      identifier: " SANTHU@Example.COM ",
      password: "anything",
    });
    assert.equal(byEmail.success, true);
    assert.equal(byEmail.data.identifier, "santhu@example.com");
  });

  test("rejects missing identifier and email", () => {
    const result = loginSchema.safeParse({ password: "anything" });
    assert.equal(result.success, false);
  });

  test("rejects missing password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    assert.equal(result.success, false);
  });
});

describe("changePasswordSchema", () => {
  test("enforces the same strength rules as registration", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever",
      newPassword: "alllowercase1",
    });
    assert.equal(result.success, false);
  });
});

describe("updateProfileSchema", () => {
  test("accepts valid developer stamp tokens and empty resets", () => {
    const stampResult = updateProfileSchema.safeParse({
      avatar: "stamp:lambda:terracotta:wax",
    });
    assert.equal(stampResult.success, true);

    const resetResult = updateProfileSchema.safeParse({
      avatar: "",
    });
    assert.equal(resetResult.success, true);
  });

  test("rejects external avatar URLs and malformed stamp tokens", () => {
    const httpsResult = updateProfileSchema.safeParse({
      avatar: "https://example.com/avatar.png",
    });
    assert.equal(httpsResult.success, false);

    const httpResult = updateProfileSchema.safeParse({
      avatar: "http://example.com/avatar.png",
    });
    assert.equal(httpResult.success, false);

    const malformedResult = updateProfileSchema.safeParse({
      avatar: "stamp:unknown:terracotta:wax",
    });
    assert.equal(malformedResult.success, false);
  });
});
