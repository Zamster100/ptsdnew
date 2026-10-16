// Heavy read-only queries (leaderboard ranking, campaign player count) run in a worker thread
// with its own read-only connection to the DB, so they never freeze the game while they run.
// Callers get the last result straight away; a fresh one is fetched in the background
// once it is older than ttlMs. The very first call returns the fallback.
import { Worker } from "node:worker_threads";
import path from "node:path";

let worker = null;
const cache = new Map(); // key -> { at, rows }
const inflight = new Set();

export function startBg(dbPath) {
  worker = new Worker(new URL("./bg-worker.js", import.meta.url), { workerData: { dbPath: path.resolve(dbPath) } });
  worker.on("message", ({ key, rows, error }) => {
    inflight.delete(key);
    if (process.env.BG_DEBUG) console.log(`[bg] ${new Date().toISOString().slice(11,23)} got ${key} ${rows ? rows.length : "-"} rows`);
    if (error) return console.error("[bg] query failed", key, error);
    cache.set(key, { at: Date.now(), rows });
  });
  worker.on("error", (e) => console.error("[bg] worker error", e));
  worker.on("exit", (code) => {
    console.error("[bg] worker exited", code, "- restarting");
    inflight.clear();
    setTimeout(() => startBg(dbPath), 1000);
  });
  worker.unref();
}

export function cached(key, sql, params, ttlMs, fallback) {
  const hit = cache.get(key);
  if ((!hit || Date.now() - hit.at > ttlMs) && worker && !inflight.has(key)) {
    inflight.add(key);
    if (process.env.BG_DEBUG) console.log(`[bg] ${new Date().toISOString().slice(11,23)} ask ${key}`);
    worker.postMessage({ key, sql, params });
  }
  return hit ? hit.rows : fallback;
}
