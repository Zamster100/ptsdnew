// Winners list for the WL campaign, as CSV (rank, X username, wallet, PnL, prize).
// Run on the server, with the same settings as the game:
//   node --env-file=.env scripts/winners.mjs > winners.csv
// Uses CAMPAIGN_START / CAMPAIGN_END, WL_MAX/WL_PER, MINT_MAX/MINT_PER from the settings.
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"), { readonly: true });
const num = (v, d) => (v ? Number(v) : d);
const start = process.env.CAMPAIGN_START ? Date.parse(process.env.CAMPAIGN_START) : 0;
const end = process.env.CAMPAIGN_END ? Date.parse(process.env.CAMPAIGN_END) : Date.now();
const currency = String(process.env.CURRENCY || "CREDITS").toUpperCase().replace(/[^A-Z0-9]/g, "");
const rows = db.prepare(`SELECT r.player, SUM(r.pnl) net, COUNT(*) rounds, u.username, u.wallet
  FROM crash_rounds r LEFT JOIN crash_users u ON u.id = r.player
  WHERE r.state!='open' AND r.coin=? AND r.ts>=? AND r.ts<? GROUP BY r.player ORDER BY net DESC, SUM(r.bet) DESC`).all(currency, start, end);
const players = rows.length;
const wl = Math.min(num(process.env.WL_MAX, 500), Math.floor(players / num(process.env.WL_PER, 10)));
const mints = Math.min(num(process.env.MINT_MAX, 25), Math.floor(players / num(process.env.MINT_PER, 200)));
const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
console.log("rank,x_username,wallet,pnl,rounds,prize");
rows.forEach((r, i) => {
  const rank = i + 1;
  const prize = rank <= mints ? "FREE MINT + WL" : rank <= wl ? "WL" : "";
  console.log([rank, csv(r.username), csv(r.wallet), r.net, r.rounds, csv(prize)].join(","));
});
console.error(`${players} players, ${wl} WL spots, ${mints} free mints (window ${new Date(start).toISOString()} -> ${new Date(end).toISOString()})`);
