// Perks, achievements and community milestones (no server).   node test/rewards.mjs
import Database from "better-sqlite3";
import { claimPct, claimMult, PERKS } from "../src/perks.js";
import { initAchievements, CATALOG } from "../src/achievements.js";
import { initMilestones } from "../src/milestones.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };

// ---- perks ----
check(claimPct(1) === 0 && claimPct(4) === 0 && claimPct(5) === 5 && claimPct(9) === 5 && claimPct(10) === 10 && claimPct(22) === 20 && claimPct(30) === 30, "claim bonus steps up with each badge stage");
check(claimMult(5) === 1.05 && Math.round(100000 * claimMult(30)) === 130000, "level 5 pays 5% more, level 30 pays 30% more");
check(PERKS.length === 6 && PERKS.every((p, i, a) => !i || p.claimPct > a[i - 1].claimPct), "six stages, each better than the last");
process.env.PERKS = "0"; check(claimPct(30) === 0 && claimMult(30) === 1, "PERKS=0 switches perks off"); delete process.env.PERKS;

// ---- achievements ----
function fresh() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE crash_rounds (id TEXT PRIMARY KEY, player TEXT, coin TEXT, state TEXT, sold_mult REAL, pnl INTEGER, edge REAL);" +
    "CREATE TABLE crash_activity (player TEXT, kind TEXT, points INTEGER, ts INTEGER)");
  const paid = [];
  const xp = { addActivity: (p, kind, pts) => paid.push([p, kind, pts]) };
  const st = { bestWin: 0, bestLogin: 0 };
  const streaks = { stateOf: () => st };
  let nft = 0;
  const ach = initAchievements({ db, xp, streaks, nftCount: () => nft, coin: "CREDITS", baseEdge: 0.05 });
  let n = 0;
  const round = (o = {}) => {
    const r = { id: "r" + ++n, player: "a", coin: "CREDITS", state: "sold", sold_mult: 1.5, pnl: 500, edge: 0.05, ...o };
    db.prepare("INSERT INTO crash_rounds VALUES(@id,@player,@coin,@state,@sold_mult,@pnl,@edge)").run(r); return r;
  };
  return { db, ach, round, paid, st, setNft: (v) => (nft = v) };
}
const keys = (a) => a.map((x) => x.key).sort().join();
{ const { ach, round, paid } = fresh();
  check(ach.evaluate("a").length === 0, "a new player has nothing");
  const r = round(); const got = ach.evaluate("a", r.id);
  check(keys(got) === "r1,w1", "the first winning round unlocks First Trade and In The Green", keys(got));
  check(ach.evaluate("a", "x").length === 0, "an achievement unlocks only once");
  check(paid.length === 2 && paid.every((p) => p[1] === "achievement") && paid[0][2] + paid[1][2] === 200, "each unlock pays its XP once as activity points", paid);
  check(ach.forRound(r.id).length === 2 && ach.forRound(r.id).length === 2 && true, "the round's popup lists them");
  check(ach.takeUnseen("a").length === 0, "...and they are not announced again later");
}
{ const { ach, round } = fresh();
  round({ state: "rekt", sold_mult: null, pnl: -1000 });
  check(keys(ach.evaluate("a")) === "k1,r1", "a first rekt unlocks Welcome To The Rug");
  for (let i = 0; i < 9; i++) round({ state: "rekt", sold_mult: null, pnl: -1000 });
  const got = ach.evaluate("a");
  check(keys(got) === "k10", "ten rekts unlock Rug Survivor", keys(got));
}
{ const { ach, round } = fresh();
  round({ sold_mult: 12 }); const got = ach.evaluate("a").map((a) => a.key);
  check(["m2", "m5", "m10"].every((k) => got.includes(k)) && !got.includes("m25"), "one 12x sell unlocks the 2x, 5x and 10x sells together", got);
}
{ const { ach, round } = fresh();
  round({ edge: 0.2, sold_mult: 2.5 }); round({ edge: -0.1, pnl: 400, sold_mult: 1.4 });
  const got = ach.evaluate("a").map((a) => a.key);
  check(got.includes("f1") && got.includes("g1"), "a win in a Fear window and a 2x+ sell in a Greed window unlock theirs", got);
  const b = fresh(); b.round({ sold_mult: 3 }); b.round({ pnl: 300 });
  const g2 = b.ach.evaluate("a").map((a) => a.key);
  check(!g2.includes("f1") && !g2.includes("g1"), "normal-odds wins don't count for them", g2);
}
{ const { ach, setNft, st } = fresh();
  check(!ach.evaluate("a").some((a) => a.key === "n1"), "no Ticket, no Ticket Holder");
  setNft(2); st.bestWin = 3; st.bestLogin = 7;
  const got = ach.evaluate("a").map((a) => a.key);
  check(["n1", "s3", "l3", "l7"].every((k) => got.includes(k)), "Ticket, win streak and login streak achievements unlock from their sources", got);
  const v = ach.view("a");
  check(v.total === CATALOG.length && v.unlocked === got.length && v.list.find((a) => a.key === "n1").unlocked, "the view lists every achievement with what is unlocked");
  check(ach.takeUnseen("a").length === got.length && ach.takeUnseen("a").length === 0, "unlocks without a round are announced once via takeUnseen");
}
{ const { ach, round } = fresh();
  for (let i = 0; i < 8; i++) round({ pnl: 100, sold_mult: 1.2 });
  const v = ach.view("a"), p = v.list.find((a) => a.key === "r25"), w = v.list.find((a) => a.key === "w10");
  check(!p.unlocked && p.have === 8 && p.goal === 25 && !w.unlocked && w.have === 8, "locked ones show progress (8 of 25 rounds, 8 of 10 wins)", { p, w });
  check(ach.summary("a").unlocked === 0, "summary counts only unlocked ones");
  check(CATALOG.length >= 30 && new Set(CATALOG.map((a) => a.key)).size === CATALOG.length, "the catalog has 30+ achievements with unique keys");
}
{ process.env.ACHIEVEMENTS = "0"; const { ach, round } = fresh(); round(); check(ach.evaluate("a").length === 0, "ACHIEVEMENTS=0 switches them off"); delete process.env.ACHIEVEMENTS; }

