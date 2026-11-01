// Rewards and the Stats page through the real server: transactions, level perks, achievements, community milestones.   node test/rewards_api.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-rw-"));
const PORT = 3577, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "", LOGIN_STEP: "0",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "2500", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", BAD_BEAT: "0", MILESTONE_ROUNDS: "2:777", MILESTONE_PLAYERS: "1000:1", MILESTONES_FROM: "2000-01-01",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const json = (r) => r.json().then((j) => ({ code: r.status, ...j }));
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "rw" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then(json);
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(json);

  check((await fetch(B + "rewards").then(json)).level === null, "signed out: rewards load with no level");
  check((await fetch(B + "transactions").then((r) => r.status)) === 401, "transactions need a sign-in");
  check((await get("transactions")).transactions.length === 0, "a new player has no transactions");
  await post("claim", { kind: "starter" });
  let t = (await get("transactions")).transactions;
  check(t.length === 1 && t[0].label === "Starter credits" && t[0].amount === 10000 || t.length === 1 && t[0].kind === "claim", "the starter claim is the first transaction", t);

  let rw = await get("rewards");
  check(rw.level.n === 1 && rw.claimPct === 0 && rw.perks.length === 6 && rw.achievements.total >= 30, "rewards: level 1, no perk yet, perks and achievements listed", { level: rw.level, pct: rw.claimPct });
  check(rw.milestones.on && rw.milestones.list.some((m) => m.key === "rounds-2" && !m.reachedAt) && rw.milestones.claimable === 0, "the 2-round milestone is not reached yet");
  check((await post("milestones/claim", { key: "rounds-2" })).code === 400, "an unreached milestone can't be claimed");

  const playRound = async (seed) => {
    const b = await post("buy", { coin: "CREDITS", amount: 500, clientSeed: seed });
    let e = await get("wait?id=" + b.round.id); while (e.pending) e = await get("wait?id=" + b.round.id);
    return e;
  };
  await playRound("a1"); await playRound("a2");
  t = (await get("transactions")).transactions;
  check(t.filter((x) => x.kind === "round").length === 2 && t.length === 3 && t[0].ts >= t[1].ts && t[1].ts >= t[2].ts, "settled rounds show up, newest first", t.map((x) => x.label));
  check(t.every((x) => Number.isFinite(x.amount)), "every transaction carries a signed amount");

  rw = await get("rewards");
  const first = rw.achievements.list.find((a) => a.key === "r1");
  check(first.unlocked, "playing a round unlocked First Trade");
  const ms = rw.milestones.list.find((m) => m.key === "rounds-2");
  check(ms.reachedAt && ms.claimable && rw.milestones.claimable === 1, "two rounds played reaches the milestone and it is claimable", ms);
  const before = (await get("me")).balances.CREDITS;
  const c = await post("milestones/claim", { key: "rounds-2" });
  check(c.code === 200 && c.amount === 777 && (await get("me")).balances.CREDITS === before + 777, "claiming pays the credits");
  check((await post("milestones/claim", { key: "rounds-2" })).code === 400, "...only once");
  t = (await get("transactions")).transactions;
  check(t.some((x) => x.label === "Community milestone" && x.amount === 777), "the milestone claim is in the transactions", t.map((x) => x.label));

  const st = await get("stats");
  check(st.rounds === 2, "stats count every round", st.rounds);
} finally { srv.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `FAILED: ${fails}` : "all rewards API checks passed");
process.exit(fails ? 1 : 0);
