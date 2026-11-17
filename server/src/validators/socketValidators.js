import { z } from "zod";
import { safeFileName } from "./roomValidators.js";

export const roomIdSchema = z.string().regex(/^[a-z0-9]{10}$/, "Invalid room ID");

export const joinRoomSchema = z.object({
  roomId: roomIdSchema,
});

export const heartbeatSchema = z.object({
  roomId: roomIdSchema,
});

export const chatMessageSchema = z.object({
  roomId: roomIdSchema,
  text: z.string().min(1).max(2000),
});

export const presenceIdleSchema = z.object({
  roomId: roomIdSchema,
  status: z.enum(["ONLINE", "AWAY"]),
});

export const permissionChangeSchema = z.object({
  roomId: roomIdSchema,
  targetUsername: z.string().min(1).max(30),
  role: z.enum(["EDITOR", "VIEWER", "GUEST"]),
});

export const fileCreatedSchema = z.object({
  roomId: roomIdSchema,
  file: z.object({
    name: safeFileName,
    content: z.string().max(500_000).optional().default(""),
    language: z.string().optional().default("javascript"),
  }),
});

export const fileDeletedSchema = z.object({
  roomId: roomIdSchema,
  fileName: safeFileName,
});

export const fileRenamedSchema = z.object({
  roomId: roomIdSchema,
  oldName: safeFileName,
  newName: safeFileName,
});

export const fileLanguageSchema = z.object({
  roomId: roomIdSchema,
  fileName: safeFileName,
  language: z.string().min(1).max(50),
});

export const executionStartedSchema = z.object({
  roomId: roomIdSchema,
});

export const executionCompletedSchema = z.object({
  roomId: roomIdSchema,
  result: z.any().optional(),
});
