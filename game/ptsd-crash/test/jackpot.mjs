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
  const r = j.onLoss(loss("a", 2500), T);
  check(r.add === 125 && r.tickets === 2 && j.pot() === 100_125, "a 2,500 loss adds 5% (125) to the pot and earns 2 tickets", r);
  check(j.onLoss(loss("a", 400), T).tickets === 1, "a small loss still earns 1 ticket");
  { const o = j.onLoss(loss("a", 3000, { crash: 1.1 }), T), p = j.onLoss(loss("a", 3000, { crash: 4.2 }), T);
    check(o.add === 150 && o.tickets === 0 && p.add === 150 && p.tickets === 0 && j.view("a", T).tickets === 3, "a loss that wasn't an instant rug (1.10x or later) feeds the pot but earns no tickets"); }
  check(j.onLoss({ ...loss("a", 100), pnl: 500 }, T) === null && j.onLoss({ ...loss("a", 100), coin: "X" }, T) === null, "wins and other coins feed nothing");
  check(j.view("a", T).tickets === 3 && j.view("b", T).tickets === 0 && j.view(null, T).tickets === 0, "view shows my tickets for today");
}
{ const { j } = fresh(); // cap per player per day
  j.onLoss(loss("a", 400_000), T);
  check(j.view("a", T).tickets === 400, "400,000 lost earns 400 tickets");
  j.onLoss(loss("a", 400_000), T);
  check(j.view("a", T).tickets === 500, "tickets are capped at 500 a day");
  const { j: j2 } = fresh(); j2.onLoss(loss("a", 900_000), T);
  check(j2.view("a", T).tickets === 500, "...even for a single huge loss");
}
// ---- daily draw ----
{ const { j, bal } = fresh();
  for (const p of ["a", "b", "c"]) j.onLoss(loss(p, 10_000), T); // 10 tickets each, +500 each to the pot
  const pot = j.pot();
  check(j.tick(T).length === 0, "nothing is drawn while the day is still running");
  const next = nextReset(T), out = j.tick(next + 5000);
  check(out.length === 1 && out[0].total === 30 && out[0].tickets === 10, "at 9 AM the day's tickets are drawn", out);
  const w = out[0];
  check(w.amount === Math.floor(pot * 0.5) && bal.get(w.player) === w.amount, "the winner is paid half the pot", { w, bal: [...bal] });
  check(j.pot() === Math.max(100_000, pot - w.amount), "the pot loses what was paid but never drops below its floor");
  check(j.tick(next + 10_000).length === 0, "a day is only drawn once");
  const v = j.view("a", next + 10_000);
  check(v.winners.length === 1 && v.winners[0].kind === "daily" && v.winners[0].name === "@" + w.player && v.winners[0].tickets === 10 && v.winners[0].total === 30, "the winners list shows who won, with their tickets out of the total", v.winners);
  check(v.tickets === 0 && v.totalTickets === 0, "after the draw the new day starts at zero tickets");
  check(j.takeUnseen(w.player).length === 1 && j.takeUnseen(w.player).length === 0, "the winner is told once, next time they open the game");
}
{ const { j, bal } = fresh(); // downtime: several days missed are all caught up
  j.onLoss(loss("a", 5000), T); j.onLoss(loss("b", 5000), T + 24 * H); j.onLoss(loss("c", 5000), T + 48 * H);
  const out = j.tick(T + 100 * H);
  check(out.length === 3 && out.map((w) => w.player).join() === "a,b,c", "after downtime every missed day is drawn, oldest first", out);
}
{ const { j } = fresh(); // weighted by tickets: a player with ~all tickets wins nearly always
  let big = 0;
  for (let i = 0; i < 200; i++) {
    const f = fresh(); f.j.onLoss(loss("whale", 99_000), T); f.j.onLoss(loss("tiny", 1000), T);
    if (f.j.tick(nextReset(T) + 1)[0].player === "whale") big++;
  }
  check(big > 175 && big < 200, "the draw is weighted by tickets (99 vs 1: the 99 wins about 99% of draws)", big);
}
{ const { j } = fresh(); // an empty day rolls over: nothing paid, no crash
  check(j.tick(T + 40 * H).length === 0 && j.pot() === 100_000, "no tickets, no draw, the pot stays");
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
