# Preview XP, levels, badges, Tickets, referrals and task points with 10 fictional players on your PC.
# Uses a SEPARATE database (data\xp-demo.db). Your normal data\crash.db is not touched.
#   cd C:\Apps\PTSD\game\ptsd-crash ; .\run-xp-demo.ps1
# Then open http://localhost:3520/leaderboard . Re-running starts again from fresh demo data. Stop with Ctrl+C.
# Sign in on the game page with a character's name (e.g. RektRonnie, GenWealthGwen) to play as them.
# Team admin: http://localhost:3520/admin  (user: demo, password: demo123)
$start = (Get-Date).ToUniversalTime().AddDays(-3).ToString("yyyy-MM-ddTHH:mm:ssZ")
$end   = (Get-Date).ToUniversalTime().AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
$env:CYCLES      = "[{`"id`":1,`"name`":`"Cycle 1`",`"start`":`"$start`",`"end`":`"$end`"},{`"id`":2,`"name`":`"Cycle 2`",`"start`":`"$end`",`"end`":`"2099-01-01T00:00:00Z`"}]"
$env:DB_PATH     = "data\xp-demo.db"
$env:LOG_DIR     = "data\xp-demo-logs"
$env:PORT        = "3520"
$env:CRASH_BASE  = ""
$env:SITE_PASSWORD = ""
$env:PUBLIC_URL  = "http://localhost:3520"
$env:CRASH_TEST  = "1"
$env:CLAIMS      = "1"
$env:ADMIN_USERS = "demo:demo123"
$env:TASKS_REQUIRE_X = "0"
$env:START_CREDITS = "0"
$env:DAILY_CREDITS = "10000"
$env:MIN_BET = "100"
$env:MAX_BET = "1000"
if (-not (Test-Path node_modules)) { npm ci }
node scripts/seed-xp-demo.mjs
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Demo ready: http://localhost:3520/leaderboard"
node src/server.js
