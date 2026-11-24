# One-time GitHub setup for the release flow (develop → staging, main → production).
# Run from the repo root in PowerShell, with the GitHub CLI logged in as a repo admin:
#   gh auth login
#   .\scripts\github-setup.ps1                       (EU-Limousine/eul-platform)
# Options:
#   -Reviewers 1     PRs need 1 approval (keep 0 if you are the only developer: GitHub does not
#                    let you approve your own PR)
#   -ResetLogin      ask again for the staging test login even if it is already set
# Safe to run again: every step checks first and stops with a clear message if GitHub refuses.
param(
  [string]$Repo = 'EU-Limousine/eul-platform',
  [int]$Reviewers = 0,
  [switch]$ResetLogin
)
$ErrorActionPreference = 'Stop'

function Step($text) { Write-Host "`n▶ $text" -ForegroundColor Yellow }
function Ok($text) { Write-Host "  ✓ $text" -ForegroundColor Green }

# gh is a normal program: when it fails PowerShell does NOT throw, so check its exit code every time.
# (Helpers are NOT called "Gh": PowerShell ignores case, so a function "Gh" would call itself.)
function Invoke-Gh {
  $ErrorActionPreference = 'Continue'   # gh writes progress to stderr; judge by exit code only
  $out = & gh.exe @args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "gh $($args -join ' ')`n$out"
  }
  return $out
}
# Same, but "not found" is an answer (false), not an error.
function Test-Gh {
  $ErrorActionPreference = 'Continue'
  & gh.exe @args 2>&1 | Out-Null
  return ($LASTEXITCODE -eq 0)
}
function Put-Json($path, $object) {
  $file = New-TemporaryFile
  try {
    $object | ConvertTo-Json -Depth 10 | Set-Content -Path $file -Encoding utf8
    Invoke-Gh api -X PUT $path --input $file | Out-Null
  } finally { Remove-Item $file -ErrorAction SilentlyContinue }
}

# Find gh even in a terminal opened before it was installed.
if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
  $env:Path += ';C:\Program Files\GitHub CLI'
  if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
    Write-Host "✗ GitHub CLI (gh) not found. Install it from https://cli.github.com and run this again." -ForegroundColor Red
    exit 1
  }
}

try {
  Invoke-Gh auth status | Out-Null
  $visibility = Invoke-Gh api "repos/$Repo" --jq .visibility
  Ok "logged in; $Repo is $visibility"
  if ($visibility -ne 'public') {
    Write-Host "  ! Private repo: on GitHub Free, branch protection and environments do not work." -ForegroundColor Red
    Write-Host "    Make it public or upgrade the organisation to GitHub Team, then run this again." -ForegroundColor Red
    exit 1
  }

  Step "Repository settings"
  # Never auto-delete branches after merge (it would delete develop after the develop → main PR).
  Invoke-Gh api -X PATCH "repos/$Repo" -F allow_merge_commit=true -F allow_squash_merge=true `
    -F allow_rebase_merge=false -F delete_branch_on_merge=false | Out-Null
  Ok "merge commits + squash allowed, rebase off, branches kept after merge"

  Step "develop branch"
  if (Test-Gh api "repos/$Repo/branches/develop") {
    Ok "develop exists"
  } else {
    $mainSha = Invoke-Gh api "repos/$Repo/git/ref/heads/main" --jq '.object.sha'
    Invoke-Gh api -X POST "repos/$Repo/git/refs" -f ref="refs/heads/develop" -f sha="$mainSha" | Out-Null
    Ok "created develop from main"
  }
  Invoke-Gh api -X PATCH "repos/$Repo" -f default_branch=develop | Out-Null
  Ok "default branch = develop (new PRs target develop by default)"

  Step "Branch protection: develop"
  Put-Json "repos/$Repo/branches/develop/protection" @{
    required_status_checks        = @{ strict = $false; contexts = @('check', 'terraform') }
    enforce_admins                = $false
    required_pull_request_reviews = @{ required_approving_review_count = $Reviewers; dismiss_stale_reviews = $true }
    restrictions                  = $null
    allow_force_pushes            = $false
    allow_deletions               = $false
  }
  Ok "PR required, CI 'check' + 'terraform' must pass, no force-push, cannot be deleted"

  Step "Branch protection: main"
  Put-Json "repos/$Repo/branches/main/protection" @{
    required_status_checks        = @{ strict = $false; contexts = @('check', 'terraform', 'promotion-guard', 'staging/verified') }
    enforce_admins                = $true
    required_pull_request_reviews = @{ required_approving_review_count = $Reviewers; dismiss_stale_reviews = $true }
    restrictions                  = $null
    required_linear_history       = $false
    allow_force_pushes            = $false
    allow_deletions               = $false
  }
  Ok "only PRs from develop or hotfix/*, CI + staging/verified must be green, applies to admins too"

  Step "Environments"
  Invoke-Gh api -X PUT "repos/$Repo/environments/staging" | Out-Null
  Ok "staging (deploys automatically from develop)"
  Put-Json "repos/$Repo/environments/production" @{
    deployment_branch_policy = @{ protected_branches = $true; custom_branch_policies = $false }
  }
  Ok "production (only protected branches can deploy; the workflow itself only deploys main)"

  Step "End-to-end test login for staging"
  $haveLogin = (Invoke-Gh variable list --env staging --repo $Repo) -match 'E2E_ADMIN_EMAIL'
  if ($haveLogin -and -not $ResetLogin) {
    Ok "already set (run with -ResetLogin to change it)"
  } else {
    $email = Read-Host "  Staging admin email (the first admin created by the seed, e.g. admin@eulimousine.com)"
    Invoke-Gh variable set E2E_ADMIN_EMAIL --env staging --repo $Repo --body $email | Out-Null
    Write-Host "  Staging admin password (hidden, stored as a GitHub environment secret):"
    gh.exe secret set E2E_ADMIN_PASSWORD --env staging --repo $Repo
    if ($LASTEXITCODE -ne 0) { throw "gh secret set E2E_ADMIN_PASSWORD failed" }
    Ok "E2E_ADMIN_EMAIL (variable) + E2E_ADMIN_PASSWORD (secret) on the staging environment"
  }

  Step "Check"
  $protected = Invoke-Gh api "repos/$Repo/branches/main/protection" --jq '.required_status_checks.contexts | join(", ")'
  Ok "main requires: $protected"
  $protected = Invoke-Gh api "repos/$Repo/branches/develop/protection" --jq '.required_status_checks.contexts | join(", ")'
  Ok "develop requires: $protected"
} catch {
  Write-Host "`n✗ GitHub refused a step:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "`nSend this red text to Claude." -ForegroundColor Red
  exit 1
}

Write-Host @"

All set on GitHub. Still to add per environment (printed by: EUL_ENV=<env> bash infrastructure/terraform/tf.sh output):
  GCP_PROJECT_ID, GCP_WIF_PROVIDER, GCP_DEPLOYER, and TURNSTILE_SITE_KEY (empty on staging)
  → GitHub → Settings → Environments → staging / production → Environment variables.
Optional: Settings → Environments → production → Required reviewers (an extra click before each release).
"@
