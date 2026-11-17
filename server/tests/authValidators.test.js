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
  test("accepts valid login credentials", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "anything" });
    assert.equal(result.success, true);
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
  test("accepts https avatar URLs", () => {
    const result = updateProfileSchema.safeParse({
      avatar: "https://example.com/avatar.png",
    });
    assert.equal(result.success, true);
  });

  test("rejects non-https avatar URLs", () => {
    const result = updateProfileSchema.safeParse({
      avatar: "http://example.com/avatar.png",
    });
    assert.equal(result.success, false);
  });
});
