// PTSD Crash: the price path. Shared by the server (pays out) and the browser
// (draws the chart), so both always agree on the multiplier at any moment.
//
// How it stays fair for the house:
//   multiplier = trend * (1 - dip) * (1 - jitter),  dip, jitter >= 0
// The trend climbs from 1x and stops at the crash point. Dips and jitter only
// ever pull the price BELOW the trend, so nobody can sell above the crash point.
// The crash point is secret (server only). Dips, jitter and Cousin's trades come
// from a separate public seed, so knowing them tells you nothing about the crash.
//
// Price moves in TICKS like a real market: it only changes when a "trade"
// prints (irregular gaps, ~8 a second), and holds still in between.

export const T0 = 1.5;        // seconds of "opening" before the trend starts
// Trend accelerates: ln(m) = A*s + B*s^2 (s = seconds after the opening).
// Starts ~3%/s and keeps speeding up: 2x ~12s, 5x ~21s, 10x ~26s, 50x ~36s, 100x ~40s.
export const A = 0.0323;
export const B = 0.002121;
export const MAX_MULT = 100;  // hard cap (was 50 until 2026-10-05)
// Nothing ever reaches MAX_MULT itself: the highest crash is 99.99x (curve 3),
// and like every crash it rugs. No auto-sell anywhere.
export const CAP_HOLD_MS = 0;
export const EDGE = 0.05;     // house edge (was 0.10 until 2026-10-05)

// ---- How often each crash point comes up ----
// Up to TAIL_FROM the chance it reaches x is (1 - edge) / x, so selling at any
// target up to there pays back the same 95% on average.
// Past TAIL_FROM that chance fades out smoothly (no jumps), so crashes spread
// across 30x..100x instead of piling up on the cap, and the full 100x only
// happens about once in P_MAX_INV rounds.
export const TAIL_FROM = 30;
export const P_MAX_INV = 1000; // reaching 99.99x = about 1 round in 1,000

// Chance (0..1) that a round reaches x or more.
export function chanceToReach(x, edge = EDGE) {
  if (x <= 1) return 1;
  if (x >= MAX_MULT) return 1 / P_MAX_INV;
  const base = (1 - edge) / x;
  if (x <= TAIL_FROM) return base;
  return base * Math.exp(-tailK(edge) * (x - TAIL_FROM) ** 2);
}
// Sized so the chance of reaching 100x is exactly 1 / P_MAX_INV.
function tailK(edge) {
  return Math.log(((1 - edge) / MAX_MULT) * P_MAX_INV) / (MAX_MULT - TAIL_FROM) ** 2;
}

