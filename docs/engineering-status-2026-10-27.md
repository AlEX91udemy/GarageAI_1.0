# GarageAI — engineering status report

- Report date: 2026-10-27
- Scope: repository CI, Cloudflare Worker validation, Cloud Run agent build/deploy status
- Repository: [GarageAI_1.0](https://github.com/AlEX91udemy/GarageAI_1.0)
- Status: **automated repository checks pass; cloud deployment is not verified and must not be considered production-ready**

## Executive summary

The repository's automated quality/security pipeline passes on the latest CI run linked below. A new credential-free Wrangler dry-run was added to CI to validate the Cloudflare Worker bundle before merge. This check passed.

The external Cloudflare dashboard build still reports failure. The Cloud Run agent image build passed Pull, Build, and Push, but its Deploy step failed. The dashboard logs were not accessible through the repository integration, so the exact remote failure reason is unknown. No claim is made that either service is successfully deployed.

## Work completed

- Added Wrangler dry-run validation after the normal production build in `.github/workflows/security-audit.yml`.
- The dry-run uses pinned `wrangler@4.152.0` and does not publish a Worker or require a Cloudflare API token.
- Existing CI continues to run TypeScript checks, tests, production build, web and agent container builds, catalog audit, PostgreSQL migration/persistence/importer/HTTP tests, npm audits, Python syntax/authentication tests, pip-audit, and Gitleaks.
- Kept the Cloudflare script reproducibility change in PR #22 separate because the Cloudflare preview build still fails; do not infer the root cause from the Wrangler script change alone.

## Verification evidence

- [CI run #40498824992 — all jobs passed](https://github.com/AlEX91udemy/GarageAI_1.0/actions/runs/40498824992)
  - Node.js tests, typecheck and build: passed, including Wrangler dry-run.
  - Python dependency security audit: passed.
  - Secret scanning: passed.
- [PR #23 — add Cloudflare dry-run CI validation](https://github.com/AlEX91udemy/GarageAI_1.0/pull/23)
- [Latest Cloudflare preview build](https://dash.cloudflare.com/373ffb2da5bfc40fc40779da44950ff5/workers/services/view/garageai-1-0/production/builds/f60e2389-6e1f-4248-bf3b-c19b481436ff): failed. Exact remote log details still need inspection.
- [Cloud Build run for private agents](https://console.cloud.google.com/cloud-build/builds;region=europe-west1/ef9421f7-cf8e-4d8d-a774-4b32853f7275?project=garage-ai-512223): Pull, Build and Push passed; Deploy failed.
- Project ID needs to be reconciled before cloud changes: the trigger is using `garage-ai-512223`, while existing project notes/runbook have also referenced `garageai-512320`. Do not change IAM or deploy resources until the intended project is confirmed.

## Remaining risks / blockers

1. **Cloudflare deployment:** dry-run is green but the remote dashboard build is still red. A local/CI bundle validation is not proof that the remote build and deployment succeed.
2. **Cloud Run deployment:** the container was built and pushed, but the deployment step failed. Cloud Run service health and the deployed revision are not confirmed.
3. **Agent runtime:** real Cloud Run OIDC/IAM, Secret Manager, Vertex AI model access, and Node-to-private-agent end-to-end invocation have not been verified in the intended project.
4. **Persistent data:** real Cloud SQL migration/import, backup/restore, ownership checks, and restart/scale tests remain incomplete. Keep the production storage safety gate closed.
5. **Historical Git data:** current-tree cleanup and passing Gitleaks do not prove that historical commits contain no personal vehicle/service data. History rewriting is intentionally not performed automatically because it is destructive and may invalidate existing clones/references.
6. **Catalog evidence:** the catalog audit still marks the 110 modifications as provisional/partially verified; automated structure checks do not replace manufacturer/source verification.

## Suggested next actions

1. Inspect the first failing line in the Cloudflare dashboard build log and correct the specific cause.
2. Inspect the failed Deploy step in Cloud Build; verify service name, target project, runtime service account, Artifact Registry image URI, and deployment permissions before retrying.
3. Confirm which Google Cloud project is the intended target before changing any cloud IAM/resources.
4. Run a private Cloud Run canary with real OIDC/IAM and Secret Manager configuration; validate Vertex AI access and the agent call end to end.
5. Complete database import/restore and tenant-isolation checks before enabling real-user traffic.
6. Plan a separate review of sensitive historical Git content before considering any history rewrite.

## Bottom line

**Repository CI: green. Cloudflare remote build: failed. Cloud Run build: image pushed, deployment failed. Production readiness: not established.** The project is safer and better validated, but live deployment and data-safety checks remain open.
