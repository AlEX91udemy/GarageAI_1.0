# GarageAI production cutover runbook

Use this runbook for the first real Cloud SQL deployment. Never put credentials in the repository, shell history, CI logs, or Cloudflare Assets.

## 1. Choose the target

Record the GCP project, region, Cloud SQL instance, database, runtime role, billing limits, data residency, and maximum Cloud Run instance count. Use the same region for Cloud SQL and Cloud Run. Enable automated backups and point-in-time recovery. Keep the web runtime identity separate from the schema migration identity.

## 2. Preserve legacy data

Copy `users.json`, `garage_store.json`, and `sessions.json` to a restricted read-only directory outside the repository. Keep the copy until reconciliation is complete. Do not upload it to tickets or chat.

## 3. Apply schema

Set `DATABASE_URL` only in the controlled migration shell or through Secret Manager, then run `npx tsx scripts/migrate-postgres.ts` with `DATABASE_SSL=true`. Verify schema versions 1 and 2. Keep `DATABASE_AUTO_MIGRATE=false` for the web runtime.

## 4. Dry-run and apply import

Run `npx tsx scripts/import-legacy-json.ts --source-dir=<restricted-copy>` and stop on conflicts or ownerless garages. Take and verify a Cloud SQL backup before applying. Then run the same command with `--apply`. Compare users, garages, collection counts, ownership, and canonical data digests with the reviewed dry-run.

## 5. Invalidate old sessions

Old session metadata appeared in historical runtime files, so run `npm run revoke:sessions` before public traffic. Users must sign in again.

## 6. Preflight and restore test

Run `npm run preflight:production` with `GARAGE_POSTGRES_READY` unset. Restore the backup into a separate database and run `npx tsx scripts/smoke-postgres.ts` there. Record restore time, row counts, and smoke-test output. Keep the restore target isolated from public traffic.

## 7. Canary deployment

Deploy a private Cloud Run revision with `DATABASE_URL` from Secret Manager, `DATABASE_SSL=true`, `DATABASE_AUTO_MIGRATE=false`, `GARAGE_POSTGRES_READY=true`, no `GARAGE_ALLOW_EPHEMERAL_STORAGE`, and `TRUSTED_PROXY_HOPS=1`. Verify registration, login, logout, CSRF rejection, tenant isolation, concurrent writes, restart, scale-out, `/api/health`, and model access. Keep public traffic at zero until all checks pass.

## 8. Traffic and rollback

Route a small percentage of traffic to the canary while watching error rate, latency, Cloud SQL connections, CPU, storage, and logs. Keep the previous revision available. Roll back by routing traffic to the previous revision; do not delete the database or source backup during the observation window.

## 9. Revoke keys and clean Git history

Revoke the exposed OpenRouter and Gemini keys in their provider consoles and create replacement secrets for the runtime service account. A sanitized history bundle is available at `C:\Users\user\Documents\ChatGPT\git-history-sanitized-GarageAI-20261029.bundle`. Coordinate with collaborators, archive old refs, rewrite every affected remote branch, force-push during an agreed window, and require collaborators to reclone.

## Release gate

Set `GARAGE_POSTGRES_READY=true` on the production revision only after provider key rotation, sanitized history review, migration/import, row reconciliation, backup/restore, session revocation, canary tests, monitoring, budget alerts, and rollback readiness are recorded.
