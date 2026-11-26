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

export function formatPrometheusMetrics(snapshot = collectMetricsSnapshot()) {
  const lines = [
    "# HELP codetogether_uptime_seconds Process uptime in seconds",
    "# TYPE codetogether_uptime_seconds gauge",
    `codetogether_uptime_seconds ${snapshot.uptimeSeconds}`,
    "# HELP codetogether_memory_rss_bytes Resident set size in bytes",
    "# TYPE codetogether_memory_rss_bytes gauge",
    `codetogether_memory_rss_bytes ${snapshot.memoryMb.rss * 1024 * 1024}`,
    "# HELP codetogether_memory_heap_used_bytes V8 heap used in bytes",
    "# TYPE codetogether_memory_heap_used_bytes gauge",
    `codetogether_memory_heap_used_bytes ${snapshot.memoryMb.heapUsed * 1024 * 1024}`,
    "# HELP codetogether_http_requests_total Total HTTP requests handled",
    "# TYPE codetogether_http_requests_total counter",
    `codetogether_http_requests_total ${snapshot.http.totalRequests}`,
    "# HELP codetogether_http_responses_total HTTP responses by status class",
    "# TYPE codetogether_http_responses_total counter",
    `codetogether_http_responses_total{class="2xx"} ${snapshot.http.status2xx}`,
    `codetogether_http_responses_total{class="4xx"} ${snapshot.http.status4xx}`,
    `codetogether_http_responses_total{class="5xx"} ${snapshot.http.status5xx}`,
    "# HELP codetogether_sockets_connected Active Socket.IO client connections",
    "# TYPE codetogether_sockets_connected gauge",
    `codetogether_sockets_connected ${snapshot.sockets.connectedClients}`,
    "# HELP codetogether_yjs_active_docs Active in-memory Yjs documents",
    "# TYPE codetogether_yjs_active_docs gauge",
    `codetogether_yjs_active_docs ${snapshot.yjs?.activeDocs ?? 0}`,
    "# HELP codetogether_yjs_active_connections Active Yjs WebSocket connections",
    "# TYPE codetogether_yjs_active_connections gauge",
    `codetogether_yjs_active_connections ${snapshot.yjs?.activeConnections ?? 0}`,
  ];
  return `${lines.join("\n")}\n`;
}
