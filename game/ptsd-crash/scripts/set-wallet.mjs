// Support tool: change a player's wallet after it has been locked (e.g. they pasted the wrong one).
//   node --env-file=.env scripts/set-wallet.mjs @handle 0xYourNewWalletAddress
// Refuses a wallet that another (non-blocked) account already uses.
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [handleArg, addr] = process.argv.slice(2);
if (!handleArg || !addr) { console.error("Usage: node --env-file=.env scripts/set-wallet.mjs @handle 0xWallet"); process.exit(1); }
if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { console.error("That is not a valid 0x… wallet address."); process.exit(1); }
const db = new Database(process.env.DB_PATH || path.join(ROOT, "data/crash.db"));
try { db.exec("ALTER TABLE crash_users ADD COLUMN wallet_norm TEXT"); } catch {}
const users = db.prepare("SELECT id, username, wallet FROM crash_users WHERE lower(username)=?").all(handleArg.replace(/^@/, "").toLowerCase());
if (users.length !== 1) { console.error(`Expected 1 account for ${handleArg}, found ${users.length}.`); process.exit(1); }
const u = users[0], norm = addr.toLowerCase();
const other = db.prepare("SELECT username FROM crash_users WHERE wallet_norm=? AND id!=? AND COALESCE(status,'')!='blocked'").get(norm, u.id);
if (other) { console.error(`Refused: that wallet is already used by @${other.username}.`); process.exit(1); }
db.prepare("UPDATE crash_users SET wallet=?, wallet_norm=? WHERE id=?").run(addr, norm, u.id);
console.log(`@${u.username}: wallet ${u.wallet || "(none)"} -> ${addr}`);
