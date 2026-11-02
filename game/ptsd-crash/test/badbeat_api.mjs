// Bad beat refund through the real server (set to "2 rugs in a row, any crash under 1000x" so real rounds trigger it).   node test/badbeat_api.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-bb-"));
const PORT = 3581, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "", LOGIN_STEP: "0",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", BAD_BEAT_COUNT: "2", BAD_BEAT_UNDER: "1000", BAD_BEAT_COOLDOWN_MIN: "0",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "bb" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then((r) => r.json());
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, ...(await r.json()) }));
  await post("claim", { kind: "starter" });
  const bal = async () => (await get("me")).balances.CREDITS;
  const start = await bal();
  // a round nobody sells: it ends rekt on its own
  const rug = async (amount) => {
    const b = await post("buy", { coin: "CREDITS", amount, clientSeed: "s" + Math.random() });
    if (b.code !== 200) throw new Error("buy failed " + JSON.stringify(b));
    let e = await get("wait?id=" + b.round.id); while (e.pending) e = await get("wait?id=" + b.round.id);
    return { id: b.round.id, e };
  };
  const r1 = await rug(500);
  check(r1.e.state === "rekt" && !r1.e.badBeat, "the first rug pays nothing", r1.e);
  check(await bal() === start - 500, "balance is down the first bet");
  const r2 = await rug(800);
  check(r2.e.state === "rekt" && r2.e.badBeat && r2.e.badBeat.amount === 800 && r2.e.badBeat.rugs === 2, "the second rug in a row refunds the last bet (800) and says so", r2.e.badBeat);
  check(await bal() === start - 500, "balance: the 800 is back (only the first 500 is lost)");
  const round2 = await get("round?id=" + r2.id);
  check(round2.pnl === -800 && round2.state === "rekt", "the round itself still shows the loss (profit and loss untouched)", { pnl: round2.pnl, state: round2.state });
  check((await get("me")).badBeats.length === 0, "a refund the player already saw isn't announced again");

  // two more rugs; this time the player isn't waiting on the round (page closed): the next /me announces it
  const b3 = await post("buy", { coin: "CREDITS", amount: 300, clientSeed: "s3" });
  let e3 = await get("wait?id=" + b3.round.id); while (e3.pending) e3 = await get("wait?id=" + b3.round.id);
  check(!e3.badBeat, "after a refund the count starts again (one rug is not enough)");
  const b4 = await post("buy", { coin: "CREDITS", amount: 400, clientSeed: "s4" });
  let told = [];
  for (let i = 0; i < 120 && !told.length; i++) { await sleep(1000); told = (await get("me")).badBeats; }
  check(told.length === 1 && told[0].amount === 400 && told[0].roundId === b4.round.id, "a refund that landed while away is announced on the next visit", told);
  check(await bal() === start - 500 - 300, "balance after the second refund");
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all bad beat API checks passed");
process.exit(fails ? 1 : 0);
