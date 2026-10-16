// Hourly bot check. Meant for cron; dry run unless --apply.
//
//   node --env-file=.env scripts/auto-flag.mjs            # DRY RUN: shows what it would flag, writes nothing
//   node --env-file=.env scripts/auto-flag.mjs --apply    # flag them (what cron runs)
//
// BLOCK (can't play, hidden from boards)      : farm handle shape + generic name, 0 followers on X, wallet shared with a blocked account
// REVIEW (still plays, held back from prizes) : wallet shared by 2+ accounts, 5+ accounts with the same X creation day and <=5 followers,
//                                               rounds at a near-constant rhythm (20+ rounds)
// It never unflags anyone, never deletes rounds, and only upgrades review -> blocked.
// Safety valve: if one run would block more than MAX_AUTO_BLOCK (default 30) accounts, they go to review instead (use --force to override).
// Snapshot of the database is taken (BACKUP_DIR, default ~/backups) before any run that changes something.
// Optional ALERT_WEBHOOK_URL (Discord/Slack-style {"content": ...}) gets a one-line summary when something is flagged.
import Database from "better-sqlite3";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APPLY = process.argv.includes("--apply"), FORCE = process.argv.includes("--force");
const MAX_BLOCK = Number(process.env.MAX_AUTO_BLOCK || 30);
const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"));
db.pragma("busy_timeout = 5000");

const cols = new Set(db.prepare("PRAGMA table_info(crash_users)").all().map((c) => c.name));
for (const c of ["status", "status_reason", "status_at", "x_created", "x_followers", "x_tweets", "wallet_norm"]) {
  if (!cols.has(c)) { console.error(`crash_users.${c} missing: start the game once with the current code first.`); process.exit(1); }
}
db.exec("CREATE TABLE IF NOT EXISTS crash_blocklist (handle_lc TEXT PRIMARY KEY, status TEXT NOT NULL, tier TEXT, reason TEXT, added INTEGER NOT NULL)");

const start = process.env.CAMPAIGN_START ? Date.parse(process.env.CAMPAIGN_START) : 0;
const end = process.env.CAMPAIGN_END ? Date.parse(process.env.CAMPAIGN_END) : 8.64e15;
const currency = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "");

const FARM_HANDLE = /^[a-z]{4,14}\d{6}$/;
const FARM_NAME = /^(Barbara|Betty|Donna|Dorothy|Elizabeth|Helen|Jennifer|Karen|Kimberly|Laura|Linda|Lisa|Margaret|Maria|Mary|Nancy|Ruth|Sharon|Susan|Carol|Patricia|Deborah|Sarah|Michelle|Sandra)$/;

const users = db.prepare("SELECT id, username, name, status, wallet_norm w, x_created, x_followers f, x_tweets t FROM crash_users").all();
const live = users.filter((u) => u.status !== "blocked");
const decided = new Map(); // id -> { status, why }
const want = (u, status, why) => {
  const cur = decided.get(u.id);
  if (!cur || (status === "blocked" && cur.status !== "blocked")) decided.set(u.id, { status, why });
};

// ---- BLOCK rules
const blockedWallets = new Map();
for (const u of users) if (u.status === "blocked" && u.w) blockedWallets.set(u.w, u.username);
for (const u of live) {
  if (FARM_HANDLE.test(u.username) && FARM_NAME.test(u.name || "")) want(u, "blocked", "generated handle + generic first-name display name");
  if (u.f === 0) want(u, "blocked", "0 followers on X");
  if (u.w && blockedWallets.has(u.w)) want(u, "blocked", `shares wallet with blocked @${blockedWallets.get(u.w)}`);
}

