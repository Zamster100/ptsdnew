// Community jackpot logic (no server).   node test/jackpot.mjs
import Database from "better-sqlite3";
import { initJackpot } from "../src/jackpot.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const H = 3600_000, T = Date.parse("2026-11-03T15:00:00Z"); // 10 AM New York, Nov 3
// a day = 9 AM to 9 AM New York, same as the tasks reset (EST: 14:00 UTC)
const dayKey = (now) => new Date(now - 14 * H).toISOString().slice(0, 10);
const nextReset = (now) => { const d = dayKey(now); return Date.parse(d + "T14:00:00Z") + 24 * H; };

function fresh() {
  const db = new Database(":memory:");
  const bal = new Map();
  const pay = (p, n) => bal.set(p, (bal.get(p) || 0) + n);
  return { db, bal, j: initJackpot({ db, coin: "CREDITS", dayKey, nextReset, nameOf: (p) => "@" + p, pay }) };
}
const loss = (player, n, over = {}) => ({ id: "x", player, coin: "CREDITS", pnl: -n, state: "rekt", crash: 1.0, ...over }); // default: an instant rug

{ const { j } = fresh();
  check(j.pot() === 100_000, "the pot starts at its floor (100,000)");
  const r = j.onLoss(loss("a", 2500, { id: "r1" }), T);
  check(r.add === 125 && r.tickets === 2 && j.pot() === 100_125, "a 2,500 loss adds 5% (125) to the pot and earns 2 tickets", r);
  check(j.forRound("r1") === 2 && j.forRound("nope") === 0, "a round remembers the tickets it earned (for its popup)");
  check(j.onLoss(loss("a", 400), T).tickets === 1, "a small loss still earns 1 ticket");
  { const o = j.onLoss(loss("a", 3000, { crash: 1.1 }), T), p = j.onLoss(loss("a", 3000, { crash: 4.2 }), T);
    check(o.add === 150 && o.tickets === 0 && p.add === 150 && p.tickets === 0 && j.view("a", T).balance === 3, "a loss that wasn't an instant rug (1.10x or later) feeds the pot but earns no tickets"); }
  check(j.onLoss({ ...loss("a", 100), pnl: 500 }, T) === null && j.onLoss({ ...loss("a", 100), coin: "X" }, T) === null, "wins and other coins feed nothing");
  check(j.view("a", T).balance === 3 && j.view("b", T).balance === 0 && j.view(null, T).balance === 0, "view shows my ticket balance");
}
{ const { j } = fresh(); // tickets are a balance that carries over, capped at 2,000
  j.onLoss(loss("a", 900_000), T); j.onLoss(loss("a", 900_000), T);
  check(j.view("a", T).balance === 1800, "tickets add up in the balance (carry over, no daily limit)");
  const r = j.onLoss(loss("a", 900_000), T);
  check(r.tickets === 200 && j.view("a", T).balance === 2000 && j.view("a", T).holdMax === 2000, "the balance is capped at 2,000, only what fits is earned", r);
  check(j.onLoss(loss("a", 5000), T).tickets === 0 && j.view("a", T).balance === 2000, "a full balance earns nothing more");
}
// ---- pledging ----
{ const { j } = fresh();
  j.onLoss(loss("a", 10_000), T);
  check(j.pledge("a", 0, T).error && j.pledge("a", 11, T).error && j.pledge("b", 1, T).error && j.pledge(null, 1, T).error, "you can't pledge nothing, more than you hold, or with no tickets");
  const p = j.pledge("a", 4, T), v = j.view("a", T);
  check(p.pledged === 4 && v.balance === 6 && v.pledged === 4 && v.tickets === 10, "a pledge moves tickets from the balance into tonight's draw", v);
  check(j.pledge("a", 6, T).pledged === 6 && j.view("a", T).pledged === 10 && j.view("a", T).balance === 0, "you can top a pledge up");
  check(j.pledge("a", 1, T).error, "...and once the balance is empty there is nothing more to pledge");
  check(j.view("a", T).auto === true && j.view("b", T).auto === true, "auto-pledge is on by default");
}
{ const { j } = fresh(); // the share and the totals count what will be entered
  j.onLoss(loss("a", 10_000), T); j.onLoss(loss("b", 30_000), T); // a 10, b 30, both auto
  let v = j.view("a", T);
  check(v.entering === 10 && v.totalEntering === 40, "with auto-pledge on, what you hold counts as entered", v);
  j.setAuto("b", false); j.pledge("b", 5, T);
  v = j.view("a", T); const vb = j.view("b", T);
  check(v.totalEntering === 15 && vb.entering === 5 && vb.balance === 25, "with auto-pledge off, only what you pledged is entered", { v, vb });
}
// ---- daily draw ----
{ const { j, bal } = fresh();
  for (const p of ["a", "b", "c"]) j.onLoss(loss(p, 10_000), T); // 10 tickets each, +500 each to the pot
  const pot = j.pot();
  check(j.tick(T).length === 0, "nothing is drawn while the day is still running");
  const next = nextReset(T), out = j.tick(next + 5000);
  check(out.length === 1 && out[0].total === 30 && out[0].tickets === 10, "at 9 AM auto-pledge enters everyone's tickets and the day is drawn", out);
  const w = out[0];
  check(w.amount === Math.floor(pot * 0.5) && bal.get(w.player) === w.amount, "the winner is paid half the pot", { w, bal: [...bal] });
  check(j.pot() === Math.max(100_000, pot - w.amount), "the pot loses what was paid but never drops below its floor");
  check(j.tick(next + 10_000).length === 0, "a day is only drawn once");
  const v = j.view("a", next + 10_000);
  check(v.winners.length === 1 && v.winners[0].kind === "daily" && v.winners[0].name === "@" + w.player && v.winners[0].tickets === 10 && v.winners[0].total === 30, "the winners list shows who won, with their tickets out of the total", v.winners);
  check(v.tickets === 0 && v.totalEntering === 0 && v.balance === 0, "pledged tickets are spent: the new day starts at zero");
  check(j.takeUnseen(w.player).length === 1 && j.takeUnseen(w.player).length === 0, "the winner is told once, next time they open the game");
}
{ const { j, bal } = fresh(); // auto-pledge off: nobody pledged, nothing happens and the tickets carry over
  j.onLoss(loss("a", 10_000), T); j.setAuto("a", false); j.tick(T);
  check(j.tick(nextReset(T) + 5000).length === 0 && j.view("a", nextReset(T) + 6000).balance === 10 && bal.size === 0, "with auto-pledge off, unpledged tickets are not entered and carry over");
  j.pledge("a", 10, nextReset(T) + 6000);
  const out = j.tick(nextReset(T) + 24 * H + 5000);
  check(out.length === 1 && out[0].player === "a" && out[0].tickets === 10, "pledging by hand enters the next draw", out);
}
{ const { j } = fresh(); // a pledge made late in the day is what gets drawn; the unpledged rest stays
  j.onLoss(loss("a", 20_000), T); j.onLoss(loss("b", 20_000), T); j.setAuto("a", false); j.setAuto("b", false); j.tick(T);
  j.pledge("a", 5, T + H); j.pledge("b", 15, T + H);
  const out = j.tick(nextReset(T) + 5000);
  check(out.length === 1 && out[0].total === 20 && j.view("a", nextReset(T) + 6000).balance === 15 && j.view("b", nextReset(T) + 6000).balance === 5, "only pledged tickets are drawn, the rest stays in the balance", out);
}
{ const { j } = fresh(); // downtime: several days with pledges are all caught up, oldest first
  for (const p of ["a", "b", "c"]) { j.onLoss(loss(p, 5000), T); j.setAuto(p, false); }
  j.pledge("a", 5, T); j.pledge("b", 5, T + 24 * H); j.pledge("c", 5, T + 48 * H);
  const out = j.tick(T + 100 * H);
  check(out.length === 3 && out.map((w) => w.player).join() === "a,b,c", "after downtime every missed day is drawn, oldest first", out);
}
{ let big = 0; // weighted by tickets: a player with ~all tickets wins nearly always
  for (let i = 0; i < 200; i++) {
    const f = fresh(); f.j.onLoss(loss("whale", 99_000), T); f.j.onLoss(loss("tiny", 1000), T); f.j.tick(T);
    if (f.j.tick(nextReset(T) + 1)[0].player === "whale") big++;
  }
  check(big > 175 && big <= 200, "the draw is weighted by tickets (99 vs 1: the 99 wins about 99% of draws)", big);
}
{ const { j } = fresh(); // an empty day rolls over: nothing paid, no crash
  check(j.tick(T + 40 * H).length === 0 && j.pot() === 100_000, "no tickets, no draw, the pot stays");
}
{ // tickets from before raffle tickets were a balance (per-day entries) become balance
  const db = new Database(":memory:");
  db.exec("CREATE TABLE crash_jackpot_tix (day TEXT NOT NULL, player TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, player))");
  db.prepare("INSERT INTO crash_jackpot_tix VALUES('2026-11-01','old',7)").run();
  const j = initJackpot({ db, coin: "CREDITS", dayKey, nextReset, nameOf: (p) => "@" + p, pay: () => {} });
  check(j.view("old", T).balance === 7, "old per-day tickets are carried into the balance");
}
// ---- Pot Breaker ----
{ const { j, bal } = fresh();
  j.onLoss(loss("a", 100_000), T); // pot 105,000
  const sold = (p, x) => ({ id: "s", player: p, coin: "CREDITS", state: "sold", sold_mult: x, pnl: 5000 });
  check(j.onSold(sold("b", 49.99), T) === null && j.pot() === 105_000, "selling at 49.99x doesn't break the pot");
  const r = j.onSold(sold("b", 50), T);
  check(r && r.amount === 105_000 && bal.get("b") === 105_000 && j.pot() === 100_000, "selling at 50x takes the whole pot and it restarts at the floor", { r, bal: [...bal] });
  check(j.onSold(sold("c", 70), T).amount === 100_000, "the next 50x takes whatever is in it (the floor)");
  const v = j.view("b", T);
  check(v.winners[0].kind === "breaker" && v.winners[1].name === "@b", "breakers are in the winners list", v.winners);
  check(j.takeUnseen("b").length === 0, "the breaker was told in the sell response, not again");
  check(j.onSold({ ...sold("d", 80), state: "rekt" }, T) === null, "a rekt round never breaks the pot");
}
{ process.env.JACKPOT = "0";
  const { j } = fresh();
  check(j.onLoss(loss("a", 5000), T) === null && j.tick(T + 100 * H).length === 0, "JACKPOT=0 switches it off"); delete process.env.JACKPOT; }
{ process.env.JACKPOT_SHARE = "0.1"; process.env.JACKPOT_BREAKER_X = "10"; process.env.JACKPOT_TICKET_PER = "500"; process.env.JACKPOT_DAILY_SHARE = "0.25";
  const { j } = fresh();
  const r = j.onLoss(loss("a", 2000), T);
  check(r.add === 200 && r.tickets === 4 && j.cfg.breakerX === 10 && j.cfg.dailyShare === 0.25, "share, ticket price, breaker multiplier and daily share are settings", r);
  for (const k of ["JACKPOT_SHARE", "JACKPOT_BREAKER_X", "JACKPOT_TICKET_PER", "JACKPOT_DAILY_SHARE"]) delete process.env[k]; }

console.log(fails ? `FAILED: ${fails}` : "all jackpot checks passed");
process.exit(fails ? 1 : 0);
