import { getYjsMetrics } from "../sockets/yjsServer.js";

const httpStats = {
  totalRequests: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0,
  totalDurationMs: 0,
};

let ioRef = null;

export function setMetricsContext({ io }) {
  ioRef = io || null;
}

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    httpStats.totalRequests += 1;
    httpStats.totalDurationMs += durationMs;
    if (res.statusCode >= 500) httpStats.status5xx += 1;
    else if (res.statusCode >= 400) httpStats.status4xx += 1;
    else if (res.statusCode >= 200 && res.statusCode < 300) httpStats.status2xx += 1;
  });
  next();
}

export function collectMetricsSnapshot() {
  const mem = process.memoryUsage();
  const yjs = getYjsMetrics();
  return {
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    http: {
      ...httpStats,
      avgDurationMs:
        httpStats.totalRequests > 0
          ? Number((httpStats.totalDurationMs / httpStats.totalRequests).toFixed(2))
          : 0,
    },
    sockets: {
      connectedClients: ioRef ? ioRef.engine?.clientsCount || 0 : 0,
    },
    yjs,
  };
}
