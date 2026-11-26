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

  if (userId && room.ownerId && room.ownerId.toString() === userId) {
    return "HOST";
  }

  if (userId) {
    const member = room.members?.find((m) => m.userId && m.userId.toString() === userId);
    if (member) return member.role;
    return room.settings?.defaultRole || "EDITOR";
  }

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

function buildTemplateFiles(language, template = "blank") {
  if (template === "web-preview") {
    return [
      {
        name: "index.html",
        language: "javascript",
        content: `<div class="card">\n  <h1>Hello CodeTogether</h1>\n  <p>Edit HTML, CSS, or JS and open the Preview tab.</p>\n  <button id="btn">Click me</button>\n  <span id="count">0</span>\n</div>\n`,
      },
      {
        name: "styles.css",
        language: "javascript",
        content: `body {\n  font-family: system-ui, sans-serif;\n  background: #141311;\n  color: #f4f1ea;\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n  margin: 0;\n}\n.card {\n  padding: 2rem;\n  border: 1px solid #33302b;\n  border-radius: 16px;\n  background: #1c1a17;\n  text-align: center;\n}\nbutton {\n  background: #d97706;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 8px;\n  cursor: pointer;\n  margin-right: 8px;\n}\n`,
      },
      {
        name: "app.js",
        language: "javascript",
        content: `let count = 0;\ndocument.getElementById("btn")?.addEventListener("click", () => {\n  count += 1;\n  const el = document.getElementById("count");\n  if (el) el.textContent = String(count);\n});\n`,
      },
    ];
  }

  if (template === "multi-file-node") {
    return [
      {
        name: "index.js",
        language: "javascript",
        content: `const { formatGreeting, sum } = require("./utils/helpers.js");\n\nconsole.log(formatGreeting("CodeTogether"));\nconsole.log("Sum:", sum([10, 20, 30]));\n`,
      },
      {
        name: "utils/helpers.js",
        language: "javascript",
        content: `function formatGreeting(name) {\n  return \`Welcome to \${name}!\`;\n}\n\nfunction sum(nums) {\n  return nums.reduce((acc, n) => acc + n, 0);\n}\n\nmodule.exports = { formatGreeting, sum };\n`,
      },
    ];
  }

  if (template === "algorithms") {
    return [
      {
        name: defaultFileName(language),
        language,
        content:
          language === "python"
            ? `import sys\n\ndef solve():\n    data = list(map(int, sys.stdin.read().split()))\n    if not data:\n        return\n    n, nums = data[0], data[1:1 + data[0]]\n    print(sum(nums))\n\nif __name__ == "__main__":\n    solve()\n`
            : `// Read input from stdin or run the Test Cases tab\nfunction solve(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\n\nconsole.log(solve([1, 2, 3, 4, 5]));\n`,
      },
      {
        name: "notes.md",
        language: "javascript",
        content: `# Interview Problem Notes\n\nGiven N integers, compute their sum.\n\n- Time Complexity target: O(N)\n- Space Complexity target: O(1)\n`,
      },
    ];
  }

  return [
    {
      name: defaultFileName(language),
      content: "",
      language,
    },
  ];
}

export async function createRoom(owner, { name, description, language, visibility, template = "blank" }) {
  const inviteCode = visibility === "PRIVATE" ? generateInviteCode() : null;
  const files = buildTemplateFiles(language, template);

  const room = await Room.create({
    name,
    description,
    language,
    visibility,
    inviteCode,
    ownerId: owner._id,
    files,
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
