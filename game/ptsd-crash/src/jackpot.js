// Community jackpot: a pot that fills from everyone's losses, a daily draw, and the Pot Breaker.
//
//   The pot:      a slice (default 5%) of every loss is added to a counter. Players are never charged extra, it is a number.
//   Tickets:      every losing round earns tickets (1 per 1,000 lost, at least 1). The tickets earned since the last 9 AM
//                 (Eastern, same moment as the daily tasks reset) are that day's entries.
//   Daily draw:   at 9 AM Eastern one ticket is drawn from yesterday's entries and its owner wins half the pot.
//   Pot Breaker:  the first player to sell at 50x or higher takes the whole pot.
//   After a win the pot falls back to its floor (so the counter is never empty).
//
// Prizes are credits only, paid straight to the balance. They are not profit and loss, so the leaderboard and the XP
// formula don't change. A player's tickets for the day are capped so nobody can pile up an unbeatable stack.
//
// Settings (env, all optional):
//   JACKPOT=0                switch it off
//   JACKPOT_SHARE            share of each loss that feeds the pot (default 0.05)
//   JACKPOT_SEED             the pot's floor / what it restarts at (default 100000)
//   JACKPOT_DAILY_SHARE      share of the pot a daily winner takes (default 0.5)
//   JACKPOT_BREAKER_X        sell at this multiplier or more to break the pot (default 50)
//   JACKPOT_TICKET_PER       credits lost per ticket (default 1000)
//   JACKPOT_MAX_TICKETS_DAY  most tickets one player can hold for a day (default 500)
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
    maxTickets: Math.max(1, Math.floor(num(process.env.JACKPOT_MAX_TICKETS_DAY, 500))),
  };
  db.exec(`
    CREATE TABLE IF NOT EXISTS crash_jackpot (id INTEGER PRIMARY KEY CHECK (id = 1), pot INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_tix (day TEXT NOT NULL, player TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, player));
    CREATE TABLE IF NOT EXISTS crash_jackpot_days (day TEXT PRIMARY KEY, ts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_jackpot_wins (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL, player TEXT NOT NULL, name TEXT NOT NULL,
      amount INTEGER NOT NULL, tickets INTEGER, total INTEGER, ts INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS crash_jackpot_wins_player ON crash_jackpot_wins(player, seen);`);
  db.prepare("INSERT OR IGNORE INTO crash_jackpot(id, pot) VALUES(1, ?)").run(cfg.seed);
  const q = {
    pot: db.prepare("SELECT pot FROM crash_jackpot WHERE id = 1"),
    setPot: db.prepare("UPDATE crash_jackpot SET pot = ? WHERE id = 1"),
    addTix: db.prepare("INSERT INTO crash_jackpot_tix(day, player, n) VALUES(?,?,?) ON CONFLICT(day, player) DO UPDATE SET n = MIN(?, n + excluded.n)"),
    mine: db.prepare("SELECT n FROM crash_jackpot_tix WHERE day = ? AND player = ?"),
    total: db.prepare("SELECT COALESCE(SUM(n), 0) t, COUNT(*) p FROM crash_jackpot_tix WHERE day = ?"),
    all: db.prepare("SELECT player, n FROM crash_jackpot_tix WHERE day = ? ORDER BY player"),
    due: db.prepare("SELECT DISTINCT day FROM crash_jackpot_tix WHERE day < ? AND day NOT IN (SELECT day FROM crash_jackpot_days) ORDER BY day"),
    drawn: db.prepare("SELECT 1 FROM crash_jackpot_days WHERE day = ?"),
    markDrawn: db.prepare("INSERT OR IGNORE INTO crash_jackpot_days(day, ts) VALUES(?, ?)"),
    win: db.prepare("INSERT INTO crash_jackpot_wins(day, kind, player, name, amount, tickets, total, ts, seen) VALUES(?,?,?,?,?,?,?,?,?)"),
    winners: db.prepare("SELECT day, kind, name, amount, tickets, total, ts FROM crash_jackpot_wins ORDER BY id DESC LIMIT ?"),
    unseen: db.prepare("SELECT id, day, kind, amount FROM crash_jackpot_wins WHERE player = ? AND seen = 0 ORDER BY id"),
    seeAll: db.prepare("UPDATE crash_jackpot_wins SET seen = 1 WHERE player = ?"),
    see: db.prepare("UPDATE crash_jackpot_wins SET seen = 1 WHERE id = ?"),
  };
  const potNow = () => q.pot.get().pot;

  // A round just settled as a loss: feed the pot and hand out tickets. Returns { add, tickets } (nothing when it wasn't a loss).
  const onLoss = db.transaction((round, now = Date.now()) => {
    if (!cfg.on || !round || round.coin !== coin || !(round.pnl < 0)) return null;
    const loss = -round.pnl;
    const add = Math.floor(loss * cfg.share);
    if (add > 0) q.setPot.run(potNow() + add);
    const tickets = Math.max(1, Math.floor(loss / cfg.perTicket));
    q.addTix.run(dayKey(now), round.player, Math.min(tickets, cfg.maxTickets), cfg.maxTickets);
    return { add, tickets };
  });

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

  // Draw the winner of one day's tickets (weighted by tickets). Returns the win, or null when nobody had a ticket.
  const draw = db.transaction((day, now = Date.now()) => {
    if (q.drawn.get(day)) return null;
    q.markDrawn.run(day, now);
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

  // Called every little while: draws every finished day that still has tickets and no draw yet (also catches up after downtime).
  function tick(now = Date.now()) {
    if (!cfg.on) return [];
    const out = [];
    for (const { day } of q.due.all(dayKey(now))) { const w = draw(day, now); if (w) out.push(w); }
    return out;
  }
  // Team/demo: draw today's tickets right now. Those tickets are used up; tickets earned after this are still drawn at 9 AM.
  const drawNow = db.transaction((now = Date.now()) => {
    const day = dayKey(now), w = draw(day, now);
    db.prepare("DELETE FROM crash_jackpot_tix WHERE day = ?").run(day);
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
    return {
      on: cfg.on, pot: potNow(), nextDrawAt: nextReset(now), day,
      tickets: player ? q.mine.get(day, player)?.n || 0 : 0, totalTickets: t.t, players: t.p,
      share: cfg.share, dailyShare: cfg.dailyShare, breakerX: cfg.breakerX, perTicket: cfg.perTicket, maxTickets: cfg.maxTickets,
      winners: q.winners.all(30),
    };
  }
  return { cfg, onLoss, onSold, draw, tick, drawNow, takeUnseen, view, pot: potNow };
}
