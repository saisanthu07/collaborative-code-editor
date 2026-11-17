import jwt from "jsonwebtoken";

const GUEST_TOKEN_TTL = (process.env.GUEST_TOKEN_TTL_HOURS || 24) + "h";

export function signGuestToken({ guestId, username, roomId }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(
    { guestId, username, roomId, typ: "guest" },
    secret,
    {
      algorithm: "HS256",
      expiresIn: GUEST_TOKEN_TTL,
    }
  );
}

export function verifyGuestToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  if (decoded.typ !== "guest") {
    throw new Error("Invalid token type");
  }
  return decoded;
}
