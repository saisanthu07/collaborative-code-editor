import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Room from "../src/models/Room.js";
import { roomAccessMiddleware } from "../src/middleware/roomAccessMiddleware.js";
import { generateInviteCode, hasValidInviteCode } from "../src/services/roomService.js";

describe("Private Room Access & Invite Security", () => {
  test("hasValidInviteCode validates matching codes and rejects mismatches", () => {
    const code = generateInviteCode();
    assert.equal(code.length, 24);
    assert.equal(hasValidInviteCode({ inviteCode: code }, code), true);
    assert.equal(hasValidInviteCode({ inviteCode: code }, "wrong-code"), false);
    assert.equal(hasValidInviteCode({ inviteCode: code }, ""), false);
    assert.equal(hasValidInviteCode({ inviteCode: null }, code), false);
  });

  test("roomAccessMiddleware rejects authenticated non-member from PRIVATE room without invite", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const strangerId = new mongoose.Types.ObjectId();
    const fakeRoom = {
      roomId: "abc1234567",
      ownerId,
      visibility: "PRIVATE",
      inviteCode: "secretinvitecode12345678",
      members: [{ userId: ownerId, username: "owner", role: "HOST" }],
      settings: { locked: false, lockedByAdmin: false, defaultRole: "EDITOR" },
      bannedUserIds: [],
      bannedUsernames: [],
    };

    const findMock = mock.method(Room, "findOne", async () => fakeRoom);
    try {
      let statusCode = null;
      let body = null;
      const req = {
        params: { roomId: "abc1234567" },
        method: "POST",
        path: "/abc1234567/join",
        headers: {},
        body: {},
        query: {},
        user: { _id: strangerId, username: "stranger" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return res;
        },
        json(data) {
          body = data;
          return res;
        },
      };

      await roomAccessMiddleware(req, res, () => {
        assert.fail("Non-member should not be allowed into PRIVATE room without invite");
      });

      assert.equal(statusCode, 403);
      assert.match(body.error, /invite/i);
    } finally {
      findMock.mock.restore();
    }
  });

  test("roomAccessMiddleware admits authenticated user into PRIVATE room with valid inviteCode on /join", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const invitedId = new mongoose.Types.ObjectId();
    const fakeRoom = {
      roomId: "abc1234567",
      ownerId,
      visibility: "PRIVATE",
      inviteCode: "secretinvitecode12345678",
      members: [{ userId: ownerId, username: "owner", role: "HOST" }],
      settings: { locked: false, lockedByAdmin: false, defaultRole: "EDITOR" },
      bannedUserIds: [],
      bannedUsernames: [],
    };

    const findMock = mock.method(Room, "findOne", async () => fakeRoom);
    try {
      let nextCalled = false;
      const req = {
        params: { roomId: "abc1234567" },
        method: "POST",
        path: "/abc1234567/join",
        headers: {},
        body: { inviteCode: "secretinvitecode12345678" },
        query: {},
        user: { _id: invitedId, username: "invited_user" },
      };
      const res = {
        status() {
          assert.fail("Should not return error status for valid invite");
        },
      };

      await roomAccessMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(req.userRole, "EDITOR");
    } finally {
      findMock.mock.restore();
    }
  });
});
