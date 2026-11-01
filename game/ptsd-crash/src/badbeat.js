// Bad beat refund: rugged three times in a row, almost instantly, and the last bet comes back.
//
// A "rug" here is a round that crashed before the player sold anything (no half sale) at under BAD_BEAT_UNDER.
// Rugs have to be back to back. The refund is the bet of the last one, paid in credits only: the round itself and the
// player's profit and loss stay as they were, so nothing about the leaderboard, the odds or the round check changes.
// After a refund the count starts again from the next round, and a player gets at most one refund per cooldown.
//
// Settings (env, all optional):
//   BAD_BEAT=0              switch it off
//   BAD_BEAT_COUNT          rugs in a row needed       (default 3)
//   BAD_BEAT_UNDER          a rug crashes under this x (default 1.1)
//   BAD_BEAT_COOLDOWN_MIN   minutes between refunds    (default 60)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initBadBeat({ db }) {
  const cfg = {
    on: process.env.BAD_BEAT !== "0",
    count: Math.max(1, Math.floor(num(process.env.BAD_BEAT_COUNT, 3))),
    under: Math.max(1, num(process.env.BAD_BEAT_UNDER, 1.1)),
    cooldownMs: Math.max(0, num(process.env.BAD_BEAT_COOLDOWN_MIN, 60)) * 60_000,
  };
  db.exec("CREATE TABLE IF NOT EXISTS crash_badbeats (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, round_id TEXT NOT NULL UNIQUE, round_ts INTEGER NOT NULL, amount INTEGER NOT NULL, rugs INTEGER NOT NULL, ts INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0)");
  db.exec("CREATE INDEX IF NOT EXISTS crash_badbeats_player ON crash_badbeats(player, ts)");
  const q = {
    last: db.prepare("SELECT round_ts, ts FROM crash_badbeats WHERE player = ? ORDER BY id DESC LIMIT 1"),
    recent: db.prepare("SELECT id, bet, crash, state, half_ms FROM crash_rounds WHERE player = ? AND coin = ? AND state != 'open' AND ts > ? ORDER BY ts DESC LIMIT ?"),
    ts: db.prepare("SELECT ts FROM crash_rounds WHERE id = ?"),
    ins: db.prepare("INSERT OR IGNORE INTO crash_badbeats(player, round_id, round_ts, amount, rugs, ts) VALUES(?,?,?,?,?,?)"),
    byRound: db.prepare("SELECT amount, rugs FROM crash_badbeats WHERE round_id = ?"),
    unseen: db.prepare("SELECT id, round_id, amount, rugs FROM crash_badbeats WHERE player = ? AND seen = 0 ORDER BY id"),
    see: db.prepare("UPDATE crash_badbeats SET seen = 1 WHERE round_id = ?"),
    seeAll: db.prepare("UPDATE crash_badbeats SET seen = 1 WHERE player = ?"),
  };

  // Call right after a round has been settled. Returns the credits to refund (0 = none) and records it.
  // The caller pays the credits, in the same transaction.
  function check(round, now = Date.now()) {
    if (!cfg.on || !round) return 0;
    const last = q.last.get(round.player);
    if (last && now - last.ts < cfg.cooldownMs) return 0;
    const rows = q.recent.all(round.player, round.coin, last ? last.round_ts : 0, cfg.count);
    if (rows.length < cfg.count || rows[0].id !== round.id) return 0;
    if (!rows.every((r) => r.state === "rekt" && !r.half_ms && r.crash < cfg.under)) return 0;
    const ts = q.ts.get(round.id)?.ts ?? now;
    const added = q.ins.run(round.player, round.id, ts, rows[0].bet, cfg.count, now).changes;
    return added ? rows[0].bet : 0;
  }
  const forRound = (id) => q.byRound.get(id) || null;
  const markSeen = (id) => { q.see.run(id); };
  // Refunds the player hasn't been told about yet (they closed the page): returns them and marks them seen.
  function takeUnseen(player) {
    const rows = q.unseen.all(player);
    if (rows.length) q.seeAll.run(player);
    return rows.map((r) => ({ roundId: r.round_id, amount: r.amount, rugs: r.rugs }));
  }
  return { cfg, check, forRound, markSeen, takeUnseen };
}
