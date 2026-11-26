import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { getRedisHealthStatus } from "./config/redis.js";
import { getAllowedOrigins } from "./config/env.js";
import { isServerShuttingDown } from "./lifecycle.js";
import { requestContextMiddleware } from "./utils/logger.js";
import { metricsMiddleware, collectMetricsSnapshot, formatPrometheusMetrics } from "./utils/metrics.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { adminMiddleware } from "./middleware/adminMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(requestContextMiddleware);
  app.use(metricsMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          workerSrc: ["'self'", "blob:"],
          frameSrc: ["'self'", "blob:", "data:"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = getAllowedOrigins();
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error("CORS origin not allowed"));
      },
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

  // Operational metrics endpoint: accepts METRICS_TOKEN bearer or authenticated ADMIN
  app.get("/api/metrics", (req, res, next) => {
    const respondMetrics = () => {
      const snapshot = collectMetricsSnapshot();
      const wantsPrometheus =
        req.query.format === "prometheus" ||
        (req.headers.accept || "").includes("text/plain");
      if (wantsPrometheus) {
        return res.type("text/plain; version=0.0.4").send(formatPrometheusMetrics(snapshot));
      }
      return res.json(snapshot);
    };

    const expectedToken = process.env.METRICS_TOKEN;
    const authHeader = req.headers.authorization || "";
    if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
      return respondMetrics();
    }
    return authMiddleware(req, res, (authErr) => {
      if (authErr) return next(authErr);
      return adminMiddleware(req, res, respondMetrics);
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
