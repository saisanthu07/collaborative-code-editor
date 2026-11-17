import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

let cachedRedisStatus = "disabled";
let lastPingTime = 0;
let redisPubInstance = null;

export function getRedisHealthStatus() {
  if (!process.env.REDIS_URL || !redisPubInstance) {
    return "disabled";
  }
  const now = Date.now();
  if (now - lastPingTime > 30_000) {
    lastPingTime = now;
    redisPubInstance
      .ping()
      .then(() => {
        cachedRedisStatus = "up";
      })
      .catch(() => {
        cachedRedisStatus = "down";
      });
  }
  return cachedRedisStatus;
}

// When REDIS_URL is set, attach the Redis pub/sub adapter to Socket.IO so
// events broadcast correctly across multiple backend instances behind a
// load balancer. Without REDIS_URL, Socket.IO falls back to in-memory adapter.
export async function attachRedisAdapter(io) {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[redis] REDIS_URL not set — running with in-memory Socket.IO adapter (single instance only)");
    cachedRedisStatus = "disabled";
    return null;
  }

  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[redis] pub client error:", err.message));
  subClient.on("error", (err) => console.error("[redis] sub client error:", err.message));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  redisPubInstance = pubClient;
  cachedRedisStatus = "up";
  lastPingTime = Date.now();

  io.adapter(createAdapter(pubClient, subClient));
  console.log("[redis] Socket.IO adapter attached — ready for multi-instance scaling");

  return { pubClient, subClient };
}
