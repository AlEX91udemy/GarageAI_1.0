# Deployment backup log

## 2026-11-09

- Project: `garage-ai-512223`
- Cloud SQL instance: `garageai-postgres`
- Backup ID: `1794210327327`
- Type: on-demand
- Description: `pre-import-2026-11-09`
- Final status: `SUCCESSFUL`
- Purpose: backup created before legacy data import and production cutover checks

## Restore rehearsal

- Backup resource: `projects/garage-ai-512223/backups/4b538140-d963-4d0c-9b7b-7546efe18ab5`
- Temporary instance: `garageai-restore-20261109`
- Restore operation: completed successfully with PostgreSQL 16 and instance state `RUNNABLE`
- Cleanup: temporary instance deleted after the rehearsal
- Limitation: direct schema and row-count checks could not run because the local egress path could not reach the temporary instance on port 5432, and Cloud SQL Auth Proxy was unavailable in the local SDK

## 2026-11-11

- Project: `garage-ai-512223`
- Cloud SQL instance: `garageai-postgres`
- Backup ID: `1794418318391`
- Type: on-demand
- Description: `pre-legacy-import-2026-11-11`
- Final status: `SUCCESSFUL`
- Purpose: backup created immediately before the legacy JSON import

