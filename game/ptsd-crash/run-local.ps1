# Run PTSD Crash on your own PC (play-money, demo sign-in) to preview changes.
#   cd C:\Apps\PTSD\game\ptsd-crash ; .\run-local.ps1
# Then open http://localhost:3512/crash/   (leaderboard: /crash/leaderboard)
# Stop with Ctrl+C. Local data lives in data\crash.db (not committed).
$env:CRASH_BASE      = "/crash"
$env:PUBLIC_URL      = "http://localhost:3512/crash"
$env:CRASH_TEST      = "1"
$env:CLAIMS          = "1"
$env:CAMPAIGN_START  = "2026-10-06T00:00:00Z"
$env:CAMPAIGN_END    = "2026-10-16T16:00:00Z"
if (-not (Test-Path node_modules)) { npm ci }
node src/server.js
