# One-time GitHub setup for the release flow (dev → staging, main → production).
# Run from the repo root in PowerShell, with the GitHub CLI logged in as a repo admin:
#   gh auth login
#   .\scripts\github-setup.ps1 -Repo "your-org/eul-platform"
# Optional: -Reviewers 1   (PRs need 1 approval; keep 0 if you are the only developer)
# Safe to run again. Asks (hidden) for the staging admin password used by the end-to-end tests.
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [int]$Reviewers = 0
)
$ErrorActionPreference = 'Stop'

function Step($text) { Write-Host "`n▶ $text" -ForegroundColor Yellow }
function Ok($text) { Write-Host "  ✓ $text" -ForegroundColor Green }
function Put-Json($path, $object) {
  $file = New-TemporaryFile
  $object | ConvertTo-Json -Depth 10 | Set-Content -Path $file -Encoding utf8
  gh api -X PUT $path --input $file | Out-Null
  Remove-Item $file
}

gh auth status | Out-Null

Step "Repository settings"
# Never auto-delete branches after merge (it would delete dev after the dev → main PR).
gh api -X PATCH "repos/$Repo" -F allow_merge_commit=true -F allow_squash_merge=true `
  -F allow_rebase_merge=false -F delete_branch_on_merge=false | Out-Null
Ok "merge commits + squash allowed, rebase off, branches kept after merge"

Step "dev branch"
$devExists = $true
try { gh api "repos/$Repo/branches/dev" | Out-Null } catch { $devExists = $false }
if (-not $devExists) {
  $mainSha = gh api "repos/$Repo/git/ref/heads/main" --jq '.object.sha'
  gh api -X POST "repos/$Repo/git/refs" -f ref="refs/heads/dev" -f sha="$mainSha" | Out-Null
  Ok "created dev from main"
} else { Ok "dev exists" }
gh api -X PATCH "repos/$Repo" -f default_branch=dev | Out-Null
Ok "default branch = dev (new PRs target dev by default)"

Step "Branch protection: dev"
Put-Json "repos/$Repo/branches/dev/protection" @{
  required_status_checks        = @{ strict = $false; contexts = @('check') }
  enforce_admins                = $false
  required_pull_request_reviews = @{ required_approving_review_count = $Reviewers; dismiss_stale_reviews = $true }
  restrictions                  = $null
  allow_force_pushes            = $false
  allow_deletions               = $false
}
Ok "PR required, CI 'check' must pass, no force-push, cannot be deleted"

Step "Branch protection: main"
Put-Json "repos/$Repo/branches/main/protection" @{
  required_status_checks        = @{ strict = $false; contexts = @('check', 'promotion-guard', 'staging/verified') }
  enforce_admins                = $true
  required_pull_request_reviews = @{ required_approving_review_count = $Reviewers; dismiss_stale_reviews = $true }
  restrictions                  = $null
  required_linear_history       = $false
  allow_force_pushes            = $false
  allow_deletions               = $false
}
Ok "only PRs from dev or hotfix/*, CI + staging/verified must be green, applies to admins too"

Step "Environments"
gh api -X PUT "repos/$Repo/environments/staging" | Out-Null
Ok "staging (deploys automatically from dev)"
Put-Json "repos/$Repo/environments/production" @{
  deployment_branch_policy = @{ protected_branches = $true; custom_branch_policies = $false }
}
Ok "production (only protected branches, i.e. main, can deploy)"

Step "End-to-end test login for staging"
$email = Read-Host "  Staging admin email (the first admin created by the seed, e.g. admin@eulimousine.com)"
gh variable set E2E_ADMIN_EMAIL --env staging --repo $Repo --body $email | Out-Null
Write-Host "  Staging admin password (hidden, stored as a GitHub environment secret):"
gh secret set E2E_ADMIN_PASSWORD --env staging --repo $Repo
Ok "E2E_ADMIN_EMAIL (variable) + E2E_ADMIN_PASSWORD (secret) on the staging environment"

Write-Host @"

Still to add per environment (printed by: EUL_ENV=<env> bash infrastructure/gcp/3-github.sh):
  GCP_PROJECT_ID, GCP_WIF_PROVIDER, GCP_DEPLOYER, TURNSTILE_SITE_KEY
  → GitHub → Settings → Environments → staging / production → Environment variables.
Optional: Settings → Environments → production → Required reviewers (an extra click before each release).
"@
