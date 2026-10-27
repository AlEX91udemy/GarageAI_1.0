# GarageAI Security Audit

- Initial review date: 2026-10-27
- Repository: `AlEX91udemy/GarageAI_1.0`
- Initial review branch: `audit/security-hardening-2026-10-27`
- Current reviewed code: `main` after PostgreSQL persistence, shared rate limits, HTTP integration coverage and agent fan-out cap were merged.
- Status: **active remediation; not a penetration-test attestation**.

## CI results (latest pre-merge verification runs)

- TypeScript check (`npm run lint`): passed.
- Unit tests: **116 passed across 19 test files**, including expanded tenant-isolation, concurrent mutation, and concurrent registration tests.
- Production build: passed.
- Catalog audit: passed.
- npm production dependency audit: **0 vulnerabilities**.
- Full npm dependency audit: **0 vulnerabilities**.
- Web and private-agent Docker image builds: passed; the web runtime image now runs as the non-root `node` user with only `/app/data` writable.
- Gitleaks scan: passed; no leaks detected in the scanned repository history/range.
- Python dependency audit: **passed after remediation**. The service no longer depends on `google-adk==2.13.0` (whose OpenTelemetry cap prevented upgrading), uses `google-genai` directly, and explicitly requires `opentelemetry-api>=1.45.1,<2`. The verified CI environment installed `opentelemetry-api 1.45.1`; `pip-audit` reported `No known vulnerabilities found`.
- Note: dependency audit steps were non-blocking in the first run, so the overall run was green despite the Python finding. They are now configured to fail the workflow on findings.

The combined main state has been validated in two adjacent PR runs: [40490128356](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40490128356) passed the PostgreSQL-backed HTTP integration test, and [40490021417](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40490021417) passed the agent fan-out regression and Python security audit. These ran against separate PR heads before both merges; a fresh full run against the combined `main` state is still required. The unit-test log contains connection-refused messages for an optional localhost availability endpoint, followed by explicit offline fallback; the test suite still passed. This noise should be cleaned up separately so CI logs distinguish expected fallback from real failures.

## Findings and remediation

### HIGH — Runtime garage data is tracked in Git
- Location: `data/garage_store.json`.
- Evidence: tracked JSON contains 16 user-keyed garage records, including non-empty vehicle, service, fuel, parts and maintenance records. It does not appear to contain email addresses or obvious token/password fields in the current snapshot.
- Risk: real or user-associated vehicle/maintenance information may be exposed in a public repository and retained in Git history.
- Action on this branch: remove the runtime data file from the current tree; `.gitignore` already excludes it. This does **not** remove historical copies. Before deploying the PR, preserve any legitimate production data outside Git and confirm the runtime uses persistent storage or a managed database. If any record belongs to a real user, assess notification/privacy obligations. Purge repository history separately if required; coordinate any force-push with collaborators.

### HIGH — Agent API authentication and quota protection
- Location: `agents_service/app.py`, `server.ts`, `server/agentServiceClient.ts`.
- Initial evidence: the endpoint accepted requests without application-level authentication, which could allow paid model calls if publicly reachable.
- Remediation on this branch: Python `POST /agents/run` fails closed with 503 if `AGENTS_API_TOKEN` is missing and returns 401 unless `X-Agents-Token` matches using constant-time comparison. Python and Node both have per-instance rate limits; the Node service forwards the authenticated internal user ID to the private Python service so its quota is also per caller instead of all Cloud Run requests sharing one proxy-IP bucket.
- Remediation merged to `main`: Node `POST /api/agents/run` validates task size and agent names, requires an authenticated session/CSRF, and in production uses fail-closed `AGENTS_ALLOWED_USERNAMES` so only configured admin logins can invoke paid agents. The web settings include an agent console with role selection, task-length guard, loading/error states and result rendering. Node and Python reject more than three selected agents per run to cap model fan-out cost. The service client uses Cloud Run metadata-server ID tokens plus the shared application token; responses are bounded to 250 KB while streaming.
- Remediation merged to `main`: Node AI and login/registration rate limits use atomic PostgreSQL buckets across instances; identifiers are hashed before storage and stale buckets are cleaned periodically. Local JSON development retains in-memory limits.
- Remaining risk: real Cloud Run OIDC/IAM/token/Vertex request paths have not been smoke-tested. Configure IAM and both services' tokens through Secret Manager before production.

### HIGH — Tenant isolation coverage is expanded but not complete
- Location: `server.ts`, `server/store.ts`, `server/tenant-isolation.integration.test.ts`.
- Tests verify cross-user isolation across vehicles, service records, reminders, fuel, inventory, repair tasks, OEM schedules and tuning, including export leakage, mutation denial, invalid cross-user restore references, valid restore, export → reset → import round-trip, per-user reset isolation, atomic rejection of invalid restore, and concurrent requests. Garage writes are queued per user within one Node process; duplicate usernames are atomically rejected with HTTP 409.
- Latest completed Node job passed 116 tests across 19 files. Separate PostgreSQL integration checks also verify shared rate limits across independent repository clients. This does not prove every route/edge case: guest-mode lifecycle and exhaustive malformed-input coverage remain open.

