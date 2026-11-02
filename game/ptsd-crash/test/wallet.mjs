// Wallet link + Ticket holdings check, against a fake RPC (no mainnet).   node test/wallet.mjs
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-wallet-"));
const PORT = 3597, RPC_PORT = 3596, B = `http://127.0.0.1:${PORT}/api/`;
const CONTRACT = "0x6a31022a3f03554f023e0747cd77119585e41c96";

// fake chain: balanceOf(address) answers from this table
const held = new Map();
let rpcCalls = 0;
const rpc = http.createServer((req, res) => {
  let s = ""; req.on("data", (c) => (s += c)).on("end", () => {
    rpcCalls++;
    const j = JSON.parse(s), call = j.params[0];
    const addr = "0x" + call.data.slice(-40);
    const ok = call.to.toLowerCase() === CONTRACT && call.data.startsWith("0x70a08231");
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: j.id, result: ok ? "0x" + BigInt(held.get(addr.toLowerCase()) || 0).toString(16).padStart(64, "0") : "0x" }));
  });
}).listen(RPC_PORT);

const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: CONTRACT, NFT_RPC_URL: `http://127.0.0.1:${RPC_PORT}`, NFT_CACHE_MS: "600000",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 600_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };

async function player(name) {
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  return {
    get: (p) => fetch(B + p, { headers: h }).then((r) => r.json()),
    post: (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, ...(await r.json()) })),
  };
}
async function connect(pl, w, { tamper } = {}) {
  const { nonce, message } = await pl.post("wallet/nonce");
  const signature = await w.signMessage(tamper ? message + "x" : message);
  return pl.post("wallet/connect", { nonce, address: w.address, signature });
}
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }
  const cfg = await fetch(B + "config").then((r) => r.json());
  check(cfg.nft?.enabled === true, "NFT read is enabled from env", cfg.nft);

  const a = await player("walleta"), b = await player("walletb");
  const wa = Wallet.createRandom(), wb = Wallet.createRandom();
  check((await a.get("me")).nft.badge.level === 0 && (await a.get("me")).nft.bonusHours === null, "no wallet: NFT bonus locked, no badge");

  // finishing onboarding no longer needs a wallet
  check((await a.post("claim", { kind: "starter" })).code === 200, "follow step completes without a wallet");

  check((await connect(a, wa, { tamper: true })).code === 400, "signature of a different message is rejected");
  const nonce = (await a.post("wallet/nonce")).nonce;
  check((await a.post("wallet/connect", { nonce, address: wa.address, signature: "0x" + "00".repeat(65) })).code === 400, "garbage signature rejected");
  check((await b.post("wallet/connect", { nonce, address: wa.address, signature: "0x00" })).code === 400, "someone else's nonce rejected");

  held.set(wa.address.toLowerCase(), 0);
  let r = await connect(a, wa);
  check(r.code === 200 && r.wallet.count === 0 && r.wallet.bonusHours === null, "link with 0 Tickets: bonus still locked", r);

  // another account can't take the same wallet
  check((await connect(b, wa)).code === 409, "same wallet on a second account is refused");

  // tiers follow the Tickets held (re-read through /api/wallet/refresh, cached for 60s min, so use a fresh account per tier)
  for (const [n, hours, level, name] of [[1, 24, 1, "Ticket Holder"], [2, 12, 2, "Double Ticket"], [3, 8, 3, "Triple Ticket"], [4, 8, 3, "Triple Ticket"], [5, 8, 4, "High Roller"], [12, 8, 5, "Gen Wealth"]]) {
    const pl = await player("tier" + n), w = Wallet.createRandom();
    held.set(w.address.toLowerCase(), n);
    const c = await connect(pl, w);
    check(c.code === 200 && c.wallet.count === n && c.wallet.bonusHours === hours && c.wallet.badge.level === level && c.wallet.badge.name === name, `${n} Tickets -> NFT bonus every ${hours}h, badge ${name}`, c.wallet);
  }

  // the claim timer on /api/me and the claim endpoint use the Ticket tier: 1 Ticket = claim opens after 12h, not 24h
  const t1 = await player("timer1"), w1 = Wallet.createRandom(); held.set(w1.address.toLowerCase(), 1);
  await t1.post("claim", { kind: "starter" }); await connect(t1, w1);
  const me = await t1.get("me");
  const waitH = (me.onb.claimAt - Date.now()) / 3600_000;
  check(waitH > 23.9 && waitH <= 24.01, "the normal claim stays 24h for everyone", waitH);
  check(me.onb.bonus.locked === false && me.onb.bonus.canClaim === true && me.onb.bonus.hours === 24, "1-Ticket holder: NFT bonus is open", me.onb.bonus);
  const bal0 = (await t1.get("me")).balances.CREDITS;
  const bc = await t1.post("claim", { kind: "bonus" });
  check(bc.code === 200 && bc.amount === 10000 && bc.balance === bal0 + 10000, "NFT bonus claim pays 10k", bc);
  const bc2 = await t1.post("claim", { kind: "bonus" });
  check(bc2.code === 400, "no second NFT bonus claim before the timer", bc2);
  const after = (await t1.get("me")).onb.bonus, bw = (after.claimAt - Date.now()) / 3600_000;
  check(after.canClaim === false && bw > 23.9 && bw <= 24.01, "next NFT bonus is 24h away with 1 Ticket", after);
  // no Tickets = locked, claim refused
  const lockedClaim = await a.post("claim", { kind: "bonus" });
  check(lockedClaim.code === 400 && (await a.get("me")).onb.bonus.locked === true, "no Tickets: NFT bonus is locked and refused", lockedClaim);

  // holdings are cached: repeated /api/me does not hit the RPC again
  const before = rpcCalls;
  for (let i = 0; i < 5; i++) await t1.get("me");
  check(rpcCalls === before, "holdings are cached between requests", { before, after: rpcCalls });

  // public profile: Ticket count + badge, never the address; card renders as a PNG
  const pr = await fetch(B + "profile/timer1").then((r) => r.json());
  check(pr.nft?.count === 1 && pr.nft.badge.name === "Ticket Holder" && pr.nft.next?.min === 2, "profile shows Ticket count, badge and the next level", pr.nft);
  check(!JSON.stringify(pr).toLowerCase().includes(w1.address.toLowerCase().slice(2)) && !JSON.stringify(pr).includes("vwallet"), "profile JSON has no wallet address");
  check((await fetch(B + "profile/nobody-here")).status === 404, "unknown profile is a 404");
  const png = await fetch(`http://127.0.0.1:${PORT}/p/timer1.png`);
  const bytes = Buffer.from(await png.arrayBuffer());
  check(png.status === 200 && bytes.subarray(1, 4).toString() === "PNG", "profile card is a PNG", { status: png.status });
  if (process.env.SAVE_CARD) fs.writeFileSync(process.env.SAVE_CARD, bytes);
  const bot = await fetch(`http://127.0.0.1:${PORT}/p/timer1`, { headers: { "user-agent": "Twitterbot/1.0" } }).then((r) => r.text());
  check(bot.includes('og:image') && bot.includes("/p/timer1.png") && !bot.toLowerCase().includes(w1.address.toLowerCase().slice(2)), "link preview for bots has the card");
  const page = await fetch(`http://127.0.0.1:${PORT}/p/timer1`).then((r) => r.text());
  check(page.includes('<base href="/">') && page.includes("PTSD Crash"), "people get the profile page with a base href");

  // the leaderboard shows how many Tickets each listed player holds (count only)
  await t1.get("me"); await sleep(100);
  const bb = await t1.post("buy", { coin: "CREDITS", amount: 100, clientSeed: "lb" });
  if (bb.code === 200) { await sleep(1200); await t1.post("sell", { id: bb.round.id }); let e = await t1.get("wait?id=" + bb.round.id); while (e.pending) e = await t1.get("wait?id=" + bb.round.id); }
  let row = null;
  for (let i = 0; i < 40 && !row; i++) { const lb2 = await t1.get("leaderboard?limit=50"); row = (lb2.top || []).find((x) => x.username === "timer1"); if (!row) await sleep(500); }
  check(bb.code === 200 && row && row.nfts === 1, "leaderboard row carries the Ticket count", row && { nfts: row.nfts });
  check(row && !JSON.stringify(row).toLowerCase().includes(w1.address.toLowerCase().slice(2)), "leaderboard row has no wallet address");

  // swapping to another wallet is held back by the cooldown
  const sw = Wallet.createRandom(); held.set(sw.address.toLowerCase(), 3);
  check((await connect(t1, sw)).code === 400, "wallet swap blocked during the cooldown");
  // and the owner's address stays out of anything public
  const lb = JSON.stringify(await fetch(B + "leaderboard").then((r) => r.json()));
  check(!lb.toLowerCase().includes(wa.address.toLowerCase().slice(2)), "address is not in the leaderboard");
} finally {
  srv.kill(); rpc.close();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all wallet checks passed");
process.exit(fails ? 1 : 0);
