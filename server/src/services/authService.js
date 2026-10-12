import { sendPasswordResetEmail as deliverPasswordResetEmail } from "./emailService.js";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../config/db.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../utils/tokens.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const refreshDays = Math.max(
  1,
  Number(process.env.REFRESH_TOKEN_DAYS || 30),
);

export const safeUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  createdAt: user.created_at,
});

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/api/auth",
    maxAge,
  };
}

export function clearAuthCookies(res) {
  res.clearCookie("ra_access", {
    ...cookieOptions(0),
    path: "/api",
  });

  res.clearCookie("ra_refresh", {
    ...cookieOptions(0),
    path: "/api/auth",
  });
}

async function issueSession(user, res) {
  const refresh = createRefreshToken();
  const expiresAt = new Date(Date.now() + refreshDays * 86400000);

  const { rows } = await pool.query(
    `INSERT INTO auth_sessions
       (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [user.id, hashRefreshToken(refresh), expiresAt],
  );

  const sessionId = rows[0].id;

  res.cookie("ra_access", createAccessToken(user, sessionId), {
    ...cookieOptions(15 * 60 * 1000),
    path: "/api",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(
    "ra_refresh",
    refresh,
    cookieOptions(refreshDays * 86400000),
  );

  return { user: safeUser(user) };
}

function serviceError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

// -----------------------------------------------------------------------------
// Password reset helpers
// -----------------------------------------------------------------------------

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function sendPasswordResetEmail(email, resetUrl) {
  await deliverPasswordResetEmail({
    to: email,
    resetUrl,
  });
}

export async function requestPasswordReset(emailInput) {
  const email = emailInput.trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, email
     FROM users
     WHERE normalized_email = $1
       AND password_hash IS NOT NULL
     LIMIT 1`,
    [email],
  );

  // Do not reveal whether an account exists or supports password recovery.
  if (!result.rowCount) return;

  const user = result.rows[0];
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);

  // Invalidate earlier reset links for this user.
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [user.id],
  );

  await pool.query(
    `INSERT INTO password_reset_tokens
       (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [user.id, tokenHash],
  );

  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL`,
      [tokenHash],
    );

    throw new Error("CLIENT_URL is not configured.");
  }

  const baseUrl = clientUrl.replace(/\/+$/, "");
  const resetUrl =
    `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    // Do not leave a usable token behind when email delivery fails.
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL`,
      [tokenHash],
    );

    throw error;
  }
}

export async function resetPassword(token, newPassword) {
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    throw serviceError(
      400,
      "RESET_TOKEN_INVALID",
      "This password reset link is invalid or expired. Request a new one.",
    );
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    throw serviceError(
      400,
      "INVALID_PASSWORD",
      "Your password must be between 8 and 128 characters.",
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const result = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [hashResetToken(token)],
    );

    const reset = result.rows[0];

    if (!reset) {
      throw serviceError(
        400,
        "RESET_TOKEN_INVALID",
        "This password reset link is invalid or expired. Request a new one.",
      );
    }

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, reset.user_id],
    );

    // Mark the selected token as consumed.
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [reset.id],
    );

    // Invalidate every other outstanding reset link for this user.
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [reset.user_id],
    );

    // Revoke existing sessions so the user must sign in again.
    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [reset.user_id],
    );

    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------------------------
// Registration and password login
// -----------------------------------------------------------------------------

export async function register(input) {
  const email = input.email.trim().toLowerCase();
  const hash = await bcrypt.hash(input.password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users
         (full_name, email, normalized_email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [input.fullName, email, email, hash],
    );

    return {
      user: safeUser(result.rows[0]),
      message: "Account created successfully. Please sign in.",
    };
  } catch (error) {
    if (
      error.code === "23505" &&
      (error.constraint?.includes("email") ||
        error.detail?.includes("email"))
    ) {
      throw Object.assign(
        new Error("This email is already registered. Please log in instead."),
        { status: 409, code: "EMAIL_ALREADY_REGISTERED" },
      );
    }

    throw error;
  }
}

export async function login(input, res) {
  const email = input.email.trim().toLowerCase();

  const { rows } = await pool.query(
    `SELECT *
     FROM users
     WHERE normalized_email = $1
     LIMIT 1`,
    [email],
  );

  const user = rows[0];

  const passwordMatches = user?.password_hash
    ? await bcrypt.compare(input.password, user.password_hash)
    : false;

  if (!passwordMatches) return null;

  return issueSession(user, res);
}

