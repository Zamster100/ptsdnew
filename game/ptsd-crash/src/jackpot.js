// Community jackpot: a pot that fills from everyone's losses, a daily draw, and the Pot Breaker.
//
//   The pot:      a slice (default 5%) of every loss is added to a counter. Players are never charged extra, it is a number.
//   Tickets:      only an instant rug (crash under 1.1x) earns raffle tickets (1 per 1,000 lost, at least 1). Tickets go into the
//                 player's balance, which carries over from day to day (capped, so nobody can bank an unbeatable stack).
//   Pledging:     during the day (the window runs from one 9 AM Eastern draw to the next) a player pledges as many tickets from
//                 their balance as they like to tonight's draw. A pledge can be topped up but not taken back, and a pledged ticket
//                 is spent whether it wins or not. Unpledged tickets carry over.
//   Auto-pledge:  on by default. When the window closes, everything left in the balance of a player who has auto-pledge on is
//                 pledged for them, so people who can't be there at the deadline still take part.
//   Daily draw:   at 9 AM Eastern one pledged ticket is drawn and its owner wins half the pot.
//   Pot Breaker:  the first player to sell at 50x or higher takes the whole pot.
//   After a win the pot falls back to its floor (so the counter is never empty).
//
// Prizes are credits only, paid straight to the balance. They are not profit and loss, so the leaderboard and the XP
// formula don't change.
//
// Settings (env, all optional):
//   JACKPOT=0                switch it off
//   JACKPOT_SHARE            share of each loss that feeds the pot (default 0.05)
//   JACKPOT_SEED             the pot's floor / what it restarts at (default 100000)
//   JACKPOT_DAILY_SHARE      share of the pot a daily winner takes (default 0.5)
//   JACKPOT_BREAKER_X        sell at this multiplier or more to break the pot (default 50)
//   JACKPOT_TICKET_PER       credits lost per ticket (default 1000)
//   JACKPOT_INSTA_UNDER      a crash under this many x is an instant rug (default 1.1)
//   JACKPOT_HOLD_MAX         most tickets one player can hold unpledged (default 2000)
import crypto from "node:crypto";

