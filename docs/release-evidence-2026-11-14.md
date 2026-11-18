# Release evidence: 2026-11-14 (updated 2026-11-18)

## Current deployed state

- Worker deployment source commit: `4021b98`; PR #49 was merged to `main` as merge commit `2275946` on 2026-11-17. The post-merge GitHub workflow `44153622572` passed all Node.js, PostgreSQL, container, Python and secret-scanning jobs.
- Cloud Run web service `garageai-web-canary` is serving revision `garageai-web-canary-00023-n8r` at 100% traffic.
- The currently recorded Cloud Run image was built as `europe-west1-docker.pkg.dev/garage-ai-512223/garageai/garageai-web:release-89f03c7` with digest `sha256:e5212b298452b22b009b1ec30fda23646521d55d2dd4bbd2d7f0ddaaaf8f727f`; local source changes below still require a new backend build and rollout.
- The production entrypoint now forces `NODE_ENV=production` and starts the bundled server without Vite middleware.
- Public health verification passed for `https://garageai.site`; anonymous protected routes still return HTTP 401.
- Worker `garageai-1-0` was redeployed from the current tree as version `8d22041c-5f4b-4a2a-9586-8bc0f01a9515`; apex and Worker `/api/health` both returned HTTP 200 with only `status` and `timestamp`.
- Live anonymous boundary check at both `https://garageai.site/api/data` and the Worker endpoint returned HTTP 401 with `Требуется вход в аккаунт`.
- The private agents service remains private; direct unauthenticated `/health` and `/agents/run` requests return HTTP 403. The broken post-merge agent revisions were caused by the Cloud Build trigger using the root Node Dockerfile; the service was rebuilt from `agents_service/Dockerfile` and revision `garageai-agents-00053-v8c` is Ready at 100% traffic.
- Local verification after the latest changes: 30 Vitest files / 170 tests, scanner tests 31/31, TypeScript, production build, env contract, catalog audit, `npm audit --omit=dev` (0 vulnerabilities), Python syntax, Wrangler dry-run, public health and `git diff --check` all pass.
- `npm run release:readiness` now produces a machine-readable gate report and returns `external-gates-pending` when local checks pass.

## Verification update — 2026-11-18

- Latest completed main workflow: [`44164586629`](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/44164586629) for `b2664b3`; Node/PostgreSQL integration, container builds, Python dependency audit, and Gitleaks all passed.
- Workspace verification after the mobile project and photo-comparison fixes: TypeScript passed, 31 test files / 174 tests passed, production build passed, environment contract passed (36 keys), catalog audit passed, `npm audit --omit=dev` reported 0 vulnerabilities, Python syntax check passed, Wrangler dry run passed, and `git diff --check` passed.
- Additional local scanner/recommendation hardening: VIN scans no longer infer a model or year from a prefix/repeating year code; linear barcode fallback is available through lazy-loaded ZXing when native `BarcodeDetector` is missing or fails; general recommendations now show low/medium confidence and a reminder to check exact vehicle applicability. Final local verification passed: 33 test files / 184 tests, TypeScript, production build, environment contract, catalog audit, production dependency audit (0 vulnerabilities), and `git diff --check`. These changes remain workspace-only and are not deployed. The 30+ image ground-truth and iOS/Android/desktop acceptance gates remain open.
- Public endpoints rechecked: apex and Worker `/api/health` returned HTTP 200; anonymous `/api/data` returned HTTP 401 for both hosts.
- On 2026-11-18, a production email-code request to the owner-provided mailbox was accepted with HTTP 200 and the generic success response. Inbox receipt and authenticated verification/logout were not observable from this request, so the independent mailbox gate remains open.
- The local readiness gate reported 12 passed, 0 failed, and eight external acceptance gates still open. Its checks verify this workspace; the successful Actions run applies to `main` and does not cover the uncommitted workspace changes. These changes have not been deployed to Cloud Run.
- The pre-matrix workspace readiness rerun on 2026-11-18 reported 12 local checks passed, 0 failed, and 0 local pending; the eight original external acceptance gates were still open. The JSON summary now counts external gates in `pending` and reports `localPending` separately. `GARAGE_PUBLIC_URL=https://garageai.site npm run release:readiness` passed the public-health check; apex and Worker `/api/health` returned HTTP 200, while anonymous `/api/data` returned HTTP 401 on both hosts.
- The current 2026-11-18 workspace adds an HTTP integration assertion for reviewed knowledge loading and exact vehicle applicability. Final local verification after that test: 35 Vitest files / 197 tests, TypeScript, production build, env contract, production dependency audit (0 vulnerabilities), and `git diff --check` passed. These workspace changes remain uncommitted and are not deployed.
- The same workspace readiness run now includes the all-catalog recommendation matrix and production database preflight gate. The preflight is reported pending when `DATABASE_URL` is absent, and its connection details are suppressed. Nine external gates remain pending, including full OEM evidence for every catalog configuration. Matrix results: 200 models, 110 configurations, 1,550 recommendation checks, 3,770 market/year combinations, 4,217 resolved source references, 2/2 exact Nissan positive-control excerpts, and zero application/provenance errors. The catalog still has 0 fully verified configurations and 110 without full configuration evidence.
- AI diagnostics no longer request or require numerical confidence/probability values. Validation accepts descriptive diagnostic hypotheses, and the response sanitizer still strips unsupported model-supplied estimates, prices, and parts. After the change, all 35 test files / 197 tests passed; TypeScript, production build, and `git diff --check` passed.
- The HTTP tenant-isolation suite now disables Vite HMR in its disposable child server (`DISABLE_HMR=true`), preventing a fixed WebSocket port collision that caused intermittent `ECONNRESET` failures during full runs. The complete sequential test command passes 35/35 files and 197/197 tests.
- Added `npm run production:config-check` and wired it into release-readiness. It validates production-only flags, HTTPS URLs, PostgreSQL readiness, email authentication, and Vertex/Gemini configuration without printing credentials. It intentionally fails in this workstation because production secrets and `DATABASE_URL` are not present.
- The production configuration contract also checks the Cloud Run proxy hop count, Vertex location, placeholder project IDs, sender address format, and `APP_URL` coverage in `ALLOWED_ORIGINS`.
- Mobile tuning now reads and updates the selected vehicle's persisted tuning stages. The before/after screen requires user-selected photos instead of showing example vehicles and fabricated project costs.

