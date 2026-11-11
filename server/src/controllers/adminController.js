import User from "../models/User.js";
import Room from "../models/Room.js";
import Execution from "../models/Execution.js";
import Message from "../models/Message.js";
import ActivityLog from "../models/ActivityLog.js";

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
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: "SUSPENDED" },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await Room.find().sort({ lastActiveAt: -1 }).limit(200);
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

export async function lockRoom(req, res, next) {
  try {
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { "settings.locked": true },
      { new: true }
    );
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    await Room.findOneAndDelete({ roomId: req.params.roomId });
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
