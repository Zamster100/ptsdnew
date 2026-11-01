// Referral check: code use + bonus, qualifying (5 rounds), +5000 profit for the referrer, the per-referrer cap,
// and "real X only".   node test/referrals.mjs   (takes about a minute: it plays real rounds)
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };

function startServer(port, extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-ref-"));
  const now = Date.now();
  const proc = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
    ...process.env, PORT: String(port), HOST: "127.0.0.1", CRASH_BASE: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
    DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "2500", START_CREDITS: "0", DAILY_CREDITS: "10000",
    NFT_CONTRACT: "", NFT_RPC_URL: "",
    CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
    LOGIN_STEP: "0", ACHIEVEMENTS: "0", // the daily login bonus would add Activity points to the exact XP checked here
    ...extra,
  } });
  return { proc, dir, B: `http://127.0.0.1:${port}/api/` };
}
async function player(B, name) {
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) });
  const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
  const pl = {
    name,
    get: (p) => fetch(B + p, { headers: h }).then((r) => r.json()),
    post: (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, ...(await r.json()) })),
  };
  return pl;
}
async function onboard(pl) { await pl.get("me"); await pl.post("claim", { kind: "starter" }); }
async function round(pl) {
  const b = await pl.post("buy", { coin: "CREDITS", amount: 100, clientSeed: "r" + Math.random() });
  if (b.code !== 200) throw new Error("buy failed " + JSON.stringify(b));
  await sleep(900);
  await pl.post("sell", { id: b.round.id });
  let e = await pl.get("wait?id=" + b.round.id); while (e.pending) e = await pl.get("wait?id=" + b.round.id);
}
async function boardRow(pl, handle) {
  for (let i = 0; i < 40; i++) { const lb = await pl.get("leaderboard?limit=100"); const r = (lb.top || []).find((x) => x.username === handle); if (r) return r; await sleep(500); }
  return null;
}
async function ready(B) { for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); return; } catch { await sleep(200); } } }

const s1 = startServer(3595, { REF_REQUIRE_X: "0", REF_MAX: "2" });
const s2 = startServer(3594, {}); // real X required (default): demo logins must not qualify
try {
  await ready(s1.B); await ready(s2.B);
  const B = s1.B;
  const R = await player(B, "refr"); await onboard(R);
  check((await R.get("me")).ref.code === "refr" && (await R.get("me")).ref.max === 2, "owner sees their code and the cap");

  const A = await player(B, "refa"), Bb = await player(B, "refb"), C = await player(B, "refc"), D = await player(B, "refd");
  check((await A.post("referral/apply", { code: "nobody_here" })).code === 404, "unknown code is refused");
  check((await A.post("referral/apply", { code: "refa" })).code === 404, "own code is refused");
  const a1 = await A.post("referral/apply", { code: "@Refr" });
  check(a1.code === 200 && a1.bonus === 10000 && a1.by === "refr", "code (any case, with @) works and returns the bonus", a1);
  check((await A.get("me")).balances.CREDITS === 20000, "referred player starts with 10k + 10k bonus");
  check((await A.post("referral/apply", { code: "refr" })).code === 400, "a second code is refused");
  await onboard(D); await round(D);
  check((await D.post("referral/apply", { code: "refr" })).code === 400, "a code is refused once you have played a round");

  await onboard(A); await onboard(Bb); await onboard(C);
  check((await Bb.post("referral/apply", { code: "refr" })).code === 200 && (await C.post("referral/apply", { code: "refr" })).code === 200, "two more players use the code");

  // 4 rounds is not enough, 5 qualifies
  for (let i = 0; i < 4; i++) await round(A);
  await sleep(11_000);
  const early = await boardRow(R, "refr");
  check(!early || early.refs === 0, "4 rounds: the referral does not count yet", early && { refs: early.refs });
  const st = (await R.get("me")).ref;
  check(st.pending === 3 && st.counted === 0, "owner sees 3 pending, 0 counted", st);

  await round(A);
  await Promise.all([ (async () => { for (let i = 0; i < 5; i++) await round(Bb); })(), (async () => { for (let i = 0; i < 5; i++) await round(C); })() ]);
  await sleep(11_000);
  let row = null;
  for (let i = 0; i < 30; i++) { row = await boardRow(R, "refr"); if (row && row.refs === 10000) break; await sleep(1000); }
  check(row && row.refs === 10000, "3 qualified referrals but the cap is 2: the referrer gets 2 x 5000", row && { refs: row.refs });
  check(row && row.xp === row.net + row.refs && row.rounds === 0 && row.xp === 10000, "referral points count in XP (a referrer with no rounds still ranks)", row && { xp: row.xp, net: row.net });
  const st2 = (await R.get("me")).ref;
  check(st2.counted === 2 && st2.pending === 0 && st2.refs.some((x) => x.status === "over the cap"), "owner sees 2 counted and one over the cap", st2);
  const prof = await fetch(B + "profile/refr").then((r) => r.json());
  check(prof.referrals === 2 && prof.refs === 10000 && prof.xp === 10000, "profile shows 2 referrals, their points and the XP", { r: prof.referrals, refs: prof.refs, xp: prof.xp });

  // real X required: demo accounts never qualify on the default server
  const B2 = s2.B;
  const R2 = await player(B2, "xrefr"); await onboard(R2);
  const Z = await player(B2, "xrefz"); await onboard(Z);
  check((await Z.post("referral/apply", { code: "xrefr" })).code === 200, "(default server) code accepted");
  for (let i = 0; i < 5; i++) await round(Z);
  await sleep(11_000);
  const st3 = (await R2.get("me")).ref;
  check(st3.counted === 0 && st3.refs[0]?.status === "not eligible", "a non-X account never counts for the referrer", st3);
} finally {
  for (const s of [s1, s2]) { s.proc.kill(); }
  await sleep(300);
  for (const s of [s1, s2]) { try { fs.rmSync(s.dir, { recursive: true, force: true }); } catch {} }
}
console.log(fails ? `FAILED: ${fails}` : "all referral checks passed");
process.exit(fails ? 1 : 0);
