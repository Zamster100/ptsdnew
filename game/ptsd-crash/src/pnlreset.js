// PNL reset. A player whose cycle PnL is negative can reset it to 0 once every RESET_HOURS by completing the latest
// daily task (see tasks.js) after their last reset. The reset is a marker (crash_pnl_resets): rounds before the
// player's last reset don't count toward the cycle board, nothing is deleted. Referral points are kept.
//
// Settings (env):
//   RESET_HOURS   hours between PNL resets per player   (default 24)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initPnlReset({ db, cycles, tasks }) {
  const cfg = { hours: num(process.env.RESET_HOURS, 24) };
  db.exec(`CREATE TABLE IF NOT EXISTS crash_pnl_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, ts INTEGER NOT NULL, cycle_id INTEGER, task_id TEXT, net INTEGER)`);
  db.exec("CREATE INDEX IF NOT EXISTS crash_pnl_resets_player ON crash_pnl_resets(player, ts)");
  const q = {
    last: db.prepare("SELECT MAX(ts) ts FROM crash_pnl_resets WHERE player=?"),
    add: db.prepare("INSERT INTO crash_pnl_resets(player, ts, cycle_id, task_id, net) VALUES(?,?,?,?,?)"),
    net: db.prepare("SELECT COALESCE(SUM(pnl),0) net FROM crash_rounds WHERE player=? AND coin=? AND state!='open' AND ts>=? AND ts<?"),
  };

  // PnL the board counts for this player right now (this cycle, after their last reset).
  function netNow(player, coin, now = Date.now()) {
    const c = cycles.current(now);
    if (!c) return 0;
    const from = Math.max(c.start, q.last.get(player).ts || 0);
    return q.net.get(player, coin, from, c.end).net;
  }

  function stateOf(player, coin, now = Date.now()) {
    const c = cycles.current(now);
    const last = q.last.get(player).ts || 0;
    const nextAt = last ? last + cfg.hours * 3600_000 : 0;
    const net = netNow(player, coin, now);
    const t = tasks.latest(now);
    const at = t ? tasks.doneAt(player, t.id, now) : null;
    const taskDone = at != null && at > last; // a task finished after the last reset
    return {
      net, nextAt, cooldown: now < nextAt, hours: cfg.hours,
      task: t ? { id: t.id, title: t.title, desc: t.descr || "", reward: t.reward } : null, taskDone,
      canReset: !!c && net < 0 && now >= nextAt && taskDone,
    };
  }

  function api(req, res, p, body, user, send, coin) {
    const now = Date.now();
    if (p === "/api/pnl/state" && req.method === "GET") return send(res, 200, stateOf(user.id, coin, now));
    if (p === "/api/pnl/reset" && req.method === "POST") {
      const s = stateOf(user.id, coin, now);
      if (!cycles.current(now)) return send(res, 403, { error: "No cycle is running." });
      if (s.cooldown) return send(res, 400, { error: "You can reset once every " + cfg.hours + " hours.", ...s });
      if (s.net >= 0) return send(res, 400, { error: "Your PNL isn't negative, nothing to reset.", ...s });
      if (!s.task) return send(res, 400, { error: "No bounty is up right now. Check back soon.", ...s });
      if (!s.taskDone) return send(res, 400, { error: "Clear the latest bounty first.", ...s });
      q.add.run(user.id, now, cycles.current(now).id, String(s.task.id), s.net);
      return send(res, 200, { ok: true, ...stateOf(user.id, coin, now) });
    }
    return null;
  }

  return { cfg, stateOf, netNow, api };
}
