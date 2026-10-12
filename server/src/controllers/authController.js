import { pool } from "../config/db.js";
import {
  register,
  login,
  googleLogin,
  refreshSession,
  logout,
  safeUser,
  requestPasswordReset,
  resetPassword,
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
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  try {
    const result = await register(parsed.data);
    return res.status(201).json({ data: result });
  } catch (error) {
    if (error.code === "EMAIL_ALREADY_REGISTERED") {
      return apiError(
        res,
        409,
        "EMAIL_ALREADY_REGISTERED",
        "This email is already registered. Please log in instead.",
      );
    }

    throw error;
  }
});

export const loginController = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  const result = await login(parsed.data, res);

  if (!result) {
    return apiError(
      res,
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  return res.json({ data: result });
});

export const googleController = asyncHandler(async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed);

  if (!process.env.GOOGLE_CLIENT_ID) {
    return apiError(
      res,
      503,
      "GOOGLE_NOT_CONFIGURED",
      "Google sign-in is not configured on this server.",
    );
  }

  try {
    return res.json({
      data: await googleLogin(parsed.data.credential, res),
    });
  } catch (error) {
    if (error.status) {
      return apiError(
        res,
        error.status,
        error.code || "GOOGLE_AUTH_FAILED",
        error.message,
      );
    }

    throw error;
  }
});

export const refreshController = asyncHandler(async (req, res) => {
  const result = await refreshSession(req.cookies?.ra_refresh, res);

  if (!result) {
    return apiError(
      res,
      401,
      "REFRESH_EXPIRED",
      "Your session expired. Please sign in again.",
    );
  }

  return res.json({ data: result });
});

export const logoutController = asyncHandler(async (req, res) => {
  await logout(req.auth?.sessionId, res, req.cookies?.ra_refresh);
  res.status(204).end();
});

export const meController = asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, full_name, email, created_at FROM users WHERE id = $1",
    [req.auth.userId],
  );

  if (!result.rowCount) {
    return apiError(res, 401, "USER_NOT_FOUND", "Please sign in again.");
  }

  return res.json({ data: { user: safeUser(result.rows[0]) } });
});


export const forgotPasswordController = asyncHandler(async (req, res) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim() : "";

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return apiError(
      res,
      400,
      "INVALID_EMAIL",
      "Please enter a valid email address.",
    );
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    // Do not reveal account existence or email delivery status.
    console.error("Password reset request failed:", error);
  }

  return res.json({
    message:
      "If an account with that email supports password recovery, a reset link will be sent shortly.",
  });
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};

  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return apiError(
      res,
      400,
      "INVALID_RESET_REQUEST",
      "Provide a valid reset token and a password between 8 and 128 characters.",
    );
  }

  try {
    await resetPassword(token, password);

    return res.json({
      message:
        "Your password has been reset successfully. Please sign in again.",
    });
  } catch (error) {
    if (error.status) {
      return apiError(
        res,
        error.status,
        error.code || "PASSWORD_RESET_FAILED",
        error.message,
      );
    }

    throw error;
  }
});
