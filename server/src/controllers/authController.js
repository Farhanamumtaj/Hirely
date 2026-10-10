import { pool } from "../config/db.js";
import {
  register,
  login,
  googleLogin,
  refreshSession,
  logout,
  safeUser,
} from "../services/authService.js";
import {
  registerSchema,
  loginSchema,
  googleSchema,
} from "../validators/auth.js";
import { apiError, asyncHandler } from "../utils/http.js";
const invalid = (res, parsed) =>
  apiError(
    res,
    400,
    "VALIDATION_ERROR",
    parsed.error.issues[0]?.message || "Please check the submitted fields.",
  );
export const registerController = asyncHandler(async (req, res) => {
  const p = registerSchema.safeParse(req.body);
  if (!p.success) return invalid(res, p);
  try {
    const result = await register(p.data, res);
    return res.status(201).json({ data: result });
  } catch (e) {
    if (e.code === "23505")
      return apiError(
        res,
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists.",
      );
    throw e;
  }
});
export const loginController = asyncHandler(async (req, res) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return invalid(res, p);
  const result = await login(p.data, res);
  if (!result)
    return apiError(
      res,
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  res.json({ data: result });
});
export const googleController = asyncHandler(async (req, res) => {
  const p = googleSchema.safeParse(req.body);
  if (!p.success) return invalid(res, p);
  if (!process.env.GOOGLE_CLIENT_ID)
    return apiError(
      res,
      503,
      "GOOGLE_NOT_CONFIGURED",
      "Google sign-in is not configured on this server.",
    );
  try {
    res.json({ data: await googleLogin(p.data.credential, res) });
  } catch (e) {
    if (e.status)
      return apiError(res, e.status, e.code || "GOOGLE_AUTH_FAILED", e.message);
    throw e;
  }
});
export const refreshController = asyncHandler(async (req, res) => {
  const result = await refreshSession(req.cookies?.ra_refresh, res);
  if (!result)
    return apiError(
      res,
      401,
      "REFRESH_EXPIRED",
      "Your session expired. Please sign in again.",
    );
  res.json({ data: result });
});
export const logoutController = asyncHandler(async (req, res) => {
  await logout(req.auth?.sessionId, res, req.cookies?.ra_refresh);
  res.status(204).end();
});
export const meController = asyncHandler(async (req, res) => {
  const r = await pool.query(
    "SELECT id,full_name,email,created_at FROM users WHERE id=$1",
    [req.auth.userId],
  );
  if (!r.rowCount)
    return apiError(res, 401, "USER_NOT_FOUND", "Please sign in again.");
  res.json({ data: { user: safeUser(r.rows[0]) } });
});
