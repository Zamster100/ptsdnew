// Streak rules check (no server, in-memory DB).   node test/streaks.mjs
import Database from "better-sqlite3";
import { initXp } from "../src/xp.js";
import { initStreaks } from "../src/streaks.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };

const db = new Database(":memory:");
db.exec("CREATE TABLE crash_rounds (id TEXT PRIMARY KEY, player TEXT, state TEXT, pnl INTEGER, ts INTEGER)");
let live = true; // is a cycle running?
const xp = initXp({ db, cycles: { current: () => (live ? { id: 1 } : null) } });
let day = "2026-11-02";
const streaks = initStreaks({ db, xp, dayKey: () => day });
const points = (p) => xp.activityMap(1).get(p) || 0;

let n = 0;
// settle one round: win = profit; sold at mult against a crash point
const settle = (player, { win = true, mult = 2, crash = 5, state = "sold" } = {}) =>
  streaks.onSettled({ id: "r" + ++n, player, state: win ? state : "rekt", pnl: win ? 1000 : -1000, sold_mult: win ? mult : null, crash });

// ---- win streak ----
let r = settle("a");
check(r.streak === 1 && r.streakXp === 0 && points("a") === 0, "first win: streak 1, no bonus yet", r);
r = settle("a"); check(r.streak === 2 && r.streakXp === 100 && points("a") === 100, "second win in a row: 2 x 50 = 100", r);
r = settle("a"); check(r.streak === 3 && r.streakXp === 150 && points("a") === 250, "third: 3 x 50 = 150", r);
r = settle("a", { win: false }); check(r.streak === 0 && r.streakXp === 0 && points("a") === 250, "a loss resets the streak and pays nothing", r);
r = settle("a"); check(r.streak === 1 && r.streakXp === 0, "after a loss the next win is streak 1 again", r);
for (let i = 0; i < 11; i++) r = settle("a");
check(r.streak === 12 && r.streakXp === 500, "the bonus is capped at 10 x 50 = 500", r);
check(streaks.stateOf("a").bestWin === 12 && streaks.stateOf("a").win === 12 && streaks.stateOf("a").nextWin === 500, "state: current, best and next bonus", streaks.stateOf("a"));

// ---- perfect sell ----
const base = points("b");
r = settle("b", { mult: 10, crash: 10.4 }); check(r.perfect && r.perfectXp === 500, "sold at 10x, crash 10.4x (within 5%): perfect sell +500", r);
r = settle("b", { mult: 9, crash: 10.4 }); check(!r.perfect && r.perfectXp === 0, "sold at 9x, crash 10.4x (13% short): not perfect", r);
r = settle("b", { mult: 1.3, crash: 1.31 }); check(!r.perfect, "under 1.5x never counts as a perfect sell", r);
r = settle("b", { mult: 4.75, crash: 5 }); check(r.perfect, "exactly 5% short still counts", r);
r = settle("b", { win: false, crash: 5 }); check(!r.perfect, "a rekt round is never a perfect sell", r);
check(points("b") - base >= 1000, "perfect sells were paid as XP points", points("b") - base);

// ---- an existing player starts from the rounds they already played ----
for (let i = 1; i <= 3; i++) db.prepare("INSERT INTO crash_rounds(id,player,state,pnl,ts) VALUES(?,?,?,?,?)").run("old" + i, "c", "sold", 500, i);
db.prepare("INSERT INTO crash_rounds(id,player,state,pnl,ts) VALUES(?,?,?,?,?)").run("oldloss", "c", "rekt", -500, 0); // earlier loss: streak is 3, not 4
r = settle("c"); check(r.streak === 4 && r.streakXp === 200, "history is counted: 3 earlier wins + this one = streak 4", r);

// ---- no cycle running: the streak counts, no points are paid ----
live = false;
r = settle("d"); r = settle("d");
check(r.streak === 2 && r.streakXp === 0 && xp.activityMap(1).get("d") === undefined, "outside a cycle: streak counts, nothing is paid", r);
live = true;

// ---- login streak ----
let ci = streaks.checkIn("e"); check(ci.isNew && ci.streak === 1 && ci.xp === 100, "first visit: day 1 pays 100", ci);
ci = streaks.checkIn("e"); check(!ci.isNew && ci.xp === 0, "second visit the same day pays nothing", ci);
day = "2026-11-03"; ci = streaks.checkIn("e"); check(ci.isNew && ci.streak === 2 && ci.xp === 200, "next day: day 2 pays 200", ci);
day = "2026-11-05"; ci = streaks.checkIn("e"); check(ci.isNew && ci.streak === 1 && ci.xp === 100, "a missed day starts over at day 1", ci);
let last;
for (const d of ["06", "07", "08", "09", "10", "11", "12"]) { day = "2026-11-" + d; last = streaks.checkIn("e"); }
check(last.streak === 8 && last.xp === 700, "the daily bonus is capped at day 7 (700)", last);
check(streaks.stateOf("e").bestLogin === 8 && streaks.stateOf("e").loginToday === true && streaks.stateOf("e").login === 8, "state: login streak", streaks.stateOf("e"));
day = "2026-12-01"; check(streaks.stateOf("e").login === 0 && streaks.stateOf("e").nextLogin === 100, "a streak that lapsed shows as 0 and restarts at day 1", streaks.stateOf("e"));
day = "2026-12-31"; ci = streaks.checkIn("e"); day = "2027-01-01";
check(streaks.checkIn("e").streak === 2, "day counting works across a year boundary", ci);
live = false; day = "2027-02-01"; ci = streaks.checkIn("e"); check(ci.isNew && ci.xp === 0, "login outside a cycle: counted, not paid", ci);

console.log(fails ? `FAILED: ${fails}` : "all streak checks passed");
process.exit(fails ? 1 : 0);
