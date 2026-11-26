import crypto from "crypto";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as decoding from "lib0/decoding";
import { setupWSConnection, setPersistence, docs, getPersistence } from "y-websocket/bin/utils";
import Room from "../models/Room.js";
import YjsDoc from "../models/YjsDoc.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { verifyGuestToken } from "../utils/guestToken.js";
import { resolveRole, canEdit } from "../services/roomService.js";
import { logError } from "../utils/logger.js";

const activeConnections = new Set();
let globalWss = null;

// Short-lived room policy cache to avoid querying MongoDB on every Yjs keystroke
const POLICY_TTL_MS = 5_000;
const roomPolicyCache = new Map(); // roomId -> { roomSnapshot, cachedAt }

// Optional Redis Pub/Sub bridge for multi-instance Yjs synchronization
const instanceId = crypto.randomUUID();
const REDIS_ORIGIN = Symbol("redis-yjs-sync");
let redisPub = null;
let redisSub = null;
const subscribedChannels = new Set();

export function invalidateRoomPolicyCache(roomId) {
  if (roomId) {
    roomPolicyCache.delete(roomId);
  }
}

async function getCachedRoomPolicy(roomId) {
  const cached = roomPolicyCache.get(roomId);
  const now = Date.now();
  if (cached && now - cached.cachedAt < POLICY_TTL_MS) {
    return cached.roomSnapshot;
  }
  const room = await Room.findOne({ roomId })
    .select("ownerId members settings bannedUserIds bannedUsernames visibility")
    .lean();
  if (!room) {
    roomPolicyCache.delete(roomId);
    return null;
  }
  roomPolicyCache.set(roomId, { roomSnapshot: room, cachedAt: now });
  return room;
}

function getCachedRoomPolicySync(roomId) {
  const cached = roomPolicyCache.get(roomId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > POLICY_TTL_MS) {
    // Refresh asynchronously in background while returning stale snapshot for frame ordering safety
    getCachedRoomPolicy(roomId).catch(() => {});
  }
  return cached.roomSnapshot;
}

export async function attachYjsRedisBridge(pubClient, subClient) {
  if (!pubClient || !subClient) return;
  redisPub = pubClient;
  redisSub = subClient;

  // Use pattern subscription so every room:file doc syncs across instances
  await redisSub.pSubscribe("yjs:update:*", (rawMessage, channel) => {
    try {
      const docName = channel.slice("yjs:update:".length);
      const doc = docs.get(docName);
      if (!doc) return;

      const parsed = JSON.parse(rawMessage);
      if (!parsed || parsed.origin === instanceId || !parsed.update) return;

      const updateBytes = Uint8Array.from(Buffer.from(parsed.update, "base64"));
      Y.applyUpdate(doc, updateBytes, REDIS_ORIGIN);
    } catch (err) {
      logError("YJS_REDIS_SUB", err);
    }
  });
}

export function disconnectYjsUser(roomId, username) {
  invalidateRoomPolicyCache(roomId);
  for (const conn of activeConnections) {
    if (conn.roomId === roomId && conn.user?.username === username) {
      conn.close(4001, "Kicked from room");
    }
  }
}

export function disconnectAllRoomYjs(roomId) {
  invalidateRoomPolicyCache(roomId);
  for (const conn of activeConnections) {
    if (conn.roomId === roomId) {
      conn.close(4000, "Room ended by host");
    }
  }
}

export async function migrateYjsDoc(roomId, oldFileName, newFileName) {
  const oldDocName = `${roomId}:${oldFileName}`;
  const newDocName = `${roomId}:${newFileName}`;
  const existingDoc = docs.get(oldDocName);

  if (existingDoc) {
    const state = Y.encodeStateAsUpdate(existingDoc);
    const text = existingDoc.getText("monaco").toString();

    await YjsDoc.findOneAndUpdate(
      { docName: newDocName },
      { docName: newDocName, roomId, fileName: newFileName, state: Buffer.from(state) },
      { upsert: true }
    );
    await YjsDoc.deleteOne({ docName: oldDocName });

    // If a doc is already open under newDocName, apply state to it
    const targetDoc = docs.get(newDocName);
    if (targetDoc) {
      Y.applyUpdate(targetDoc, state);
    }

    await Room.updateOne(
      { roomId, "files.name": newFileName },
      { $set: { "files.$.content": text, lastActiveAt: new Date() } }
    );
  } else {
    await YjsDoc.findOneAndUpdate(
      { docName: oldDocName },
      { docName: newDocName, fileName: newFileName }
    );
  }
}

export async function deleteYjsDoc(roomId, fileName) {
  const docName = `${roomId}:${fileName}`;
  for (const conn of activeConnections) {
    if (conn.docName === docName) {
      conn.close(4004, "File deleted");
    }
  }
  docs.delete(docName);
  await YjsDoc.deleteOne({ docName });
}

