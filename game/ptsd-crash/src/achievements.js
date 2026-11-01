// Achievements: one-time goals with a badge and a small XP reward (paid as Activity points, so they count on the leaderboard).
//
// Every achievement is "a number reaches a goal" (rounds played, best sell, win streak, ...) so the browser can show progress on the
// locked ones. They are checked after every settled round and when a player opens the game (throttled), and each unlocks once.
// A player's numbers come from data that already exists (rounds, streaks, activity, referrals, bounties, jackpot, Tickets), nothing new
// has to be tracked per round.
//   ACHIEVEMENTS=0   switch them off
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

// stat = which number, goal = what it must reach, xp = the reward
export const CATALOG = [
  { key: "r1", group: "Playing", icon: "🎬", name: "First Trade", desc: "Play your first round", stat: "rounds", goal: 1, xp: 100 },
  { key: "r25", group: "Playing", icon: "🔁", name: "Regular", desc: "Play 25 rounds", stat: "rounds", goal: 25, xp: 250 },
  { key: "r100", group: "Playing", icon: "⚙️", name: "Grinder", desc: "Play 100 rounds", stat: "rounds", goal: 100, xp: 500 },
  { key: "r500", group: "Playing", icon: "🧟", name: "No Life", desc: "Play 500 rounds", stat: "rounds", goal: 500, xp: 1000 },
  { key: "r2000", group: "Playing", icon: "👾", name: "Terminally Online", desc: "Play 2,000 rounds", stat: "rounds", goal: 2000, xp: 2500 },
  { key: "w1", group: "Winning", icon: "🟢", name: "In The Green", desc: "Win a round", stat: "wins", goal: 1, xp: 100 },
  { key: "w10", group: "Winning", icon: "💹", name: "Winning Habit", desc: "Win 10 rounds", stat: "wins", goal: 10, xp: 250 },
  { key: "w50", group: "Winning", icon: "🏧", name: "Profit Machine", desc: "Win 50 rounds", stat: "wins", goal: 50, xp: 750 },
  { key: "m2", group: "Big sells", icon: "✌️", name: "Doubled Up", desc: "Sell at 2x or more", stat: "bestX", goal: 2, xp: 150 },
  { key: "m5", group: "Big sells", icon: "🎲", name: "High Roller", desc: "Sell at 5x or more", stat: "bestX", goal: 5, xp: 400 },
  { key: "m10", group: "Big sells", icon: "🔟", name: "Ten Bagger", desc: "Sell at 10x or more", stat: "bestX", goal: 10, xp: 750 },
  { key: "m25", group: "Big sells", icon: "🚀", name: "Moonboy", desc: "Sell at 25x or more", stat: "bestX", goal: 25, xp: 1500 },
  { key: "m50", group: "Big sells", icon: "🌕", name: "Absolute Unit", desc: "Sell at 50x or more", stat: "bestX", goal: 50, xp: 3000 },
  { key: "k1", group: "Getting rugged", icon: "🪤", name: "Welcome To The Rug", desc: "Get rekt for the first time", stat: "rekts", goal: 1, xp: 100 },
  { key: "k10", group: "Getting rugged", icon: "🛟", name: "Rug Survivor", desc: "Get rekt 10 times and keep playing", stat: "rekts", goal: 10, xp: 300 },
  { key: "k50", group: "Getting rugged", icon: "💀", name: "Exit Liquidity", desc: "Get rekt 50 times", stat: "rekts", goal: 50, xp: 750 },
  { key: "bb1", group: "Getting rugged", icon: "🍀", name: "Bad Beat", desc: "Get a bad beat refund", stat: "badBeats", goal: 1, xp: 200 },
  { key: "s3", group: "Streaks", icon: "🎩", name: "Hat Trick", desc: "Win 3 rounds in a row", stat: "bestWin", goal: 3, xp: 250 },
  { key: "s5", group: "Streaks", icon: "🔥", name: "On Fire", desc: "Win 5 rounds in a row", stat: "bestWin", goal: 5, xp: 500 },
  { key: "s10", group: "Streaks", icon: "🛡️", name: "Unstoppable", desc: "Win 10 rounds in a row", stat: "bestWin", goal: 10, xp: 1500 },
  { key: "l3", group: "Streaks", icon: "📅", name: "Regular Visitor", desc: "Log in 3 days in a row", stat: "bestLogin", goal: 3, xp: 150 },
  { key: "l7", group: "Streaks", icon: "🗓️", name: "Weekly Degen", desc: "Log in 7 days in a row", stat: "bestLogin", goal: 7, xp: 500 },
  { key: "p1", group: "Skill", icon: "🎯", name: "Perfect Exit", desc: "Make a perfect sell", stat: "perfects", goal: 1, xp: 300 },
  { key: "p5", group: "Skill", icon: "🏹", name: "Sniper", desc: "Make 5 perfect sells", stat: "perfects", goal: 5, xp: 1000 },
  { key: "f1", group: "Skill", icon: "😨", name: "Greedy When Fearful", desc: "Win a round during a Fear window", stat: "fearWins", goal: 1, xp: 500 },
  { key: "g1", group: "Skill", icon: "😎", name: "Fearful When Greedy", desc: "Sell at 2x or more during a Greed window", stat: "greedBigs", goal: 1, xp: 750 },
  { key: "jp1", group: "Jackpot", icon: "🎫", name: "Lucky Ticket", desc: "Win a daily jackpot draw", stat: "dailyWins", goal: 1, xp: 1500 },
  { key: "pb1", group: "Jackpot", icon: "💥", name: "Pot Breaker", desc: "Break the pot with a huge sell", stat: "breakerWins", goal: 1, xp: 5000 },
  { key: "t1", group: "Bounties", icon: "🎯", name: "Bounty Hunter", desc: "Clear a bounty", stat: "tasks", goal: 1, xp: 200 },
  { key: "t10", group: "Bounties", icon: "🗡️", name: "Mercenary", desc: "Clear 10 bounties", stat: "tasks", goal: 10, xp: 750 },
  { key: "ref1", group: "Community", icon: "🤝", name: "Recruiter", desc: "Bring in a friend who plays", stat: "refs", goal: 1, xp: 300 },
  { key: "ref5", group: "Community", icon: "📣", name: "Influencer", desc: "Bring in 5 friends who play", stat: "refs", goal: 5, xp: 1000 },
  { key: "n1", group: "Community", icon: "🎟️", name: "Ticket Holder", desc: "Hold a PTSD Ticket NFT", stat: "nfts", goal: 1, xp: 300 },
];

