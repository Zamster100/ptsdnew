// Wallet link + Ticket NFT holdings.
//
// A player proves they own a wallet by signing a one-time message (free, no transaction). The server
// checks the signature, then reads how many Ticket NFTs that wallet holds (ERC-721 balanceOf over RPC).
// The count unlocks the NFT bonus claim (see bonusHours) and sets the badge tier.
// The address is never shown to other players, only the count.
//
// Settings (env):
//   NFT_CONTRACT       the Ticket collection (ERC-721) on Ethereum mainnet
//   NFT_RPC_URL        JSON-RPC endpoint used to read balances (keep it in .env, never in git)
//   NFT_CACHE_MS       how long a count is trusted before it is re-read          (default 10 min)
//   WALLET_COOLDOWN_DAYS  days before a linked wallet can be swapped for another  (default 7)
import crypto from "node:crypto";
import { verifyMessage } from "ethers";

const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const EVM = /^0x[0-9a-fA-F]{40}$/;

// NFT bonus claim: a second 10k claim with its own timer, locked without Tickets. Wait in hours by Tickets held,
// capped at 3 boosts: 1 Ticket = one extra claim a day, 2 = two, 3+ = three (so 20k / 30k / 40k credits a day in total).
// Badges level up at 1, 2, 3, 5 and 10 Tickets.
export const bonusHours = (n) => (n >= 3 ? 8 : n === 2 ? 12 : n === 1 ? 24 : null);
export const TIERS = [
  { min: 10, level: 5, name: "Gen Wealth" },
  { min: 5, level: 4, name: "High Roller" },
  { min: 3, level: 3, name: "Triple Ticket" },
  { min: 2, level: 2, name: "Double Ticket" },
  { min: 1, level: 1, name: "Ticket Holder" },
];
export const badgeOf = (n) => TIERS.find((t) => n >= t.min) || { min: 0, level: 0, name: "No Tickets" };

