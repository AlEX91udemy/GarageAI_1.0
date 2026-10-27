-- Persistent, single-use email authentication challenges for multi-instance deployments.
ALTER TABLE garageai_users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS garageai_users_email_normalized_uq
  ON garageai_users (lower(btrim(email))) WHERE email IS NOT NULL;
ALTER TABLE garageai_users DROP CONSTRAINT IF EXISTS garageai_users_username_nonempty;
ALTER TABLE garageai_users
  ADD CONSTRAINT garageai_users_username_nonempty CHECK (length(btrim(username)) BETWEEN 1 AND 254);

CREATE TABLE IF NOT EXISTS garageai_email_auth_challenges (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES garageai_users(id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  expires_at_ms bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at_ms bigint,
  created_at_ms bigint NOT NULL,
  CONSTRAINT garageai_email_auth_challenges_attempts CHECK (attempts BETWEEN 0 AND 5),
  CONSTRAINT garageai_email_auth_challenges_expiry CHECK (expires_at_ms > created_at_ms)
);
CREATE INDEX IF NOT EXISTS garageai_email_auth_challenges_user_idx
  ON garageai_email_auth_challenges (user_id, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS garageai_email_auth_challenges_expiry_idx
  ON garageai_email_auth_challenges (expires_at_ms);

INSERT INTO garageai_schema_migrations (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;
