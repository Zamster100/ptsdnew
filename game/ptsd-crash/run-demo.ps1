# Preview the bot flagging on your PC with a SEPARATE demo database (data\demo.db). Your normal data\crash.db is not touched.
#   cd C:\Apps\PTSD\game\ptsd-crash ; .\run-demo.ps1
# Re-running starts again from fresh demo data. Stop with Ctrl+C.
param([string]$Csv = "$env:USERPROFILE\Downloads\bot-list-updated.csv")
$env:DB_PATH         = "data\demo.db"
$env:LOG_DIR         = "data\demo-logs"
$env:CRASH_BASE      = "/crash"
$env:PUBLIC_URL      = "http://localhost:3512/crash"
$env:CRASH_TEST      = "1"
$env:CLAIMS          = "1"
$env:CAMPAIGN_START  = "2026-10-06T00:00:00Z"
$env:CAMPAIGN_END    = "2026-10-16T16:00:00Z"
$env:SUPPORT_URL     = "https://discord.gg/example"
if (-not (Test-Path node_modules)) { npm ci }
Remove-Item "data\demo.db*" -ErrorAction SilentlyContinue
node scripts/seed-demo.mjs $Csv
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host ""
Write-Host "Demo ready: http://localhost:3512/crash/leaderboard  (bots are on top, not flagged yet)"
Write-Host "To flag them, open a SECOND PowerShell in this folder and run:"
Write-Host '   $env:DB_PATH="data\demo.db"; $env:CAMPAIGN_START="2026-10-06T00:00:00Z"; $env:CAMPAIGN_END="2026-10-16T16:00:00Z"'
Write-Host "   node scripts/flag-bots.mjs `"$Csv`"            (dry run)"
Write-Host "   node scripts/flag-bots.mjs `"$Csv`" --apply    (do it, then refresh the leaderboard)"
Write-Host ""
node src/server.js
