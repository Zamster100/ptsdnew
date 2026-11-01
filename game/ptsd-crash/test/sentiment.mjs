// Fear & Greed logic (no server): when a window opens, what the edge is, and that it can't be gamed cheaply.   node test/sentiment.mjs
import Database from "better-sqlite3";
import { initSentiment } from "../src/sentiment.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const T = Date.parse("2026-11-03T15:00:00Z"), MIN = 60_000;

function fresh() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE crash_rounds (id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT, coin TEXT, bet INTEGER, pnl INTEGER, edge REAL, ts INTEGER, state TEXT)");
  const add = db.prepare("INSERT INTO crash_rounds(player,coin,bet,pnl,edge,ts,state) VALUES(?,?,?,?,?,?,?)");
  // n players x k rounds, each round's pnl as a fraction of the bet
  const rounds = (players, k, frac, at, edge = 0.05, state = "sold") => { for (let p = 0; p < players; p++) for (let i = 0; i < k; i++) add.run("p" + p, "CREDITS", 1000, Math.round(frac * 1000), edge, at, state); };
  return { db, rounds, s: initSentiment({ db, coin: "CREDITS", baseEdge: 0.05 }) };
}

// ---- nothing happens without enough data ----
{ const { s, rounds } = fresh();
  s.tick(T); check(s.view(T).kind === "neutral" && s.view(T).building, "an empty game is neutral and says it is still gathering data");
  rounds(4, 10, 0.9, T - 2 * MIN); s.tick(T);
  check(s.view(T).kind === "neutral" && s.view(T).building, "4 players all winning big is not enough (needs 5 different players)", s.view(T));
}
{ const { s, rounds } = fresh();
  rounds(6, 3, 0.9, T - 2 * MIN); s.tick(T); // 18 rounds
  check(s.view(T).kind === "neutral" && s.view(T).building, "18 rounds is not enough (needs 30)", s.view(T));
}

// ---- Greed ----
{ const { s, rounds } = fresh();
  rounds(6, 6, 0.9, T - 2 * MIN); s.tick(T);
  const v = s.view(T);
  check(v.kind === "greed" && v.label === "Greed" && s.edgeNow(T) === 0.2 && v.index >= 75, "everyone winning: Greed, edge 20%", v);
  const w = s.view(T + 16 * MIN).log[0], len = (w.end - w.start) / MIN; // the log shows the end once the window is over
  check(len >= 5 && len <= 15, "the window lasts between 5 and 15 minutes", len);
  check(s.edgeNow(T + 60_000) === 0.2 && s.kindNow(T + 60_000) === "greed", "rounds bought inside the window are dealt with the Greed edge");
  check(s.edgeNow(w.end + 1) === 0.05 && s.kindNow(w.end + 1) === "neutral", "after the window the normal edge is back");
  check(v.log.length === 1 && v.log[0].kind === "greed", "the window is in the public log", v.log);
  check(v.log[0].end === null && !("end" in v), "the window in force shows no end time, in the log or anywhere else", v);
  // the rounds played in the window can't start the next one: the reading restarts from the end of it
  rounds(6, 6, -1.0, T + 3 * MIN, 0.2); // a Greed-window beating (edge 20%): normal for that edge
  s.tick(w.end + 1);
  check(s.view(w.end + 1).kind === "neutral" && s.view(w.end + 1).building, "after a window the reading starts from scratch (no instant second window)", s.view(w.end + 1));
}

// ---- Fear ----
{ const { s, rounds } = fresh();
  rounds(6, 6, -1.0, T - 2 * MIN); s.tick(T);
  const v = s.view(T);
  check(v.kind === "fear" && v.label === "Fear" && s.edgeNow(T) === -0.1 && v.index <= 25, "everyone losing: Fear, the house pays out more (edge -10%)", v);
  check(s.kindOfEdge(-0.1) === "fear" && s.kindOfEdge(0.2) === "greed" && s.kindOfEdge(0.05) === "neutral" && s.kindOfEdge(null) === "neutral", "a stored edge maps back to its regime");
}

