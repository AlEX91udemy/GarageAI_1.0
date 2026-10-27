# GarageAI — engineering status report

- Report date: 2026-10-27
- Scope: repository CI, Cloudflare Worker validation, Cloud Run agent build/deploy status
- Repository: [GarageAI_1.0](https://github.com/AlEX91udemy/GarageAI_1.0)
- Status: **automated repository checks pass; cloud deployment is not verified and must not be considered production-ready**

## Executive summary

The repository's automated quality/security pipeline passes on PR #28's latest run, including TypeScript, tests, production build, Wrangler dry-run, container builds, PostgreSQL checks, dependency audits, and secret scanning. PR #28 was merged to `main`; it improves receipt photo capture, input validation, and demo fallback behavior.

The external Cloudflare dashboard build still reports failure even though Wrangler dry-run passes. Pinning npm as a diagnostic experiment did not resolve the external failure; PR #29 was closed without merging. The exact remote failure reason remains unknown because the Cloudflare build logs are not accessible through the repository integration. The Cloud Run agent image build passed Pull, Build, and Push, but its Deploy step failed. No claim is made that either service is successfully deployed.

## Work completed

- Added Wrangler dry-run validation after the normal production build in `.github/workflows/security-audit.yml`.
- The dry-run uses pinned `wrangler@4.152.0` and does not publish a Worker or require a Cloudflare API token.
- Existing CI continues to run TypeScript checks, tests, production build, web and agent container builds, catalog audit, PostgreSQL migration/persistence/importer/HTTP tests, npm audits, Python syntax/authentication tests, pip-audit, and Gitleaks.
- Merged PR #22 to pin Wrangler in the manual Cloudflare scripts; this did not by itself resolve the external Workers Builds failure.
- Merged PR #25 with safe JSON error responses for malformed/oversized API request bodies.
- Merged PR #28 with automatic receipt recognition after photo capture, image type/size checks, file-reader error handling, and explicit demo-only fallback data.
- Added Cloudflare Workers Builds configuration guidance in README (PR #30, pending checks): root directory, build command, deploy command, Worker name, and how to retrieve build logs.
- Tested pinning npm via `packageManager` in PR #29; the external build still failed, so the experiment was closed without merging.

## Verification evidence

- [CI run #40524928345 — internal jobs passed](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40524928345)
  - Node.js tests, typecheck and build: passed, including Wrangler dry-run, container builds, catalog audit, and PostgreSQL integration checks.
  - Python dependency security audit: passed.
  - Secret scanning: passed.
- [PR #28 — receipt scanner UX and error handling](https://github.com/AlEX91udemy/GarageAI_1.0/pull/28): merged to `main`.
- [PR #23 — add Cloudflare dry-run CI validation](https://github.com/AlEX91udemy/GarageAI_1.0/pull/23)
- [Latest Cloudflare Workers Build](https://dash.cloudflare.com/373ffb2da5bfc40fc40779da44950ff5/workers/services/view/garageai-1-0/production/builds/e5d8fa36-f1ab-4147-a1ae-c0845ea26375): failed. Exact remote log details still need inspection.
- [Cloud Build run for private agents](https://console.cloud.google.com/cloud-build/builds;region=europe-west1/ef9421f7-cf8e-4d8d-a774-4b32853f7275?project=garage-ai-512223): Pull, Build and Push passed; Deploy failed.
- Project ID needs to be reconciled before cloud changes: the trigger is using `garage-ai-512223`, while existing project notes/runbook have also referenced `garageai-512320`. Do not change IAM or deploy resources until the intended project is confirmed.

## Remaining risks / blockers

1. **Cloudflare deployment:** dry-run is green but the remote dashboard build is still red. A local/CI bundle validation is not proof that the remote build and deployment succeed. The npm version pin experiment also did not resolve this failure; inspect the first failing line in Cloudflare's Build logs before making further speculative changes.
2. **Cloud Run deployment:** the container was built and pushed, but the deployment step failed. Cloud Run service health and the deployed revision are not confirmed.
3. **Agent runtime:** real Cloud Run OIDC/IAM, Secret Manager, Vertex AI model access, and Node-to-private-agent end-to-end invocation have not been verified in the intended project.
4. **Persistent data:** real Cloud SQL migration/import, backup/restore, ownership checks, and restart/scale tests remain incomplete. Keep the production storage safety gate closed.
5. **Historical Git data:** current-tree cleanup and passing Gitleaks do not prove that historical commits contain no personal vehicle/service data. History rewriting is intentionally not performed automatically because it is destructive and may invalidate existing clones/references.
6. **Catalog evidence:** the catalog audit still marks the 110 modifications as provisional/partially verified; automated structure checks do not replace manufacturer/source verification.

## Suggested next actions

1. Open the latest Cloudflare build log and inspect the first failing line. README now documents the expected Workers Builds settings; confirm the actual dashboard settings match before changing code.
2. Inspect the failed Deploy step in Cloud Build; verify service name, target project, runtime service account, Artifact Registry image URI, and deployment permissions before retrying.
3. Confirm which Google Cloud project is the intended target before changing any cloud IAM/resources.
4. Run a private Cloud Run canary with real OIDC/IAM and Secret Manager configuration; validate Vertex AI access and the agent call end to end.
5. Complete database import/restore and tenant-isolation checks before enabling real-user traffic.
6. Plan a separate review of sensitive historical Git content before considering any history rewrite.

## Bottom line

**Repository CI: green. Cloudflare remote build: failed. Cloud Run build: image pushed, deployment failed. Production readiness: not established.** The project is safer and better validated, but live deployment and data-safety checks remain open.
