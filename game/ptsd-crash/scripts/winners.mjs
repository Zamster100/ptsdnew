// Winners list for the WL campaign, as CSV (rank, X username, wallet, PnL, prize, plus checks).
// Run on the server, with the same settings as the game:
//   node --env-file=.env scripts/winners.mjs > winners.csv
// Uses CAMPAIGN_START / CAMPAIGN_END, WL_MAX/WL_PER, MINT_MAX/MINT_PER from the settings.
//
// Blocked (bot) accounts are left out and don't count as players. Accounts marked "review" stay in
// (so ranks are right) but are tagged REVIEW: check them before sending anything.
// Extra columns for manual checking: status, wallet_shared (other accounts with the same wallet),
// x_created (X account creation date), x_followers.
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"), { readonly: true });
const num = (v, d) => (v ? Number(v) : d);
const start = process.env.CAMPAIGN_START ? Date.parse(process.env.CAMPAIGN_START) : 0;
const end = process.env.CAMPAIGN_END ? Date.parse(process.env.CAMPAIGN_END) : Date.now();
const currency = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "");
const cols = new Set(db.prepare("PRAGMA table_info(crash_users)").all().map((c) => c.name));
const has = (c) => cols.has(c);
const rows = db.prepare(`SELECT r.player, SUM(r.pnl) net, COUNT(*) rounds, u.username, u.wallet,
    ${has("status") ? "u.status" : "NULL"} status, ${has("wallet_norm") ? "u.wallet_norm" : "NULL"} wallet_norm,
    ${has("x_created") ? "u.x_created" : "NULL"} x_created, ${has("x_followers") ? "u.x_followers" : "NULL"} x_followers
  FROM crash_rounds r LEFT JOIN crash_users u ON u.id = r.player
  WHERE r.state!='open' AND r.coin=? AND r.ts>=? AND r.ts<? AND COALESCE(u.status,'')!='blocked'
  GROUP BY r.player ORDER BY net DESC, SUM(r.bet) DESC`).all(currency, start, end);
const shared = has("wallet_norm")
  ? new Map(db.prepare("SELECT wallet_norm w, COUNT(*) n FROM crash_users WHERE wallet_norm IS NOT NULL AND COALESCE(status,'')!='blocked' GROUP BY wallet_norm").all().map((r) => [r.w, r.n]))
  : new Map();
const players = rows.length;
const wl = Math.min(num(process.env.WL_MAX, 500), Math.floor(players / num(process.env.WL_PER, 10)));
const mints = Math.min(num(process.env.MINT_MAX, 25), Math.floor(players / num(process.env.MINT_PER, 200)));
const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
console.log("rank,x_username,wallet,pnl,rounds,prize,status,wallet_shared,x_created,x_followers");
let flagged = 0;
rows.forEach((r, i) => {
  const rank = i + 1;
  const prize = rank <= mints ? "FREE MINT + WL" : rank <= wl ? "WL" : "";
  const dupes = r.wallet_norm ? Math.max(0, (shared.get(r.wallet_norm) || 1) - 1) : 0;
  const status = r.status === "review" ? "REVIEW" : dupes ? "SHARED WALLET" : "";
  if (prize && status) flagged++;
  console.log([rank, csv(r.username), csv(r.wallet), r.net, r.rounds, csv(prize), csv(status), dupes, csv(r.x_created), r.x_followers ?? ""].join(","));
});
console.error(`${players} players, ${wl} WL spots, ${mints} free mints (window ${new Date(start).toISOString()} -> ${new Date(end).toISOString()})`);
if (flagged) console.error(`${flagged} prize winners are tagged REVIEW / SHARED WALLET. Check them before sending anything.`);