// ---- normal luck stays neutral, and the meter leans the right way ----
{ const { s, rounds } = fresh();
  rounds(6, 6, -0.05, T - 2 * MIN); s.tick(T); // results exactly as the 5% edge predicts
  check(s.view(T).kind === "neutral" && Math.abs(s.view(T).index - 50) <= 2 && s.view(T).label === "Neutral", "results exactly as the edge predicts: meter in the middle", s.view(T));
}
{ const { s, rounds } = fresh();
  rounds(6, 6, 0.0, T - 2 * MIN); s.tick(T); // everyone breaks even: a bit lucky
  const v = s.view(T);
  check(v.kind === "neutral" && v.index > 55 && v.index < 75, "breaking even is a little lucky: the meter leans toward Greed but no window", v);
}
{ const { s, rounds } = fresh(); // open rounds and other coins do not count
  rounds(6, 6, 0.9, T - 2 * MIN, 0.05, "open"); s.tick(T);
  check(s.view(T).kind === "neutral" && s.view(T).building, "rounds still open are not counted");
}
{ const { s, rounds } = fresh(); // old rounds fall out of the reading
  rounds(6, 6, 0.9, T - 40 * MIN); s.tick(T);
  check(s.view(T).kind === "neutral" && s.view(T).building, "rounds older than 15 minutes fall out of the reading");
}

// ---- one big winner can't swing it ----
{ const { s, rounds, db } = fresh();
  rounds(5, 6, -0.05, T - 2 * MIN); // five normal players
  const add = db.prepare("INSERT INTO crash_rounds(player,coin,bet,pnl,edge,ts,state) VALUES('whale','CREDITS',10000,990000,0.05,?,'sold')");
  for (let i = 0; i < 6; i++) add.run(T - 2 * MIN); // a whale hitting 100x six times
  s.tick(T);
  const v = s.view(T);
  check(v.kind === "neutral" && v.index < 75, "one whale hitting 100x again and again does not open Greed (capped and weighted down)", v);
}
{ const { s, rounds } = fresh(); // a pile of alts all losing on purpose is just more players, so it works as designed; it needs real volume
  rounds(5, 6, -1.0, T - 2 * MIN); s.tick(T);
  check(s.view(T).kind === "fear", "5 players losing everything does open Fear (this is the minimum: it takes real volume)");
}

// ---- admin override and settings ----
{ const { s } = fresh();
  const w = s.force("greed", 3, T);
  check(w.kind === "greed" && w.end - w.start === 3 * MIN && s.edgeNow(T + MIN) === 0.2, "admin can open a 3 minute Greed window", w);
  s.force("neutral", 0, T + MIN);
  check(s.edgeNow(T + MIN + 1) === 0.05 && s.view(T + MIN + 1).kind === "neutral" && s.view(T + MIN + 1).log[0].end === T + MIN, "admin can end it early; the log shows when it really ended");
  const f = s.force("fear", 1, T + 10 * MIN);
  check(f.kind === "fear" && s.view(T + 10 * MIN + 1).label === "Fear", "admin can open Fear");
}
{ process.env.SENTIMENT = "0";
  const { s, rounds } = fresh(); rounds(6, 6, 0.9, T - 2 * MIN); s.tick(T);
  check(s.edgeNow(T) === 0.05 && s.view(T).on === false && s.view(T).kind === "neutral", "SENTIMENT=0 switches the whole thing off");
  delete process.env.SENTIMENT; }
{ // a window survives a restart (same database, new process)
  const { db, rounds, s } = fresh(); rounds(6, 6, 0.9, T - 2 * MIN); s.tick(T);
  const again = initSentiment({ db, coin: "CREDITS", baseEdge: 0.05 });
  check(again.edgeNow(T + MIN) === 0.2 && again.view(T + MIN).kind === "greed", "after a restart the window in force is still in force");
}

console.log(fails ? `FAILED: ${fails}` : "all sentiment checks passed");
process.exit(fails ? 1 : 0);
