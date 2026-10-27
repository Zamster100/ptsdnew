// Cycles: fixed play windows (two 10-day cycles). Everyone starts a cycle with the same bankroll,
// so a bad run in one cycle never carries into the next. Free claims are not PnL (they never touch
// crash_rounds), so the leaderboard for a cycle is just the rounds played inside its window.
//
// Settings (env):
//   CYCLES            JSON list [{id, name, start, end}] with ISO times; default below (9 AM Eastern, back to back)
//   CYCLE_BANKROLL    balance every player gets at the start of a cycle   (default 10000)
//   CYCLE_PRIZE       cash prize for the top 3 of a cycle, in USD         (default 1000)
//
// A player is reset lazily, the first time they touch the game in a new cycle (touch()), so there is no
// bulk update at the boundary and mid-cycle joiners are treated the same. A player with a round still open
// at the boundary is reset as soon as it settles.
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

const DEFAULT = [
  { id: 1, name: "Cycle 1", start: "2026-11-02T14:00:00Z", end: "2026-11-12T14:00:00Z" },
  { id: 2, name: "Cycle 2", start: "2026-11-12T14:00:00Z", end: "2026-11-22T14:00:00Z" },
];

export function initCycles({ db, balanceOf, setBalance, hasOpen }) {
  let raw = DEFAULT;
  try { if (process.env.CYCLES) raw = JSON.parse(process.env.CYCLES); } catch (e) { console.error("[cycles] bad CYCLES, using default", e.message); }
  const list = raw
    .map((c) => ({ id: Number(c.id), name: String(c.name || `Cycle ${c.id}`), start: Date.parse(c.start), end: Date.parse(c.end) }))
    .filter((c) => Number.isInteger(c.id) && Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start)
    .sort((a, b) => a.start - b.start);
  const bankroll = num(process.env.CYCLE_BANKROLL, 10000);
  const prize = num(process.env.CYCLE_PRIZE, 1000);

  db.exec("CREATE TABLE IF NOT EXISTS crash_cycle_players (cycle_id INTEGER NOT NULL, player TEXT NOT NULL, start_balance INTEGER NOT NULL, prev_balance INTEGER, ts INTEGER NOT NULL, PRIMARY KEY (cycle_id, player))");
  const q = {
    done: db.prepare("SELECT 1 FROM crash_cycle_players WHERE cycle_id=? AND player=?"),
    mark: db.prepare("INSERT OR IGNORE INTO crash_cycle_players(cycle_id,player,start_balance,prev_balance,ts) VALUES(?,?,?,?,?)"),
    // The free-claim timer restarts with the cycle: next claim is a full interval after the reset.
    claimAt: db.prepare("UPDATE crash_users SET claim_at=? WHERE id=? AND starter_at IS NOT NULL"),
  };

  const current = (now = Date.now()) => list.find((c) => now >= c.start && now < c.end) || null;
  const next = (now = Date.now()) => list.find((c) => c.start > now) || null;
  const last = (now = Date.now()) => [...list].reverse().find((c) => c.end <= now) || null;
  const started = (now = Date.now()) => list.length > 0 && now >= list[0].start;
  // The cycle a leaderboard should show: the running one, else the one that just ended.
  const shown = (now = Date.now()) => current(now) || last(now);

  const reset = db.transaction((player, c, now) => {
    const prev = balanceOf(player);
    setBalance(player, bankroll);
    q.mark.run(c.id, player, bankroll, prev, now);
    q.claimAt.run(now, player);
  });
  const seen = new Map(); // player -> cycle id already reset (skips the DB read)
  function touch(player, now = Date.now()) {
    const c = current(now);
    if (!c || seen.get(player) === c.id) return c;
    if (!q.done.get(c.id, player)) {
      if (hasOpen(player)) return c;
      reset(player, c, now);
    }
    seen.set(player, c.id);
    return c;
  }

  const pub = (c) => c && { id: c.id, name: c.name, start: c.start, end: c.end };
  return {
    list, bankroll, prize, current, next, last, started, shown, touch,
    publicCfg: (now = Date.now()) => ({ cycle: pub(current(now)), nextCycle: pub(next(now)), lastCycle: pub(last(now)), cycleBankroll: bankroll, cyclePrize: prize }),
  };
}
