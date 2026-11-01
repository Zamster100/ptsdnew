// Fear & Greed: the game watches how lucky players have been lately and swings the house edge for a short, public window.
//
//   Too many players winning  -> GREED: the house tightens up (edge goes up) for 5-15 minutes.
//   Too many players losing   -> FEAR:  the house pays out more (edge goes down) for 5-15 minutes.
//   Then back to NEUTRAL (normal edge); the next reading starts from scratch.
//
// "Luck" is how far players' results are from what their edge says they should be: sum(pnl + edge * bet) / sum(bet).
// Because it is measured against each round's own edge, a Fear window can't trigger a Greed window by itself.
// One player can't move the needle much: every player gets one equal vote (their luck capped at +-50% of their bets,
// and they need at least 2 rounds), and nothing counts until enough rounds and enough different players are in.
//
// Fairness: the edge a round was dealt with is stored on the round (crash_rounds.edge) and is part of the check the
// browser runs; every window (kind, start, end, edge) is in a public log (/api/sentiment). The regime is fixed at the
// moment of the bet from public state and shown on the Sentiment button first, so nobody is dealt a hidden curve.
//
// Settings (env, all optional):
//   SENTIMENT=0              switch the whole thing off (the edge stays at the normal edge)
//   SENTIMENT_GREED_EDGE     edge during Greed             (default 0.20)
//   SENTIMENT_FEAR_EDGE      edge during Fear              (default -0.10, the house pays out more than it takes)
//   SENTIMENT_MIN_MINUTES    shortest window, minutes      (default 5)
//   SENTIMENT_MAX_MINUTES    longest window, minutes       (default 15)
//   SENTIMENT_WINDOW_MIN     how far back the reading looks (default 15)
//   SENTIMENT_MIN_ROUNDS     rounds needed for a reading   (default 30)
//   SENTIMENT_MIN_PLAYERS    different players needed      (default 5)
//   SENTIMENT_GREED_AT / SENTIMENT_FEAR_AT   meter levels that start a window (default 75 / 25)
//   SENTIMENT_SPAN           luck that moves the meter from the middle to the end (default 0.25)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function labelOf(idx) {
  return idx >= 75 ? "Greed" : idx >= 55 ? "Heating up" : idx > 45 ? "Neutral" : idx > 25 ? "Uneasy" : "Fear";
}

