import { verifyAccessToken } from "../utils/tokens.js";
import { pool } from "../config/db.js";
import { apiError } from "../utils/http.js";
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.ra_access;
    if (!token)
      return apiError(
        res,
        401,
        "UNAUTHENTICATED",
        "Please sign in to continue.",
      );
    const claims = verifyAccessToken(token);
    if (claims.typ !== "access" || !claims.sid || !claims.sub)
      return apiError(
        res,
        401,
        "INVALID_SESSION",
        "Your session is invalid. Please sign in again.",
      );
    const result = await pool.query(
      "SELECT s.id FROM auth_sessions s WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now()",
      [claims.sid, claims.sub],
    );
    if (!result.rowCount)
      return apiError(
        res,
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please sign in again.",
      );
    req.auth = { userId: claims.sub, sessionId: claims.sid };
    next();
  } catch {
    return apiError(
      res,
      401,
      "INVALID_SESSION",
      "Your session is invalid or has expired. Please sign in again.",
    );
  }
}
