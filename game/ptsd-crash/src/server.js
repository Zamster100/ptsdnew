// PTSD Crash engine. One player vs the house, one round at a time per player.
// TEST MODE (CRASH_TEST=1): fake balances, own DB, no real money.
// Settings all come from environment variables (see README.md).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { buildPath, paidMult, timeForMult, crashFromR, MAX_MULT, EDGE, CAP_HOLD_MS } from "../public/path.js";
import { renderCard, cardFile } from "./card.js";
import { initAuth } from "./auth.js";
import { initChat } from "./chat.js";
import { initCampaign } from "./campaign.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT || 3512);
const BASE = (process.env.CRASH_BASE ?? "").replace(/\/+$/, ""); // e.g. "/crash", "" = site root
const TEST = process.env.CRASH_TEST === "1";
const DB_PATH = process.env.DB_PATH || path.join(ROOT, "data/crash.db");
const TEST_START = Number(process.env.TEST_START || 1_000_000);
// Credits come from claims (starter pack + one every CLAIM_HOURS), see campaign.js.
const CLAIMS = process.env.CLAIMS === "1";
// Full public address of the game, no trailing slash (e.g. https://ptsdshow.com/crash).
// Shared wins live at <PUBLIC_URL>/win/<id>: a preview card for X/Telegram,
// and anyone who clicks it lands on the game.
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}${BASE}`).replace(/\/+$/, "");
const PLAY_URL = PUBLIC_URL + "/";
const LOG_DIR = process.env.LOG_DIR || path.join(ROOT, "data/logs");
fs.mkdirSync(LOG_DIR, { recursive: true });
// A sell counts at the moment the player tapped, not when it reached us, as long as
// the tap is at most this old. Rounds stay open this long past the crash so a tap
// that was in time still gets paid. The crash is only revealed after that, so a
// late tap can never be timed off the crash.
const GRACE_MS = 200; // was 500: long enough that the chart kept pumping ~0.6s past a crash and taps there felt like bugs

// One currency, set by CURRENCY / MIN_BET / MAX_BET.
const CURRENCY = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "CREDITS";
export const COINS = { [CURRENCY]: { min: Number(process.env.MIN_BET || 1000), max: Number(process.env.MAX_BET || 10000) } };

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS crash_balances (player TEXT, coin TEXT, balance INTEGER NOT NULL, PRIMARY KEY (player, coin));
CREATE TABLE IF NOT EXISTS crash_rounds (
  id TEXT PRIMARY KEY, player TEXT NOT NULL, coin TEXT NOT NULL, bet INTEGER NOT NULL,
  server_seed TEXT NOT NULL, commit_hash TEXT NOT NULL, client_seed TEXT NOT NULL, nonce INTEGER NOT NULL,
  noise_seed TEXT NOT NULL, crash REAL NOT NULL, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL,
  state TEXT NOT NULL, sold_mult REAL, payout INTEGER, pnl INTEGER, sold_ms INTEGER, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS crash_rounds_player ON crash_rounds(player, ts);
`);
db.exec("CREATE TABLE IF NOT EXISTS crash_seeds (player TEXT PRIMARY KEY, server_seed TEXT NOT NULL, commit_hash TEXT NOT NULL)");
db.exec("CREATE TABLE IF NOT EXISTS crash_shares (id TEXT PRIMARY KEY, round_id TEXT NOT NULL UNIQUE, sym TEXT NOT NULL, color TEXT NOT NULL, ts INTEGER NOT NULL)");
// edge: house edge the round was dealt with (null = old 10% rounds).
// fair: 2 = server seed was locked (and shown) before the bet, noise comes from it too.
// curve: 2 = current odds (up to 100x, smooth top end), null/1 = old (capped at 50x).
for (const col of ["half_mult REAL", "half_payout INTEGER", "half_ms INTEGER", "edge REAL", "fair INTEGER", "curve INTEGER"]) {
  try { db.exec(`ALTER TABLE crash_rounds ADD COLUMN ${col}`); } catch {}
}

