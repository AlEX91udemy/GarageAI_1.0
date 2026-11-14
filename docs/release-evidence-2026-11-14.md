# Release evidence: 2026-11-14

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
- The private-agent OIDC and application-token boundary now passes from an approved Cloud Run job; the current smoke reaches the service and returns HTTP 502 from the configured Gemini/Vertex provider. This closes IAM/token transport, but provider/model availability is still an open gate.
- Independent mailbox receipt and complete email-code request/verify/logout flow are not evidenced.
- OCR release acceptance still needs the approved anonymized 30+ sample regression set, ground truth, mobile/desktop smoke and latency/cost results. Existing fixtures are diagnostic only.
- Legacy bundle provenance/ownership and privacy retention/deletion sign-off are not evidenced.
- A post-rollout observation window with agreed 5xx, latency, Cloud SQL, email and spend thresholds is still required.
- Historical secret remediation is prepared and backed up, but protected remote history has not been force-pushed. Follow `docs/git-history-secret-remediation.md` in an approved maintenance window; do not add allowlist suppressions.

## Decision

The service is technically deployed and operationally testable, but public production acceptance remains **NO-GO** until the external gates above are independently evidenced. Canary/limited operation is acceptable only with an explicitly restricted audience and an owner for the open gates.
