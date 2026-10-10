-- Add email verification status to existing users.
-- Existing accounts remain verified so their login continues to work.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;

UPDATE users
SET email_verified = TRUE
WHERE email_verified IS NULL;

ALTER TABLE users
ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE users
ALTER COLUMN email_verified SET NOT NULL;

-- Store only hashed verification codes, never the raw codes.
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verification_codes_user_created_idx
ON email_verification_codes (user_id, created_at DESC);