const q = {
  bal: db.prepare("SELECT balance FROM crash_balances WHERE player=? AND coin=?"),
  setBal: db.prepare("INSERT INTO crash_balances(player,coin,balance) VALUES(?,?,?) ON CONFLICT(player,coin) DO UPDATE SET balance=excluded.balance"),
  addBal: db.prepare("UPDATE crash_balances SET balance=balance+? WHERE player=? AND coin=?"),
  open: db.prepare("SELECT * FROM crash_rounds WHERE player=? AND state='open'"),
  allOpen: db.prepare("SELECT * FROM crash_rounds WHERE state='open'"),
  round: db.prepare("SELECT * FROM crash_rounds WHERE id=?"),
  nonce: db.prepare("SELECT COUNT(*) n FROM crash_rounds WHERE player=?"),
  insert: db.prepare(`INSERT INTO crash_rounds(id,player,coin,bet,server_seed,commit_hash,client_seed,nonce,noise_seed,crash,start_ms,end_ms,state,ts,edge,fair)
    VALUES(@id,@player,@coin,@bet,@server_seed,@commit_hash,@client_seed,@nonce,@noise_seed,@crash,@start_ms,@end_ms,'open',@ts,@edge,2)`),
  setCurve: db.prepare("UPDATE crash_rounds SET curve=? WHERE id=?"),
  seed: db.prepare("SELECT server_seed, commit_hash FROM crash_seeds WHERE player=?"),
  setSeed: db.prepare("INSERT INTO crash_seeds(player,server_seed,commit_hash) VALUES(?,?,?) ON CONFLICT(player) DO UPDATE SET server_seed=excluded.server_seed, commit_hash=excluded.commit_hash"),
  stats: db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(pnl>0),0) wins, COALESCE(SUM(state='rekt'),0) rekt, COALESCE(SUM(bet),0) wagered, COALESCE(SUM(pnl),0) net,
    MAX(pnl) bestWin, MAX(MAX(COALESCE(sold_mult,0), COALESCE(half_mult,0))) bestMult FROM crash_rounds WHERE player=? AND coin=? AND state!='open'`),
  streak: db.prepare("SELECT pnl FROM crash_rounds WHERE player=? AND coin=? AND state!='open' ORDER BY ts"),
  // Leaderboard: ranked by profit (PnL) over the period, one row per player.
  board: db.prepare(`SELECT player, SUM(pnl) net, COUNT(*) rounds, SUM(bet) wagered, SUM(pnl>0) wins,
    MAX(MAX(COALESCE(sold_mult,0), COALESCE(half_mult,0))) best, MAX(pnl) bestWin
    FROM crash_rounds WHERE state!='open' AND coin=? AND ts>=? AND ts<? GROUP BY player ORDER BY net DESC, wagered DESC LIMIT 20000`),
  settle: db.prepare("UPDATE crash_rounds SET state=@state, sold_mult=@sold_mult, payout=@payout, pnl=@pnl, sold_ms=@sold_ms WHERE id=@id AND state='open'"),
  half: db.prepare("UPDATE crash_rounds SET half_mult=?, half_payout=?, half_ms=? WHERE id=? AND state='open' AND half_ms IS NULL"),
  recent: db.prepare("SELECT id,coin,bet,crash,noise_seed,state,sold_mult,payout,pnl,ts,half_mult,half_payout FROM crash_rounds WHERE player=? AND state!='open' ORDER BY ts DESC LIMIT 25"),
};

// Crash point from the locked seeds. The odds curve lives in path.js (crashFromR),
// shared with the browser so every player can re-check any round.
export function crashPoint(serverSeed, clientSeed, nonce, edge = EDGE) {
  const h = crypto.createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
  const r = parseInt(h.slice(0, 13), 16) / 2 ** 52; // [0,1)
  return crashFromR(r, edge, 3);
}
// The cap a round was dealt with (old rounds stopped at 50x).
const capOf = (row) => (row.curve >= 2 ? MAX_MULT : 50);
// The chart's dips come from the same locked seed, so the server can't pick them
// after seeing the bet either. Shown at the start; it says nothing about the crash.
export function noiseSeed(serverSeed, clientSeed, nonce) {
  return crypto.createHmac("sha256", serverSeed).update(`noise:${clientSeed}:${nonce}`).digest("hex").slice(0, 32);
}

// Each player always has their next server seed locked in, and sees its hash
// before they bet. A new one is locked as soon as it gets used.
function nextSeed(player) {
  const r = q.seed.get(player);
  if (r) return r;
  return rotateSeed(player);
}
function rotateSeed(player) {
  const server_seed = crypto.randomBytes(32).toString("hex");
  const commit_hash = crypto.createHash("sha256").update(server_seed).digest("hex");
  q.setSeed.run(player, server_seed, commit_hash);
  return { server_seed, commit_hash };
}

const paths = new Map(); // round id -> built path
function pathOf(row) {
  let p = paths.get(row.id);
  if (!p) { p = buildPath(row.noise_seed); paths.set(row.id, p); }
  return p;
}

// ---------- WALLET ----------
// Balances live in crash_balances. To use your own wallet/ledger, replace
// balanceOf + the q.addBal calls in buy/sell/finishOverdue (all inside DB
// transactions) with calls to your system.
function balanceOf(player, coin) {
  const r = q.bal.get(player, coin);
  if (r) return r.balance;
  if (TEST && !CLAIMS) { q.setBal.run(player, coin, TEST_START); return TEST_START; }
  return 0;
}

// After "Sell 50%" only the other half is still riding.
const halfStake = (row) => Math.floor(row.bet / 2);
const riding = (row) => row.bet - (row.half_ms ? halfStake(row) : 0);

// Close a round whose time ran out: it's rekt. (Only old curve-1 rounds that hit
// their 50x cap were auto-sold at the max.)
// Payout/pnl cover the whole round (half sale included); the half sale was
// already credited when it happened, so only the new part is added here.
const finishOverdue = db.transaction((row) => {
  const cap = capOf(row), capped = (row.curve || 1) < 2 && row.crash >= cap;
  const fresh = capped ? Math.floor(riding(row) * cap) : 0;
  const payout = (row.half_payout || 0) + fresh;
  const ch = q.settle.run({ id: row.id, state: capped ? "max" : "rekt", sold_mult: capped ? cap : null, payout, pnl: payout - row.bet, sold_ms: capped ? row.end_ms : null });
  if (ch.changes && fresh) q.addBal.run(fresh, row.player, row.coin);
});

const waiters = new Map(); // round id -> [res]
const timers = new Map();
const overdue = (row, at = Date.now()) => at >= row.end_ms + GRACE_MS;
function schedule(row) {
  const ms = Math.max(0, row.end_ms + GRACE_MS - Date.now());
  timers.set(row.id, setTimeout(() => endRound(row.id), ms));
}
function endRound(id) {
  timers.delete(id);
  const row = q.round.get(id);
  if (row && row.state === "open") finishOverdue(row);
  const done = q.round.get(id);
  for (const res of waiters.get(id) || []) send(res, 200, reveal(done));
  waiters.delete(id);
  setTimeout(() => paths.delete(id), 60_000);
}

// The price on the chart right before the crash (the trend top minus any dip).
function crashShown(row) {
  if (row.crash >= capOf(row)) return capOf(row);
  return Math.max(1, Math.min(row.crash, paidMult(buildPath(row.noise_seed), timeForMult(row.crash) - 0.02)));
}
function histRow(row) {
  return { id: row.id, coin: row.coin, bet: row.bet, crash: crashShown(row), state: row.state, soldMult: row.sold_mult, halfMult: row.half_mult, halfPayout: row.half_payout, payout: row.payout, pnl: row.pnl, ts: row.ts };
}
function reveal(row) {
  if (row.state === "open") return { id: row.id, state: "open" };
  return {
    id: row.id, state: row.state, crash: row.crash, crashShown: crashShown(row), endAt: row.end_ms,
    soldMult: row.sold_mult, halfMult: row.half_mult, halfPayout: row.half_payout, payout: row.payout, pnl: row.pnl,
    serverSeed: row.server_seed, clientSeed: row.client_seed, nonce: row.nonce, commit: row.commit_hash,
  };
}
function publicRound(row) {
  return { id: row.id, coin: row.coin, bet: row.bet, startAt: row.start_ms, noiseSeed: row.noise_seed, commit: row.commit_hash, state: row.state, halfMult: row.half_mult, halfPayout: row.half_payout, halfAt: row.half_ms };
}

const buy = db.transaction((player, coin, amount, clientSeed, commit) => {
  if (q.open.get(player)) return { error: "You already have a position open." };
  const bal = balanceOf(player, coin);
  if (amount > bal) return { error: "Not enough balance." };
  const seed = nextSeed(player);
  // The player bets against the seed hash they were shown. If it moved on (another
  // tab bet first), refuse and hand them the current one.
  if (commit && commit !== seed.commit_hash) return { error: "New round seed, tap Buy again.", code: 409, nextCommit: seed.commit_hash };
  const serverSeed = seed.server_seed;
  const nonce = q.nonce.get(player).n;
  const crash = crashPoint(serverSeed, clientSeed, nonce);
  const start = Date.now() + 250;
  const row = {
    id: crypto.randomBytes(9).toString("base64url"), player, coin, bet: amount,
    server_seed: serverSeed, commit_hash: seed.commit_hash,
    client_seed: clientSeed, nonce, noise_seed: noiseSeed(serverSeed, clientSeed, nonce), crash,
    start_ms: start, end_ms: start + Math.round(timeForMult(crash) * 1000) + (crash >= MAX_MULT ? CAP_HOLD_MS : 0), ts: Date.now(), edge: EDGE,
  };
  q.addBal.run(-amount, player, coin);
  q.insert.run(row);
  q.setCurve.run(3, row.id);
  row.curve = 3;
  return { row, nextCommit: rotateSeed(player).commit_hash };
});

// `at` = when the player tapped (server clock, as the browser estimates it).
// It is trusted only within GRACE_MS of arrival and never before an earlier half sale.
const sell = db.transaction((player, id, half, at) => {
  const row = q.round.get(id);
  if (!row || row.player !== player) return { error: "No such round." };
  if (row.state !== "open") return { done: row };
  const arrived = Date.now();
  if (overdue(row, arrived)) { finishOverdue(row); return { done: q.round.get(id), late: arrived - row.end_ms, arrived }; }
  let now = Number.isFinite(at) ? Math.round(at) : arrived;
  now = Math.min(arrived, Math.max(now, arrived - GRACE_MS, row.start_ms, row.half_ms || 0));
  if (now >= row.end_ms) { finishOverdue(row); return { done: q.round.get(id), late: now - row.end_ms, arrived, claim: now }; }
  const t = Math.max(0, (now - row.start_ms) / 1000);
  const mult = Math.min(paidMult(pathOf(row), t), row.crash);
  if (half) {
    if (row.half_ms) return { error: "You already sold half." };
    const got = Math.floor(halfStake(row) * mult);
    q.half.run(mult, got, now, id);
    q.addBal.run(got, player, row.coin);
    return { done: q.round.get(id), half: true, arrived, claim: now };
  }
  const fresh = Math.floor(riding(row) * mult);
  const payout = (row.half_payout || 0) + fresh;
  q.settle.run({ id, state: "sold", sold_mult: mult, payout, pnl: payout - row.bet, sold_ms: now });
  q.addBal.run(fresh, player, row.coin);
  return { done: q.round.get(id), now, arrived, claim: now };
});

// Every sell tap, so "I pressed and got rekt" can be checked to the millisecond.
// Times are ms from the round start; end = when it crashed.
const SELL_LOG = path.join(LOG_DIR, "ptsd-sells.jsonl");
function logSell(player, r, body, out) {
  try {
    if (fs.existsSync(SELL_LOG) && fs.statSync(SELL_LOG).size > 5_000_000) return;
    const rel = (x) => (x == null ? null : x - r.start_ms);
    fs.appendFileSync(SELL_LOG, JSON.stringify({
      ts: new Date().toISOString(), player, round: r.id, part: body.part === "half" ? "half" : "all",
      tap: rel(Number.isFinite(Number(body.at)) ? Math.round(Number(body.at)) : null), arrived: rel(out.arrived), counted: rel(out.claim),
      end: r.end_ms - r.start_ms, result: r.state, mult: out.half ? r.half_mult : r.sold_mult, lateMs: out.late ?? null,
    }) + "\n");
  } catch {}
}

// ---------- shared win links ----------
const shareQ = {
  byRound: db.prepare("SELECT id FROM crash_shares WHERE round_id=?"),
  get: db.prepare("SELECT r.*, s.id AS id, s.sym, s.color FROM crash_shares s JOIN crash_rounds r ON r.id = s.round_id WHERE s.id=?"),
  add: db.prepare("INSERT INTO crash_shares(id,round_id,sym,color,ts) VALUES(?,?,?,?,?)"),
};
function winOf(row) {
  const max = row.state === "max";
  const mult = max ? capOf(row) : row.sold_mult;
  const soldT = ((max ? row.end_ms : row.sold_ms) - row.start_ms) / 1000;
  return { mult, pnl: row.pnl, coin: row.coin, state: row.state, noiseSeed: row.noise_seed, soldT };
}
const BOTS = /twitterbot|telegrambot|facebookexternalhit|facebot|discordbot|whatsapp|slackbot|linkedinbot|skypeuripreview|redditbot|applebot|embedly|bingpreview|googlebot|pinterest/i;
async function serveWin(req, res, rest) {
  const m = /^([A-Za-z0-9_-]{6,16})(\.png)?$/.exec(rest);
  const row = m && shareQ.get.get(m[1]);
  if (!row) { res.writeHead(302, { location: PLAY_URL }); return res.end(); }
  if (m[2]) {
    const file = cardFile(ROOT, row.id);
    if (!fs.existsSync(file)) fs.writeFileSync(file, await renderCard(ROOT, { ...winOf(row), sym: row.sym, color: row.color }));
    res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" });
    return fs.createReadStream(file).pipe(res);
  }
  // People go straight to the arcade; link-preview bots get the card.
  if (!BOTS.test(req.headers["user-agent"] || "")) { res.writeHead(302, { location: PLAY_URL, "cache-control": "no-store" }); return res.end(); }
  const w = winOf(row), x = w.mult.toFixed(2) + "x";
  const pnl = (w.pnl >= 0 ? "+" : "-") + Math.abs(w.pnl).toLocaleString("en-US") + " " + w.coin;
  const img = `${PUBLIC_URL}/win/${row.id}.png`, url = `${PUBLIC_URL}/win/${row.id}`;
  const title = `Sold $${row.sym} at ${x} on PTSD Crash`, desc = `${pnl}. Gen wealth awaits.`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta property="og:type" content="website"><meta property="og:site_name" content="PTSD Crash"><meta property="og:url" content="${url}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${desc}"><meta name="twitter:image" content="${img}">
</head><body><a href="${PLAY_URL}">Play PTSD Crash</a></body></html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" });
  res.end(html);
}

// ---------- stats + leaderboard ----------
function statsOf(player, coin) {
  const s = q.stats.get(player, coin);
  let cur = 0, bestStreak = 0, run = 0;
  for (const { pnl } of q.streak.iterate(player, coin)) {
    if (pnl > 0) { run++; bestStreak = Math.max(bestStreak, run); cur = cur > 0 ? cur + 1 : 1; }
    else { run = 0; cur = cur < 0 ? cur - 1 : -1; }
  }
  return { rounds: s.n, wins: s.wins, rekt: s.rekt, wagered: s.wagered, net: s.net, bestWin: s.n ? Math.max(0, s.bestWin) : 0, bestMult: s.bestMult || 0, bestStreak, streak: cur };
}
function periodStart(period) {
  const d = new Date();
  if (period === "day") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (period === "week") { const day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); }
  if (period === "all") return 0;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
// Ranked by profit (PnL) over the period. Names + pictures come from sign-in.
function leaderboard(period, player, limit = 50) {
  const camp = campaign.campaign();
  period = ["day", "week", "month", "all", "campaign"].includes(period) ? period : camp ? "campaign" : "month";
  if (period === "campaign" && !camp) period = "all";
  // Blocked (bot) accounts are hidden from every board and don't count as players.
  const blocked = auth.blockedIds();
  const all = period === "campaign" ? q.board.all(CURRENCY, camp.start, camp.end) : q.board.all(CURRENCY, periodStart(period), 8.64e15);
  const rows = blocked.size ? all.filter((r) => !blocked.has(r.player)) : all;
  const row = (r, i) => ({ rank: i + 1, ...auth.publicUser(r.player), me: r.player === player, net: r.net, rounds: r.rounds, wins: r.wins, wagered: r.wagered, best: r.best, bestWin: r.bestWin });
  const top = rows.slice(0, limit).map(row);
  const i = player ? rows.findIndex((r) => r.player === player) : -1;
  return { period, coin: CURRENCY, top, mine: i >= 0 ? row(rows[i], i) : null, players: rows.length, campaign: camp };
}

// ---------- http ----------
function send(res, code, obj) {
  if (res.writableEnded) return;
  const body = JSON.stringify(obj);
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(body);
}
async function readJson(req) {
  let s = "";
  for await (const c of req) { s += c; if (s.length > 4096) throw new Error("too big"); }
  return s ? JSON.parse(s) : {};
}

const auth = initAuth({ db, base: BASE, publicUrl: PUBLIC_URL, test: TEST });
const chat = initChat({ db, auth });
const campaign = initCampaign({
  db, currency: CURRENCY,
  addCredits: (player, n) => { balanceOf(player, CURRENCY); q.setBal.run(player, CURRENCY, (q.bal.get(player, CURRENCY)?.balance || 0) + n); },
});

const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
function serveStatic(res, rel) {
  const file = path.join(ROOT, "public", path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(path.join(ROOT, "public"))) return send(res, 404, { error: "not found" });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: "not found" });
    const ext = path.extname(file);
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream", "cache-control": ext === ".html" ? "no-cache" : "public, max-age=300" });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    let p = u.pathname;
    if (p.startsWith("/win/")) return await serveWin(req, res, p.slice(5));
    if (BASE && p === BASE) { res.writeHead(301, { location: BASE + "/" }); return res.end(); }
    if (BASE && p.startsWith(BASE + "/")) p = p.slice(BASE.length);
    if (p.startsWith("/win/")) return await serveWin(req, res, p.slice(5));
    if (p.startsWith("/auth/")) return await auth.route(req, res, p, u);
    if (!p.startsWith("/api/")) {
      if (p === "/leaderboard") return serveStatic(res, "leaderboard.html");
      return serveStatic(res, p === "/" ? "index.html" : p);
    }

    const body = req.method === "POST" ? await readJson(req) : null;
    const user = auth.userOf(req);
    const player = user ? user.id : null;

    if (p === "/api/config") {
      return send(res, 200, { test: TEST && !CLAIMS, coins: COINS, maxMult: MAX_MULT, edge: EDGE, login: auth.mode, support: auth.supportUrl, ...campaign.publicCfg(), serverNow: Date.now() });
    }
    if (p.startsWith("/api/auth/")) return await auth.api(req, res, p, body, send);
    if (p === "/api/leaderboard") {
      const lim = Math.min(500, Math.max(1, Number(u.searchParams.get("limit")) || 50));
      return send(res, 200, leaderboard(u.searchParams.get("period"), player, lim));
    }
    if (p.startsWith("/api/comments")) return chat.api(req, res, p, u, body, user, send);
    if (p === "/api/clientlog" && req.method === "POST") {
      try {
        const f = path.join(LOG_DIR, "ptsd.jsonl");
        const size = fs.existsSync(f) ? fs.statSync(f).size : 0;
        if (size < 5_000_000) fs.appendFileSync(f, JSON.stringify({ ts: new Date().toISOString(), player, ...body }).slice(0, 4000) + "\n");
      } catch {}
      return send(res, 200, { ok: true });
    }
    if (p === "/api/me" && !player) {
      return send(res, 200, { user: null, balances: { [CURRENCY]: 0 }, open: null, recent: [], nextCommit: "", serverNow: Date.now() });
    }
    if (!player) return send(res, 401, { error: "Sign in with X to play.", signIn: true });

    // Flagged as a bot: they can still load the page and see the message, but can't play, claim or chat.
    if (auth.isBlocked(user)) {
      if (p === "/api/me") return send(res, 200, { user: auth.publicUser(player), ...auth.blockedBody(), balances: { [CURRENCY]: 0 }, open: null, recent: [], nextCommit: "", serverNow: Date.now() });
      return send(res, 403, auth.blockedBody());
    }
    if (p === "/api/me") {
      const coins = Object.keys(COINS);
      const open = q.open.get(player);
      if (open && overdue(open)) endRound(open.id);
      const still = q.open.get(player);
      return send(res, 200, {
        user: auth.publicUser(player), onb: campaign.stateOf(player),
        balances: Object.fromEntries(coins.map((c) => [c, balanceOf(player, c)])),
        open: still ? publicRound(still) : null,
        recent: q.recent.all(player).map(histRow), nextCommit: nextSeed(player).commit_hash, serverNow: Date.now(),
      });
    }
    {
      const out = campaign.api(req, res, p, body, user, send, () => balanceOf(player, CURRENCY));
      if (out !== null) return;
    }
    if (p === "/api/buy" && req.method === "POST") {
      if (CLAIMS && !campaign.ready(player)) return send(res, 400, { error: "Finish the first steps to get your credits.", onboard: true });
      const coin = String(body.coin || CURRENCY);
      const lim = COINS[coin];
      if (!lim) return send(res, 400, { error: "Coin not available." });
      const amount = Math.floor(Number(body.amount));
      if (!Number.isFinite(amount) || amount < lim.min || amount > lim.max) return send(res, 400, { error: `Bet between ${lim.min.toLocaleString()} and ${lim.max.toLocaleString()} ${coin}.` });
      const clientSeed = String(body.clientSeed || "").slice(0, 64) || crypto.randomBytes(8).toString("hex");
      const commit = body.commit ? String(body.commit) : "";
      const out = buy(player, coin, amount, clientSeed, commit);
      if (out.error) return send(res, out.code || 400, { error: out.error, nextCommit: out.nextCommit });
      schedule(out.row);
      return send(res, 200, { round: publicRound(out.row), nextCommit: out.nextCommit, balance: balanceOf(player, coin), serverNow: Date.now() });
    }
    if (p === "/api/sell" && req.method === "POST") {
      const out = sell(player, String(body.id || ""), body.part === "half", body.at == null ? NaN : Number(body.at));
      if (out.error) return send(res, 400, { error: out.error });
      const r = out.done;
      logSell(player, r, body, out);
      return send(res, 200, { state: r.state, half: !!out.half, lateMs: out.late ?? null, halfMult: r.half_mult, halfPayout: r.half_payout, halfAt: r.half_ms, soldMult: r.sold_mult, payout: r.payout, pnl: r.pnl, soldAt: r.sold_ms, balance: balanceOf(player, r.coin), serverNow: Date.now() });
    }
    if (p === "/api/wait") {
      const row = q.round.get(String(u.searchParams.get("id") || ""));
      if (!row || row.player !== player) return send(res, 404, { error: "No such round." });
      if (overdue(row)) { if (q.round.get(row.id).state === "open") endRound(row.id); return send(res, 200, reveal(q.round.get(row.id))); }
      const list = waiters.get(row.id) || [];
      list.push(res); waiters.set(row.id, list);
      const t = setTimeout(() => send(res, 200, { pending: true }), 25_000);
      res.on("close", () => clearTimeout(t));
      return;
    }
    // Everything needed to check a finished round by hand.
    if (p === "/api/round") {
      const row = q.round.get(String(u.searchParams.get("id") || ""));
      if (!row || row.player !== player) return send(res, 404, { error: "No such round." });
      if (row.state === "open") return send(res, 400, { error: "Round still running." });
      return send(res, 200, { ...reveal(row), coin: row.coin, bet: row.bet, ts: row.ts, noiseSeed: row.noise_seed, edge: row.edge ?? 0.1, fair: row.fair || 1, curve: row.curve || 1, maxMult: capOf(row) });
    }
    // A link to show off a win. Only real sold rounds of this player.
    if (p === "/api/share" && req.method === "POST") {
      const row = q.round.get(String(body.id || ""));
      if (!row || row.player !== player || (row.state !== "sold" && row.state !== "max")) return send(res, 400, { error: "Only wins can be shared." });
      let id = shareQ.byRound.get(row.id)?.id;
      if (!id) {
        const sym = /^[A-Za-z0-9]{1,12}$/.test(String(body.sym || "")) ? String(body.sym) : "PTSD";
        const color = /^#[0-9A-Fa-f]{6}$/.test(String(body.color || "")) ? String(body.color) : "#F05150";
        id = crypto.randomBytes(6).toString("base64url");
        shareQ.add.run(id, row.id, sym, color, Date.now());
      }
      return send(res, 200, { url: `${PUBLIC_URL}/win/${id}` });
    }
    if (p === "/api/stats") {
      const coin = String(u.searchParams.get("coin") || CURRENCY);
      if (!COINS[coin]) return send(res, 400, { error: "Coin not available." });
      return send(res, 200, statsOf(player, coin));
    }
    if (TEST && !CLAIMS && p === "/api/refill" && req.method === "POST") {
      q.setBal.run(player, CURRENCY, TEST_START);
      return send(res, 200, { balance: TEST_START });
    }
    return send(res, 404, { error: "not found" });
  } catch (e) {
    console.error("[req]", e);
    send(res, 500, { error: "Server error, try again." });
  }
});

// Boot: settle anything that ended while we were down, re-arm the rest.
for (const row of q.allOpen.all()) {
  if (overdue(row)) finishOverdue(row); else schedule(row);
}
const HOST = process.env.HOST || "127.0.0.1";
server.listen(PORT, HOST, () => console.log(`[ptsd-crash] ${HOST}:${PORT} base ${BASE || "/"} test=${TEST} login=${auth.mode}`));
