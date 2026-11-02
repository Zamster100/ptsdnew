// DEV ONLY: builds a separate demo database with 10 fictional players so XP, levels, badges, Tickets, referrals and
// task points can be seen on the leaderboard and profiles. Never touches data/crash.db.
//   .\run-xp-demo.ps1        (does everything: seeds, then starts the server)
//
// It starts the real server once on a spare port so the database gets the exact tables the game uses, stops it,
// then writes the fake players straight into the tables. Sign in on the demo page with a character's name
// (any case) to play as them.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { xpOf, levelInfo } from "../src/xp.js";
import { multOf } from "../src/wallet.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbPath = path.resolve(process.env.DB_PATH || path.join(ROOT, "data/xp-demo.db"));
if (path.basename(dbPath).toLowerCase() === "crash.db") { console.error("Refusing to seed data/crash.db."); process.exit(1); }
const cycles = JSON.parse(process.env.CYCLES || "null");
if (!cycles || !cycles.length) { console.error("Set CYCLES (run-xp-demo.ps1 does this)."); process.exit(1); }
const C = cycles[0], cStart = Date.parse(C.start), cEnd = Date.parse(C.end), now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- the cast: parts of the XP, Tickets held, how many referrals, and the biggest multiplier they hit ----
// peak = XP they had in an earlier cycle (so the level is higher than today's XP would give, like a returning player)
const CAST = [
  { name: "GenWealthGwen",   pnl: 120000, tasks: 40000, refs: 4, act: 6000, tix: 10, best: 38.4 },
  { name: "RugSurvivorRay",  pnl: 80000,  tasks: 30000, refs: 3, act: 4000, tix: 5,  best: 21.7 },
  { name: "DegenDana",       pnl: 60000,  tasks: 20000, refs: 2, act: 2500, tix: 3,  best: 15.2 },
  { name: "ChartCharlie",    pnl: 35000,  tasks: 15000, refs: 1, act: 1500, tix: 2,  best: 9.8 },
  { name: "WhaleWanda",      pnl: -3000,  tasks: 18000, refs: 4, act: 2000, tix: 10, best: 6.1 },
  { name: "DiamondDiego",    pnl: 18000,  tasks: 8000,  refs: 0, act: 800,  tix: 1,  best: 7.3 },
  { name: "PaperPenny",      pnl: 6000,   tasks: 4000,  refs: 1, act: 300,  tix: 0,  best: 4.4 },
  { name: "RektRonnie",      pnl: -9000,  tasks: 3000,  refs: 0, act: 0,    tix: 0,  best: 3.5, peak: 12000 },
  { name: "ZeroToHeroZed",   pnl: 2500,   tasks: 2500,  refs: 0, act: 200,  tix: 0,  best: 2.6 },
  { name: "NewbieNico",      pnl: 0,      tasks: 1000,  refs: 0, act: 0,    tix: 0,  best: 0 },
];

// 1. let the real server create the tables
for (const f of [dbPath, dbPath + "-wal", dbPath + "-shm"]) fs.rmSync(f, { force: true });
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const PORT = 3598;
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DB_PATH: dbPath, CRASH_TEST: "1", CLAIMS: "1", X_CLIENT_ID: "",
  LOG_DIR: path.join(path.dirname(dbPath), "xp-demo-logs"), NFT_CONTRACT: "", NFT_RPC_URL: "",
} });
let up = false;
for (let i = 0; i < 60 && !up; i++) { try { await fetch(`http://127.0.0.1:${PORT}/api/config`); up = true; } catch { await sleep(250); } }
srv.kill();
if (!up) { console.error("The server did not start."); process.exit(1); }
await sleep(800);