const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initJackpot({ db, coin = "CREDITS", dayKey, nextReset, nameOf, pay }) {
  const cfg = {
    on: process.env.JACKPOT !== "0",
    share: Math.min(1, Math.max(0, num(process.env.JACKPOT_SHARE, 0.05))),
    seed: Math.max(0, Math.floor(num(process.env.JACKPOT_SEED, 100_000))),
    dailyShare: Math.min(1, Math.max(0, num(process.env.JACKPOT_DAILY_SHARE, 0.5))),
    breakerX: Math.max(1.01, num(process.env.JACKPOT_BREAKER_X, 50)),
    perTicket: Math.max(1, Math.floor(num(process.env.JACKPOT_TICKET_PER, 1000))),
    holdMax: Math.max(1, Math.floor(num(process.env.JACKPOT_HOLD_MAX, 2000))),
    instaUnder: Math.max(1, num(process.env.JACKPOT_INSTA_UNDER, 1.1)), // a crash under this many x is an "instant rug"
  };
  db.exec(`
    CREATE TABLE IF NOT EXISTS crash_jackpot (id INTEGER PRIMARY KEY CHECK (id = 1), pot INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_tix (day TEXT NOT NULL, player TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, player));
    CREATE TABLE IF NOT EXISTS crash_jackpot_bal (player TEXT PRIMARY KEY, n INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_pledge (day TEXT NOT NULL, player TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, player));
    CREATE TABLE IF NOT EXISTS crash_jackpot_auto (player TEXT PRIMARY KEY, auto INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_earned (round_id TEXT PRIMARY KEY, player TEXT NOT NULL, n INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_days (day TEXT PRIMARY KEY, ts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_wins (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL, player TEXT NOT NULL, name TEXT NOT NULL,
      amount INTEGER NOT NULL, tickets INTEGER, total INTEGER, ts INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS crash_jackpot_wins_player ON crash_jackpot_wins(player, seen);`);
  db.prepare("INSERT OR IGNORE INTO crash_jackpot(id, pot) VALUES(1, ?)").run(cfg.seed);
  const q = {
    pot: db.prepare("SELECT pot FROM crash_jackpot WHERE id = 1"),
    setPot: db.prepare("UPDATE crash_jackpot SET pot = ? WHERE id = 1"),
    bal: db.prepare("SELECT n FROM crash_jackpot_bal WHERE player = ?"),
    addBal: db.prepare("INSERT INTO crash_jackpot_bal(player, n) VALUES(?,?) ON CONFLICT(player) DO UPDATE SET n = MIN(?, n + excluded.n)"),
    setBal: db.prepare("INSERT INTO crash_jackpot_bal(player, n) VALUES(?,?) ON CONFLICT(player) DO UPDATE SET n = excluded.n"),
    autoOf: db.prepare("SELECT auto FROM crash_jackpot_auto WHERE player = ?"),
    setAuto: db.prepare("INSERT INTO crash_jackpot_auto(player, auto) VALUES(?,?) ON CONFLICT(player) DO UPDATE SET auto = excluded.auto"),
    autoBals: db.prepare("SELECT b.player, b.n FROM crash_jackpot_bal b LEFT JOIN crash_jackpot_auto a ON a.player = b.player WHERE b.n > 0 AND COALESCE(a.auto, 1) = 1"),
    autoTotal: db.prepare("SELECT COALESCE(SUM(b.n), 0) t FROM crash_jackpot_bal b LEFT JOIN crash_jackpot_auto a ON a.player = b.player WHERE b.n > 0 AND COALESCE(a.auto, 1) = 1"),
    addPledge: db.prepare("INSERT INTO crash_jackpot_pledge(day, player, n) VALUES(?,?,?) ON CONFLICT(day, player) DO UPDATE SET n = n + excluded.n"),
    mine: db.prepare("SELECT n FROM crash_jackpot_pledge WHERE day = ? AND player = ?"),
    total: db.prepare("SELECT COALESCE(SUM(n), 0) t, COUNT(*) p FROM crash_jackpot_pledge WHERE day = ?"),
    all: db.prepare("SELECT player, n FROM crash_jackpot_pledge WHERE day = ? ORDER BY player"),
    due: db.prepare("SELECT DISTINCT day FROM crash_jackpot_pledge WHERE day < ? AND day NOT IN (SELECT day FROM crash_jackpot_days) ORDER BY day"),
    drawn: db.prepare("SELECT 1 FROM crash_jackpot_days WHERE day = ?"),
    markDrawn: db.prepare("INSERT OR IGNORE INTO crash_jackpot_days(day, ts) VALUES(?, ?)"),
    metaGet: db.prepare("SELECT v FROM crash_jackpot_meta WHERE k = 'lastDay'"),
    metaSet: db.prepare("INSERT INTO crash_jackpot_meta(k, v) VALUES('lastDay', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v"),
    earned: db.prepare("INSERT OR REPLACE INTO crash_jackpot_earned(round_id, player, n) VALUES(?,?,?)"),
    earnedBy: db.prepare("SELECT n FROM crash_jackpot_earned WHERE round_id = ?"),
    win: db.prepare("INSERT INTO crash_jackpot_wins(day, kind, player, name, amount, tickets, total, ts, seen) VALUES(?,?,?,?,?,?,?,?,?)"),
    winners: db.prepare("SELECT day, kind, name, amount, tickets, total, ts FROM crash_jackpot_wins ORDER BY id DESC LIMIT ?"),
    unseen: db.prepare("SELECT id, day, kind, amount FROM crash_jackpot_wins WHERE player = ? AND seen = 0 ORDER BY id"),
    seeAll: db.prepare("UPDATE crash_jackpot_wins SET seen = 1 WHERE player = ?"),
    see: db.prepare("UPDATE crash_jackpot_wins SET seen = 1 WHERE id = ?"),
  };
  const potNow = () => q.pot.get().pot;
  const balOf = (player) => q.bal.get(player)?.n || 0;
  const autoOf = (player) => (q.autoOf.get(player)?.auto ?? 1) === 1;

  // Before raffle tickets were a balance they were per-day entries. Whatever is still waiting for a draw becomes balance.
  db.transaction(() => {
    for (const r of db.prepare("SELECT player, SUM(n) n FROM crash_jackpot_tix GROUP BY player").all()) q.addBal.run(r.player, r.n, cfg.holdMax);
    db.exec("DELETE FROM crash_jackpot_tix");
  })();

  // A round just settled as a loss: every loss feeds the pot, but raffle tickets only come from instant rugs (the crash came
  // before the player could do anything). Returns { add, tickets } (nothing when it wasn't a loss).
  const onLoss = db.transaction((round) => {
    if (!cfg.on || !round || round.coin !== coin || !(round.pnl < 0)) return null;
    const loss = -round.pnl;
    const add = Math.floor(loss * cfg.share);
    if (add > 0) q.setPot.run(potNow() + add);
    if (!(round.crash < cfg.instaUnder)) return { add, tickets: 0 };
    const held = balOf(round.player);
    const tickets = Math.max(0, Math.min(Math.max(1, Math.floor(loss / cfg.perTicket)), cfg.holdMax - held));
    if (tickets > 0) { q.addBal.run(round.player, tickets, cfg.holdMax); q.earned.run(round.id, round.player, tickets); }
    return { add, tickets };
  });
  // Tickets a round earned (for its popup).
  const forRound = (roundId) => q.earnedBy.get(roundId)?.n || 0;

  // Pledge tickets from the balance to the draw that closes at the next 9 AM. Returns { error } or { pledged }.
  const pledge = db.transaction((player, n, now = Date.now()) => {
    if (!cfg.on || !player) return { error: "The jackpot is off." };
    n = Math.floor(Number(n));
    if (!(n >= 1)) return { error: "Pick how many tickets to pledge." };
    const have = balOf(player);
    if (n > have) return { error: have ? `You only have ${have} ticket${have === 1 ? "" : "s"} to pledge.` : "You have no tickets to pledge. Instant rugs earn them." };
    q.setBal.run(player, have - n);
    q.addPledge.run(dayKey(now), player, n);
    return { pledged: n };
  });
  const setAuto = (player, on) => { if (player) q.setAuto.run(player, on ? 1 : 0); return !!on; };

  // The window is closing: everything left in an auto-pledge player's balance goes into the draw.
  const autoPledge = (day) => {
    for (const r of q.autoBals.all()) { q.setBal.run(r.player, 0); q.addPledge.run(day, r.player, r.n); }
  };

  // A round was just sold: at the Pot Breaker multiplier the seller takes the whole pot. Returns { amount } or null.
  const onSold = db.transaction((round, now = Date.now()) => {
    if (!cfg.on || !round || round.coin !== coin || round.state !== "sold" || !(round.sold_mult >= cfg.breakerX)) return null;
    const amount = potNow();
    if (amount <= 0) return null;
    q.setPot.run(cfg.seed);
    q.win.run(dayKey(now), "breaker", round.player, nameOf(round.player), amount, null, null, now, 1); // the seller is told in the sell response
    pay(round.player, amount);
    return { amount };
  });

  // Draw the winner of one day's pledged tickets (weighted by tickets). Returns the win, or null when nobody pledged.
  const draw = db.transaction((day, now = Date.now()) => {
    if (q.drawn.get(day)) return null;
    q.markDrawn.run(day, now);
    autoPledge(day);
    const rows = q.all.all(day), total = rows.reduce((s, r) => s + r.n, 0);
    if (!total) return null;
    let pick = crypto.randomInt(total), winner = rows[rows.length - 1];
    for (const r of rows) { if (pick < r.n) { winner = r; break; } pick -= r.n; }
    const pot = potNow(), amount = Math.floor(pot * cfg.dailyShare);
    if (amount <= 0) return null;
    q.setPot.run(Math.max(cfg.seed, pot - amount));
    q.win.run(day, "daily", winner.player, nameOf(winner.player), amount, winner.n, total, now, 0);
    pay(winner.player, amount);
    return { day, player: winner.player, amount, tickets: winner.n, total };
  });

  // Called every little while: draws every finished window that has pledges, and the window that just closed if someone has
  // auto-pledge tickets. It remembers the last day it saw, so a window is only closed when its end was actually crossed (also
  // after downtime), never early on a first start.
  function tick(now = Date.now()) {
    if (!cfg.on) return [];
    const today = dayKey(now), days = q.due.all(today).map((r) => r.day), last = q.metaGet.get()?.v || null;
    if (last && last < today && !days.includes(last) && !q.drawn.get(last) && q.autoBals.all().length) days.push(last);
    if (last !== today) q.metaSet.run(today);
    const out = [];
    for (const day of days.sort()) { const w = draw(day, now); if (w) out.push(w); }
    return out;
  }
  // Team/demo: draw today's pledges right now. Those tickets are used up; tickets pledged after this are still drawn at 9 AM.
  const drawNow = db.transaction((now = Date.now()) => {
    const day = dayKey(now), w = draw(day, now);
    db.prepare("DELETE FROM crash_jackpot_pledge WHERE day = ?").run(day);
    db.prepare("DELETE FROM crash_jackpot_days WHERE day = ?").run(day);
    return w;
  });

  // Wins the player hasn't been told about (a daily win happens while they're away).
  function takeUnseen(player) {
    const rows = q.unseen.all(player);
    if (rows.length) q.seeAll.run(player);
    return rows.map((r) => ({ day: r.day, kind: r.kind, amount: r.amount }));
  }

  function view(player, now = Date.now()) {
    const day = dayKey(now), t = q.total.get(day);
    const balance = player ? balOf(player) : 0, pledged = player ? q.mine.get(day, player)?.n || 0 : 0, auto = player ? autoOf(player) : true;
    const totalEntering = t.t + q.autoTotal.get().t;
    return {
      on: cfg.on, pot: potNow(), nextDrawAt: nextReset(now), day,
      tickets: balance + pledged, balance, pledged, auto, entering: pledged + (auto ? balance : 0), totalEntering, players: t.p,
      share: cfg.share, dailyShare: cfg.dailyShare, breakerX: cfg.breakerX, perTicket: cfg.perTicket, holdMax: cfg.holdMax, instaUnder: cfg.instaUnder,
      winners: q.winners.all(30),
    };
  }
  return { cfg, onLoss, forRound, pledge, setAuto, onSold, draw, tick, drawNow, takeUnseen, view, pot: potNow };
}
