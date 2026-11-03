// Cycle check: starts its own server on a temp DB with two short cycles and walks through
// the reset, unfloored PnL and the claim/PnL separation.   node test/cycles.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-cycles-"));
const PORT = 3599, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now(), C1_END = now + 40_000;
const env = {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", SITE_PASSWORD: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000",
  START_CREDITS: "0", DAILY_CREDITS: "10000", CLAIM_HOURS: "24", X_CLIENT_ID: "", LOGIN_STEP: "0", ACHIEVEMENTS: "0",
  CYCLES: JSON.stringify([
    { id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(C1_END).toISOString() },
    { id: 2, name: "Cycle 2", start: new Date(C1_END).toISOString(), end: new Date(C1_END + 60_000).toISOString() },
  ]),
};
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { env, cwd: ROOT, stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra ?? ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const cfg = await fetch(B + "config").then((r) => r.json());
  check(cfg.cycle?.id === 1 && cfg.cycleBankroll === 10000 && cfg.cyclePrize === 1000 && cfg.seasonOver === false, "config shows cycle 1, bankroll 10000, prize 1000", cfg.cycle);

  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "cyc" + Math.random().toString(36).slice(2, 7) }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then((r) => r.json());
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b) }).then(async (r) => ({ code: r.status, ...(await r.json()) }));

  check((await get("me")).balances.CREDITS === 10000, "first touch of cycle 1 gives the 10,000 bankroll");
  check((await post("wallet", { address: "0x" + "ab".repeat(20) })).code === 200, "wallet saved");
  check((await post("claim", { kind: "starter" })).code === 200, "onboarding step completes");
  check((await get("me")).balances.CREDITS === 10000, "onboarding adds nothing on top of the bankroll");
  check((await post("claim", { kind: "daily" })).code === 400, "no second claim inside 24h");

  // one round: balance change must equal the round's pnl
  const b = await post("buy", { coin: "CREDITS", amount: 1000, clientSeed: "t" });
  check(b.code === 200, "bet inside the limits works", b);
  await sleep(1500);
  await post("sell", { id: b.round.id });
  let end = await get("wait?id=" + b.round.id); while (end.pending) end = await get("wait?id=" + b.round.id);
  const bal1 = (await get("me")).balances.CREDITS;
  check(bal1 === 10000 + end.pnl, "balance moved by exactly the round pnl", { bal1, pnl: end.pnl });
  check((await post("buy", { coin: "CREDITS", amount: 2501 })).code === 400, "bet over max rejected");

  // the board is built by a background worker and cached, so wait for our row to show up
  let lb = await get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !lb.mine; i++) { await sleep(500); lb = await get("leaderboard?limit=10"); }
  const mine = lb.mine;
  check(lb.period === "cycle" && lb.cycle?.id === 1 && lb.cycle.live === true && lb.prize === 1000, "leaderboard is the live cycle board");
  check(mine && mine.xp === end.pnl && mine.net === end.pnl, "XP is the real PnL when it is all there is, negative or not (no multiplier)", mine);

  // cross the boundary
  await sleep(Math.max(0, C1_END - Date.now()) + 800);
  const me2 = await get("me");
  check(me2.balances.CREDITS === 10000, "cycle 2 resets the balance to the bankroll", me2.balances);
  const lb2 = await get("leaderboard?limit=10");
  check(lb2.cycle?.id === 2 && lb2.mine === null, "cycle 2 board starts empty for this player", lb2.cycle);
  const cl = await post("claim", { kind: "daily" });
  check(cl.code === 400, "claim timer restarted with the cycle");
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all cycle checks passed");
process.exit(fails ? 1 : 0);
