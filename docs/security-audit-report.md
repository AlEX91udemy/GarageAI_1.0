# GarageAI Security Audit

- Initial review date: 2026-10-27
- Repository: `AlEX91udemy/GarageAI_1.0`
- Review branch: `audit/security-hardening-2026-10-27`
- Status: **active remediation; not a penetration-test attestation**.

## CI results (run 40455145043)

- TypeScript check (`npm run lint`): passed.
- Unit tests: **85 passed across 14 test files**.
- Production build: passed.
- Catalog audit: passed.
- npm production dependency audit: **0 vulnerabilities**.
- Full npm dependency audit: **0 vulnerabilities**.
- Gitleaks scan of the change range: **no leaks detected**.
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

### HIGH — Tenant isolation needs route-level integration tests
- Location: `server.ts` and protected CRUD routes.
- Static review cannot prove every route scopes reads, writes, backups and deletes to the authenticated user. Add two-user tests across all resource types and guest mode before production sign-off.

### MEDIUM — JSON persistence is not safe for horizontal scaling
- Location: `server/store.ts`.
- The in-process write queue and atomic file replacement do not coordinate separate instances. Keep one instance with persistent disk only as a temporary arrangement, or migrate to a transactional database before scaling horizontally.

### HIGH — Agent review context previously contained only file names
- Location: `agents_service/app.py`, `_repo_snapshot()`.
- Finding: the agents received a list of repository paths, not source contents, so code-review tasks could not reliably inspect implementation details.
- Remediation on this branch: provide a bounded snapshot of source/config/test contents (maximum 40 files and 45,000 characters), prioritize implementation files, skip runtime data/lockfiles/virtual environments, and redact lines that resemble secret assignments. A test checks that source is included and runtime data is excluded.
- Remaining risk: heuristic redaction is not a substitute for secret scanning; the snapshot is intentionally bounded and may omit files outside the limit.

### MEDIUM — Model identifiers may drift
- Location: `agents_service/app.py`, deployment environment.
- Defaults are not guaranteed to be available in every provider/project. Configure model IDs explicitly and run a non-secret smoke test against the selected provider.

## Next verification

- Resolve the `opentelemetry-api 1.44.0` vulnerability without breaking `google-adk==2.13.0` dependency resolution; keep Python audit blocking until resolved.
- Re-run CI after the latest changes; the prior run exposed a test/signature mismatch that was corrected afterward.
- Verify rate-limit behavior under the actual Cloud Run proxy configuration.
- Resolve the upstream OpenTelemetry version cap without forcing an incompatible dependency set.
- Keep npm and Python dependency audits blocking.
- Add tests for agent authentication and tenant isolation.
- Confirm no live data is required from the tracked JSON file before merging.
- Treat historical data exposure as unresolved until Git history and deployment copies are assessed.

## Release decision

**Not cleared for production yet.** Passing build/tests and a clean secret scan do not establish application-level authorization or remove data from repository history.
