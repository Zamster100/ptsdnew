# PTSD Crash: buy-button delay and claim problems

Investigated 2026-10-12 after players reported a delay on the buy button and not being able to claim the 100k.
Read-only investigation. No code was changed. Status: **parked, revisit later** (not widely reported).

## 1. Buy-button delay: server performance

**What was measured**

| Check | Result |
|---|---|
| Public `/api/config` (from outside) | 0.4 to 2.0 s |
| Public static `app.js` | 0.13 s |
| `/api/config` directly on the server | 0.28 to 0.85 s |
| `/api/leaderboard` directly on the server | 1.2 to 3.7 s |
| Campaign player-count query (in `campaign()`) | 280 to 320 ms per call |
| Server load / memory / pm2 | load 0.65, 11 GB free, stable. Not the cause. |

**Cause**
- The player count in `/api/config` scans all `crash_rounds` (137,671 rows on 2026-10-12) on every call.
  There is no index on `crash_rounds.ts`; only `crash_rounds_player` and the primary key exist.
- SQLite is synchronous inside the single Node process, so each slow query freezes every other request,
  including `/api/buy` and `/api/claim`.
- Each open tab calls `/api/leaderboard?limit=1` every 30 s for the rank pill (`public/app.js:795`).
  The leaderboard page also polls every 30 s (`public/leaderboard.html:216`) with `limit=500`.
- With a few hundred players online the process spends most of its time on these queries, so buy requests queue.
- A single tester generates almost no load, which is why it can't be reproduced alone.
- The table grows every hour, so the scans get slower over time.
- Not proven: whether the 793 blocked accounts (`NOT IN (SELECT ... status='blocked')`) made it worse. Not measured before.

**Suggested fixes (not done)**
1. Cache the campaign player count and the leaderboard for 15 to 30 s.
2. Add an index on `crash_rounds(ts)`.
3. Make the rank-pill query cheap (avoid building the full leaderboard for `limit=1`).
4. Rotate the client log (see below).

## 2. Players can't claim: 20-follower sign-in rule

Added 2026-10-09 in `src/auth.js` (`MIN_X_FOLLOWERS`, default 20), deployed the same day.

- 2,271 sign-in attempts from 377 distinct accounts have been turned away.
  - about 990 attempts had 0 to 4 followers (likely bots)
  - about 1,280 attempts had 5 to 19 followers (includes real-looking people)
- 326 of those accounts never had an account, so they can't get the starter 100k.
- 51 accounts that already claimed are locked out when they sign in again (new device, cleared cookies).
  33 of them are not flagged, for example `Berlazar37` (12 followers, claimed daily on Oct 9).
  Cause: the rule is applied to existing players as well as new ones.
- The "does not qualify" message is a toast shown after the redirect, then it disappears.
  People likely just see themselves not signed in.

**Suggested fixes (not done)**
1. Exempt anyone who already has an account, or lower the threshold.
2. Show a persistent message instead of a toast.
3. This would also let the 33 locked-out players back in.

Also deployed with it: 30-day minimum X account age (`MIN_X_AGE_DAYS`), farm-handle auto-block,
sign-up burst limit. These use the same "does not qualify" message.

## 3. Other findings

- **X sign-in errors:** 3,245 failures with "The user used for authentication is suspended" (HTTP 403 from X).
  Most likely X-suspended accounts retrying (probably the bot farms). Could not confirm: the log has no handles or timestamps.
  Does not affect real players.
- **Claims are working:** 5 to 34 daily claims every hour around the clock, rounds 300 to 1,500 per hour.
- **Client error log hit its 5 MB cap** at 2026-10-12 09:35 and stopped recording
  (`data/logs/ptsd.jsonl`, cap checked in `src/server.js`). Most entries are wallet-extension noise (MetaMask, Talisman).
  About 1,700 "stall" entries were from tabs reported as visible, not conclusive.
- Other noise: `Error: too big` (4) is the 4096-byte request body limit; X upstream hiccups (2).

## 4. Where things are

- Server: `deploy@209.145.48.64`, app in `/opt/ptsd-crash`, pm2 process `ptsd-crash`, port 3512 behind Caddy,
  site served through Vercel at `www.ptsdshow.com/crash`.
- Logs: `~/.pm2/logs/ptsd-crash-{out,error}-0.log`, `/opt/ptsd-crash/logs/auto-flag.log`.
- Hourly bot check: cron at :05, `scripts/auto-flag.mjs --apply`.
- Backups: `~/backups/` (pre-newbots, pre-zero, auto-flag snapshots, `code-pre-restrictions/`, nightly 03:30).
- Code changes from 2026-10-09 (restrictions, `auto-flag.mjs`) are deployed but not committed to git.

## 5. Fixes applied 2026-10-12 (options 1-4), backup in backups/pre-speed-20261012 and server ~/backups/pre-speed-20261012-174743
- Leaderboard rows cached 10 s (`BOARD_CACHE_MS`), campaign player count cached 15 s.
- Index `crash_rounds_ts(ts, state, coin, player)`; player count query rewritten as a join (487 ms -> 45 ms on a copy of the live DB, same result).
- New `/api/rank` (rank + player count only); rank pill uses it and polls every 60 s instead of 30 s.
- Server timings after deploy (localhost): config 3-8 ms, leaderboard limit=500 7-15 ms, rank 1-3 ms (was 0.3-3.7 s).
- Not done: cache headers at the edge (option 7), follower-rule exemption for existing players, client log rotation.
