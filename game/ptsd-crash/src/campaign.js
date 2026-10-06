// WL campaign: onboarding (X -> wallet -> social task -> how to play), free
// credits (a starter pack, then one claim every CLAIM_HOURS), and the campaign
// leaderboard window with its live prize counts.
//
// Settings (env):
//   CLAIMS=1             credits come from claims (no free test balance)
//   START_CREDITS        first pack, after the social step   (default 100000)
//   DAILY_CREDITS        each later claim                    (default 100000)
//   CLAIM_HOURS          hours between claims                (default 24)
//   CAMPAIGN_START/END   ISO times; only rounds inside count for the campaign board
//   WL_MAX, WL_PER       WL spots = min(WL_MAX, players / WL_PER)      (500, 10)
//   MINT_MAX, MINT_PER   free mints = min(MINT_MAX, players / MINT_PER) (25, 200)
//   ANNOUNCE_POST_URL    the X post players are asked to like/RT/tag
//   X_HANDLE             account to follow (default ptsdshow)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const time = (v) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : null; };

export function initCampaign({ db, currency, addCredits }) {
  const cfg = {
    claims: process.env.CLAIMS === "1",
    start: num(process.env.START_CREDITS, 100000),
    daily: num(process.env.DAILY_CREDITS, 100000),
    hours: num(process.env.CLAIM_HOURS, 24),
    campStart: time(process.env.CAMPAIGN_START),
    campEnd: time(process.env.CAMPAIGN_END),
    wlMax: num(process.env.WL_MAX, 500), wlPer: num(process.env.WL_PER, 10),
    mintMax: num(process.env.MINT_MAX, 25), mintPer: num(process.env.MINT_PER, 200),
    post: process.env.ANNOUNCE_POST_URL || "",
    handle: (process.env.X_HANDLE || "ptsdshow").replace(/^@/, ""),
  };
  for (const col of ["wallet TEXT", "starter_at INTEGER", "claim_at INTEGER", "onboarded_at INTEGER"]) {
    try { db.exec(`ALTER TABLE crash_users ADD COLUMN ${col}`); } catch {}
  }
  // Wallet is free text (players paste whatever they mint with), so no format or uniqueness rule.
  db.exec("DROP INDEX IF EXISTS crash_users_wallet");
  db.exec("CREATE TABLE IF NOT EXISTS crash_claims (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL, ts INTEGER NOT NULL)");
  const q = {
    user: db.prepare("SELECT * FROM crash_users WHERE id=?"),
    setWallet: db.prepare("UPDATE crash_users SET wallet=? WHERE id=?"),
    starter: db.prepare("UPDATE crash_users SET starter_at=?, claim_at=? WHERE id=? AND starter_at IS NULL"),
    daily: db.prepare("UPDATE crash_users SET claim_at=? WHERE id=? AND claim_at=?"),
    onboarded: db.prepare("UPDATE crash_users SET onboarded_at=? WHERE id=? AND onboarded_at IS NULL"),
    logClaim: db.prepare("INSERT INTO crash_claims(player,kind,amount,ts) VALUES(?,?,?,?)"),
    players: db.prepare("SELECT COUNT(DISTINCT player) n FROM crash_rounds WHERE state!='open' AND ts>=? AND ts<?"),
  };
  const hoursMs = cfg.hours * 3600_000;

  // What the browser needs to know about this player's onboarding + claims.
  function stateOf(id) {
    const u = q.user.get(id);
    if (!u) return null;
    const next = u.claim_at ? u.claim_at + hoursMs : null;
    return {
      wallet: u.wallet || null,
      starter: !!u.starter_at,
      onboarded: !!u.onboarded_at,
      claimAt: next,                       // when the next daily claim opens (null before the starter pack)
      canClaim: !!u.starter_at && next != null && Date.now() >= next,
    };
  }
  // Only a player who finished the starter step can bet in claims mode.
  const ready = (id) => { const u = q.user.get(id); return !!(u && u.wallet && u.starter_at); };

  const claimStarter = db.transaction((id) => {
    const u = q.user.get(id);
    if (!u.wallet) return { error: "Add your wallet first." };
    if (u.starter_at) return { error: "Starter credits already claimed." };
    const now = Date.now();
    q.starter.run(now, now, id);
    addCredits(id, cfg.start);
    q.logClaim.run(id, "starter", cfg.start, now);
    return { amount: cfg.start };
  });
  const claimDaily = db.transaction((id) => {
    const u = q.user.get(id);
    if (!u.starter_at) return { error: "Finish the first steps to get your credits." };
    const now = Date.now();
    if (now < u.claim_at + hoursMs) return { error: "Not yet. Come back when the timer runs out.", claimAt: u.claim_at + hoursMs };
    if (!q.daily.run(now, id, u.claim_at).changes) return { error: "Already claimed." };
    addCredits(id, cfg.daily);
    q.logClaim.run(id, "daily", cfg.daily, now);
    return { amount: cfg.daily };
  });

  function campaign() {
    if (!cfg.campEnd) return null;
    const from = cfg.campStart || 0, to = cfg.campEnd;
    const players = q.players.get(from, to).n;
    return {
      start: from, end: to, ended: Date.now() >= to, players,
      wlSpots: Math.min(cfg.wlMax, Math.floor(players / cfg.wlPer)), wlMax: cfg.wlMax, wlPer: cfg.wlPer,
      mints: Math.min(cfg.mintMax, Math.floor(players / cfg.mintPer)), mintMax: cfg.mintMax, mintPer: cfg.mintPer,
    };
  }

  // POST /api/wallet {address}   POST /api/claim {kind: starter|daily}   POST /api/onboarded
  function api(req, res, p, body, user, send, balance) {
    if (p === "/api/wallet" && req.method === "POST") {
      const a = String(body?.address || "").replace(/[\u0000-\u001f\u007f]+/g, "").trim().slice(0, 200);
      if (!a) return send(res, 400, { error: "Paste your wallet address first." });
      q.setWallet.run(a, user.id);
      return send(res, 200, { ok: true, state: stateOf(user.id) });
    }
    if (p === "/api/claim" && req.method === "POST") {
      if (!cfg.claims) return send(res, 400, { error: "Claims are off." });
      const out = body?.kind === "starter" ? claimStarter(user.id) : claimDaily(user.id);
      if (out.error) return send(res, 400, { error: out.error, state: stateOf(user.id) });
      return send(res, 200, { amount: out.amount, balance: balance(), state: stateOf(user.id) });
    }
    if (p === "/api/onboarded" && req.method === "POST") {
      q.onboarded.run(Date.now(), user.id);
      return send(res, 200, { ok: true, state: stateOf(user.id) });
    }
    return null;
  }

  return { cfg, stateOf, ready, campaign, api, publicCfg: () => ({ claims: cfg.claims, start: cfg.start, daily: cfg.daily, hours: cfg.hours, post: cfg.post, handle: cfg.handle, campaign: campaign() }) };
}