// 2. fill it
const db = new Database(dbPath);
const rnd = (a, b) => a + Math.random() * (b - a);
const hex = (n) => crypto.randomBytes(n).toString("hex");
const idOf = (name) => "demo:" + name.toLowerCase();
const addUser = db.prepare("INSERT OR REPLACE INTO crash_users(id,provider,username,name,pfp,created,seen,wallet,wallet_norm,starter_at,claim_at,onboarded_at,vwallet,vwallet_at) VALUES(?,?,?,?,NULL,?,?,?,?,?,?,?,?,?)");
const addBal = db.prepare("INSERT OR REPLACE INTO crash_balances(player,coin,balance) VALUES(?,'CREDITS',?)");
const addRound = db.prepare("INSERT INTO crash_rounds(id,player,coin,bet,server_seed,commit_hash,client_seed,nonce,noise_seed,crash,start_ms,end_ms,state,sold_mult,payout,pnl,sold_ms,ts,edge,fair,curve) VALUES(?,?,'CREDITS',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0.05,2,3)");
const addNft = db.prepare("INSERT OR REPLACE INTO crash_nft(player,wallet,count,checked_at) VALUES(?,?,?,?)");
const addRef = db.prepare("INSERT OR REPLACE INTO crash_referrals(referee,referrer,applied_at,qualified_at,cycle_id,counted) VALUES(?,?,?,?,?,1)");
const addTask = db.prepare("INSERT INTO crash_tasks(title,descr,type,url,reward,points,verify,day,active,created,created_by,updated) VALUES(?,?,?,?,?,?,?,NULL,1,?,?,?)");
const addLog = db.prepare("INSERT INTO crash_task_log(player,task_id,day,state,proof,proof_id,reward,points,ts) VALUES(?,?,?,'done',NULL,NULL,?,?,?)");
const addAct = db.prepare("INSERT INTO crash_activity(player,cycle_id,kind,points,ts) VALUES(?,?,?,?,?)");
const addPeak = db.prepare("INSERT OR REPLACE INTO crash_xp_peak(player,cycle_id,peak,ts) VALUES(?,?,?,?)");

// Rounds that add up to exactly `net`, with one big win at `best` x.
function rounds(player, net, best) {
  if (!net && !best) return 0;
  const n = Math.max(10, Math.min(60, Math.ceil(Math.abs(net) / 5000) + 10));
  const list = [];
  let left = net;
  if (best > 1) { const b = [1000, 2000, 2000, 3000][Math.floor(Math.random() * 4)]; const p = Math.round(b * (best - 1)); list.push({ bet: b, pnl: p }); left -= p; }
  const rest = n - list.length;
  for (let i = 0; i < rest; i++) {
    const last = i === rest - 1;
    const base = left / (rest - i);
    let pnl = last ? left : Math.round(base + rnd(-1, 1) * Math.max(1500, Math.abs(base)));
    pnl = Math.max(-9000, pnl); // a single losing round can't lose more than a max bet
    const bet = Math.min(10000, Math.max(1000, Math.ceil(Math.max(0, -pnl) / 1000) * 1000 + Math.round(rnd(0, 3)) * 1000));
    if (pnl < -bet) pnl = -bet;
    list.push({ bet, pnl }); left -= pnl;
  }
  // any rounding left over goes on the last round that can take it
  if (left) list[list.length - 1].pnl += left;
  list.sort(() => Math.random() - 0.5);
  const span = Math.max(3.6e6, Math.min(now, cEnd) - cStart - 3.6e6);
  list.forEach((r, i) => {
    const ts = Math.round(cStart + 1.8e6 + ((i + Math.random()) * span) / list.length);
    const mult = Math.max(0, (r.bet + r.pnl) / r.bet);
    const lost = r.pnl < 0 && mult < 1;
    addRound.run(crypto.randomUUID(), player, r.bet, hex(16), hex(16), "demo", i, hex(8), lost ? 1 + Math.random() * 0.4 : mult * 1.15, ts, ts + 5000, lost && mult === 0 ? "rekt" : "sold", lost && mult === 0 ? null : mult, r.bet + r.pnl, r.pnl, lost && mult === 0 ? null : ts + 4000, ts);
  });
  return list.length;
}

