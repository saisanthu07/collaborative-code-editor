import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGO_URI: z.string().optional(),
  REDIS_URL: z.string().optional(),
  GUEST_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  MAX_GUESTS_PER_ROOM: z.coerce.number().int().min(1).max(500).default(50),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  JUDGE0_API_URL: z.string().optional(),
  PISTON_API_URL: z.string().optional(),
  TURN_URLS: z.string().optional(),
  METRICS_TOKEN: z.string().optional(),
  ALLOW_UNSAFE_LOCAL_EXEC: z.enum(["true", "false"]).optional(),
});

export const env = envSchema.parse(process.env);

export function getAllowedOrigins() {
  const raw = process.env.CLIENT_URL || env.CLIENT_URL || "http://localhost:5173";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function validateStartupEnv() {
  const parsed = envSchema.parse(process.env);
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    throw new Error("MONGO_URI environment variable is missing");
  }
  if (parsed.NODE_ENV === "production") {
    const origins = getAllowedOrigins();
    if (origins.some((o) => o.includes("localhost"))) {
      console.warn("[env] Warning: CLIENT_URL includes localhost in production mode");
    }
  }
  return parsed;
}
