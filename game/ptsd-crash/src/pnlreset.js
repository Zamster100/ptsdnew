// Task board + PNL reset. Tasks are one-time jobs (follow, repost, ...) that pay credits (balance only, never PnL).
// A player whose cycle PnL is negative can reset it to 0 once every RESET_HOURS by
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
//   TASK_REWARD       credits a task pays when it has no "reward" of its own (default 2500)
// X actions can't be verified from here, so completing a task is "open the link, wait, confirm" (honor system).
import fs from "node:fs";

const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initPnlReset({ db, cycles, file, addCredits }) {
  const cfg = {
    hours: num(process.env.RESET_HOURS, 24),
    minSeconds: num(process.env.TASK_MIN_SECONDS, 15),
    reward: num(process.env.TASK_REWARD, 2500),
    file: process.env.TASKS_FILE || file,
  };
  db.exec(`CREATE TABLE IF NOT EXISTS crash_pnl_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, ts INTEGER NOT NULL, cycle_id INTEGER, task_id TEXT, net INTEGER)`);
  db.exec("CREATE INDEX IF NOT EXISTS crash_pnl_resets_player ON crash_pnl_resets(player, ts)");
  db.exec(`CREATE TABLE IF NOT EXISTS crash_task_open (player TEXT NOT NULL, task_id TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (player, task_id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS crash_task_done (player TEXT NOT NULL, task_id TEXT NOT NULL, ts INTEGER NOT NULL, reward INTEGER NOT NULL, PRIMARY KEY (player, task_id))`);
  const q = {
    done: db.prepare("SELECT ts FROM crash_task_done WHERE player=? AND task_id=?"),
    doneAll: db.prepare("SELECT task_id FROM crash_task_done WHERE player=?"),
    openAll: db.prepare("SELECT task_id, ts FROM crash_task_open WHERE player=?"),
    markDone: db.prepare("INSERT OR IGNORE INTO crash_task_done(player, task_id, ts, reward) VALUES(?,?,?,?)"),
    logClaim: db.prepare("INSERT INTO crash_claims(player,kind,amount,ts) VALUES(?,?,?,?)"),
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
          .map((t, i) => ({ id: String(t.id ?? i), title: String(t.title || "").slice(0, 120), desc: String(t.desc || "").slice(0, 400), url: /^https?:\/\//.test(t.url || "") ? String(t.url) : "", reward: Math.max(0, Math.floor(num(t.reward, cfg.reward))), added: Date.parse(t.added) || 0, i }))
          .filter((t) => t.title);
        list.sort((a, b) => b.added - a.added || b.i - a.i);
        cache = { mtime: m, list };
      }
    } catch { cache = { mtime: -1, list: [] }; }
    return cache.list;
  }
  const latest = () => tasks()[0] || null;
  const pubTask = (t) => t && { id: t.id, title: t.title, desc: t.desc, url: t.url, reward: t.reward };

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

  // Pays the reward once per task and player. Returns the credits paid (0 if already done).
  const finish = db.transaction((player, t, now) => {
    if (q.done.get(player, t.id)) return 0;
    q.markDone.run(player, t.id, now, t.reward);
    if (t.reward > 0) { addCredits(player, t.reward); q.logClaim.run(player, "task", t.reward, now); }
    return t.reward;
  });
  const waitLeft = (o, now) => (o ? Math.max(0, Math.ceil((cfg.minSeconds * 1000 - (now - o.ts)) / 1000)) : null);

  function board(player, now) {
    const done = new Set(q.doneAll.all(player).map((r) => r.task_id)), opened = new Map(q.openAll.all(player).map((r) => [r.task_id, r.ts]));
    return tasks().map((t, i) => ({ ...pubTask(t), latest: i === 0, done: done.has(t.id), wait: done.has(t.id) ? null : waitLeft(opened.has(t.id) ? { ts: opened.get(t.id) } : null, now) }));
  }

  function api(req, res, p, body, user, send, coin) {
    const now = Date.now();
    if (p === "/api/tasks" && req.method === "GET") return send(res, 200, { tasks: board(user.id, now), minSeconds: cfg.minSeconds });
    if (p === "/api/task/complete" && req.method === "POST") {
      const t = tasks().find((x) => x.id === String(body?.id));
      if (!t) return send(res, 404, { error: "That task doesn't exist." });
      if (!cycles.current(now)) return send(res, 403, { error: "No cycle is running." });
      if (q.done.get(user.id, t.id)) return send(res, 400, { error: "You already completed this task." });
      const o = q.opened.get(user.id, t.id);
      if (!o) return send(res, 400, { error: "Open the task first." });
      const w = waitLeft(o, now);
      if (w > 0) return send(res, 400, { error: "Give the task a moment, then confirm.", wait: w });
      const paid = finish(user.id, t, now);
      return send(res, 200, { ok: true, reward: paid, tasks: board(user.id, now) });
    }
    if (p === "/api/task/latest" && req.method === "GET") return send(res, 200, stateOf(user.id, coin, now));
    if (p === "/api/task/open" && req.method === "POST") {
      const t = tasks().find((x) => x.id === String(body?.id));
      if (!t) return send(res, 400, { error: "That task doesn't exist.", ...stateOf(user.id, coin, now) });
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
      db.transaction(() => { q.add.run(user.id, now, cycles.current(now).id, t.id, s.net); finish(user.id, t, now); })();
      return send(res, 200, { ok: true, ...stateOf(user.id, coin, now) });
    }
    return null;
  }

  return { cfg, tasks, latest, stateOf, netNow, api };
}
