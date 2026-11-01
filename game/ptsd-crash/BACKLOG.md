# PTSD Crash: fun-layers backlog

One thing at a time. Each item is built, tested and shipped before the next starts. Order below is the build order (change it any time).
Goal: a game people enjoy over a 2-3 week campaign (two 10-day cycles). No multiplayer, no big rewrites.

Rules for every item
- Never change the crash odds unless the item says so and has had a fairness review.
- Schema changes are additive only (the live DB is on the VPS).
- Keep per-round and leaderboard queries cheap (see `speed.md`).

## Up next

### 1. Scoring: one XP counter  (NEXT)
- One number per player per cycle: **XP**, shown on the leaderboard and profile.
- `XP = (PNL + Referral points + Task points + Activity points) x NFT multiplier`
- PNL can go negative. A PNL reset zeroes the PNL part only. Referral, Task and Activity points are separate tracked counters and are never cleared by a reset.
- The NFT multiplier only applies while the total is positive (never makes a negative score worse).
- Everything is tracked in one place so later features (streaks, double XP hour, underdog) just add Activity points.
- Built (needs your review before it goes live):
  - `src/xp.js` holds the formula and the Activity counter (`addActivity`) that later features will call.
  - Ticket multiplier by tier: 1 Ticket x1.1, 2 x1.2, 3+ x1.3, 5+ x1.4, 10+ x1.5 (`TIERS` in `src/wallet.js`).
  - Task points: each task has an XP value, blank = same as its credit reward. Set it in /admin ("XP points"). Stored on each completion; a revoked task loses its points.
  - Leaderboard, profile and share card show XP; hover a leaderboard XP number for the breakdown.
- Still to decide: the actual XP value of each real task (they should be worth a lot more than the credit reward), Activity weights (set per feature as it is built).

## Queued (in order)

### 2. Levels, titles, perks, achievements, campaign milestones  (levels + badge stages BUILT, rest still to do)
- Built: 30 levels. A player's level XP = the highest XP they reached in each cycle, added up over the campaign, so a level never goes down and Cycle 2 starts from the Cycle 1 level.
- Built: a new badge stage every 5 levels: Fresh Bag (1), Paper Hands (5), Diamond Hands (10), Chart Reader (15), Degen (20), Rug Survivor (25), Legend (30).
- Built: "Lv N" pill on the game page with a toast on level up (a popup on a new badge), level chip on the leaderboard, Level section with the badge ladder on the profile.
- Built: leaderboard hover card (tap on phones): level + badge stage, Ticket badge, XP with its breakdown, best hit, win rate, rounds, best streak, referrals, task points, and links to the game profile and the X account. The name still links to X. Achievements get a slot on this card once they exist.
- Curve (`xpForLevel` in `src/xp.js`): level 2 = 500, level 10 = 26,100, level 20 = 100,300, level 30 = 214,400 level XP. Needs tuning once we see real XP numbers.
- Still to do from this item: level perks (avatar frames, ticker themes, bigger claim), achievements, XP milestones with credit rewards, extra earned titles.

### 3. Streaks  (BUILT, defaults below are tunable)
- All bonuses are Activity points (XP only): they never change a payout, the odds or PNL. Rules and settings are at the top of `src/streaks.js`.
- Win streak: a win is a round that ends in profit. Every win that extends a streak of 2+ pays 50 x streak length (capped at 10, so max 500 per win). A loss resets it.
- Perfect sell: a full sell within 5% of the crash point and at 1.5x or more pays 500.
- Login streak: first visit of each task day (resets 9 AM Eastern) pays 100 x days in a row (capped at day 7 = 700). A missed day starts over.
- Bonuses are only paid while a cycle runs; streaks still count outside one.
- Shown as a "Streak" row on the game page (flames grow with the streak), with toasts when XP is paid. Hover for what the next step pays.
- Not done: streaks on the profile page and hover card.

