import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import http from "http";

before(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.CLIENT_URL = "http://localhost:5173";
});

const { createApp } = await import("../src/app.js");

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: server.address().port,
        path,
        method,
        headers: data
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

describe("app routes (no DB required)", () => {
  test("GET /api/health returns ok", async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const res = await request(server, "GET", "/api/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "ok");
    } finally {
      server.close();
    }
  });

  test("unknown route returns 404", async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const res = await request(server, "GET", "/api/nonexistent");
      assert.equal(res.status, 404);
    } finally {
      server.close();
    }
  });

  test("POST /api/auth/register rejects a weak password before touching the DB", async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const res = await request(server, "POST", "/api/auth/register", {
        name: "Test",
        username: "testuser",
        email: "test@example.com",
        password: "weak",
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation failed");
    } finally {
      server.close();
    }
  });

  test("GET /api/rooms without auth is rejected", async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const res = await request(server, "GET", "/api/rooms");
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });
});
