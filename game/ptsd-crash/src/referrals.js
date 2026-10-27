// Referrals. A player's code is their X handle. A new player (no rounds yet) enters a code once and gets a bonus
// of credits (balance only, never PnL). Each referred player who is a real X account and plays at least
// REF_MIN_ROUNDS rounds "qualifies" and adds REF_POINTS to the referrer's cycle profit, for at most REF_MAX
// referrals per referrer. The points land in the cycle where the referral qualified.
//
// Settings (env):
//   REF_POINTS          profit added to the referrer per qualified referral      (default 5000)
//   REF_MAX             qualified referrals that count per referrer              (default 20)
//   REF_MIN_ROUNDS      rounds the referred player must play to qualify          (default 5)
//   REF_BONUS_CREDITS   credits the referred player gets for using a code        (default 10000)
//   REF_REQUIRE_X       1 = only real X accounts qualify (0 allows demo logins, for local testing) (default 1)
//
// Qualifying is checked by a sweep every few seconds (not on the player's request). A referral whose account is
// flagged as a bot stops counting at once (the bonus is computed from the table on every read).
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initReferrals({ db, cycles, addCredits }) {
  const cfg = {
    points: num(process.env.REF_POINTS, 5000),
    max: num(process.env.REF_MAX, 20),
    minRounds: num(process.env.REF_MIN_ROUNDS, 5),
    bonus: num(process.env.REF_BONUS_CREDITS, 10000),
    requireX: process.env.REF_REQUIRE_X !== "0",
  };
  db.exec(`CREATE TABLE IF NOT EXISTS crash_referrals (
    referee TEXT PRIMARY KEY, referrer TEXT NOT NULL, applied_at INTEGER NOT NULL,
    qualified_at INTEGER, cycle_id INTEGER, counted INTEGER NOT NULL DEFAULT 0, reason TEXT)`);
  db.exec("CREATE INDEX IF NOT EXISTS crash_referrals_referrer ON crash_referrals(referrer)");
  const q = {
    user: db.prepare("SELECT id, username, provider, status FROM crash_users WHERE id=?"),
    byName: db.prepare("SELECT id, username, provider, status FROM crash_users WHERE lower(username)=? ORDER BY (provider='x') DESC, seen DESC LIMIT 1"),
    has: db.prepare("SELECT referrer FROM crash_referrals WHERE referee=?"),
    played: db.prepare("SELECT 1 FROM crash_rounds WHERE player=? LIMIT 1"),
    add: db.prepare("INSERT INTO crash_referrals(referee, referrer, applied_at) VALUES(?,?,?)"),
    logClaim: db.prepare("INSERT INTO crash_claims(player,kind,amount,ts) VALUES(?,?,?,?)"),
    pending: db.prepare(`SELECT r.referee, r.referrer, u.provider, u.status FROM crash_referrals r JOIN crash_users u ON u.id=r.referee
      WHERE r.qualified_at IS NULL AND (SELECT COUNT(*) FROM crash_rounds WHERE player=r.referee AND state!='open') >= ?`),
    countedFor: db.prepare("SELECT COUNT(*) n FROM crash_referrals WHERE referrer=? AND counted=1"),
    mark: db.prepare("UPDATE crash_referrals SET qualified_at=?, cycle_id=?, counted=?, reason=? WHERE referee=? AND qualified_at IS NULL"),
    // counted referrals of each referrer in one cycle, minus accounts flagged as bots
    inCycle: db.prepare(`SELECT r.referrer, COUNT(*) n FROM crash_referrals r JOIN crash_users u ON u.id=r.referee
      WHERE r.counted=1 AND r.cycle_id=? AND (u.status IS NULL OR u.status!='blocked') GROUP BY r.referrer`),
    mine: db.prepare(`SELECT r.referee, r.qualified_at, r.counted, r.reason, u.username FROM crash_referrals r JOIN crash_users u ON u.id=r.referee WHERE r.referrer=? ORDER BY r.applied_at DESC LIMIT 100`),
    countedLive: db.prepare(`SELECT COUNT(*) n FROM crash_referrals r JOIN crash_users u ON u.id=r.referee WHERE r.referrer=? AND r.counted=1 AND (u.status IS NULL OR u.status!='blocked')`),
  };
  let version = 0;

  const give = db.transaction((referee, referrer, now) => {
    q.add.run(referee, referrer, now);
    addCredits(referee, cfg.bonus);
    q.logClaim.run(referee, "referral", cfg.bonus, now);
  });
  function apply(userId, code) {
    const u = q.user.get(userId);
    const lc = String(code || "").trim().replace(/^@/, "").toLowerCase().slice(0, 40);
    if (!u) return { code: 400, error: "Sign in first." };
    if (!lc) return { code: 400, error: "Enter a referral code." };
    if (q.has.get(userId)) return { code: 400, error: "You already used a referral code." };
    if (q.played.get(userId)) return { code: 400, error: "Referral codes only work before your first round." };
    const ref = /^[a-z0-9_]{1,15}$/.test(lc) ? q.byName.get(lc) : null;
    if (!ref || ref.id === userId || ref.status === "blocked") return { code: 404, error: "That referral code doesn't exist." };
    give(userId, ref.id, Date.now());
    return { code: 200, bonus: cfg.bonus, by: ref.username };
  }

  // Referred players who now qualify: real X account, not flagged, enough rounds, and the referrer still under the cap.
  function sweep() {
    let changed = false;
    for (const p of q.pending.all(cfg.minRounds)) {
      if (p.status === "blocked") continue; // stays pending; counts if the flag is lifted
      const now = Date.now(), cyc = cycles.shown();
      if (cfg.requireX && p.provider !== "x") { q.mark.run(now, cyc ? cyc.id : null, 0, "no-x", p.referee); changed = true; continue; }
      const counted = q.countedFor.get(p.referrer).n < cfg.max ? 1 : 0;
      q.mark.run(now, cyc ? cyc.id : null, counted, counted ? null : "cap", p.referee);
      changed = true;
    }
    if (changed) version++;
  }
  try { sweep(); } catch (e) { console.error("[referrals] sweep failed", e.message); }
  setInterval(() => { try { sweep(); } catch (e) { console.error("[referrals] sweep failed", e.message); } }, 10_000).unref();

  // referrer -> profit added in this cycle
  function bonusMap(cycleId) {
    const m = new Map();
    for (const r of q.inCycle.all(cycleId)) m.set(r.referrer, r.n * cfg.points);
    return m;
  }

  // What the owner sees about their own referrals (and whether they can still enter a code).
  function stateOf(userId) {
    const u = q.user.get(userId);
    const by = q.has.get(userId);
    const list = q.mine.all(userId);
    const counted = q.countedLive.get(userId).n;
    return {
      code: u ? u.username : null,
      usedCode: !!by, canApply: !by && !q.played.get(userId),
      refs: list.map((r) => ({ username: r.username, status: r.qualified_at ? (r.counted ? "counted" : r.reason === "cap" ? "over the cap" : "not eligible") : "playing" })),
      counted, pending: list.filter((r) => !r.qualified_at).length, max: cfg.max, points: cfg.points, minRounds: cfg.minRounds, bonus: cfg.bonus,
    };
  }
  const countOf = (userId) => q.countedLive.get(userId).n;

  function api(req, res, p, body, user, send) {
    if (p === "/api/referral/apply" && req.method === "POST") {
      const out = apply(user.id, body?.code);
      if (out.code !== 200) return send(res, out.code, { error: out.error, ref: stateOf(user.id) });
      return send(res, 200, { ok: true, bonus: out.bonus, by: out.by, ref: stateOf(user.id) });
    }
    return null;
  }

  return { cfg, apply, sweep, bonusMap, stateOf, countOf, api, version: () => version };
}
