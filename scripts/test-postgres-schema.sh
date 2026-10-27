#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=garageai_test}"
: "${PGDATABASE:=garageai_test}"
: "${PGPASSWORD:?PGPASSWORD must be set for the disposable CI database}"

export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

# The migration must support a pre-existing garage table from before the revision column.
psql -v ON_ERROR_STOP=1 -f db/migrations/001_initial_postgres.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/002_email_auth.sql
psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE garageai_garages DROP CONSTRAINT IF EXISTS garageai_garages_revision_nonnegative;
ALTER TABLE garageai_garages DROP COLUMN IF EXISTS revision;
SQL
psql -v ON_ERROR_STOP=1 -f db/migrations/001_initial_postgres.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/002_email_auth.sql

# A second re-apply must be idempotent and retain the revision guard.
psql -v ON_ERROR_STOP=1 -f db/migrations/001_initial_postgres.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/002_email_auth.sql
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'garageai_garages_revision_nonnegative'
      AND conrelid = 'garageai_garages'::regclass
  ) THEN
    RAISE EXCEPTION 'revision constraint missing after upgrade';
  END IF;
END;
$migration$;
SQL

psql -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
INSERT INTO garageai_users (id, username, password_hash, email)
VALUES ('ci-user-a', 'GarageAI-CI', 'test-only-scrypt-placeholder', 'ci-user-a@example.test');

INSERT INTO garageai_garages (user_id, data)
VALUES ('ci-user-a', '{"vehicles":[{"id":"car-a"}]}'::jsonb);

INSERT INTO garageai_sessions (token_hash, user_id, csrf_secret, created_at_ms, expires_at_ms)
VALUES (repeat('a', 64), 'ci-user-a', 'ci-only-csrf', 1000, 2000);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'garageai_rate_limits') THEN
    RAISE EXCEPTION 'shared rate-limit table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'garageai_rate_limits_count_nonnegative'
      AND conrelid = 'garageai_rate_limits'::regclass
  ) THEN
    RAISE EXCEPTION 'rate-limit counter constraint missing';
  END IF;
  IF (SELECT count(*) FROM garageai_schema_migrations WHERE version = 1) <> 1 THEN
    RAISE EXCEPTION 'migration ledger must contain exactly one row for version 1';
  END IF;
  IF (SELECT count(*) FROM garageai_schema_migrations WHERE version = 2) <> 1 THEN
    RAISE EXCEPTION 'migration ledger must contain exactly one row for version 2';
  END IF;
  IF (SELECT count(*) FROM garageai_users WHERE email = 'ci-user-a@example.test') <> 1 THEN
    RAISE EXCEPTION 'email column missing or not persisted';
  END IF;
  IF (SELECT count(*) FROM garageai_garages WHERE user_id = 'ci-user-a') <> 1 THEN
    RAISE EXCEPTION 'garage row missing';
  END IF;
  IF (SELECT count(*) FROM garageai_sessions WHERE user_id = 'ci-user-a') <> 1 THEN
    RAISE EXCEPTION 'session row missing';
  END IF;

  BEGIN
    INSERT INTO garageai_users (id, username, password_hash)
    VALUES ('ci-user-duplicate', ' garageai-ci ', 'test-only');
    RAISE EXCEPTION 'normalized duplicate username unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO garageai_users (id, username, password_hash, email)
    VALUES ('ci-user-email-duplicate', 'ci-email-duplicate', 'test-only', 'CI-USER-A@example.test');
    RAISE EXCEPTION 'normalized duplicate email unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO garageai_users (id, username, password_hash)
  VALUES ('ci-user-b', 'GarageAI-CI-B', 'test-only');

  BEGIN
    INSERT INTO garageai_garages (user_id, data)
    VALUES ('ci-user-b', '[]'::jsonb);
    RAISE EXCEPTION 'non-object garage JSON unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO garageai_garages (user_id, data)
    VALUES ('ci-user-missing', '{}'::jsonb);
    RAISE EXCEPTION 'garage with unknown owner unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END $$;
ROLLBACK;
SQL

echo "PostgreSQL schema integration checks passed."
