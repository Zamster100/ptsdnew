// Jackpot through the real server: a loss feeds the pot and earns tickets, a high sell breaks the pot, the daily draw pays the winner.   node test/jackpot_api.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-jp-"));
const PORT = 3579, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "", LOGIN_STEP: "0",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", ADMIN_USERS: "boss:pw123", BAD_BEAT: "0", JACKPOT_BREAKER_X: "1.01", JACKPOT_INSTA_UNDER: "1000", JACKPOT_TICKET_PER: "500",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const json = (r) => r.json().then((j) => ({ code: r.status, ...j }));
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "jp" }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const get = (p) => fetch(B + p, { headers: h }).then(json);
  const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(json);
  const bal = async () => (await get("me")).balances.CREDITS;
  await post("claim", { kind: "starter" });

  let j = await get("jackpot");
  check(j.on && j.pot === 100_000 && j.tickets === 0 && j.winners.length === 0 && j.breakerX === 1.01, "starts at the floor, no tickets, no winners", j);
  check(j.nextDrawAt > Date.now() && j.nextDrawAt - Date.now() <= 24 * 3600_000, "the next draw is within a day (9 AM Eastern)");

  // a loss: nobody sells
  let b = await post("buy", { coin: "CREDITS", amount: 1000, clientSeed: "l1" });
  let e = await get("wait?id=" + b.round.id); while (e.pending) e = await get("wait?id=" + b.round.id);
  j = await get("jackpot");
  check(e.state === "rekt" && j.pot === 100_050 && j.tickets === 2 && j.totalEntering === 2, "a 1,000 loss adds 5% (50) to the pot and earns 2 tickets (1 per 500)", { state: e.state, pot: j.pot, tickets: j.tickets, raffle: e.raffle });

  // the round's popup knows how many raffle tickets the instant rug won; the balance is pledgeable
  check(e.raffle === 2 && j.balance === 2 && j.pledged === 0 && j.auto === true && j.entering === 2, "the rekt reveal says how many raffle tickets were won (2); auto-pledge is on", { raffle: e.raffle, j });
  check((await fetch(B + "jackpot/pledge", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.status)) === 401, "pledging needs a sign-in");
  check((await post("jackpot/pledge", { n: 5 })).code === 400 && (await post("jackpot/pledge", { n: 0 })).code === 400, "you can't pledge more than you hold, or nothing");
  let pl = await post("jackpot/pledge", { n: 1 });
  check(pl.code === 200 && pl.pledged === 1 && pl.balance === 1 && pl.entering === 2 && pl.tickets === 2, "pledging 1 moves it from the balance into tonight's draw", pl);
  const off = await post("jackpot/auto", { on: false });
  check(off.auto === false && off.entering === 1 && off.totalEntering === 1, "turning auto-pledge off leaves only the pledged ticket entered", off);
  const on = await post("jackpot/auto", { on: true });
  check(on.auto === true && on.entering === 2, "...and on again enters the rest");

  // the daily draw (the team can run today's draw now): the only ticket holder wins half the pot
  const adm = await fetch(B + "admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user: "boss", password: "pw123" }) });
  const ah = { "content-type": "application/json", cookie: (adm.headers.get("set-cookie") || "").split(";")[0] };
  check((await post("admin/jackpot")).code === 401, "a player can't run a draw");
  const before = await bal();
  const d = await fetch(B + "admin/jackpot", { method: "POST", headers: ah, body: "{}" }).then(json);
  const after = await get("me"); // (this also tells the winner, once)
  check(d.win && d.win.amount === 50_025 && d.win.tickets === 2 && d.win.total === 2, "the draw pays the winner half the pot (50,050)", d.win);
  check(after.balances.CREDITS === before + 50_025, "the credits are in the winner's balance");
  j = await get("jackpot");
  check(j.pot === 100_000 && j.winners.length === 1 && j.winners[0].kind === "daily" && j.winners[0].name === "jp" && j.tickets === 0, "the pot restarts at the floor, the winner is listed, tickets are used up", j.winners);
  check(after.jackpotWins.length === 1 && after.jackpotWins[0].amount === 50_025, "the winner is told on their next visit", after.jackpotWins);
  check((await get("me")).jackpotWins.length === 0, "...once");

  // Pot Breaker: sell at 1.01x or more (set low so a real round can do it)
  await post("claim", { kind: "daily" });
  let broke = null;
  for (let i = 0; i < 6 && !broke; i++) {
    const bb = await post("buy", { coin: "CREDITS", amount: 500, clientSeed: "b" + i + Math.random() });
    if (bb.code !== 200) break;
    await sleep(4500);
    const s = await post("sell", { id: bb.round.id });
    let ee = await get("wait?id=" + bb.round.id); while (ee.pending) ee = await get("wait?id=" + bb.round.id);
    if (s.jackpot && s.jackpot.amount) broke = { s, pot: s.jackpot.amount };
  }
  check(broke && broke.pot >= 100_000, "selling at the Pot Breaker multiplier takes the pot (the sell response says so)", broke && broke.s.jackpot);
  j = await get("jackpot");
  check(broke && j.winners[0].kind === "breaker" && j.winners[0].amount === broke.pot, "the breaker is in the winners list", j.winners[0]);
  check((await get("me")).jackpotWins.length === 0, "a breaker isn't announced again on the next visit");
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all jackpot API checks passed");
process.exit(fails ? 1 : 0);
