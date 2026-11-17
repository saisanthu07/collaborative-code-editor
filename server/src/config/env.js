import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  GUEST_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  MAX_GUESTS_PER_ROOM: z.coerce.number().int().min(1).max(500).default(50),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(30),
});

export const env = envSchema.parse(process.env);
