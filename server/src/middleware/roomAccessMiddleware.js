import Room from "../models/Room.js";

// Loads the room by :roomId param onto req.room, and enforces that the
// caller is either the owner, a member, or the room is PUBLIC.
export async function roomAccessMiddleware(req, res, next) {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const userId = req.user?._id?.toString();
    const isOwner = userId && room.ownerId.toString() === userId;
    const isMember = userId && room.members.some((m) => m.userId?.toString() === userId);
    const isAuthenticatedJoin =
      req.method === "POST" && req.path.endsWith("/join") && Boolean(userId);

    if (room.visibility === "PRIVATE" && !isOwner && !isMember && !isAuthenticatedJoin) {
      return res.status(403).json({ error: "You don't have access to this room" });
    }

    req.room = room;
    req.isRoomOwner = Boolean(isOwner);
    next();
  } catch (err) {
    next(err);
  }
}

// Restricts an action to the room's host/owner only (e.g. delete room,
// change permissions, transfer host).
export function requireRoomHost(req, res, next) {
  if (!req.isRoomOwner) {
    return res.status(403).json({ error: "Only the room host can do this" });
  }
  next();
}