// ---- milestones ----
function msFresh(rounds = 0, players = 0, env = {}) {
  Object.assign(process.env, { MILESTONE_ROUNDS: "10:1000,20:2000", MILESTONE_PLAYERS: "3:500" }, env);
  const db = new Database(":memory:");
  db.exec("CREATE TABLE crash_rounds (id TEXT PRIMARY KEY, player TEXT, coin TEXT, state TEXT, ts INTEGER); CREATE TABLE crash_users (id TEXT PRIMARY KEY, starter_at INTEGER)");
  for (let i = 0; i < rounds; i++) db.prepare("INSERT INTO crash_rounds VALUES(?,?,?,?,?)").run("o" + i, "p" + (i % 5), "CREDITS", "sold", 1000 + i);
  for (let i = 0; i < players; i++) db.prepare("INSERT INTO crash_users VALUES(?,?)").run("u" + i, 1);
  const paid = new Map();
  const ms = initMilestones({ db, coin: "CREDITS", addCredits: (p, n) => paid.set(p, (paid.get(p) || 0) + n), from: 0 });
  return { ms, paid };
}
const reached = (ms, key) => !!ms.view("p0").list.find((m) => m.key === key).reachedAt;
{ const { ms } = msFresh(5, 1);
  check(ms.view("p0").rounds === 5 && ms.view("p0").claimable === 0, "starts from the rounds already played");
  for (let i = 0; i < 5; i++) ms.onSettled();
  check(reached(ms, "rounds-10") && !reached(ms, "rounds-20") && ms.view("p0").claimable === 1, "crossing 10 rounds reaches the first goal, which becomes claimable");
  check(ms.claim("p0", "rounds-10").amount === 1000, "a player who has played claims the reward");
  check(ms.claim("p0", "rounds-10").error === "Already claimed.", "...once");
  check(ms.claim("p0", "rounds-20").error && ms.claim("zz", "rounds-10").error, "an unreached goal can't be claimed, nor by a player who never played");
  check(ms.claim("p1", "rounds-10").amount === 1000, "every other player can claim it too");
  check(ms.view("p0").list.find((m) => m.key === "rounds-10").claimed && ms.claimableCount("p0") === 0 && ms.claimableCount("p2") === 1, "claimed state and the per-player count are right");
}
{ const { ms } = msFresh(2, 3);
  check(reached(ms, "players-3"), "the players goal is reached when enough accounts have joined");
}
{ const { ms, paid } = msFresh(12, 0);
  check(reached(ms, "rounds-10"), "a goal passed before a restart is still reached");
  ms.claim("p0", "rounds-10"); check(paid.get("p0") === 1000, "the claim pays credits");
}
{ process.env.MILESTONES = "0"; const { ms } = msFresh(50, 0); check(!ms.view("p0").on && ms.claimableCount("p0") === 0 && ms.claim("p0", "rounds-10").error, "MILESTONES=0 switches them off"); delete process.env.MILESTONES; }

console.log(fails ? `FAILED: ${fails}` : "all rewards checks passed");
process.exit(fails ? 1 : 0);
