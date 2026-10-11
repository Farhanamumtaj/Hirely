
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../config/db.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../utils/tokens.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const refreshDays = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 30));

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
  res.clearCookie("ra_access", { ...cookieOptions(0), path: "/api" });
  res.clearCookie("ra_refresh", { ...cookieOptions(0), path: "/api/auth" });
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

  res.cookie("ra_refresh", refresh, cookieOptions(refreshDays * 86400000));

  return { user: safeUser(user) };
}

function serviceError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

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

export async function googleLogin(credential, res) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw serviceError(
      401,
      "GOOGLE_IDENTITY_INVALID",
      "Google account must have a verified email.",
    );
  }

  const existing = await pool.query(
    "SELECT * FROM users WHERE google_subject = $1",
    [payload.sub],
  );

  if (existing.rowCount) {
    return issueSession(existing.rows[0], res);
  }

  const email = payload.email.trim().toLowerCase();

  const emailMatch = await pool.query(
    "SELECT id FROM users WHERE normalized_email = $1",
    [email],
  );

  if (emailMatch.rowCount) {
    throw serviceError(
      409,
      "ACCOUNT_LINK_REQUIRED",
      "An account already uses this email. Sign in with that method first, then use account settings to link Google.",
    );
  }

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
}

export async function refreshSession(token, res) {
  if (!token) return null;

  const oldHash = hashRefreshToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
          "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1",
          [row.session_id],
        );
      }

      await client.query("COMMIT");
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

    res.cookie("ra_access", createAccessToken(row, row.session_id), {
      ...cookieOptions(15 * 60 * 1000),
      path: "/api",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("ra_refresh", next, cookieOptions(refreshDays * 86400000));

    return { user: safeUser(row) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function logout(sessionId, res, refresh) {
  if (sessionId) {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId],
    );
  }

  if (refresh) {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
      [hashRefreshToken(refresh)],
    );
  }

  clearAuthCookies(res);
}
