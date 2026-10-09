// Flag accounts from a bot list (CSV with columns x_handle, verdict, why, ...).
//
//   node --env-file=.env scripts/flag-bots.mjs bot-list.csv                 # DRY RUN: shows what would change, writes nothing
//   node --env-file=.env scripts/flag-bots.mjs bot-list.csv --apply         # do it
//   node --env-file=.env scripts/flag-bots.mjs --unflag @somehandle         # undo one account
//
// Tiers (change with --block / --review, comma separated, matched against the "verdict" column):
//   blocked : can't play, hidden from every leaderboard, not counted as a player   (default: "Bot,Likely bot")
//   review  : still plays and shows on the board, but is marked REVIEW in winners.mjs (default: "Suspected,Check")
// Every handle in the file also goes on the blocklist, so it is flagged even if it signs in for the first time later.
// Rounds are never deleted. BACK UP THE DATABASE FIRST:  sqlite3 data/crash.db ".backup backup.db"
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const list = (s) => String(s).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--block" && args[args.indexOf(a) - 1] !== "--review" && args[args.indexOf(a) - 1] !== "--unflag");
const APPLY = flag("--apply");

const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"));
// Same schema the game creates (safe to run before the game has started with the new code).
db.exec("CREATE TABLE IF NOT EXISTS crash_blocklist (handle_lc TEXT PRIMARY KEY, status TEXT NOT NULL, tier TEXT, reason TEXT, added INTEGER NOT NULL)");
for (const col of ["status TEXT", "status_reason TEXT", "status_at INTEGER"]) { try { db.exec(`ALTER TABLE crash_users ADD COLUMN ${col}`); } catch {} }

const start = process.env.CAMPAIGN_START ? Date.parse(process.env.CAMPAIGN_START) : 0;
const end = process.env.CAMPAIGN_END ? Date.parse(process.env.CAMPAIGN_END) : 8.64e15;
const currency = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "");
const playerCount = () => db.prepare(`SELECT COUNT(DISTINCT player) n FROM crash_rounds WHERE state!='open' AND coin=? AND ts>=? AND ts<? AND player NOT IN (SELECT id FROM crash_users WHERE status='blocked')`).get(currency, start, end).n;

// ---- --unflag @handle
if (flag("--unflag")) {
  const h = String(opt("--unflag", "")).replace(/^@/, "").toLowerCase();
  if (!h) { console.error("Usage: --unflag @handle"); process.exit(1); }
  const u = db.prepare("SELECT id, username, status FROM crash_users WHERE lower(username)=?").all(h);
  console.log(`handle ${h}: ${u.length} account(s) found, ${u.filter((x) => x.status).length} currently flagged`);
  if (!APPLY) { console.log("DRY RUN. Add --apply to unflag."); process.exit(0); }
  db.prepare("DELETE FROM crash_blocklist WHERE handle_lc=?").run(h);
  db.prepare("UPDATE crash_users SET status=NULL, status_reason=NULL, status_at=NULL WHERE lower(username)=?").run(h);
  console.log("Unflagged. Players in campaign:", playerCount());
  process.exit(0);
}

if (!file || !fs.existsSync(file)) { console.error("Usage: node --env-file=.env scripts/flag-bots.mjs bot-list.csv [--apply] [--block \"Bot,Likely bot\"] [--review \"Suspected,Check\"]"); process.exit(1); }

// Minimal CSV parser (quoted fields, commas and quotes inside quotes).
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const [head, ...body] = parseCsv(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const col = (n) => head.findIndex((h) => h.trim().toLowerCase() === n);
const iHandle = col("x_handle"), iVerdict = col("verdict"), iWhy = col("why");
if (iHandle < 0 || iVerdict < 0) { console.error("CSV needs x_handle and verdict columns. Found:", head.join(", ")); process.exit(1); }

const blockTiers = list(opt("--block", "Bot,Likely bot")), reviewTiers = list(opt("--review", "Suspected,Check"));
const entries = body.map((r) => {
  const handle = String(r[iHandle] || "").trim().replace(/^@/, "").toLowerCase();
  const verdict = String(r[iVerdict] || "").trim();
  const status = blockTiers.includes(verdict.toLowerCase()) ? "blocked" : reviewTiers.includes(verdict.toLowerCase()) ? "review" : null;
  return { handle, verdict, status, why: iWhy >= 0 ? String(r[iWhy] || "").trim() : "" };
}).filter((e) => e.handle);

const stats = db.prepare(`SELECT COUNT(*) rounds, COALESCE(SUM(pnl),0) pnl FROM crash_rounds WHERE player=? AND state!='open'`);
const find = db.prepare("SELECT id, username, status FROM crash_users WHERE lower(username)=?");
const counts = { blocked: 0, review: 0, skipped: 0, notFound: 0 };
const missing = [];
const before = playerCount();
console.log(`${APPLY ? "APPLYING" : "DRY RUN"}: ${entries.length} handles in ${path.basename(file)}. block=[${blockTiers}] review=[${reviewTiers}]\n`);
console.log("status   handle                 rounds  pnl         verdict");
const apply = db.transaction(() => {
  for (const e of entries) {
    if (!e.status) { counts.skipped++; console.log(`SKIP     @${e.handle.padEnd(21)} (verdict "${e.verdict}" is in neither tier)`); continue; }
    const users = find.all(e.handle);
    if (!users.length) { counts.notFound++; missing.push(e.handle); }
    for (const u of users) {
      const s = stats.get(u.id);
      console.log(`${e.status.toUpperCase().padEnd(8)} @${e.handle.padEnd(21)} ${String(s.rounds).padStart(6)}  ${String(s.pnl).padStart(10)}  ${e.verdict}`);
      counts[e.status]++;
      if (APPLY) db.prepare("UPDATE crash_users SET status=?, status_reason=?, status_at=? WHERE id=?").run(e.status, "bot list: " + (e.why || e.verdict).slice(0, 300), Date.now(), u.id);
    }
    if (APPLY) db.prepare("INSERT INTO crash_blocklist(handle_lc,status,tier,reason,added) VALUES(?,?,?,?,?) ON CONFLICT(handle_lc) DO UPDATE SET status=excluded.status, tier=excluded.tier, reason=excluded.reason").run(e.handle, e.status, e.verdict, e.why.slice(0, 300), Date.now());
  }
});
apply();
console.log(`\nMatched accounts -> blocked: ${counts.blocked}, review: ${counts.review}. Handles not in the database (yet): ${counts.notFound}. Skipped: ${counts.skipped}.`);
if (missing.length) console.log("Not found (they will be flagged automatically if they ever sign in):", missing.map((h) => "@" + h).join(" "));
console.log(`Players in the campaign window: ${before} before -> ${APPLY ? playerCount() : before - counts.blocked + " after (expected)"}`);
if (!APPLY) console.log("\nNothing was changed. Re-run with --apply to flag these accounts.");