export function initAchievements({ db, xp, streaks, nftCount = () => 0, coin = "CREDITS", baseEdge = 0.05 }) {
  const on = () => process.env.ACHIEVEMENTS !== "0";
  db.exec("CREATE TABLE IF NOT EXISTS crash_achievements (player TEXT NOT NULL, key TEXT NOT NULL, ts INTEGER NOT NULL, round_id TEXT, seen INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (player, key))");
  const optional = (sql, fallback) => { try { return db.prepare(sql); } catch { return { get: () => fallback, all: () => [] }; } };
  const q = {
    agg: db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(pnl > 0), 0) wins, COALESCE(SUM(state = 'rekt'), 0) rekts, COALESCE(MAX(sold_mult), 0) bestX,
      COALESCE(SUM(pnl > 0 AND COALESCE(edge, @b) < @b), 0) fearWins, COALESCE(SUM(sold_mult >= 2 AND COALESCE(edge, @b) > @b), 0) greedBigs
      FROM crash_rounds WHERE player = @p AND coin = @c AND state != 'open'`),
    perfects: db.prepare("SELECT COUNT(*) n FROM crash_activity WHERE player = ? AND kind = 'perfect-sell'"),
    badBeats: optional("SELECT COUNT(*) n FROM crash_badbeats WHERE player = ?", { n: 0 }),
    jp: optional("SELECT COALESCE(SUM(kind = 'daily'), 0) d, COALESCE(SUM(kind = 'breaker'), 0) b FROM crash_jackpot_wins WHERE player = ?", { d: 0, b: 0 }),
    tasks: optional("SELECT COUNT(*) n FROM crash_task_log WHERE player = ? AND state = 'done'", { n: 0 }),
    refs: optional("SELECT COUNT(*) n FROM crash_referrals WHERE referrer = ? AND qualified_at IS NOT NULL", { n: 0 }),
    have: db.prepare("SELECT key, ts FROM crash_achievements WHERE player = ?"),
    ins: db.prepare("INSERT OR IGNORE INTO crash_achievements(player, key, ts, round_id) VALUES(?,?,?,?)"),
    byRound: db.prepare("SELECT key FROM crash_achievements WHERE round_id = ?"),
    seeRound: db.prepare("UPDATE crash_achievements SET seen = 1 WHERE round_id = ?"),
    unseen: db.prepare("SELECT key, ts FROM crash_achievements WHERE player = ? AND seen = 0 ORDER BY ts"),
    seeAll: db.prepare("UPDATE crash_achievements SET seen = 1 WHERE player = ?"),
  };
  const byKey = new Map(CATALOG.map((a) => [a.key, a]));
  const pub = (a) => ({ key: a.key, name: a.name, icon: a.icon, desc: a.desc, xp: a.xp });

  // every number an achievement can be about, for one player
  function statsOf(player) {
    const a = q.agg.get({ p: player, c: coin, b: baseEdge });
    const st = streaks.stateOf(player), jp = q.jp.get(player) || { d: 0, b: 0 };
    return {
      rounds: a.n, wins: a.wins, rekts: a.rekts, bestX: a.bestX, fearWins: a.fearWins, greedBigs: a.greedBigs,
      bestWin: st.bestWin, bestLogin: st.bestLogin,
      perfects: q.perfects.get(player).n, badBeats: (q.badBeats.get(player) || { n: 0 }).n,
      dailyWins: jp.d, breakerWins: jp.b, tasks: (q.tasks.get(player) || { n: 0 }).n, refs: (q.refs.get(player) || { n: 0 }).n,
      nfts: nftCount(player),
    };
  }

  // Unlock whatever the player has now earned. roundId = the round that triggered it (so its popup can say so). Returns the new unlocks.
  const evaluate = db.transaction((player, roundId = null, now = Date.now()) => {
    if (!on() || !player) return [];
    const have = new Set(q.have.all(player).map((r) => r.key)), s = statsOf(player), fresh = [];
    for (const a of CATALOG) {
      if (have.has(a.key) || !(s[a.stat] >= a.goal)) continue;
      if (!q.ins.run(player, a.key, now, roundId).changes) continue;
      xp.addActivity(player, "achievement", a.xp, now);
      fresh.push(pub(a));
    }
    return fresh;
  });

  // unlocks a round caused (shown in its popup), once
  function forRound(roundId) {
    const rows = q.byRound.all(roundId);
    if (rows.length) q.seeRound.run(roundId);
    return rows.map((r) => pub(byKey.get(r.key))).filter(Boolean);
  }
  // unlocks the player hasn't been told about (they happened while away or without a round)
  function takeUnseen(player) {
    const rows = q.unseen.all(player);
    if (rows.length) q.seeAll.run(player);
    return rows.map((r) => ({ ...pub(byKey.get(r.key)), ts: r.ts })).filter((r) => r.key);
  }
  // the whole catalog for a player: unlocked or not, with progress on the locked ones
  function view(player) {
    const have = new Map(player ? q.have.all(player).map((r) => [r.key, r.ts]) : []), s = player ? statsOf(player) : {};
    const list = CATALOG.map((a) => ({
      ...pub(a), group: a.group, unlocked: have.has(a.key), ts: have.get(a.key) || null,
      have: Math.min(a.goal, Math.floor((s[a.stat] || 0) * 100) / 100), goal: a.goal,
    }));
    return { unlocked: list.filter((a) => a.unlocked).length, total: list.length, xp: list.filter((a) => a.unlocked).reduce((t, a) => t + a.xp, 0), list };
  }
  // short form for the profile and the hover card
  function summary(player) {
    const rows = q.have.all(player).sort((a, b) => b.ts - a.ts);
    return { unlocked: rows.length, total: CATALOG.length, recent: rows.slice(0, 8).map((r) => byKey.get(r.key)).filter(Boolean).map(pub) };
  }
  return { evaluate, forRound, takeUnseen, view, summary, statsOf, catalog: CATALOG };
}
