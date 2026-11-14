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

**Current status (2026-11-14):** the deployed service and current `main` are operationally verified, but public launch acceptance is still **NO-GO**. See [release evidence](release-evidence-2026-11-14.md) for the latest SHA, CI, Cloud SQL, IAM and public health evidence, plus the remaining external gates: Cloudflare Workers Builds, DNS aliases, private-agent provider smoke, mailbox delivery, OCR acceptance, legacy-data provenance/privacy and the observation window.
