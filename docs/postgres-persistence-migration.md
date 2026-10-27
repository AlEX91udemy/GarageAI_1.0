# PostgreSQL persistence migration plan

Status: PostgreSQL schema, async repository primitives, session persistence selection, revision-checked garage writes, and CI integration tests are implemented on the feature branch. **The legacy JSON importer, end-to-end cutover validation, and real Cloud SQL smoke tests are not complete.** Keep the production readiness gate closed until those are verified.

## Target architecture

- Cloud SQL for PostgreSQL in the same region as Cloud Run, subject to data-residency and model availability decisions.
- `garageai_users`: account IDs, normalized unique usernames, existing scrypt password hashes.
- `garageai_garages`: one JSONB document per user. The current domain model remains JSON-shaped while persistence becomes transactional; this avoids a risky simultaneous domain rewrite.
- `garageai_sessions`: hashed session token, CSRF secret, owner, expiry and revocation state. Raw session cookies must never be stored.
- Application connections use a bounded pool, TLS/Cloud SQL connector or Cloud SQL Unix socket, least-privilege runtime identity, and Secret Manager for credentials if a password is used.
- Every garage read/write is scoped by authenticated `user_id`; session and garage changes commit transactionally. No process-local session map or container file is authoritative.

## Migration 001

File: `db/migrations/001_initial_postgres.sql`

The SQL creates the schema-migrations ledger, user/garage/session tables, a normalized unique username index, ownership foreign keys, JSON object validation, expiry indexes, and a garage revision for optimistic concurrency. It is intentionally additive and does not import or delete application data.

Apply with `DATABASE_URL=... npx tsx scripts/migrate-postgres.ts` from a controlled migration environment after a verified backup. The runtime service account should not have schema-owner privileges. Production app startup verifies migration 001 but does not run DDL by default; `DATABASE_AUTO_MIGRATE=true` is an explicit override and should not be used for normal production rollout.

## JSON import requirements

The existing JSON layout may contain:
- `users.json`: users and scrypt password hashes.
- `garage_store.json`: per-user garages under `garages`; an old root-level garage can lack a provable owner.
- `sessions.json`: session hashes and CSRF secrets.

The import tool must be dry-run by default and idempotent. It must:
1. Validate every record and report counts/errors without printing password hashes, session hashes, CSRF secrets, VINs, receipts, or garage payloads.
2. Import users before garages and sessions, preserving user IDs and password hashes.
3. Import only garages whose `user_id` exists in the imported user set.
4. Never auto-assign ownerless legacy garage data. Require a separately reviewed manual ownership mapping or quarantine it.
5. Import only unexpired, non-revoked sessions; use conflict-safe writes and preserve expiration/revocation values.
6. Refuse to overwrite conflicting destination users/garages by default. A deliberate resume mode may skip byte-for-byte identical records but must fail on mismatches.
7. Verify row counts and per-user canonical data digests before cutover.
8. Keep source files read-only until the database has passed restart, multi-instance, isolation and backup/restore tests. Never print secrets or full record contents.

## Legacy JSON importer

File: `scripts/import-legacy-json.ts`

The importer is dry-run by default and requires `--apply` for writes. It reads `users.json`, `garage_store.json`, and optional `sessions.json` from `data/` (override with `--source-dir=/path/to/data`). It requires migration 001 to already exist.

Example sequence:

```bash
# 1. Run schema migration from a controlled environment.
DATABASE_URL="$DATABASE_URL" npx tsx scripts/migrate-postgres.ts

# 2. Inspect counts/conflicts; this performs no row writes.
DATABASE_URL="$DATABASE_URL" npx tsx scripts/import-legacy-json.ts --source-dir=./data

# 3. After reviewing a verified backup and a clean dry run, apply transactionally.
DATABASE_URL="$DATABASE_URL" npx tsx scripts/import-legacy-json.ts --source-dir=./data --apply
```

