import { verifyToken } from "../utils/jwt.js";
import { verifyGuestToken } from "../utils/guestToken.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { logEvent, logError } from "../utils/logger.js";
import { resolveRole, canEdit, canChat } from "../services/roomService.js";
import { invalidateRoomPolicyCache } from "./yjsServer.js";
import {
  joinRoomSchema,
  heartbeatSchema,
  chatMessageSchema,
  presenceIdleSchema,
  permissionChangeSchema,
  fileCreatedSchema,
  fileDeletedSchema,
  fileRenamedSchema,
  fileLanguageSchema,
  executionStartedSchema,
  timerSyncSchema,
  voiceJoinSchema,
  voiceSignalSchema,
  voiceMuteSchema,
  voiceLeaveSchema,
  activeFileSyncSchema,
  whiteboardStrokeSchema,
  whiteboardClearSchema,
} from "../validators/socketValidators.js";

const localPresence = new Map(); // roomId -> Map(socketId -> record)

export function makePresenceStore(redisClient) {
  const key = (roomId) => `presence:${roomId}`;

  if (!redisClient) {
    return {
      async set(roomId, socketId, record) {
        if (!localPresence.has(roomId)) localPresence.set(roomId, new Map());
        localPresence.get(roomId).set(socketId, {
          ...record,
          lastSeen: record.lastSeen || Date.now(),
        });
      },
      async update(roomId, socketId, patch) {
        const room = localPresence.get(roomId);
        const existing = room?.get(socketId);
        if (!existing) return;
        Object.assign(existing, patch, { lastSeen: Date.now() });
      },
      async remove(roomId, socketId) {
        const room = localPresence.get(roomId);
        if (!room) return;
        room.delete(socketId);
        if (room.size === 0) localPresence.delete(roomId);
      },
      async list(roomId) {
        const room = localPresence.get(roomId);
        if (!room) return [];
        const now = Date.now();
        const records = [];

        for (const [sId, r] of room.entries()) {
          if (now - (r.lastSeen || 0) > 60_000) {
            room.delete(sId);
          } else {
            records.push(r);
          }
        }
        if (room.size === 0) localPresence.delete(roomId);

        return deduplicateParticipants(records);
      },
      async rawRecords(roomId) {
        const room = localPresence.get(roomId);
        return room ? Array.from(room.values()) : [];
      },
    };
  }

  return {
    async set(roomId, socketId, record) {
      const fullRecord = { ...record, lastSeen: record.lastSeen || Date.now() };
      await redisClient.hSet(key(roomId), socketId, JSON.stringify(fullRecord));
      await redisClient.expire(key(roomId), 120);
    },
    async update(roomId, socketId, patch) {
      const raw = await redisClient.hGet(key(roomId), socketId);
      if (!raw) return;
      const merged = { ...JSON.parse(raw), ...patch, lastSeen: Date.now() };
      await redisClient.hSet(key(roomId), socketId, JSON.stringify(merged));
      await redisClient.expire(key(roomId), 120);
    },
    async remove(roomId, socketId) {
      await redisClient.hDel(key(roomId), socketId);
      const remainingCount = await redisClient.hLen(key(roomId));
      if (remainingCount === 0) {
        await redisClient.del(key(roomId));
      }
    },
    async list(roomId) {
      const all = await redisClient.hGetAll(key(roomId));
      const now = Date.now();
      const records = [];
      const staleSocketIds = [];

      for (const [sId, str] of Object.entries(all)) {
        try {
          const r = JSON.parse(str);
          if (now - (r.lastSeen || 0) > 60_000) {
            staleSocketIds.push(sId);
          } else {
            records.push(r);
          }
        } catch {
          staleSocketIds.push(sId);
        }
      }

      if (staleSocketIds.length > 0) {
        await redisClient.hDel(key(roomId), ...staleSocketIds);
        const rem = await redisClient.hLen(key(roomId));
        if (rem === 0) {
          await redisClient.del(key(roomId));
        } else {
          await redisClient.expire(key(roomId), 120);
        }
      }

      return deduplicateParticipants(records);
    },
    async rawRecords(roomId) {
      const all = await redisClient.hGetAll(key(roomId));
      return Object.values(all).map((str) => JSON.parse(str));
    },
  };
}

