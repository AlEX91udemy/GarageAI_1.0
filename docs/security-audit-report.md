# GarageAI Security Audit

- Initial review date: 2026-10-27
- Repository: `AlEX91udemy/GarageAI_1.0`
- Baseline branch: `main`
- Review method: source review through GitHub; execution tests are pending CI results.
- Status: **preliminary; not a certification or penetration-test attestation**.

## Initial findings

### HIGH — AI agent endpoint may be exposed without application-level authentication
- Location: `agents_service/app.py`, `POST /agents/run`.
- Evidence: handler validates requested agent names and checks that provider credentials are configured, but the reviewed file does not show caller authentication, authorization, or rate limiting.
- Risk: if network ingress permits public access, an unauthenticated caller may trigger model requests and consume quota.
- Required action: verify ingress/IAM controls; add service authentication and rate limiting if this endpoint is reachable by untrusted callers. Add tests for unauthenticated access, invalid identities, request limits, and provider errors.

### HIGH — user/session data files are tracked by Git
- Locations: `data/garage_store.json`, `data/sessions.json`.
- Evidence: both appear in the repository tree. `.gitignore` contains ignore rules, but ignore rules do not untrack existing files.
- Risk: user data or session material may be exposed in the current tree or commit history.
- Required action: inspect content and history without printing sensitive values; determine whether secrets or personal data were committed. If sensitive material was exposed, rotate/revoke it and plan a history cleanup carefully. Do not blindly delete live data.

### HIGH — authentication and tenant-isolation require runtime verification
- Location: `server.ts` and protected CRUD routes.
- Evidence: prior project assessment identifies cross-user isolation and guest-mode behavior as areas needing integration tests. Static review alone cannot prove all routes enforce ownership checks.
- Required action: test two-user access to every object type, including backups, vehicles, service records, fuel, parts, tasks, and reminders.

### MEDIUM — JSON persistence is not a multi-instance database
- Location: `server.ts` / `server/store`.
- Risk: in-memory serialization does not guarantee consistency between separate server instances or provide transactional durability.
- Required action: document single-instance limitations or migrate to a transactional database before horizontal scaling.

### MEDIUM — AI model defaults and deployment configuration may drift
- Location: `agents_service/app.py`, `.env.example`.
- Evidence: defaults include model identifiers that may not be available in every API or project.
- Risk: runtime failures or unexpected provider configuration.
- Required action: validate configured model availability in a safe smoke test; avoid printing credentials; use explicit deployment configuration.

## CI checks introduced

The audit workflow in `.github/workflows/security-audit.yml` is intended to run:
- TypeScript check, unit tests, build, and catalog audit.
- npm dependency audits.
- Python dependency audit.
- Gitleaks scanning of repository history.

Dependency audit steps are non-blocking initially so results can be collected without hiding the main test/build outcome. Secret scanning and the primary correctness checks remain blocking.

## Test results

No local test execution is claimed by this static review. Populate this section only from actual workflow logs:
- `npm run lint`: pending
- `npm test`: pending
- `npm run build`: pending
- `npm run catalog:audit`: pending
- `npm audit --omit=dev`: pending
- `npm audit`: pending
- `pip-audit`: pending
- Gitleaks history scan: pending

## Production readiness

**Do not treat this repository as security-cleared yet.** Release blockers include confirming agent endpoint exposure/authentication, validating tenant isolation, and establishing whether tracked data/history contains sensitive information. Passing build and dependency checks does not resolve application-level authorization or data-integrity risks.
