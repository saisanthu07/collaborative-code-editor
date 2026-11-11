import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createRoomSchema,
  executeSchema,
  createFileSchema,
  permissionChangeSchema,
} from "../src/validators/roomValidators.js";

describe("createRoomSchema", () => {
  test("applies defaults for optional fields", () => {
    const result = createRoomSchema.parse({ name: "Interview Prep" });
    assert.equal(result.language, "javascript");
    assert.equal(result.visibility, "PRIVATE");
  });

  test("rejects an unsupported language", () => {
    const result = createRoomSchema.safeParse({ name: "Room", language: "brainfuck" });
    assert.equal(result.success, false);
  });
});

describe("executeSchema", () => {
  test("rejects empty source code", () => {
    const result = executeSchema.safeParse({ language: "python", sourceCode: "" });
    assert.equal(result.success, false);
  });

  test("accepts valid python submission", () => {
    const result = executeSchema.safeParse({ language: "python", sourceCode: "print('hi')" });
    assert.equal(result.success, true);
  });
});

describe("createFileSchema", () => {
  test("rejects file names with path traversal characters", () => {
    const result = createFileSchema.safeParse({ name: "../../etc/passwd" });
    assert.equal(result.success, false);
  });

  test("rejects a lone .. path segment even without leading slash", () => {
    const result = createFileSchema.safeParse({ name: "src/../../secret.txt" });
    assert.equal(result.success, false);
  });

  test("rejects an absolute path", () => {
    const result = createFileSchema.safeParse({ name: "/etc/passwd" });
    assert.equal(result.success, false);
  });

  test("accepts a normal file name", () => {
    const result = createFileSchema.safeParse({ name: "utils.js" });
    assert.equal(result.success, true);
  });

  test("accepts a nested normal path", () => {
    const result = createFileSchema.safeParse({ name: "src/components/App.jsx" });
    assert.equal(result.success, true);
  });
});

describe("permissionChangeSchema", () => {
  test("rejects an invalid role", () => {
    const result = permissionChangeSchema.safeParse({ targetUsername: "sam", role: "SUPERADMIN" });
    assert.equal(result.success, false);
  });

  test("accepts a valid role", () => {
    const result = permissionChangeSchema.safeParse({ targetUsername: "sam", role: "VIEWER" });
    assert.equal(result.success, true);
  });
});
