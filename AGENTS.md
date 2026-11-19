# GarageAI workspace instructions

This repository is the GarageAI production web application. Work from this repository root for all project tasks.

## Windows Git in Hermes

- Hermes may resolve `git` to the MSYS Git bundled with Git Bash, which can fail with `Permission denied` in its terminal.
- Run Git through Windows PowerShell using the installed Windows Git: `powershell.exe -NoProfile -Command "git -C 'C:/Users/user/Documents/ChatGPT/авто/repo-GarageAI_1.0' status --short --branch"`.
- Use the same `powershell.exe -NoProfile -Command` wrapper for other Git operations; do not modify executable ACLs or repository permissions to work around this issue.
- Confirm the command's exit code and output before reporting Git status or changes.

## Before changing code

- Read the relevant source and tests first.
- Keep guest/local mode separate from authenticated per-user garages.
- Preserve tenant scoping, CSRF checks, rate limits, size limits, and production fail-closed storage guards.
- Never log API keys, session material, VINs, license plates, email codes, or garage payloads.

## Validation

- Typecheck: `npm run lint`
- Tests: `npm test`
- Production build: `npm run build`
- Environment contract: `npm run config:check`

Use focused checks during iteration, then run the relevant final checks after the last change.

## Production verification protocol

- Cloud Run production uses the Cloud SQL Unix socket at `/cloudsql/garage-ai-512223:europe-west1:garageai-postgres`; keep `DATABASE_AUTO_MIGRATE=false` and `GARAGE_POSTGRES_READY=true` only after the controlled migration and restore evidence is recorded.
- A read-only database check must run as a short-lived Cloud Run Job with the runtime identity and the mounted Cloud SQL instance. It may report schema version and aggregate row counts, but must never print connection strings, secret values, email addresses, VINs, plates, or garage payloads.
- Deploy the web image with `--no-traffic`, probe the tagged revision for `/api/health` and anonymous `/api/data`, inspect revision error logs, then route traffic. Keep the previous revision available for rollback.
- Cloud Build may report `LOGGING_FAILURE` after a successful image push when the legacy log bucket is unavailable. Confirm the pushed image digest in Artifact Registry before deploying; do not treat the build status alone as proof of a failed image build.
- Delete one-off Cloud Run Jobs after their evidence is captured so database checks do not become an unmanaged recurring cost.
- Vertex AI `404 NOT_FOUND` must be treated as an unresolved model/project/region availability gate, not proof of an IAM defect. Check the publisher-model documentation for the configured location, run a minimal smoke with the agent runtime identity, and keep paid-agent allowlists closed until the exact production model succeeds. Do not change IAM, billing, model configuration, or production traffic speculatively.
- Release evidence must distinguish the source SHA used to build the deployed image from the current workspace commit, and must record the result and cleanup status of temporary production Jobs.

## Delivery

Keep changes small and reviewable. Report files changed, checks run, and any external production gate that cannot be verified from this workstation.
