import Room from "../models/Room.js";
import { resolveRole, canEdit } from "../services/roomService.js";
import { verifyGuestToken } from "../utils/guestToken.js";

// Loads the room by :roomId param onto req.room, enforces access permissions,
// lock status, and resolves the caller's role (HOST, EDITOR, VIEWER, GUEST).
export async function roomAccessMiddleware(req, res, next) {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const userId = req.user?._id?.toString();
    const isOwner = Boolean(userId && room.ownerId.toString() === userId);
    const isMember = Boolean(userId && room.members.some((m) => m.userId?.toString() === userId));
    const isAuthenticatedJoin =
      req.method === "POST" && req.path.endsWith("/join") && Boolean(userId);

    // Banned check
    if (
      (userId && room.bannedUserIds?.some((id) => id.toString() === userId)) ||
      (req.user && room.bannedUsernames?.includes(req.user.username))
    ) {
      return res.status(403).json({ error: "You are banned from this room" });
    }

    // Access check for private rooms
    if (room.visibility === "PRIVATE" && !isOwner && !isMember && !isAuthenticatedJoin) {
      return res.status(403).json({ error: "You don't have access to this room" });
    }

    // Lock check: block everything but GET for locked rooms except for the host
    if (req.method !== "GET") {
      if (room.settings?.lockedByAdmin) {
        return res.status(403).json({ error: "Room is locked by an administrator" });
      }
      if (room.settings?.locked && !isOwner) {
        return res.status(403).json({ error: "This room is locked" });
      }
    }

    // Extract guestId if request has X-Guest-Token or req.guest
    let guestId = req.guest?.guestId || null;
    const guestHeader = req.headers["x-guest-token"];
    if (guestHeader) {
      try {
        const decoded = verifyGuestToken(guestHeader);
        if (decoded.roomId === room.roomId) {
          guestId = decoded.guestId;
        }
      } catch {
        // ignore invalid guest token in middleware
      }
    }

    // Derive caller's role using single helper
    const role = resolveRole(room, req.user || (guestId ? { guestId } : null));

    req.room = room;
    req.isRoomOwner = isOwner;
    req.userRole = role;
    next();
  } catch (err) {
    next(err);
  }
}

// Restricts an action to callers with one of the allowed roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (roles.includes("EDITOR") && canEdit(req.userRole, req.room)) {
      return next();
    }
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Permission denied for this action" });
    }
    next();
  };
}

// Restricts an action to the room's host/owner only
export function requireRoomHost(req, res, next) {
  if (!req.isRoomOwner) {
    return res.status(403).json({ error: "Only the room host can do this" });
  }
  next();
}
