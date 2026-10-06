// Money check against a running test server: balance change must equal pnl every round.
// Point B at a running server in test mode (CRASH_TEST=1), e.g. B=http://127.0.0.1:3512/api/
const B = process.env.B || "http://127.0.0.1:3512/api/";
// Signs in with the demo login (test mode, no X keys) and keeps the session cookie.
const name = "tester" + Math.random().toString(36).slice(2, 8);
const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) });
const h = { "content-type": "application/json", cookie: (login.headers.get("set-cookie") || "").split(";")[0] };
const COIN = Object.keys((await fetch(B + "config").then((r) => r.json())).coins)[0];
const get = (p) => fetch(B + p, { headers: h }).then((r) => r.json());
const post = (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b) }).then(async (r) => ({ code: r.status, ...(await r.json()) }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, n = 0;
let bal = (await get("me")).balances[COIN];
// guards
for (const [amt, why] of [[999, "under min"], [10001, "over max"], ["x", "junk"]]) { const r = await post("buy", { coin: COIN, amount: amt }); if (r.code !== 400) { fails++; console.log("guard fail", why, r); } }
const N = Number(process.argv[2] || 12);
await Promise.all(Array.from({ length: 1 }, async () => {
  for (let i = 0; i < N; i++) {
    const bet = 1000 + Math.floor(Math.random() * 9000);
    const b = await post("buy", { coin: COIN, amount: bet, clientSeed: "t" + i });
    if (b.code !== 200) { fails++; console.log("buy fail", b); continue; }
    const dbl = await post("buy", { coin: COIN, amount: bet }); if (dbl.code !== 400) { fails++; console.log("double buy allowed"); }
    let half = null;
    if (Math.random() < 0.6) {
      await sleep(800 + Math.random() * 3000);
      half = await post("sell", { id: b.round.id, part: "half" });
      const again = await post("sell", { id: b.round.id, part: "half" });
      if (half.half && again.code !== 400) { fails++; console.log("second half allowed", again); }
    }
    const waitMs = Math.random() < 0.3 ? 400 : 1500 + Math.random() * 6000;
    await sleep(waitMs);
    const s = await post("sell", { id: b.round.id });
    const s2 = await post("sell", { id: b.round.id }); // second sell must not pay again
    let end = await get("wait?id=" + b.round.id); while (end.pending) end = await get("wait?id=" + b.round.id);
    const now = (await get("me")).balances[COIN];
    const delta = now - bal; bal = now; n++;
    const halfOk = !half || !half.half || end.halfPayout === Math.floor(Math.floor(bet / 2) * end.halfMult);
    const restOk = end.state !== "sold" || end.payout === (end.halfPayout || 0) + Math.floor((bet - (end.halfMult != null ? Math.floor(bet / 2) : 0)) * end.soldMult);
    if (delta !== end.pnl || end.payout - bet !== end.pnl || s2.balance !== s.balance || !halfOk || !restOk) { fails++; console.log("MONEY FAIL", { bet, delta, end, s, s2, half }); }
    console.log(`#${i} bet ${bet} half ${end.halfMult ?? "-"} ${end.state} sold ${end.soldMult} crash ${end.crash} shown ${end.crashShown} pnl ${end.pnl}`);
  }
}));
console.log(`rounds ${n}, fails ${fails}`);