export async function deleteRoomYjsDocs(roomId) {
  for (const [docName] of docs.entries()) {
    if (docName.startsWith(`${roomId}:`)) {
      docs.delete(docName);
    }
  }
  await YjsDoc.deleteMany({ roomId });
}

export function getYjsMetrics() {
  return {
    activeDocs: docs.size,
    activeConnections: activeConnections.size,
    policyCacheSize: roomPolicyCache.size,
    redisBridgeActive: Boolean(redisPub && redisSub),
  };
}

export async function flushAllYjsDocs() {
  const persistence = getPersistence();
  if (!persistence) return;
  const promises = [];
  for (const [docName, doc] of docs.entries()) {
    promises.push(
      Promise.resolve(persistence.writeState(docName, doc)).catch((err) =>
        logError("FLUSH_DOC_ERROR", err)
      )
    );
  }
  await Promise.all(promises);
}

export async function closeYjsServer() {
  for (const conn of activeConnections) {
    try {
      conn.terminate();
    } catch {
      // ignore
    }
  }
  activeConnections.clear();
  subscribedChannels.clear();
  if (globalWss) {
    await new Promise((resolve) => globalWss.close(() => resolve()));
  }
}

async function persistYjsDoc(docName, roomId, fileName, ydoc) {
  const text = ydoc.getText("monaco").toString();
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));

  await Promise.all([
    YjsDoc.findOneAndUpdate(
      { docName },
      { docName, roomId, fileName, state },
      { upsert: true }
    ),
    Room.updateOne(
      { roomId, "files.name": fileName },
      { $set: { "files.$.content": text, lastActiveAt: new Date() } }
    ),
  ]);
}

