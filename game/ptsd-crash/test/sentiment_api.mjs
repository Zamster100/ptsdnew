// Fear & Greed through the real server: a window changes the edge a round is dealt with, and the round still re-checks.   node test/sentiment_api.mjs
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crashFromR } from "../public/path.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-sent-"));
const PORT = 3583, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "", LOGIN_STEP: "0",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", ADMIN_USERS: "boss:pw123",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const json = (r) => r.json().then((j) => ({ code: r.status, ...j }));
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "sent" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then(json);
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(json);

  let s = await fetch(B + "sentiment").then(json);
  check(s.kind === "neutral" && s.on === true && s.building === true, "starts neutral at the normal edge, gathering data", s);
  check((await get("config")).sentiment.kind === "neutral", "/api/config carries the sentiment too");

  // only the team can open a window
  check((await post("admin/sentiment", { kind: "greed" })).code === 401, "a player can't open a window");
  const adm = await fetch(B + "admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user: "boss", password: "pw123" }) });
  const ah = { "content-type": "application/json", cookie: (adm.headers.get("set-cookie") || "").split(";")[0] };
  const force = (b) => fetch(B + "admin/sentiment", { method: "POST", headers: ah, body: JSON.stringify(b) }).then(json);
  check((await force({ kind: "nonsense" })).code === 400, "an unknown kind is refused");

  for (const [kind, edge] of [["greed", 0.2], ["fear", -0.1], ["neutral", 0.05]]) {
    const f = await force({ kind, minutes: 5 });
    s = await fetch(B + "sentiment").then(json);
    check(f.code === 200 && s.kind === kind, `team opens ${kind}: public state shows ${kind}`, s);
    // a real round dealt now
    await post("claim", { kind: "starter" });
    const b = await post("buy", { coin: "CREDITS", amount: 500, clientSeed: "seed-" + kind });
    check(b.code === 200 && b.round.edge === edge && b.round.regime === kind, `a bet placed in ${kind} is dealt with edge ${edge}`, b.round);
    await sleep(600);
    await post("sell", { id: b.round.id });
    let e = await get("wait?id=" + b.round.id); while (e.pending) e = await get("wait?id=" + b.round.id);
    const rd = await get("round?id=" + b.round.id);
    const hmac = crypto.createHmac("sha256", rd.serverSeed).update(`${rd.clientSeed}:${rd.nonce}`).digest("hex");
    const again = crashFromR(parseInt(hmac.slice(0, 13), 16) / 2 ** 52, rd.edge, rd.curve);
    check(rd.edge === edge && rd.regime === kind && again === rd.crash, `the ${kind} round re-checks from its seeds with its own edge`, { edge: rd.edge, regime: rd.regime, crash: rd.crash, again });
  }
  s = await fetch(B + "sentiment").then(json);
  check(s.log.length === 2 && s.log[0].kind === "fear" && s.log[1].kind === "greed" && s.log.every((w) => w.end > w.start && !("forced" in w)), "the log lists both windows (newest first) with when they really ended, and no \"set by\" flag", s.log);
  check(!("end" in s) && !("start" in s), "the public state carries no end time for the window in force", Object.keys(s));
  check(!JSON.stringify(s).match(/edge|rounds|players/i), "the public state says nothing about edges, odds or how the reading works", Object.keys(s));
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all sentiment API checks passed");
process.exit(fails ? 1 : 0);
