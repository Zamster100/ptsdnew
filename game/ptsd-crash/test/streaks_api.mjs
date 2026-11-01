// Streaks through the real server: login bonus, XP on the board, and the win streak agreeing with the stats panel.   node test/streaks_api.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-streaks-"));
const PORT = 3591, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "2500", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "stk" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then((r) => r.json());
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, ...(await r.json()) }));

  // ---- login streak ----
  const me1 = await get("me");
  check(me1.streak && me1.streak.loginAward === 100 && me1.streak.login === 1 && me1.streak.loginToday === true, "first visit of the day pays the day-1 login bonus (100 XP)", me1.streak);
  const me2 = await get("me");
  check(me2.streak.loginAward === 0 && me2.streak.login === 1, "opening the game again the same day pays nothing", me2.streak);
  await post("claim", { kind: "starter" });
  let lb = await get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !(lb.mine && lb.mine.activity === 100); i++) { await sleep(500); lb = await get("leaderboard?limit=10"); }
  check(lb.mine && lb.mine.activity === 100 && lb.mine.xp === 100 && lb.mine.rounds === 0, "the login bonus shows up on the leaderboard as XP (Activity points)", lb.mine);

  // ---- play real rounds: the server's win streak must match the stats panel ----
  const delays = [2200, 5200, 3000, 6000, 4200, 2600];
  let awards = 0;
  for (const d of delays) {
    const b = await post("buy", { coin: "CREDITS", amount: 500, clientSeed: "s" + Math.random() });
    if (b.code !== 200) break;
    await sleep(d);
    const s = await post("sell", { id: b.round.id });
    check(s.streak && typeof s.streak.win === "number" && s.streak.perfect.pct === 5, "the sell response carries the streak state", s.streak);
    if (s.award && (s.award.streakXp || s.award.perfectXp)) awards++;
    let e = await get("wait?id=" + b.round.id); while (e.pending) e = await get("wait?id=" + b.round.id);
  }
  const st = await get("stats?coin=CREDITS");
  check(st.streaks.win === Math.max(0, st.streak) && st.streaks.bestWin === st.bestStreak, "win streak and best streak agree with the stats panel", { server: st.streaks, panel: { streak: st.streak, best: st.bestStreak } });
  const mine = (await get("me")).streak;
  check(mine.win === st.streaks.win && mine.loginAward === 0, "me reports the same streak", mine);
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all streak API checks passed");
process.exit(fails ? 1 : 0);
