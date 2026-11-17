import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { userIdParamSchema, roomIdParamSchema } from "../src/validators/adminValidators.js";

describe("adminValidators", () => {
  test("userIdParamSchema accepts valid 24-character ObjectId", () => {
    assert.equal(userIdParamSchema.safeParse({ userId: "507f1f77bcf86cd799439011" }).success, true);
    assert.equal(userIdParamSchema.safeParse({ userId: "invalid-id" }).success, false);
    assert.equal(userIdParamSchema.safeParse({ userId: "507f1f77bcf86cd79943901" }).success, false);
    assert.equal(userIdParamSchema.safeParse({ userId: "507f1f77bcf86cd7994390111" }).success, false);
  });

  test("roomIdParamSchema accepts 10-character alphanumeric room ID", () => {
    assert.equal(roomIdParamSchema.safeParse({ roomId: "abcdef1234" }).success, true);
    assert.equal(roomIdParamSchema.safeParse({ roomId: "short" }).success, false);
    assert.equal(roomIdParamSchema.safeParse({ roomId: "has-hyphen" }).success, false);
  });
});