const day = (offset) => new Date(now - offset * 864e5).toISOString().slice(0, 10);
db.exec("BEGIN");
const taskIds = [
  ["Like the pinned post", "like", 2500, 5000], ["Quote the announcement", "quote", 5000, 15000], ["Follow @ptsdshow", "follow", 2500, 5000], ["Reply with your best loss", "comment", 5000, 12000],
].map(([t, type, reward, points]) => Number(addTask.run(t, "Demo task", type, "https://x.com/ptsdshow", reward, points, "timer", now, "demo", now).lastInsertRowid));
let friend = 0, walletN = 1;
const rows = [];
for (const c of CAST) {
  const id = idOf(c.name), w = "0x" + (walletN++).toString(16).padStart(40, "d");
  const joined = cStart - 2 * 864e5;
  addUser.run(id, "demo", c.name, c.name, joined, now, w, w, joined, now - 3.6e6, joined, c.tix ? w : null, c.tix ? joined : null);
  if (c.tix) addNft.run(id, w, c.tix, now);
  const refs = c.refs * 5000;
  for (let i = 0; i < c.refs; i++) {
    const fid = `demo:friend${String(++friend).padStart(2, "0")}`;
    addUser.run(fid, "demo", `friend${String(friend).padStart(2, "0")}`, `friend${friend}`, joined, now, null, null, null, null, null, null, null);
    addRef.run(fid, id, cStart + 3.6e6, cStart + 7.2e6, C.id);
  }
  // task points: filled with real task completions on different days; the last one gets the rounding
  let left = c.tasks, k = 0;
  while (left > 0) {
    const t = taskIds[k % taskIds.length], pts = Math.min(left, [5000, 15000, 5000, 12000][k % 4]);
    addLog.run(id, t, day(k + 1), Math.round(pts / 2), pts, cStart + 3.6e6 + k * 7.2e6);
    left -= pts; k++;
  }
  if (c.act) { addAct.run(id, C.id, "win-streak", Math.round(c.act * 0.6), now - 2 * 3.6e6); addAct.run(id, C.id, "perfect-sell", c.act - Math.round(c.act * 0.6), now - 3.6e6); }
  const n = rounds(id, c.pnl, c.best);
  addBal.run(id, 10000 + Math.max(-9000, c.pnl));
  if (c.peak) addPeak.run(id, 0, c.peak, cStart - 864e5); // an earlier cycle (id 0): keeps the level even though XP is negative now
  const x = xpOf({ pnl: c.pnl, refs, tasks: c.tasks, activity: c.act }, multOf(c.tix));
  rows.push({ name: c.name, rounds: n, tix: c.tix, refs: c.refs, ...x, lvl: levelInfo(Math.max(x.xp, c.peak || 0)) });
}
// Jackpot: a pot, today's tickets for a few characters, and a few past winners (the tables exist because the server started above)
{
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const dk = (t) => dayFmt.format(new Date(t - 9 * 3600_000));
  db.prepare("UPDATE crash_jackpot SET pot = ? WHERE id = 1").run(1_847_250);
  const tix = db.prepare("INSERT OR REPLACE INTO crash_jackpot_pledge(day, player, n) VALUES(?,?,?)"), bal = db.prepare("INSERT OR REPLACE INTO crash_jackpot_bal(player, n) VALUES(?,?)");
  const mine = { RektRonnie: 41, DegenDana: 12, PaperPenny: 27, NewbieNico: 3, ZeroToHeroZed: 18, ChartCharlie: 9, RugSurvivorRay: 22 };
  for (const [n, t] of Object.entries(mine)) { tix.run(dk(now), "demo:" + n.toLowerCase(), t); bal.run("demo:" + n.toLowerCase(), Math.round(t / 3)); }
  const win = db.prepare("INSERT INTO crash_jackpot_wins(day, kind, player, name, amount, tickets, total, ts, seen) VALUES(?,?,?,?,?,?,?,?,1)");
  const past = [["DiamondDiego", "daily", 612_400, 33, 190, 1], ["RektRonnie", "daily", 488_050, 61, 244, 2], ["WhaleWanda", "breaker", 903_100, null, null, 2.6], ["PaperPenny", "daily", 351_900, 14, 171, 3.2]];
  for (const [n, kind, amt, tk, tot, daysAgo] of past) { const ts = now - daysAgo * 864e5; win.run(dk(ts), kind, "demo:" + n.toLowerCase(), n, amt, tk, tot, ts); }
}
db.exec("COMMIT");
db.pragma("wal_checkpoint(TRUNCATE)");
db.close();

console.log("\nSeeded 10 players into " + path.relative(ROOT, dbPath) + "\n");
console.log("Player           XP       Tickets  Refs  Level  Badge");
for (const r of rows.sort((a, b) => b.xp - a.xp)) console.log(`${r.name.padEnd(16)} ${String(r.xp).padStart(8)}  ${String(r.tix).padStart(5)}    ${String(r.refs).padStart(3)}   ${String(r.lvl.n).padStart(3)}   ${r.lvl.name}`);
console.log("");