The importer refuses conflicting user IDs, normalized usernames, garage contents, or session token hashes and wraps writes in one transaction. It preserves scrypt password hashes and imports only unexpired, non-revoked sessions. Garage/session records whose owner is absent from the imported user list are skipped and counted; ownerless root-level legacy garage data is never assigned automatically. It prints counts only, not account hashes, session tokens, CSRF secrets, VINs, receipts, or garage payloads.

After reviewing the import and proving backup/restore, set `GARAGE_POSTGRES_READY=true` only on a private canary revision so HTTP smoke tests can run. Keep public traffic disabled until auth/session lifecycle, tenant isolation, CRUD, concurrency, restart/scale, and model calls pass. Set the flag on the production service only after that validation. If any conflict is reported, stop and reconcile ownership/data manually; do not delete destination records to force an import.

Do not run a migration against production data until the tool and its tests exist and a backup restore has been demonstrated.

## Required application changes before production

- Finish the migration/import and cutover verification before enabling `GARAGE_POSTGRES_READY=true` in production.
- The async PostgreSQL repository is selected by `DATABASE_URL`; PostgreSQL-backed auth/session reads, writes, renewal and revocation are now wired into `server.ts`. The in-memory session map is used only in local JSON mode.
- Garage mutations are committed before success responses. PostgreSQL uses a per-garage revision check; stale writes are rejected with HTTP 409 rather than overwriting newer data.
- Keep the startup guard fail-closed: production requires both `DATABASE_URL` and `GARAGE_POSTGRES_READY=true`. Set the readiness flag only after verified migration/import, backup/restore and smoke tests.
- Add PostgreSQL-backed integration tests for tenant isolation, concurrent writes, unique usernames, session lifecycle, transaction rollback, restart/multi-process behavior, JSON import and backup/restore.
- Keep `assertProductionStorageSafe` fail-closed until the configured PostgreSQL adapter is actually active and validated. An environment variable alone must not be treated as proof that a database is connected.

## Real Cloud SQL smoke test

After schema migration and import verification, but before routing real traffic, run the smoke test against the intended Cloud SQL database:

```bash
DATABASE_URL="$DATABASE_URL" npx tsx scripts/smoke-postgres.ts
```

If TLS is required for the selected connection path, also set `DATABASE_SSL=true`. The script creates temporary smoke-test users and records, checks tenant isolation, revision conflict handling, and session rotation/revocation, then deletes its test users. Run it only against the intended database and verify the logs show a pass before opening the production gate.

## Cloud Run rollout checklist

- [ ] Create Cloud SQL PostgreSQL in the selected region and enable automated backups / point-in-time recovery.
- [ ] Create a dedicated runtime service account and least-privilege Cloud SQL connectivity.
- [ ] Configure Cloud Run private IP or Cloud SQL connector/socket; use a bounded pool sized for maximum instances.
- [ ] Store connection configuration in Secret Manager where applicable.
- [ ] Apply migrations from a controlled one-off migration job using `npx tsx scripts/migrate-postgres.ts`, not every web instance at startup.
- [ ] Run migration dry-run, take a verified backup, import, compare row counts/digests, then test a restore.
- [ ] Keep `GARAGE_POSTGRES_READY` unset while migration/import is incomplete; after successful validation, set it to `true` and deploy a canary revision.
- [ ] Test auth, CRUD, logout/revocation, tenant isolation, stale-write conflicts and restart/scale.
- [ ] Configure billing budget alerts, Cloud SQL connection/CPU/storage alerts, error-rate alerts and log redaction.
- [ ] Keep the old revision and a documented rollback plan until the smoke tests pass.
- [ ] Do not enable real-user traffic before all checks pass.

## Security notes

- Database backups contain personal data and must have restricted access and retention.
- Do not log SQL parameters containing credentials, session secrets or user payloads.
- Do not put production database credentials in repository files or CI variables exposed to pull-request code.
- Cloud SQL and Cloud Run resource creation, billing configuration and production smoke tests are separate operational steps; this repository change does not perform them.
