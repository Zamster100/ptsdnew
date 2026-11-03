// Daily tasks + admin + PNL reset check.   node test/tasks.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crash-tasks-"));
const PORT = 3593, B = `http://127.0.0.1:${PORT}/api/`;
const now = Date.now();
const srv = spawn(process.execPath, [path.join(ROOT, "src/server.js")], { cwd: ROOT, stdio: "ignore", env: {
  ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CRASH_BASE: "", SITE_PASSWORD: "", CRASH_TEST: "1", CLAIMS: "1", DEMO_LOGIN: "1", X_CLIENT_ID: "",
  DB_PATH: path.join(dir, "t.db"), LOG_DIR: path.join(dir, "logs"), MIN_BET: "100", MAX_BET: "1000", START_CREDITS: "0", DAILY_CREDITS: "10000",
  NFT_CONTRACT: "", NFT_RPC_URL: "", LOGIN_STEP: "0", ACHIEVEMENTS: "0", TASK_MIN_SECONDS: "2", TASKS_REQUIRE_X: "0", ADMIN_USERS: "boss:pw-123,second:pw-456",
  CYCLES: JSON.stringify([{ id: 1, name: "Cycle 1", start: new Date(now - 1000).toISOString(), end: new Date(now + 900_000).toISOString() }]),
} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, extra) => { if (!ok) { fails++; console.log("FAIL", what, extra !== undefined ? JSON.stringify(extra) : ""); } else console.log("ok  ", what); };
const mk = (cookie) => {
  const h = { "content-type": "application/json", ...(cookie ? { cookie } : {}) };
  return {
    get: (p) => fetch(B + p, { headers: h }).then(async (r) => ({ code: r.status, ...(await r.json()) })),
    post: (p, b) => fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b || {}) }).then(async (r) => ({ code: r.status, headers: r.headers, ...(await r.json()) })),
    raw: (p) => fetch(B + p, { headers: h }),
  };
};
async function player(name) {
  const login = await fetch(B + "auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name }) });
  const pl = mk((login.headers.get("set-cookie") || "").split(";")[0]);
  await pl.get("me"); await pl.post("claim", { kind: "starter" });
  return pl;
}
const bal = async (pl) => (await pl.get("me")).balances.CREDITS;
// the board is cached for a few seconds: poll until this player's Task points show the wanted value
const rowWith = async (pl, tasks) => { let lb; for (let i = 0; i < 40; i++) { lb = await pl.get("leaderboard?limit=10"); if (lb.mine && lb.mine.tasks === tasks) break; await sleep(500); } return lb.mine; };
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "config"); break; } catch { await sleep(200); } }

  // ---- admin login ----
  const anon = mk();
  check((await anon.get("admin/tasks")).code === 401, "admin API is closed without a login");
  check((await anon.post("admin/login", { user: "boss", password: "nope" })).code === 401, "wrong password is refused");
  const lg = await anon.post("admin/login", { user: "Boss", password: "pw-123" });
  const ck = lg.headers.get("set-cookie") || "";
  check(lg.code === 200 && ck.includes("HttpOnly") && ck.includes("SameSite=Strict"), "team login works (case-insensitive name), cookie is HttpOnly + SameSite", ck);
  const ad = mk(ck.split(";")[0]);
  check((await ad.get("admin/me")).user === "boss", "session is recognised");
  check((await mk("crashadmin=forged").get("admin/tasks")).code === 401, "a forged cookie is refused");
  check((await anon.get("tasks")).code === 401, "players page needs a sign-in");

  // ---- task CRUD ----
  check((await ad.post("admin/task", { title: "" })).code === 400, "a task needs a title");
  check((await ad.post("admin/task", { title: "x", url: "javascript:alert(1)" })).code === 400, "non-http links are refused");
  check((await ad.post("admin/task", { title: "x", day: "tomorrow" })).code === 400, "bad day is refused");
  const A = (await ad.post("admin/task", { title: "Like the pinned post", desc: "Like it", type: "like", url: "https://x.com/ptsdshow", reward: 1000, verify: "timer" })).id;
  const Bt = (await ad.post("admin/task", { title: "Quote our post", type: "quote", url: "https://x.com/ptsdshow/status/1234567890", reward: 500, points: 2000, verify: "proof" })).id;
  const C = (await ad.post("admin/task", { title: "Reply with your best loss", type: "comment", url: "https://x.com/ptsdshow/status/1234567891", reward: 300, verify: "review" })).id;
  const old = (await ad.post("admin/task", { title: "Yesterday only", day: "2020-01-01", reward: 100 })).id;
  check(A && Bt && C && old, "four tasks created", { A, Bt, C, old });
  check((await ad.post("admin/task", { id: A, reward: 1200 })).ok && (await ad.get("admin/tasks")).tasks.find((t) => t.id === A).reward === 1200, "a task can be edited (partial update)");
  await ad.post("admin/task", { id: A, reward: 1000 });

  // ---- player board ----
  const pl = await player("tpl");
  const b = await pl.get("tasks");
  check(b.tasks.length === 3 && b.tasks[0].id === C && b.tasks[0].latest && b.progress.pct === 0 && b.resetsAt > Date.now(), "board shows today's tasks, newest first; a task for another day is hidden", b.tasks.map((t) => t.id));
  check((await pl.post("task/complete", { id: A })).code === 400, "can't complete before opening");
  check((await pl.post("task/open", { id: old })).code === 404, "a task for another day can't be opened");
  await pl.post("task/open", { id: A });
  const early = await pl.post("task/complete", { id: A });
  check(early.code === 400 && early.wait > 0, "confirming straight away is refused (wait)", early.error);
  await sleep(2300);
  const b0 = await bal(pl);
  const done = await pl.post("task/complete", { id: A });
  check(done.code === 200 && done.reward === 1000 && (await bal(pl)) === b0 + 1000 && done.progress.pct === 33, "timer task pays and moves progress to 33%", { reward: done.reward, pct: done.progress?.pct });
  check((await pl.post("task/complete", { id: A })).code === 400, "no second payout the same day");

  // ---- proof task ----
  await pl.post("task/open", { id: Bt }); await sleep(2300);
  check((await pl.post("task/complete", { id: Bt })).code === 400, "proof task needs a link");
  check((await pl.post("task/complete", { id: Bt, proof: "https://example.com/tpl/status/555555555" })).code === 400, "proof must be an X post link");
  check((await pl.post("task/complete", { id: Bt, proof: "https://x.com/someoneelse/status/555555555" })).code === 400, "proof must be on the player's own handle");
  check((await pl.post("task/complete", { id: Bt, proof: "https://x.com/tpl/status/1234567890" })).code === 400, "the original post is not proof");
  const b1 = await bal(pl);
  const pr = await pl.post("task/complete", { id: Bt, proof: "https://x.com/TPL/status/555555555?s=20" });
  check(pr.code === 200 && pr.state === "done" && (await bal(pl)) === b1 + 500, "valid proof (any case, with ?s=) pays at once", pr.state);

  // ---- review task ----
  await pl.post("task/open", { id: C }); await sleep(2300);
  const b2 = await bal(pl);
  const rv = await pl.post("task/complete", { id: C, proof: "https://x.com/tpl/status/777777777" });
  check(rv.code === 200 && rv.state === "pending" && rv.reward === 0 && (await bal(pl)) === b2, "review task is pending and pays nothing yet", rv.state);
  check((await pl.post("task/complete", { id: C, proof: "https://x.com/tpl/status/777777778" })).code === 400, "can't resubmit while pending");
  const rq = await ad.get("admin/reviews");
  check(rq.reviews.length === 1 && rq.reviews[0].user === "tpl" && rq.reviews[0].proof.includes("777777777"), "team sees it in the review queue", rq.reviews);
  check((await pl.get("admin/reviews")).code === 401, "players can't reach the review queue");
  check((await ad.post("admin/review", { id: rq.reviews[0].id, approve: true })).ok && (await bal(pl)) === b2 + 300, "approving pays the reward");
  check((await ad.post("admin/review", { id: rq.reviews[0].id, approve: true })).code === 400, "can't approve twice");
  // XP: Task points = 1000 (points default to the reward) + 2000 (custom points) + 300 (approved review) = 3300, not the credit rewards (1800)
  const mine1 = await rowWith(pl, 3300);
  check(mine1 && mine1.tasks === 3300 && mine1.net === 0 && mine1.xp === 3300 && mine1.rounds === 0, "task points feed XP (custom points, default = reward, review counts once approved)", mine1);
  check((await pl.get("tasks")).tasks.find((t) => t.id === Bt).points === 2000, "the player sees the XP a task is worth");

  // reject path + retry
  const pl2 = await player("tpl2");
  await pl2.post("task/open", { id: C }); await sleep(2300);
  await pl2.post("task/complete", { id: C, proof: "https://x.com/tpl2/status/888888881" });
  const q2 = (await ad.get("admin/reviews")).reviews[0];
  const b3 = await bal(pl2);
  await ad.post("admin/review", { id: q2.id, approve: false });
  check((await bal(pl2)) === b3 && (await pl2.get("tasks")).tasks.find((t) => t.id === C).state === "rejected", "rejecting pays nothing and shows as rejected");
  check((await pl2.post("task/complete", { id: C, proof: "https://x.com/tpl2/status/888888882" })).state === "pending", "a rejected submission can be retried");

  // ---- activity, revoke, export ----
  const lg2 = await ad.get("admin/log?limit=50");
  const aLog = lg2.log.find((l) => l.user === "tpl" && l.taskId === A);
  check(lg2.log.length >= 4 && aLog && aLog.state === "done", "activity log lists completions", lg2.log.length);
  const b4 = await bal(pl);
  check((await ad.post("admin/revoke", { id: aLog.id })).ok && (await bal(pl)) === b4 - 1000, "revoke takes the credits back");
  const mine2 = await rowWith(pl, 2300);
  check(mine2 && mine2.tasks === 2300 && mine2.xp === 2300, "a revoked task loses its XP points too", mine2);
  const csv = await ad.raw("admin/export.csv");
  check(csv.status === 200 && (csv.headers.get("content-type") || "").includes("text/csv") && (await csv.text()).startsWith("time,day,user,task,state"), "CSV export");
  check((await ad.post("admin/task/delete", { id: A })).hidden === true && !(await pl.get("tasks")).tasks.some((t) => t.id === A), "deleting a task with history hides it");
  check(!(await ad.post("admin/task/delete", { id: old })).hidden && !(await ad.get("admin/tasks")).tasks.some((t) => t.id === old), "deleting a task with no history removes it");

  // ---- PNL reset needs the latest task ----
  const rs = await player("resetter");
  let net = 0;
  for (let i = 0; i < 30 && net >= 0; i++) {
    const r = await rs.post("buy", { coin: "CREDITS", amount: 1000, clientSeed: "r" + i });
    if (r.code !== 200) break;
    let e = await rs.get("wait?id=" + r.round.id); while (e.pending) { await sleep(300); e = await rs.get("wait?id=" + r.round.id); }
    net += e.pnl;
  }
  check(net < 0, "reached a negative cycle PnL", net);
  const D = (await ad.post("admin/task", { title: "Today's latest", reward: 200, verify: "timer", url: "https://x.com/ptsdshow" })).id;
  let st = await rs.get("pnl/state");
  check(st.net === net && st.task?.id === D && st.taskDone === false && st.canReset === false, "latest task is not done: reset not available", st);
  const no = await rs.post("pnl/reset", {});
  check(no.code === 400 && /latest bounty/i.test(no.error), "reset refused until the latest task is completed", no.error);
  await rs.post("task/open", { id: D }); await sleep(2300);
  check((await rs.post("task/complete", { id: D })).code === 200, "complete the latest task");
  st = await rs.get("pnl/state");
  check(st.taskDone === true && st.canReset === true, "now the reset is available");
  const ok = await rs.post("pnl/reset", {});
  check(ok.code === 200 && ok.net === 0 && ok.cooldown === true, "reset: PnL back to 0, cooldown on", ok);
  check((await rs.post("pnl/reset", {})).code === 400, "second reset refused inside 24h");
  let lb = await rs.get("leaderboard?limit=10");
  for (let i = 0; i < 40 && !(lb.mine === null || lb.mine.net === 0); i++) { await sleep(500); lb = await rs.get("leaderboard?limit=10"); }
  // the PNL part restarts at 0, but the task points already earned (the bounty that unlocked the reset) are kept
  check(lb.mine && lb.mine.net === 0 && lb.mine.tasks === 200 && lb.mine.xp === 200, "reset zeroes PNL only: task points stay in XP", lb.mine);

  // ---- pages ----
  for (const pth of ["tasks", "admin"]) { const r = await fetch(`http://127.0.0.1:${PORT}/${pth}`); check(r.status === 200 && (await r.text()).includes("PTSD Crash"), `/${pth} page is served`); }
  check((await anon.post("admin/logout", {})).code === 401, "logout without a session is refused");
  await ad.post("admin/logout", {});
  check((await ad.get("admin/tasks")).code === 401, "logout ends the session");
} finally {
  srv.kill();
  await sleep(300);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `FAILED: ${fails}` : "all task checks passed");
process.exit(fails ? 1 : 0);
