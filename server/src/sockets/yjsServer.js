import { WebSocketServer } from "ws";
import * as decoding from "lib0/decoding";
import { setupWSConnection, setPersistence, docs, getPersistence } from "y-websocket/bin/utils";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { verifyGuestToken } from "../utils/guestToken.js";
import { resolveRole, canEdit } from "../services/roomService.js";
import { logError } from "../utils/logger.js";

const activeConnections = new Set();
let globalWss = null;

export function disconnectYjsUser(roomId, username) {
  for (const conn of activeConnections) {
    if (conn.roomId === roomId && conn.user?.username === username) {
      conn.close(4001, "Kicked from room");
    }
  }
}

export function disconnectAllRoomYjs(roomId) {
  for (const conn of activeConnections) {
    if (conn.roomId === roomId) {
      conn.close(4000, "Room ended by host");
    }
  }
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
  if (globalWss) {
    await new Promise((resolve) => globalWss.close(() => resolve()));
  }
}

// Mongo-backed persistence layer for Yjs documents
setPersistence({
  bindState: async (docName, ydoc) => {
    try {
      const colonIdx = docName.indexOf(":");
      if (colonIdx === -1) return;
      const roomId = docName.slice(0, colonIdx);
      const fileName = docName.slice(colonIdx + 1);

      const room = await Room.findOne({ roomId });
      if (room) {
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
          const text = ydoc.getText("monaco").toString();
          await Room.updateOne(
            { roomId, "files.name": fileName },
            { $set: { "files.$.content": text, lastActiveAt: new Date() } }
          );
          lastSaveTime = Date.now();
        } catch (err) {
          logError("YJS_DEBOUNCE_SAVE", err);
        }
      };

      ydoc.on("update", () => {
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

      const text = ydoc.getText("monaco").toString();
      await Room.updateOne(
        { roomId, "files.name": fileName },
        { $set: { "files.$.content": text, lastActiveAt: new Date() } }
      );
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

      if (!/^[a-z0-9]{10}$/.test(roomId)) {
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
          if (!user || user.status === "SUSPENDED") {
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

      // Private rooms
      if (room.visibility === "PRIVATE" && !isOwner && !isMember && !userId) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Resolve role via single source of truth helper
      const role = resolveRole(room, user || guest);

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.userRole = role;
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

    // Read-only mode: check canEdit(conn.userRole, room)
    // conn.userRole determines editing rights
    const colonIdx = req.url.indexOf(":");
    // If not allowed to edit, ignore document update messages
    const role = conn.userRole;
    // We check if role is allowed to edit; if role is VIEWER or GUEST with no guest edit, ignore mutations
    const isReadOnly = role === "VIEWER" || role === "GUEST"; // GUEST edit is controlled via room.settings.allowGuestEdit in canEdit

    const origOn = conn.on.bind(conn);
    conn.on = function (event, listener) {
      if (event === "message") {
        const wrappedListener = async function (data, isBinary) {
          try {
            const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
            const decoder = decoding.createDecoder(u8);
            const messageType = decoding.readVarUint(decoder);
            // messageType 0 is messageSync
            if (messageType === 0) {
              const syncType = decoding.readVarUint(decoder);
              // syncType 2 is messageYjsUpdate; syncType 1 is messageYjsSyncStep2
              if (syncType === 2 || syncType === 1) {
                // Verify editing permission against current room settings
                const room = await Room.findOne({ roomId: conn.roomId });
                if (!canEdit(conn.userRole, room)) {
                  return; // Ignore update
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
