// XP: the one number a player is ranked on in a cycle.
//
//   XP = (PNL + Referral points + Task points + Activity points) x NFT multiplier
//
// PNL can be negative. Referral, Task and Activity points are their own counters, never cleared by a PNL reset.
// The multiplier (from the Tickets held, see wallet.js) never makes a loss bigger: while PNL is in the red it multiplies
// only the points earned (referrals, tasks, activity) and the loss is subtracted at face value.
//
// Activity points are the catch-all for the small bonuses (streaks, perfect sells, double XP hour, underdog boost...).
// Features call addActivity(); nothing else in here needs to change when a new one is added.
export function xpOf({ pnl = 0, refs = 0, tasks = 0, activity = 0 }, mult = 1) {
  const total = pnl + refs + tasks + activity, earned = refs + tasks + activity;
  const m = mult > 1 && (pnl > 0 ? total > 0 : earned > 0) ? mult : 1;
  return { total, mult: m, xp: Math.round(pnl > 0 ? total * m : pnl + earned * m) };
}

// ---- levels ----
// A player's level never goes down. It is built from "level XP" = the highest XP they reached in each cycle, added up
// over the campaign (so a bad run, a PNL reset or a revoked task can't take a level away, and Cycle 2 starts from the
// level earned in Cycle 1). Every 5th level is a new badge stage.
export const LEVEL_CAP = 30;
export const STAGES = [
  { from: 1, name: "Fresh Bag" },
  { from: 5, name: "Paper Hands" },
  { from: 10, name: "Diamond Hands" },
  { from: 15, name: "Chart Reader" },
  { from: 20, name: "Degen" },
  { from: 25, name: "Rug Survivor" },
  { from: 30, name: "Legend" },
];
// Level XP needed to reach level n (level 2 = 500, 10 = 26,100, 20 = 100,300, 30 = 214,400).
export const xpForLevel = (n) => (n <= 1 ? 0 : Math.round((500 * (n - 1) ** 1.8) / 50) * 50);
export const stageOf = (n) => [...STAGES].reverse().find((s) => n >= s.from) || STAGES[0];
export function levelInfo(levelXp) {
  const x = Math.max(0, Math.floor(levelXp || 0));
  let n = 1;
  while (n < LEVEL_CAP && x >= xpForLevel(n + 1)) n++;
  const floor = xpForLevel(n), next = n < LEVEL_CAP ? xpForLevel(n + 1) : null;
  const st = stageOf(n), nextStage = STAGES.find((s) => s.from > n) || null;
  return { n, name: st.name, xp: x, floor, next, pct: next ? Math.round(((x - floor) / (next - floor)) * 100) : 100, nextStage: nextStage && { from: nextStage.from, name: nextStage.name } };
}

// boost(now) = the multiplier in force at that moment (Double XP hour, see doublexp.js); 1 when there is none.
export function initXp({ db, cycles, boost = () => 1 }) {
  db.exec("CREATE TABLE IF NOT EXISTS crash_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, cycle_id INTEGER NOT NULL, kind TEXT NOT NULL, points INTEGER NOT NULL, ts INTEGER NOT NULL)");
  db.exec("CREATE INDEX IF NOT EXISTS crash_activity_cycle ON crash_activity(cycle_id, player)");
  try { db.exec("ALTER TABLE crash_activity ADD COLUMN boost REAL"); } catch {} // the multiplier that was applied, for the record
  // highest XP each player has reached in each cycle (only ever goes up)
  db.exec("CREATE TABLE IF NOT EXISTS crash_xp_peak (player TEXT NOT NULL, cycle_id INTEGER NOT NULL, peak INTEGER NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (player, cycle_id))");
  const q = {
    add: db.prepare("INSERT INTO crash_activity(player,cycle_id,kind,points,ts,boost) VALUES(?,?,?,?,?,?)"),
    byCycle: db.prepare("SELECT player, SUM(points) n FROM crash_activity WHERE cycle_id=? GROUP BY player"),
    peaksOf: db.prepare("SELECT player, peak FROM crash_xp_peak WHERE cycle_id=?"),
    peakUp: db.prepare("INSERT INTO crash_xp_peak(player,cycle_id,peak,ts) VALUES(?,?,?,?) ON CONFLICT(player,cycle_id) DO UPDATE SET peak=excluded.peak, ts=excluded.ts WHERE excluded.peak>peak"),
    levelXps: db.prepare("SELECT player, SUM(peak) n FROM crash_xp_peak GROUP BY player"),
    levelXp: db.prepare("SELECT COALESCE(SUM(peak),0) n FROM crash_xp_peak WHERE player=?"),
  };
  let version = 0;

  // Credit Activity points to the running cycle, multiplied by any boost in force right now. Returns the points added (0 when no cycle is running).
  function addActivity(player, kind, points, now = Date.now()) {
    const c = cycles.current(now), base = Math.round(Number(points)), m = boost(now);
    if (!c || !Number.isFinite(base) || base === 0) return 0;
    const n = Math.round(base * m);
    q.add.run(player, c.id, String(kind).slice(0, 40), n, now, m);
    version++;
    return n;
  }
  // player -> Activity points in one cycle
  function activityMap(cycleId) {
    const m = new Map();
    for (const r of q.byCycle.all(cycleId)) m.set(r.player, r.n);
    return m;
  }

  // Called with the board rows (each has player + xp) every time the live cycle board is rebuilt: raises a player's peak when
  // their XP is a new high. Only rows that beat the stored peak are written.
  let memCycle = null, mem = new Map();
  function recordPeaks(cycleId, rows, now = Date.now()) {
    if (memCycle !== cycleId) { mem = new Map(q.peaksOf.all(cycleId).map((r) => [r.player, r.peak])); memCycle = cycleId; }
    const up = rows.filter((r) => r.xp > 0 && r.xp > (mem.get(r.player) || 0));
    if (!up.length) return;
    db.transaction(() => { for (const r of up) { q.peakUp.run(r.player, cycleId, r.xp, now); mem.set(r.player, r.xp); } })();
  }
  const levelXpMap = () => new Map(q.levelXps.all().map((r) => [r.player, r.n]));
  const levelOf = (player) => levelInfo(q.levelXp.get(player).n);

  return { addActivity, activityMap, recordPeaks, levelXpMap, levelOf, boostAt: boost, version: () => version };
}
