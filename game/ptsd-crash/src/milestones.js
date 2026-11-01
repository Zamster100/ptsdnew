// Community milestones: goals the whole campaign works on together. When one is reached, every player who has played a round can
// claim its reward once (free credits). It gives everyone a reason to bring friends and keep playing.
//
// Two tracks: "rounds" (all rounds played by everyone since MILESTONES_FROM) and "players" (accounts that claimed their starter credits).
// Rewards are credits only, paid to the balance, never profit, so the leaderboard doesn't change.
//   MILESTONES=0              switch them off
//   MILESTONES_FROM           ISO date the round count starts from (default: the first cycle's start, or 0)
//   MILESTONE_ROUNDS          "goal:reward,goal:reward"  (default 10000:25000,50000:50000,100000:100000,250000:150000,500000:250000)
//   MILESTONE_PLAYERS         same for players           (default 100:25000,500:50000,1000:100000,2500:150000)
const DEFAULT_ROUNDS = "10000:25000,50000:50000,100000:100000,250000:150000,500000:250000";
const DEFAULT_PLAYERS = "100:25000,500:50000,1000:100000,2500:150000";
const parse = (s, track) => String(s || "").split(",").map((p) => p.trim().split(":").map(Number)).filter(([g, r]) => g > 0 && r > 0).sort((a, b) => a[0] - b[0])
  .map(([goal, reward]) => ({ key: `${track}-${goal}`, track, goal, reward }));

export function initMilestones({ db, coin = "CREDITS", addCredits, from = 0 }) {
  const on = () => process.env.MILESTONES !== "0";
  const fromTs = process.env.MILESTONES_FROM ? Date.parse(process.env.MILESTONES_FROM) || 0 : from;
  const goals = [...parse(process.env.MILESTONE_ROUNDS || DEFAULT_ROUNDS, "rounds"), ...parse(process.env.MILESTONE_PLAYERS || DEFAULT_PLAYERS, "players")];
  db.exec(`
    CREATE TABLE IF NOT EXISTS crash_milestones (key TEXT PRIMARY KEY, reached_ts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crash_milestone_claims (player TEXT NOT NULL, key TEXT NOT NULL, amount INTEGER NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (player, key));
    CREATE TABLE IF NOT EXISTS crash_claims (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL, ts INTEGER NOT NULL);`);
  const q = {
    rounds: db.prepare("SELECT COUNT(*) n FROM crash_rounds WHERE ts >= ? AND state != 'open' AND coin = ?"),
    players: db.prepare("SELECT COUNT(*) n FROM crash_users WHERE starter_at IS NOT NULL"),
    reached: db.prepare("SELECT key, reached_ts FROM crash_milestones"),
    reach: db.prepare("INSERT OR IGNORE INTO crash_milestones(key, reached_ts) VALUES(?,?)"),
    logClaim: db.prepare("INSERT INTO crash_claims(player,kind,amount,ts) VALUES(?,?,?,?)"),
    claimed: db.prepare("SELECT key FROM crash_milestone_claims WHERE player = ?"),
    claim: db.prepare("INSERT OR IGNORE INTO crash_milestone_claims(player, key, amount, ts) VALUES(?,?,?,?)"),
    played: db.prepare("SELECT 1 FROM crash_rounds WHERE player = ? LIMIT 1"),
  };
  const reached = new Map(q.reached.all().map((r) => [r.key, r.reached_ts]));
  const val = { rounds: on() ? q.rounds.get(fromTs, coin).n : 0, players: 0, playersAt: 0 };

  function check(track, now = Date.now()) {
    for (const g of goals) if (g.track === track && !reached.has(g.key) && val[track] >= g.goal) { q.reach.run(g.key, now); reached.set(g.key, now); }
  }
  // A round just settled (any player): count it and see whether a goal was crossed.
  function onSettled(now = Date.now()) {
    if (!on()) return;
    val.rounds++; check("rounds", now);
  }
  // Accounts change slowly, so the player count is looked at once in a while.
  function refreshPlayers(now = Date.now(), every = 60_000) {
    if (!on() || now - val.playersAt < every) return;
    val.playersAt = now; val.players = q.players.get().n; check("players", now);
  }
  refreshPlayers(Date.now(), 0); check("rounds");

  const claimedBy = (player) => new Set(player ? q.claimed.all(player).map((r) => r.key) : []);
  const eligible = (player) => !!player && !!q.played.get(player);

  function view(player, now = Date.now()) {
    refreshPlayers(now);
    const done = claimedBy(player), ok = eligible(player);
    const list = goals.map((g) => ({ key: g.key, track: g.track, goal: g.goal, reward: g.reward, reachedAt: reached.get(g.key) || null, claimed: done.has(g.key), claimable: ok && reached.has(g.key) && !done.has(g.key) }));
    return { on: on(), rounds: val.rounds, players: val.players, eligible: ok, claimable: list.filter((m) => m.claimable).length, list };
  }
  const claimableCount = (player) => {
    if (!on() || !eligible(player)) return 0;
    const done = claimedBy(player);
    return goals.filter((g) => reached.has(g.key) && !done.has(g.key)).length;
  };

  const claim = db.transaction((player, key, now = Date.now()) => {
    const g = goals.find((x) => x.key === key);
    if (!on() || !g) return { error: "No such milestone." };
    if (!reached.has(key)) return { error: "The community hasn't reached this one yet." };
    if (!eligible(player)) return { error: "Play a round first, then you can claim community rewards." };
    if (!q.claim.run(player, key, g.reward, now).changes) return { error: "Already claimed." };
    addCredits(player, g.reward); q.logClaim.run(player, "milestone", g.reward, now);
    return { amount: g.reward, key };
  });
  return { goals, view, claim, claimableCount, onSettled, refreshPlayers, val };
}
