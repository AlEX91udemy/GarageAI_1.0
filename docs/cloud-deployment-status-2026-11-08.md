# Cloud deployment status — 2026-11-08

## Update — 2026-11-11

- Secret Manager access for the migration operator was granted on `garageai-database-url` without exposing the secret value.
- Dry-run import completed with 18 users and 1 garage to insert, zero conflicts, zero orphan garages, and zero orphan sessions.
- On-demand backup `1794418318391` completed successfully immediately before import.
- Legacy JSON import completed transactionally and post-import verification passed. The database now contains 18 imported users and 18 garage rows.
- PostgreSQL preflight passed at schema version 2 with zero active sessions. A new registration policy requires migration 003 before the next production rollout.
- PostgreSQL smoke, persistence integration, and HTTP integration passed for tenant isolation, CSRF, durable CRUD, restart, logout, optimistic concurrency, and session lifecycle.
- Cloud SQL restore rehearsal completed successfully in a temporary PostgreSQL 16 instance. The temporary instance was deleted after the rehearsal.
- Cloud Run canary revision `garageai-web-canary-00006-dqm` is serving 100% of canary traffic from image `canary-20261111-v1`. Three health probes returned `status=ok` and `storageProvider=postgresql` with no recent Cloud Run ERROR logs.
- Follow-up observation on 2026-11-12 returned three additional health responses with HTTP 200 and PostgreSQL storage; measured latency was 388–636 ms and no Cloud Run ERROR logs were present since midnight UTC.
- Cloudflare Worker `garageai-1-0` latest deployment remains version `cc7100e9-aa51-4509-94ad-fc2531cf240f` from 2026-11-08 and continues to point at the canary origin.
- Catalog release policy selected: keep configurations without authoritative evidence in `provisional` status and expose that status in recommendations.
- Live email smoke completed on 2026-11-12. Resend's dashboard reports `garageai.site` as verified and ready to send; Resend accepted direct production sends with HTTP 200, and the production `/api/auth/email/request-code` flow returned HTTP 200 for the imported email account. Inbox receipt was not independently confirmed through the connected Gmail account during this run.
- The Resend API key is restricted to sending and cannot list domain status. DNS lookup currently finds no TXT or DKIM record for `garageai.site`, so Resend domain verification requires DNS configuration before another email smoke attempt.
- `garageai.site` is delegated to Cloudflare (`anna.ns.cloudflare.com`, `peyton.ns.cloudflare.com`); Spaceship is the registrar and is not the authoritative DNS editor for these records.
- Cloudflare DNS was opened in the authenticated browser session. Resend now reports `garageai.site` as `Verified` and ready to send. Public DNS checks confirm the DKIM TXT and `send` CNAME; the optional `resend` Forge CNAME and DMARC record are still absent from the authoritative Cloudflare response and should be added if Resend continues to request them.
- The authenticated Cloudflare dashboard is available in the local browser, but the Resend dashboard is not signed in and the Cloudflare token available to Wrangler has no DNS write permission. No DNS record was fabricated or changed.
- Remaining release gates are the short production observation window and authoritative confirmation of the legacy bundle source. Optional Resend Forge/DMARC records remain a DNS hardening item.

Estimated project readiness: **not releasable yet**. The previous canary evidence predates the email-verification registration change. Remaining work includes migration 003, HTTP/JSON/PostgreSQL auth tests, trusted proxy validation, production mailbox receipt, a new CI run on the final SHA, and observation after rollout.

## Completed

- Cloudflare Worker `garageai-1-0` was deployed from the current repository build.
- Worker secret `API_ORIGIN` now points to the new Cloud Run canary service.
- Cloud Run canary `garageai-web-canary` is running in project `garage-ai-512223`, region `europe-west1`.
- The canary uses Cloud SQL instance `garageai-postgres` through the Cloud SQL socket, Secret Manager for `DATABASE_URL`, and a dedicated runtime service account.
- Cloud SQL schema preflight passed at version 2. Automated backups and point-in-time recovery are enabled; a pre-canary backup was created. Migration 003 is required before the next rollout because the registration policy now stores email verification state.
- Authenticated smoke tests passed for health, registration, protected routes, CRUD, and tenant isolation.

## Outstanding

- The imported legacy bundle is present in this checkout and passed dry-run/reconciliation checks; its origin from the live working environment is not independently confirmed.
- Resend secrets are configured in Secret Manager and mounted by Cloud Run. Resend now reports `garageai.site` as verified; direct production send and email-code request both returned HTTP 200.
- The separate-instance restore rehearsal and cleanup are complete for backup `1794418318391`.
- Production observation is still required after DNS verification and a successful real email-code flow.
- The previous `garage-ai` Cloud Run service remains deployed for rollback; it is no longer the Worker API origin.
