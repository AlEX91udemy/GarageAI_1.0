# Cloud deployment status — 28.10.2026

## Repository change applied

The email-code authentication implementation is committed on `codex/email-code-authentication` (`a8a6bc3`). It includes the user email field, PostgreSQL and local development challenge persistence, Resend integration, expiry, attempt limits, IP/email rate limits, one-time verification, API helpers, and the `AuthGate` UI.

Verification completed locally:

- `npm run lint`
- `npm test -- --run` — 22 test files, 128 tests
- `npm run build`

## Cloudflare

- Worker: `garageai-1-0`
- Account: `373ffb2da5bfc40fc40779da44950ff5`
- Public URL: `https://garageai-1-0.sambur91.workers.dev/`
- Existing secret: `API_ORIGIN`
- Manual publish command from the repository root: `npm run cloudflare:deploy`

The public health check currently responds with HTTP 200. A successful Wrangler deployment or health check confirms the Worker publication only; it does not confirm Cloud Run API persistence or email delivery.

## Google Cloud / Cloud Run

The active local gcloud account is `konstsim90@gmail.com`, with the configured project `garageai-512320`. The project and the historical `garage-ai-512223` reference must not be mixed.

The web service must not be deployed as production until all of these are complete:

1. Cloud SQL PostgreSQL exists in the intended region.
2. Migrations 001 and 002 are applied by a controlled migration identity.
3. Legacy JSON import, row counts, ownership checks, backup, and restore have passed.
4. Runtime secrets are in Secret Manager (`DATABASE_URL` or approved Cloud SQL connection path, Resend secrets, and AI keys).
5. Cloud Run runtime IAM/OIDC and session/tenant smoke tests pass.
6. Only then set `GARAGE_POSTGRES_READY=true`.

The application intentionally refuses production startup without this gate. Setting `GARAGE_ALLOW_EPHEMERAL_STORAGE=true` would only bypass the safety check and is not an acceptable production deployment.

## Next cloud actions

1. Confirm the target Google Cloud project with the owner.
2. Create/configure Cloud SQL and Secret Manager, then run the migration and restore checks.
3. Deploy a private Cloud Run canary and verify `/api/health`, login/session lifecycle, tenant isolation, and restart behavior.
4. Set Cloudflare `API_ORIGIN` to the verified Cloud Run URL and repeat the Worker smoke tests.