// Deduplicates active socket records by identity (userId or guestId)
export function deduplicateParticipants(records) {
  const map = new Map();

  for (const r of records) {
    const idKey = r.userId ? `u:${r.userId}` : `g:${r.guestId || r.username}`;
    const existing = map.get(idKey);

    if (!existing) {
      map.set(idKey, {
        username: r.username,
        userId: r.userId || null,
        guestId: r.guestId || null,
        avatar: r.avatar || "",
        role: r.role || null,
        activeFile: r.activeFile || null,
        status: r.status,
        connections: 1,
      });
    } else {
      existing.connections += 1;
      if (r.avatar) existing.avatar = r.avatar;
      if (r.role) existing.role = r.role;
      if (r.activeFile) existing.activeFile = r.activeFile;
      // Best status: ONLINE beats AWAY
      if (r.status === "ONLINE") {
        existing.status = "ONLINE";
      }
    }
  }

  return Array.from(map.values());
}

function makeRateLimiter() {
  const buckets = {
    chat: { tokens: 5, max: 5, refillPerSec: 0.5, last: Date.now() },       // 5 per 10s
    files: { tokens: 10, max: 10, refillPerSec: 10 / 60, last: Date.now() }, // 10 per min
    heartbeat: { tokens: 5, max: 5, refillPerSec: 1, last: Date.now() },     // 5 per 5s
  };

  return function checkLimit(category) {
    const b = buckets[category];
    if (!b) return true;
    const now = Date.now();
    const elapsed = (now - b.last) / 1000;
    b.tokens = Math.min(b.max, b.tokens + elapsed * b.refillPerSec);
    b.last = now;
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return true;
    }
    return false;
  };
}

function safeHandler(socket, schema, fn, options = {}) {
  return async (rawPayload) => {
    try {
      if (options.rateLimit) {
        if (!socket.data.rateLimiter || !socket.data.rateLimiter(options.rateLimit)) {
          socket.emit("error-event", { error: `Rate limit exceeded for ${options.rateLimit}` });
          return;
        }
      }

      const parsed = schema.safeParse(rawPayload);
      if (!parsed.success) {
        logError("SOCKET_VALIDATION", parsed.error);
        socket.emit("error-event", {
          error: "Invalid payload",
          details: parsed.error.issues,
        });
        return;
      }

      const payload = parsed.data;

      if (options.requireInRoom) {
        if (!socket.rooms.has(payload.roomId) || socket.data.roomId !== payload.roomId) {
          socket.emit("error-event", { error: "You are not in this room" });
          return;
        }
      }

      if (options.allowedRoles) {
        const userRole = socket.data.role;
        if (!options.allowedRoles.includes(userRole)) {
          socket.emit("error-event", { error: "Permission denied for this action" });
          return;
        }
      }

      await fn(payload);
    } catch (err) {
      logError("SOCKET_HANDLER_ERROR", err);
      socket.emit("error-event", { error: err.message || "Internal socket error" });
    }
  };
}

