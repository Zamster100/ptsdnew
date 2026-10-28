// Task board + PNL reset. A player whose cycle PnL is negative can reset it to 0 once every RESET_HOURS by
// completing the latest task. The reset is a marker (crash_pnl_resets): rounds before the player's last reset
// don't count toward the cycle board, nothing is deleted. Referral points are kept.
//
// Tasks live in a JSON file that can be edited without a restart: [{ "id": "t1", "title": "...", "desc": "...", "url": "https://x.com/...", "added": "2026-11-02T14:00:00Z" }]
// The latest task is the one with the newest "added" (else the last one in the file).
//
// Settings (env):
//   TASKS_FILE        path to the tasks JSON                       (default data/tasks.json)
//   RESET_HOURS       hours between PNL resets per player          (default 24)
//   TASK_MIN_SECONDS  seconds between opening the task and "done"  (default 15)
// X actions can't be verified from here, so completing a task is "open the link, wait, confirm" (honor system).
import fs from "node:fs";

const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initPnlReset({ db, cycles, file }) {
  const cfg = {
    hours: num(process.env.RESET_HOURS, 24),
    minSeconds: num(process.env.TASK_MIN_SECONDS, 15),
    file: process.env.TASKS_FILE || file,
  };
  db.exec(`CREATE TABLE IF NOT EXISTS crash_pnl_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, ts INTEGER NOT NULL, cycle_id INTEGER, task_id TEXT, net INTEGER)`);
  db.exec("CREATE INDEX IF NOT EXISTS crash_pnl_resets_player ON crash_pnl_resets(player, ts)");
  db.exec(`CREATE TABLE IF NOT EXISTS crash_task_open (player TEXT NOT NULL, task_id TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (player, task_id))`);
  const q = {
    last: db.prepare("SELECT MAX(ts) ts FROM crash_pnl_resets WHERE player=?"),
    add: db.prepare("INSERT INTO crash_pnl_resets(player, ts, cycle_id, task_id, net) VALUES(?,?,?,?,?)"),
    net: db.prepare("SELECT COALESCE(SUM(pnl),0) net FROM crash_rounds WHERE player=? AND coin=? AND state!='open' AND ts>=? AND ts<?"),
    open: db.prepare("INSERT INTO crash_task_open(player, task_id, ts) VALUES(?,?,?) ON CONFLICT(player, task_id) DO NOTHING"),
    opened: db.prepare("SELECT ts FROM crash_task_open WHERE player=? AND task_id=?"),
    used: db.prepare("SELECT 1 FROM crash_pnl_resets WHERE player=? AND task_id=?"),
  };

  let cache = { mtime: -1, list: [] };
  function tasks() {
    try {
      const m = fs.statSync(cfg.file).mtimeMs;
      if (m !== cache.mtime) {
        const raw = JSON.parse(fs.readFileSync(cfg.file, "utf8"));
        const list = (Array.isArray(raw) ? raw : [])
          .map((t, i) => ({ id: String(t.id ?? i), title: String(t.title || "").slice(0, 120), desc: String(t.desc || "").slice(0, 400), url: /^https?:\/\//.test(t.url || "") ? String(t.url) : "", added: Date.parse(t.added) || 0, i }))
          .filter((t) => t.title);
        list.sort((a, b) => b.added - a.added || b.i - a.i);
        cache = { mtime: m, list };
      }
    } catch { cache = { mtime: -1, list: [] }; }
    return cache.list;
  }
  const latest = () => tasks()[0] || null;
  const pubTask = (t) => t && { id: t.id, title: t.title, desc: t.desc, url: t.url };

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
    const t = latest(), used = !!t && !!q.used.get(player, t.id);
    return { net, nextAt, cooldown: now < nextAt, used, canReset: !!c && net < 0 && now >= nextAt && !!t && !used, task: used ? null : pubTask(t), hours: cfg.hours, minSeconds: cfg.minSeconds };
  }

  function api(req, res, p, body, user, send, coin) {
    const now = Date.now();
    if (p === "/api/task/latest" && req.method === "GET") return send(res, 200, stateOf(user.id, coin, now));
    if (p === "/api/task/open" && req.method === "POST") {
      const t = latest();
      if (!t || String(body?.id) !== t.id) return send(res, 400, { error: "That task is no longer the latest.", ...stateOf(user.id, coin, now) });
      q.open.run(user.id, t.id, now);
      return send(res, 200, { ok: true, minSeconds: cfg.minSeconds });
    }
    if (p === "/api/pnl/reset" && req.method === "POST") {
      const s = stateOf(user.id, coin, now), t = latest();
      if (!cycles.current(now)) return send(res, 403, { error: "No cycle is running." });
      if (s.cooldown) return send(res, 400, { error: "You can reset once every " + cfg.hours + " hours.", ...s });
      if (s.net >= 0) return send(res, 400, { error: "Your PNL isn't negative, nothing to reset.", ...s });
      if (!t || s.used) return send(res, 400, { error: "No new task is up right now. Check back soon.", ...s });
      if (String(body?.id) !== t.id) return send(res, 400, { error: "A newer task is up. Complete that one.", ...s });
      const o = q.opened.get(user.id, t.id);
      if (!o) return send(res, 400, { error: "Open the task first.", ...s });
      if (now - o.ts < cfg.minSeconds * 1000) return send(res, 400, { error: "Give the task a moment, then confirm.", wait: Math.ceil((cfg.minSeconds * 1000 - (now - o.ts)) / 1000), ...s });
      q.add.run(user.id, now, cycles.current(now).id, t.id, s.net);
      return send(res, 200, { ok: true, ...stateOf(user.id, coin, now) });
    }
    return null;
  }

  return { cfg, tasks, latest, stateOf, netNow, api };
}
