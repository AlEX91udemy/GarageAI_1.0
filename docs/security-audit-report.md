# GarageAI Security Audit

- Initial review date: 2026-10-27
- Repository: `AlEX91udemy/GarageAI_1.0`
- Review branch: `audit/security-hardening-2026-10-27`
- Status: **active remediation; not a penetration-test attestation**.

## CI results (latest completed run 40460730602)

- TypeScript check (`npm run lint`): passed.
- Unit tests: **94 passed across 16 test files**, including expanded tenant-isolation, concurrent mutation, and concurrent registration tests.
- Production build: passed.
- Catalog audit: passed.
- npm production dependency audit: **0 vulnerabilities**.
- Full npm dependency audit: **0 vulnerabilities**.
- Web and private-agent Docker image builds: passed.
- Gitleaks scan: passed; no leaks detected in the scanned repository history/range.
- Python dependency audit: **failed**; `opentelemetry-api 1.44.0` is flagged for `CVE-2026-114603`, fixed in `1.45.1`. An attempted direct minimum-version constraint conflicts with the dependency constraints of `google-adk==2.13.0`, so it was reverted rather than leaving an un-installable environment. The Python audit remains a blocking failure until upstream ADK constraints are updated or a tested compatible upgrade path is established.
- Note: dependency audit steps were non-blocking in the first run, so the overall run was green despite the Python finding. They are now configured to fail the workflow on findings.

The unit-test log contains connection-refused messages for an optional localhost availability endpoint, followed by explicit offline fallback; the test suite still passed. This noise should be cleaned up separately so CI logs distinguish expected fallback from real failures.

## Findings and remediation

### HIGH — Runtime garage data is tracked in Git
- Location: `data/garage_store.json`.
- Evidence: tracked JSON contains 16 user-keyed garage records, including non-empty vehicle, service, fuel, parts and maintenance records. It does not appear to contain email addresses or obvious token/password fields in the current snapshot.
- Risk: real or user-associated vehicle/maintenance information may be exposed in a public repository and retained in Git history.
- Action on this branch: remove the runtime data file from the current tree; `.gitignore` already excludes it. This does **not** remove historical copies. Before deploying the PR, preserve any legitimate production data outside Git and confirm the runtime uses persistent storage or a managed database. If any record belongs to a real user, assess notification/privacy obligations. Purge repository history separately if required; coordinate any force-push with collaborators.

### HIGH — Agent API authentication and quota protection
- Location: `agents_service/app.py`, `POST /agents/run`.
- Initial evidence: the endpoint accepted requests without application-level authentication, which could allow paid model calls if publicly reachable.
- Remediation on this branch: POST now fails closed with 503 if `AGENTS_API_TOKEN` is not configured and returns 401 unless the `X-Agents-Token` header matches using constant-time comparison. README documents local setup and recommends Cloud Run IAM/Secret Manager.
- Remediation on this branch: also adds a per-instance limit of five authorized requests per minute per client IP and automated tests for missing/invalid tokens and rate limiting. Remaining risk: this limiter is in-memory and can be bypassed across multiple instances; Cloud Run ingress/IAM remains the primary boundary. Configure the token as a secret and restrict the service to trusted callers before production.

### HIGH — Tenant isolation coverage is expanded but not complete
- Location: `server.ts`, `server/store.ts`, `server/tenant-isolation.integration.test.ts`.
- Tests now verify cross-user isolation across vehicles, service records, reminders, fuel, inventory, repair tasks, OEM schedules and tuning, including export leakage, mutation denial, invalid restore references and concurrent mutation requests. Garage writes are queued per user in one Node process so the next request takes its snapshot after the preceding save completes. Concurrent duplicate usernames are rejected atomically by the store and the HTTP route returns 409.
- Latest completed Node job passed 94 tests across 16 files. This does not prove every route or edge case: guest-mode lifecycle, valid backup restore, malformed input permutations and coordination across separate server instances remain open.

### MEDIUM — JSON persistence is not safe for horizontal scaling
- Location: `server/store.ts`.
- The store serializes its own file writes, and the HTTP layer serializes garage mutations per user inside a single Node process. Neither coordinates separate service instances or survives ephemeral Cloud Run filesystems. A transactional managed database and shared session store are required before scaling or production.

### HIGH — Agent review context previously contained only file names
- Location: `agents_service/app.py`, `_repo_snapshot()`.
- Finding: the agents received a list of repository paths, not source contents, so code-review tasks could not reliably inspect implementation details.
- Remediation on this branch: provide a bounded snapshot of source/config/test contents (maximum 40 files and 45,000 characters), prioritize implementation files, skip runtime data/lockfiles/virtual environments, and redact lines that resemble secret assignments. A test checks that source is included and runtime data is excluded.
- Remaining risk: heuristic redaction is not a substitute for secret scanning; the snapshot is intentionally bounded and may omit files outside the limit.

### MEDIUM — Model identifiers may drift
- Location: `agents_service/app.py`, deployment environment.
- The default was `gemini-2.5-flash`, which this project previously observed as unavailable to new users. Fallback defaults in both `agents_service/app.py` and `server.ts`, plus `.env.example`, now use `gemini-3.8-flash`.
- `GEMINI_MODEL` or `ARGON_MODEL` environment overrides can still point to unavailable models. Verify the exact configured model IDs against the chosen API/provider and run a non-secret smoke test before deployment.

## Next verification

- Latest completed run [40460730602](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40460730602): **94 tests across 16 files passed**; TypeScript, production build, web and private-agent container builds, catalog audit, both npm audits, and Gitleaks passed. Python syntax and agent API tests passed, but the Python dependency audit failed on `opentelemetry-api 1.44.0` / `CVE-2026-114603`.
- Tests now cover the main garage collection families for cross-user visibility and mutation, cross-user export, invalid restore references, concurrent vehicle writes, and duplicate registration races. Valid restore and guest-mode lifecycle tests are still needed.
- The currently released Google ADK dependency constraints cap OpenTelemetry API/SDK at `<=1.44`, while the CVE is fixed in 1.45.1. Do not force-install an incompatible version or suppress the audit. Retest when a compatible ADK dependency set is available.
- The HTTP mutation queue is process-local. Do not run multiple Cloud Run instances against local JSON state; migrate to managed transactional storage and shared sessions.
- Verify the agent API rate limiter behind the actual Cloud Run proxy. Cloud Run IAM/ingress must remain the primary boundary.
- Container builds and a Cloud Run runbook exist, but no cloud resources have been created and no deployment has been executed. The Node service still needs authenticated service-to-service integration with the private agent API.
- Confirm whether the tracked JSON file contains real user data before merging. Historical exposure remains unresolved until Git history and deployment copies are assessed.

## Release decision

**Not cleared for production yet.** Passing build/tests and a clean secret scan do not establish application-level authorization or remove data from repository history.