// Turns a uniform random number r in [0,1) into a crash point.
// curve 1 = old rounds (capped at 50x), curve 2 = 2026-10-05/06 rounds (rare exact 100x),
// curve 3 = current: tops out at 99.99x.
export function crashFromR(r, edge = EDGE, curve = 3) {
  const u = 1 - r; // (0, 1]
  if (curve < 2) return Math.min(50, Math.max(1, Math.floor(((1 - edge) / u) * 100) / 100));
  if (u <= 1 / P_MAX_INV) return curve >= 3 ? MAX_MULT - 0.01 : MAX_MULT;
  let x;
  if (u >= (1 - edge) / TAIL_FROM) x = (1 - edge) / u;
  else {
    // chanceToReach is falling here, so find the x where it equals u
    let lo = TAIL_FROM, hi = MAX_MULT;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (chanceToReach(mid, edge) >= u) lo = mid; else hi = mid; }
    x = lo;
  }
  return Math.min(MAX_MULT - 0.01, Math.max(1, Math.floor(x * 100) / 100));
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedInt(hex, salt) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < hex.length; i++) { h ^= hex.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Time (s) at which the trend reaches multiplier x.
export function timeForMult(x) {
  const L = Math.log(Math.max(1, x));
  return T0 + (-A + Math.sqrt(A * A + 4 * B * L)) / (2 * B);
}

export function trend(t) {
  if (t <= T0) return 1;
  const s = t - T0;
  return Math.min(MAX_MULT, Math.exp(A * s + B * s * s));
}

// Build everything the chart needs from the public noise seed:
//  waves = pullbacks (dump down, then recover), bot = Cousin's trades,
//  ticks = trade prints (time + jitter).
export function buildPath(noiseHex) {
  const r = mulberry32(seedInt(noiseHex, 7));
  const waves = [];
  let t = T0 + 0.6 + r() * 1.5;
  while (t < 90) {
    const down = 0.3 + r() * 1.1;
    const depth = 0.03 + Math.pow(r(), 2) * 0.17;
    const up = 0.7 + r() * 2.4;
    waves.push({ s: t, down, depth, up });
    t += down + up * (0.4 + r() * 0.8) + r() * 2;
  }

  // Cousin's trades. His exit is random and has nothing to do with the crash,
  // so copying him is no edge. Sometimes he sells early, sometimes he gets rekt.
  const rb = mulberry32(seedInt(noiseHex, 99));
  const bot = [{ t: 1.15, side: "buy" }];
  const exitX = Math.exp(Math.log(1.25) + rb() * (Math.log(15) - Math.log(1.25)));
  const exitT = timeForMult(exitX);
  if (rb() < 0.55 && exitT > T0 + 6) {
    // shakeout: dump on everyone, then buy back the dip
    const st = T0 + 2 + rb() * (exitT - T0 - 5);
    const back = st + 1.6 + rb() * 2;
    bot.push({ t: st, side: "sell" }, { t: back, side: "buy" });
    waves.push({ s: st, down: 0.5, hold: back - st - 0.5, depth: 0.12 + rb() * 0.1, up: 0.7, bot: true });
  }
  bot.push({ t: exitT, side: "sell", exit: true });
  // Cousin's first buy comes a few seconds after yours (never on top of you),
  // and always before any shakeout sell.
  let first = 2.2 + rb() * 2.8;
  if (bot.length > 2) first = Math.min(first, Math.max(1.6, bot[1].t - 0.8));
  bot[0].t = first;
  waves.push({ s: exitT, down: 0.55, depth: 0.16 + rb() * 0.12, up: 2.5 + rb() * 2, bot: true });
  waves.sort((a, b) => a.s - b.s);

  // Trade prints: irregular gaps (bursts now and then), jitter wanders in a
  // small band below the trend, so candles get real wicks and flicker.
  const tr = mulberry32(seedInt(noiseHex, 11));
  const ticks = [0], jit = [0.008];
  let tt = 0, j = 0.008;
  while (tt < 90) {
    const burst = tr() < 0.18;
    tt += Math.max(0.025, -Math.log(1 - tr()) * (burst ? 0.04 : 0.15));
    j += (tr() - 0.5) * 0.014 - 0.25 * (j - 0.009);
    j = Math.min(0.03, Math.max(0, j));
    ticks.push(tt); jit.push(j);
  }
  return { waves, bot, ticks, jit };
}

// Index of the last trade print at or before t.
export function tickIndex(p, t) {
  let lo = 0, hi = p.ticks.length - 1;
  if (t <= 0) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p.ticks[mid] <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
}

export function dip(p, t) {
  let d = 0;
  for (const w of p.waves) {
    if (t < w.s) break;
    const x = t - w.s, hold = w.hold || 0;
    if (x < w.down) d += w.depth * ease(x / w.down);
    else if (x < w.down + hold) d += w.depth;
    else if (x < w.down + hold + w.up) d += w.depth * (1 - ease((x - w.down - hold) / w.up));
  }
  return Math.min(d, 0.42);
}

// Near the cap the chart runs clean so the max win is exactly MAX_MULT.
function taper(e) { return e > MAX_MULT - 10 ? Math.max(0, (MAX_MULT - e) / 10) : 1; }

// Multiplier at the trade print n.
export function multAtTick(p, n) {
  const te = p.ticks[n], e = trend(te), k = taper(e);
  return e * (1 - dip(p, te) * k) * (1 - p.jit[n] * k);
}

export function multAt(p, t) {
  return multAtTick(p, tickIndex(p, t));
}

// Multiplier as paid: rounded down to 2 decimals.
export function paidMult(p, t) {
  return Math.floor(multAt(p, t) * 100) / 100;
}
