import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { makePresenceStore, deduplicateParticipants } from "../src/sockets/index.js";

describe("Task 2.4 — Presence Reliability and De-duplication", () => {
  test("deduplicateParticipants merges multiple sockets of same user into 1 entry with connections count", () => {
    const rawRecords = [
      { socketId: "s1", username: "alice", userId: "u1", guestId: null, status: "AWAY", lastSeen: Date.now() },
      { socketId: "s2", username: "alice", userId: "u1", guestId: null, status: "ONLINE", lastSeen: Date.now() },
      { socketId: "s3", username: "Guest-1", userId: null, guestId: "g1", status: "ONLINE", lastSeen: Date.now() },
    ];

    const deduplicated = deduplicateParticipants(rawRecords);
    assert.equal(deduplicated.length, 2);

    const alice = deduplicated.find((p) => p.userId === "u1");
    assert.equal(alice.connections, 2);
    // ONLINE beats AWAY
    assert.equal(alice.status, "ONLINE");

    const guest = deduplicated.find((p) => p.guestId === "g1");
    assert.equal(guest.connections, 1);
    assert.equal(guest.status, "ONLINE");
  });

  test("in-memory presence store filters out stale records older than 60s and deletes them", async () => {
    const store = makePresenceStore(null);
    const roomId = "room123456";
    const now = Date.now();

    // Fresh record
    await store.set(roomId, "sock_active", {
      username: "activeUser",
      userId: "u1",
      guestId: null,
      status: "ONLINE",
      lastSeen: now,
    });

    // Stale record (70s old)
    await store.set(roomId, "sock_stale", {
      username: "staleUser",
      userId: "u2",
      guestId: null,
      status: "ONLINE",
      lastSeen: now - 70_000,
    });

    const list = await store.list(roomId);
    assert.equal(list.length, 1);
    assert.equal(list[0].username, "activeUser");

    // Calling again confirms stale entry was removed from the internal map
    const listAgain = await store.list(roomId);
    assert.equal(listAgain.length, 1);
  });

  test("redis presence store sets 120s TTL and purges stale records", async () => {
    let ttlSet = null;
    let deletedKey = null;
    const redisStorage = new Map();

    const mockRedis = {
      async hSet(key, field, val) {
        if (!redisStorage.has(key)) redisStorage.set(key, new Map());
        redisStorage.get(key).set(field, val);
      },
      async hGet(key, field) {
        return redisStorage.get(key)?.get(field) || null;
      },
      async hGetAll(key) {
        const obj = {};
        const map = redisStorage.get(key);
        if (map) {
          for (const [k, v] of map.entries()) obj[k] = v;
        }
        return obj;
      },
      async hDel(key, ...fields) {
        const map = redisStorage.get(key);
        if (map) {
          for (const f of fields) map.delete(f);
        }
      },
      async hLen(key) {
        return redisStorage.get(key)?.size || 0;
      },
      async expire(key, seconds) {
        ttlSet = { key, seconds };
      },
      async del(key) {
        deletedKey = key;
        redisStorage.delete(key);
      },
    };

    const store = makePresenceStore(mockRedis);
    const roomId = "redis_room";

    await store.set(roomId, "sock_1", {
      username: "bob",
      userId: "uBob",
      guestId: null,
      status: "ONLINE",
    });

    assert.equal(ttlSet?.key, `presence:${roomId}`);
    assert.equal(ttlSet?.seconds, 120);

    const list = await store.list(roomId);
    assert.equal(list.length, 1);
    assert.equal(list[0].username, "bob");

    // Remove socket -> deletes key when hash becomes empty
    await store.remove(roomId, "sock_1");
    assert.equal(deletedKey, `presence:${roomId}`);
  });
});
