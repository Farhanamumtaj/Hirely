
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "../config/db.js";
import { sendVerificationEmail } from "./emailService.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../utils/tokens.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const refreshDays = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 30));
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

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

function codeHash(code) {
  const secret = process.env.EMAIL_CODE_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_CODE_SECRET is missing or too short.");
  }

  return createHmac("sha256", secret).update(code).digest("hex");
}

function serviceError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

async function createAndSendVerificationCode(user) {
  const latest = await pool.query(
    `SELECT created_at
     FROM email_verification_codes
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id],
  );

  if (latest.rowCount) {
    const elapsed = Date.now() - new Date(latest.rows[0].created_at).getTime();

    if (elapsed < CODE_RESEND_COOLDOWN_MS) {
      throw serviceError(
        429,
        "RESEND_COOLDOWN",
        "Please wait 60 seconds before requesting another code.",
      );
    }
  }

  const code = String(randomInt(100000, 1000000));

  // Invalidate older codes before storing the new one.
  await pool.query(
    `UPDATE email_verification_codes
     SET consumed_at = NOW()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [user.id],
  );

  await pool.query(
    `INSERT INTO email_verification_codes
      (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [
      user.id,
      codeHash(code),
      new Date(Date.now() + CODE_EXPIRY_MS),
    ],
  );

  try {
    await sendVerificationEmail(user.email, code);
  } catch (error) {
    // Allow the user to retry immediately if email delivery failed.
    await pool.query(
      `UPDATE email_verification_codes
       SET consumed_at = NOW()
       WHERE user_id = $1
         AND code_hash = $2
         AND consumed_at IS NULL`,
      [user.id, codeHash(code)],
    );

    throw serviceError(
      503,
      "EMAIL_DELIVERY_FAILED",
      "We couldn't send your verification email. Please try again shortly.",
    );
  }
}

export async function register(input) {
  const email = input.email.trim().toLowerCase();
  const hash = await bcrypt.hash(input.password, 12);

  const existing = await pool.query(
    `SELECT id, email_verified
     FROM users
     WHERE normalized_email = $1
     LIMIT 1`,
    [email],
  );

  if (existing.rowCount) {
    if (!existing.rows[0].email_verified) {
      throw serviceError(
        409,
        "EMAIL_NOT_VERIFIED",
        "This email is registered but not verified. Please request a new verification code.",
      );
    }

    throw serviceError(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "This email is already registered. Please log in instead.",
    );
  }

  let user;

  try {
    const result = await pool.query(
      `INSERT INTO users
        (full_name, email, normalized_email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *`,
      [input.fullName, email, email, hash],
    );

    user = result.rows[0];
  } catch (error) {
    // Handle two registration requests racing to create the same email.
    if (error.code === "23505") {
      throw serviceError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "This email is already registered. Please log in instead.",
      );
    }

    throw error;
  }

  await createAndSendVerificationCode(user);

  return {
    requiresEmailVerification: true,
    email: user.email,
    message: "Verification code sent. Please check your email.",
  };
}

export async function verifyEmail(input, res) {
  const email = input.email.trim().toLowerCase();
  const client = await pool.connect();

  let user;
  let failure;

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT *
       FROM users
       WHERE normalized_email = $1
       FOR UPDATE`,
      [email],
    );

    user = userResult.rows[0];

    if (!user) {
      failure = serviceError(
        400,
        "INVALID_VERIFICATION_CODE",
        "The verification code is invalid or expired.",
      );
    } else if (user.email_verified) {
      failure = serviceError(
        409,
        "EMAIL_ALREADY_VERIFIED",
        "This email is already verified. Please log in.",
      );
    } else {
      const codeResult = await client.query(
        `SELECT *
         FROM email_verification_codes
         WHERE user_id = $1 AND consumed_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [user.id],
      );

      const record = codeResult.rows[0];

      if (!record || new Date(record.expires_at) <= new Date()) {
        failure = serviceError(
          400,
          "INVALID_VERIFICATION_CODE",
          "The verification code is invalid or expired. Request a new code.",
        );
      } else if (record.attempts >= MAX_CODE_ATTEMPTS) {
        failure = serviceError(
          429,
          "TOO_MANY_CODE_ATTEMPTS",
          "Too many incorrect attempts. Please request a new code.",
        );
      } else {
        const suppliedHash = Buffer.from(codeHash(input.code), "hex");
        const storedHash = Buffer.from(record.code_hash, "hex");

        const matches =
          suppliedHash.length === storedHash.length &&
          timingSafeEqual(suppliedHash, storedHash);

        if (!matches) {
          await client.query(
            `UPDATE email_verification_codes
             SET attempts = attempts + 1
             WHERE id = $1`,
            [record.id],
          );

          failure = serviceError(
            400,
            "INVALID_VERIFICATION_CODE",
            "The verification code is incorrect.",
          );
        } else {
          await client.query(
            `UPDATE email_verification_codes
             SET consumed_at = NOW()
             WHERE user_id = $1 AND consumed_at IS NULL`,
            [user.id],
          );

          const verified = await client.query(
            `UPDATE users
             SET email_verified = TRUE, updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [user.id],
          );

          user = verified.rows[0];
        }
      }
    }

    // Commit even when an incorrect code increments the attempt counter.
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (failure) throw failure;

  return issueSession(user, res);
}

export async function resendVerification(emailInput) {
  const email = emailInput.trim().toLowerCase();

  const result = await pool.query(
    `SELECT *
     FROM users
     WHERE normalized_email = $1
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];

  if (!user) {
    throw serviceError(
      404,
      "ACCOUNT_NOT_FOUND",
      "No account was found for this email. Please register first.",
    );
  }

  if (user.email_verified) {
    throw serviceError(
      409,
      "EMAIL_ALREADY_VERIFIED",
      "This email is already verified. Please log in.",
    );
  }

  await createAndSendVerificationCode(user);

  return {
    message: "A new verification code has been sent to your email.",
  };
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

  if (!user.email_verified) {
    throw serviceError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email before logging in.",
    );
  }

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
