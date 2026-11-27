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

export const appealIdParamSchema = z.object({
  appealId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid appeal ID"),
});

export const moderationActionSchema = z.object({
  reason: z.string().trim().max(300, "Reason must not exceed 300 characters").optional(),
  durationHours: z.number().int().min(1).max(8760).nullable().optional(),
});

export const reviewAppealSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().trim().max(500, "Admin note must not exceed 500 characters").optional(),
});

export const changeUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
  currentPassword: z
    .string()
    .min(1, "Administrator password confirmation is required")
    .max(72),
});
