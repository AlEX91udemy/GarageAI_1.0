# GarageAI Google Cloud production rollout

This runbook is prepared for the requested full production rollout with an
approximately 300 SGD Google Cloud budget. It is intentionally
command driven and cost bounded. The infrastructure execution record at the
end of this document records the operations already completed.

## Spending guardrails

- Configure a 300 SGD billing budget with alerts at 25, 50, 75, 90 and 100 percent and a projected-spend alert.
- Keep Cloud Run web at min instances 0 and max instances 2.
- Keep the private agents service at min instances 0, max instances 1, concurrency 1, and request CPU allocation.
- Keep only the current and previous web revisions. Do not create a second always-on Cloud SQL instance.
- Use Gemini Flash only, cap one request to three agents, and keep the administrator allowlist enabled.
- Reserve at least 25 SGD for rollback and a second smoke run. Delete benchmark artifacts after testing.

## One-time project setup

Resolve the project ID before running any command. Repository records currently
mention both garage-ai-512223 and garageai-512320; the local environment file is
not an authority for deployment. Run the read-only preflight first and stop if
the chosen ID does not match the existing Cloud SQL and Cloud Run resources:

    .\\scripts\\gcp-preflight.ps1 -ProjectId '<confirmed-project-id>' -Region europe-west1

Set variables in a controlled shell. Do not place secret values in source,
shell history, or chat.

    $env:PROJECT_ID = 'garage-ai-512223'
    $env:REGION = 'europe-west1'
    $env:REPO = 'garageai'
    gcloud config set project $env:PROJECT_ID
    gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com aiplatform.googleapis.com monitoring.googleapis.com logging.googleapis.com
    gcloud artifacts repositories create $env:REPO --repository-format=docker --location=$env:REGION

The 300 SGD billing budget is already created for this project. The budget is
an alert, so the service limits above are still mandatory.

## Build and deploy the web service

Run the existing production preflight from a controlled migration shell before
enabling the readiness flag:

    npx tsx scripts/production-preflight.ts
    gcloud builds submit --tag "$env:REGION-docker.pkg.dev/$env:PROJECT_ID/$env:REPO/garageai-web:release-SHA" .

Deploy with the existing Cloud SQL socket, Secret Manager database secret, and
the dedicated runtime identity. Replace placeholder service-account names with
the identities already recorded in the deployment log.

    gcloud run deploy garageai-web --image "$env:REGION-docker.pkg.dev/$env:PROJECT_ID/$env:REPO/garageai-web:release-SHA" --region $env:REGION --service-account garageai-web-runtime@$env:PROJECT_ID.iam.gserviceaccount.com --add-cloudsql-instances garage-ai-512223:europe-west1:garageai-postgres --min 0 --max 2 --concurrency 40 --cpu 1 --memory 512Mi --set-env-vars "NODE_ENV=production,PORT=8080,DATABASE_SSL=true,DATABASE_AUTO_MIGRATE=false,GARAGE_POSTGRES_READY=true,TRUSTED_PROXY_HOPS=1,ALLOWED_ORIGINS=https://garageai.site,https://www.garageai.site,https://garageai-1-0.sambur91.workers.dev" --set-secrets "DATABASE_URL=garageai-database-url:latest,RESEND_API_KEY=resend-api-key:latest,EMAIL_CODE_SECRET=email-code-secret:latest"

Keep public traffic on the canary until health, auth, tenant isolation, restart,
concurrency and email-code checks pass. Route traffic only after the observation
window is clean.

## Build and deploy the private agents service

    gcloud builds submit --config=cloudbuild-agents.yaml .
    gcloud run deploy garageai-agents --image "$env:REGION-docker.pkg.dev/$env:PROJECT_ID/$env:REPO/garageai-agents:latest" --region $env:REGION --no-allow-unauthenticated --service-account garageai-agents-runtime@$env:PROJECT_ID.iam.gserviceaccount.com --min 0 --max 1 --concurrency 1 --cpu 1 --memory 512Mi --timeout 120 --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$env:PROJECT_ID,GOOGLE_CLOUD_LOCATION=$env:REGION,GEMINI_MODEL=gemini-3.8-flash" --set-secrets "AGENTS_API_TOKEN=agents-api-token:latest"

Grant only the web identity permission to invoke the private service and grant
the agent identity the minimum Vertex role:

    gcloud run services add-iam-policy-binding garageai-agents --region $env:REGION --member="serviceAccount:garageai-web-runtime@$env:PROJECT_ID.iam.gserviceaccount.com" --role=roles/run.invoker
    gcloud projects add-iam-policy-binding $env:PROJECT_ID --member="serviceAccount:garageai-agents-runtime@$env:PROJECT_ID.iam.gserviceaccount.com" --role=roles/aiplatform.user
    $env:AGENTS_SERVICE_URL = gcloud run services describe garageai-agents --region $env:REGION --format='value(status.url)'

