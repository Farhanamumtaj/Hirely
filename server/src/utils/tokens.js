import crypto from "node:crypto";
import jwt from "jsonwebtoken";
export function createAccessToken(user, sessionId) {
  return jwt.sign(
    { sub: user.id, sid: sessionId, typ: "access" },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
      issuer: "hirely",
      audience: "hirely-client",
    },
  );
}
export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}
export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: "hirely",
    audience: "hirely-client",
  });
}