// Mongo-backed binary + text persistence layer for Yjs documents
setPersistence({
  bindState: async (docName, ydoc) => {
    try {
      const colonIdx = docName.indexOf(":");
      if (colonIdx === -1) return;
      const roomId = docName.slice(0, colonIdx);
      const fileName = docName.slice(colonIdx + 1);

      const [snapshot, room] = await Promise.all([
        YjsDoc.findOne({ docName }).lean(),
        Room.findOne({ roomId }).select("files").lean(),
      ]);

      if (snapshot?.state) {
        const bytes = snapshot.state.buffer
          ? new Uint8Array(snapshot.state.buffer, snapshot.state.byteOffset, snapshot.state.byteLength)
          : new Uint8Array(snapshot.state);
        if (bytes.length > 0) {
          Y.applyUpdate(ydoc, bytes);
        }
      } else if (room) {
        const file = room.files.find((f) => f.name === fileName);
        if (file && file.content) {
          const yText = ydoc.getText("monaco");
          if (yText.length === 0) {
            ydoc.transact(() => {
              yText.insert(0, file.content);
            });
          }
        }
      }

      // Debounced writeState: 3s debounce, max 10s between saves
      let debounceTimer = null;
      let lastSaveTime = Date.now();

      const saveToDb = async () => {
        try {
          await persistYjsDoc(docName, roomId, fileName, ydoc);
          lastSaveTime = Date.now();
        } catch (err) {
          logError("YJS_DEBOUNCE_SAVE", err);
        }
      };

      ydoc.on("update", (update, origin) => {
        // Fan out local edits to other backend instances via Redis Pub/Sub
        if (redisPub && origin !== REDIS_ORIGIN) {
          const payload = JSON.stringify({
            origin: instanceId,
            update: Buffer.from(update).toString("base64"),
          });
          redisPub.publish(`yjs:update:${docName}`, payload).catch((err) => {
            logError("YJS_REDIS_PUB", err);
          });
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        const elapsed = Date.now() - lastSaveTime;
        if (elapsed >= 10_000) {
          saveToDb();
        } else {
          debounceTimer = setTimeout(saveToDb, 3000);
        }
      });

      ydoc._customSave = saveToDb;
      ydoc._clearTimer = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    } catch (err) {
      logError("YJS_BIND_STATE", err);
    }
  },

  writeState: async (docName, ydoc) => {
    try {
      const colonIdx = docName.indexOf(":");
      if (colonIdx === -1) return;
      const roomId = docName.slice(0, colonIdx);
      const fileName = docName.slice(colonIdx + 1);

      if (ydoc._clearTimer) ydoc._clearTimer();
      await persistYjsDoc(docName, roomId, fileName, ydoc);
    } catch (err) {
      logError("YJS_WRITE_STATE", err);
    }
  },
});

export function attachYjsWebsocketServer(httpServer, path = "/yjs") {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1_048_576 });
  globalWss = wss;

  httpServer.on("upgrade", async (request, socket, head) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const pathname = url.pathname;

      // Reject non-matching paths with socket.destroy(); match /yjs/ exactly
      if (!pathname.startsWith(`${path}/`)) {
        if (pathname === path || pathname.startsWith(path)) {
          socket.destroy();
          return;
        }
        return; // pass through for Socket.IO or other endpoints
      }

      const rawDocName = decodeURIComponent(pathname.slice(`${path}/`.length));
      if (!rawDocName || !rawDocName.includes(":")) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      const colonIdx = rawDocName.indexOf(":");
      const roomId = rawDocName.slice(0, colonIdx);
      const fileName = rawDocName.slice(colonIdx + 1);

      if (!/^[a-z0-9]{10}$/.test(roomId) || !fileName) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      // Ensure the requested file actually belongs to this room
      const fileExists = room.files?.some((f) => f.name === fileName);
      if (!fileExists) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      const token = url.searchParams.get("token");
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      let user = null;
      let guest = null;

      try {
        const decoded = verifyToken(token);
        if (decoded.typ === "guest" || decoded.guestId) {
          if (decoded.roomId !== roomId) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
          }
          guest = decoded;
        } else if (decoded.sub) {
          user = await User.findById(decoded.sub);
          if (!user || user.status === "SUSPENDED" || user.status === "BANNED") {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
          }
        } else {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      } catch {
        try {
          const decodedGuest = verifyGuestToken(token);
          if (decodedGuest.roomId !== roomId) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
          }
          guest = decodedGuest;
        } catch {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      const userId = user?._id?.toString();
      const isOwner = Boolean(userId && room.ownerId.toString() === userId);
      const isMember = Boolean(userId && room.members.some((m) => m.userId?.toString() === userId));
      const isGuestMember = Boolean(
        guest?.guestId && room.members.some((m) => m.guestId === guest.guestId)
      );

      // Check banned list
      if (
        (userId && room.bannedUserIds?.some((id) => id.toString() === userId)) ||
        (user && room.bannedUsernames?.includes(user.username)) ||
        (guest && room.bannedUsernames?.includes(guest.username))
      ) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Room locks
      if ((room.settings?.locked || room.settings?.lockedByAdmin) && !isOwner && !isMember) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Private rooms strictly require ownership or membership (never admit arbitrary logged-in users)
      if (room.visibility === "PRIVATE" && !isOwner && !isMember && !isGuestMember) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Prime policy cache for this room
      roomPolicyCache.set(roomId, {
        roomSnapshot: {
          ownerId: room.ownerId,
          members: room.members,
          settings: room.settings,
          bannedUserIds: room.bannedUserIds,
          bannedUsernames: room.bannedUsernames,
          visibility: room.visibility,
        },
        cachedAt: Date.now(),
      });

      const identity = user || { guestId: guest?.guestId, username: guest?.username };
      const role = resolveRole(room, identity);

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.userRole = role;
        ws.identity = identity;
        ws.user = user || { username: guest?.username };
        ws.roomId = roomId;
        ws.fileName = fileName;
        ws.docName = rawDocName;
        wss.emit("connection", ws, request);
      });
    } catch (err) {
      logError("YJS_UPGRADE", err);
      socket.destroy();
    }
  });

  wss.on("connection", (conn, req) => {
    activeConnections.add(conn);
    conn.on("close", () => activeConnections.delete(conn));

    // Wrap message listener synchronously using cached room policy so frames are never reordered
    const origOn = conn.on.bind(conn);
    conn.on = function (event, listener) {
      if (event === "message") {
        const wrappedListener = function (data, isBinary) {
          try {
            const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
            const decoder = decoding.createDecoder(u8);
            const messageType = decoding.readVarUint(decoder);
            // messageType 0 is messageSync
            if (messageType === 0) {
              const syncType = decoding.readVarUint(decoder);
              // syncType 2 is messageYjsUpdate; syncType 1 is messageYjsSyncStep2
              if (syncType === 2 || syncType === 1) {
                const policy = getCachedRoomPolicySync(conn.roomId);
                const liveRole = policy ? resolveRole(policy, conn.identity) : conn.userRole;
                if (policy && !canEdit(liveRole, policy)) {
                  return; // Drop unauthorized mutation synchronously
                }
                if (!policy && !canEdit(conn.userRole, null)) {
                  return;
                }
              }
            }
          } catch {
            // Ignore decode failures
          }
          return listener(data, isBinary);
        };
        return origOn(event, wrappedListener);
      }
      return origOn(event, listener);
    };

    setupWSConnection(conn, req, { docName: conn.docName, gc: true });
  });

  console.log(`[yjs] Hardened collaborative editing relay attached at ${path}`);
  return wss;
}
