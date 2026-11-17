import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { getRedisHealthStatus } from "./config/redis.js";
import { isServerShuttingDown } from "./lifecycle.js";

import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(generalLimiter);

  // Cheap, unauthenticated health check endpoint
  app.get("/api/health", (req, res) => {
    const shuttingDown = isServerShuttingDown();
    const dbStatus = mongoose.connection.readyState === 1 ? "up" : "down";
    const redisStatus = getRedisHealthStatus();
    const isHealthy = !shuttingDown && dbStatus === "up";

    const payload = {
      status: isHealthy ? "ok" : shuttingDown ? "shutting_down" : "degraded",
      time: new Date().toISOString(),
      db: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
    };

    if (!isHealthy) {
      return res.status(503).json(payload);
    }
    res.json(payload);
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