export function initWallet({ db }) {
  const contract = (process.env.NFT_CONTRACT || "").toLowerCase();
  const rpc = process.env.NFT_RPC_URL || "";
  const cacheMs = num(process.env.NFT_CACHE_MS, 10 * 60_000);
  const cooldownMs = num(process.env.WALLET_COOLDOWN_DAYS, 7) * 86_400_000;
  const enabled = EVM.test(contract) && !!rpc;

  for (const col of ["vwallet TEXT", "vwallet_at INTEGER"]) {
    try { db.exec(`ALTER TABLE crash_users ADD COLUMN ${col}`); } catch {}
  }
  db.exec("CREATE INDEX IF NOT EXISTS crash_users_vwallet ON crash_users(vwallet)");
  db.exec("CREATE TABLE IF NOT EXISTS crash_nft (player TEXT PRIMARY KEY, wallet TEXT, count INTEGER NOT NULL, checked_at INTEGER NOT NULL)");
  const q = {
    user: db.prepare("SELECT id, username, vwallet, vwallet_at FROM crash_users WHERE id=?"),
    owner: db.prepare("SELECT id FROM crash_users WHERE vwallet=? AND id!=? AND (status IS NULL OR status!='blocked') LIMIT 1"),
    link: db.prepare("UPDATE crash_users SET vwallet=?, vwallet_at=? WHERE id=?"),
    nft: db.prepare("SELECT wallet, count, checked_at FROM crash_nft WHERE player=?"),
    setNft: db.prepare("INSERT INTO crash_nft(player,wallet,count,checked_at) VALUES(?,?,?,?) ON CONFLICT(player) DO UPDATE SET wallet=excluded.wallet, count=excluded.count, checked_at=excluded.checked_at"),
  };

  // Tickets held by the wallet linked right now, from the last read (0 if none, or if the wallet was swapped since).
  function countOf(player) {
    const u = q.user.get(player), n = q.nft.get(player);
    return u && u.vwallet && n && n.wallet === u.vwallet ? n.count : 0;
  }
  async function balanceOf(address) {
    const data = "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0");
    const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data }, "latest"] }) }).then((x) => x.json());
    if (!r.result || !/^0x[0-9a-fA-F]+$/.test(r.result)) throw new Error(r.error?.message || "bad rpc answer");
    return Number(BigInt(r.result));
  }
  // Re-read the holdings when the last read is older than maxAge. A failed read keeps the old count.
  const inflight = new Map();
  async function refresh(player, maxAge = cacheMs) {
    const u = q.user.get(player);
    if (!enabled || !u || !u.vwallet) return countOf(player);
    const n = q.nft.get(player);
    if (n && n.wallet === u.vwallet && Date.now() - n.checked_at < maxAge) return n.count;
    if (!inflight.has(player)) {
      inflight.set(player, balanceOf(u.vwallet)
        .then((c) => { q.setNft.run(player, u.vwallet, c, Date.now()); return c; })
        .catch((e) => { console.error("[wallet] holdings read failed", e.message); return countOf(player); })
        .finally(() => inflight.delete(player)));
    }
    return inflight.get(player);
  }

  // What the owner sees about their own wallet (the address itself is only ever returned to them).
  function stateOf(player) {
    const u = q.user.get(player);
    const count = countOf(player);
    return { enabled, address: u?.vwallet || null, count, badge: badgeOf(count), bonusHours: bonusHours(count), canSwapAt: u?.vwallet_at ? u.vwallet_at + cooldownMs : null };
  }

  const nonces = new Map(); // nonce -> { player, message, exp }
  function messageFor(player) {
    const u = q.user.get(player);
    const nonce = crypto.randomBytes(16).toString("hex");
    const message = `PTSD Crash wants you to link this wallet.\n\nAccount: @${u.username}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}\n\nSigning is free. It does not send a transaction or move any funds.`;
    for (const [k, v] of nonces) if (v.exp < Date.now()) nonces.delete(k);
    nonces.set(nonce, { player, message, exp: Date.now() + 10 * 60_000 });
    return { nonce, message };
  }
  function link(player, nonce, address, signature) {
    const n = nonces.get(String(nonce));
    if (!n || n.player !== player || n.exp < Date.now()) return { code: 400, error: "That request expired. Try connecting again." };
    if (!EVM.test(address)) return { code: 400, error: "That doesn't look like a wallet address." };
    let who;
    try { who = verifyMessage(n.message, String(signature)).toLowerCase(); } catch { return { code: 400, error: "That signature is not valid." }; }
    if (who !== address.toLowerCase()) return { code: 400, error: "The signature does not match this wallet." };
    nonces.delete(String(nonce));
    const u = q.user.get(player);
    if (u.vwallet && u.vwallet !== who && u.vwallet_at && Date.now() < u.vwallet_at + cooldownMs) {
      return { code: 400, error: "You linked a wallet recently. You can switch to another wallet after the cooldown.", canSwapAt: u.vwallet_at + cooldownMs };
    }
    if (q.owner.get(who, player)) return { code: 409, error: "This wallet is already linked to another account." };
    q.link.run(who, Date.now(), player);
    return { code: 200 };
  }

  // POST /api/wallet/nonce   POST /api/wallet/connect {nonce, address, signature}   POST /api/wallet/refresh
  async function api(req, res, p, body, user, send) {
    if (p === "/api/wallet/nonce" && req.method === "POST") return send(res, 200, messageFor(user.id));
    if (p === "/api/wallet/connect" && req.method === "POST") {
      const out = link(user.id, body?.nonce, String(body?.address || "").trim(), body?.signature);
      if (out.code !== 200) return send(res, out.code, { error: out.error, canSwapAt: out.canSwapAt });
      await refresh(user.id, 0);
      return send(res, 200, { ok: true, wallet: stateOf(user.id) });
    }
    if (p === "/api/wallet/refresh" && req.method === "POST") {
      await refresh(user.id, 60_000);
      return send(res, 200, { wallet: stateOf(user.id) });
    }
    return null;
  }

  return { enabled, contract, countOf, refresh, stateOf, api, bonusHoursOf: (id) => bonusHours(countOf(id)) };
}
