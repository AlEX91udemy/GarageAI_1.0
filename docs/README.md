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

**Current status (2026-11-14):** public launch readiness is not confirmed. The 2026-11-13 deployment record says Cloud Run revision `garageai-web-canary-00008-hal` serves 100% of Worker API traffic. CI on code SHA `e3fa304` passed Node and Python jobs but failed Gitleaks on historical session data; that CI does not cover the later auth, OCR and catalog changes. The approved registration policy is implemented in the working tree: email is required, new accounts remain pending until code verification, and registration is limited to 5 new accounts per IP per 15 minutes. Before public launch, apply migration 003, run JSON/PostgreSQL HTTP and trusted-proxy tests, remediate Git history through the controlled runbook, pass scanner/catalog gates on the final SHA, verify mailbox delivery and complete the observation window. See the current readiness plan.
