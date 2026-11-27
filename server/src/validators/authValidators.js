import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
});

export const loginSchema = z
  .object({
    identifier: z.string().trim().toLowerCase().min(1).max(254).optional(),
    email: z.string().trim().toLowerCase().min(1).max(254).optional(),
    username: z.string().trim().toLowerCase().min(1).max(30).optional(),
    password: z.string().min(1).max(72),
  })
  .refine((data) => Boolean(data.identifier || data.email || data.username), {
    message: "Email or username is required",
  })
  .transform((data) => ({
    identifier: data.identifier || data.email || data.username,
    password: data.password,
  }));

const STAMP_AVATAR_REGEX =
  /^stamp:(identicon|initial|brackets|lambda|terminal|braces|quill|spark):(auto|terracotta|sage|indigo|ochre|mulberry|teal|violet):(folio|wax|badge|ruled)$/;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  avatar: z
    .string()
    .trim()
    .max(64)
    .refine((val) => val === "" || STAMP_AVATAR_REGEX.test(val), {
      message: "Invalid developer stamp format",
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(128),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16).max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(72),
});

export const submitAppealSchema = z.object({
  appealToken: z.string().min(10).max(2048),
  message: z
    .string()
    .trim()
    .min(10, "Please explain your appeal (at least 10 characters)")
    .max(1000, "Appeal message must not exceed 1000 characters"),
});