export function registerSocketHandlers(io, redisClient = null) {
  const presence = makePresenceStore(redisClient);

  // Background sweeper every 30s to clean stale presence records for local rooms
  const sweeper = setInterval(async () => {
    try {
      for (const roomId of localPresence.keys()) {
        const participants = await presence.list(roomId);
        io.to(roomId).emit("presence-update", { participants });
      }
    } catch (err) {
      logError("PRESENCE_SWEEPER", err);
    }
  }, 30_000);
  sweeper.unref();

  // Handshake authentication middleware — accept valid user token or guest token only
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("AUTH_REQUIRED"));
    }

    try {
      const decoded = verifyToken(token);
      if (decoded.typ === "guest" || decoded.guestId) {
        socket.data.identity = {
          username: decoded.username,
          userId: null,
          guestId: decoded.guestId,
          guestRoomId: decoded.roomId,
        };
        return next();
      }

      if (decoded.sub) {
        const user = await User.findById(decoded.sub);
        if (!user || user.status === "SUSPENDED" || user.status === "BANNED") {
          return next(new Error("TOKEN_EXPIRED"));
        }
        socket.data.identity = {
          username: user.username,
          userId: user._id.toString(),
          guestId: null,
          avatar: user.avatar || "",
        };
        return next();
      }

      return next(new Error("TOKEN_EXPIRED"));
    } catch {
      try {
        const decodedGuest = verifyGuestToken(token);
        socket.data.identity = {
          username: decodedGuest.username,
          userId: null,
          guestId: decodedGuest.guestId,
          guestRoomId: decodedGuest.roomId,
        };
        return next();
      } catch {
        return next(new Error("TOKEN_EXPIRED"));
      }
    }
  });

  io.on("connection", (socket) => {
    socket.data.rateLimiter = makeRateLimiter();
    const identity = socket.data.identity;

    socket.on(
      "join-room",
      safeHandler(socket, joinRoomSchema, async ({ roomId }) => {
        if (identity.guestId && identity.guestRoomId !== roomId) {
          socket.emit("error-event", { error: "Guest token was not issued for this room" });
          return;
        }

        if (socket.data.roomId && socket.data.roomId !== roomId) {
          await handleLeave(socket, io, presence);
        }

        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-event", { error: "Room not found" });
          return;
        }

        const userId = identity.userId;
        const isOwner = Boolean(userId && room.ownerId.toString() === userId);
        const isMember = Boolean(userId && room.members.some((m) => m.userId?.toString() === userId));
        const isGuestMember = Boolean(
          identity.guestId && room.members.some((m) => m.guestId === identity.guestId)
        );

        // Check banned list
        if (
          (userId && room.bannedUserIds?.some((id) => id.toString() === userId)) ||
          room.bannedUsernames?.includes(identity.username)
        ) {
          socket.emit("error-event", { error: "You are banned from this room" });
          return;
        }

        // Room lock check
        if ((room.settings?.locked || room.settings?.lockedByAdmin) && !isOwner && !isMember) {
          socket.emit("error-event", { error: "This room is locked" });
          return;
        }

        // Access check for private rooms — require explicit ownership or membership
        if (room.visibility === "PRIVATE" && !isOwner && !isMember && !isGuestMember) {
          socket.emit("error-event", { error: "You don't have access to this room" });
          return;
        }

        const role = resolveRole(room, identity.userId ? { userId: identity.userId } : { guestId: identity.guestId });

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.role = role;

        const beforeList = await presence.list(roomId);
        const wasAlreadyPresent = beforeList.some((p) =>
          identity.userId ? p.userId === identity.userId : p.guestId === identity.guestId
        );

        await presence.set(roomId, socket.id, {
          socketId: socket.id,
          username: identity.username,
          userId: identity.userId,
          guestId: identity.guestId,
          avatar: identity.avatar || "",
          role,
          status: "ONLINE",
          lastSeen: Date.now(),
        });

        const participants = await presence.list(roomId);
        io.to(roomId).emit("presence-update", { participants });

        if (!wasAlreadyPresent) {
          socket.to(roomId).emit("chat-message", {
            system: true,
            text: `${identity.username} joined the room`,
            createdAt: new Date().toISOString(),
          });
        }

        logEvent("ROOM_SOCKET_JOIN", { roomId, username: identity.username });
      })
    );

    socket.on("leave-room", () => handleLeave(socket, io, presence));

    socket.on(
      "heartbeat",
      safeHandler(
        socket,
        heartbeatSchema,
        async ({ roomId }) => {
          await presence.update(roomId, socket.id, {});
        },
        { requireInRoom: true, rateLimit: "heartbeat" }
      )
    );

    socket.on(
      "presence-idle",
      safeHandler(
        socket,
        presenceIdleSchema,
        async ({ roomId, status }) => {
          await presence.update(roomId, socket.id, { status });
          io.to(roomId).emit("presence-update", { participants: await presence.list(roomId) });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "chat-message",
      safeHandler(
        socket,
        chatMessageSchema,
        async ({ roomId, text }) => {
          const trimmed = text.trim();
          if (!trimmed) return;

          const room = await Room.findOne({ roomId });
          if (!room) return;

          const liveRole = resolveRole(room, identity.userId ? { userId: identity.userId } : { guestId: identity.guestId });
          socket.data.role = liveRole;

          if (!canChat(liveRole, room)) {
            socket.emit("error-event", { error: "Chat is muted by the host" });
            return;
          }

          const message = await Message.create({
            roomId,
            userId: identity.userId || undefined,
            username: identity.username,
            avatar: identity.avatar || "",
            text: trimmed.slice(0, 2000),
          });

          io.to(roomId).emit("chat-message", {
            _id: message._id,
            username: message.username,
            avatar: message.avatar,
            text: message.text,
            createdAt: message.createdAt,
          });
        },
        { requireInRoom: true, rateLimit: "chat" }
      )
    );

    socket.on(
      "permission-change",
      safeHandler(
        socket,
        permissionChangeSchema,
        async ({ roomId, targetUsername, role }) => {
          if (socket.data.role !== "HOST") {
            socket.emit("error-event", { error: "Only the room host can change permissions" });
            return;
          }

          const room = await Room.findOne({ roomId });
          if (!room) return;
          const member = room.members.find((m) => m.username === targetUsername);
          if (!member) return;
          member.role = role;
          await room.save();
          invalidateRoomPolicyCache(roomId);

          // Update live socket role and presence records for target user
          const roomSockets = await io.in(roomId).fetchSockets();
          for (const s of roomSockets) {
            if (s.data?.identity?.username === targetUsername) {
              s.data.role = role;
              await presence.update(roomId, s.id, { role });
            }
          }

          io.to(roomId).emit("permission-change", { targetUsername, role });
          io.to(roomId).emit("presence-update", { participants: await presence.list(roomId) });
          logEvent("ROOM_PERMISSION_CHANGE", { roomId, targetUsername, role, changedBy: identity.username });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "file-created",
      safeHandler(
        socket,
        fileCreatedSchema,
        async ({ roomId, file }) => {
          const room = await Room.findOne({ roomId });
          if (!room) return;
          if (!canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          if (room.files.some((f) => f.name === file.name)) {
            socket.emit("error-event", { error: "A file with this name already exists" });
            return;
          }
          room.files.push({ name: file.name, content: file.content || "", language: file.language || "javascript" });
          room.lastActiveAt = new Date();
          await room.save();
          invalidateRoomPolicyCache(roomId);
          socket.to(roomId).emit("file-created", { file });
        },
        { requireInRoom: true, rateLimit: "files" }
      )
    );

    socket.on(
      "file-deleted",
      safeHandler(
        socket,
        fileDeletedSchema,
        async ({ roomId, fileName }) => {
          const room = await Room.findOne({ roomId });
          if (!room) return;
          if (!canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          if (room.files.length <= 1) {
            socket.emit("error-event", { error: "A room must have at least one file" });
            return;
          }
          room.files = room.files.filter((f) => f.name !== fileName);
          await room.save();
          invalidateRoomPolicyCache(roomId);
          socket.to(roomId).emit("file-deleted", { fileName });
        },
        { requireInRoom: true, rateLimit: "files" }
      )
    );

    socket.on(
      "file-renamed",
      safeHandler(
        socket,
        fileRenamedSchema,
        async ({ roomId, oldName, newName }) => {
          const room = await Room.findOne({ roomId });
          if (!room) return;
          if (!canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          const file = room.files.find((f) => f.name === oldName);
          if (!file) return;
          if (room.files.some((f) => f.name === newName)) {
            socket.emit("error-event", { error: "A file with this name already exists" });
            return;
          }
          file.name = newName;
          await room.save();
          invalidateRoomPolicyCache(roomId);
          socket.to(roomId).emit("file-renamed", { oldName, newName });
        },
        { requireInRoom: true, rateLimit: "files" }
      )
    );

    socket.on(
      "file-language-change",
      safeHandler(
        socket,
        fileLanguageSchema,
        async ({ roomId, fileName, language }) => {
          const room = await Room.findOne({ roomId });
          if (!room) return;
          if (!canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          const file = room.files.find((f) => f.name === fileName);
          if (!file) return;
          file.language = language;
          await room.save();
          io.to(roomId).emit("file-language-changed", { fileName, language });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "execution-started",
      safeHandler(
        socket,
        executionStartedSchema,
        async ({ roomId }) => {
          const room = await Room.findOne({ roomId });
          if (!room || !canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          socket.to(roomId).emit("execution-started");
        },
        { requireInRoom: true }
      )
    );

    // Authoritative Interview Timer Sync (HOST-only control, persisted for late joiners)
    socket.on(
      "timer-sync",
      safeHandler(
        socket,
        timerSyncSchema,
        async ({ roomId, mode, durationSeconds, remainingSeconds, seconds, isRunning }) => {
          if (socket.data.role !== "HOST") {
            socket.emit("error-event", { error: "Only the room host can control the interview timer" });
            return;
          }

          const resolvedMode = mode || "stopwatch";
          const resolvedRemaining = remainingSeconds ?? seconds ?? 0;
          const resolvedDuration = durationSeconds ?? resolvedRemaining;
          const now = new Date();

          await Room.updateOne(
            { roomId },
            {
              $set: {
                timerState: {
                  mode: resolvedMode,
                  durationSeconds: resolvedDuration,
                  remainingSeconds: resolvedRemaining,
                  isRunning,
                  updatedAt: now,
                },
              },
            }
          );

          socket.to(roomId).emit("timer-synced", {
            mode: resolvedMode,
            durationSeconds: resolvedDuration,
            remainingSeconds: resolvedRemaining,
            seconds: resolvedRemaining,
            isRunning,
            updatedAt: now.toISOString(),
            updatedBy: socket.data.identity?.username || "Host",
          });
        },
        { requireInRoom: true }
      )
    );

    // WebRTC Voice Mesh Signaling
    socket.on(
      "voice-join",
      safeHandler(
        socket,
        voiceJoinSchema,
        async ({ roomId }) => {
          socket.to(roomId).emit("user-joined-voice", {
            socketId: socket.id,
            username: socket.data.identity?.username || "Guest",
          });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "voice-signal",
      safeHandler(
        socket,
        voiceSignalSchema,
        async ({ roomId, targetSocketId, signal }) => {
          // Verify targetSocketId is actually a member of this room before relaying WebRTC signaling
          const roomSockets = await io.in(roomId).fetchSockets();
          const targetInRoom = roomSockets.some((s) => s.id === targetSocketId);
          if (!targetInRoom) {
            socket.emit("error-event", { error: "Voice signaling target is not in this room" });
            return;
          }

          io.to(targetSocketId).emit("voice-signal", {
            senderSocketId: socket.id,
            signal,
            username: socket.data.identity?.username || "Guest",
          });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "voice-mute",
      safeHandler(
        socket,
        voiceMuteSchema,
        async ({ roomId, isMuted }) => {
          socket.to(roomId).emit("user-voice-mute", {
            socketId: socket.id,
            username: socket.data.identity?.username || "Guest",
            isMuted,
          });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "voice-leave",
      safeHandler(
        socket,
        voiceLeaveSchema,
        async ({ roomId }) => {
          socket.to(roomId).emit("user-left-voice", {
            socketId: socket.id,
          });
        },
        { requireInRoom: true }
      )
    );

    // Follow-mode active file tracking
    socket.on(
      "active-file-sync",
      safeHandler(
        socket,
        activeFileSyncSchema,
        async ({ roomId, fileName }) => {
          await presence.update(roomId, socket.id, { activeFile: fileName });
          const participants = await presence.list(roomId);
          io.to(roomId).emit("presence-update", { participants });
          socket.to(roomId).emit("participant-file-changed", {
            username: socket.data.identity?.username,
            fileName,
          });
        },
        { requireInRoom: true }
      )
    );

    // Collaborative Whiteboard strokes & clear
    socket.on(
      "whiteboard-stroke",
      safeHandler(
        socket,
        whiteboardStrokeSchema,
        async ({ roomId, stroke }) => {
          const room = await Room.findOne({ roomId });
          if (!room || !canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          const fullStroke = {
            ...stroke,
            username: socket.data.identity?.username || "User",
          };
          await Room.updateOne(
            { roomId },
            {
              $push: { whiteboardStrokes: { $each: [fullStroke], $slice: -1500 } },
              $set: { lastActiveAt: new Date() },
            }
          );
          socket.to(roomId).emit("whiteboard-stroke", { stroke: fullStroke });
        },
        { requireInRoom: true }
      )
    );

    socket.on(
      "whiteboard-clear",
      safeHandler(
        socket,
        whiteboardClearSchema,
        async ({ roomId }) => {
          const room = await Room.findOne({ roomId });
          if (!room || !canEdit(socket.data.role, room)) {
            socket.emit("error-event", { error: "Permission denied for this action" });
            return;
          }
          await Room.updateOne(
            { roomId },
            { $set: { whiteboardStrokes: [], lastActiveAt: new Date() } }
          );
          socket.to(roomId).emit("whiteboard-cleared", {
            clearedBy: socket.data.identity?.username || "User",
          });
        },
        { requireInRoom: true }
      )
    );

    socket.on("disconnect", () => handleLeave(socket, io, presence));
  });
}

async function handleLeave(socket, io, presence) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const identity = socket.data.identity;
  socket.data.roomId = null;
  socket.data.role = null;

  await presence.remove(roomId, socket.id);
  io.to(roomId).emit("user-left-voice", { socketId: socket.id });
  const remaining = await presence.list(roomId);
  io.to(roomId).emit("presence-update", { participants: remaining });

  const stillInRoom = remaining.some((p) =>
    identity?.userId ? p.userId === identity.userId : p.guestId === identity?.guestId
  );

  if (!stillInRoom && identity) {
    socket.to(roomId).emit("chat-message", {
      system: true,
      text: `${identity.username} left the room`,
      createdAt: new Date().toISOString(),
    });
  }

  socket.leave(roomId);
}
