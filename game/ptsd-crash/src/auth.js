// Sign-in. Players sign in with X (Twitter); their X username + profile picture
// are shown in the game, the chat and the leaderboard.
//
// Two modes, picked automatically:
//   "x"    X_CLIENT_ID (+ X_CLIENT_SECRET) set: real "Sign in with X" (OAuth 2.0 + PKCE).
//          In the X developer portal, set the callback URL to <PUBLIC_URL>/auth/x/callback
//          and give the app the scopes "users.read tweet.read".
//   "demo" no X keys: a stand-in sign-in where you type any username. Same sessions,
//          same tables, so switching to real X later needs no code change.
//          Turned off when X keys are set (or DEMO_LOGIN=0).
//
// Sessions are a random id in an HttpOnly cookie, stored in crash_sessions.
// Player ids: "x:<X user id>" for X, "demo:<username>" for demo sign-ins.
import crypto from "node:crypto";

const X_AUTHORIZE = "https://x.com/i/oauth2/authorize";
const X_TOKEN = "https://api.x.com/2/oauth2/token";
const X_ME = "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username,created_at,public_metrics";
const SESSION_DAYS = 30;
const COOKIE = "ptsd_sid";

export function initAuth({ db, base, publicUrl, test }) {
  const X_ID = process.env.X_CLIENT_ID || "";
  const X_SECRET = process.env.X_CLIENT_SECRET || "";
  const mode = X_ID ? "x" : process.env.DEMO_LOGIN === "0" ? "off" : "demo";
  const secure = publicUrl.startsWith("https://");
  const cookiePath = (base || "") + "/";
  const admins = new Set(String(process.env.ADMIN_X_USERNAMES || "").toLowerCase().split(/[\s,]+/).filter(Boolean));

  db.exec(`
CREATE TABLE IF NOT EXISTS crash_users (id TEXT PRIMARY KEY, provider TEXT NOT NULL, username TEXT NOT NULL, name TEXT, pfp TEXT, created INTEGER NOT NULL, seen INTEGER);
CREATE TABLE IF NOT EXISTS crash_sessions (sid TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS crash_sessions_user ON crash_sessions(user_id);
-- Handles from the bot lists: flagged even if they sign in for the first time later.
CREATE TABLE IF NOT EXISTS crash_blocklist (handle_lc TEXT PRIMARY KEY, status TEXT NOT NULL, tier TEXT, reason TEXT, added INTEGER NOT NULL);
`);
  // Account status: NULL = normal, 'blocked' = suspected bot (can't play, hidden from boards), 'review' = held back from prizes until checked.
  // x_* = signals from X at sign-in, used to spot farms (same creation day, no followers...).
  for (const col of ["status TEXT", "status_reason TEXT", "status_at INTEGER", "x_created TEXT", "x_followers INTEGER", "x_tweets INTEGER"]) {
    try { db.exec(`ALTER TABLE crash_users ADD COLUMN ${col}`); } catch {}
  }
  const SUPPORT_URL = process.env.SUPPORT_URL || "";
  const BLOCKED_MSG = "Your account has been flagged as suspected bot activity or part of a bot farm, so you can't play right now. If you think this is a mistake, contact support.";
  const q = {
    user: db.prepare("SELECT * FROM crash_users WHERE id=?"),
    upsert: db.prepare(`INSERT INTO crash_users(id,provider,username,name,pfp,created,seen,x_created,x_followers,x_tweets) VALUES(@id,@provider,@username,@name,@pfp,@now,@now,@x_created,@x_followers,@x_tweets)
      ON CONFLICT(id) DO UPDATE SET username=excluded.username, name=excluded.name, pfp=COALESCE(excluded.pfp, crash_users.pfp), seen=excluded.seen,
        x_created=COALESCE(excluded.x_created, crash_users.x_created), x_followers=COALESCE(excluded.x_followers, crash_users.x_followers), x_tweets=COALESCE(excluded.x_tweets, crash_users.x_tweets)`),
    listed: db.prepare("SELECT * FROM crash_blocklist WHERE handle_lc=?"),
    setStatus: db.prepare("UPDATE crash_users SET status=?, status_reason=?, status_at=? WHERE id=?"),
    blockedIds: db.prepare("SELECT id FROM crash_users WHERE status='blocked'"),
    session: db.prepare("SELECT u.* FROM crash_sessions s JOIN crash_users u ON u.id=s.user_id WHERE s.sid=? AND s.expires>?"),
    addSession: db.prepare("INSERT INTO crash_sessions(sid,user_id,expires) VALUES(?,?,?)"),
    dropSession: db.prepare("DELETE FROM crash_sessions WHERE sid=?"),
    gc: db.prepare("DELETE FROM crash_sessions WHERE expires<?"),
  };
  q.gc.run(Date.now());

  const hashSid = (sid) => crypto.createHash("sha256").update(sid).digest("hex");
  function cookieOf(req) {
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]{20,})`).exec(req.headers.cookie || "");
    return m ? m[1] : "";
  }
  function setCookie(res, sid, maxAge) {
    res.setHeader("set-cookie", `${COOKIE}=${sid}; Path=${cookiePath}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  }
  function startSession(res, user) {
    q.upsert.run({ x_created: null, x_followers: null, x_tweets: null, ...user, now: Date.now() });
    // A handle on the bot list is flagged the moment it shows up (even if it was never seen before).
    const listed = q.listed.get(String(user.username).toLowerCase());
    if (listed && q.user.get(user.id)?.status !== listed.status) q.setStatus.run(listed.status, "bot list: " + (listed.reason || listed.tier || ""), Date.now(), user.id);
    const sid = crypto.randomBytes(24).toString("base64url");
    q.addSession.run(hashSid(sid), user.id, Date.now() + SESSION_DAYS * 864e5);
    setCookie(res, sid, SESSION_DAYS * 86400);
  }

  function userOf(req) {
    const sid = cookieOf(req);
    if (!sid) return null;
    const u = q.session.get(hashSid(sid), Date.now());
    return u ? { ...u, admin: admins.has(u.username.toLowerCase()) } : null;
  }
  // Ids of blocked accounts, cached for a few seconds (used by the leaderboard and chat on every poll).
  let blockedCache = { at: 0, set: new Set() };
  function blockedIds() {
    if (Date.now() - blockedCache.at > 3000) blockedCache = { at: Date.now(), set: new Set(q.blockedIds.all().map((r) => r.id)) };
    return blockedCache.set;
  }
  const isBlocked = (u) => !!u && u.status === "blocked";
  const blockedBody = () => ({ blocked: true, error: BLOCKED_MSG, support: SUPPORT_URL });
  // What other players may see about someone.
  function publicUser(id) {
    const u = q.user.get(id);
    if (!u) return { id, username: "anon", name: "anon", pfp: null };
    return { id: u.id, username: u.username, name: u.name || u.username, pfp: u.pfp || null, x: u.provider === "x" };
  }

  // ---------- X OAuth 2.0 (PKCE) ----------
  const pending = new Map(); // state -> { verifier, ts }
  const callback = publicUrl + "/auth/x/callback";
  function redirect(res, to) { res.writeHead(302, { location: to, "cache-control": "no-store" }); res.end(); }

  async function route(req, res, p, u) {
    if (mode !== "x") return redirect(res, publicUrl + "/");
    if (p === "/auth/x/start") {
      for (const [k, v] of pending) if (Date.now() - v.ts > 600_000) pending.delete(k);
      const state = crypto.randomBytes(16).toString("base64url");
      const verifier = crypto.randomBytes(32).toString("base64url");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      pending.set(state, { verifier, ts: Date.now() });
      const qs = new URLSearchParams({
        response_type: "code", client_id: X_ID, redirect_uri: callback, scope: "users.read tweet.read",
        state, code_challenge: challenge, code_challenge_method: "S256",
      });
      return redirect(res, `${X_AUTHORIZE}?${qs}`);
    }
    if (p === "/auth/x/callback") {
      const state = u.searchParams.get("state") || "", code = u.searchParams.get("code") || "";
      const pend = pending.get(state);
      pending.delete(state);
      if (!pend || !code) return redirect(res, publicUrl + "/?signin=failed");
      try {
        const headers = { "content-type": "application/x-www-form-urlencoded" };
        if (X_SECRET) headers.authorization = "Basic " + Buffer.from(`${X_ID}:${X_SECRET}`).toString("base64");
        const tok = await fetch(X_TOKEN, {
          method: "POST", headers,
          body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: X_ID, redirect_uri: callback, code_verifier: pend.verifier }),
        }).then((r) => r.json());
        if (!tok.access_token) throw new Error("no token: " + JSON.stringify(tok).slice(0, 200));
        const me = await fetch(X_ME, { headers: { authorization: "Bearer " + tok.access_token } }).then((r) => r.json());
        const d = me && me.data;
        if (!d || !d.id) throw new Error("no user: " + JSON.stringify(me).slice(0, 200));
        // X gives a 48px picture by default; ask for the 400px one.
        const pfp = d.profile_image_url ? d.profile_image_url.replace("_normal.", "_400x400.") : null;
        const pm = d.public_metrics || {};
        startSession(res, {
          id: "x:" + d.id, provider: "x", username: d.username, name: d.name || d.username, pfp,
          x_created: d.created_at || null, x_followers: Number.isFinite(pm.followers_count) ? pm.followers_count : null, x_tweets: Number.isFinite(pm.tweet_count) ? pm.tweet_count : null,
        });
        return redirect(res, publicUrl + "/");
      } catch (e) {
        console.error("[auth] X sign-in failed", e.message);
        return redirect(res, publicUrl + "/?signin=failed");
      }
    }
    return redirect(res, publicUrl + "/");
  }

  // ---------- JSON endpoints ----------
  async function api(req, res, p, body, send) {
    if (p === "/api/auth/demo" && req.method === "POST") {
      if (mode !== "demo") return send(res, 400, { error: "Demo sign-in is off." });
      const username = String(body?.username || "").replace(/^@/, "").trim();
      if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) return send(res, 400, { error: "Use 1-15 letters, numbers or _ (like an X handle)." });
      startSession(res, { id: "demo:" + username.toLowerCase(), provider: "demo", username, name: username, pfp: null });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/auth/logout" && req.method === "POST") {
      const sid = cookieOf(req);
      if (sid) q.dropSession.run(hashSid(sid));
      setCookie(res, "x", 0);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "not found" });
  }

  return { mode, userOf, publicUser, route, api, blockedIds, isBlocked, blockedBody, supportUrl: SUPPORT_URL };
}
