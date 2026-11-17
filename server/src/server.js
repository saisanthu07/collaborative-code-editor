import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { attachRedisAdapter } from "./config/redis.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { attachYjsWebsocketServer, flushAllYjsDocs, closeYjsServer } from "./sockets/yjsServer.js";
import { validateJwtSecret } from "./utils/jwt.js";
import { createShutdownHandler } from "./lifecycle.js";
import "./config/env.js"; // Validates environment variables on startup

async function main() {
  validateJwtSecret();
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  app.set("io", io);

  const redis = await attachRedisAdapter(io);
  registerSocketHandlers(io, redis?.pubClient || null);

  attachYjsWebsocketServer(httpServer, "/yjs");

  const shutdownHandler = createShutdownHandler({
    httpServer,
    io,
    redisClient: redis?.pubClient || null,
    redisSubClient: redis?.subClient || null,
    mongooseConnection: mongoose.connection,
    flushYjsDocs: flushAllYjsDocs,
    closeYjs: closeYjsServer,
  });

  process.on("SIGTERM", () => shutdownHandler.shutdown(0, "SIGTERM"));
  process.on("SIGINT", () => shutdownHandler.shutdown(0, "SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[server] Unhandled Promise Rejection:", reason);
    shutdownHandler.shutdown(1, "unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    console.error("[server] Uncaught Exception:", err);
    shutdownHandler.shutdown(1, "uncaughtException");
  });

  const port = process.env.PORT || 5000;
  httpServer.listen(port, () => {
    console.log(`[server] Listening on port ${port} (${process.env.NODE_ENV || "development"})`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
