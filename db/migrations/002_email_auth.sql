-- GarageAI PostgreSQL schema migration 002: email-based authentication.
-- Existing accounts remain valid; email is nullable until a user registers or links it.

ALTER TABLE garageai_users
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS garageai_users_email_normalized_uq
  ON garageai_users (lower(btrim(email)))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS garageai_email_login_codes (
  email_normalized text PRIMARY KEY,
  user_id text NOT NULL REFERENCES garageai_users(id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  expires_at_ms bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  sent_at_ms bigint NOT NULL,
  CONSTRAINT garageai_email_login_codes_attempts_nonnegative CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS garageai_email_login_codes_expiry_idx
  ON garageai_email_login_codes (expires_at_ms);

INSERT INTO garageai_schema_migrations (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;
