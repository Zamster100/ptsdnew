// Daily tasks + the team admin API.
//
// Tasks live in the DB (crash_tasks) and are edited from /admin. A task with no "day" repeats every day; a task with a
// "day" (YYYY-MM-DD) only shows on that day. The task day rolls over at TASK_DAY_HOUR Eastern (default 9, same as the cycles).
// Completing a task pays credits once per player and day (balance only, never PnL).
//
// How a completion is tracked (per task, "verify"):
//   timer   open the link, wait TASK_MIN_SECONDS, confirm. Pays at once. For things that can't be checked (like, follow, repost).
//   proof   the player pastes the link to their own reply/quote post. It must be on their own X handle, a real status link,
//           not the post the task points at, and never used twice for the task. Pays at once; the team can revoke it later.
//   review  same proof, but nothing is paid until a team member approves it in /admin.
// Every open and completion is logged (crash_task_log), so the team can audit and export it.
//
// Settings (env):
//   ADMIN_USERS       "name:password,name2:password2" team logins for /admin (or ADMIN_PASSWORD for a single "admin")
//   TASK_DAY_HOUR     hour (Eastern) when a new set of daily tasks starts           (default 9)
//   TASK_MIN_SECONDS  seconds between opening a task and being able to confirm it   (default 15)
//   TASKS_REQUIRE_X   1 = proof links must be on the player's real X account       (default 1; 0 lets demo logins test it)
import crypto from "node:crypto";

