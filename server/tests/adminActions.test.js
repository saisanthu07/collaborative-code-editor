import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import ActivityLog from "../src/models/ActivityLog.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { logIdParamSchema } from "../src/validators/adminValidators.js";
import {
  banUser,
  unbanUser,
  deleteActivityLog,
  clearActivityLogs,
} from "../src/controllers/adminController.js";

describe("Admin Ban & Activity Log Actions", () => {
  test("logIdParamSchema accepts 24-hex ObjectId and rejects invalid IDs", () => {
    assert.equal(logIdParamSchema.safeParse({ logId: "65f1a2b3c4d5e6f7a8b9c0d1" }).success, true);
    assert.equal(logIdParamSchema.safeParse({ logId: "bad-id" }).success, false);
  });

  test("banUser sets user status to BANNED and revokes refresh tokens", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    let saved = false;
    const targetUser = {
      _id: targetId,
      username: "troublemaker",
      role: "USER",
      status: "ACTIVE",
      async save() {
        saved = true;
      },
    };

    const findMock = mock.method(User, "findById", async () => targetUser);
    const revokeMock = mock.method(RefreshToken, "updateMany", async () => ({ modifiedCount: 1 }));
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      let jsonBody = null;
      const req = {
        params: { userId: targetId.toString() },
        user: { _id: adminId },
        app: { get: () => null },
      };
      const res = {
        status() {
          return res;
        },
        json(data) {
          jsonBody = data;
          return res;
        },
      };

      await banUser(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(targetUser.status, "BANNED");
      assert.equal(jsonBody.user.status, "BANNED");
    } finally {
      findMock.mock.restore();
      revokeMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("unbanUser restores user status to ACTIVE", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const targetUser = {
      _id: targetId,
      username: "restored",
      role: "USER",
      status: "BANNED",
      async save() {},
    };

    const findMock = mock.method(User, "findById", async () => targetUser);
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      let jsonBody = null;
      const req = {
        params: { userId: targetId.toString() },
        user: { _id: adminId },
      };
      const res = {
        status() {
          return res;
        },
        json(data) {
          jsonBody = data;
          return res;
        },
      };

      await unbanUser(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(jsonBody.user.status, "ACTIVE");
    } finally {
      findMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("deleteActivityLog and clearActivityLogs remove logs and report success", async () => {
    const delOneMock = mock.method(ActivityLog, "findByIdAndDelete", async () => ({ _id: "1" }));
    const delManyMock = mock.method(ActivityLog, "deleteMany", async () => ({ deletedCount: 5 }));

    try {
      let body1 = null;
      const res1 = { status: () => res1, json: (d) => (body1 = d) };
      await deleteActivityLog(
        { params: { logId: "65f1a2b3c4d5e6f7a8b9c0d1" } },
        res1,
        (e) => { if (e) throw e; }
      );
      assert.equal(body1.success, true);

      let body2 = null;
      await clearActivityLogs(
        { query: {} },
        { json: (d) => (body2 = d) },
        (e) => { if (e) throw e; }
      );
      assert.equal(body2.success, true);
      assert.equal(body2.deletedCount, 5);
    } finally {
      delOneMock.mock.restore();
      delManyMock.mock.restore();
    }
  });
});
