# Release reconciliation and acceptance packet — 2026-11-20

Status: **NO-GO**. This document reconciles the workspace, the last recorded production artifact, the public endpoints, and the remaining owner-controlled release gates. It does not claim that an external gate is complete without evidence.

## 1. Reconciled state

| Item | Current evidence | Decision |
| --- | --- | --- |
| Workspace source | Branch `codex/docs-sync-verification-counts`, HEAD `5a6fe52656c1d5b0d6d3b2642510cccc894857bb`; 25 modified tracked files in the working tree | **Not a deployable release artifact** until reviewed, committed, and checked on the exact release SHA |
| Auth changes | Current workspace changes registration/login to email, adds password recovery, and changes related web/mobile UI | **Not deployed**; email smoke must target a revision containing the matching backend and frontend contract |
| Recorded web artifact | Cloud Run `garageai-web-canary-00040-yeh`, source commit `62bf1b7`, image digest `sha256:23c8b9afd1ebb324984b39a51dbde542bd3e2405d927a799fb43db87102c0207`, previous revision `00037-vex` retained | Historical evidence only; do not infer that it contains HEAD or the working-tree changes |
| Recorded Worker | `garageai-1-0`, version `d4ea0726-f084-4928-9e4f-d33876f3c894`; `API_ORIGIN` points to the recorded Cloud Run service | Public route is healthy, but do not publish a frontend/backend contract change before backend rollout |
| Agent service | Revision `garageai-agents-00061-jus`, Vertex `gemini-3.8-flash`, location `eu`; previous revision retained | Vertex/private-agent smoke is closed; paid-agent allowlist remains empty and paid calls remain disabled |
| Public apex | `https://garageai.site/api/health` returned HTTP 200 on 2026-11-20 | Baseline only |
| Public Worker | `https://garageai-1-0.sambur91.workers.dev/api/health` returned HTTP 200 on 2026-11-20 | Baseline only |
| Protected data | Apex `/api/data` returned HTTP 401 on 2026-11-20; Worker check hit a local PowerShell TLS error | Baseline only |
| Cloud tooling | `gcloud` is not installed on this workstation | Cloud Run build, deploy, traffic switch, job execution, and rollback cannot be performed or independently verified here |

The authoritative release decision remains **NO-GO** until the exact deployed application SHA is recorded, the matching email flow is smoke-tested, and the remaining external gates are evidenced.

## 2. Required rollout sequence

1. Review the working-tree diff and decide which changes belong in the release. Do not deploy the current dirty tree.
2. In an authenticated Cloud Build/Cloud Run operator environment, run final checks on the selected commit: `npm run lint`, `npm test`, `npm run build`, `npm run config:check`, `npm run catalog:audit`, `npm run catalog:recommendations`, Python syntax/dependency checks, and Wrangler dry-run.
3. Build the web image from that exact commit and record the source SHA and image digest. Run the controlled PostgreSQL preflight using the runtime identity and mounted Cloud SQL socket; keep `DATABASE_AUTO_MIGRATE=false` and `GARAGE_POSTGRES_READY=true` only when the recorded migration, backup/restore, and canary evidence still applies.
4. Deploy the web image with `--no-traffic`. Probe the tagged revision for `/api/health`, anonymous `/api/data`, registration/login/password-reset contracts, and tenant isolation. Inspect revision error logs without emitting secrets or user data.
5. Publish the Worker only after the tagged backend accepts the matching email-only contract. Verify apex and Worker health plus anonymous `/api/data`; retain the previous Cloud Run revision for rollback.
6. Run the manual mailbox smoke against the tagged revision and record the form below.
7. If the owner approves a restricted rollout, start the 48-hour observation window. Do not enable paid agents as part of this rollout.
8. Reconcile all evidence and make the final Go/No-Go decision.

## 3. Mailbox smoke record

Run against the exact tagged revision and Worker version. Do not copy email addresses, codes, tokens, or message bodies into the repository.

| Check | Result | Evidence reference/time |
| --- | --- | --- |
| Delivery received in test mailbox | `PENDING` |  |
| Correct code accepted once | `PENDING` |  |
| Incorrect code rejected | `PENDING` |  |
| Logout invalidates the session | `PENDING` |  |
| Replayed code rejected | `PENDING` |  |
| Expired code rejected | `PENDING` |  |
| Password login works with email | `PENDING` |  |

Acceptance: all rows pass; no code or mailbox content is logged.

## 4. OCR/mobile acceptance packet

Owner input required: an anonymized set of at least 30 files with ground truth. Use 10 VIN/registration documents, 10 service/document samples, and 10 receipts as described in [`tasks/scanner-verification-plan-2026-11-14.md`](../tasks/scanner-verification-plan-2026-11-14.md). Store only synthetic or properly anonymized identifiers.

| Gate | Required result | Status |
| --- | --- | --- |
| VIN exact match on clean images | >= 98% | `PENDING` |
| VIN exact match after allowed OCR substitutions | >= 95% | `PENDING` |
| Document field accuracy | >= 95% | `PENDING` |
| Receipt category and amount | >= 95% | `PENDING` |
| Fuel litres and price/litre | >= 90% | `PENDING` |
| iOS camera/gallery smoke | pass | `PENDING` |
| Android camera/gallery smoke | pass | `PENDING` |
| Desktop smoke and human confirmation before save | pass | `PENDING` |

Until these rows are evidenced, OCR remains **beta**.

## 5. Owner-controlled records

### Legacy provenance and privacy

Complete and sign [`docs/legacy-privacy-signoff.md`](legacy-privacy-signoff.md). Missing facts are the original source and data owner, authority and purpose of use, restricted-copy location and access control, retention start/deadline, named deletion operator, and deletion evidence location. The recorded policy is 30 days in restricted storage, followed by deletion after fresh-clone, Gitleaks, and secret-rotation checks.

### OEM catalog evidence

Assign an OEM-source owner. Keep all configurations without authoritative evidence as `provisional`; do not promote them because the audit or recommendation matrix is green. Record source, model/year/configuration scope, reviewer, date, and decision for each promoted configuration.

### GitHub Support

The support request about 46 closed PR heads is open. When a response arrives, record the case outcome and verify the affected PR references. Until then this gate stays open.

### Paid agents

Vertex/private-agent smoke is complete, but paid-agent enablement is a separate owner decision. Keep `AGENTS_ALLOWED_USERNAMES` empty and spending at `0 SGD` until written approval names the administrators and sets the `50 SGD/month` cap. OpenRouter is not an approved fallback.

## 6. 48-hour observation record

Start only after an allowed tagged rollout. Preserve the previous Cloud Run revision for rollback.

| Metric | Threshold | Result |
| --- | --- | --- |
| 5xx rate | < 1% | `PENDING` |
| P0/P1 incidents | none | `PENDING` |
| Unresolved Cloud SQL/email/AI errors | none | `PENDING` |
| API p95 latency | <= 2 seconds | `PENDING` |
| Spend | <= 50 SGD | `PENDING` |
| Rollback revision retained | yes | `PENDING` |

Record window start/end, deployed source SHA, image digest, Cloud Run revision, Worker version, aggregate metrics, incidents, and cleanup status. Do not record user payloads, VINs, plates, email addresses, codes, tokens, or connection strings.

## 7. Current conclusion

The project is technically operational, but the workspace and deployed web artifact are different release states. The next release action is an authenticated operator rollout of a reviewed exact commit, followed by mailbox smoke. OCR/mobile, OEM, legacy/privacy, GitHub Support, and observation evidence remain external gates. Public launch remains **NO-GO**.
