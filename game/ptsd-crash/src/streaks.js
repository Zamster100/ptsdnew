// Streaks: small XP bonuses for playing well and for coming back. All of them are Activity points (see xp.js): they add to
// the player's XP, never to their PNL, and never change a payout or the odds.
//
//   Win streak       each win that extends a streak of 2+ wins in a row pays WIN_STEP x (streak length, capped at WIN_CAP).
//                    A win is a round that finished in profit (same rule as the stats panel). A loss resets it to 0.
//   Perfect sell     a full sell within PERFECT_PCT % of the crash point (and at PERFECT_MIN_X or more) pays PERFECT_XP.
//   Login streak     the first time a signed-in player opens the game on each task day (rolls over at 9 AM Eastern, same as the
//                    daily tasks) pays LOGIN_STEP x (days in a row, capped at LOGIN_CAP). A missed day starts it again at 1.
//
// Bonuses are only paid while a cycle is running. The streaks themselves keep counting.
//
// Settings (env, all optional):
//   STREAK_WIN_STEP 50   STREAK_WIN_CAP 10   PERFECT_PCT 5   PERFECT_XP 500   PERFECT_MIN_X 1.5   LOGIN_STEP 100   LOGIN_CAP 7
//   ROUND_BONUS_DAILY_CAP 1500   most win-streak + perfect-sell XP one player can earn per task day (0 = no limit)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export function initStreaks({ db, xp, dayKey }) {
  const cfg = {
    winStep: num(process.env.STREAK_WIN_STEP, 50), winCap: num(process.env.STREAK_WIN_CAP, 10),
    perfectPct: num(process.env.PERFECT_PCT, 5), perfectXp: num(process.env.PERFECT_XP, 500), perfectMinX: num(process.env.PERFECT_MIN_X, 1.5),
    loginStep: num(process.env.LOGIN_STEP, 100), loginCap: num(process.env.LOGIN_CAP, 7),
    dailyCap: num(process.env.ROUND_BONUS_DAILY_CAP, 1500),
  };
  db.exec("CREATE TABLE IF NOT EXISTS crash_bonus_day (player TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (player, day))");
  db.exec(`CREATE TABLE IF NOT EXISTS crash_streaks (player TEXT PRIMARY KEY, win_streak INTEGER NOT NULL DEFAULT 0, best_win INTEGER NOT NULL DEFAULT 0,
    login_day TEXT, login_streak INTEGER NOT NULL DEFAULT 0, best_login INTEGER NOT NULL DEFAULT 0)`);
  const q = {
    get: db.prepare("SELECT * FROM crash_streaks WHERE player=?"),
    insert: db.prepare("INSERT OR IGNORE INTO crash_streaks(player, win_streak, best_win) VALUES(?,?,?)"),
    setWin: db.prepare("UPDATE crash_streaks SET win_streak=?, best_win=? WHERE player=?"),
    setLogin: db.prepare("UPDATE crash_streaks SET login_day=?, login_streak=?, best_login=? WHERE player=?"),
    usedGet: db.prepare("SELECT n FROM crash_bonus_day WHERE player=? AND day=?"),
    usedAdd: db.prepare("INSERT INTO crash_bonus_day(player,day,n) VALUES(?,?,?) ON CONFLICT(player,day) DO UPDATE SET n=n+excluded.n"),
    history: db.prepare("SELECT pnl FROM crash_rounds WHERE player=? AND state!='open' AND id!=? ORDER BY ts"),
  };

  // The first time we see a player, start their win streak from the rounds they already played (same rule as the stats panel).
  function ensure(player, exceptRound = "") {
    let s = q.get.get(player);
    if (s) return s;
    let run = 0, best = 0;
    for (const { pnl } of q.history.iterate(player, exceptRound)) { if (pnl > 0) { run++; best = Math.max(best, run); } else run = 0; }
    q.insert.run(player, run, best);
    return q.get.get(player);
  }

  // Call once for every round that settles (inside the same transaction as the settlement). Returns what was paid.
  function onSettled(round, now = Date.now()) {
    const s = ensure(round.player, round.id);
    const win = round.pnl > 0, streak = win ? s.win_streak + 1 : 0;
    q.setWin.run(streak, Math.max(s.best_win, streak), round.player);
    // win-streak + perfect-sell share one daily limit (counted before any Double XP boost)
    const day = dayKey(now);
    let room = cfg.dailyCap > 0 ? Math.max(0, cfg.dailyCap - ((q.usedGet.get(round.player, day) || {}).n || 0)) : Infinity;
    const pay = (kind, base) => { const b = Math.min(base, room); if (b <= 0) return 0; room -= b; if (cfg.dailyCap > 0) q.usedAdd.run(round.player, day, b); return xp.addActivity(round.player, kind, b, now); };
    const streakXp = win && streak >= 2 ? pay("win-streak", cfg.winStep * Math.min(streak, cfg.winCap)) : 0;
    const perfect = round.state === "sold" && round.sold_mult >= cfg.perfectMinX && round.sold_mult >= round.crash * (1 - cfg.perfectPct / 100);
    const perfectXp = perfect ? pay("perfect-sell", cfg.perfectXp) : 0;
    return { streak, streakXp, perfectXp, perfect, boost: xp.boostAt(now), capped: room <= 0 && cfg.dailyCap > 0 };
  }

  const prevDay = (day) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const doneToday = new Map(); // player -> task day already checked in (skips the DB read on every request)
  // Call when a signed-in player opens the game while a cycle runs. isNew = this call started a new day.
  function checkIn(player, now = Date.now()) {
    const today = dayKey(now);
    if (doneToday.get(player) === today) return { isNew: false, xp: 0 };
    const s = ensure(player);
    doneToday.set(player, today);
    if (s.login_day === today) return { isNew: false, xp: 0 };
    const streak = s.login_day === prevDay(today) ? s.login_streak + 1 : 1;
    q.setLogin.run(today, streak, Math.max(s.best_login, streak), player);
    const paid = xp.addActivity(player, "login-streak", cfg.loginStep * Math.min(streak, cfg.loginCap), now);
    return { isNew: true, xp: paid, streak, boost: xp.boostAt(now) };
  }

  // What the player's own screen shows: the current streaks and what the next step pays.
  function stateOf(player, now = Date.now()) {
    const s = q.get.get(player) || { win_streak: 0, best_win: 0, login_day: null, login_streak: 0, best_login: 0 };
    const today = dayKey(now), live = s.login_day === today || s.login_day === prevDay(today);
    return {
      win: s.win_streak, bestWin: s.best_win,
      login: live ? s.login_streak : 0, bestLogin: s.best_login, loginToday: s.login_day === today,
      nextWin: s.win_streak + 1 >= 2 ? cfg.winStep * Math.min(s.win_streak + 1, cfg.winCap) : 0,
      nextLogin: cfg.loginStep * Math.min(live ? s.login_streak + 1 : 1, cfg.loginCap),
      perfect: { pct: cfg.perfectPct, minX: cfg.perfectMinX, xp: cfg.perfectXp },
    };
  }

  return { cfg, onSettled, checkIn, stateOf };
}
