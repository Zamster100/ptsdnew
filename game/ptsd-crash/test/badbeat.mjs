// Bad beat refund logic (no server).   node test/badbeat.mjs
import Database from "better-sqlite3";
import { initBadBeat } from "../src/badbeat.js";

let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const MIN = 60_000, T = Date.parse("2026-11-03T15:00:00Z");

function fresh() {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE crash_rounds (id TEXT PRIMARY KEY, player TEXT, coin TEXT, bet INTEGER, crash REAL, state TEXT, half_ms INTEGER, ts INTEGER)");
  const ins = db.prepare("INSERT INTO crash_rounds VALUES(?,?,?,?,?,?,?,?)");
  let n = 0;
  const round = (o = {}) => { const r = { id: "r" + ++n, player: "a", coin: "CREDITS", bet: 1000, crash: 1.0, state: "rekt", half_ms: null, ts: T + n * 1000, ...o }; ins.run(r.id, r.player, r.coin, r.bet, r.crash, r.state, r.half_ms, r.ts); return r; };
  return { db, round, b: initBadBeat({ db }) };
}

{ const { b, round } = fresh();
  const r1 = round(), r2 = round();
  check(b.check(r2, T) === 0, "two rugs in a row is not enough");
  const r3 = round({ bet: 2500 });
  check(b.check(r3, T) === 2500, "three rugs in a row refunds the last bet (2,500)");
  check(b.check(r3, T) === 0, "the same round can't be refunded twice");
  check(b.forRound(r3.id)?.amount === 2500 && b.forRound(r1.id) === null, "the refund is looked up by round");
  const un = b.takeUnseen("a");
  check(un.length === 1 && un[0].amount === 2500 && un[0].rugs === 3, "a player who closed the page is told next time", un);
  check(b.takeUnseen("a").length === 0, "...once");
  // cooldown, and the count starts again after a refund
  round(); round(); const r6 = round({ bet: 700 });
  check(b.check(r6, T + 10 * MIN) === 0, "another three rugs inside the cooldown (1 hour) pays nothing");
  round(); round(); const r9 = round({ bet: 900 });
  check(b.check(r9, T + 61 * MIN) === 900, "after the cooldown the next three rugs pay again (the count started after the last refund)");
}
{ const { b, round } = fresh();
  round(); round({ state: "sold", crash: 3.0 }); const r = round();
  check(b.check(r, T) === 0, "a win in between breaks the run");
}
{ const { b, round } = fresh();
  round(); round({ crash: 1.5 }); const r = round();
  check(b.check(r, T) === 0, "a slower crash (1.5x, over the 1.1x line) doesn't count as an instant rug");
}
{ const { b, round } = fresh();
  round(); round({ half_ms: 12345 }); const r = round();
  check(b.check(r, T) === 0, "a round where the player sold half doesn't count");
}
{ const { b, round } = fresh();
  round({ coin: "OTHER" }); round(); round(); const r = round();
  check(b.check(r, T) === 1000, "only the player's own rounds in the same coin are counted (3 of 4 rounds, one other coin: still 3 in a row)");
}
{ const { b, round } = fresh();
  round({ player: "b" }); round(); round(); const r = round();
  check(b.check(r, T) === 1000, "other players' rounds don't get in the way");
}
{ const { b, round } = fresh();
  round(); round(); const r3 = round(); round(); // a 4th round exists after r3
  check(b.check(r3, T) === 0, "only the newest round can trigger it (checking an older one pays nothing)");
}
{ process.env.BAD_BEAT = "0";
  const { b, round } = fresh(); round(); round(); const r = round();
  check(b.check(r, T) === 0, "BAD_BEAT=0 switches it off"); delete process.env.BAD_BEAT; }
{ process.env.BAD_BEAT_COUNT = "2"; process.env.BAD_BEAT_UNDER = "1.3"; process.env.BAD_BEAT_COOLDOWN_MIN = "0";
  const { b, round } = fresh(); round({ crash: 1.2 }); const r = round({ crash: 1.25 });
  check(b.check(r, T) === 1000, "count, line and cooldown are settings (2 rugs under 1.3x)");
  delete process.env.BAD_BEAT_COUNT; delete process.env.BAD_BEAT_UNDER; delete process.env.BAD_BEAT_COOLDOWN_MIN; }

console.log(fails ? `FAILED: ${fails}` : "all bad beat checks passed");
process.exit(fails ? 1 : 0);
