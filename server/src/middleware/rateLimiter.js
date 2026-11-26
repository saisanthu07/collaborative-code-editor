import rateLimit from "express-rate-limit";

let activeRedisClient = null;

export function setRateLimitRedisClient(client) {
  activeRedisClient = client || null;
}

/**
 * Redis-backed Store for express-rate-limit with transparent fallback to
 * per-process memory when Redis is unavailable or unconfigured.
 */
class HybridRateLimitStore {
  constructor(prefix, windowMs) {
    this.prefix = `rl:${prefix}:`;
    this.windowMs = windowMs;
    this.localHits = new Map();
  }

  async increment(key) {
    if (activeRedisClient?.isOpen) {
      const redisKey = `${this.prefix}${key}`;
      try {
        const count = await activeRedisClient.incr(redisKey);
        if (count === 1) {
          await activeRedisClient.pExpire(redisKey, this.windowMs);
        }
        const ttlMs = await activeRedisClient.pTTL(redisKey);
        return {
          totalHits: count,
          resetTime: new Date(Date.now() + Math.max(ttlMs, 0)),
        };
      } catch {
        // Fallback to local memory on transient Redis failure
      }
    }

    const now = Date.now();
    const existing = this.localHits.get(key);
    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + this.windowMs };
      this.localHits.set(key, entry);
      return { totalHits: 1, resetTime: new Date(entry.resetAt) };
    }
    existing.count += 1;
    return { totalHits: existing.count, resetTime: new Date(existing.resetAt) };
  }

  async decrement(key) {
    if (activeRedisClient?.isOpen) {
      try {
        await activeRedisClient.decr(`${this.prefix}${key}`);
        return;
      } catch {
        // ignore
      }
    }
    const existing = this.localHits.get(key);
    if (existing && existing.count > 0) existing.count -= 1;
  }

  async resetKey(key) {
    if (activeRedisClient?.isOpen) {
      try {
        await activeRedisClient.del(`${this.prefix}${key}`);
      } catch {
        // ignore
      }
    }
    this.localHits.delete(key);
  }
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new HybridRateLimitStore("auth", 15 * 60 * 1000),
  message: { error: "Too many attempts, please try again later" },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new HybridRateLimitStore("refresh", 15 * 60 * 1000),
  message: { error: "Too many refresh attempts, please try again later" },
});

export const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new HybridRateLimitStore("exec", 60 * 1000),
  message: { error: "Too many execution requests, slow down" },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new HybridRateLimitStore("general", 60 * 1000),
});
