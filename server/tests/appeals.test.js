import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import ModerationAppeal from "../src/models/ModerationAppeal.js";
import ActivityLog from "../src/models/ActivityLog.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { submitAppealSchema } from "../src/validators/authValidators.js";
import {
  appealIdParamSchema,
  moderationActionSchema,
  reviewAppealSchema,
} from "../src/validators/adminValidators.js";
import { submitAppeal } from "../src/controllers/authController.js";
import { suspendUser, reviewAppeal, listAppeals } from "../src/controllers/adminController.js";
import { buildModerationPayload, signAppealToken } from "../src/services/moderationService.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-that-is-over-32-chars-long";

function createMockRes() {
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      body = data;
      return res;
    },
    getStatus() {
      return statusCode;
    },
    getBody() {
      return body;
    },
  };
  return res;
}

describe("Account Suspension / Ban Appeals", () => {
  test("validators enforce appeal message length, appeal ID, and review decision", () => {
    assert.equal(
      submitAppealSchema.safeParse({ appealToken: "a".repeat(20), message: "too short" }).success,
      false
    );
    assert.equal(
      submitAppealSchema.safeParse({
        appealToken: "a".repeat(20),
        message: "Please review my account suspension, it was an honest mistake.",
      }).success,
      true
    );
    assert.equal(
      appealIdParamSchema.safeParse({ appealId: "65f1a2b3c4d5e6f7a8b9c0d1" }).success,
      true
    );
    assert.equal(
      moderationActionSchema.safeParse({ reason: "Repeated spam in public rooms" }).success,
      true
    );
    assert.equal(
      reviewAppealSchema.safeParse({ decision: "APPROVED", adminNote: "Verified" }).success,
      true
    );
    assert.equal(
      reviewAppealSchema.safeParse({ decision: "MAYBE" }).success,
      false
    );
  });

  test("buildModerationPayload produces structured status, reason, and valid appealToken", async () => {
    const userId = new mongoose.Types.ObjectId();
    const payload = await buildModerationPayload({
      _id: userId,
      username: "alex",
      status: "SUSPENDED",
      moderationReason: "Excessive rate limit abuse",
      moderatedAt: new Date("2026-11-27T00:00:00Z"),
    });

    assert.equal(payload.code, "ACCOUNT_SUSPENDED");
    assert.equal(payload.moderation.status, "SUSPENDED");
    assert.equal(payload.moderation.username, "alex");
    assert.equal(payload.moderation.reason, "Excessive rate limit abuse");
    assert.equal(typeof payload.moderation.appealToken, "string");
  });

  test("submitAppeal creates a PENDING appeal for a banned user and blocks duplicates", async () => {
    const userId = new mongoose.Types.ObjectId();
    const appealToken = signAppealToken(userId);
    const bannedUser = {
      _id: userId,
      username: "banned_dev",
      email: "banned@example.com",
      status: "BANNED",
      moderationReason: "Disruptive conduct",
    };

    const findUserMock = mock.method(User, "findById", async () => bannedUser);
    const findOneAppealMock = mock.method(ModerationAppeal, "findOne", () => ({
      lean: async () => null,
    }));
    const createAppealMock = mock.method(ModerationAppeal, "create", async (doc) => ({
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      createdAt: new Date(),
    }));
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      const res = createMockRes();
      await submitAppeal(
        {
          body: {
            appealToken,
            message: "I apologize for the disruption and will follow all room guidelines.",
          },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(res.getStatus(), 201);
      assert.equal(res.getBody().appeal.status, "PENDING");
      assert.equal(res.getBody().appeal.accountStatus, "BANNED");
      assert.equal(res.getBody().appeal.username, "banned_dev");
    } finally {
      findUserMock.mock.restore();
      findOneAppealMock.mock.restore();
      createAppealMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("suspendUser saves moderationReason and emits account-moderated to active sockets", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const targetUser = {
      _id: targetId,
      username: "target_user",
      role: "USER",
      status: "ACTIVE",
      moderationReason: "",
      moderatedAt: null,
      async save() {},
    };

    const emittedEvents = [];
    let disconnected = false;
    const fakeSocket = {
      data: { identity: { userId: targetId.toString() } },
      emit(event, data) {
        emittedEvents.push({ event, data });
      },
      disconnect() {
        disconnected = true;
      },
    };

    const findMock = mock.method(User, "findById", async () => targetUser);
    const revokeMock = mock.method(RefreshToken, "updateMany", async () => ({ modifiedCount: 1 }));
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      const res = createMockRes();
      await suspendUser(
        {
          params: { userId: targetId.toString() },
          body: { reason: "Temporary cooldown" },
          user: { _id: adminId },
          app: { get: () => ({ fetchSockets: async () => [fakeSocket] }) },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(targetUser.status, "SUSPENDED");
      assert.equal(targetUser.moderationReason, "Temporary cooldown");
      assert.equal(disconnected, true);
      const moderatedEvent = emittedEvents.find((e) => e.event === "account-moderated");
      assert.ok(moderatedEvent);
      assert.equal(moderatedEvent.data.status, "SUSPENDED");
      assert.equal(moderatedEvent.data.reason, "Temporary cooldown");
      assert.equal(typeof moderatedEvent.data.appealToken, "string");
    } finally {
      findMock.mock.restore();
      revokeMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("reviewAppeal APPROVED restores user status to ACTIVE and clears moderationReason", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const appealId = new mongoose.Types.ObjectId();

    const appeal = {
      _id: appealId,
      userId,
      username: "alex",
      status: "PENDING",
      async save() {},
    };
    const user = {
      _id: userId,
      username: "alex",
      status: "BANNED",
      moderationReason: "Rule violation",
      moderatedAt: new Date(),
      async save() {},
    };

    const findAppealMock = mock.method(ModerationAppeal, "findById", async () => appeal);
    const findUserMock = mock.method(User, "findById", async () => user);
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      const res = createMockRes();
      await reviewAppeal(
        {
          params: { appealId: appealId.toString() },
          body: { decision: "APPROVED", adminNote: "Appeal accepted" },
          user: { _id: adminId, username: "admin" },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(appeal.status, "APPROVED");
      assert.equal(appeal.adminNote, "Appeal accepted");
      assert.equal(user.status, "ACTIVE");
      assert.equal(user.moderationReason, "");
      assert.equal(res.getBody().user.status, "ACTIVE");
    } finally {
      findAppealMock.mock.restore();
      findUserMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("listAppeals prioritizes PENDING appeals and returns pendingCount", async () => {
    const sampleAppeals = [
      { _id: "1", status: "APPROVED", createdAt: new Date() },
      { _id: "2", status: "PENDING", createdAt: new Date() },
      { _id: "3", status: "REJECTED", createdAt: new Date() },
    ];

    const findMock = mock.method(ModerationAppeal, "find", () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [...sampleAppeals],
        }),
      }),
    }));
    const countMock = mock.method(ModerationAppeal, "countDocuments", async () => 1);

    try {
      const res = createMockRes();
      await listAppeals({}, res, (err) => {
        if (err) throw err;
      });
      assert.equal(res.getBody().pendingCount, 1);
      assert.equal(res.getBody().appeals[0].status, "PENDING");
    } finally {
      findMock.mock.restore();
      countMock.mock.restore();
    }
  });
});
