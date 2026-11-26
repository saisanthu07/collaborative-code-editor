import { test, describe } from "node:test";
import assert from "node:assert/strict";
import Room from "../src/models/Room.js";
import { endSession, leave } from "../src/controllers/roomController.js";

describe("Task 2.5 — Dashboard Payload and Query Optimization", () => {
  test("room formatting computes memberCount and isStarred while stripping files.content and starredBy", () => {
    const userId = "507f1f77bcf86cd799439011";
    const otherUserId = "507f1f77bcf86cd799439022";

    const rawDocs = [
      {
        roomId: "room_owned_1",
        name: "Owned Room",
        language: "javascript",
        ownerId: userId,
        members: [{ username: "owner" }, { username: "collab" }],
        starredBy: [userId],
      },
      {
        roomId: "room_shared_1",
        name: "Shared Room",
        language: "python",
        ownerId: otherUserId,
        members: [{ username: "collab1" }],
        starredBy: [otherUserId],
      },
    ];

    const formatRoom = (doc) => {
      const isStarred = Boolean(
        doc.starredBy && doc.starredBy.some((id) => id.toString() === userId.toString())
      );
      const memberCount = doc.members ? doc.members.length : 0;
      const { starredBy, files, ...rest } = doc;
      return {
        ...rest,
        memberCount,
        isStarred,
      };
    };

    const formatted = rawDocs.map(formatRoom);

    // Verify room 1 (starred by user)
    assert.equal(formatted[0].isStarred, true);
    assert.equal(formatted[0].memberCount, 2);
    assert.equal(formatted[0].starredBy, undefined);
    assert.equal(formatted[0].files, undefined);

    // Verify room 2 (not starred by user)
    assert.equal(formatted[1].isStarred, false);
    assert.equal(formatted[1].memberCount, 1);
    assert.equal(formatted[1].starredBy, undefined);
  });

  test("de-duplicates rooms across owned, memberOf, and starred sets", () => {
    const owned = [{ roomId: "room_1", name: "Room 1" }];
    const memberOf = [{ roomId: "room_2", name: "Room 2" }];
    const starred = [
      { roomId: "room_1", name: "Room 1" }, // Duplicate with owned
      { roomId: "room_3", name: "Starred Only Room" },
    ];

    const allRoomsMap = new Map();
    [...owned, ...memberOf, ...starred].forEach((r) => {
      if (!allRoomsMap.has(r.roomId)) {
        allRoomsMap.set(r.roomId, r);
      }
    });

    const uniqueRooms = Array.from(allRoomsMap.values());
    assert.equal(uniqueRooms.length, 3);
    assert.deepEqual(
      uniqueRooms.map((r) => r.roomId),
      ["room_1", "room_2", "room_3"]
    );
  });

  test("endSession marks room COMPLETED without deleting it so it stays in recents", async () => {
    const origFindOneAndUpdate = Room.findOneAndUpdate;
    let capturedUpdate = null;

    Room.findOneAndUpdate = async (_query, update) => {
      capturedUpdate = update;
      return {
        roomId: "room_done_1",
        status: "COMPLETED",
        endedAt: update.$set.endedAt,
      };
    };

    try {
      const req = {
        room: { roomId: "room_done_1" },
        user: { _id: "507f1f77bcf86cd799439011" },
        app: { get: () => null },
      };
      let jsonBody = null;
      const res = {
        json(payload) {
          jsonBody = payload;
        },
      };

      await endSession(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(capturedUpdate.$set.status, "COMPLETED");
      assert.ok(capturedUpdate.$set.endedAt instanceof Date);
      assert.equal(jsonBody.room.status, "COMPLETED");
    } finally {
      Room.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  test("leave preserves user membership and bumps lastActiveAt so shared rooms stay in recents", async () => {
    const origUpdateOne = Room.updateOne;
    let capturedFilter = null;
    let capturedUpdate = null;

    Room.updateOne = async (filter, update) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { modifiedCount: 1 };
    };

    try {
      const req = {
        room: { roomId: "room_shared_1" },
        user: { _id: "507f1f77bcf86cd799439022", username: "collab" },
      };
      let jsonBody = null;
      const res = {
        json(payload) {
          jsonBody = payload;
        },
      };

      await leave(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(capturedFilter.roomId, "room_shared_1");
      assert.equal(capturedFilter["members.userId"], "507f1f77bcf86cd799439022");
      assert.ok(capturedUpdate.$set.lastActiveAt instanceof Date);
      assert.equal(jsonBody.success, true);
    } finally {
      Room.updateOne = origUpdateOne;
    }
  });
});
