import "dotenv/config";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { attachRedisAdapter } from "./config/redis.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { attachYjsWebsocketServer } from "./sockets/yjsServer.js";

async function main() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  const redis = await attachRedisAdapter(io);
  registerSocketHandlers(io, redis?.pubClient || null);

  attachYjsWebsocketServer(httpServer, "/yjs");

  const port = process.env.PORT || 5000;
  httpServer.listen(port, () => {
    console.log(`[server] Listening on port ${port} (${process.env.NODE_ENV || "development"})`);
  });

  process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
