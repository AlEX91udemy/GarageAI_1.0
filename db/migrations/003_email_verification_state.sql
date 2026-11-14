-- Registration policy: new email accounts remain pending until the code is verified.
-- The legacy backfill is guarded so rerunning startup migrations never promotes a
-- newly registered pending account to verified.
DO $migration$
BEGIN
  ALTER TABLE garageai_users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
  IF NOT EXISTS (SELECT 1 FROM garageai_schema_migrations WHERE version = 3) THEN
    UPDATE garageai_users
    SET email_verified_at = created_at
    WHERE email IS NOT NULL AND email_verified_at IS NULL;
    INSERT INTO garageai_schema_migrations (version) VALUES (3);
  END IF;
END;
$migration$;