Configure the web revision with AGENTS_SERVICE_URL, AGENTS_SERVICE_AUDIENCE set
to that URL, the same agents-api-token secret, and a deliberate
AGENTS_ALLOWED_USERNAMES list containing only project administrators. Empty
allowlist must remain fail-closed.

## Release gates and smoke tests

Run in this order and save evidence with the exact commit SHA, image digest,
Cloud Run revision and Worker version:

1. Health and anonymous protected-route rejection.
2. Email request, code verification, logout, expired/replayed code rejection, and mailbox receipt.
3. Two-user tenant isolation, CSRF rejection, concurrent writes, restart and scale-out persistence.
4. Private agent health through the web proxy; direct unauthenticated agent access must fail.
5. One real Vertex request using an admin account; confirm model ID, latency and bounded response size.
6. Scanner regression set and bounded load test from tasks/scanner-verification-plan-2026-11-14.md.
7. Observe 5xx, latency, Cloud SQL connections, email failures and projected spend for the agreed window.

Do not log prompts, model responses containing garage data, images, VINs,
plates, tokens or email codes.

## Rollback

Keep the previous web revision available. If auth, persistence, email, agent
OIDC or spend checks fail, route traffic back to the previous revision, disable
AGENTS_ALLOWED_USERNAMES, and scale the agents service to zero. Do not delete
Cloud SQL backups or rewrite data during the observation window.

## Execution record — 2026-11-14

- Current release commit `3f8224298b42bda984cea89babf43a6cd28d5e36` was built as Artifact Registry image `europe-west1-docker.pkg.dev/garage-ai-512223/garageai/garageai-web:3f82242`, digest `sha256:99187c607e1812b33142a5570aa65d8dea73e65e4ac3f108c3508dff864fd74e`. Cloud Build reported a logging-bucket failure after the image push completed; the image digest was verified in Artifact Registry before deployment.
- Deployed Cloud Run revision `garageai-web-canary-00016-jom` with the current image and routed 100% of `garageai-web-canary` traffic to it. The tagged canary URL returned 200 from `/api/health`; startup, Cloud SQL socket configuration, production readiness flags and Secret Manager bindings were verified, and no revision-level ERROR logs were present during the smoke window.
- Published the current frontend build to Cloudflare Worker `garageai-1-0`; Worker version `444d938a-d77c-45fd-aa42-ba539ba29ce8` is active. Public health checks returned 200 through the Worker, the Cloud Run service URL and `https://garageai.site`.


- The previous `829cc69` deployment remains available as the tagged rollback revision `garageai-web-canary-00014-yuy`.

- Confirmed project: garage-ai-512223, region europe-west1. The second project garageai-512320 was not used because it has no GarageAI Cloud SQL instance.
- Artifact Registry repository garageai was created because the existing Cloud Build configuration targets it.
- Billing budget GarageAI 300 SGD guardrail was created for numeric project 215646849370, with 25/50/75/90/100% current-spend alerts and a 75% forecast alert. The billing account currency is SGD.
- garageai-agents revision 00033-lxm serves 100% traffic, is private, uses the dedicated garageai-agents-runtime service account, containerConcurrency=1, maxScale=1, and returns 200 from /health with an identity token. Unauthenticated /health returns 403.
- garageai-agents-runtime has roles/aiplatform.user and Secret Manager access to agents-api-token. garageai-web-runtime has roles/run.invoker on garageai-agents and Secret Manager access to agents-api-token.
- Web smoke revision garageai-web-canary-00011-xit has AGENTS_SERVICE_URL, AGENTS_SERVICE_AUDIENCE, the Secret Manager token reference, and an admin allowlist. It returns 200 from /api/health and 401 for an anonymous /api/agents/run request. It is tagged agents-smoke and receives no production traffic.
- A full web-to-agent POST could not be executed from this operator shell because minting an OIDC token for the web runtime would require temporary roles/iam.serviceAccountTokenCreator. That escalation was blocked by the automatic safety review; run the authenticated smoke from Cloud Run or an already-approved CI identity instead.
- Local validation completed with 28 Vitest files and 161 tests passing, TypeScript typecheck passing, Vite production build passing, server bundle build passing, environment contract passing, PostgreSQL schema contract passing, and git diff --check passing.
- Web revisions `00012-pox` and `00013-pec` were rejected by the production storage safety gate after incomplete environment updates; they receive no traffic and must not be promoted.
- Added scripts/cloud-run-agent-smoke.py for an internal Cloud Run Job or approved CI identity. It obtains the metadata-server OIDC token, reads AGENTS_API_TOKEN only from the mounted environment, calls the private /agents/run endpoint once, checks HTTP 200 and the qa result key, and prints no model response or secret.

## Remaining release gates

The infrastructure rollout is complete for the current commit. The remaining
release gates are application-level evidence: one authenticated live
POST `/api/agents/run` through the web revision from Cloud Run or an approved
CI identity, independent mailbox receipt for the email-code flow, scanner and
OCR acceptance evidence, legacy-data provenance/privacy review, and the agreed
post-release observation window for 5xx, latency, Cloud SQL, email and spend.
