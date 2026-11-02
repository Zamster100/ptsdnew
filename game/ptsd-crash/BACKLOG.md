# PTSD Crash: fun-layers backlog

One thing at a time. Each item is built, tested and shipped before the next starts. Order below is the build order (change it any time).
Goal: a game people enjoy over a 2-3 week campaign (two 10-day cycles). No multiplayer, no big rewrites.

Rules for every item
- Never change the crash odds unless the item says so and has had a fairness review.
- Schema changes are additive only (the live DB is on the VPS).
- Keep per-round and leaderboard queries cheap (see `speed.md`).

## Up next

### 1. Scoring: one XP counter  (BUILT)
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

### 2. Levels, titles, perks, achievements, campaign milestones  (ALL BUILT)
- Built: level perks (+5% to +30% on free daily/NFT claims by badge stage; PERKS=0 off), 32 achievements that pay XP once (ACHIEVEMENTS=0 off), community milestones (rounds and players goals, credits for everyone who plays; MILESTONES=0, MILESTONE_ROUNDS, MILESTONE_PLAYERS, MILESTONES_FROM). Page: /rewards.
- Built: menu rail on every page (separate from the play module) and a Stats page (/stats) with your numbers and last 10 transactions.
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

### 5. Bad beat refund  (BUILT, defaults below are tunable)
- 3 rugs in a row (each crashed under 1.1x with nothing sold) refunds the last bet as credits. Popup "BAD BEAT" instead of the rekt popup; a toast on the next visit if the page was closed.
- Credits only: the round and the player's PnL stay as they were (the leaderboard doesn't change). Once per hour per player; the count starts again after a refund.
- Env: `BAD_BEAT=0` off, `BAD_BEAT_COUNT` (3), `BAD_BEAT_UNDER` (1.1), `BAD_BEAT_COOLDOWN_MIN` (60).
- Roughly 0.3% of three-round runs in normal odds (more in a Greed window), so it's rare but it happens.

### 6. Community jackpot  (BUILT, defaults below are tunable)
- 5% of every loss feeds a pot (players are never charged extra). The pot never drops below a floor of 100,000 (what it restarts at after a win).
- Raffle tickets: only instant rugs (crash under 1.1x, JACKPOT_INSTA_UNDER) earn them (1 per 1,000 lost on that round, at least 1). They go into a balance that carries over (max 2,000, JACKPOT_HOLD_MAX). Counter in the top bar of every page, links to the Jackpot page.
- Pledging: entries are open all day (9 AM to 9 AM Eastern, any timezone). Players pledge tickets from their balance on the Jackpot page; a pledge can be topped up but not withdrawn, and pledged tickets are spent win or lose. Auto-pledge (default ON) enters whatever is left when entries close. Daily draw at 9 AM Eastern: one pledged ticket drawn, the owner wins 50% of the pot. Missed days (downtime) are caught up. The winner is told on their next visit. The rekt popup after an instant rug says how many raffle tickets were won.
- Pot Breaker: the first sell at 50x or higher takes the whole pot (popup, credited at once).
- Jackpot page (`/jackpot`): pot counter, countdown to the draw, your tickets / all tickets, how it works, winners list.
- Credits only, paid to the balance: never profit, so no leaderboard or XP effect.
- Team/demo: `POST /api/admin/jackpot` draws today's tickets now.
- Env: `JACKPOT=0` off, `JACKPOT_SHARE`, `JACKPOT_SEED`, `JACKPOT_DAILY_SHARE`, `JACKPOT_BREAKER_X`, `JACKPOT_TICKET_PER`, `JACKPOT_MAX_TICKETS_DAY`.
- Open: the draw uses the server's random number generator (not a published, checkable draw). Fine for credits, but cash-prize rules may want a verifiable draw. Part of the pre-launch fairness/legal review.

### 7. Underdog boost
- Players far behind get a comeback bonus on their Activity/Task points (odds stay fair).
- Needs a clear definition before building: how far behind counts, how big the bonus is, how it is shown.

### 8. Double down after 5x
- After the price passes 5x, a flashing button lets the player add a second stake equal to the original bet, once per round.
- Fairness: the entry price must use the undipped trend (not the dipped price), otherwise players can buy the bottom of a dip.
- Touches sell/settle, history, stats, the verify screen, and new columns on `crash_rounds`. Biggest change, built last.

### Stats page: PNL chart  (BUILT)
- A chart of the player's PNL over time (cumulative, per round and per day) on the Stats page, under the stat tiles. Data already exists in the rounds table.