export function initSentiment({ db, coin = "CREDITS", baseEdge = 0.05 }) {
  const cfg = {
    on: process.env.SENTIMENT !== "0",
    greedEdge: clamp(num(process.env.SENTIMENT_GREED_EDGE, 0.2), 0, 0.6),
    fearEdge: clamp(num(process.env.SENTIMENT_FEAR_EDGE, -0.1), -0.5, 0.6),
    minMinutes: Math.max(1, num(process.env.SENTIMENT_MIN_MINUTES, 5)),
    maxMinutes: Math.max(1, num(process.env.SENTIMENT_MAX_MINUTES, 15)),
    windowMin: Math.max(1, num(process.env.SENTIMENT_WINDOW_MIN, 15)),
    minRounds: Math.max(1, num(process.env.SENTIMENT_MIN_ROUNDS, 30)),
    minPlayers: Math.max(1, num(process.env.SENTIMENT_MIN_PLAYERS, 5)),
    greedAt: num(process.env.SENTIMENT_GREED_AT, 75),
    fearAt: num(process.env.SENTIMENT_FEAR_AT, 25),
    span: Math.max(0.01, num(process.env.SENTIMENT_SPAN, 0.25)),
    playerClamp: 0.5, // one player's luck counts as at most +-50% of their bets
  };
  if (cfg.maxMinutes < cfg.minMinutes) cfg.maxMinutes = cfg.minMinutes;

  db.exec("CREATE TABLE IF NOT EXISTS crash_sentiment (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL, edge REAL NOT NULL, idx REAL, forced INTEGER NOT NULL DEFAULT 0)");
  const q = {
    sample: db.prepare("SELECT player, SUM(pnl + COALESCE(edge, ?) * bet) l, SUM(bet) b, COUNT(*) n FROM crash_rounds WHERE ts >= ? AND state != 'open' AND coin = ? GROUP BY player"),
    ins: db.prepare("INSERT INTO crash_sentiment(kind,start_ms,end_ms,edge,idx,forced) VALUES(?,?,?,?,?,?)"),
    end: db.prepare("UPDATE crash_sentiment SET end_ms = ? WHERE id = ?"),
    recent: db.prepare("SELECT id, kind, start_ms start, end_ms end, edge, forced FROM crash_sentiment ORDER BY id DESC LIMIT ?"),
  };

  let cur = null;       // the window in force: { id, kind, start, end, edge, idx }
  let since = 0;        // rounds before this don't count (the last window ended here)
  let read = { idx: 50, rounds: 0, players: 0, ready: false };
  let logCache = null;  // the public log, rebuilt only when a window opens or closes
  const log = () => (logCache ||= q.recent.all(12));
  const last = q.recent.all(1)[0];
  if (last) { since = last.end; if (last.end > Date.now()) cur = { ...last, idx: null }; }

  // How lucky have players been since the last window? Returns the meter reading (0 = fear, 100 = greed).
  function measure(now) {
    const rows = q.sample.all(baseEdge, Math.max(now - cfg.windowMin * 60_000, since), coin).filter((r) => r.b > 0 && r.n >= 2);
    const out = { idx: 50, rounds: 0, players: rows.length, ready: false, luck: 0 };
    out.rounds = rows.reduce((s, r) => s + r.n, 0);
    if (!rows.length || out.rounds < cfg.minRounds || rows.length < cfg.minPlayers) return out;
    // one vote per player, however much they bet
    out.luck = rows.reduce((s, r) => s + clamp(r.l / r.b, -cfg.playerClamp, cfg.playerClamp), 0) / rows.length;
    out.idx = clamp(50 + 50 * (out.luck / cfg.span), 0, 100);
    out.ready = true;
    return out;
  }

  const live = (now) => (cfg.on && cur && now >= cur.start && now < cur.end ? cur : null);
  const edgeNow = (now = Date.now()) => (live(now) ? live(now).edge : baseEdge);
  const kindNow = (now = Date.now()) => (live(now) ? live(now).kind : "neutral");
  // What a stored edge means (for labelling old rounds).
  const kindOfEdge = (e) => (e == null || Math.abs(e - baseEdge) < 1e-9 ? "neutral" : e > baseEdge ? "greed" : "fear");

  function start(kind, now, minutes, idx, forced = 0) {
    const mins = minutes ?? cfg.minMinutes + Math.random() * (cfg.maxMinutes - cfg.minMinutes);
    const w = { kind, start: now, end: now + Math.round(mins * 60) * 1000, edge: kind === "greed" ? cfg.greedEdge : cfg.fearEdge, idx };
    w.id = q.ins.run(kind, w.start, w.end, w.edge, idx ?? null, forced).lastInsertRowid;
    cur = w; logCache = null;
    return w;
  }
  // Called every few seconds. Closes a window that ran out; opens one when the reading says so.
  function tick(now = Date.now()) {
    if (!cfg.on) return;
    if (cur && now >= cur.end) { since = cur.end; cur = null; read = { idx: 50, rounds: 0, players: 0, ready: false }; }
    if (cur) return;
    read = measure(now);
    if (!read.ready) return;
    if (read.idx >= cfg.greedAt) start("greed", now, null, read.idx);
    else if (read.idx <= cfg.fearAt) start("fear", now, null, read.idx);
  }
  // Admin: open a window now, or end the current one.
  function force(kind, minutes, now = Date.now()) {
    if (cur && now < cur.end) { q.end.run(now, cur.id); cur.end = now; logCache = null; }
    since = now; read = { idx: 50, rounds: 0, players: 0, ready: false };
    if (kind === "greed" || kind === "fear") return start(kind, now, clamp(num(minutes, 10), 0.5, 60), kind === "greed" ? 90 : 10, 1);
    cur = null;
    return null;
  }

  // Everything the browser needs for the button, the meter and the log.
  function view(now = Date.now()) {
    const w = live(now);
    const idx = Math.round(w ? (w.idx ?? (w.kind === "greed" ? 90 : 10)) : read.idx);
    return {
      on: cfg.on, kind: w ? w.kind : "neutral", label: labelOf(idx), index: idx,
      building: !w && !read.ready,
      // history only: just when each mood was live. The window in force has no end time.
      log: log().map((r) => ({ kind: r.kind, start: r.start, end: r.end > now ? null : r.end })),
    };
  }
  return { cfg, edgeNow, kindNow, kindOfEdge, tick, force, view, measure };
}
