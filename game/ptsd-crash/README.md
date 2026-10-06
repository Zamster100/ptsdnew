# PTSD Crash

A crash game styled as a live trading chart. One player against the house: hit Buy, the chart pumps and dumps, Sell before it rugs. Cousin Dick trades on the same chart. Players sign in with X, chat, and compete on a PnL leaderboard.

Start with `HANDOVER.md`: what's done and what's left before launch.

## Run it

```
npm install
cp .env.example .env      # then fill it in
node --env-file=.env src/server.js
```

Or with pm2: edit `ecosystem.config.cjs`, then `pm2 start ecosystem.config.cjs`.

Quick local try in play-money mode: `CRASH_TEST=1 node src/server.js`, then open http://localhost:3512/.

Needs Node 20+. Everything is served by one small Node server (no build step): the game at `/`, the leaderboard at `/leaderboard`, the API at `/api/*`, X sign-in at `/auth/x/*`, and shared win cards at `/win/<id>`.

## Settings (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3512` | Port the server listens on. |
| `HOST` | `127.0.0.1` | Address it listens on. Keep 127.0.0.1 behind a web server (nginx, Caddy) that handles HTTPS. |
| `CRASH_BASE` | `""` (site root) | Path the game lives under, e.g. `/crash`. |
| `PUBLIC_URL` | `http://localhost:PORT/BASE` | Full public address of the game, no trailing slash. Used for X sign-in and share links. |
| `DB_PATH` | `data/crash.db` | SQLite database file. |
| `LOG_DIR` | `data/logs` | Sell log + browser error log. |
| `CURRENCY` | `CREDITS` | Name of the currency shown everywhere. |
| `MIN_BET` / `MAX_BET` | `1000` / `10000` | Bet limits. |
| `CRASH_TEST` | off | `1` = play-money mode: new players start with `TEST_START`, a Refill button shows. |
| `TEST_START` | `1000000` | Starting balance in test mode. |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | none | Turns on real "Sign in with X" (see below). |
| `DEMO_LOGIN` | on | Without X keys, players sign in by typing a username. Set `0` to turn off. |
| `ADMIN_X_USERNAMES` | none | Comma list of X usernames that can delete any chat message. |
| `CLAIMS` | off | `1` = WL campaign credits: players get `START_CREDITS` after onboarding, then `DAILY_CREDITS` every `CLAIM_HOURS`. |
| `START_CREDITS` / `DAILY_CREDITS` / `CLAIM_HOURS` | `100000` / `100000` / `24` | Credit amounts and claim interval. |
| `CAMPAIGN_START` / `CAMPAIGN_END` | none | ISO times. Only rounds inside count on the Campaign leaderboard; the snapshot is `CAMPAIGN_END`. |
| `WL_MAX` / `WL_PER` | `500` / `10` | WL spots = min(WL_MAX, players / WL_PER). |
| `MINT_MAX` / `MINT_PER` | `25` / `200` | Free mints = min(MINT_MAX, players / MINT_PER). |
| `X_HANDLE` | `ptsdshow` | Account players are asked to follow in onboarding. |
| `ANNOUNCE_POST_URL` | none | The X post players like / RT / tag 3 friends on. |

`.env.example` lists them all, `ecosystem.config.cjs` is a pm2 example.

## X sign-in

1. In the X developer portal create an app with OAuth 2.0 turned on (type: Web App, confidential client).
2. Callback URL: `<PUBLIC_URL>/auth/x/callback`. Scopes: `users.read tweet.read`.
3. Set `X_CLIENT_ID` and `X_CLIENT_SECRET`, restart. The demo sign-in switches off and the button goes to X.

The player's X username, name and profile picture (400px) are stored in `crash_users`. Player ids are `x:<X user id>` (demo sign-ins use `demo:<username>`). Sessions are an HttpOnly cookie, stored hashed in `crash_sessions`, 30 days.

## Plugging in your own wallet

Balances live in the `crash_balances` table. To use your own ledger, replace `balanceOf()` and the `q.addBal` calls inside `buy`, `sell` and `finishOverdue` in `src/server.js` (marked `WALLET`). They run inside database transactions so a round can never pay twice.

## Fairness

- Every player has their next server seed locked in before they bet; they see its SHA-256 hash.
- Crash point = HMAC-SHA256(server seed, `clientSeed:nonce`), turned into a multiplier by `crashFromR()` in `public/path.js`.
- The server seed is only revealed after the round ends. Nothing sent during a round contains it or the crash point.
- The chart's dips and Cousin Dick's trades come from a second seed made from the same locked seed. They never go above the trend, and say nothing about when it crashes.
- Players can tap any past round to re-check it in the browser.

## Odds

- House edge 5% (`EDGE` in `public/path.js`).
- Up to 30x: chance to reach x = 0.95 / x, so any sell target up to 30x returns 95% on average.
- 30x to 100x: the chance fades out smoothly so crashes spread across that range.
- Top crash is 99.99x, reached about once in 1,000 rounds (`P_MAX_INV`). 100x itself never comes and there's no auto-sell: like every round it rugs, and anyone still holding gets rekt.
- Simulations: `node test/ev.mjs 40000` (returns per sell target), `node test/api.mjs 12` (money check against a running test server).

## Files

- `src/server.js` game engine + API
- `src/auth.js` sign-in (X + demo)
- `src/chat.js` chat
- `src/campaign.js` onboarding (wallet, social step), credit claims, campaign leaderboard window
- `scripts/winners.mjs` campaign winners CSV with wallets
- `src/card.js` share card image for X/Telegram previews
- `public/path.js` price path + odds, shared by server and browser
- `public/app.js`, `public/index.html`, `public/style.css` the game
- `public/leaderboard.html` leaderboard page
- `public/img/` characters

## Content

- Intro song: `public/audio/intro.mp3` ("Rugged Rekt Liquidated"). Plays once per visit when the page opens (on the first tap if the browser blocks sound before that). Off when sound effects are off.
- How to play + FAQ text: `HOW` and `FAQ` in `public/app.js`.

- Cousin Dick's recorded lines: `public/voice/<moment>/NN.mp3`, listed with their captions in `VOICE` in `public/app.js`. Moments: idle, tilt (he sold, you got rekt), taunt (you sold early), both (you both got rekt), heckle (while holding), small (small win). Clips that name a multiplier only play when the real number is close.
- Text-only lines (ZachGPT, Candy, news ticker, extra Cousin Dick lines) are the arrays at the top of `public/app.js`.
- Token names: `TICKERS` in `public/app.js` (a new one every round).
