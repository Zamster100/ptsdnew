// Level check: a level is built from the highest XP reached in each cycle and never goes down.   node test/levels.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-levels-"));
const PORT = 3589, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now(), C1_END = now + 45_000;
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "2500", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", LOGIN_STEP: "0", TASK_MIN_SECONDS: "1", TASKS_REQUIRE_X: "0", ADMIN_USERS: "boss:pw-123",
  CYCLES: JSON.stringify([
    { id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(C1_END).toISOString() },
    { id: 2, name: "Cycle 2", start: new Date(C1_END).toISOString(), end: new Date(C1_END + 300_000).toISOString() },
  ]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const mk = (cookie) => {
  const h = { "content-type": "application/json", ...(cookie ? { cookie } : {}) };
  return {
    get: (p) => fetch(B + p, { headers: h }).then(async (r) => ({ code: r.status, ...(await r.json()) })),
    post: (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, headers: r.headers, ...(await r.json()) })),
  };
};
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const lg = await mk().post("admin/login", { user: "boss", password: "pw-123" });
  const ad = mk((lg.headers.get("set-cookie") || "").split(";")[0]);
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "lvl" }) });
  const pl = mk((login.headers.get("set-cookie") || "").split(";")[0]);
  await pl.get("me"); await pl.post("claim", { kind: "starter" });

  check((await pl.get("rank")).level?.n === 1, "a new player is level 1");

  // 3,000 task points = 3,000 XP, which is a level above 1
  const T = (await ad.post("admin/task", { title: "Big one", reward: 100, points: 3000, verify: "timer", url: "https://x.com/ptsdshow" })).id;
  await pl.post("task/open", { id: T }); await sleep(1300);
  check((await pl.post("task/complete", { id: T })).code === 200, "complete a 3,000-point task");
  let r1 = await pl.get("rank");
  for (let i = 0; i < 50 && !(r1.level && r1.level.n > 1); i++) { await sleep(500); r1 = await pl.get("rank"); }
  const want = (xp) => { let n = 1; while (n < 30 && xp >= Math.round((500 * n ** 1.8) / 50) * 50) n++; return n; };
  const up = want(3000);
  check(r1.level.n === up && up > 1 && r1.level.xp === 3000, `3,000 XP reaches level ${up}`, r1.level);
  const prof = await fetch(B + "profile/lvl").then((r) => r.json());
  check(prof.level.n === up && prof.level.stages.length === 7 && prof.xp === 3000, "profile shows the level and the badge stages", { n: prof.level.n, xp: prof.xp });
  let lb = await pl.get("leaderboard?limit=10");
  check(lb.mine && lb.mine.level === up && lb.mine.levelName === "Fresh Bag" && lb.top[0].level === up, "leaderboard rows carry the level", lb.mine);

  // revoke the task: XP drops back to 0, the level must not
  const log = (await ad.get("admin/log?limit=10")).log.find((l) => l.taskId === T);
  check((await ad.post("admin/revoke", { id: log.id })).ok, "revoke the task");
  for (let i = 0; i < 40; i++) { lb = await pl.get("leaderboard?limit=10"); if (!lb.mine || lb.mine.xp === 0) break; await sleep(500); }
  check(!lb.mine || lb.mine.xp === 0, "XP is back to 0 after the revoke", lb.mine);
  const r2 = await pl.get("rank");
  check(r2.level.n === up && r2.level.xp === 3000, "...but the level stays (it uses the highest XP reached)", r2.level);

  // into Cycle 2: XP starts again, the level carries over
  await sleep(Math.max(0, C1_END - Date.now()) + 1500);
  await pl.get("me");
  const r3 = await pl.get("rank");
  check(r3.level.n === up, "Cycle 2: level carried over from Cycle 1", r3.level);
  const T2 = (await ad.post("admin/task", { title: "Cycle 2 task", reward: 100, points: 3000, verify: "timer", url: "https://x.com/ptsdshow" })).id;
  await pl.post("task/open", { id: T2 }); await sleep(1300);
  await pl.post("task/complete", { id: T2 });
  let r4 = await pl.get("rank");
  for (let i = 0; i < 50 && !(r4.level && r4.level.xp === 6000); i++) { await sleep(500); r4 = await pl.get("rank"); }
  check(r4.level.xp === 6000 && r4.level.n === want(6000), "Cycle 2 highs add to Cycle 1's: level XP is the sum of each cycle's peak", r4.level);
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all level checks passed");
process.exit(fails ? 1 : 0);
