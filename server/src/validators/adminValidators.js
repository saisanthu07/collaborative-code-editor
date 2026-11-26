import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

export const roomIdParamSchema = z.object({
  roomId: z.string().regex(/^[a-z0-9]{10}$/, "Invalid room ID"),
});

export const logIdParamSchema = z.object({
  logId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid activity log ID"),
});
