# Git history secret remediation: local preparation report

Date: 2026-11-14

This report records a safe preparation pass for the procedure in `docs/git-history-secret-remediation.md`. It does not rewrite history, contact a remote, force-push, rotate credentials, or publish any secret values.

## Repository checks

Commands run from the repository root:

```powershell
git status --short --branch
git remote -v
git show-ref
git log --all --oneline -- data/sessions.json
git count-objects -v
```

Observed results:

- Worktree status is clean on `main` (`## main`).
- No Git remotes are configured (`git remote -v` produced no output).
- Local refs are ordinary branches plus Codex checkpoint refs; there is no checked-in mirror or bundle backup.
- `git count-objects -v` reports one packed object set and no loose or garbage objects.
- `git log --all --oneline -- data/sessions.json` produced no commits for the refs currently present. This is only a local-ref check; it does not prove that a remote or unreachable object database is clean.

The historical commit IDs named by the runbook (`433a567` and `b24b8e5`) are not resolvable in this checkout (`git cat-file` reports a malformed/unknown object name). Do not infer that the remote history is remediated from this result.

## Tooling check

```powershell
Get-Command git-filter-repo -ErrorAction SilentlyContinue
git filter-repo --version
```

`git-filter-repo` is not installed in this environment. No rewrite was attempted. Install it only from the approved/trusted source in the administrative maintenance environment.

## Safe procedure for the authorized maintenance window

Run these commands in a new directory outside any development clone. Replace the URL and paths only after the repository owner confirms the maintenance window, access to all clones/forks/CI caches, production session rotation, and a verified backup of non-Git data.

```powershell
$work = Join-Path $env:TEMP 'GarageAI-history-remediation'
New-Item -ItemType Directory -Force $work | Out-Null
Set-Location $work
git clone --mirror <approved-repository-url> GarageAI_1.0-history-remediation.git
Set-Location GarageAI_1.0-history-remediation.git
git bundle create ..\GarageAI_1.0-before-history-remediation.bundle --all
git fsck --full
git filter-repo --force --path data/sessions.json --invert-paths
git fsck --full
git log --all -- data/sessions.json
```

Expected verification after `git filter-repo`: `git fsck --full` completes without new errors and `git log --all -- data/sessions.json` prints no commits. Run the same Gitleaks command used by CI against the rewritten mirror, keeping reports containing secret values out of GitHub, logs, and issue trackers. Only after a green scan and confirmed rotation may the repository administrator force-push the rewritten refs, then immediately restore branch protection.

Every developer and fork owner must use a fresh clone after publication. Invalidate old CI caches and refs, and retain the pre-rewrite bundle in restricted storage because it contains the sensitive old history.

## Verification status

- No mutation was performed.
- No remote or local mirror backup was available for a filter-repo test.
- A temporary clone test was therefore not run; the required filter-repo executable is also absent.
- Authorization, secret/session rotation, remote rewrite, CI Gitleaks scan, and production smoke remain outstanding administrative actions.

