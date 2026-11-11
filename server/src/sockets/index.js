import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { logEvent } from "../utils/logger.js";

// Presence storage: when Redis is available (multi-instance deployments),
// presence lives in Redis so every node sees the same participant list.
// Otherwise it falls back to an in-memory Map, fine for a single instance.
const localPresence = new Map(); // roomId -> Map(socketId -> presenceRecord)

function makePresenceStore(redisClient) {
  const key = (roomId) => `presence:${roomId}`;

  if (!redisClient) {
    return {
      async set(roomId, socketId, record) {
        if (!localPresence.has(roomId)) localPresence.set(roomId, new Map());
        localPresence.get(roomId).set(socketId, record);
      },
      async update(roomId, socketId, patch) {
        const existing = localPresence.get(roomId)?.get(socketId);
        if (!existing) return;
        Object.assign(existing, patch);
      },
      async remove(roomId, socketId) {
        const room = localPresence.get(roomId);
        if (!room) return;
        room.delete(socketId);
        if (room.size === 0) localPresence.delete(roomId);
      },
      async list(roomId) {
        return Array.from(localPresence.get(roomId)?.values() || []);
      },
    };
  }

  return {
    async set(roomId, socketId, record) {
      await redisClient.hSet(key(roomId), socketId, JSON.stringify(record));
    },
    async update(roomId, socketId, patch) {
      const raw = await redisClient.hGet(key(roomId), socketId);
      if (!raw) return;
      const merged = { ...JSON.parse(raw), ...patch };
      await redisClient.hSet(key(roomId), socketId, JSON.stringify(merged));
    },
    async remove(roomId, socketId) {
      await redisClient.hDel(key(roomId), socketId);
    },
    async list(roomId) {
      const all = await redisClient.hGetAll(key(roomId));
      return Object.values(all).map((v) => JSON.parse(v));
    },
  };
}

async function resolveIdentity(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return { username: socket.handshake.auth?.guestName || "Guest", userId: null };
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (user) return { username: user.username, userId: user._id.toString() };
  } catch {
    // fall through to guest identity
  }
  return { username: socket.handshake.auth?.guestName || "Guest", userId: null };
}

async function isRoomHost(roomId, userId) {
  if (!userId) return false;
  const room = await Room.findOne({ roomId }, { ownerId: 1 });
  return Boolean(room && room.ownerId.toString() === userId);
}

// redisClient: an already-connected node-redis client, or null to use
// in-memory presence (see config/redis.js).
export function registerSocketHandlers(io, redisClient = null) {
  const presence = makePresenceStore(redisClient);

  io.on("connection", async (socket) => {
    const identity = await resolveIdentity(socket);
    socket.data.identity = identity;

    socket.on("join-room", async ({ roomId }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;

      await presence.set(roomId, socket.id, {
        socketId: socket.id,
        username: identity.username,
        userId: identity.userId,
        status: "ONLINE",
        cursor: null,
      });

      io.to(roomId).emit("presence-update", { participants: await presence.list(roomId) });

      socket.to(roomId).emit("chat-message", {
        system: true,
        text: `${identity.username} joined the room`,
        createdAt: new Date().toISOString(),
      });

      logEvent("ROOM_SOCKET_JOIN", { roomId, username: identity.username });
    });

    socket.on("leave-room", () => handleLeave(socket, io, presence));

    socket.on("cursor-update", async ({ roomId, cursor }) => {
      await presence.update(roomId, socket.id, { cursor });
      socket.to(roomId).emit("cursor-update", { socketId: socket.id, username: identity.username, cursor });
    });

    socket.on("presence-idle", async ({ roomId, status }) => {
      await presence.update(roomId, socket.id, { status });
      io.to(roomId).emit("presence-update", { participants: await presence.list(roomId) });
    });

    socket.on("chat-message", async ({ roomId, text }) => {
      if (!text || !text.trim()) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.settings?.chatMuted) return;

      const message = await Message.create({
        roomId,
        userId: identity.userId || undefined,
        username: identity.username,
        text: text.slice(0, 2000),
      });

      io.to(roomId).emit("chat-message", {
        _id: message._id,
        username: message.username,
        text: message.text,
        createdAt: message.createdAt,
      });
    });

    // Host-only: server re-checks ownership before applying a role change,
    // rather than trusting the client's claim that it's allowed to do this.
    socket.on("permission-change", async ({ roomId, targetUsername, role }) => {
      const allowedRoles = ["EDITOR", "VIEWER", "GUEST"];
      if (!allowedRoles.includes(role)) return;

      const hostOk = await isRoomHost(roomId, identity.userId);
      if (!hostOk) {
        socket.emit("permission-denied", { reason: "Only the room host can change permissions" });
        return;
      }

      const room = await Room.findOne({ roomId });
      if (!room) return;
      const member = room.members.find((m) => m.username === targetUsername);
      if (!member) return;
      member.role = role;
      await room.save();

      io.to(roomId).emit("permission-change", { targetUsername, role });
      logEvent("ROOM_PERMISSION_CHANGE", { roomId, targetUsername, role, changedBy: identity.username });
    });

    // File events: broadcast for live UI sync AND persist to the room's
    // file list so reloading/rejoining doesn't lose the file tree.
    socket.on("file-created", async ({ roomId, file }) => {
      if (!file?.name) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.files.some((f) => f.name === file.name)) return; // avoid duplicates
      room.files.push({ name: file.name, content: file.content || "", language: file.language || "javascript" });
      room.lastActiveAt = new Date();
      await room.save();
      socket.to(roomId).emit("file-created", { file });
    });

    socket.on("file-deleted", async ({ roomId, fileName }) => {
      const room = await Room.findOne({ roomId });
      if (!room) return;
      room.files = room.files.filter((f) => f.name !== fileName);
      await room.save();
      socket.to(roomId).emit("file-deleted", { fileName });
    });

    socket.on("file-renamed", async ({ roomId, oldName, newName }) => {
      if (!newName) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      const file = room.files.find((f) => f.name === oldName);
      if (!file) return;
      file.name = newName;
      await room.save();
      socket.to(roomId).emit("file-renamed", { oldName, newName });
    });

    socket.on("execution-started", ({ roomId }) => socket.to(roomId).emit("execution-started"));
    socket.on("execution-completed", ({ roomId, result }) =>
      socket.to(roomId).emit("execution-completed", { result })
    );

    socket.on("disconnect", () => handleLeave(socket, io, presence));
  });
}

async function handleLeave(socket, io, presence) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  await presence.remove(roomId, socket.id);
  const remaining = await presence.list(roomId);
  io.to(roomId).emit("presence-update", { participants: remaining });
  socket.to(roomId).emit("chat-message", {
    system: true,
    text: `${socket.data.identity?.username || "Someone"} left the room`,
    createdAt: new Date().toISOString(),
  });
  socket.leave(roomId);
}
