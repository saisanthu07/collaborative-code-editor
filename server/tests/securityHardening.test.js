import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env.JWT_SECRET = "test-secret-for-security-tests-at-least-32-chars";
  process.env.JWT_EXPIRES_IN = "15m";
});

const { optionalAuthMiddleware, authMiddleware } = await import("../src/middleware/authMiddleware.js");
const { requireRole } = await import("../src/middleware/roomAccessMiddleware.js");
const { signToken } = await import("../src/utils/jwt.js");

describe("authMiddleware & optionalAuthMiddleware security", () => {
  test("optionalAuthMiddleware passes through when Authorization header is absent", async () => {
    let calledNext = false;
    const req = { headers: {} };
    const res = {
      status: () => res,
      json: () => res,
    };
    await optionalAuthMiddleware(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
    assert.equal(req.user, undefined);
  });

  test("optionalAuthMiddleware returns 401 when token is present but invalid", async () => {
    let statusCode = null;
    let jsonResponse = null;
    const req = { headers: { authorization: "Bearer invalid.jwt.token" } };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      },
    };
    await optionalAuthMiddleware(req, res, () => {
      assert.fail("Should not call next on invalid token");
    });
    assert.equal(statusCode, 401);
    assert.match(jsonResponse.error, /invalid or expired/i);
  });

  test("optionalAuthMiddleware returns 401 when token format is invalid", async () => {
    let statusCode = null;
    const req = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: () => res,
    };
    await optionalAuthMiddleware(req, res, () => {
      assert.fail("Should not call next on bad header format");
    });
    assert.equal(statusCode, 401);
  });

  test("authMiddleware rejects requests without token with 401", async () => {
    let statusCode = null;
    const req = { headers: {} };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: () => res,
    };
    await authMiddleware(req, res, () => {
      assert.fail("Should not call next without token");
    });
    assert.equal(statusCode, 401);
  });
});

describe("requireRole middleware", () => {
  test("allows authorized roles", () => {
    let calledNext = false;
    const mw = requireRole("HOST", "EDITOR");
    const req = { userRole: "HOST" };
    const res = {};
    mw(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  });

  test("rejects unauthorized roles (VIEWER / GUEST) with 403", () => {
    let statusCode = null;
    let jsonResponse = null;
    const mw = requireRole("HOST", "EDITOR");
    const req = { userRole: "VIEWER" };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      },
    };
    mw(req, res, () => {
      assert.fail("Should not call next for VIEWER");
    });
    assert.equal(statusCode, 403);
    assert.match(jsonResponse.error, /permission denied/i);
  });
});
