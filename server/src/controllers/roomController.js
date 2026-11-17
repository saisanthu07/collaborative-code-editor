import crypto from "crypto";
import mongoose from "mongoose";
import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { createRoom, addMemberIfNeeded, generateGuestName } from "../services/roomService.js";
import { runCode } from "../services/executionService.js";
import Execution from "../models/Execution.js";
import { logEvent } from "../utils/logger.js";
import { disconnectYjsUser, disconnectAllRoomYjs } from "../sockets/yjsServer.js";
import { signGuestToken, verifyGuestToken } from "../utils/guestToken.js";

export async function create(req, res, next) {
  try {
    const room = await createRoom(req.user, req.body);
    logEvent("ROOM_CREATE", { userId: req.user._id.toString(), roomId: room.roomId });
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export async function createInstant(req, res, next) {
  try {
    const language = req.body?.language || "javascript";
    const user = req.user;

    let room;
    let guestToken = null;
    let username = null;

    if (user) {
      room = await createRoom(user, {
        name: `Instant Playground`,
        description: `Collaborative session created on ${new Date().toLocaleDateString()}`,
        language,
        visibility: "PUBLIC",
      });
      username = user.username;
    } else {
      const guestId = crypto.randomBytes(8).toString("hex");
      username = generateGuestName();
      const mockOwnerId = new mongoose.Types.ObjectId();

      const defaultCode =
        language === "python"
          ? `# Instant Collaborative Python Playground\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n`
          : language === "cpp"
          ? `// Instant Collaborative C++ Playground\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from CodeTogether!" << std::endl;\n    return 0;\n}\n`
          : `// Instant Collaborative JavaScript Playground\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`;

      const initialFileName =
        language === "python" ? "main.py" : language === "cpp" ? "main.cpp" : "index.js";

      room = await Room.create({
        name: `Instant Playground`,
        description: `Temporary collaborative playground`,
        language,
        visibility: "PUBLIC",
        ownerId: mockOwnerId,
        files: [
          {
            name: initialFileName,
            content: defaultCode,
            language,
          },
        ],
        members: [
          {
            guestId,
            username,
            role: "HOST",
            isGuest: true,
          },
        ],
        settings: {
          allowGuestEdit: true,
          defaultRole: "EDITOR",
        },
      });

      guestToken = signGuestToken({ roomId: room.roomId, guestId, username });
    }

    logEvent("ROOM_INSTANT_CREATE", { roomId: room.roomId, username });
    res.status(201).json({ room, guestToken, username });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const selectFields =
      "name description roomId language visibility lastActiveAt members.username members.role settings.locked ownerId starredBy";

    const [ownedDocs, memberOfRaw, starredDocs] = await Promise.all([
      Room.find({ ownerId: userId })
        .select(selectFields)
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .lean(),
      Room.find({
        "members.userId": userId,
      })
        .select(selectFields)
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .lean(),
      Room.find({ starredBy: userId })
        .select(selectFields)
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const memberOfDocs = memberOfRaw.filter(
      (doc) => doc.ownerId?.toString() !== userId.toString()
    );

    const formatRoom = (doc) => {
      const isStarred = Boolean(
        doc.starredBy && doc.starredBy.some((id) => id.toString() === userId.toString())
      );
      const memberCount = doc.members ? doc.members.length : 0;
      const { starredBy, ...rest } = doc;
      return {
        ...rest,
        memberCount,
        isStarred,
      };
    };

    const owned = ownedDocs.map(formatRoom);
    const memberOf = memberOfDocs.map(formatRoom);
    const starred = starredDocs.map(formatRoom);

    res.json({ owned, memberOf, starred });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res) {
  if (!req.user) {
    const roomObj = req.room.toObject ? req.room.toObject() : { ...req.room };
    delete roomObj.starredBy;
    delete roomObj.ownerId;
    if (Array.isArray(roomObj.members)) {
      roomObj.members = roomObj.members.map((m) => ({
        username: m.username,
        role: m.role,
        isGuest: m.isGuest,
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt,
      }));
    }
    return res.json({ room: roomObj });
  }
  res.json({ room: req.room });
}

export async function update(req, res, next) {
  try {
    const $set = {};
    if (req.body.name !== undefined) $set.name = req.body.name;
    if (req.body.description !== undefined) $set.description = req.body.description;
    if (req.body.visibility !== undefined) $set.visibility = req.body.visibility;
    if (req.body.language !== undefined) $set.language = req.body.language;
    if (req.body.settings) {
      if (req.body.settings.allowGuestEdit !== undefined) $set["settings.allowGuestEdit"] = req.body.settings.allowGuestEdit;
      if (req.body.settings.defaultRole !== undefined) $set["settings.defaultRole"] = req.body.settings.defaultRole;
      if (req.body.settings.locked !== undefined) $set["settings.locked"] = req.body.settings.locked;
      if (req.body.settings.chatMuted !== undefined) $set["settings.chatMuted"] = req.body.settings.chatMuted;
      // settings.lockedByAdmin is never writable by host
    }

    const room = await Room.findOneAndUpdate(
      { roomId: req.room.roomId },
      { $set },
      { new: true }
    );

    if (req.body.settings?.locked !== undefined) {
      req.app.get("io")?.to(req.room.roomId).emit("room-locked", { locked: req.body.settings.locked });
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const roomId = req.room.roomId;

    // Broadcast room-ended event to notify all connected clients
    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("room-ended", {
        message: "The host has ended this collaborative session",
      });
      const sockets = await io.in(roomId).fetchSockets();
      for (const s of sockets) {
        s.leave(roomId);
      }
    }

    disconnectAllRoomYjs(roomId);

    await req.room.deleteOne();
    logEvent("ROOM_DELETE", { userId: req.user._id.toString(), roomId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function leave(req, res, next) {
  try {
    const roomId = req.room.roomId;
    const userId = req.user?._id;
    const username = req.user?.username || req.body?.username;

    // If an authenticated member leaves, remove them from room members
    if (userId) {
      req.room.members = req.room.members.filter(
        (m) => m.userId?.toString() !== userId.toString()
      );
      await req.room.save();
    }

    logEvent("ROOM_LEAVE_MEMBER", { roomId, userId: userId?.toString(), username });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function join(req, res, next) {
  try {
    const roomId = req.room.roomId;
    if (req.room.settings?.locked || req.room.settings?.lockedByAdmin) {
      return res.status(403).json({ error: "This room is locked" });
    }

    if (req.user) {
      const username = req.user.username;
      const isOwner = req.room.ownerId.toString() === req.user._id.toString();
      const role = isOwner ? "HOST" : (req.room.settings?.defaultRole || "EDITOR");

      const existingMember = req.room.members.find(
        (m) => m.userId && m.userId.toString() === req.user._id.toString()
      );

      if (existingMember) {
        await Room.updateOne(
          { roomId, "members.userId": req.user._id },
          { $set: { "members.$.lastActiveAt": new Date(), "members.$.isGuest": false } }
        );
      } else {
        await Room.updateOne(
          { roomId, "members.userId": { $ne: req.user._id } },
          {
            $push: {
              members: {
                userId: req.user._id,
                username,
                isGuest: false,
                role,
                joinedAt: new Date(),
                lastActiveAt: new Date(),
              },
            },
          }
        );
      }

      const freshRoom = await Room.findOne({ roomId });
      logEvent("ROOM_JOIN", { roomId, username, userId: req.user._id.toString() });
      return res.json({ room: freshRoom, username, guestId: null, guestToken: null });
    }

    // Unauthenticated guest join
    const guestTokenHeader = req.headers["x-guest-token"];
    let guestId = null;
    let username = null;
    let tokenMatchesRoom = false;

    if (guestTokenHeader) {
      try {
        const decoded = verifyGuestToken(guestTokenHeader);
        if (decoded.roomId === roomId && decoded.guestId && decoded.username) {
          guestId = decoded.guestId;
          username = decoded.username;
          tokenMatchesRoom = true;
        }
      } catch {
        // Invalid or expired token: fall through to generating a new guest
      }
    }

    const now = new Date();
    const guestTtlHours = Number(process.env.GUEST_TOKEN_TTL_HOURS) || 24;
    const maxGuests = Number(process.env.MAX_GUESTS_PER_ROOM) || 50;
    const expiredCutoff = new Date(now.getTime() - guestTtlHours * 60 * 60 * 1000);

    // Clean up stale guests older than 24h
    await Room.updateOne(
      { roomId },
      {
        $pull: {
          members: {
            guestId: { $exists: true, $ne: null },
            lastActiveAt: { $lt: expiredCutoff },
          },
        },
      }
    );

    let freshRoom = await Room.findOne({ roomId });

    // If existing guestToken matches, refresh and reuse
    if (tokenMatchesRoom && guestId) {
      const existing = freshRoom.members.find((m) => m.guestId === guestId);
      if (existing) {
        await Room.updateOne(
          { roomId, "members.guestId": guestId },
          { $set: { "members.$.lastActiveAt": now } }
        );
        freshRoom = await Room.findOne({ roomId });
        const guestToken = signGuestToken({ guestId, username, roomId });
        logEvent("ROOM_JOIN_GUEST_REUSED", { roomId, guestId, username });
        return res.json({ room: freshRoom, username, guestId, guestToken });
      }
    }

    // New guest join: check 50 guest cap
    const currentGuests = freshRoom.members.filter((m) => Boolean(m.guestId));
    if (currentGuests.length >= maxGuests) {
      return res.status(429).json({ error: "Room is full for guests" });
    }

    guestId = crypto.randomBytes(16).toString("hex");
    username = generateGuestName(freshRoom.members);

    await Room.updateOne(
      { roomId, "members.guestId": { $ne: guestId } },
      {
        $push: {
          members: {
            guestId,
            username,
            isGuest: true,
            role: "GUEST",
            joinedAt: now,
            lastActiveAt: now,
          },
        },
      }
    );

    const guestToken = signGuestToken({ guestId, username, roomId });
    freshRoom = await Room.findOne({ roomId });
    logEvent("ROOM_JOIN_GUEST", { roomId, guestId, username });
    return res.json({ room: freshRoom, username, guestId, guestToken });
  } catch (err) {
    next(err);
  }
}

export async function star(req, res, next) {
  try {
    const idx = req.room.starredBy.findIndex((id) => id.toString() === req.user._id.toString());
    if (idx === -1) {
      req.room.starredBy.push(req.user._id);
    } else {
      req.room.starredBy.splice(idx, 1);
    }
    await req.room.save();
    res.json({ starred: idx === -1 });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before;

    const query = { roomId: req.room.roomId };
    if (before) {
      query._id = { $lt: before };
    }

    const docs = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const paged = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore && paged.length > 0 ? paged[paged.length - 1]._id.toString() : null;

    paged.reverse();

    res.json({
      messages: paged,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
}

export async function execute(req, res, next) {
  try {
    const { language, sourceCode, stdin } = req.body;
    logEvent("EXEC_REQUEST", { roomId: req.room.roomId, userId: req.user?._id?.toString(), language });

    const result = await runCode({ language, sourceCode, stdin });

    await Execution.create({
      roomId: req.room.roomId,
      userId: req.user?._id,
      language,
      sourceCode,
      stdin,
      ...result,
    });

    // Server broadcasts execution results directly to room sockets
    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("execution-completed", { result });
    }

    res.json({ result });
  } catch (err) {
    logEvent("EXEC_FAILURE", { roomId: req.room?.roomId, error: err.message });
    next(err);
  }
}

// --- File management ---

export async function listFiles(req, res) {
  res.json({ files: req.room.files });
}

export async function createFile(req, res, next) {
  try {
    const { name, content, language } = req.body;
    if (req.room.files.some((f) => f.name === name)) {
      return res.status(409).json({ error: "A file with this name already exists" });
    }
    const file = { name, content: content || "", language: language || "javascript" };
    req.room.files.push(file);
    req.room.lastActiveAt = new Date();
    await req.room.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("file-created", { file });
    }

    logEvent("ROOM_FILE_CREATE", { roomId: req.room.roomId, name });
    res.status(201).json({ files: req.room.files });
  } catch (err) {
    next(err);
  }
}

export async function saveFile(req, res, next) {
  try {
    const file = req.room.files.find((f) => f.name === req.params.fileName);
    if (!file) return res.status(404).json({ error: "File not found" });
    if (req.body.content !== undefined) file.content = req.body.content;
    if (req.body.language !== undefined) {
      file.language = req.body.language;
      req.app.get("io")?.to(req.room.roomId).emit("file-language-changed", {
        fileName: file.name,
        language: file.language,
      });
    }
    req.room.lastActiveAt = new Date();
    await req.room.save();
    res.json({ file });
  } catch (err) {
    next(err);
  }
}

export async function renameFile(req, res, next) {
  try {
    const file = req.room.files.find((f) => f.name === req.params.fileName);
    if (!file) return res.status(404).json({ error: "File not found" });
    if (req.room.files.some((f) => f.name === req.body.newName)) {
      return res.status(409).json({ error: "A file with this name already exists" });
    }
    const oldName = req.params.fileName;
    file.name = req.body.newName;
    await req.room.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("file-renamed", { oldName, newName: req.body.newName });
    }

    logEvent("ROOM_FILE_RENAME", { roomId: req.room.roomId, from: oldName, to: req.body.newName });
    res.json({ files: req.room.files });
  } catch (err) {
    next(err);
  }
}

export async function deleteFile(req, res, next) {
  try {
    if (req.room.files.length <= 1) {
      return res.status(400).json({ error: "A room must have at least one file" });
    }
    req.room.files = req.room.files.filter((f) => f.name !== req.params.fileName);
    await req.room.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("file-deleted", { fileName: req.params.fileName });
    }

    logEvent("ROOM_FILE_DELETE", { roomId: req.room.roomId, name: req.params.fileName });
    res.json({ files: req.room.files });
  } catch (err) {
    next(err);
  }
}

// --- Host permission management ---

export async function changeMemberPermission(req, res, next) {
  try {
    const { targetUsername, role } = req.body;
    const member = req.room.members.find((m) => m.username === targetUsername);
    if (!member) return res.status(404).json({ error: "Member not found in this room" });
    member.role = role;
    await req.room.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("permission-change", { targetUsername, role });
    }

    logEvent("ROOM_PERMISSION_CHANGE", { roomId: req.room.roomId, targetUsername, role, changedBy: req.user.username });
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const member = req.room.members.find((m) => m.username === req.params.username);
    if (member?.userId) {
      if (!req.room.bannedUserIds) req.room.bannedUserIds = [];
      if (!req.room.bannedUserIds.some((id) => id.toString() === member.userId.toString())) {
        req.room.bannedUserIds.push(member.userId);
      }
    }
    if (!req.room.bannedUsernames) req.room.bannedUsernames = [];
    if (!req.room.bannedUsernames.includes(req.params.username)) {
      req.room.bannedUsernames.push(req.params.username);
    }
    req.room.members = req.room.members.filter((m) => m.username !== req.params.username);
    await req.room.save();

    const io = req.app.get("io");
    if (io) {
      const sockets = await io.in(req.room.roomId).fetchSockets();
      for (const s of sockets) {
        if (s.data?.identity?.username === req.params.username) {
          s.emit("error-event", { error: "You were kicked from this room" });
          s.disconnect(true);
        }
      }
    }

    disconnectYjsUser(req.room.roomId, req.params.username);

    logEvent("ROOM_MEMBER_REMOVE", { roomId: req.room.roomId, username: req.params.username });
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}
