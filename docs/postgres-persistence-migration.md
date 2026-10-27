# PostgreSQL persistence migration plan

Status: schema foundation added; application adapter and production migration are **not yet complete**. Do not remove the production storage guard or send production traffic to local JSON storage.

## Target architecture

- Cloud SQL for PostgreSQL in the same region as Cloud Run, subject to data-residency and model availability decisions.
- `garageai_users`: account IDs, normalized unique usernames, existing scrypt password hashes.
- `garageai_garages`: one JSONB document per user. The current domain model remains JSON-shaped while persistence becomes transactional; this avoids a risky simultaneous domain rewrite.
- `garageai_sessions`: hashed session token, CSRF secret, owner, expiry and revocation state. Raw session cookies must never be stored.
- Application connections use a bounded pool, TLS/Cloud SQL connector or Cloud SQL Unix socket, least-privilege runtime identity, and Secret Manager for credentials if a password is used.
- Every garage read/write is scoped by authenticated `user_id`; session and garage changes commit transactionally. No process-local session map or container file is authoritative.

## Migration 001

File: `db/migrations/001_initial_postgres.sql`

The SQL creates the schema-migrations ledger, user/garage/session tables, a normalized unique username index, ownership foreign keys, JSON object validation and expiry indexes. It is intentionally additive and does not import or delete application data.

Apply only after a verified backup and from a migration identity with DDL permissions. The runtime service account should not have schema-owner privileges.

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

Do not run a migration against production data until the tool and its tests exist and a backup restore has been demonstrated.

## Required application changes before production

- Replace the synchronous in-memory methods currently used by `server.ts` with an asynchronous persistence interface. PostgreSQL calls are asynchronous; pretending they are synchronous is not acceptable.
- Remove `sessions: Map`, `loadSessions()`, and `persistSessions()` as authoritative stores. Read, renew, revoke and create sessions in PostgreSQL.
- Commit garage changes before returning successful HTTP responses; propagate storage failures as safe 5xx responses.
- Enforce per-user ownership in SQL and use transactions/optimistic concurrency or row locking for updates.
- Add PostgreSQL-backed integration tests for tenant isolation, concurrent writes, unique usernames, session lifecycle, transaction rollback, restart/multi-process behavior, JSON import and backup/restore.
- Keep `assertProductionStorageSafe` fail-closed until the configured PostgreSQL adapter is actually active and validated. An environment variable alone must not be treated as proof that a database is connected.

## Cloud Run rollout checklist

- [ ] Create Cloud SQL PostgreSQL in the selected region and enable automated backups / point-in-time recovery.
- [ ] Create a dedicated runtime service account and least-privilege Cloud SQL connectivity.
- [ ] Configure Cloud Run private IP or Cloud SQL connector/socket; use a bounded pool sized for maximum instances.
- [ ] Store connection configuration in Secret Manager where applicable.
- [ ] Apply migrations from a controlled one-off migration job, not every web instance at startup.
- [ ] Run migration dry-run, take a verified backup, import, compare row counts/digests, then test a restore.
- [ ] Deploy a canary revision with the database adapter; test auth, CRUD, logout/revocation, tenant isolation and restart/scale.
- [ ] Configure billing budget alerts, Cloud SQL connection/CPU/storage alerts, error-rate alerts and log redaction.
- [ ] Keep the old revision and a documented rollback plan until the smoke tests pass.
- [ ] Do not enable real-user traffic before all checks pass.

## Security notes

- Database backups contain personal data and must have restricted access and retention.
- Do not log SQL parameters containing credentials, session secrets or user payloads.
- Do not put production database credentials in repository files or CI variables exposed to pull-request code.
- Cloud SQL and Cloud Run resource creation, billing configuration and production smoke tests are separate operational steps; this repository change does not perform them.
