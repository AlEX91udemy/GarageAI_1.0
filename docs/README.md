# GarageAI documentation and reports

Reports and operational runbooks for the GarageAI project.

- [Implementation progress report — 2026-10-27](implementation-progress-2026-10-27.md): work completed, verified checks, remaining blockers and recommended next steps.
- [Security audit report](security-audit-report.md): findings, remediation status, CI evidence and production release decision.
- [Cloud Run deployment runbook](cloud-run-deployment.md): container build instructions, IAM/Secret Manager guidance, deployment prerequisites, smoke tests and rollback.
- [Google Cloud production rollout](gcp-production-rollout.md): cost-bounded deployment sequence, Cloud Run/Cloud SQL/agents gates, smoke tests and rollback. Commands are prepared but require an authenticated operator shell.
- [Current readiness plan — 2026-11-14](../tasks/project-readiness-plan-2026-11-14.md): current audit, production blockers, acceptance criteria and prioritized improvements.
- [Scanner verification plan — 2026-11-14](../tasks/scanner-verification-plan-2026-11-14.md): OCR/scanner test corpus, accuracy targets, manual smoke and release gate.
- [Previous release-readiness log — 2026-11-13](../tasks/release-readiness-plan-2026-11-13.md): historical deployment and release-gate evidence.
- [Git history secret-remediation runbook](git-history-secret-remediation.md): separately approved procedure for removing historical session data without suppressing Gitleaks.

**Current status (2026-11-14):** current commit `3f8224298b42bda984cea89babf43a6cd28d5e36` is deployed. Cloud Run revision `garageai-web-canary-00016-jom` serves 100% of `garageai-web-canary` traffic from image digest `sha256:99187c607e1812b33142a5570aa65d8dea73e65e4ac3f108c3508dff864fd74e`; the current frontend is published to Worker version `444d938a-d77c-45fd-aa42-ba539ba29ce8`. Public health checks through Cloud Run, the Worker and `garageai.site` return 200. Public launch readiness still needs the authenticated agent smoke, independent mailbox receipt, scanner/OCR acceptance evidence, legacy-data provenance/privacy review and the post-release observation window. Historical Gitleaks cleanup remains a separate release gate. See the current readiness plan.
