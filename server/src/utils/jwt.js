import jwt from "jsonwebtoken";

const EXAMPLE_SECRET = "change-this-to-a-long-random-string";

export function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
  if (secret === EXAMPLE_SECRET) {
    throw new Error("JWT_SECRET must not use the example placeholder value");
  }
}

export function signToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || "15m",
  });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
  });
}
