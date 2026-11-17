import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  joinRoomSchema,
  heartbeatSchema,
  chatMessageSchema,
  presenceIdleSchema,
  permissionChangeSchema,
  fileCreatedSchema,
  fileDeletedSchema,
  fileRenamedSchema,
  fileLanguageSchema,
  executionStartedSchema,
} from "../src/validators/socketValidators.js";

describe("socketValidators", () => {
  const validRoomId = "abcdef1234";

  test("joinRoomSchema accepts valid 10-char alphanumeric roomId", () => {
    assert.equal(joinRoomSchema.safeParse({ roomId: validRoomId }).success, true);
    assert.equal(joinRoomSchema.safeParse({ roomId: "short" }).success, false);
    assert.equal(joinRoomSchema.safeParse({ roomId: "UPPERCASE1" }).success, false);
    assert.equal(joinRoomSchema.safeParse({ roomId: { $ne: null } }).success, false);
  });

  test("chatMessageSchema enforces roomId and 1-2000 chars text", () => {
    assert.equal(chatMessageSchema.safeParse({ roomId: validRoomId, text: "Hello" }).success, true);
    assert.equal(chatMessageSchema.safeParse({ roomId: validRoomId, text: "" }).success, false);
    assert.equal(chatMessageSchema.safeParse({ roomId: validRoomId, text: "a".repeat(2001) }).success, false);
  });

  test("heartbeatSchema validates roomId", () => {
    assert.equal(heartbeatSchema.safeParse({ roomId: validRoomId }).success, true);
    assert.equal(heartbeatSchema.safeParse({ roomId: "bad-room!" }).success, false);
  });

  test("presenceIdleSchema accepts ONLINE and AWAY", () => {
    assert.equal(presenceIdleSchema.safeParse({ roomId: validRoomId, status: "ONLINE" }).success, true);
    assert.equal(presenceIdleSchema.safeParse({ roomId: validRoomId, status: "AWAY" }).success, true);
    assert.equal(presenceIdleSchema.safeParse({ roomId: validRoomId, status: "OFFLINE" }).success, false);
  });

  test("permissionChangeSchema validates role", () => {
    assert.equal(permissionChangeSchema.safeParse({ roomId: validRoomId, targetUsername: "alice", role: "EDITOR" }).success, true);
    assert.equal(permissionChangeSchema.safeParse({ roomId: validRoomId, targetUsername: "alice", role: "SUPERADMIN" }).success, false);
  });

  test("file schemas reuse safeFileName to block path traversal", () => {
    assert.equal(fileCreatedSchema.safeParse({ roomId: validRoomId, file: { name: "index.js", content: "code" } }).success, true);
    assert.equal(fileCreatedSchema.safeParse({ roomId: validRoomId, file: { name: "../secrets.txt" } }).success, false);
    assert.equal(fileDeletedSchema.safeParse({ roomId: validRoomId, fileName: "../root" }).success, false);
    assert.equal(fileRenamedSchema.safeParse({ roomId: validRoomId, oldName: "a.js", newName: "/etc/passwd" }).success, false);
    assert.equal(fileRenamedSchema.safeParse({ roomId: validRoomId, oldName: "a.js", newName: "b.js" }).success, true);
  });

  test("executionStartedSchema validates roomId", () => {
    assert.equal(executionStartedSchema.safeParse({ roomId: validRoomId }).success, true);
    assert.equal(executionStartedSchema.safeParse({ roomId: "bad-id!" }).success, false);
  });

  test("fileLanguageSchema validates roomId, safeFileName, and language string", () => {
    assert.equal(fileLanguageSchema.safeParse({ roomId: validRoomId, fileName: "main.py", language: "python" }).success, true);
    assert.equal(fileLanguageSchema.safeParse({ roomId: validRoomId, fileName: "../main.py", language: "python" }).success, false);
    assert.equal(fileLanguageSchema.safeParse({ roomId: "invalid", fileName: "main.py", language: "python" }).success, false);
  });
});
