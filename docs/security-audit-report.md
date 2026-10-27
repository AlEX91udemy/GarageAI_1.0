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
- Python dependency audit: **failed**; `opentelemetry-api 1.44.0` is flagged for `CVE-2026-114603`, fixed in `1.45.1`. A direct minimum-version constraint has been added to `agents_service/requirements.txt`; CI must verify dependency resolution and audit again.
- Note: dependency audit steps were non-blocking in the first run, so the overall run was green despite the Python finding. They are now configured to fail the workflow on findings.

The unit-test log contains connection-refused messages for an optional localhost availability endpoint, followed by explicit offline fallback; the test suite still passed. This noise should be cleaned up separately so CI logs distinguish expected fallback from real failures.

## Findings and remediation

### HIGH — Runtime garage data is tracked in Git
- Location: `data/garage_store.json`.
- Evidence: tracked JSON contains 16 user-keyed garage records, including non-empty vehicle, service, fuel, parts and maintenance records. It does not appear to contain email addresses or obvious token/password fields in the current snapshot.
- Risk: real or user-associated vehicle/maintenance information may be exposed in a public repository and retained in Git history.
- Action on this branch: remove the runtime data file from the current tree; `.gitignore` already excludes it. This does **not** remove historical copies. Before deploying the PR, preserve any legitimate production data outside Git and confirm the runtime uses persistent storage or a managed database. If any record belongs to a real user, assess notification/privacy obligations. Purge repository history separately if required; coordinate any force-push with collaborators.

### HIGH — Agent API may be callable without application-level authentication
- Location: `agents_service/app.py`, `POST /agents/run`.
- Evidence: the handler validates requested agent names and provider configuration, but does not itself authenticate callers or rate-limit requests.
- Risk: if the service has public ingress, a caller may trigger paid model calls and consume quota.
- Required action: confirm Cloud Run ingress and IAM. If any untrusted callers can reach the endpoint, require service-to-service authentication or add an application token and rate limiting before exposing it publicly. Add integration tests for unauthenticated calls and abuse limits.

### HIGH — Tenant isolation needs route-level integration tests
- Location: `server.ts` and protected CRUD routes.
- Static review cannot prove every route scopes reads, writes, backups and deletes to the authenticated user. Add two-user tests across all resource types and guest mode before production sign-off.

### MEDIUM — JSON persistence is not safe for horizontal scaling
- Location: `server/store.ts`.
- The in-process write queue and atomic file replacement do not coordinate separate instances. Keep one instance with persistent disk only as a temporary arrangement, or migrate to a transactional database before scaling horizontally.

### MEDIUM — Model identifiers may drift
- Location: `agents_service/app.py`, deployment environment.
- Defaults are not guaranteed to be available in every provider/project. Configure model IDs explicitly and run a non-secret smoke test against the selected provider.

## Next verification

- Re-run `pip-audit -r agents_service/requirements.txt` after the version constraint.
- Keep npm and Python dependency audits blocking.
- Add tests for agent authentication and tenant isolation.
- Confirm no live data is required from the tracked JSON file before merging.
- Treat historical data exposure as unresolved until Git history and deployment copies are assessed.

## Release decision

**Not cleared for production yet.** Passing build/tests and a clean secret scan do not establish application-level authorization or remove data from repository history.