### HIGH — Production database cutover is not yet verified
- Location: `server/postgresPersistence.ts`, `server.ts`, `scripts/import-legacy-json.ts`.
- Remediation merged to `main`: the server selects PostgreSQL when `DATABASE_URL` is configured, stores users/garages/sessions in PostgreSQL, uses revision-checked garage commits and shared atomic rate limits, and blocks production startup unless `GARAGE_POSTGRES_READY=true` is explicitly set.
- CI covers schema migration/upgrade, tenant isolation, concurrent/stale writes, sessions, rate limits and JSON importer dry-run/apply/idempotency/conflict behavior against disposable PostgreSQL 16.
- Remaining risk: the importer has not been run against real user files; Cloud SQL backup/restore, live connection/IAM, canary, restart/scale and data reconciliation have not been verified. Keep `GARAGE_POSTGRES_READY` unset until those checks pass.

### HIGH — Agent review context previously contained only file names
- Location: `agents_service/app.py`, `_repo_snapshot()`.
- Finding: the agents received a list of repository paths, not source contents, so code-review tasks could not reliably inspect implementation details.
- Remediation merged to `main`: provide a bounded snapshot of source/config/test contents (maximum 40 files and 45,000 characters), prioritize implementation files, skip runtime data/lockfiles/virtual environments, and redact lines that resemble secret assignments. A test checks that source is included and runtime data is excluded.
- Remaining risk: heuristic redaction is not a substitute for secret scanning; the snapshot is intentionally bounded and may omit files outside the limit.

### HIGH — Omitted agent selection bypassed the model fan-out cap
- Location: `agents_service/app.py`, `run_agents()`.
- Finding: explicit selections above three agents were rejected, but omitting `agents` selected all five configured agents, bypassing the intended paid-model fan-out limit and potentially multiplying request cost.
- Remediation merged to `main`: omitted selections now default to `architect`, `qa`, and `ops`; a regression test verifies the default invokes no more than three agents. PR CI passed in [run 40490021417](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40490021417). It has not been deployed.
### MEDIUM — Model identifiers may drift
- Location: `agents_service/app.py`, deployment environment.
- The default was `gemini-2.5-flash`, which this project previously observed as unavailable to new users. Fallback defaults in both `agents_service/app.py` and `server.ts`, plus `.env.example`, now use `gemini-3.8-flash`.
- `GEMINI_MODEL` or `ARGON_MODEL` environment overrides can still point to unavailable models. Verify the exact configured model IDs against the chosen API/provider and run a non-secret smoke test before deployment.

## Next verification

- Latest database/shared-rate-limit CI [40475616003](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40475616003) passed all three jobs, including PostgreSQL migration/repository/importer/smoke tests, npm audits and Gitleaks.
- The production HTTP integration [40490128356](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40490128356) passed: production-mode server, PostgreSQL auth/session lifecycle, CSRF rejection, user isolation, persistence across process restart and logout revocation.
- Agent fan-out cap regression [40490021417](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40490021417) passed. The fix is merged to `main`; the omitted-agent default is bounded to three paid model calls.
- Remediation: remove the ADK dependency instead of bypassing its version constraints. The current agent runner calls the Google GenAI SDK directly and pins `opentelemetry-api>=1.45.1,<2`; CI's Python dependency audit passed.
- The Node-to-agent service client, ID-token retrieval, second application token and production admin allowlist are implemented and unit-tested. Still perform real Cloud Run OIDC/IAM and Vertex AI smoke tests before production.
- The web app has a PostgreSQL adapter and a fail-closed production startup gate. Real-data migration and deployment remain outstanding: run the dry-run importer against a verified copy, review conflicts/orphans, apply transactionally, validate row counts/ownership, demonstrate backup restore, and smoke-test a private Cloud Run canary before setting `GARAGE_POSTGRES_READY=true`. `GARAGE_ALLOW_EPHEMERAL_STORAGE=true` is only for explicitly approved disposable demos and must never be used for real data.
- The in-process write queue is only a local optimization; PostgreSQL revision checks and database transactions are the cross-instance concurrency controls.
- Container builds have passed, and the web container uses a non-root runtime user. No Google Cloud resources have been created and no deployment has been executed.
- Runtime garage data is absent from the current tree, but historical Git copies may remain. Determine whether those records belong to real users and assess privacy obligations; history rewrite requires separate coordinated handling.
- This documentation PR triggers a fresh full CI run against the combined latest `main` state; record its result before release.

## Release decision

**Not cleared for production yet.** Code-level persistence and rate-limit work is merged and CI is green, but real Cloud SQL cutover/restore/canary tests and Git-history privacy assessment remain incomplete. Passing CI does not prove the deployed IAM/model path or remove historical runtime data from Git.
