// Bot-spotting report (read only). Run on the server:
//   node --env-file=.env scripts/report.mjs
// Lists the patterns that gave the first farm away, so new ones can be reviewed before prizes go out.
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"), { readonly: true });
const start = process.env.CAMPAIGN_START ? Date.parse(process.env.CAMPAIGN_START) : 0;
const end = process.env.CAMPAIGN_END ? Date.parse(process.env.CAMPAIGN_END) : 8.64e15;
const currency = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "");
const cols = new Set(db.prepare("PRAGMA table_info(crash_users)").all().map((c) => c.name));
const live = "COALESCE(status,'')!='blocked'";
const show = (title, rows, fmt) => {
  console.log(`\n=== ${title} (${rows.length})`);
  rows.slice(0, 60).forEach((r) => console.log("  " + fmt(r)));
  if (rows.length > 60) console.log(`  ... and ${rows.length - 60} more`);
};

if (cols.has("wallet_norm")) {
  show("Wallets used by more than one account", db.prepare(`SELECT wallet_norm w, COUNT(*) n, GROUP_CONCAT('@'||username,' ') names FROM crash_users WHERE wallet_norm IS NOT NULL AND ${live} GROUP BY wallet_norm HAVING n>1 ORDER BY n DESC`).all(), (r) => `${r.w}  x${r.n}  ${r.names}`);
  try { show("Duplicate-wallet attempts blocked (accounts that tried a wallet already taken)", db.prepare("SELECT e.ts, u.username, e.wallet_norm FROM crash_wallet_events e LEFT JOIN crash_users u ON u.id=e.user_id ORDER BY e.ts DESC").all(), (r) => `${new Date(r.ts).toISOString()}  @${r.username}  ${r.wallet_norm}`); } catch {}
}
if (cols.has("x_created")) {
  show("X accounts created on the same day (5 or more)", db.prepare(`SELECT substr(x_created,1,10) day, COUNT(*) n FROM crash_users WHERE x_created IS NOT NULL AND ${live} GROUP BY day HAVING n>=5 ORDER BY n DESC`).all(), (r) => `${r.day}  ${r.n} accounts`);
  show("Accounts with no followers and almost no tweets", db.prepare(`SELECT username, x_followers f, x_tweets t, x_created c FROM crash_users WHERE x_followers IS NOT NULL AND x_followers<=1 AND COALESCE(x_tweets,0)<=3 AND ${live}`).all(), (r) => `@${r.username}  followers ${r.f}  tweets ${r.t}  created ${String(r.c).slice(0, 10)}`);
}
show("Same bet every round, 20+ rounds (script-like)", db.prepare(`SELECT u.username, COUNT(*) rounds, MIN(r.bet) bet, ROUND(SUM(r.pnl)) pnl FROM crash_rounds r JOIN crash_users u ON u.id=r.player WHERE r.state!='open' AND r.coin=? AND r.ts>=? AND r.ts<? AND ${live.replace("status", "u.status")} GROUP BY r.player HAVING rounds>=20 AND MIN(r.bet)=MAX(r.bet) ORDER BY pnl DESC`).all(currency, start, end), (r) => `@${r.username}  ${r.rounds} rounds  bet ${r.bet}  pnl ${r.pnl}`);
// Players whose rounds come at a near-constant rhythm (humans are irregular).
{
  const by = new Map();
  const rounds = db.prepare(`SELECT u.username, r.ts, r.player FROM crash_rounds r JOIN crash_users u ON u.id=r.player WHERE r.state!='open' AND r.coin=? AND r.ts>=? AND r.ts<? AND ${live.replace("status", "u.status")} ORDER BY r.player, r.ts`).all(currency, start, end);
  for (const r of rounds) {
    const a = by.get(r.player) || { username: r.username, ts: [] };
    a.ts.push(r.ts); by.set(r.player, a);
  }
  const out = [];
  for (const a of by.values()) {
    if (a.ts.length < 20) continue;
    const gaps = a.ts.slice(1).map((t, i) => t - a.ts[i]);
    const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((x, g) => x + (g - mean) ** 2, 0) / gaps.length);
    if (mean > 0 && sd / mean < 0.25) out.push({ username: a.username, rounds: a.ts.length, mean: Math.round(mean / 1000), cv: (sd / mean).toFixed(2) });
  }
  show("Very regular timing between rounds (20+ rounds)", out, (r) => `@${r.username}  ${r.rounds} rounds, one every ~${r.mean}s (variation ${r.cv})`);
}
