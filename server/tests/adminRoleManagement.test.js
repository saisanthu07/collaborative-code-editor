import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import ActivityLog from "../src/models/ActivityLog.js";
import { changeUserRoleSchema } from "../src/validators/adminValidators.js";
import { changeUserRole } from "../src/controllers/adminController.js";

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

describe("Admin Role Promotion & Demotion Security", () => {
  test("changeUserRoleSchema enforces valid roles and non-empty currentPassword", () => {
    assert.equal(
      changeUserRoleSchema.safeParse({ role: "ADMIN", currentPassword: "Password1" }).success,
      true
    );
    assert.equal(
      changeUserRoleSchema.safeParse({ role: "USER", currentPassword: "Password1" }).success,
      true
    );
    assert.equal(
      changeUserRoleSchema.safeParse({ role: "SUPERADMIN", currentPassword: "Password1" }).success,
      false
    );
    assert.equal(
      changeUserRoleSchema.safeParse({ role: "ADMIN", currentPassword: "" }).success,
      false
    );
  });

  test("rejects changing own role with 400", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const res = createMockRes();

    await changeUserRole(
      {
        params: { userId: adminId.toString() },
        body: { role: "USER", currentPassword: "Password1" },
        user: { _id: adminId, passwordHash: "hash" },
      },
      res,
      (err) => {
        if (err) throw err;
      }
    );

    assert.equal(res.getStatus(), 400);
    assert.match(res.getBody().error, /own/i);
  });

  test("rejects incorrect administrator password with 403", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);
    const res = createMockRes();

    await changeUserRole(
      {
        params: { userId: targetId.toString() },
        body: { role: "ADMIN", currentPassword: "WrongPassword" },
        user: { _id: adminId, username: "root", passwordHash },
      },
      res,
      (err) => {
        if (err) throw err;
      }
    );

    assert.equal(res.getStatus(), 403);
    assert.match(res.getBody().error, /password/i);
  });

  test("rejects promoting a suspended or banned user with 400", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);

    const findMock = mock.method(User, "findById", async () => ({
      _id: targetId,
      username: "suspended_user",
      role: "USER",
      status: "SUSPENDED",
    }));

    try {
      const res = createMockRes();
      await changeUserRole(
        {
          params: { userId: targetId.toString() },
          body: { role: "ADMIN", currentPassword: "CorrectPass1" },
          user: { _id: adminId, username: "root", passwordHash },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(res.getStatus(), 400);
      assert.match(res.getBody().error, /suspended or banned/i);
    } finally {
      findMock.mock.restore();
    }
  });

  test("prevents demoting the last active administrator with 409", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);

    const findMock = mock.method(User, "findById", async () => ({
      _id: targetId,
      username: "only_admin",
      role: "ADMIN",
      status: "ACTIVE",
    }));
    const countMock = mock.method(User, "countDocuments", async () => 0);

    try {
      const res = createMockRes();
      await changeUserRole(
        {
          params: { userId: targetId.toString() },
          body: { role: "USER", currentPassword: "CorrectPass1" },
          user: { _id: adminId, username: "root", passwordHash },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(res.getStatus(), 409);
      assert.match(res.getBody().error, /last active administrator/i);
    } finally {
      findMock.mock.restore();
      countMock.mock.restore();
    }
  });

  test("promotes active USER to ADMIN and updates connected sockets", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);
    let saved = false;

    const targetUser = {
      _id: targetId,
      username: "alice",
      email: "alice@example.com",
      role: "USER",
      status: "ACTIVE",
      async save() {
        saved = true;
      },
    };

    const joinedRooms = [];
    const emittedEvents = [];
    const fakeSocket = {
      data: { identity: { userId: targetId.toString(), role: "USER" } },
      join(room) {
        joinedRooms.push(room);
      },
      leave() {},
      emit(event, data) {
        emittedEvents.push({ event, data });
      },
    };

    const findMock = mock.method(User, "findById", async () => targetUser);
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      const res = createMockRes();
      await changeUserRole(
        {
          params: { userId: targetId.toString() },
          body: { role: "ADMIN", currentPassword: "CorrectPass1" },
          user: { _id: adminId, username: "root", passwordHash },
          app: { get: () => ({ fetchSockets: async () => [fakeSocket] }) },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(res.getStatus(), 200);
      assert.equal(saved, true);
      assert.equal(targetUser.role, "ADMIN");
      assert.equal(fakeSocket.data.identity.role, "ADMIN");
      assert.deepEqual(joinedRooms, ["admin:alerts"]);
      assert.deepEqual(emittedEvents, [{ event: "account-role-updated", data: { role: "ADMIN" } }]);
    } finally {
      findMock.mock.restore();
      logMock.mock.restore();
    }
  });

  test("demotes ADMIN to USER, revokes refresh tokens, and removes admin socket room", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);
    let tokensRevoked = false;

    const targetUser = {
      _id: targetId,
      username: "bob",
      email: "bob@example.com",
      role: "ADMIN",
      status: "ACTIVE",
      async save() {},
    };

    const leftRooms = [];
    const emittedEvents = [];
    const fakeSocket = {
      data: { identity: { userId: targetId.toString(), role: "ADMIN" } },
      join() {},
      leave(room) {
        leftRooms.push(room);
      },
      emit(event, data) {
        emittedEvents.push({ event, data });
      },
    };

    const findMock = mock.method(User, "findById", async () => targetUser);
    const countMock = mock.method(User, "countDocuments", async () => 1);
    const revokeMock = mock.method(RefreshToken, "updateMany", async () => {
      tokensRevoked = true;
      return { modifiedCount: 2 };
    });
    const logMock = mock.method(ActivityLog, "create", async () => ({}));

    try {
      const res = createMockRes();
      await changeUserRole(
        {
          params: { userId: targetId.toString() },
          body: { role: "USER", currentPassword: "CorrectPass1" },
          user: { _id: adminId, username: "root", passwordHash },
          app: { get: () => ({ fetchSockets: async () => [fakeSocket] }) },
        },
        res,
        (err) => {
          if (err) throw err;
        }
      );

      assert.equal(res.getStatus(), 200);
      assert.equal(targetUser.role, "USER");
      assert.equal(tokensRevoked, true);
      assert.equal(fakeSocket.data.identity.role, "USER");
      assert.deepEqual(leftRooms, ["admin:alerts"]);
      assert.deepEqual(emittedEvents, [{ event: "account-role-updated", data: { role: "USER" } }]);
    } finally {
      findMock.mock.restore();
      countMock.mock.restore();
      revokeMock.mock.restore();
      logMock.mock.restore();
    }
  });
});
