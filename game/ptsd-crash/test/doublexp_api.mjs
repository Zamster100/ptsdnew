// Double XP hour through the real server (a window that is on right now).   node test/doublexp_api.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-dxp-"));
const PORT = 3587, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const etHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", SITE_PASSWORD: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", DOUBLE_XP_HOUR: String(etHour), DOUBLE_XP_MINUTES: "1439",
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

  const cfg = await fetch(B + "config").then((r) => r.json());
  check(cfg.doubleXp && cfg.doubleXp.active === true && cfg.doubleXp.mult === 2 && cfg.doubleXp.current.end > Date.now(), "/api/config reports the Double XP hour as on", cfg.doubleXp);
  const me = await get("me");
  check(me.streak.loginAward === 200 && me.streak.boost === 2, "the day-1 login bonus is doubled (200 XP)", me.streak);
  await post("claim", { kind: "starter" });
  let lb = await get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !(lb.mine && lb.mine.activity === 200); i++) { await sleep(500); lb = await get("leaderboard?limit=10"); }
  check(lb.mine && lb.mine.activity === 200 && lb.mine.xp === 200, "the doubled bonus is what lands on the leaderboard", lb.mine);
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all Double XP API checks passed");
process.exit(fails ? 1 : 0);
