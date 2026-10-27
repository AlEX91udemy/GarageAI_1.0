-- GarageAI PostgreSQL schema migration 001.
-- Apply with a migration runner while holding an application deployment lock.
-- Safe to re-run: all DDL uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS garageai_schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garageai_users (
  id text PRIMARY KEY,
  username text NOT NULL,
  username_normalized text GENERATED ALWAYS AS (lower(btrim(username))) STORED,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garageai_users_username_nonempty CHECK (length(btrim(username)) BETWEEN 1 AND 32)
);

CREATE UNIQUE INDEX IF NOT EXISTS garageai_users_username_normalized_uq
  ON garageai_users (username_normalized);

CREATE TABLE IF NOT EXISTS garageai_garages (
  user_id text PRIMARY KEY REFERENCES garageai_users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 0,
  CONSTRAINT garageai_garages_revision_nonnegative CHECK (revision >= 0),
  CONSTRAINT garageai_garages_data_object CHECK (jsonb_typeof(data) = 'object')
);

ALTER TABLE garageai_garages ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'garageai_garages_revision_nonnegative'
      AND conrelid = 'garageai_garages'::regclass
  ) THEN
    ALTER TABLE garageai_garages
      ADD CONSTRAINT garageai_garages_revision_nonnegative CHECK (revision >= 0);
  END IF;
END;
$migration$;

CREATE TABLE IF NOT EXISTS garageai_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id text NOT NULL REFERENCES garageai_users(id) ON DELETE CASCADE,
  csrf_secret text NOT NULL,
  created_at_ms bigint NOT NULL,
  expires_at_ms bigint NOT NULL,
  revoked_at_ms bigint,
  CONSTRAINT garageai_sessions_expiry_after_creation CHECK (expires_at_ms > created_at_ms)
);

CREATE INDEX IF NOT EXISTS garageai_sessions_user_idx
  ON garageai_sessions (user_id);

CREATE INDEX IF NOT EXISTS garageai_sessions_expiry_idx
  ON garageai_sessions (expires_at_ms)
  WHERE revoked_at_ms IS NULL;

INSERT INTO garageai_schema_migrations (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;
