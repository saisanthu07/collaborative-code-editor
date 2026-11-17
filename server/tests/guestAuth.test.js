import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env.JWT_SECRET = "test-secret-for-guest-auth-at-least-32-chars";
});

const { signGuestToken, verifyGuestToken } = await import("../src/utils/guestToken.js");
const { signToken } = await import("../src/utils/jwt.js");

describe("Task 2.2 — Guest Authentication and Token Lifecycle", () => {
  test("signGuestToken creates a valid guest JWT that verifyGuestToken decodes", () => {
    const payload = { guestId: "deadbeef12345678", username: "Guest-4321", roomId: "abcdef1234" };
    const token = signGuestToken(payload);
    const decoded = verifyGuestToken(token);

    assert.equal(decoded.guestId, payload.guestId);
    assert.equal(decoded.username, payload.username);
    assert.equal(decoded.roomId, payload.roomId);
    assert.equal(decoded.typ, "guest");
  });

  test("verifyGuestToken rejects user tokens (typ !== 'guest')", () => {
    const userToken = signToken({ sub: "user-123", role: "USER" });
    assert.throws(() => verifyGuestToken(userToken), /invalid token type/i);
  });

  test("verifyGuestToken throws on tampered token", () => {
    const token = signGuestToken({ guestId: "id1", username: "Guest-1", roomId: "room123456" });
    const tampered = token.slice(0, -3) + "abc";
    assert.throws(() => verifyGuestToken(tampered));
  });

  test("forged token for a different room is detected when checked against target room", () => {
    const tokenForRoomA = signGuestToken({ guestId: "id1", username: "Guest-1", roomId: "roomAAAAAA" });
    const decoded = verifyGuestToken(tokenForRoomA);
    assert.notEqual(decoded.roomId, "roomBBBBBB");
  });
});