const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const TYPES = ["visit", "follow", "like", "retweet", "comment", "quote", "custom"];
const VERIFY = ["timer", "proof", "review"];
const STATUS_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})(?:[/?#].*)?$/i;

export function initTasks({ db, cycles, addCredits, balanceOf }) {
  const cfg = {
    dayHour: num(process.env.TASK_DAY_HOUR, 9),
    minSeconds: num(process.env.TASK_MIN_SECONDS, 15),
    requireX: process.env.TASKS_REQUIRE_X !== "0",
  };
  const admins = new Map();
  for (const part of String(process.env.ADMIN_USERS || "").split(",")) {
    const i = part.indexOf(":");
    if (i > 0 && part.slice(i + 1)) admins.set(part.slice(0, i).trim().toLowerCase(), part.slice(i + 1));
  }
  if (process.env.ADMIN_PASSWORD && !admins.has("admin")) admins.set("admin", process.env.ADMIN_PASSWORD);

  db.exec(`CREATE TABLE IF NOT EXISTS crash_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, descr TEXT, type TEXT NOT NULL DEFAULT 'visit',
    url TEXT, reward INTEGER NOT NULL DEFAULT 0, verify TEXT NOT NULL DEFAULT 'timer', day TEXT, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, created_by TEXT, updated INTEGER)`);
  db.exec("CREATE TABLE IF NOT EXISTS crash_task_opens (player TEXT NOT NULL, task_id INTEGER NOT NULL, day TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (player, task_id, day))");
  db.exec(`CREATE TABLE IF NOT EXISTS crash_task_log (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, task_id INTEGER NOT NULL, day TEXT NOT NULL, state TEXT NOT NULL,
    proof TEXT, proof_id TEXT, reward INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER, UNIQUE(player, task_id, day))`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS crash_task_proof ON crash_task_log(task_id, proof_id) WHERE proof_id IS NOT NULL AND state!='rejected'");
  db.exec("CREATE INDEX IF NOT EXISTS crash_task_log_day ON crash_task_log(day, task_id)");
  db.exec("CREATE INDEX IF NOT EXISTS crash_task_log_state ON crash_task_log(state)");

  const q = {
    today: db.prepare("SELECT * FROM crash_tasks WHERE active=1 AND (day IS NULL OR day=?) ORDER BY id DESC"),
    all: db.prepare("SELECT * FROM crash_tasks ORDER BY active DESC, id DESC"),
    get: db.prepare("SELECT * FROM crash_tasks WHERE id=?"),
    insert: db.prepare("INSERT INTO crash_tasks(title,descr,type,url,reward,verify,day,active,created,created_by,updated) VALUES(@title,@descr,@type,@url,@reward,@verify,@day,@active,@now,@by,@now)"),
    update: db.prepare("UPDATE crash_tasks SET title=@title,descr=@descr,type=@type,url=@url,reward=@reward,verify=@verify,day=@day,active=@active,updated=@now WHERE id=@id"),
    del: db.prepare("DELETE FROM crash_tasks WHERE id=?"),
    logsOfTask: db.prepare("SELECT COUNT(*) n FROM crash_task_log WHERE task_id=?"),
    open: db.prepare("INSERT INTO crash_task_opens(player,task_id,day,ts) VALUES(?,?,?,?) ON CONFLICT(player,task_id,day) DO NOTHING"),
    opened: db.prepare("SELECT ts FROM crash_task_opens WHERE player=? AND task_id=? AND day=?"),
    opensToday: db.prepare("SELECT task_id, ts FROM crash_task_opens WHERE player=? AND day=?"),
    logOf: db.prepare("SELECT * FROM crash_task_log WHERE player=? AND task_id=? AND day=?"),
    logsToday: db.prepare("SELECT * FROM crash_task_log WHERE player=? AND day=?"),
    byId: db.prepare("SELECT l.*, u.username, u.name FROM crash_task_log l LEFT JOIN crash_users u ON u.id=l.player WHERE l.id=?"),
    upsert: db.prepare(`INSERT INTO crash_task_log(player,task_id,day,state,proof,proof_id,reward,ts) VALUES(@player,@task_id,@day,@state,@proof,@proof_id,@reward,@ts)
      ON CONFLICT(player,task_id,day) DO UPDATE SET state=@state, proof=@proof, proof_id=@proof_id, reward=@reward, ts=@ts, reviewed_by=NULL, reviewed_at=NULL`),
    setState: db.prepare("UPDATE crash_task_log SET state=?, reviewed_by=?, reviewed_at=? WHERE id=?"),
    pending: db.prepare(`SELECT l.*, u.username, u.name, t.title, t.url task_url FROM crash_task_log l LEFT JOIN crash_users u ON u.id=l.player LEFT JOIN crash_tasks t ON t.id=l.task_id
      WHERE l.state='pending' ORDER BY l.ts ASC LIMIT 200`),
    recent: db.prepare(`SELECT l.*, u.username, t.title FROM crash_task_log l LEFT JOIN crash_users u ON u.id=l.player LEFT JOIN crash_tasks t ON t.id=l.task_id
      WHERE (@task IS NULL OR l.task_id=@task) AND (@day IS NULL OR l.day=@day) AND (@state IS NULL OR l.state=@state) ORDER BY l.ts DESC LIMIT @limit`),
    counts: db.prepare("SELECT task_id, state, day, COUNT(*) n FROM crash_task_log GROUP BY task_id, state, day"),
    user: db.prepare("SELECT id, username, provider FROM crash_users WHERE id=?"),
    logClaim: db.prepare("INSERT INTO crash_claims(player,kind,amount,ts) VALUES(?,?,?,?)"),
  };

  // ---- the task day ----
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const dayKey = (now = Date.now()) => dayFmt.format(new Date(now - cfg.dayHour * 3600_000));
  function nextReset(now = Date.now()) {
    const d = dayKey(now);
    let lo = now, hi = now + 26 * 3600_000;
    while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (dayKey(mid) === d) lo = mid; else hi = mid; }
    return hi;
  }

  const pubTask = (t) => ({ id: t.id, title: t.title, desc: t.descr || "", type: t.type, url: t.url || "", reward: t.reward, verify: t.verify });
  const todays = (now = Date.now()) => q.today.all(dayKey(now));
  const latest = (now = Date.now()) => todays(now)[0] || null;
  // When the player completed (and was paid for) this task today, else null. Used by the PNL reset.
  function doneAt(player, taskId, now = Date.now()) {
    const l = q.logOf.get(player, taskId, dayKey(now));
    return l && l.state === "done" ? l.reviewed_at || l.ts : null;
  }

  const pay = (player, n, now) => { if (n > 0) { addCredits(player, n); q.logClaim.run(player, "task", n, now); } };
  const finish = db.transaction((player, t, day, proof, proofId, state, now) => {
    q.upsert.run({ player, task_id: t.id, day, state, proof, proof_id: proofId, reward: t.reward, ts: now });
    if (state === "done") pay(player, t.reward, now);
  });

  function board(player, now) {
    const day = dayKey(now), list = todays(now);
    const logs = new Map(q.logsToday.all(player, day).map((l) => [l.task_id, l]));
    const opens = new Map(q.opensToday.all(player, day).map((o) => [o.task_id, o.ts]));
    const rows = list.map((t, i) => {
      const l = logs.get(t.id), o = opens.get(t.id);
      return { ...pubTask(t), latest: i === 0, state: l ? l.state : "todo", proof: l ? l.proof : null, wait: o && !l ? Math.max(0, Math.ceil((cfg.minSeconds * 1000 - (now - o)) / 1000)) : null };
    });
    const done = rows.filter((r) => r.state === "done").length;
    return { day, resetsAt: nextReset(now), dayHour: cfg.dayHour, minSeconds: cfg.minSeconds, tasks: rows, progress: { done, total: rows.length, pct: rows.length ? Math.round((done / rows.length) * 100) : 0 } };
  }

  function complete(user, body, now) {
    const t = q.get.get(Number(body?.id));
    const day = dayKey(now);
    if (!t || !t.active || (t.day && t.day !== day)) return { code: 404, error: "That task isn't available today." };
    if (!cycles.current(now)) return { code: 403, error: "No cycle is running." };
    const have = q.logOf.get(user.id, t.id, day);
    if (have && have.state !== "rejected") return { code: 400, error: have.state === "pending" ? "Already submitted, waiting for review." : "You already completed this task today." };
    const o = q.opened.get(user.id, t.id, day);
    if (!o) return { code: 400, error: "Open the task first." };
    const w = Math.ceil((cfg.minSeconds * 1000 - (now - o.ts)) / 1000);
    if (w > 0) return { code: 400, error: "Give the task a moment, then confirm.", wait: w };
    let proof = null, proofId = null;
    if (t.verify !== "timer") {
      proof = String(body?.proof || "").trim().slice(0, 300);
      const m = STATUS_RE.exec(proof);
      if (!m) return { code: 400, error: "Paste the link to your post on X (x.com/yourhandle/status/…)." };
      const u = q.user.get(user.id);
      if (cfg.requireX && u.provider !== "x") return { code: 400, error: "Sign in with X to submit proof." };
      if (m[1].toLowerCase() !== String(u.username).toLowerCase()) return { code: 400, error: `That post isn't from @${u.username}.` };
      const target = STATUS_RE.exec(t.url || "");
      if (target && target[2] === m[2]) return { code: 400, error: "That's the original post. Paste the link to your own reply or quote." };
      proofId = m[2];
    }
    try { finish(user.id, t, day, proof, proofId, t.verify === "review" ? "pending" : "done", now); }
    catch (e) { if (String(e.message).includes("UNIQUE")) return { code: 400, error: "That post was already used for this task." }; throw e; }
    return { code: 200, ok: true, state: t.verify === "review" ? "pending" : "done", reward: t.verify === "review" ? 0 : t.reward, ...board(user.id, now) };
  }

  function api(req, res, p, body, user, send) {
    const now = Date.now();
    if (p === "/api/tasks" && req.method === "GET") return send(res, 200, board(user.id, now));
    if (p === "/api/task/open" && req.method === "POST") {
      const t = q.get.get(Number(body?.id)), day = dayKey(now);
      if (!t || !t.active || (t.day && t.day !== day)) return send(res, 404, { error: "That task isn't available today." });
      q.open.run(user.id, t.id, day, now);
      return send(res, 200, { ok: true, minSeconds: cfg.minSeconds });
    }
    if (p === "/api/task/complete" && req.method === "POST") { const out = complete(user, body, now); return send(res, out.code, out); }
    return null;
  }

  // ---- team admin ----
  const sessions = new Map(); // token -> { user, exp }
  const fails = new Map();    // ip -> [timestamps]
  const SESSION_MS = 12 * 3600_000;
  const cookieOf = (req, name) => { const m = String(req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(name + "=")); return m ? m.slice(name.length + 1) : ""; };
  const adminOf = (req) => { const s = sessions.get(cookieOf(req, "crashadmin")); return s && s.exp > Date.now() ? s : null; };
  const same = (a, b) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
  const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

  function fields(b, old) {
    const title = String(b.title ?? old?.title ?? "").trim().slice(0, 120);
    if (!title) return { error: "Give the task a title." };
    const type = TYPES.includes(b.type) ? b.type : old?.type || "visit";
    const verify = VERIFY.includes(b.verify) ? b.verify : old?.verify || "timer";
    const url = String(b.url ?? old?.url ?? "").trim().slice(0, 500);
    if (url && !/^https?:\/\//i.test(url)) return { error: "The link must start with http:// or https://" };
    const day = b.day === "" || b.day == null ? (b.day === undefined ? old?.day ?? null : null) : String(b.day);
    if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Day must look like 2026-11-03, or be empty to repeat every day." };
    const reward = Math.max(0, Math.min(1_000_000, Math.floor(num(b.reward, old?.reward ?? 0))));
    return { title, descr: String(b.desc ?? old?.descr ?? "").trim().slice(0, 400), type, url, reward, verify, day, active: b.active === undefined ? old?.active ?? 1 : b.active ? 1 : 0 };
  }
  const adminTask = (t, counts) => ({ id: t.id, title: t.title, desc: t.descr || "", type: t.type, url: t.url || "", reward: t.reward, verify: t.verify, day: t.day, active: !!t.active, created: t.created, createdBy: t.created_by, ...counts });

  function adminApi(req, res, p, body, u, send) {
    const ip = ipOf(req), now = Date.now();
    if (p === "/api/admin/login" && req.method === "POST") {
      if (!admins.size) return send(res, 503, { error: "Admin logins aren't set up on this server (ADMIN_USERS)." });
      const recent = (fails.get(ip) || []).filter((t) => now - t < 600_000);
      if (recent.length >= 8) return send(res, 429, { error: "Too many tries. Wait a few minutes." });
      const name = String(body?.user || "").trim().toLowerCase(), pw = String(body?.password || "");
      const want = admins.get(name);
      if (!want || !same(pw, want)) { recent.push(now); fails.set(ip, recent); return send(res, 401, { error: "Wrong name or password." }); }
      fails.delete(ip);
      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { user: name, exp: now + SESSION_MS });
      res.setHeader("set-cookie", `crashadmin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`);
      return send(res, 200, { ok: true, user: name });
    }
    const s = adminOf(req);
    if (!s) return send(res, 401, { error: "Log in first.", login: true });
    if (p === "/api/admin/logout" && req.method === "POST") { sessions.delete(cookieOf(req, "crashadmin")); res.setHeader("set-cookie", "crashadmin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"); return send(res, 200, { ok: true }); }
    if (p === "/api/admin/me") return send(res, 200, { user: s.user, day: dayKey(now), resetsAt: nextReset(now), dayHour: cfg.dayHour, types: TYPES, verify: VERIFY });
    if (p === "/api/admin/tasks" && req.method === "GET") {
      const today = dayKey(now), by = new Map();
      for (const c of q.counts.all()) { const e = by.get(c.task_id) || { doneToday: 0, pendingToday: 0, doneTotal: 0 }; if (c.state === "done") { e.doneTotal += c.n; if (c.day === today) e.doneToday += c.n; } if (c.state === "pending") e.pendingToday += c.n; by.set(c.task_id, e); }
      return send(res, 200, { day: today, tasks: q.all.all().map((t) => adminTask(t, by.get(t.id) || { doneToday: 0, pendingToday: 0, doneTotal: 0 })) });
    }
    if (p === "/api/admin/task" && req.method === "POST") {
      const old = body?.id ? q.get.get(Number(body.id)) : null;
      if (body?.id && !old) return send(res, 404, { error: "Task not found." });
      const f = fields(body || {}, old);
      if (f.error) return send(res, 400, f);
      if (old) q.update.run({ ...f, id: old.id, now });
      else { const r = q.insert.run({ ...f, now, by: s.user }); return send(res, 200, { ok: true, id: Number(r.lastInsertRowid) }); }
      return send(res, 200, { ok: true, id: old.id });
    }
    if (p === "/api/admin/task/delete" && req.method === "POST") {
      const t = q.get.get(Number(body?.id));
      if (!t) return send(res, 404, { error: "Task not found." });
      if (q.logsOfTask.get(t.id).n) { q.update.run({ title: t.title, descr: t.descr, type: t.type, url: t.url, reward: t.reward, verify: t.verify, day: t.day, active: 0, id: t.id, now }); return send(res, 200, { ok: true, hidden: true }); }
      q.del.run(t.id);
      return send(res, 200, { ok: true });
    }
    if (p === "/api/admin/reviews" && req.method === "GET") return send(res, 200, { reviews: q.pending.all().map((l) => ({ id: l.id, user: l.username, name: l.name, task: l.title, taskUrl: l.task_url, proof: l.proof, reward: l.reward, ts: l.ts, day: l.day })) });
    if (p === "/api/admin/review" && req.method === "POST") {
      const l = q.byId.get(Number(body?.id));
      if (!l || l.state !== "pending") return send(res, 400, { error: "That submission isn't waiting for review." });
      const approve = !!body.approve;
      db.transaction(() => { q.setState.run(approve ? "done" : "rejected", s.user, now, l.id); if (approve) pay(l.player, l.reward, now); })();
      return send(res, 200, { ok: true });
    }
    if (p === "/api/admin/revoke" && req.method === "POST") {
      const l = q.byId.get(Number(body?.id));
      if (!l || l.state !== "done") return send(res, 400, { error: "Only a completed task can be revoked." });
      db.transaction(() => { q.setState.run("rejected", s.user, now, l.id); const take = Math.min(l.reward, balanceOf(l.player)); if (take > 0) { addCredits(l.player, -take); q.logClaim.run(l.player, "task-revoked", -take, now); } })();
      return send(res, 200, { ok: true });
    }
    if (p === "/api/admin/log" && req.method === "GET") {
      const rows = q.recent.all({ task: u.searchParams.get("task") ? Number(u.searchParams.get("task")) : null, day: u.searchParams.get("day") || null, state: u.searchParams.get("state") || null, limit: Math.min(1000, Number(u.searchParams.get("limit")) || 200) });
      return send(res, 200, { log: rows.map((l) => ({ id: l.id, user: l.username, task: l.title, taskId: l.task_id, day: l.day, state: l.state, proof: l.proof, reward: l.reward, ts: l.ts, by: l.reviewed_by })) });
    }
    if (p === "/api/admin/export.csv" && req.method === "GET") {
      const rows = q.recent.all({ task: null, day: u.searchParams.get("day") || null, state: null, limit: 100000 });
      const esc = (v) => { const s2 = String(v ?? ""); return /^[=+\-@]/.test(s2) ? `"'${s2.replace(/"/g, '""')}"` : /[",\n]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2; };
      const csv = ["time,day,user,task,state,reward,proof,reviewed_by", ...rows.map((l) => [new Date(l.ts).toISOString(), l.day, l.username, l.title, l.state, l.reward, l.proof, l.reviewed_by].map(esc).join(","))].join("\n");
      res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="task-log.csv"' });
      return res.end(csv);
    }
    return send(res, 404, { error: "not found" });
  }

  return { cfg, dayKey, nextReset, todays, latest, doneAt, board, api, adminApi, adminEnabled: admins.size > 0 };
}
