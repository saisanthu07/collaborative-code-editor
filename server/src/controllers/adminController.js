import User from "../models/User.js";
import Room from "../models/Room.js";
import Execution from "../models/Execution.js";
import Message from "../models/Message.js";
import RefreshToken from "../models/RefreshToken.js";
import ActivityLog from "../models/ActivityLog.js";
import { logEvent } from "../utils/logger.js";

export async function stats(req, res, next) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, activeRooms, executions, failedExecutions, messages] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ lastActiveAt: { $gte: since } }),
        Room.countDocuments({ lastActiveAt: { $gte: since } }),
        Execution.countDocuments(),
        Execution.countDocuments({ status: { $regex: /error|fail/i } }),
        Message.countDocuments(),
      ]);
    res.json({ totalUsers, activeUsers, activeRooms, executions, failedExecutions, messages });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(200);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot suspend your own account" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (targetUser.role === "ADMIN") {
      return res.status(403).json({ error: "Cannot suspend an administrator" });
    }

    targetUser.status = "SUSPENDED";
    await targetUser.save();

    logEvent("ADMIN_USER_SUSPEND", {
      adminId: req.user._id.toString(),
      userId: targetUser._id.toString(),
      targetUsername: targetUser.username,
    });

    res.json({ user: targetUser });
  } catch (err) {
    next(err);
  }
}

export async function unsuspendUser(req, res, next) {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    targetUser.status = "ACTIVE";
    await targetUser.save();

    logEvent("ADMIN_USER_UNSUSPEND", {
      adminId: req.user._id.toString(),
      userId: targetUser._id.toString(),
      targetUsername: targetUser.username,
    });

    res.json({ user: targetUser });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    if (targetUser.role === "ADMIN") {
      return res.status(403).json({ error: "Cannot delete an administrator" });
    }

    // Cascades: delete owned rooms, refresh tokens, anonymize messages, remove from member lists
    await Promise.all([
      Room.deleteMany({ ownerId: targetUser._id }),
      RefreshToken.deleteMany({ userId: targetUser._id }),
      Message.updateMany(
        { userId: targetUser._id },
        { $unset: { userId: 1 }, $set: { username: "Deleted User" } }
      ),
      Room.updateMany(
        { "members.userId": targetUser._id },
        { $pull: { members: { userId: targetUser._id } } }
      ),
      targetUser.deleteOne(),
    ]);

    logEvent("ADMIN_USER_DELETE", {
      adminId: req.user._id.toString(),
      userId: targetUser._id.toString(),
      targetUsername: targetUser.username,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await Room.find()
      .select("-files.content -starredBy")
      .sort({ lastActiveAt: -1 })
      .limit(200)
      .lean();
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

export async function lockRoom(req, res, next) {
  try {
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { $set: { "settings.locked": true, "settings.lockedByAdmin": true } },
      { new: true }
    );
    if (!room) return res.status(404).json({ error: "Room not found" });

    logEvent("ADMIN_ROOM_LOCK", {
      adminId: req.user._id.toString(),
      roomId: req.params.roomId,
    });

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function unlockRoom(req, res, next) {
  try {
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { $set: { "settings.locked": false, "settings.lockedByAdmin": false } },
      { new: true }
    );
    if (!room) return res.status(404).json({ error: "Room not found" });

    logEvent("ADMIN_ROOM_UNLOCK", {
      adminId: req.user._id.toString(),
      roomId: req.params.roomId,
    });

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const room = await Room.findOneAndDelete({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    logEvent("ADMIN_ROOM_DELETE", {
      adminId: req.user._id.toString(),
      roomId: req.params.roomId,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function activityLogs(req, res, next) {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(300);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
