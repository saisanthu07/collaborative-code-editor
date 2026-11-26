import crypto from "crypto";
import mongoose from "mongoose";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Execution from "../models/Execution.js";
import DocRevision from "../models/DocRevision.js";
import CodeComment from "../models/CodeComment.js";
import {
  createRoom,
  generateGuestName,
  generateInviteCode,
  hasValidInviteCode,
} from "../services/roomService.js";
import { runCode, runCodeBatch } from "../services/executionService.js";
import { logEvent } from "../utils/logger.js";
import {
  disconnectYjsUser,
  disconnectAllRoomYjs,
  invalidateRoomPolicyCache,
  migrateYjsDoc,
  deleteYjsDoc,
  deleteRoomYjsDocs,
  restoreYjsDocContent,
} from "../sockets/yjsServer.js";
import { signGuestToken, verifyGuestToken } from "../utils/guestToken.js";

function sanitizeRoomForGuest(roomDoc) {
  const roomObj = roomDoc.toObject ? roomDoc.toObject() : { ...roomDoc };
  delete roomObj.starredBy;
  delete roomObj.ownerId;
  delete roomObj.inviteCode;
  delete roomObj.scorecard;
  if (Array.isArray(roomObj.members)) {
    roomObj.members = roomObj.members.map((m) => ({
      username: m.username,
      role: m.role,
      isGuest: m.isGuest,
      joinedAt: m.joinedAt,
      lastActiveAt: m.lastActiveAt,
    }));
  }
  return roomObj;
}

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
        name: "Instant Playground",
        description: `Collaborative session created on ${new Date().toLocaleDateString()}`,
        language,
        visibility: "PUBLIC",
      });
      username = user.username;
    } else {
      const guestId = crypto.randomBytes(8).toString("hex");
      username = generateGuestName();
      const mockOwnerId = new mongoose.Types.ObjectId();
      const guestTtlHours = Number(process.env.GUEST_TOKEN_TTL_HOURS) || 24;
      const expiresAt = new Date(Date.now() + guestTtlHours * 60 * 60 * 1000);

      const defaultCode =
        language === "python"
          ? `# Instant Collaborative Python Playground\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n`
          : language === "cpp"
          ? `// Instant Collaborative C++ Playground\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from CodeTogether!" << std::endl;\n    return 0;\n}\n`
          : `// Instant Collaborative JavaScript Playground\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`;

      const initialFileName =
        language === "python" ? "main.py" : language === "cpp" ? "main.cpp" : "index.js";

      room = await Room.create({
        name: "Instant Playground",
        description: "Temporary collaborative playground",
        language,
        visibility: "PUBLIC",
        ownerId: mockOwnerId,
        expiresAt,
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

    res.json({
      owned: ownedDocs.map(formatRoom),
      memberOf: memberOfDocs.map(formatRoom),
      starred: starredDocs.map(formatRoom),
    });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res) {
  if (!req.user) {
    return res.json({ room: sanitizeRoomForGuest(req.room) });
  }
  const roomObj = req.room.toObject ? req.room.toObject() : { ...req.room };
  if (!req.isRoomOwner) {
    delete roomObj.inviteCode;
    delete roomObj.scorecard;
  }
  res.json({ room: roomObj });
}

export async function update(req, res, next) {
  try {
    const $set = {};
    if (req.body.name !== undefined) $set.name = req.body.name;
    if (req.body.description !== undefined) $set.description = req.body.description;
    if (req.body.visibility !== undefined) {
      $set.visibility = req.body.visibility;
      if (req.body.visibility === "PRIVATE" && !req.room.inviteCode) {
        $set.inviteCode = generateInviteCode();
      }
    }
    if (req.body.language !== undefined) $set.language = req.body.language;
    if (req.body.settings) {
      if (req.body.settings.allowGuestEdit !== undefined)
        $set["settings.allowGuestEdit"] = req.body.settings.allowGuestEdit;
      if (req.body.settings.defaultRole !== undefined)
        $set["settings.defaultRole"] = req.body.settings.defaultRole;
      if (req.body.settings.locked !== undefined)
        $set["settings.locked"] = req.body.settings.locked;
      if (req.body.settings.chatMuted !== undefined)
        $set["settings.chatMuted"] = req.body.settings.chatMuted;
    }

    const room = await Room.findOneAndUpdate(
      { roomId: req.room.roomId },
      { $set },
      { new: true }
    );
    invalidateRoomPolicyCache(req.room.roomId);

    const io = req.app.get("io");
    if (io) {
      if (req.body.settings?.locked !== undefined) {
        io.to(req.room.roomId).emit("room-locked", { locked: req.body.settings.locked });
      }
      io.to(req.room.roomId).emit("room-settings-updated", {
        visibility: room.visibility,
        settings: room.settings,
      });
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function rotateInvite(req, res, next) {
  try {
    const inviteCode = generateInviteCode();
    const room = await Room.findOneAndUpdate(
      { roomId: req.room.roomId },
      { $set: { inviteCode } },
      { new: true }
    );
    logEvent("ROOM_INVITE_ROTATE", { roomId: req.room.roomId, userId: req.user._id.toString() });
    res.json({ inviteCode: room.inviteCode });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const roomId = req.room.roomId;

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
    await deleteRoomYjsDocs(roomId);
    await Promise.all([
      Message.deleteMany({ roomId }),
      DocRevision.deleteMany({ roomId }),
      CodeComment.deleteMany({ roomId }),
    ]);
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

    if (userId) {
      req.room.members = req.room.members.filter(
        (m) => m.userId?.toString() !== userId.toString()
      );
      await req.room.save();
      invalidateRoomPolicyCache(roomId);
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
    if (req.room.settings?.lockedByAdmin) {
      return res.status(403).json({ error: "Room is locked by an administrator" });
    }
    if (req.room.settings?.locked && !req.isRoomOwner) {
      return res.status(403).json({ error: "This room is locked" });
    }

    if (req.user) {
      const username = req.user.username;
      const isOwner = req.room.ownerId.toString() === req.user._id.toString();
      const existingMember = req.room.members.find(
        (m) => m.userId && m.userId.toString() === req.user._id.toString()
      );

      if (req.room.visibility === "PRIVATE" && !isOwner && !existingMember) {
        const suppliedInvite =
          req.body?.inviteCode || req.query?.invite || req.headers["x-invite-code"];
        if (!hasValidInviteCode(req.room, suppliedInvite)) {
          return res.status(403).json({ error: "Private room requires a valid invite link" });
        }
      }

      const role = isOwner ? "HOST" : req.room.settings?.defaultRole || "EDITOR";

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

      invalidateRoomPolicyCache(roomId);
      const freshRoom = await Room.findOne({ roomId });
      const roomObj = freshRoom.toObject();
      if (!isOwner) {
        delete roomObj.inviteCode;
        delete roomObj.scorecard;
      }

      logEvent("ROOM_JOIN", { roomId, username, userId: req.user._id.toString() });
      return res.json({ room: roomObj, username, guestId: null, guestToken: null });
    }

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
        // Invalid or expired token
      }
    }

    const now = new Date();
    const guestTtlHours = Number(process.env.GUEST_TOKEN_TTL_HOURS) || 24;
    const maxGuests = Number(process.env.MAX_GUESTS_PER_ROOM) || 50;
    const expiredCutoff = new Date(now.getTime() - guestTtlHours * 60 * 60 * 1000);

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
        return res.json({
          room: sanitizeRoomForGuest(freshRoom),
          username,
          guestId,
          guestToken,
        });
      }
    }

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

    invalidateRoomPolicyCache(roomId);
    const guestToken = signGuestToken({ guestId, username, roomId });
    freshRoom = await Room.findOne({ roomId });
    logEvent("ROOM_JOIN_GUEST", { roomId, guestId, username });
    return res.json({
      room: sanitizeRoomForGuest(freshRoom),
      username,
      guestId,
      guestToken,
    });
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
    const { language, sourceCode, stdin, activeFileName, files } = req.body;
    logEvent("EXEC_REQUEST", { roomId: req.room.roomId, userId: req.user?._id?.toString(), language });

    const bundleFiles =
      Array.isArray(files) && files.length > 0
        ? files
        : req.room.files?.map((f) => ({ name: f.name, content: f.content || "" })) || [];

    const result = await runCode({
      language,
      sourceCode,
      stdin,
      activeFileName,
      files: bundleFiles,
    });

    await Execution.create({
      roomId: req.room.roomId,
      userId: req.user?._id,
      language,
      sourceCode,
      stdin,
      ...result,
    });

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

export async function executeBatch(req, res, next) {
  try {
    const { language, sourceCode, cases, activeFileName, files } = req.body;
    logEvent("EXEC_BATCH_REQUEST", {
      roomId: req.room.roomId,
      userId: req.user?._id?.toString(),
      language,
      count: cases.length,
    });

    const bundleFiles =
      Array.isArray(files) && files.length > 0
        ? files
        : req.room.files?.map((f) => ({ name: f.name, content: f.content || "" })) || [];

    const results = await runCodeBatch({
      language,
      sourceCode,
      activeFileName,
      files: bundleFiles,
      cases,
    });
    res.json({ results });
  } catch (err) {
    logEvent("EXEC_BATCH_FAILURE", { roomId: req.room?.roomId, error: err.message });
    next(err);
  }
}

export async function updateTestCases(req, res, next) {
  try {
    const { testCases } = req.body;
    const room = await Room.findOneAndUpdate(
      { roomId: req.room.roomId },
      { $set: { testCases, lastActiveAt: new Date() } },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("test-cases-updated", { testCases: room.testCases });
    }

    res.json({ testCases: room.testCases });
  } catch (err) {
    next(err);
  }
}

export function getIceServers(req, res) {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = (process.env.TURN_URLS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (turnUrls.length > 0) {
    const turnEntry = { urls: turnUrls };
    if (process.env.TURN_USERNAME) turnEntry.username = process.env.TURN_USERNAME;
    if (process.env.TURN_CREDENTIAL) turnEntry.credential = process.env.TURN_CREDENTIAL;
    iceServers.push(turnEntry);
  }

  res.json({ iceServers });
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
    res.status(201).json({ file, files: req.room.files });
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
    await migrateYjsDoc(req.room.roomId, oldName, req.body.newName);
    await Promise.all([
      DocRevision.updateMany({ roomId: req.room.roomId, fileName: oldName }, { $set: { fileName: req.body.newName } }),
      CodeComment.updateMany({ roomId: req.room.roomId, fileName: oldName }, { $set: { fileName: req.body.newName } }),
    ]);

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
    await deleteYjsDoc(req.room.roomId, req.params.fileName);
    await Promise.all([
      DocRevision.deleteMany({ roomId: req.room.roomId, fileName: req.params.fileName }),
      CodeComment.deleteMany({ roomId: req.room.roomId, fileName: req.params.fileName }),
    ]);

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

// --- Version History / Checkpoints ---

export async function listRevisions(req, res, next) {
  try {
    const revisions = await DocRevision.find({
      roomId: req.room.roomId,
      fileName: req.params.fileName,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ revisions });
  } catch (err) {
    next(err);
  }
}

export async function createRevision(req, res, next) {
  try {
    const file = req.room.files.find((f) => f.name === req.params.fileName);
    if (!file) return res.status(404).json({ error: "File not found" });

    const content = req.body.content !== undefined ? req.body.content : file.content || "";
    const createdBy = req.user?.username || req.guest?.username || "Editor";
    const revision = await DocRevision.create({
      roomId: req.room.roomId,
      fileName: file.name,
      content,
      label: req.body.label || "Manual Checkpoint",
      createdBy,
    });

    logEvent("ROOM_REVISION_CREATE", { roomId: req.room.roomId, fileName: file.name });
    res.status(201).json({ revision });
  } catch (err) {
    next(err);
  }
}

export async function restoreRevision(req, res, next) {
  try {
    const file = req.room.files.find((f) => f.name === req.params.fileName);
    if (!file) return res.status(404).json({ error: "File not found" });

    const revision = await DocRevision.findOne({
      _id: req.params.revisionId,
      roomId: req.room.roomId,
      fileName: file.name,
    });
    if (!revision) return res.status(404).json({ error: "Revision not found" });

    await restoreYjsDocContent(req.room.roomId, file.name, revision.content);

    const io = req.app.get("io");
    if (io) {
      io.to(req.room.roomId).emit("revision-restored", {
        fileName: file.name,
        label: revision.label,
        restoredBy: req.user?.username || req.guest?.username || "Editor",
      });
    }

    logEvent("ROOM_REVISION_RESTORE", {
      roomId: req.room.roomId,
      fileName: file.name,
      revisionId: revision._id.toString(),
    });
    res.json({ success: true, content: revision.content });
  } catch (err) {
    next(err);
  }
}

// --- Inline Code Comments ---

export async function listComments(req, res, next) {
  try {
    const query = { roomId: req.room.roomId };
    if (typeof req.query.fileName === "string" && req.query.fileName) {
      query.fileName = req.query.fileName;
    }
    const comments = await CodeComment.find(query).sort({ line: 1, createdAt: 1 }).limit(200).lean();
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function createComment(req, res, next) {
  try {
    const { fileName, line, text } = req.body;
    if (!req.room.files.some((f) => f.name === fileName)) {
      return res.status(404).json({ error: "File not found" });
    }
    const username = req.user?.username || req.guest?.username || "User";
    const comment = await CodeComment.create({
      roomId: req.room.roomId,
      fileName,
      line,
      text,
      username,
      userId: req.user?._id,
    });

    req.app.get("io")?.to(req.room.roomId).emit("comment-added", { comment });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

export async function toggleResolveComment(req, res, next) {
  try {
    const comment = await CodeComment.findOne({
      _id: req.params.commentId,
      roomId: req.room.roomId,
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.resolved = !comment.resolved;
    comment.resolvedBy = comment.resolved
      ? req.user?.username || req.guest?.username || "Editor"
      : null;
    await comment.save();

    req.app.get("io")?.to(req.room.roomId).emit("comment-updated", { comment });
    res.json({ comment });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const comment = await CodeComment.findOne({
      _id: req.params.commentId,
      roomId: req.room.roomId,
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const callerName = req.user?.username || req.guest?.username;
    if (!req.isRoomOwner && comment.username !== callerName) {
      return res.status(403).json({ error: "Only the author or host can delete this comment" });
    }

    await comment.deleteOne();
    req.app.get("io")?.to(req.room.roomId).emit("comment-deleted", { commentId: req.params.commentId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// --- Host Interview Scorecard (Host-only) ---

export async function getScorecard(req, res, next) {
  try {
    const doc = await Room.findOne({ roomId: req.room.roomId }).select("+scorecard").lean();
    res.json({
      scorecard: doc?.scorecard || {
        problemSolving: 3,
        codeQuality: 3,
        communication: 3,
        recommendation: "UNDECIDED",
        notes: "",
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateScorecard(req, res, next) {
  try {
    const scorecard = {
      ...req.body,
      updatedAt: new Date(),
    };
    const room = await Room.findOneAndUpdate(
      { roomId: req.room.roomId },
      { $set: { scorecard } },
      { new: true }
    ).select("+scorecard");
    res.json({ scorecard: room.scorecard });
  } catch (err) {
    next(err);
  }
}

// --- Host permission & direct invite management ---

export async function inviteMember(req, res, next) {
  try {
    const identifier = req.body.identifier.toLowerCase();
    const role = req.body.role || "EDITOR";
    const targetUser = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!targetUser) {
      return res.status(404).json({ error: "No user found with that username or email" });
    }
    if (targetUser._id.toString() === req.room.ownerId.toString()) {
      return res.status(400).json({ error: "Owner is already the room host" });
    }

    // Unban if previously banned
    req.room.bannedUserIds = (req.room.bannedUserIds || []).filter(
      (id) => id.toString() !== targetUser._id.toString()
    );
    req.room.bannedUsernames = (req.room.bannedUsernames || []).filter(
      (u) => u !== targetUser.username
    );

    const existing = req.room.members.find(
      (m) => m.userId && m.userId.toString() === targetUser._id.toString()
    );
    if (existing) {
      existing.role = role;
    } else {
      req.room.members.push({
        userId: targetUser._id,
        username: targetUser.username,
        role,
        isGuest: false,
      });
    }

    await req.room.save();
    invalidateRoomPolicyCache(req.room.roomId);

    req.app.get("io")?.to(req.room.roomId).emit("permission-change", {
      targetUsername: targetUser.username,
      role,
    });

    logEvent("ROOM_MEMBER_INVITE", {
      roomId: req.room.roomId,
      targetUsername: targetUser.username,
      role,
      invitedBy: req.user.username,
    });

    res.json({ room: req.room, invitedUser: targetUser.username });
  } catch (err) {
    next(err);
  }
}

export async function changeMemberPermission(req, res, next) {
  try {
    const { targetUsername, role } = req.body;
    const member = req.room.members.find((m) => m.username === targetUsername);
    if (!member) return res.status(404).json({ error: "Member not found in this room" });
    member.role = role;
    await req.room.save();
    invalidateRoomPolicyCache(req.room.roomId);

    const io = req.app.get("io");
    if (io) {
      const roomSockets = await io.in(req.room.roomId).fetchSockets();
      for (const s of roomSockets) {
        if (s.data?.identity?.username === targetUsername) {
          s.data.role = role;
        }
      }
      io.to(req.room.roomId).emit("permission-change", { targetUsername, role });
    }

    logEvent("ROOM_PERMISSION_CHANGE", {
      roomId: req.room.roomId,
      targetUsername,
      role,
      changedBy: req.user.username,
    });
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
    invalidateRoomPolicyCache(req.room.roomId);

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

export async function unbanMember(req, res, next) {
  try {
    const targetUsername = req.params.username;
    req.room.bannedUsernames = (req.room.bannedUsernames || []).filter((u) => u !== targetUsername);
    await req.room.save();
    invalidateRoomPolicyCache(req.room.roomId);
    logEvent("ROOM_MEMBER_UNBAN", { roomId: req.room.roomId, username: targetUsername });
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}
