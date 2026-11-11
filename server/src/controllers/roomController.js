import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { createRoom, addMemberIfNeeded } from "../services/roomService.js";
import { runCode } from "../services/executionService.js";
import Execution from "../models/Execution.js";
import { logEvent } from "../utils/logger.js";

export async function create(req, res, next) {
  try {
    const room = await createRoom(req.user, req.body);
    logEvent("ROOM_CREATE", { userId: req.user._id.toString(), roomId: room.roomId });
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const owned = await Room.find({ ownerId: req.user._id }).sort({ lastActiveAt: -1 });
    const memberOf = await Room.find({
      ownerId: { $ne: req.user._id },
      "members.userId": req.user._id,
    }).sort({ lastActiveAt: -1 });
    const starred = await Room.find({ starredBy: req.user._id }).sort({ lastActiveAt: -1 });

    res.json({ owned, memberOf, starred });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res) {
  res.json({ room: req.room });
}

export async function update(req, res, next) {
  try {
    Object.assign(req.room, req.body);
    await req.room.save();
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await req.room.deleteOne();
    logEvent("ROOM_DELETE", { userId: req.user._id.toString(), roomId: req.room.roomId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function join(req, res, next) {
  try {
    if (req.room.settings.locked) {
      return res.status(403).json({ error: "This room is locked" });
    }
    const username = req.user ? req.user.username : `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    await addMemberIfNeeded(req.room, {
      userId: req.user?._id,
      username,
      isGuest: !req.user,
      role: req.room.settings.allowGuestEdit ? "EDITOR" : "VIEWER",
    });
    logEvent("ROOM_JOIN", { roomId: req.room.roomId, username });
    res.json({ room: req.room, username });
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
    const messages = await Message.find({ roomId: req.room.roomId })
      .sort({ createdAt: 1 })
      .limit(500);
    res.json({ messages });
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
    req.room.files.push({ name, content, language });
    req.room.lastActiveAt = new Date();
    await req.room.save();
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
    file.content = req.body.content;
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
    file.name = req.body.newName;
    await req.room.save();
    logEvent("ROOM_FILE_RENAME", { roomId: req.room.roomId, from: req.params.fileName, to: req.body.newName });
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
    logEvent("ROOM_PERMISSION_CHANGE", { roomId: req.room.roomId, targetUsername, role, changedBy: req.user.username });
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    req.room.members = req.room.members.filter((m) => m.username !== req.params.username);
    await req.room.save();
    logEvent("ROOM_MEMBER_REMOVE", { roomId: req.room.roomId, username: req.params.username });
    res.json({ room: req.room });
  } catch (err) {
    next(err);
  }
}