## Verified in this release window

- GitHub PR #46 merged to `main` as `31f9db6`.
- GitHub workflow runs `43578753764`, `43580302125` and `43580736603` passed Node.js, Python dependency and Gitleaks jobs for the prior release SHA. The workflow now also runs on pushes to `main`, so the next committed SHA receives a complete CI result automatically.
- Local verification passed: TypeScript, 30 Vitest files / 170 tests, production build, env contract (35 keys), PostgreSQL schema contract, catalog audit, `npm audit --omit=dev`, Python syntax and `git diff --check`.
- Cloud SQL read-only preflight passed from Cloud Run using the mounted Unix socket: schema version `3`, 19 users, 19 garages, 0 active sessions.
- Controlled PostgreSQL session revocation completed and reported 0 active sessions.
- Apex `https://garageai.site/api/health` and Worker `https://garageai-1-0.sambur91.workers.dev/api/health` returned HTTP 200.
- Private agents IAM remains restricted to `garageai-web-runtime@garage-ai-512223.iam.gserviceaccount.com`; no unauthenticated invoker binding is present.
- Cloud Run web revision `garageai-web-canary-00026-diy` remains at 100% traffic with rollback-tagged revisions retained.

## Still open release gates

- The historical Cloudflare Workers Builds check attached to PR #49 failed before producing a log, while the manual Wrangler deployment and public health are healthy. A future Workers Builds run still needs an owner-side dashboard check or repair before that integration can be called green.
- `www.garageai.site` and `ww.garageai.site` have no DNS records, so their TLS routes are not available. Add only the aliases that are intentionally supported in Cloudflare DNS, then verify HTTPS.
- The private-agent OIDC and application-token boundary passes from an approved Cloud Run job; the last recorded end-to-end smoke reached the service but returned HTTP 502 from the configured Gemini/Vertex provider. The agent now retries a configured fallback model when the provider explicitly reports a missing model, but a fresh authenticated Vertex smoke is still required after deployment.
- Independent mailbox receipt and complete email-code request/verify/logout flow are not evidenced.
- OCR release acceptance still needs the approved anonymized 30+ sample regression set, ground truth, mobile/desktop smoke and latency/cost results. Existing fixtures are diagnostic only.
- Legacy bundle provenance/ownership and privacy retention/deletion sign-off are not evidenced.
- A post-rollout observation window with agreed 5xx, latency, Cloud SQL, email and spend thresholds is still required.
- Historical secret remediation is prepared and backed up, but protected remote history has not been force-pushed. Follow `docs/git-history-secret-remediation.md` in an approved maintenance window; do not add allowlist suppressions.

## Decision

The service is technically deployed and operationally testable, but public production acceptance remains **NO-GO** until the external gates above are independently evidenced. Canary/limited operation is acceptable only with an explicitly restricted audience and an owner for the open gates.
