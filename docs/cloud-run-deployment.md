# GarageAI Cloud Run deployment runbook

Status: **deployment prepared, not executed**. This document does not claim that any Google Cloud resource has been created.

## Production blockers

1. `server/store.ts` stores user data in JSON files on the container filesystem. Cloud Run's writable filesystem is ephemeral and not shared between instances. **Do not serve real user data until persistence is migrated to a managed transactional database** and backup/restore tests pass.
2. The Python dependency audit flags `opentelemetry-api` pulled by `google-adk==2.13.0` for CVE-2026-114603. Do not suppress the audit or force an incompatible version. Keep agent deployment private until a compatible upstream dependency set is available and tested.
3. The Node service does not yet call the separate Python agent service through an authenticated service-to-service client. Deploying the agent service alone does not integrate agents into the user-facing product.

## Suggested initial resources

- Region: `europe-west1` (Belgium), subject to model availability and data-residency requirements.
- Artifact Registry repository: `garageai`.
- Cloud Run services: `garageai-web` and, when ready, private `garageai-agents`.
- Store API keys and `AGENTS_API_TOKEN` in Secret Manager, never in source files.
- Use dedicated runtime service accounts with least privilege. For Vertex AI, grant the required Vertex AI role to the service identity.
- Keep the agents service private. Cloud Run IAM is the primary boundary; the application token is an additional layer.

## APIs and billing

Enable only Cloud Run, Artifact Registry, Cloud Build, Secret Manager, and Vertex AI if using Gemini through Vertex AI. Document AI is optional. Check Billing > Reports and budgets after deployment; do not assume all AI Studio usage is covered by Google Cloud credits.

## Build the web container

From the repository root, after selecting the intended project:

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com aiplatform.googleapis.com
gcloud artifacts repositories create garageai --repository-format=docker --location=europe-west1
gcloud builds submit --tag "europe-west1-docker.pkg.dev/$PROJECT_ID/garageai/garageai-web:latest" .
```

Do not deploy the web service with real user data until database migration and backup/restore tests are complete.

## Build the private agent container

Use the repository root as build context so the image contains the source files used by the bounded repository snapshot:

```bash
gcloud builds submit --config=cloudbuild-agents.yaml .
```

Before deployment, create a Secret Manager secret named `agents-api-token` and grant the agent runtime service account access. Use the Cloud Run service identity for Vertex AI instead of a long-lived service-account key. Keep the service private:

```bash
gcloud run deploy garageai-agents \
  --image "europe-west1-docker.pkg.dev/$PROJECT_ID/garageai/garageai-agents:latest" \
  --region europe-west1 \
  --no-allow-unauthenticated \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=europe-west1,GEMINI_MODEL=gemini-3.8-flash" \
  --set-secrets "AGENTS_API_TOKEN=agents-api-token:latest"
```

This is a template, not a completed deployment. Check model availability and resolve the dependency-audit blocker first. Do not make the service public to work around authentication.

## Connect the web service to the private agent service

The Node API exposes an authenticated `POST /api/agents/run` proxy. It validates the task and allowed agent names, applies the Node-side AI rate limit, and calls `POST /agents/run` on the private Python service. In production it obtains a Google ID token from the Cloud Run metadata server and also sends `X-Agents-Token`; neither token is returned to the browser.

Do this only after the JSON store/session persistence blockers are resolved and the Python dependency audit is clean:

1. Get the deployed agent service URL and set the web runtime identity:
   ```bash
   export AGENTS_SERVICE_URL="$(gcloud run services describe garageai-agents --region europe-west1 --format='value(status.url)')"
   export WEB_SERVICE_ACCOUNT="garageai-web-runtime@$PROJECT_ID.iam.gserviceaccount.com"
   ```
2. Grant only the web runtime service identity permission to invoke the agent service:
   ```bash
   gcloud run services add-iam-policy-binding garageai-agents \
     --region europe-west1 \
     --member="serviceAccount:$WEB_SERVICE_ACCOUNT" \
     --role="roles/run.invoker"
   ```
3. Give the web service account Vertex AI access only if the web backend itself uses Vertex AI:
   ```bash
   gcloud projects add-iam-policy-binding "$PROJECT_ID" \
     --member="serviceAccount:$WEB_SERVICE_ACCOUNT" \
     --role="roles/aiplatform.user"
   ```
4. On the web service, configure the same Secret Manager secret `agents-api-token` used by the agent service, plus the agent service URL/audience. Keep the service public only if the application’s own login/session controls and production database are ready. Do not disable Cloud Run IAM on the agent service.

Environment settings:
- `AGENTS_SERVICE_URL`: exact Cloud Run service URL returned by `gcloud run services describe`.
- `AGENTS_SERVICE_AUDIENCE`: normally the same service URL; use a custom value only when Cloud Run is configured for that audience.
- `AGENTS_API_TOKEN`: same high-entropy secret in both services, stored in Secret Manager. Never commit or send it to the browser.
- `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`: only when the web service uses Vertex AI directly.

The proxy is covered by client-level unit tests and route input-validation tests. Real OIDC, IAM policy, Vertex AI and model invocation must still be smoke-tested in the actual project; this runbook does not indicate that cloud setup has been executed.

## Cloudflare routing

1. Keep DNS for `garageai.site` in Cloudflare.
2. After deploying the web service, point the web hostname to the verified Cloud Run target using a supported Cloudflare configuration; verify the exact target and TLS mode before proxying.
3. Do not publish a DNS record for the agent service.
4. Cache only static assets; never cache authenticated API responses or user backups.
5. Use WAF/rate limits as additional protection, not as a substitute for application authorization or Cloud Run IAM.

## Smoke tests

- [ ] `/api/health` responds without leaking secrets or user data.
- [ ] Anonymous requests to protected routes are rejected.
- [ ] Two users cannot read, modify, delete, export, or restore each other's records.
- [ ] Restarting/scaling does not lose or mix user data.
- [ ] Agent `/health` is reachable only through the trusted path.
- [ ] Missing agent token is rejected and missing server-side configuration fails closed.
- [ ] A real agent request succeeds through the intended Vertex AI project/model.
- [ ] Logs contain no passwords, tokens, VINs, receipts, or full backups.
- [ ] Billing budget alerts are configured and charges verified.

## Rollback

Keep the previous Cloud Run revision until smoke tests pass. Roll back if authentication, persistence, or agent invocation fails. Never use the ephemeral filesystem as a recovery strategy.