// ---- REVIEW rules (only for accounts with no status yet)
const fresh = live.filter((u) => !u.status);
const byWallet = new Map();
for (const u of live) if (u.w) byWallet.set(u.w, [...(byWallet.get(u.w) || []), u]);
for (const u of fresh) {
  const g = u.w && byWallet.get(u.w);
  if (g && g.length > 1) want(u, "review", "wallet shared with " + g.filter((x) => x !== u).map((x) => "@" + x.username).join(","));
}
const byDay = new Map();
for (const u of fresh) if (u.x_created && u.f != null && u.f <= 5) { const d = String(u.x_created).slice(0, 10); byDay.set(d, [...(byDay.get(d) || []), u]); }
for (const [d, g] of byDay) if (g.length >= 5) for (const u of g) want(u, "review", `X account created ${d} with ${g.length - 1} others, <=5 followers`);

const rounds = db.prepare("SELECT player, ts FROM crash_rounds WHERE state!='open' AND coin=? AND ts>=? AND ts<? ORDER BY player, ts").all(currency, start, end);
const ts = new Map();
for (const r of rounds) ts.set(r.player, [...(ts.get(r.player) || []), r.ts]);
const freshIds = new Map(fresh.map((u) => [u.id, u]));
for (const [id, t] of ts) {
  const u = freshIds.get(id);
  if (!u || t.length < 20) continue;
  const gaps = t.slice(1).map((x, i) => x - t[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
  if (mean > 0 && sd / mean < 0.25) want(u, "review", `rounds at a constant rhythm (${t.length} rounds, one per ~${Math.round(mean / 1000)}s)`);
}

// ---- Only keep changes (skip anything already at that status, never downgrade)
const byId = new Map(users.map((u) => [u.id, u]));
let changes = [...decided].map(([id, d]) => ({ u: byId.get(id), ...d })).filter(({ u, status }) => u.status !== status && !(u.status === "blocked"));
let blocks = changes.filter((c) => c.status === "blocked");
let downgraded = 0;
if (blocks.length > MAX_BLOCK && !FORCE) {
  for (const c of blocks) { c.status = "review"; c.why = "(held for review, run exceeded block limit) " + c.why; }
  downgraded = blocks.length; blocks = [];
}
changes = changes.filter(({ u, status }) => u.status !== status);

const stamp = new Date().toISOString();
console.log(`[${stamp}] ${APPLY ? "APPLY" : "DRY RUN"}: ${changes.length} change(s) (${blocks.length} block, ${changes.length - blocks.length} review)${downgraded ? `; ${downgraded} would-be blocks held back for review (limit ${MAX_BLOCK})` : ""}`);
for (const c of changes) console.log(`  ${c.status.toUpperCase().padEnd(7)} @${c.u.username}  (${c.why})`);
if (!changes.length) process.exit(0);
if (!APPLY) { console.log("Nothing changed. Re-run with --apply."); process.exit(0); }

const dir = process.env.BACKUP_DIR || path.join(os.homedir(), "backups");
const { mkdirSync } = await import("node:fs");
mkdirSync(dir, { recursive: true });
const snap = path.join(dir, `auto-flag-${Date.now()}.db`);
await db.backup(snap);
console.log("  snapshot:", snap);

const setUser = db.prepare("UPDATE crash_users SET status=?, status_reason=?, status_at=? WHERE id=?");
const addList = db.prepare("INSERT INTO crash_blocklist(handle_lc,status,tier,reason,added) VALUES(?,?,?,?,?) ON CONFLICT(handle_lc) DO UPDATE SET status=excluded.status, tier=excluded.tier, reason=excluded.reason");
db.transaction(() => {
  for (const c of changes) {
    const now = Date.now();
    setUser.run(c.status, "auto: " + c.why.slice(0, 280), now, c.u.id);
    if (c.status === "blocked") addList.run(c.u.username.toLowerCase(), "blocked", "Auto", c.why.slice(0, 280), now);
  }
})();
console.log("  done.");

if (process.env.ALERT_WEBHOOK_URL) {
  const names = changes.slice(0, 15).map((c) => `${c.status === "blocked" ? "BLOCK" : "review"} @${c.u.username}`).join(", ");
  try {
    await fetch(process.env.ALERT_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: `PTSD Crash auto-flag: ${blocks.length} blocked, ${changes.length - blocks.length} review. ${names}${changes.length > 15 ? " ..." : ""}` }) });
  } catch (e) { console.error("  alert failed:", e.message); }
}
