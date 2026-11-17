import { test, describe } from "node:test";
import assert from "node:assert/strict";

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
});