### 4. Double XP hour  (BUILT, defaults below are tunable)
- Every day 9:00 AM Eastern (America/New_York), one hour, same moment the daily tasks reset.
- Doubles Activity/round XP earned in that hour. Never doubles PNL.
- Banner + countdown.
- Built: gold pulsing banner under the top bar on the game, leaderboard and bounties pages (countdown while on, "next in" the rest of the day). Win-streak bonuses, perfect sells and the daily login bonus pay 2x, applied when earned (stored on the row, so it keeps its value). Toasts say "2x Double XP hour".
- Task points stay at face value by default. `DOUBLE_XP_TASKS=1` doubles them too. Profit and referral points never double.
- Env: `DOUBLE_XP_HOUR` (9), `DOUBLE_XP_MINUTES` (60), `DOUBLE_XP_MULT` (2). Handles daylight saving.

### 4b. Fear & Greed sentiment  (BUILT, defaults below are tunable)
- Watches how lucky players have been: sum(pnl + edge*bet) / sum(bet), one equal vote per player (needs 2+ rounds, capped at +-50%), so a whale or a Fear window can't trigger anything alone. Needs 30 rounds and 5 players in the last 15 min.
- Meter 0-100. Hits 75: GREED window, edge 20% (more instant rugs, ~21%). Hits 25: FEAR window, edge -10% (no instant rugs, every target about 10 points likelier). Normal edge 5%. Each window lasts a random 5-15 min, then the reading starts from scratch.
- Public (speculative only): Sentiment button in the top bar of every page flashes red (Fear) / green (Greed). Click: meter, a one-line mood, the message "Be fearful when everyone is greedy, and greedy when everyone is fearful", and a history of when each mood was live. No edges, odds, timers or how-it-works in the panel or in `/api/sentiment`. The round check still shows the edge each round was dealt with (needed for provable fairness).
- Team override (demo/testing only, not labelled in the public log): `POST /api/admin/sentiment {kind: fear|greed|neutral, minutes}` (admin login).
- Env: `SENTIMENT=0` off, `SENTIMENT_GREED_EDGE`, `SENTIMENT_FEAR_EDGE`, `SENTIMENT_MIN/MAX_MINUTES`, `SENTIMENT_MIN_ROUNDS`, `SENTIMENT_MIN_PLAYERS`, `SENTIMENT_GREED_AT/FEAR_AT`, `SENTIMENT_SPAN`.
- Open: needs a real fairness review before launch (edge changes by time). Needs real traffic to tune (the demo can only be forced). Pre-launch legal check applies (odds vary over time while cash prizes are on).

### 5. Bad beat refund
- 3 instant rugs in a row (rekt rounds that crashed under 1.1x) refunds the last bet in credits. Balance only, not PNL.

### 6. Community jackpot
- A share of every player's rekt losses (default 5%) feeds a pot. Players are not charged extra; it is a counter.
- Lottery tickets: earned from losses; ticket counter in the top bar.
- Daily draw at 9 AM Eastern: one winner takes a share.
- Pot Breaker: first player to sell at 50x or higher wins the pot (threshold to confirm).
- Dedicated Jackpot page: pot counter, countdown to the next draw, list of daily winners.

### 7. Underdog boost
- Players far behind get a comeback bonus on their Activity/Task points (odds stay fair).
- Needs a clear definition before building: how far behind counts, how big the bonus is, how it is shown.

### 8. Double down after 5x
- After the price passes 5x, a flashing button lets the player add a second stake equal to the original bet, once per round.
- Fairness: the entry price must use the undipped trend (not the dipped price), otherwise players can buy the bottom of a dip.
- Touches sell/settle, history, stats, the verify screen, and new columns on `crash_rounds`. Biggest change, built last.

## Parked (ideas to come back to)
- Missions: daily, weekly, rerolls, campaign-wide community goals (needs specifics).
- Socials and competition: crews, head-to-head challenges, referral tiers.
- Multiplayer "Live Room" as a scheduled event.
- Cousin Dick duel and record, extra Candy / ZachGPT reactions and voice lines.
- Round twists: auto-sell target, risk modes, lucky modifiers, sell 25/75%.
- Redemption round (free stake), streak insurance.
- Other events: happy hour credits, weekend themes, mystery event, event calendar.

## Before launch
- Check the legal side: free play with cash prizes, and an NFT that gives a score edge, may count as consideration in some places.
