# Release evidence: 2026-11-14 (updated 2026-11-17)

## Current deployed state

- Cloud Run web service `garageai-web-canary` is serving revision `garageai-web-canary-00023-n8r` at 100% traffic.
- The current image was built as `europe-west1-docker.pkg.dev/garage-ai-512223/garageai/garageai-web:release-89f03c7` with digest `sha256:e5212b298452b22b009b1ec30fda23646521d55d2dd4bbd2d7f0ddaaaf8f727f`.
- The production entrypoint now forces `NODE_ENV=production` and starts the bundled server without Vite middleware.
- Public health verification passed for `https://garageai.site`; anonymous protected routes still return HTTP 401.
- The private agents service remains private; direct unauthenticated `/health` and `/agents/run` requests return HTTP 403.
- Local verification after the latest changes: 30 Vitest files / 170 tests, scanner tests 31/31, TypeScript, production build, env contract, catalog audit, `npm audit --omit=dev`, Python agent tests 14/14, and `git diff --check` all pass.

## Verified in this release window

- GitHub PR #46 merged to `main` as `31f9db6`.
- GitHub workflow runs `43578753764`, `43580302125` and `43580736603` passed Node.js, Python dependency and Gitleaks jobs.
- Local verification passed: TypeScript, 30 Vitest files / 170 tests, production build, env contract (35 keys), PostgreSQL schema contract, catalog audit, `npm audit --omit=dev`, Python syntax and `git diff --check`.
- Cloud SQL read-only preflight passed from Cloud Run using the mounted Unix socket: schema version `3`, 19 users, 19 garages, 0 active sessions.
- Controlled PostgreSQL session revocation completed and reported 0 active sessions.
- Apex `https://garageai.site/api/health` and Worker `https://garageai-1-0.sambur91.workers.dev/api/health` returned HTTP 200.
- Private agents IAM remains restricted to `garageai-web-runtime@garage-ai-512223.iam.gserviceaccount.com`; no unauthenticated invoker binding is present.
- Cloud Run web revision `garageai-web-canary-00026-diy` remains at 100% traffic with rollback-tagged revisions retained.

## Still open release gates

- The Cloudflare Workers Builds GitHub check fails immediately in the external Cloudflare pipeline. Wrangler dry-run/manual deployment and public health are healthy; Cloudflare dashboard owner access is required for the first failing build log or pipeline repair.
- `www.garageai.site` and `ww.garageai.site` have no DNS records, so their TLS routes are not available. Add only the aliases that are intentionally supported in Cloudflare DNS, then verify HTTPS.
- The private-agent OIDC and application-token boundary passes from an approved Cloud Run job; the last recorded end-to-end smoke reached the service but returned HTTP 502 from the configured Gemini/Vertex provider. The agent now retries a configured fallback model when the provider explicitly reports a missing model, but a fresh authenticated Vertex smoke is still required after deployment.
- Independent mailbox receipt and complete email-code request/verify/logout flow are not evidenced.
- OCR release acceptance still needs the approved anonymized 30+ sample regression set, ground truth, mobile/desktop smoke and latency/cost results. Existing fixtures are diagnostic only.
- Legacy bundle provenance/ownership and privacy retention/deletion sign-off are not evidenced.
- A post-rollout observation window with agreed 5xx, latency, Cloud SQL, email and spend thresholds is still required.
- Historical secret remediation is prepared and backed up, but protected remote history has not been force-pushed. Follow `docs/git-history-secret-remediation.md` in an approved maintenance window; do not add allowlist suppressions.

## Decision

The service is technically deployed and operationally testable, but public production acceptance remains **NO-GO** until the external gates above are independently evidenced. Canary/limited operation is acceptable only with an explicitly restricted audience and an owner for the open gates.
