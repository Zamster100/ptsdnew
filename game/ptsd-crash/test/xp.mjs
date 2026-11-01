// XP formula check (no server).   node test/xp.mjs
import { xpOf, levelInfo, xpForLevel, stageOf, LEVEL_CAP, STAGES } from "../src/xp.js";
import { multOf, TIERS } from "../src/wallet.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const eq = (got, want, what) => check(JSON.stringify(got) === JSON.stringify(want), what, { got, want });

eq(xpOf({ pnl: 4000, tasks: 2000, refs: 5000, activity: 500 }, 1.5), { total: 11500, mult: 1.5, xp: 17250 }, "positive total: the Ticket multiplier applies");
eq(xpOf({ pnl: -6000, tasks: 2000, activity: 500 }, 1.5), { total: -3500, mult: 1, xp: -3500 }, "negative total: no multiplier, Tickets never make it worse");
eq(xpOf({ pnl: -6000, tasks: 8000 }, 1.5), { total: 2000, mult: 1.5, xp: 3000 }, "task points lift a negative PNL back above 0: multiplier switches on");
eq(xpOf({ pnl: 0 }, 1.5), { total: 0, mult: 1, xp: 0 }, "zero stays zero");
eq(xpOf({ pnl: 1001 }, 1.1), { total: 1001, mult: 1.1, xp: 1101 }, "XP is rounded to a whole number");
eq(xpOf({ pnl: 1000, tasks: 500 }), { total: 1500, mult: 1, xp: 1500 }, "no Tickets: multiplier 1");
eq(xpOf({ refs: 5000 }, 1.2), { total: 5000, mult: 1.2, xp: 6000 }, "referral points alone rank (no rounds needed)");

// a PNL reset only zeroes the PNL part: tasks/refs/activity are untouched
const before = xpOf({ pnl: -8000, tasks: 3000, refs: 5000, activity: 200 }, 1.3), after = xpOf({ pnl: 0, tasks: 3000, refs: 5000, activity: 200 }, 1.3);
check(before.xp === 260 && after.xp === Math.round(8200 * 1.3), "a PNL reset keeps task, referral and activity points", { before, after });

check(multOf(0) === 1 && multOf(1) === 1.1 && multOf(2) === 1.2 && multOf(3) === 1.3 && multOf(4) === 1.3 && multOf(5) === 1.4 && multOf(10) === 1.5 && multOf(40) === 1.5, "Ticket tiers: 1 / 1.1 / 1.2 / 1.3 / 1.4 / 1.5 at 0 / 1 / 2 / 3 / 5 / 10 Tickets");
check(Math.max(...TIERS.map((t) => t.mult)) <= 1.5, "the multiplier is capped at 1.5x");
// ---- levels ----
const L0 = levelInfo(0), L499 = levelInfo(499), L500 = levelInfo(500);
check(L0.n === 1 && L0.name === "Fresh Bag" && L0.floor === 0 && L0.next === 500, "0 level XP = level 1, Fresh Bag", L0);
check(L499.n === 1 && L500.n === 2 && L500.floor === 500, "level 2 starts at exactly 500 level XP", { L499: L499.n, L500: L500.n });
check(levelInfo(-5000).n === 1 && levelInfo(NaN).n === 1 && levelInfo(undefined).n === 1, "negative or missing level XP is level 1");
let rising = true; for (let n = 2; n <= LEVEL_CAP; n++) if (xpForLevel(n) <= xpForLevel(n - 1)) rising = false;
check(rising, "every level needs more XP than the one before");
check(levelInfo(1e9).n === LEVEL_CAP && levelInfo(1e9).next === null && levelInfo(1e9).pct === 100 && levelInfo(1e9).name === "Legend", "level caps at 30 (Legend)");
check(stageOf(4).name === "Fresh Bag" && stageOf(5).name === "Paper Hands" && stageOf(9).name === "Paper Hands" && stageOf(10).name === "Diamond Hands" && stageOf(30).name === "Legend", "a new badge stage every 5 levels", STAGES.map((s) => s.from));
const mid = levelInfo(xpForLevel(10) + 100);
check(mid.n === 10 && mid.nextStage.from === 15 && mid.nextStage.name === "Chart Reader" && mid.pct >= 0 && mid.pct < 5, "progress and next badge stage", mid);
console.log(fails ? `FAILED: ${fails}` : "all XP checks passed");
process.exit(fails ? 1 : 0);
