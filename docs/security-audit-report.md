# GarageAI Security Audit

- Initial review date: 2026-10-27
- Repository: `AlEX91udemy/GarageAI_1.0`
- Review branch: `audit/security-hardening-2026-10-27`
- Status: **active remediation; not a penetration-test attestation**.

## CI results (latest completed run 40462928012)

- TypeScript check (`npm run lint`): passed.
- Unit tests: **111 passed across 18 test files**, including expanded tenant-isolation, concurrent mutation, and concurrent registration tests.
- Production build: passed.
- Catalog audit: passed.
- npm production dependency audit: **0 vulnerabilities**.
- Full npm dependency audit: **0 vulnerabilities**.
- Web and private-agent Docker image builds: passed; the web runtime image now runs as the non-root `node` user with only `/app/data` writable.
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
- Location: `agents_service/app.py`, `server.ts`, `server/agentServiceClient.ts`.
- Initial evidence: the endpoint accepted requests without application-level authentication, which could allow paid model calls if publicly reachable.
- Remediation on this branch: Python `POST /agents/run` fails closed with 503 if `AGENTS_API_TOKEN` is missing and returns 401 unless `X-Agents-Token` matches using constant-time comparison. Python and Node both have per-instance rate limits.
- Remediation on this branch: Node `POST /api/agents/run` validates task size and agent names, requires an authenticated session/CSRF, and in production uses fail-closed `AGENTS_ALLOWED_USERNAMES` so only configured admin logins can invoke paid agents. The service client uses Cloud Run metadata-server ID tokens plus the shared application token; responses are bounded to 250 KB while streaming.
- Remaining risk: rate limits are in-memory and do not coordinate multiple instances; the real Cloud Run OIDC/IAM/token/Vertex request path has not been smoke-tested. Configure IAM and both services' tokens through Secret Manager before production.

### HIGH — Tenant isolation coverage is expanded but not complete
- Location: `server.ts`, `server/store.ts`, `server/tenant-isolation.integration.test.ts`.
- Tests verify cross-user isolation across vehicles, service records, reminders, fuel, inventory, repair tasks, OEM schedules and tuning, including export leakage, mutation denial, invalid cross-user restore references, valid restore, atomic rejection of invalid restore, and concurrent requests. Garage writes are queued per user within one Node process; duplicate usernames are atomically rejected with HTTP 409.
- Latest completed Node job passed 111 tests across 18 files. This does not prove every route/edge case: guest-mode lifecycle, exhaustive malformed-input coverage, and coordination across separate instances remain open.

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

- Latest completed run [40462928012](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40462928012): 111 Node tests across 18 files passed; TypeScript, production build, web and private-agent Docker builds, catalog audit, both npm audits and Gitleaks passed. Python syntax and 9 Python tests passed. Overall CI fails only at `pip-audit`, which flags `opentelemetry-api 1.44.0` / `CVE-2026-114603`.
- Current official Google ADK `2.13.0` limits OpenTelemetry API/SDK to `<=1.44`, while the fix is in `1.45.1`. The upstream release page currently lists `v2.13.0` as latest. Keep the audit blocking; do not force incompatible dependencies or suppress the vulnerability. [Google ADK releases](https://github.com/google/adk-python/releases).
- The Node-to-agent service client, ID-token retrieval, second application token and production admin allowlist are implemented and unit-tested. Still perform real Cloud Run OIDC/IAM and Vertex AI smoke tests after the dependency CVE is resolved.
- The web app still stores data and sessions in local JSON files. Cloud Run filesystem is ephemeral and not shared: migrate to managed transactional storage/shared sessions and test backup/restore before serving real user records or scaling.
- The in-process per-user write queue does not coordinate separate application instances.
- Container builds have passed, and the web container uses a non-root runtime user. No Google Cloud resources have been created and no deployment has been executed.
- Runtime garage data was removed from the current tree, but historical Git copies remain. Determine whether the records belong to real users and assess privacy obligations; history rewrite requires separate coordinated handling.

## Release decision

**Not cleared for production yet.** Passing build/tests and a clean secret scan do not establish application-level authorization or remove data from repository history.
