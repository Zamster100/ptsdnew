// Comments: one shared chat about the game. Anyone can read, signed-in players
// post under their X username. Admins (ADMIN_X_USERNAMES) can delete any message,
// players can delete their own.
const MAX_LEN = 280;
const GAP_MS = 2500;      // one message per player every 2.5s
const KEEP = 60;          // messages sent on first load

export function initChat({ db, auth }) {
  db.exec(`CREATE TABLE IF NOT EXISTS crash_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, text TEXT NOT NULL, ts INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS crash_comments_ts ON crash_comments(ts);`);
  const q = {
    latest: db.prepare("SELECT * FROM crash_comments WHERE deleted=0 ORDER BY id DESC LIMIT ?"),
    after: db.prepare("SELECT * FROM crash_comments WHERE deleted=0 AND id>? ORDER BY id ASC LIMIT 200"),
    deletedSince: db.prepare("SELECT id FROM crash_comments WHERE deleted>? ORDER BY id DESC LIMIT 200"),
    add: db.prepare("INSERT INTO crash_comments(user_id,text,ts) VALUES(?,?,?)"),
    get: db.prepare("SELECT * FROM crash_comments WHERE id=?"),
    del: db.prepare("UPDATE crash_comments SET deleted=? WHERE id=?"),
  };
  const lastPost = new Map();

  const view = (c, me) => {
    const u = auth.publicUser(c.user_id);
    return { id: c.id, text: c.text, ts: c.ts, username: u.username, name: u.name, pfp: u.pfp, mine: !!me && me.id === c.user_id };
  };

  // GET  /api/comments?after=<id>&since=<ms>  new messages (+ ids deleted since)
  // POST /api/comments {text}                  post one
  // POST /api/comments/delete {id}             delete one
  function api(req, res, p, u, body, user, send) {
    if (p === "/api/comments" && req.method === "GET") {
      const after = Number(u.searchParams.get("after")) || 0;
      const since = Number(u.searchParams.get("since")) || 0;
      const bots = auth.blockedIds(); // messages from flagged (bot) accounts are hidden
      const rows = (after ? q.after.all(after) : q.latest.all(KEEP).reverse()).filter((c) => !bots.has(c.user_id));
      return send(res, 200, {
        comments: rows.map((c) => view(c, user)),
        deleted: since ? q.deletedSince.all(since).map((r) => r.id) : [],
        admin: !!(user && user.admin), signedIn: !!user, now: Date.now(),
      });
    }
    if (!user) return send(res, 401, { error: "Sign in with X to chat.", signIn: true });
    if (auth.isBlocked(user)) return send(res, 403, auth.blockedBody());
    if (p === "/api/comments" && req.method === "POST") {
      const text = String(body?.text || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
      if (!text) return send(res, 400, { error: "Say something first." });
      const last = lastPost.get(user.id) || 0;
      if (Date.now() - last < GAP_MS) return send(res, 429, { error: "Slow down a sec." });
      lastPost.set(user.id, Date.now());
      const r = q.add.run(user.id, text, Date.now());
      return send(res, 200, { comment: view(q.get.get(r.lastInsertRowid), user) });
    }
    if (p === "/api/comments/delete" && req.method === "POST") {
      const c = q.get.get(Number(body?.id) || 0);
      if (!c || c.deleted) return send(res, 404, { error: "Message not found." });
      if (c.user_id !== user.id && !user.admin) return send(res, 403, { error: "You can only delete your own messages." });
      q.del.run(Date.now(), c.id);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "not found" });
  }
  return { api };
}
