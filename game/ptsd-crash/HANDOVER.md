# PTSD Crash: handover

This is the full game, ready to run. It ships in play-money mode with a demo sign-in, so you can try it right away. This page lists what's done and what you still need to do before real players use it. Technical details are in `README.md`.

## What's done

- The game: buy, sell, sell 50%, rug/crash, tops out at 99.99x (about 1 round in 1,000), no auto-sell, and a fresh token every round (PeeTsTds, Dick, PTSDICK, GENWEALTH).
- Characters: PT (the player on the chart), Cousin Dick (trades on the same chart, brags, heckles, tilts you, with 32 recorded voice lines), ZachGPT cameos, Candy on big wins, a "You owe Cousin Dick" tab, and a BREAKING news ticker.
- Sign in with X: fully built, switched off until you add your X app keys (step 1 below). Until then a demo sign-in asks for any username.
- Profile pictures and usernames from X show in the top bar, the chat and the leaderboard.
- Chat: one shared chat about the game, under each player's X username. Players can delete their own messages, admins can delete any.
- Leaderboard page (`/leaderboard`), ranked by profit (PnL): today, this week, this month, all time.
- Fairness: every round's result is locked before the bet and can't be seen by anyone until the round ends. Players can re-check any past round in the game.
- Share a win: a picture card for X and Telegram, with a link back to the game.
- Loading screen and a "powered by DOXX" badge in the top bar (links to doxxuki.xyz/arcade).
- Two sound switches: sound effects (incl. heartbeat) and Cousin Dick's voice, separately.
- WL campaign: onboarding (connect X → paste ETH wallet → follow @ptsdshow for the first 100k (a like/tag/RT task for the announcement post appears once `ANNOUNCE_POST_URL` is set) → How to play → APE IN), 100k starter credits, another 100k claim every 24h, How to play + FAQ button, Campaign leaderboard with countdown to the snapshot, live WL / free-mint counts and prize badges.
- Winners list: `node --env-file=.env scripts/winners.mjs > winners.csv` gives rank, X username, wallet, PnL and prize.

## Before launch: your to-do list

### 1. Turn on real "Sign in with X"
1. Go to developer.x.com, create a project and an app.
2. In the app's "User authentication settings": turn on OAuth 2.0, type **Web App (confidential client)**, permissions **Read**.
3. Callback URL: `https://YOUR-DOMAIN.com/auth/x/callback` (your `PUBLIC_URL` + `/auth/x/callback`, exactly).
4. Website URL: your game's address.
5. Copy the **Client ID** and **Client Secret** into `.env` as `X_CLIENT_ID` and `X_CLIENT_SECRET`, and set `DEMO_LOGIN=0`.
6. Restart. The "Sign in" button now goes to X.
7. Test: sign in, check your X picture and username appear top right.

Note: the X flow was built to X's published docs but has not been run against a live X app yet (no keys on our side). Test it first.

### 2. Connect real money (your wallet / balances)
Right now balances are an internal ledger and in test mode everyone starts with fake money.
- Decide how players fund and withdraw (your token, a wallet connection, credits bought elsewhere...).
- In `src/server.js`, the section marked `WALLET` is the only place that reads or changes balances: `balanceOf()`, and `q.addBal` inside `buy`, `sell` and `finishOverdue`. Swap those for your system. They run inside a database transaction so a round can never pay twice. Keep that guarantee in whatever you plug in.
- Set `CURRENCY`, `MIN_BET`, `MAX_BET` in `.env`.
- Set `CRASH_TEST=0` (this also hides the Refill button and the test banner).

### 3. Host it on your domain
- Needs Node 20.6 or newer. `npm install`, then `npm start` (or pm2 with `ecosystem.config.cjs`).
- Put it behind a web server that does HTTPS (nginx, Caddy, Cloudflare...). It listens on `127.0.0.1:3512` by default.
- Set `PUBLIC_URL` to the exact public address (for example `https://ptsdshow.com/crash`) and `CRASH_BASE` to the path part (`/crash`, or empty if it's the whole site).
- Run **one** copy only. Live rounds, timers and chat limits are kept in the server's memory.

### 4. Back up the database
- Everything (players, rounds, balances if you keep the internal ledger, chat) is one SQLite file: `DB_PATH` (default `data/crash.db`).
- Back it up regularly (for example a nightly copy using `sqlite3 data/crash.db ".backup backup.db"`).

### 5. Chat admins
- Put the X usernames (no @) of your moderators in `ADMIN_X_USERNAMES`. They get a delete button on every message.
- There's a basic spam limit (one message per 2.5 seconds, 280 characters). No word filter yet. Add one if you need it.

### 6. Money risk and rules
- House edge is 5%. The biggest single payout is `MAX_BET` × 100. Make sure the house can cover several of those in a row.
- Simulations to check the numbers: `npm run test:odds`.
- Check gambling rules for where you'll offer it (licensing, 18+, blocked countries). The game shows "18+ · play responsibly" but doesn't block anyone.

### 7. Campaign settings
- Set `CAMPAIGN_START` (launch) and `CAMPAIGN_END` (snapshot) in `.env`. Rounds after the snapshot don't count.
- Set `ANNOUNCE_POST_URL` to the announcement post on X.
- Intro song is in `public/audio/intro.mp3` (plays once per visit when the page opens).
- The wallet field takes whatever the player pastes (no format check), so check the winners' wallets in the CSV before sending WLs.
- After the snapshot: run the winners script and use the CSV for WLs and free mints.

### 8. Optional content tweaks
- Two voice clips will practically never play because they name numbers Cousin Dick never reaches: "Me selling at 100x was" (tilt/09) and "I sold the top at 30x" (taunt/02). Re-record without the number if you want them heard.
- Token names: `TICKERS` in `public/app.js`.
- Text lines (ZachGPT, Candy, news ticker, extra Cousin Dick lines): arrays at the top of `public/app.js`.
- Voice clips: `public/voice/<moment>/`, captions in `VOICE` in `public/app.js`.

## Quick test checklist after setup
- [ ] Game loads, loading screen shows, then the chart.
- [ ] Sign in with X works and shows your picture.
- [ ] Buy, Sell, Sell 50% all work. Balance changes correctly.
- [ ] Let one round crash while holding: rekt popup + Cousin Dick line + voice.
- [ ] Chat: post a message, see it from another device, delete it.
- [ ] Leaderboard shows the round.
- [ ] Share a win: the link shows the picture card when pasted in X or Telegram.
- [ ] `npm run test:money` against your test server reports 0 fails (needs `CRASH_TEST=1`).
