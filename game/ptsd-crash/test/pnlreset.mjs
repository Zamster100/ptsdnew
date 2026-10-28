// PNL reset check: unfloored board, task gate, 24h cooldown, one use per task.   node test/pnlreset.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-pnl-"));
const PORT = 3593, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now(), tasksFile = path.join(dir, "tasks.json");
const writeTasks = (list) => fs.writeFileSync(tasksFile, JSON.stringify(list));
writeTasks([]);
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "2500", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", TASKS_FILE: tasksFile, TASK_MIN_SECONDS: "2",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "resetter" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then((r) => r.json());
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, ...(await r.json()) }));
  await get("me"); await post("claim", { kind: "starter" });

  // play until the cycle PnL is negative (a lost round), so there is something to reset
  let net = 0;
  for (let i = 0; i < 30 && net >= 0; i++) {
    const b = await post("buy", { coin: "CREDITS", amount: 2500, clientSeed: "r" + i });
    if (b.code !== 200) break;
    // never sell: ride it to the crash (or the cap) and take the result
    let e = await get("wait?id=" + b.round.id); while (e.pending) { await sleep(300); e = await get("wait?id=" + b.round.id); }
    net += e.pnl;
  }
  check(net < 0, "reached a negative cycle PnL", net);
  let lb = await get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !(lb.mine && lb.mine.score === net); i++) { await sleep(500); lb = await get("leaderboard?limit=10"); }
  check(lb.mine && lb.mine.score === net, "board shows the real negative PnL (no floor)", lb.mine && { score: lb.mine.score, net });

  check((await get("me")).pnl.net === net && (await get("me")).pnl.canReset === false, "no task yet: reset not available");
  check((await post("pnl/reset", { id: "t1" })).code === 400, "reset refused with no task");

  writeTasks([{ id: "t1", title: "Old task", url: "https://x.com/a", added: "2026-01-01T00:00:00Z" }, { id: "t2", title: "Latest task", desc: "Do it", url: "https://x.com/b", added: "2026-02-01T00:00:00Z" }]);
  const st = await get("task/latest");
  check(st.task?.id === "t2" && st.canReset === true, "latest task is the newest one", st.task);
  check((await post("pnl/reset", { id: "t2" })).code === 400, "reset refused before opening the task");
  check((await post("task/open", { id: "t1" })).code === 400, "an older task can't be opened for the reset");
  check((await post("task/open", { id: "t2" })).code === 200, "open the latest task");
  const early = await post("pnl/reset", { id: "t2" });
  check(early.code === 400 && early.wait > 0, "reset refused straight after opening (wait)", early.error);
  check((await post("pnl/reset", { id: "t1" })).code === 400, "reset refused for a task that isn't the latest");
  await sleep(2300);
  const ok = await post("pnl/reset", { id: "t2" });
  check(ok.code === 200 && ok.net === 0 && ok.cooldown === true, "reset after the wait: PnL back to 0, cooldown on", ok);
  lb = await get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !(lb.mine === null || lb.mine.score === 0); i++) { await sleep(500); lb = await get("leaderboard?limit=10"); }
  check(lb.mine === null || lb.mine.score === 0, "board counts from the reset", lb.mine);
  check((await post("pnl/reset", { id: "t2" })).code === 400, "second reset refused inside 24h");
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all pnl reset checks passed");
process.exit(fails ? 1 : 0);
