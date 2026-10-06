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
