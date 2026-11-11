import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

// When REDIS_URL is set, attach the Redis pub/sub adapter to Socket.IO so
// events broadcast correctly across multiple backend instances behind a
// load balancer (spec section 22). Without REDIS_URL, Socket.IO falls back
// to its default in-memory adapter, which is fine for a single instance.
export async function attachRedisAdapter(io) {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[redis] REDIS_URL not set — running with in-memory Socket.IO adapter (single instance only)");
    return null;
  }

  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[redis] pub client error:", err.message));
  subClient.on("error", (err) => console.error("[redis] sub client error:", err.message));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  console.log("[redis] Socket.IO adapter attached — ready for multi-instance scaling");

  return { pubClient, subClient };
}
