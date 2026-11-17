let shuttingDown = false;

export function isServerShuttingDown() {
  return shuttingDown;
}

export function setServerShuttingDown(val = true) {
  shuttingDown = val;
}

export function createShutdownHandler({
  httpServer,
  io,
  redisClient,
  redisSubClient,
  mongooseConnection,
  flushYjsDocs,
  closeYjs,
  exit = (code) => process.exit(code),
  timeoutMs = 10_000,
  logger = console,
}) {
  let isExecuting = false;

  const shutdown = async (exitCode = 0, signal = "UNKNOWN") => {
    if (isExecuting) return;
    isExecuting = true;
    shuttingDown = true;

    logger.log?.(`[shutdown] Received ${signal}. Starting graceful shutdown...`);

    const timer = setTimeout(() => {
      logger.warn?.("[shutdown] Forcefully terminating process after timeout");
      exit(1);
    }, timeoutMs);
    timer.unref?.();

    try {
      // 1. Stop accepting new HTTP connections
      if (httpServer?.close) {
        await new Promise((resolve) => httpServer.close(() => resolve()));
      }

      // 2. Notify and close Socket.IO
      if (io) {
        io.emit?.("server-restarting");
        if (io.close) {
          await new Promise((resolve) => io.close(() => resolve()));
        }
      }

      // 3. Flush Yjs docs with 5s cap and close Yjs WebSocket server
      if (flushYjsDocs) {
        await Promise.race([
          flushYjsDocs(),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]).catch((err) => logger.error?.("[shutdown] Error flushing Yjs docs:", err));
      }

      if (closeYjs) {
        await closeYjs().catch((err) => logger.error?.("[shutdown] Error closing Yjs server:", err));
      }

      // 4. Disconnect Redis clients
      if (redisClient?.quit) {
        await redisClient.quit().catch(() => {});
      }
      if (redisSubClient?.quit) {
        await redisSubClient.quit().catch(() => {});
      }

      // 5. Disconnect MongoDB
      if (mongooseConnection?.close) {
        await mongooseConnection.close().catch(() => {});
      }

      clearTimeout(timer);
      logger.log?.("[shutdown] Graceful shutdown completed cleanly");
      exit(exitCode);
    } catch (err) {
      clearTimeout(timer);
      logger.error?.("[shutdown] Unexpected error during graceful shutdown:", err);
      exit(1);
    }
  };

  return {
    shutdown,
    isShuttingDown: () => isExecuting || shuttingDown,
  };
}