### Guide page  (BUILT)
- /guide: rules, XP formula and calculator, levels, perks, bonus XP, jackpot, FAQ. Numbers are read live from the game settings.

### 9. Paid bet unlocks and late-cycle rebuys  (SPEC, BENCHED: automatic payments to be designed first)
Goal: test whether people pay, using the top of the board. Bet sizes stay 100 to 1,000 for everyone else. Nothing here changes the crash odds. Payments start manual (see Payments).

**9a. Bigger bets for leaders (unlock 5k, later 10k)**
- 5k bets: offered from day 4 of a cycle to players in the top 100 by XP who also hold at least 25,000 credits (5x the bet). Price $10.
- 10k bets: offered from day 7 to players in the top 20 by XP who also hold at least 100,000 credits (10x the bet). Price $25.
- One unlock lasts for the cycle it was bought in. The unlock is by player, not by balance, and stays after they drop out of the top 100 (so the button doesn't flicker), but the balance rule still applies at bet time (bet at most the balance).
- Message on the offer: "You're ahead. Keep your lead with bigger bets." It shows their rank, XP, and the 5k or 10k button.
- Why these gates: simulation shows only about 3% of players ever reach 25k PNL, so a PNL gate is too rare and too lucky. A rank gate adapts to real numbers. A 5k bet roughly triples a rank-30 player's chance at the top 3 with 3 days left (14% against 5%). 10k is no better than 5k for most players, so it is a small, status-led tier.
- Cohort size per 2,000 players: about 100 for 5k, about 20 for 10k. Expect $100 to $300 per cycle from a 20% buy rate, so treat it as a demand test.
- Settings (env, all tunable live after day 2): BIGBET_5K_DAY, BIGBET_5K_RANK, BIGBET_5K_MIN_BAL, BIGBET_5K_PRICE, and the same four for 10k.
- Needs: `crash_unlocks(player, cycle_id, tier, ts, tx)` table (additive), max-bet check in the buy path reads the unlock, an offer card on the game page and the Stats page, Guide section.

**9b. Rebuys (late-cycle credit stacks)**
- Opens for the last 2 days of a cycle, for any player. A stack is 10,000 credits for $5. Limit 6 stacks per player per cycle.
- Credits are added to the balance like a claim: they never count as PNL or XP, so the only gain is more rounds.
- Message: "Out of time? Buy credits and climb before the cycle ends."
- Why the window: simulation shows a rebuy adds under 5 points of chance with 3 days left (the free 10k a day already funds you) but 6 to 18 points with 1 day left (1 stack: 7.6% to 13.4% to reach the top-100 XP).
- Caveat: only the top 3 gets a prize, so a late rebuyer is buying rank. Smaller rewards for top 10 or top 100 (for example an NFT raffle) would give them something to buy for. Decide before launch.
- Settings: REBUY_LAST_DAYS (2), REBUY_STACK (10000), REBUY_PRICE (5), REBUY_MAX (6).
- Needs: `crash_purchases(id, player, cycle_id, kind, credits, price, chain, tx, ts)` table, an `addCredits` call on confirmation, and a Guide section.

**Payments (start manual)**
- Phase 1: the buy button shows a SOL/ETH address and a memo or exact amount, the team confirms in /admin and clicks Grant. No on-chain code. Enough to learn if anyone pays.
- Phase 2, only if people pay: automatic verification (read the transaction by signature or hash, match amount and memo, grant once, refuse reuse of a tx).
- Count the clicks on every buy button from day 1 (offered, clicked, paid), so the demand test has numbers.

**Open questions**
- Does the paid PNL count for the prize? In this spec, yes. It is effectively an entry fee for a better lottery ticket (legal check deferred as decided).
- Per cycle or per campaign, and refunds if a cycle is cancelled.
- Prices are guesses. A top-3 finish is worth a few hundred dollars, so $10 for a 5k button is cheap and could go higher near the end.

## Parked (ideas to come back to)
- Missions: daily, weekly, rerolls, campaign-wide community goals (needs specifics).
- Socials and competition: crews, head-to-head challenges, referral tiers.
- Multiplayer "Live Room" as a scheduled event.
- Cousin Dick duel and record, extra Candy / ZachGPT reactions and voice lines.
- Round twists: auto-sell target, risk modes, lucky modifiers, sell 25/75%.
- Redemption round (free stake), streak insurance.
- Other events: happy hour credits, weekend themes, mystery event, event calendar.

## New ideas (added 2026-11-01, assessed: value to players vs complexity for us)

Rating: value / complexity are Low, Med or High. "Legal" = needs the pre-launch legal check before building.

| # | Idea | Value | Complexity | Legal | Verdict |
|---|------|-------|-----------|-------|---------|
| A | Big-win popups (bottom right, every sell over 5x) | Med-High | Low | No | Build soon |
| B | Layout restructure + side panel | High | Med | No | Build before adding more top-bar items |
| C | Communities (community vs community) | High | Med (simple version) | Prizes | Simple version first |
| D | Cousin Dick on X + his tickers as game tokens | High | Med-High | Odds | Cheap version first, needs multi-ticker core |
| E | Market Watch (fake X view, trending posts become tickers) | Med | High | Fake posts | Park |
| F | Fake launchpad (users launch tickers, creators earn a cut) | High | High | Real $ fee | After multi-ticker core |
| G | Buy & Burn (buy credits, proceeds to prize pool + NFT buybacks) | Med (money) | High | Yes, big | Needs legal answer first |
| H | Marketplace (sell leaderboard positions for ETH/SOL) | Low | High | Yes, big | Recommend not building |

### A. Big-win popups  (BUILT)
- Bottom-right popup with the player's name every time someone sells at 5x or more ("@name sold at 7.4x"). Social proof and FOMO.
- Needs: a small public feed of recent big sells (name, multiplier, no bet size), polled or pushed to every open page. Cheap to build.
- Open: show bet size or profit? Opt out for players who don't want to be shown? Cap popups per minute so a busy hour doesn't spam the screen.

### B. Layout restructure + menu rail  (BUILT)
- The top bar now carries Play, Bounties, Leaderboard, Jackpot, Sentiment, the user chip, sound and Cousin Dick, plus the Double XP banner. It's getting full, especially on phones.
- Idea: a side panel (menu/dashboard) that holds navigation, level, streak, tickets, sentiment and jackpot, and frees the top bar. Front-end work only, but it touches every page, so do it in one pass and check mobile.
- Recommend doing this before adding more top-bar items.

### C. Communities
- Register several communities (projects, groups). Players join one. Community vs community: the community's score is the sum of its members' XP. Each community puts up a prize; a big shared competition.
- Simple version (recommended first): community tag on the profile, a community leaderboard, prizes paid by the communities outside the game. No money handled by us.
- Needs: community registry (admin-created), join rules (one community per player, lock after first round?), team scoring, anti-stuffing (members need X rounds to count, or score the average/top N, so a huge community doesn't win by size alone).
- Big value for growth: every community brings its own audience.

### D. Cousin Dick on X + his tickers as tokens
- Cousin Dick has his own X account and posts about specific random coins; those tickers appear in the game as tokens. Tokens pay a better edge and allow bigger bets.
- Today the chart symbol is cosmetic (one game, one odds curve). Real tokens mean a multi-ticker core: each ticker with its own edge and bet limit, chosen when you buy, and shown on rounds and in the round check.
- Cheap version first: a "featured ticker of the hour" the team sets from admin (no X integration), with a boosted edge window like Fear/Greed. Posting from Cousin Dick's account stays manual at first.
- Risks: a boosted edge on one ticker with big bets can be farmed (everyone piles in), and it ties into the fairness review. Cap the bet size and the window.

### E. Market Watch
- A fake X-style view that reads what's trending on X and writes fake posts about it, which turn into random tickers (or users can deploy them).
- High effort: needs X trend data (API cost/limits), content generation, moderation, and real trends/brands inside fake posts is a reputation and legal risk. Depends on D's multi-ticker core.
- Park. The value over D is mostly flavor.

### F. Fake launchpad
- Players launch tickers, paid in credits (or a small real-$ fee to stop spam). Creators earn a slice (e.g. 5%) of all credits gambled on their ticker over a set period.
- Needs a worked-out economy before building: launch cost, creator cut and who funds it (a cut of the house edge?), time limit, ticker approval and name rules (no impersonation or slurs), anti self-dealing (creator betting on their own ticker to farm the cut), and limits on how many a player can launch.
- A real-$ launch fee feeding the prize pool and NFT buybacks has the same legal issue as G.
- Depends on D's multi-ticker core.

### G. Buy & Burn
- Credit packs: $2.50 = 5,000, $5 = 11,000, $10 = 25,000. All proceeds are split: half into a prize pool for the top 3, half into automatic NFT buys from the OpenSea collection.
- Open design question: everyone starts each cycle with the same 10,000 bankroll and bets are capped, so what do extra credits actually buy? (Free daily claims are for waiting players: this would let them skip the wait.) If credits can't help the leaderboard, the offer is weak. If they can, it's pay to win.
- Legal (the big one): real money in, a cash prize pool funded by those payments, and an outcome decided by chance looks like gambling or an illegal lottery in many places. It needs a lawyer's answer, and likely geo-blocking, age checks and a license, before any build. Also payment processing, refunds, tax and an auto-buy bot for OpenSea.
- Verdict: don't start until the legal answer is in.

### H. Marketplace for leaderboard positions
- Sell a leaderboard position for ETH/SOL.
- Concerns: it lets people buy a prize-winning position (cash prize, so it's effectively selling a lottery ticket or an account), payments and disputes in crypto, fraud and stolen accounts, and it undermines the "everyone starts equal" rule that makes the leaderboard fair.
- Recommend not building. If the goal is trading and speculation, a tradeable NFT or badge would be safer than selling a rank.

### Dependencies and order (suggested)
0. Item 9 (paid unlocks and rebuys) is the Buy & Burn test (G) in a cheaper form: sell unlocks and rebuys to the top of the board instead of credit packs.
1. B (layout) and A (big-win popups): small, safe, visible.
2. C simple communities.
3. Multi-ticker core, then D cheap version, then F.
4. E, G and H wait: G for the legal answer, E for value, H probably never.

## Task limits (reward guardrails for /admin)
Why: task points count in XP and are multiplied by Tickets (up to x2.5), and credits feed betting. Median XP per cycle is about 6.5k and the top 100 starts at about 35k, so tasks must stay a side dish. Set the XP on every task by hand: a blank XP field copies the credit reward.

**Budget per player per cycle (10 days, before the Ticket multiplier)**
- Task XP: aim for about 9,000, never more than 12,000 (hard ceiling 15,000). A 10-Ticket holder gets x2.5, so 12,000 becomes 30,000.
- Task credits: no more than 10,000 a day in total (one daily claim). Credits only buy rounds and max bet is 1,000, so large credit rewards do nothing for the score, but they still dilute the "credits are limited" idea.
- A single task is worth at most 1,000 XP (about 3% of the top-100 line) and 2,000 credits.
- Tasks without a day repeat every day and pay every day: count them x10 per cycle. A task that is worth 300 XP and repeats is 3,000 XP, not 300. Give one-off tasks a specific day.
- Tasks do not double in Double XP hour (DOUBLE_XP_TASKS stays 0).

**Limits by task type** (the weakest check gets the lowest pay, because it is the easiest to farm with bots)
| Type | How it is checked | Credits (max) | XP (max) | Repeat |
|---|---|---|---|---|
| visit (open a link) | timer only | 100 | 50 | daily is fine |
| like | timer only | 100 | 50 | daily is fine |
| retweet | timer only | 200 | 100 | daily is fine |
| follow | timer only | 500 | 300 | one-time |
| comment | proof link on their own X handle | 300 | 200 | daily is fine, one-time up to 400 XP |
| quote | proof link, pays at once | 1,000 | 600 | one-time or a few times a cycle |
| custom or review | a person approves it in /admin | 2,000 | 1,000 | one-time |

**Example set that fits the budget (about 9,100 XP)**
- 10 one-time tasks: 4 easy (follow, join) x 300, 4 medium (quote, connect wallet) x 600, 2 hard (review) x 1,000 = 5,600 XP.
- 10 daily tasks over 10 days: 1 simple x 100 XP a day (1,000), plus a bigger "latest" task at 250 XP a day (2,500) = 3,500 XP.
- Credits for that set: about 6,000 a day at most, under the 10,000 limit.

**Rules of thumb when adding a task**
- First add up what a player can earn from all active tasks in a cycle. Stay under the 12,000 ceiling.
- If it is not checked (timer), cap it at 100 XP unless it is one-time.
- If it needs a human to approve, it can be worth more, but there should be few of them.
- Referrals (up to 40,000 a cycle) and achievements (27,100 total) are already large, so do not use tasks to make up the difference.

**Not built yet (nice to have):** a warning in /admin that totals the XP and credits of all active tasks per cycle and turns red above the budget, and a hard cap setting (TASK_XP_CYCLE_CAP) that stops paying task XP past a ceiling.

## Before launch
- Check the legal side: free play with cash prizes, and an NFT that gives a score edge, may count as consideration in some places.
- Economy (done Nov 2026): bets 100 to 1,000, start 0, daily claim 10,000, bonus XP from streaks and perfect sells capped at 1,500 a day, Ticket multipliers 1.25 to 2.5, referrals 7,500 (first 5) / 3,750 with a 40,000 cap per cycle. Make sure the VPS .env sets these explicitly (see .env.example).
- Task XP budget: see "Task limits" above. Keep each cycle's task XP under 12,000 per player.
