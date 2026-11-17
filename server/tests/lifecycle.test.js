import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createShutdownHandler } from "../src/lifecycle.js";

describe("Task 2.6 — Graceful Shutdown Lifecycle", () => {
  test("executes shutdown steps in the correct order", async () => {
    const steps = [];

    const fakeHttpServer = {
      close: (cb) => {
        steps.push("httpServer.close");
        cb();
      },
    };

    const fakeIo = {
      emit: (evt) => steps.push(`io.emit:${evt}`),
      close: (cb) => {
        steps.push("io.close");
        cb();
      },
    };

    const fakeRedis = {
      quit: async () => steps.push("redis.quit"),
    };

    const fakeMongoose = {
      close: async () => steps.push("mongoose.close"),
    };

    const flushYjs = async () => steps.push("flushYjs");
    const closeYjs = async () => steps.push("closeYjs");

    let exitCode = null;
    const fakeExit = (code) => {
      exitCode = code;
      steps.push(`exit:${code}`);
    };

    const handler = createShutdownHandler({
      httpServer: fakeHttpServer,
      io: fakeIo,
      redisClient: fakeRedis,
      mongooseConnection: fakeMongoose,
      flushYjsDocs: flushYjs,
      closeYjs: closeYjs,
      exit: fakeExit,
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });

    await handler.shutdown(0, "SIGTERM");

    assert.equal(exitCode, 0);
    assert.deepEqual(steps, [
      "httpServer.close",
      "io.emit:server-restarting",
      "io.close",
      "flushYjs",
      "closeYjs",
      "redis.quit",
      "mongoose.close",
      "exit:0",
    ]);
  });

  test("shutdown is idempotent when triggered multiple times", async () => {
    let callCount = 0;
    const fakeHttpServer = {
      close: (cb) => {
        callCount++;
        cb();
      },
    };

    const handler = createShutdownHandler({
      httpServer: fakeHttpServer,
      exit: () => {},
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });

    await Promise.all([
      handler.shutdown(0, "SIGTERM"),
      handler.shutdown(0, "SIGINT"),
    ]);

    assert.equal(callCount, 1);
  });
});
