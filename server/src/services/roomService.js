import Room from "../models/Room.js";
import { LANGUAGES } from "../constants/languages.js";

export async function createRoom(owner, { name, description, language, visibility }) {
  const room = await Room.create({
    name,
    description,
    language,
    visibility,
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

export async function addMemberIfNeeded(room, { userId, username, isGuest = false, role = "EDITOR" }) {
  const alreadyMember = room.members.some((m) =>
    userId ? m.userId?.toString() === userId.toString() : m.username === username
  );
  if (alreadyMember) return room;

  room.members.push({
    userId: userId || undefined,
    username,
    isGuest,
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
