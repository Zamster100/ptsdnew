// Win card for link previews (X, Telegram, WhatsApp...). Drawn on the server from
// the round's own data, so a shared link can only ever show a real win.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildPath, multAt, MAX_MULT } from "../public/path.js";

const W = 1200, H = 630;
const imgCache = new Map();
async function dataUri(root, rel, w, h) {
  const key = `${rel}:${w}x${h}`;
  if (!imgCache.has(key)) {
    const buf = await sharp(path.join(root, "public", rel)).resize(w || null, h || null, { fit: w && h ? "cover" : "inside", position: "top" }).png().toBuffer();
    const meta = await sharp(buf).metadata();
    imgCache.set(key, { uri: "data:image/png;base64," + buf.toString("base64"), w: meta.width, h: meta.height });
  }
  return imgCache.get(key);
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
const fmt = (n) => Math.round(n).toLocaleString("en-US");

export function titleFor(mult, state) {
  if (state === "max") return `${MAX_MULT}x God`;
  if (mult < 1) return "Panic Seller";
  if (mult < 1.5) return "Paper Hands";
  if (mult < 3) return "Took Profit";
  if (mult < 10) return "Diamond Hands";
  return "Gen Wealth";
}

// The multiplier line from the buy to the sell, as the player saw it.
function chartPath(noiseSeed, soldT, box) {
  const p = buildPath(noiseSeed);
  const pts = [];
  const step = Math.max(0.05, soldT / 400);
  for (let t = 0; t <= soldT + 1e-9; t += step) pts.push([t, multAt(p, t)]);
  pts.push([soldT, multAt(p, soldT)]);
  const ms = pts.map((x) => x[1]);
  const lo = Math.min(...ms) * 0.97, hi = Math.max(...ms) * 1.06;
  const X = (t) => box.x + (t / Math.max(soldT, 0.001)) * box.w;
  const Y = (m) => box.y + box.h - ((m - lo) / (hi - lo || 1)) * box.h;
  const line = pts.map(([t, m], i) => `${i ? "L" : "M"}${X(t).toFixed(1)} ${Y(m).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return { line, area: `${line} L${X(last[0]).toFixed(1)} ${box.y + box.h} L${box.x} ${box.y + box.h} Z`, end: [X(last[0]), Y(last[1])], entry: Y(1) };
}

export async function renderCard(root, { mult, pnl, coin, sym, color, state, noiseSeed, soldT }) {
  const imgRel = state === "max" || mult >= 50 ? "img/lambo.webp" : mult >= 4 ? "img/win-big.webp" : "img/win2x.webp";
  const [logo, ch] = await Promise.all([dataUri(root, "img/ptsd-logo.webp", 0, 64), dataUri(root, imgRel, 300, 300)]);
  const box = { x: 40, y: 120, w: 1120, h: 300 };
  const c = chartPath(noiseSeed, Math.max(0.5, soldT), box);
  const green = "#12b886", font = "Inter ExtraBold, Inter, DejaVu Sans";
  const multTxt = mult.toFixed(2) + "x";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${green}" stop-opacity=".35"/><stop offset="1" stop-color="${green}" stop-opacity="0"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0f11" stop-opacity="0"/><stop offset=".5" stop-color="#0e0f11" stop-opacity=".9"/><stop offset="1" stop-color="#0e0f11"/></linearGradient>
    <clipPath id="chc"><rect x="860" y="262" width="300" height="300" rx="24"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#0e0f11"/>
  ${[0, 1, 2, 3, 4].map((i) => `<line x1="40" x2="1160" y1="${120 + i * 75}" y2="${120 + i * 75}" stroke="#1d1f23" stroke-width="1"/>`).join("")}
  <line x1="40" x2="1160" y1="${c.entry.toFixed(1)}" y2="${c.entry.toFixed(1)}" stroke="${green}" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>
  <path d="${c.area}" fill="url(#fill)"/>
  <path d="${c.line}" fill="none" stroke="${green}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="${c.end[0].toFixed(1)}" cy="${c.end[1].toFixed(1)}" r="10" fill="#f05150" stroke="#fff" stroke-width="3"/>
  <rect x="0" y="300" width="${W}" height="${H - 300}" fill="url(#fade)"/>
  <image href="${logo.uri}" x="40" y="30" width="${logo.w}" height="${logo.h}"/>
  <text x="${60 + logo.w}" y="75" font-family="${font}" font-weight="800" font-size="40" fill="#fff">CRASH</text>
  <text x="1160" y="75" text-anchor="end" font-family="${font}" font-weight="800" font-size="40" fill="${esc(color)}">$${esc(sym)}</text>
  <text x="44" y="455" font-family="${font}" font-weight="800" font-size="28" fill="#e7e9ee" letter-spacing="2">${esc(titleFor(mult, state).toUpperCase())}</text>
  <text x="36" y="570" font-family="${font}" font-weight="800" font-size="132" fill="${green}">${multTxt}</text>
  <text x="44" y="612" font-family="${font}" font-weight="800" font-size="38" fill="${green}">${pnl >= 0 ? "+" : "-"}${fmt(Math.abs(pnl))} ${esc(coin)}</text>
  <image href="${ch.uri}" x="860" y="262" width="300" height="300" clip-path="url(#chc)" preserveAspectRatio="xMidYMin slice"/>
  <rect x="860" y="262" width="300" height="300" rx="24" fill="none" stroke="${green}" stroke-width="6"/>
  <text x="1160" y="606" text-anchor="end" font-family="${font}" font-weight="800" font-size="22" fill="#6a727d">PTSD Crash</text>
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

export function cardFile(root, id) {
  const dir = path.join(root, "data/cards");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, id + ".png");
}

// ---------- profile card ----------
// A trading-card style image for a player's profile link: avatar, handle, badge tier, cycle rank and profit.
const LEVEL = [
  { c1: "#4a4f57", c2: "#2b2e33", txt: "#9aa1ab" },   // no Tickets
  { c1: "#00D8C6", c2: "#08766e", txt: "#00D8C6" },   // 1
  { c1: "#3b82f6", c2: "#1d3f85", txt: "#6ea3ff" },   // 2
  { c1: "#a855f7", c2: "#51227a", txt: "#c58bff" },   // 3
  { c1: "#E8A317", c2: "#7a5208", txt: "#ffc94d" },   // 5
  { c1: "#F05150", c2: "#8c1d1d", txt: "#ff8a88" },   // 10
];
const pfpCache = new Map();
async function pfpUri(url, size) {
  if (!url) return null;
  const hit = pfpCache.get(url);
  if (hit && Date.now() - hit.at < 3600_000) return hit.uri;
  try {
    const r = await fetch(url.replace("_normal.", "_400x400."), { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error("pfp " + r.status);
    const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize(size, size, { fit: "cover" }).png().toBuffer();
    const uri = "data:image/png;base64," + buf.toString("base64");
    if (pfpCache.size > 300) pfpCache.clear();
    pfpCache.set(url, { at: Date.now(), uri });
    return uri;
  } catch { return null; }
}

export async function renderProfileCard(root, p) {
  const W = 1200, H = 630, font = "Inter ExtraBold, Inter, DejaVu Sans";
  const lv = LEVEL[Math.min(5, p.nft.badge.level)], handle = p.user.username;
  const [logo, pfp] = await Promise.all([dataUri(root, "img/ptsd-logo.webp", 0, 56), pfpUri(p.user.pfp, 260)]);
  const letter = esc((handle[0] || "?").toUpperCase());
  const avatar = pfp
    ? `<image href="${pfp}" x="70" y="150" width="260" height="260" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="70" y="150" width="260" height="260" rx="130" fill="#2b2e33"/><text x="200" y="320" text-anchor="middle" font-family="${font}" font-weight="800" font-size="130" fill="#fff">${letter}</text>`;
  const stat = (x, label, value, color = "#fff") => `<g><text x="${x}" y="470" font-family="${font}" font-weight="800" font-size="20" fill="#6a727d" letter-spacing="2">${label}</text><text x="${x}" y="540" font-family="${font}" font-weight="800" font-size="62" fill="${color}">${value}</text></g>`;
  const rank = p.rank ? `#${fmt(p.rank)}` : "-";
  const handleSize = handle.length > 12 ? 52 : 68;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15171b"/><stop offset="1" stop-color="#0b0c0e"/></linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lv.c1}"/><stop offset="1" stop-color="${lv.c2}"/></linearGradient>
    <clipPath id="av"><rect x="70" y="150" width="260" height="260" rx="130"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="url(#ring)" stroke-width="6"/>
  <g opacity=".07" stroke="#fff">${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="40" x2="${W - 40}" y1="${110 + i * 90}" y2="${110 + i * 90}"/>`).join("")}</g>
  <image href="${logo.uri}" x="52" y="40" width="${logo.w}" height="${logo.h}"/>
  <text x="${72 + logo.w}" y="82" font-family="${font}" font-weight="800" font-size="36" fill="#fff">CRASH</text>
  <text x="${W - 52}" y="82" text-anchor="end" font-family="${font}" font-weight="800" font-size="24" fill="#6a727d" letter-spacing="2">${esc((p.cycle ? p.cycle.name : "SEASON").toUpperCase())}</text>
  <circle cx="200" cy="280" r="142" fill="none" stroke="url(#ring)" stroke-width="10"/>
  ${avatar}
  <text x="372" y="236" font-family="${font}" font-weight="800" font-size="${handleSize}" fill="#fff">@${esc(handle)}</text>
  <rect x="372" y="262" width="${44 + p.nft.badge.name.length * 21}" height="54" rx="27" fill="url(#ring)"/>
  <text x="${372 + 20}" y="298" font-family="${font}" font-weight="800" font-size="28" fill="#fff">${esc(p.nft.badge.name.toUpperCase())}</text>
  <text x="372" y="362" font-family="${font}" font-weight="800" font-size="26" fill="${lv.txt}">${p.nft.count ? `${p.nft.count} Ticket${p.nft.count > 1 ? "s" : ""} held` : "No Tickets yet"}</text>
  ${stat(70, "RANK", rank, "#fff")}
  ${stat(420, "CYCLE PROFIT", fmt(p.score), p.score > 0 ? "#12b886" : "#fff")}
  ${stat(850, "ROUNDS", fmt(p.rounds), "#fff")}
  <text x="${W - 52}" y="${H - 38}" text-anchor="end" font-family="${font}" font-weight="800" font-size="22" fill="#6a727d">PTSD Crash</text>
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
