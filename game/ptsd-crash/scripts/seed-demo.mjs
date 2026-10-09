// DEV ONLY: fills a separate demo database with fake players so the bot flagging can be previewed locally.
//   DB_PATH=data/demo.db node scripts/seed-demo.mjs path\to\bot-list.csv     (use run-demo.ps1, it does this for you)
// The bots are the handles in your CSV, with the rounds / profit / account dates from the file.
// A few dozen made-up "real" players are added so the board looks like the live one.
// Nothing here touches your normal data/crash.db.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbPath = process.env.DB_PATH || path.join(ROOT, "data/demo.db");
if (path.basename(dbPath).toLowerCase() === "crash.db") { console.error("Refusing to seed data/crash.db. Use a different DB_PATH."); process.exit(1); }
const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) { console.error("Usage: node scripts/seed-demo.mjs bot-list.csv"); process.exit(1); }

function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const [head, ...body] = parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const ix = (n) => head.findIndex((h) => h.trim().toLowerCase() === n);
const bots = body.map((r) => ({
  handle: r[ix("x_handle")].replace(/^@/, "").trim(), verdict: r[ix("verdict")], rounds: Number(r[ix("rounds")]) || 20,
  pnl: Number(r[ix("pnl")]) || 100000, best: Number(r[ix("best_x")]) || 20, created: r[ix("x_account_created")],
}));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS crash_users (id TEXT PRIMARY KEY, provider TEXT NOT NULL, username TEXT NOT NULL, name TEXT, pfp TEXT, created INTEGER NOT NULL, seen INTEGER,
  wallet TEXT, starter_at INTEGER, claim_at INTEGER, onboarded_at INTEGER, wallet_norm TEXT, status TEXT, status_reason TEXT, status_at INTEGER, x_created TEXT, x_followers INTEGER, x_tweets INTEGER);
CREATE TABLE IF NOT EXISTS crash_balances (player TEXT, coin TEXT, balance INTEGER NOT NULL, PRIMARY KEY (player, coin));
CREATE TABLE IF NOT EXISTS crash_rounds (
  id TEXT PRIMARY KEY, player TEXT NOT NULL, coin TEXT NOT NULL, bet INTEGER NOT NULL,
  server_seed TEXT NOT NULL, commit_hash TEXT NOT NULL, client_seed TEXT NOT NULL, nonce INTEGER NOT NULL,
  noise_seed TEXT NOT NULL, crash REAL NOT NULL, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL,
  state TEXT NOT NULL, sold_mult REAL, payout INTEGER, pnl INTEGER, sold_ms INTEGER, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS crash_rounds_player ON crash_rounds(player, ts);
`);

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hex = (n) => crypto.randomBytes(n).toString("hex");
const now = Date.now(), t0 = Date.parse("2026-10-06T12:00:00Z"), span = Math.max(3.6e6, Math.min(now, Date.parse("2026-10-16T00:00:00Z")) - t0);
const addUser = db.prepare("INSERT OR REPLACE INTO crash_users(id,provider,username,name,pfp,created,seen,wallet,wallet_norm,starter_at,claim_at,onboarded_at,x_created,x_followers,x_tweets) VALUES(?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?)");
const addRound = db.prepare("INSERT INTO crash_rounds(id,player,coin,bet,server_seed,commit_hash,client_seed,nonce,noise_seed,crash,start_ms,end_ms,state,sold_mult,payout,pnl,sold_ms,ts) VALUES(?,?,'CREDITS',?,?,?,?,?,?,?,?,?,'sold',?,?,?,?,?)");
const addBal = db.prepare("INSERT OR REPLACE INTO crash_balances(player,coin,balance) VALUES(?,'CREDITS',?)");

let walletN = 1;
const wallet = () => "0x" + (walletN++).toString(16).padStart(40, "a");
function seed({ id, provider, username, rounds, net, bestMult, bet, x_created, followers, tweets, walletOverride }) {
  const w = walletOverride || wallet();
  addUser.run(id, provider, username, username, t0, now, w, w.toLowerCase(), t0, now - 3.6e6, t0, x_created || null, followers ?? null, tweets ?? null);
  addBal.run(id, 100000 + net);
  // spread the profit over the rounds; the best round is a real big win
  let left = net;
  for (let i = 0; i < rounds; i++) {
    const last = i === rounds - 1;
    const mult = i === 0 ? bestMult : rnd(1.1, Math.max(1.5, bestMult * 0.4));
    const b = bet || Math.round(rnd(1, 10)) * 1000;
    let pnl = last ? left : Math.round(net / rounds + rnd(-0.4, 0.4) * Math.abs(net / rounds));
    left -= last ? left : pnl;
    const ts = Math.round(t0 + (i + Math.random()) * (span / rounds));
    addRound.run(crypto.randomUUID(), id, b, hex(16), hex(16), "seed", i, hex(8), mult * 1.2, ts, ts + 4000, mult, b + pnl, pnl, ts + 3000, ts);
  }
}

db.exec("BEGIN");
// the bots, as listed (demo ids so you can also sign in as one of them to see the blocked screen)
for (const b of bots) {
  const farm = /^(Bot|Likely bot)$/i.test(b.verdict);
  seed({ id: "demo:" + b.handle.toLowerCase(), provider: "demo", username: b.handle, rounds: Math.min(b.rounds, 60), net: b.pnl, bestMult: b.best,
    bet: farm ? 10000 : 10000, x_created: b.created ? b.created + "T08:00:00Z" : null, followers: farm ? 0 : 40, tweets: farm ? 1 : 25 });
}
// the "real" players
const people = ["degen_dave", "moonlambo", "pt_fan_99", "satoshi_nakamoto_jr", "wagmi_will", "cousin_dick_stan", "gen_wealth_gary", "rugged_randy", "ape_in_annie", "fomo_frank", "candy_crusher", "hodl_hannah",
  "sellthetop", "jpeg_jim", "liquidated_lou", "based_bella", "paper_hands_pete", "diamond_dina", "exit_liquidity_ed", "zachgpt_fan", "bullish_bob", "trenches_tina", "alpha_alex", "rekt_rick", "pump_priya",
  "dip_buyer_dan", "airdrop_andy", "wl_hunter", "mint_maria", "nft_nick"];
people.forEach((u, i) => {
  const x = i < 10; // the first few are "real X" accounts so their names show as links
  seed({ id: x ? "x:" + (1000 + i) : "demo:" + u, provider: x ? "x" : "demo", username: u, rounds: Math.round(rnd(4, 45)), net: Math.round(rnd(-40000, 160000)),
    bestMult: rnd(1.5, 14), x_created: x ? new Date(Date.parse("2019-01-01") + i * 4e9).toISOString() : null, followers: Math.round(rnd(30, 4000)), tweets: Math.round(rnd(40, 9000)) });
});
// two real-looking players sharing one wallet, for the report script
for (const u of ["twin_one", "twin_two"]) seed({ id: "demo:" + u, provider: "demo", username: u, rounds: 12, net: 25000, bestMult: 3, walletOverride: "0x" + "b".repeat(40) });
db.exec("COMMIT");
const n = db.prepare("SELECT COUNT(*) n FROM crash_users").get().n, r = db.prepare("SELECT COUNT(*) n FROM crash_rounds").get().n;
console.log(`Seeded ${dbPath}: ${n} players (${bots.length} from the bot list), ${r} rounds.`);
