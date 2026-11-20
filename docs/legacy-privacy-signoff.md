# Legacy data privacy confirmation

Status: **open**. This record documents available migration evidence and the deletion owner provided by the project owner. It does not attest to data ownership, legal authority, or consent that the repository does not establish.

## Available evidence

- Imported files: `data/users.json`, `data/garage_store.json`, and `data/sessions.json`. The import manifest describes their provenance as a local checkout bundle and says the source environment has not been independently confirmed.
- Import date: 2026-11-11. The deployment record reports that the import completed transactionally and post-import verification passed.
- Pre-import database backup: Cloud SQL backup ID `1794418318391` in project `garage-ai-512223`, instance `garageai-postgres`, described as `pre-legacy-import-2026-11-11`. This identifies a database backup, not the location of a separate copy of the legacy JSON files.
- Retention policy recorded in the release decision: keep the legacy backup in restricted storage for 30 days, then delete it after fresh-clone, Gitleaks, and secret-rotation checks. The exact storage object and retention start date are not recorded.
- Deletion owner: Сабуров Алексей Маратович, as provided by the project owner. The person who will perform deletion and the evidence log are not specified.

## Owner confirmation required

The following statements remain unconfirmed and must not be treated as granted permission:

- Original source system, data owner, and person/date of export. The available evidence establishes only that the imported files came from a local checkout bundle.
- Whether the data owner authorized use of these records in GarageAI and the permitted purposes.
- Current location and identifier of the restricted copy of the legacy JSON files, its access controls, and whether it still exists.
- Date and time when the 30-day retention period starts, and the corresponding deletion deadline.
- Named deletion operator and the record where deletion will be documented.

## Sign-off

I confirm the source, authority to use, storage location, and retention details stated above are accurate, and authorize the stated processing and deletion.

Project owner: Сабуров Алексей Маратович

Signature: ______________________________

Date: ____________________

Deletion completion record: ______________________________

Until the missing facts are verified and this sign-off is completed, the legacy/privacy release gate remains open.
