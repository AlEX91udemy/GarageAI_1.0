# GarageAI documentation and reports

Reports and operational runbooks for the GarageAI project.

- [Implementation progress report — 2026-10-27](implementation-progress-2026-10-27.md): work completed, verified checks, remaining blockers and recommended next steps.
- [Security audit report](security-audit-report.md): findings, remediation status, CI evidence and production release decision.
- [Cloud Run deployment runbook](cloud-run-deployment.md): container build instructions, IAM/Secret Manager guidance, deployment prerequisites, smoke tests and rollback.
- [Google Cloud production rollout](gcp-production-rollout.md): cost-bounded deployment sequence, Cloud Run/Cloud SQL/agents gates, smoke tests and rollback. Commands are prepared but require an authenticated operator shell.
- [Current readiness plan — 2026-11-14](../tasks/project-readiness-plan-2026-11-14.md): current audit, production blockers, acceptance criteria and prioritized improvements.
- [Scanner verification plan — 2026-11-14](../tasks/scanner-verification-plan-2026-11-14.md): OCR/scanner test corpus, accuracy targets, manual smoke and release gate.
- [Scanner and recommendations readiness — 2026-11-18](scanner-recommendations-functional-readiness-2026-11-18.md): separate functional description, readiness percentages, evidence status and remaining release gates.
- [Previous release-readiness log — 2026-11-13](../tasks/release-readiness-plan-2026-11-13.md): historical deployment and release-gate evidence.
- [Git history secret-remediation runbook](git-history-secret-remediation.md): separately approved procedure for removing historical session data without suppressing Gitleaks.
- Run `npm run release:readiness` for the current local release-gate report. It intentionally leaves external ownership and production-evidence gates pending until their evidence is recorded.

**Current status (2026-11-20):** the recorded agent service revision `garageai-agents-00061-jus` passed the runtime-identity Vertex and private-agent smoke with `gemini-3.8-flash` through the `eu` endpoint; the previous revision remains available for rollback. Paid-agent access and the production administrator allowlist remain disabled pending separate owner authorization. The workspace email-only authentication and accessibility changes are not in the deployed web image or Worker yet, so the Worker must not be published until the matching backend rollout. Public launch acceptance remains **NO-GO** until the external gates in [release evidence](release-evidence-2026-11-14.md) are independently evidenced.