// -----------------------------------------------------------------------------
// Google login
// -----------------------------------------------------------------------------

export async function googleLogin(credential, res) {
  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch {
    throw serviceError(
      401,
      "GOOGLE_IDENTITY_INVALID",
      "Google sign-in could not verify your identity. Please try again.",
    );
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw serviceError(
      401,
      "GOOGLE_IDENTITY_INVALID",
      "Google account must have a verified email.",
    );
  }

  const email = payload.email.trim().toLowerCase();

  const existingGoogle = await pool.query(
    "SELECT * FROM users WHERE google_subject = $1",
    [payload.sub],
  );

  if (existingGoogle.rowCount) {
    return issueSession(existingGoogle.rows[0], res);
  }

  const emailMatch = await pool.query(
    `SELECT *
     FROM users
     WHERE normalized_email = $1
     LIMIT 1`,
    [email],
  );

  if (emailMatch.rowCount) {
    const user = emailMatch.rows[0];

    if (!user.email_verified) {
      throw serviceError(
        409,
        "ACCOUNT_LINK_REQUIRED",
        "This email already belongs to a Hirely account. Sign in using your existing method to link Google securely.",
      );
    }

    try {
      const linked = await pool.query(
        `UPDATE users
         SET google_subject = $1
         WHERE id = $2
           AND google_subject IS NULL
           AND normalized_email = $3
           AND email_verified = TRUE
         RETURNING *`,
        [payload.sub, user.id, email],
      );

      if (linked.rowCount) {
        return issueSession(linked.rows[0], res);
      }
    } catch (error) {
      if (error.code === "23505") {
        throw serviceError(
          409,
          "GOOGLE_ACCOUNT_ALREADY_LINKED",
          "This Google account or email is already linked to another Hirely account. Please sign in using your existing account.",
        );
      }

      throw error;
    }

    throw serviceError(
      409,
      "ACCOUNT_LINK_REQUIRED",
      "This account could not be linked automatically. Please sign in using your existing method first.",
    );
  }

  try {
    const created = await pool.query(
      `INSERT INTO users
         (full_name, email, normalized_email, google_subject, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [
        (payload.name || email.split("@")[0]).slice(0, 120),
        email,
        email,
        payload.sub,
      ],
    );

    return issueSession(created.rows[0], res);
  } catch (error) {
    if (error.code === "23505") {
      throw serviceError(
        409,
        "ACCOUNT_LINK_CONFLICT",
        "An account was created or linked concurrently. Please try signing in again.",
      );
    }

    throw error;
  }
}

// -----------------------------------------------------------------------------
// Refresh-token rotation
// -----------------------------------------------------------------------------

export async function refreshSession(token, res) {
  if (!token) return null;

  const oldHash = hashRefreshToken(token);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const found = await client.query(
      `SELECT
         s.id AS session_id,
         s.user_id,
         s.expires_at,
         u.*
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL
       FOR UPDATE OF s`,
      [oldHash],
    );

    const row = found.rows[0];

    if (!row || new Date(row.expires_at) <= new Date()) {
      if (row) {
        await client.query(
          `UPDATE auth_sessions
           SET revoked_at = NOW()
           WHERE id = $1`,
          [row.session_id],
        );
      }

      await client.query("COMMIT");
      transactionOpen = false;
      return null;
    }

    const next = createRefreshToken();

    await client.query(
      `UPDATE auth_sessions
       SET refresh_token_hash = $1,
           last_used_at = NOW(),
           expires_at = $2
       WHERE id = $3`,
      [
        hashRefreshToken(next),
        new Date(Date.now() + refreshDays * 86400000),
        row.session_id,
      ],
    );

    await client.query("COMMIT");
    transactionOpen = false;

    res.cookie("ra_access", createAccessToken(row, row.session_id), {
      ...cookieOptions(15 * 60 * 1000),
      path: "/api",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(
      "ra_refresh",
      next,
      cookieOptions(refreshDays * 86400000),
    );

    return { user: safeUser(row) };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logout(sessionId, res, refresh) {
  if (sessionId) {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE id = $1
         AND revoked_at IS NULL`,
      [sessionId],
    );
  }

  if (refresh) {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE refresh_token_hash = $1
         AND revoked_at IS NULL`,
      [hashRefreshToken(refresh)],
    );
  }

  clearAuthCookies(res);
}
