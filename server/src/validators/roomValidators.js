import { z } from "zod";
import { LANGUAGES } from "../constants/languages.js";

const languageKeys = Object.keys(LANGUAGES);

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  language: z.enum(languageKeys).default("javascript"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  settings: z
    .object({
      allowGuestEdit: z.boolean().optional(),
      defaultRole: z.enum(["EDITOR", "VIEWER"]).optional(),
      locked: z.boolean().optional(),
      chatMuted: z.boolean().optional(),
    })
    .optional(),
});

export const executeSchema = z.object({
  language: z.enum(languageKeys),
  sourceCode: z.string().min(1).max(100_000),
  stdin: z.string().max(10_000).optional().default(""),
});

export const testCaseItemSchema = z.object({
  id: z.number().int().min(1).max(100),
  input: z.string().max(10_000).default(""),
  expected: z.string().max(10_000).default(""),
});

export const updateTestCasesSchema = z.object({
  testCases: z.array(testCaseItemSchema).min(1).max(15),
});

export const executeBatchSchema = z.object({
  language: z.enum(languageKeys),
  sourceCode: z.string().min(1).max(100_000),
  cases: z
    .array(
      z.object({
        id: z.number().int().min(1).max(100),
        input: z.string().max(10_000).optional().default(""),
        expected: z.string().max(10_000).optional().default(""),
      })
    )
    .min(1)
    .max(15),
});

export const messageSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid before message ID").optional(),
});

const fileNamePattern = /^[a-zA-Z0-9_.\-\/]{1,120}$/;

function isSafeFileName(name) {
  if (!fileNamePattern.test(name)) return false;
  if (name.startsWith("/") || name.startsWith(".")) return false;
  if (name.split("/").some((segment) => segment === "." || segment === "..")) return false;
  return true;
}

export const safeFileName = z.string().refine(isSafeFileName, { message: "Invalid file name" });

export const createFileSchema = z.object({
  name: safeFileName,
  content: z.string().max(500_000).optional().default(""),
  language: z.enum(languageKeys).optional().default("javascript"),
});

export const renameFileSchema = z.object({
  newName: safeFileName,
});

export const saveFileSchema = z.object({
  content: z.string().max(500_000).optional(),
  language: z.enum(languageKeys).optional(),
});

export const permissionChangeSchema = z.object({
  targetUsername: z.string().min(1),
  role: z.enum(["EDITOR", "VIEWER", "GUEST"]),
});
