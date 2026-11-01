// Double XP hour check (no server): the daily window across daylight saving, and what gets doubled.   node test/doublexp.mjs
import Database from "better-sqlite3";
import { initDoubleXp } from "../src/doublexp.js";
import { initXp } from "../src/xp.js";
import { initStreaks } from "../src/streaks.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const iso = (s) => Date.parse(s);
const dxp = initDoubleXp(); // 9:00 to 10:00 AM New York, x2

// ---- the window (9 AM Eastern = 14:00 UTC in winter, 13:00 UTC in summer) ----
let s = dxp.state(iso("2026-11-03T14:30:00Z"));
check(s.active && s.mult === 2 && s.current.start === iso("2026-11-03T14:00:00Z") && s.current.end === iso("2026-11-03T15:00:00Z"), "winter: 14:30 UTC is inside 9-10 AM EST", s.current);
s = dxp.state(iso("2026-11-03T13:59:59Z"));
check(!s.active && s.upcoming[0].start === iso("2026-11-03T14:00:00Z"), "one second before 9 AM: not active, next window starts at 9:00", s.upcoming[0]);
s = dxp.state(iso("2026-11-03T14:00:00Z")); check(s.active, "active from exactly 9:00:00");
s = dxp.state(iso("2026-11-03T14:59:59Z")); check(s.active, "still active at 9:59:59");
s = dxp.state(iso("2026-11-03T15:00:00Z"));
check(!s.active && s.upcoming[0].start === iso("2026-11-04T14:00:00Z") && s.upcoming[1].start === iso("2026-11-05T14:00:00Z"), "at 10:00 it is over; the next two windows are tomorrow and the day after", s.upcoming);
s = dxp.state(iso("2026-07-15T13:30:00Z")); check(s.active && s.current.start === iso("2026-07-15T13:00:00Z"), "summer: 9 AM EDT is 13:00 UTC", s.current);
s = dxp.state(iso("2026-07-15T14:30:00Z")); check(!s.active, "summer: 14:30 UTC is already after the hour");

// daylight saving: the window must stay at 9 AM local on the days the clocks change
s = dxp.state(iso("2026-10-31T13:30:00Z")); check(s.active, "the day before clocks go back (EDT): 13:30 UTC active");
s = dxp.state(iso("2026-11-01T13:30:00Z")); check(!s.active && s.upcoming[0].start === iso("2026-11-01T14:00:00Z"), "clocks went back (Nov 1): 13:30 UTC is only 8:30 AM, window is at 14:00 UTC", s.upcoming[0]);
s = dxp.state(iso("2026-11-01T14:30:00Z")); check(s.active, "clocks went back: 14:30 UTC is inside the window");
s = dxp.state(iso("2027-03-13T14:30:00Z")); check(s.active, "the day before clocks go forward (EST): 14:30 UTC active");
s = dxp.state(iso("2027-03-14T13:30:00Z")); check(s.active, "clocks went forward (Mar 14): window moved to 13:00 UTC");
s = dxp.state(iso("2027-03-14T14:30:00Z")); check(!s.active, "clocks went forward: 14:30 UTC is already over");
s = dxp.state(iso("2026-11-03T03:00:00Z")); check(!s.active && s.upcoming[0].start === iso("2026-11-03T14:00:00Z"), "late at night the next window is still today's 9 AM", s.upcoming[0]);

// ---- settings ----
process.env.DOUBLE_XP_HOUR = "21"; process.env.DOUBLE_XP_MINUTES = "30"; process.env.DOUBLE_XP_MULT = "3"; process.env.DOUBLE_XP_TASKS = "1";
const c = initDoubleXp();
s = c.state(iso("2026-11-03T02:15:00Z")); // 9:15 PM EST on Nov 2
check(s.active && s.mult === 3 && s.tasks === true && s.applies.includes("task points"), "hour, length, multiplier and the tasks switch come from the environment", s);
check(!c.state(iso("2026-11-03T02:31:00Z")).active, "a 30 minute window ends after 30 minutes");
process.env.DOUBLE_XP_HOUR = "99"; process.env.DOUBLE_XP_MINUTES = "0"; process.env.DOUBLE_XP_MULT = "0.2";
const bad = initDoubleXp();
check(bad.cfg.hour === 23 && bad.cfg.minutes === 1 && bad.cfg.mult === 1, "out-of-range settings are clamped (hour 23, at least 1 minute, never below 1x)", bad.cfg);
for (const k of ["DOUBLE_XP_HOUR", "DOUBLE_XP_MINUTES", "DOUBLE_XP_MULT", "DOUBLE_XP_TASKS"]) delete process.env[k];

// ---- what doubles: Activity points, at the moment they are earned ----
const db = new Database(":memory:");
db.exec("CREATE TABLE crash_rounds (id TEXT PRIMARY KEY, player TEXT, state TEXT, pnl INTEGER, ts INTEGER)");
let boost = 1;
const xp = initXp({ db, cycles: { current: () => ({ id: 1 }) }, boost: () => boost });
const streaks = initStreaks({ db, xp, dayKey: () => "2026-11-03" });
const pts = (p) => xp.activityMap(1).get(p) || 0;
let n = 0;
const settle = (player, o = {}) => streaks.onSettled({ id: "r" + ++n, player, state: "sold", pnl: 1000, sold_mult: o.mult ?? 2, crash: o.crash ?? 5 });

settle("a"); let r = settle("a");
check(r.streakXp === 100 && r.boost === 1 && pts("a") === 100, "no boost: the 2-win streak pays 100", r);
boost = 2;
r = settle("a"); check(r.streakXp === 300 && r.boost === 2 && pts("a") === 400, "Double XP hour: the 3-win streak pays 2 x 150 = 300", r);
r = settle("b", { mult: 10, crash: 10.2 }); check(r.perfectXp === 1000 && r.boost === 2, "Double XP hour: a perfect sell pays 1,000", r);
const ci = streaks.checkIn("c"); check(ci.xp === 200 && ci.boost === 2, "Double XP hour: the day-1 login bonus pays 200", ci);
boost = 1;
check(pts("a") === 400 && pts("b") === 1000, "points earned during the hour keep their doubled value afterwards");
check(xp.addActivity("z", "test", 100, Date.now()) === 100, "outside the hour the same bonus pays face value again");
const row = db.prepare("SELECT points, boost FROM crash_activity WHERE player='b'").get();
check(row.points === 1000 && row.boost === 2, "the multiplier that was applied is stored with the points", row);

console.log(fails ? `FAILED: ${fails}` : "all Double XP checks passed");
process.exit(fails ? 1 : 0);
