// Runs the queries sent by bg.js on a read-only connection (see bg.js).
import { parentPort, workerData } from "node:worker_threads";
import Database from "better-sqlite3";

const db = new Database(workerData.dbPath, { readonly: true, fileMustExist: true });
// Checkpoint: folds the WAL back into the DB every 30s off the main thread
// (server.js turns off SQLite's automatic checkpoint, which ran inside a player's buy/sell).
const ck = new Database(workerData.dbPath, { fileMustExist: true });
ck.pragma("busy_timeout = 2000");
setInterval(() => {
  try { ck.pragma("wal_checkpoint(PASSIVE)"); } catch (e) { console.error("[bg] checkpoint failed", e.message); }
}, 30_000);
const stmts = new Map();
parentPort.on("message", ({ key, sql, params }) => {
  try {
    let s = stmts.get(sql);
    if (!s) stmts.set(sql, (s = db.prepare(sql)));
    parentPort.postMessage({ key, rows: s.all(...params) });
  } catch (e) {
    parentPort.postMessage({ key, error: String(e?.message || e) });
  }
});
