param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
  [string]$ProjectId,
  [string]$Region = 'europe-west1',
  [string]$SqlInstance = 'garageai-postgres'
)

$ErrorActionPreference = 'Stop'

function Invoke-GcloudValue {
  param([string[]]$Arguments)
  $result = & gcloud @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ('gcloud ' + ($Arguments -join ' ') + ' failed with exit code ' + $LASTEXITCODE + [Environment]::NewLine + ($result -join [Environment]::NewLine))
  }
  return (($result -join [Environment]::NewLine).Trim())
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw 'gcloud is not installed. Install the Google Cloud CLI and authenticate before running this preflight.'
}

$activeAccount = Invoke-GcloudValue @('auth', 'list', '--filter=status:ACTIVE', '--format=value(account)')
if ([string]::IsNullOrWhiteSpace($activeAccount)) {
  throw 'No active gcloud account is configured. Run gcloud auth login or configure workload identity.'
}

$describedProject = Invoke-GcloudValue @('projects', 'describe', $ProjectId, '--format=value(projectId)')
if ($describedProject -ne $ProjectId) {
  throw ('Requested project ' + $ProjectId + ' resolved to ' + $describedProject + '. Stop and verify the project ID.')
}

$configuredProject = Invoke-GcloudValue @('config', 'get-value', 'project')
if ($configuredProject -ne $ProjectId) {
  throw ('gcloud is configured for ' + $configuredProject + ', expected ' + $ProjectId + '.')
}

$enabledOutput = Invoke-GcloudValue @('services', 'list', '--enabled', '--format=value(config.name)')
$enabled = @($enabledOutput -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$requiredApis = @('run.googleapis.com', 'artifactregistry.googleapis.com', 'cloudbuild.googleapis.com', 'secretmanager.googleapis.com', 'sqladmin.googleapis.com', 'aiplatform.googleapis.com', 'logging.googleapis.com', 'monitoring.googleapis.com')
$missingApis = @($requiredApis | Where-Object { $_ -notin $enabled })
if ($missingApis.Count -gt 0) {
  throw ('Required APIs are disabled: ' + ($missingApis -join ', ') + '. Enable them before deployment.')
}

$sqlState = Invoke-GcloudValue @('sql', 'instances', 'describe', $SqlInstance, '--format=value(state)')
if ($sqlState -ne 'RUNNABLE') {
  throw ('Cloud SQL instance ' + $SqlInstance + ' is ' + $sqlState + ', expected RUNNABLE.')
}

$repository = Invoke-GcloudValue @('artifacts', 'repositories', 'describe', 'garageai', ('--location=' + $Region), '--format=value(name)')
if ([string]::IsNullOrWhiteSpace($repository)) {
  throw ('Artifact Registry repository garageai was not found in ' + $Region + '.')
}

$webExists = $true
try { [void](Invoke-GcloudValue @('run', 'services', 'describe', 'garageai-web', ('--region=' + $Region), '--format=value(metadata.name)')) } catch { $webExists = $false }
$agentsExists = $true
try { [void](Invoke-GcloudValue @('run', 'services', 'describe', 'garageai-agents', ('--region=' + $Region), '--format=value(metadata.name)')) } catch { $agentsExists = $false }

Write-Output ('GCP preflight passed for project ' + $ProjectId + ' (' + $Region + ').')
Write-Output ('Active account: ' + $activeAccount)
Write-Output ('Cloud SQL: ' + $SqlInstance + ' (' + $sqlState + ')')
Write-Output ('Artifact Registry: garageai (' + $Region + ')')
Write-Output ('Cloud Run web service present: ' + $webExists)
Write-Output ('Private agents service present: ' + $agentsExists)
Write-Output 'No deployment, billing change, IAM mutation, or secret value access was performed.'
