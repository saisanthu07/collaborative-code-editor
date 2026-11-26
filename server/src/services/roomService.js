import crypto from "crypto";
import Room from "../models/Room.js";
import { LANGUAGES } from "../constants/languages.js";

export function generateInviteCode() {
  return crypto.randomBytes(12).toString("hex");
}

export function hasValidInviteCode(room, providedCode) {
  if (!room?.inviteCode || !providedCode || typeof providedCode !== "string") {
    return false;
  }
  const expected = Buffer.from(room.inviteCode, "utf8");
  const actual = Buffer.from(providedCode.trim(), "utf8");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function generateGuestName(existingMembers = []) {
  const existingNames = new Set(existingMembers.map((m) => m.username));
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingNames.has(candidate)) return candidate;
  }
  return `Guest-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function resolveRole(room, identity) {
  if (!room) return "VIEWER";
  const userId = identity?.userId?.toString
    ? identity.userId.toString()
    : identity?._id?.toString
    ? identity._id.toString()
    : null;
  const guestId = identity?.guestId;

  // Owner is always HOST
  if (userId && room.ownerId && room.ownerId.toString() === userId) {
    return "HOST";
  }

  // Existing authenticated member
  if (userId) {
    const member = room.members?.find((m) => m.userId && m.userId.toString() === userId);
    if (member) return member.role;
    // Authenticated non-member joining
    return room.settings?.defaultRole || "EDITOR";
  }

  // Guest member
  if (guestId) {
    const member = room.members?.find((m) => m.guestId === guestId);
    if (member) return member.role || "GUEST";
    return "GUEST";
  }

  return "GUEST";
}

export function canEdit(role, room) {
  if (role === "HOST" || role === "EDITOR") return true;
  if (role === "GUEST") return Boolean(room?.settings?.allowGuestEdit);
  return false;
}

export function canChat(role, room) {
  if (role === "HOST") return true;
  if (room?.settings?.chatMuted) return false;
  return true;
}

export async function createRoom(owner, { name, description, language, visibility }) {
  const inviteCode = visibility === "PRIVATE" ? generateInviteCode() : null;
  const room = await Room.create({
    name,
    description,
    language,
    visibility,
    inviteCode,
    ownerId: owner._id,
    files: [
      {
        name: defaultFileName(language),
        content: "",
        language,
      },
    ],
    members: [
      {
        userId: owner._id,
        username: owner.username,
        role: "HOST",
        isGuest: false,
      },
    ],
  });
  return room;
}

function defaultFileName(language) {
  const ext = {
    javascript: "index.js",
    typescript: "index.ts",
    python: "main.py",
    c: "main.c",
    cpp: "main.cpp",
    java: "Main.java",
    go: "main.go",
    rust: "main.rs",
    php: "index.php",
    ruby: "main.rb",
    kotlin: "Main.kt",
    swift: "main.swift",
    csharp: "Program.cs",
    dart: "main.dart",
    sql: "query.sql",
  };
  return ext[language] || "index.txt";
}

export async function addMemberIfNeeded(room, { userId, username, isGuest = false, role = "EDITOR", guestId = null }) {
  const alreadyMember = room.members.some((m) =>
    userId
      ? m.userId?.toString() === userId.toString()
      : guestId
      ? m.guestId === guestId
      : m.username === username
  );
  if (alreadyMember) return room;

  room.members.push({
    userId: userId || undefined,
    guestId: guestId || undefined,
    username,
    isGuest: Boolean(isGuest && !userId),
    role: isGuest ? "GUEST" : role,
  });
  room.lastActiveAt = new Date();
  await room.save();
  return room;
}

export function assertLanguageSupported(language) {
  if (!LANGUAGES[language]) {
    const err = new Error(`Unsupported language: ${language}`);
    err.status = 400;
    throw err;
  }
}
