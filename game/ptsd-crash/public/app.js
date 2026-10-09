import { buildPath, multAtTick, tickIndex, paidMult, crashFromR, MAX_MULT } from "./path.js?v=10";

const $ = (id) => document.getElementById(id);
const LWC = window.LightweightCharts;
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const sgn = (n) => (n >= 0 ? "+" : "-") + fmt(Math.abs(n));
const IMG = { candy: "img/candy.webp", candyHead: "img/candy-head.webp", zach: "img/zach-head.webp", me: "img/pt-you.webp", cousin: "img/cousin-head.webp?v=2", cousinBody: "img/cousin-bust.webp", rekt: "img/pt-rekt.webp", rekt2: "img/rekt2.webp", win2: "img/win2x.webp", win4: "img/win-big.webp", max: "img/lambo.webp" };
// Full pictures with their own background (shown as a rounded card, not a cut-out).
const PHOTOS = new Set([IMG.rekt2, IMG.win2, IMG.win4, IMG.max, IMG.candy]);
// Character names on the chart.
const ME = "PT", BOT = "Cousin Dick";
let MAXM = MAX_MULT; // max multiplier (from the server config)

// ---------------- sound (house set: chip click + chimes) ----------------
let actx = null;
// Remembered on this device; falls back to memory when storage is blocked (private mode).
let mutedMem = null;
const muted = () => { if (mutedMem != null) return mutedMem; try { return localStorage.getItem("ptsd.muted") === "1"; } catch { return false; } };
function ctx() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
  if (actx.state === "suspended" && !muted()) actx.resume().catch(() => {});
  return actx;
}
function tone(freqs, type, peak, len, gap) {
  const c = ctx(); if (!c || muted()) return;
  const now = c.currentTime;
  freqs.forEach((f, i) => {
    const t0 = now + i * gap, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + len + 0.05);
  });
}
const sfx = {
  chip() {
    const c = ctx(); if (!c || muted()) return;
    const now = c.currentTime, buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = buf; f.type = "bandpass"; f.frequency.value = 3500;
    g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    n.connect(f); f.connect(g); g.connect(c.destination); n.start(now); n.stop(now + 0.06);
  },
  win: () => tone([659, 988], "triangle", 0.2, 0.5, 0.11),
  big: () => tone([523, 659, 784, 1047], "triangle", 0.18, 0.55, 0.1),
  step: () => tone([523.25, 783.99], "sine", 0.08, 0.35, 0.07),
  loss() {
    const c = ctx(); if (!c || muted()) return;
    const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(110, now + 0.45);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.6);
  },
};
// Heartbeat: starts at 2x, soft "bom bom" then a pause, the pause shortens as
// the multiplier climbs. On by default; ?heartbeat=0 turns it off on a device.
function thump(c, t0, f, vol) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f * 1.6, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.06);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
  o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.25);
  // higher layer so phone speakers can hear it
  const o2 = c.createOscillator(), g2 = c.createGain();
  o2.type = "triangle"; o2.frequency.setValueAtTime(f * 2.6, t0); o2.frequency.exponentialRampToValueAtTime(f * 2.2, t0 + 0.08);
  g2.gain.setValueAtTime(0, t0); g2.gain.linearRampToValueAtTime(vol * 0.45, t0 + 0.008); g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  o2.connect(g2); g2.connect(c.destination); o2.start(t0); o2.stop(t0 + 0.15);
}
// "bom bom", soft
sfx.beat = (strength) => {
  const c = ctx(); if (!c || muted()) return;
  const now = c.currentTime, v = 0.16 + 0.12 * strength;
  thump(c, now, 52, v);
  thump(c, now + 0.22, 46, v * 0.8);
};
try { if (new URLSearchParams(location.search).get("heartbeat") === "1") localStorage.setItem("ptsd.heartbeat", "1"); if (new URLSearchParams(location.search).get("heartbeat") === "0") localStorage.setItem("ptsd.heartbeat", "0"); } catch {}
const heartbeatOn = () => { try { return localStorage.getItem("ptsd.heartbeat") !== "0"; } catch { return true; } };
let lastBeat = 0;
function heartbeat(m) {
  if (!heartbeatOn() || m < 2) return;
  const bpm = Math.min(100, 56 + 11 * Math.log2(m / 2) * 2);
  const nowMs = performance.now();
  if (nowMs - lastBeat >= 60000 / bpm) { lastBeat = nowMs; sfx.beat(Math.min(1, (bpm - 56) / 44)); }
}

// ---------------- Cousin Dick's voice ----------------
// Recorded lines (public/voice/<moment>/NN.mp3). Each clip carries the words it
// says, so the caption on screen always matches what you hear. n = the multiplier
// he names in the clip: those clips only play when the real number is close.
const V = (dir, list) => list.map(([text, n], i) => ({ src: `voice/${dir}/${String(i + 1).padStart(2, "0")}.mp3`, text, n: n || 0 }));
const VOICE = {
  idle: V("idle", [
    ["Double $100 eleven times and you're a millionaire. Easy math."],
    ["FOMC meeting tonight. Rate cut obviously moons. Trust Saylor."],
    ["Saylor just bought more. Bullish."],
    ["Powell is printing tonight. I can feel it."],
    ["Rent is due Friday. One more trade fixes that."],
    ["One 10x and I quit my job."],
    ["Crypto Twitter says this is the one."],
    ["Got liquidated twice before lunch. Feeling lucky."],
    ["Zoom out, PT."],
  ]),
  tilt: V("tilt", [
    ["Sold the top at 5x. Outsmarted you again, PT.", 5],
    ["3x and out. You're new in the trenches, PT.", 3],
    ["Noobie move. I was out at 2x.", 2],
    ["Sold at 8x before you even found the sell button.", 8],
    ["You trade like it's your first day in the trenches."],
    ["Called the top at 10x. Add it to my track record.", 10],
    ["You were 11 doubles away from a million. Now you're 12."],
    ["FOMC didn't save you, PT. I sold at 5x.", 5],
    ["The rate cut wasn't priced in. Me selling at 100x was.", 100],
  ]),
  taunt: V("taunt", [
    ["Cute. I took profits, noobie."],
    ["I sold the top at 30x. That's why I'm the cousin.", 30],
    ["That's a tourist exit. I held to the moon."],
    ["Paper hands sell now. Grown-up money at 10x.", 10],
  ]),
  both: V("both", [
    ["We both got rekt, but I had conviction."],
    ["Rate cut tonight. We make it back."],
    ["Saylor would've held too. Probably."],
  ]),
  heckle: V("heckle", [
    ["This is where noobies sell."],
    ["Your hands are shaking, PT. I can see it from here."],
    ["Holding through FOMC? Brave."],
    ["Saylor wouldn't sell here."],
    ["Sell now, PT. Or don't. I'm not your dad."],
  ]),
  small: V("small", [
    ["That's ramen money, PT."],
    ["Real traders wait. You'll learn."],
  ]),
};
const voiceBufs = new Map();
let voiceNow = null, voiceEndsAt = 0, lastVoice = "";
function loadVoice(src) {
  if (!voiceBufs.has(src)) {
    const c = ctx();
    voiceBufs.set(src, !c ? Promise.resolve(null) : fetch(src).then((r) => r.arrayBuffer()).then((b) => new Promise((ok) => c.decodeAudioData(b, ok, () => ok(null)))).catch(() => null));
  }
  return voiceBufs.get(src);
}
// A clip for this moment. `x` = the real multiplier he'd be talking about:
// clips that name a number only qualify when it's within ~25% of the real one.
function pickVoice(kind, x) {
  const ok = VOICE[kind].filter((v) => !v.n || (x && Math.abs(Math.log(x / v.n)) < 0.23));
  const pool = ok.length > 1 ? ok.filter((v) => v.src !== lastVoice) : ok;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
// Plays a clip. Important moments cut off whatever he was saying; chatter
// (idle, heckles) waits its turn and is skipped if he's mid-sentence.
function sayVoice(v, important) {
  if (!v || dickOff()) return;
  if (!important && performance.now() < voiceEndsAt) return;
  lastVoice = v.src;
  loadVoice(v.src).then((buf) => {
    const c = ctx();
    if (!buf || !c || dickOff()) return;
    try { if (voiceNow) voiceNow.stop(); } catch {}
    const n = c.createBufferSource(), g = c.createGain();
    n.buffer = buf; g.gain.value = 0.95;
    n.connect(g); g.connect(c.destination); n.start();
    voiceNow = n; voiceEndsAt = performance.now() + buf.duration * 1000 + 300;
    n.onended = () => { if (voiceNow === n) voiceNow = null; };
  });
}
function voicePreload() { for (const k of ["tilt", "both", "heckle", "small", "taunt"]) VOICE[k].forEach((v) => loadVoice(v.src)); }

// Two switches: sound effects (clicks, chimes, heartbeat, the intro song) and
// Cousin Dick's voice. Each is remembered on this device.
let dickMem = null;
const dickOff = () => { if (dickMem != null) return dickMem; try { return localStorage.getItem("ptsd.dickoff") === "1"; } catch { return false; } };
function shutUpDick() { try { if (voiceNow) voiceNow.stop(); } catch {} voiceNow = null; voiceEndsAt = 0; }
function syncMute() {
  $("muteBtn").textContent = muted() ? "🔇" : "🔊";
  $("muteBtn").title = muted() ? "Sound effects: off" : "Sound effects: on";
  $("dickBtn").classList.toggle("off", dickOff());
  $("dickBtn").title = dickOff() ? "Cousin Dick's voice: off" : "Cousin Dick's voice: on";
}
$("muteBtn").onclick = () => {
  mutedMem = !muted();
  try { localStorage.setItem("ptsd.muted", mutedMem ? "1" : "0"); } catch {}
  if (mutedMem) stopSong();
  syncMute(); ctx();
  toast(IMG.me, mutedMem ? "Sound effects off." : "Sound effects on.", 1600);
};
$("dickBtn").onclick = () => {
  dickMem = !dickOff();
  try { localStorage.setItem("ptsd.dickoff", dickMem ? "1" : "0"); } catch {}
  if (dickMem) shutUpDick();
  syncMute(); ctx();
  toast(IMG.cousin, dickMem ? "Cousin Dick muted. He'll still type." : "Cousin Dick can talk again.", 1800);
};
syncMute();

// The intro song ("Rugged Rekt Liquidated"): plays once per visit when the page opens.
// Browsers only allow sound after a tap, so if it's blocked it starts on the first tap/key.
let songNode = null;
function stopSong() { try { if (songNode) songNode.stop(); } catch {} songNode = null; }
async function playSong() {
  if (muted()) return;
  const c = ctx(); if (!c) return;
  try {
    const r = await fetch("audio/intro.mp3");
    if (!r.ok) return; // no song file added yet
    const data = await r.arrayBuffer();
    const buf = await new Promise((ok) => c.decodeAudioData(data, ok, () => ok(null)));
    if (!buf || muted()) return;
    stopSong();
    const n = c.createBufferSource(), g = c.createGain();
    n.buffer = buf; g.gain.value = 0.8;
    n.connect(g); g.connect(c.destination); n.start();
    songNode = n;
    // Cousin Dick keeps quiet while the song plays
    voiceEndsAt = Math.max(voiceEndsAt, performance.now() + buf.duration * 1000);
    n.onended = () => { if (songNode === n) songNode = null; };
  } catch {}
}

// ---------------- api ----------------
let offset = 0;
let user = null; // signed-in player { username, name, pfp }
let blockedInfo = null; // set when the server says this account is flagged as a bot (the game then stays locked)
// Hash of the server seed for your next round, locked before you bet.
let nextCommit = "";
// Which lock was on screen when each round was bought, so the check can prove it.
const COMMITS_KEY = "ptsd.commits";
function saveCommit(id, c) {
  try {
    const m = JSON.parse(localStorage.getItem(COMMITS_KEY) || "{}");
    m[id] = c;
    const keys = Object.keys(m);
    for (const k of keys.slice(0, Math.max(0, keys.length - 80))) delete m[k];
    localStorage.setItem(COMMITS_KEY, JSON.stringify(m));
  } catch {}
}
function savedCommit(id) { try { return JSON.parse(localStorage.getItem(COMMITS_KEY) || "{}")[id] || ""; } catch { return ""; } }
const now = () => Date.now() + offset;
async function api(path, body) {
  const t0 = Date.now();
  const r = await fetch("api/" + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (j.serverNow && Date.now() - t0 < 1500) offset = j.serverNow - (t0 + Date.now()) / 2;
  if (j.nextCommit) nextCommit = j.nextCommit;
  if (j.blocked) showBlocked(j);
  if (r.status === 401 && j.signIn) { user = null; syncUser(); openSignIn(); }
  if (!r.ok) throw Object.assign(new Error(j.error || "Network error, try again."), { status: r.status });
  return j;
}

// ---------------- tickers ----------------
// A fresh coin every round, like aping into a new launch.
const TICKERS = ["PeeTsTds", "Dick", "PTSDICK", "GENWEALTH"]; // from the PTSD team
const LOGO_COLORS = ["#F05150", "#00D8C6", "#E8A317", "#8a3bb0", "#12b886", "#3b82f6", "#ff7a1a", "#e64fa3"];
const PRICE_LEVELS = [0.00004269, 0.000690, 0.0042, 0.069, 0.42, 4.2, 69, 420, 6900];
let ticker = { sym: "PTSD", color: LOGO_COLORS[0], anchor: 7200 };
function newTicker() {
  let sym;
  do { sym = TICKERS[Math.floor(Math.random() * TICKERS.length)]; } while (sym === ticker.sym);
  const lvl = PRICE_LEVELS[Math.floor(Math.random() * PRICE_LEVELS.length)];
  ticker = { sym, color: LOGO_COLORS[Math.floor(Math.random() * LOGO_COLORS.length)], anchor: lvl * (0.8 + Math.random() * 0.5) };
  document.querySelectorAll(".tk-sym").forEach((e) => (e.textContent = "$" + sym + "/USD"));
  document.querySelectorAll(".tk-logo").forEach((e) => { e.textContent = sym[0]; e.style.background = ticker.color; });
  document.title = `$${sym} · PTSD Crash`;
}
function priceDecimals(p) { return p >= 1000 ? 2 : p >= 1 ? 4 : p >= 0.01 ? 5 : p >= 0.0001 ? 7 : 9; }
function fmtPrice(p, ref) { const d = priceDecimals(Math.max(p, ref || 0)); return p.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

// ---------------- chart ----------------
const isPhone = () => window.matchMedia("(max-width: 899px)").matches;
const chart = LWC.createChart($("chart"), {
  autoSize: true,
  layout: { background: { type: "solid", color: "#0e0f11" }, textColor: "#8a919c", fontFamily: "Manrope, sans-serif", fontSize: 11 },
  grid: { vertLines: { color: "#18191c" }, horzLines: { color: "#18191c" } },
  rightPriceScale: { borderColor: "#292a2c", scaleMargins: { top: 0.28, bottom: 0.14 } },
  timeScale: { borderColor: "#292a2c", timeVisible: true, secondsVisible: true, rightOffset: isPhone() ? 4 : 8, barSpacing: isPhone() ? 7 : 10, fixLeftEdge: false },
  crosshair: { mode: 0, vertLine: { color: "#3a3d44" }, horzLine: { color: "#3a3d44" } },
  handleScroll: false, handleScale: false,
  localization: { priceFormatter: (p) => (p < 0 ? "" : fmtPrice(p, ticker.anchor)) },
});
const series = chart.addCandlestickSeries({
  upColor: "#12b886", downColor: "#f05150", borderVisible: false, wickUpColor: "#12b886", wickDownColor: "#f05150",
  priceFormat: { type: "price", precision: 9, minMove: 1e-9 },
});
const volSeries = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

// Steady price scale: it only widens when price runs into the edge (then eases
// out), so candles visibly climb the screen instead of the axis chasing them.
let view = null, viewTarget = null;
series.applyOptions({
  autoscaleInfoProvider: (orig) => {
    const o = orig();
    if (!view) return o;
    return { priceRange: { minValue: view.min, maxValue: view.max }, margins: o ? o.margins : undefined };
  },
});
function updateView(snap) {
  const lr = chart.timeScale().getVisibleLogicalRange();
  if (!bars.length) return;
  const from = Math.max(0, Math.floor(lr ? lr.from : 0)), to = Math.min(bars.length - 1, Math.ceil(lr ? lr.to : bars.length - 1));
  let hi = -Infinity, lo = Infinity;
  for (let i = from; i <= to; i++) { hi = Math.max(hi, bars[i].high); lo = Math.min(lo, bars[i].low); }
  if (!isFinite(hi)) return;
  if (!viewTarget) { const pad = (hi - lo) * 0.25 || hi * 0.01; viewTarget = { min: lo - pad, max: hi + pad }; view = { ...viewTarget }; return; }
  const range = viewTarget.max - viewTarget.min;
  if (hi > viewTarget.max - range * 0.03) viewTarget.max = hi + (hi - viewTarget.min) * 0.4;
  if (lo < viewTarget.min + range * 0.02) viewTarget.min = Math.max(0, lo - (viewTarget.max - lo) * 0.06);
  const f = snap ? 1 : 0.22;
  view.max += (viewTarget.max - view.max) * f;
  view.min += (viewTarget.min - view.min) * f;
}

let bars = [];      // candles on screen
let vols = [];
let entryLine = null;
function volFor(bar, size) {
  return { time: bar.time, value: size, color: bar.close >= bar.open ? "rgba(18,184,134,.45)" : "rgba(240,81,80,.45)" };
}
function putBar(bar, vol) {
  const last = bars[bars.length - 1];
  if (last && bar.time < last.time) { report("old-bar", `${bar.time} < ${last.time}`); return; }
  if (last && last.time === bar.time) { bars[bars.length - 1] = bar; vols[vols.length - 1] = volFor(bar, vol); }
  else { bars.push(bar); vols.push(volFor(bar, vol)); }
  series.update(bar);
  volSeries.update(vols[vols.length - 1]);
  legend(bar);
}
function legend(b) {
  const ch = ((b.close - b.open) / b.open) * 100, cls = b.close >= b.open ? "o-up" : "o-dn";
  const f = (v) => fmtPrice(v, ticker.anchor);
  $("ohlc").innerHTML = `O<span class="${cls}">${f(b.open)}</span> H<span class="${cls}">${f(b.high)}</span> L<span class="${cls}">${f(b.low)}</span> C<span class="${cls}">${f(b.close)}</span> <span class="${cls}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%</span>`;
}

// Idle market: a calm, choppy chart while nobody has a position.
let idle = { price: 7200, bar: null, vol: 0 };
function idleStep(p) {
  const drift = (ticker.anchor - p) * 0.004;
  return Math.max(ticker.anchor * 0.5, p + drift + (Math.random() - 0.5) * p * 0.0045);
}
function resetChart() {
  const endSec = Math.floor(now() / 1000);
  bars = []; vols = [];
  newTicker();
  let p = ticker.anchor * (0.96 + Math.random() * 0.08);
  for (let i = 70; i >= 1; i--) {
    const o = p; let h = o, l = o;
    for (let j = 0; j < 5; j++) { p = idleStep(p); h = Math.max(h, p); l = Math.min(l, p); }
    const b = { time: endSec - i, open: o, high: h * (1 + Math.random() * 0.0007), low: l * (1 - Math.random() * 0.0007), close: p };
    bars.push(b); vols.push(volFor(b, 8 + Math.random() * 30));
  }
  view = null; viewTarget = null;
  series.setData(bars); volSeries.setData(vols);
  updateView(true);
  idle = { price: p, bar: null, vol: 8 + Math.random() * 30, cousin: false, age: 0 };
  if (entryLine) { series.removePriceLine(entryLine); entryLine = null; }
  clearMarkers();
  chart.timeScale().scrollToRealTime();
  legend(bars[bars.length - 1]);
}
function idleTick() {
  const sec = Math.floor(now() / 1000);
  const last = bars[bars.length - 1];
  if (!idle.bar || idle.bar.time !== sec) {
    if (last && sec <= last.time) return;
    idle.bar = { time: sec, open: idle.price, high: idle.price, low: idle.price, close: idle.price };
    idle.vol = 8 + Math.random() * 30;
  }
  idle.price = idleStep(idle.price);
  if (!idle.cousin && idle.age++ > 25 && Math.random() < 0.012) {
    idle.cousin = true;
    idle.price *= 1.006 + Math.random() * 0.01;
    const at = idle.price;
    setTimeout(() => {
      addMarker({ time: sec, price: at, img: IMG.cousin, label: "COUSIN DICK BUY" });
      floatText(sec, at, "+" + (0.6 + Math.random() * 1).toFixed(2) + "%", true);
      toast(IMG.cousin, pick(EARLY));
    }, 0);
  }
  const b = idle.bar;
  b.close = idle.price; b.high = Math.max(b.high, b.close); b.low = Math.min(b.low, b.close);
  putBar({ ...b }, idle.vol);
}

// Degen lines shown while there's no position open.
const LINES = [
  "Gen Wealth Awaits You",
  "This is the right ticker, I can feel it.",
  "Last dip before the god candle.",
  "We're so early.",
  "Bottom is in. Trust.",
  "One more trade and I'm done.",
  "Dev is based. Probably.",
  "It's not a loss if you don't sell.",
  "Few understand this chart.",
  "Diamond hands, cousin.",
  "Wen lambo? Today.",
  "Chart looks bullish af.",
  "Number only goes up.",
  "Generational entry right here.",
  "Send it.",
  "Double $100 eleven times and you're a millionaire. Easy math, PT.",
  "FOMC meeting tonight. Rate cut obviously moons.",
  "Trust Saylor.",
  "Saylor just bought more. Bullish.",
  "Powell is printing tonight. I can feel it.",
  "Rent is due Friday. One more trade fixes that.",
  "One 10x and I quit my job.",
  "Zoom out, PT.",
  "CT says this is the one.",
  "Got liquidated twice before lunch. Feeling lucky.",
];
let lineIdx = Math.floor(Math.random() * LINES.length);
function nextLine() {
  const el = $("idleLine");
  lineIdx = (lineIdx + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length;
  el.classList.remove("in"); void el.offsetWidth;
  el.textContent = LINES[lineIdx];
  el.classList.add("in");
}
setInterval(() => { if (!$("idleMsg").hidden && performance.now() >= voiceEndsAt) nextLine(); }, 4200);
// Every so often while you're not in a round he says one out loud (after your first tap,
// browsers block sound before that).
let idleVoiceAt = performance.now() + 9000;
setInterval(() => {
  if ($("idleMsg").hidden || !actx || actx.state !== "running" || muted() || performance.now() < idleVoiceAt) return;
  idleVoiceAt = performance.now() + 45000 + Math.random() * 30000;
  const v = pickVoice("idle");
  const el = $("idleLine");
  el.classList.remove("in"); void el.offsetWidth; el.textContent = v.text; el.classList.add("in");
  sayVoice(v);
}, 1000);

// Cousin's lines. {x} = where Cousin sold, {me} = where you sold.
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// He sold before the crash, you rode it to zero.
const TILT = [
  "Thanks for the exit liquidity, cousin. I sold at {x}.",
  "I sold at {x}. You held the bag, cousin.",
  "Cousin, I literally sold in front of you at {x}.",
  "Take profit, cousin. I did, at {x}.",
  "You saw me sell at {x}, cousin. You saw me.",
  "I was out at {x}. Who taught you how to trade, cousin?",
  "I sold at {x} and bought a steak. What did you buy, cousin?",
  "Cousin, that red candle was me. Sold at {x}.",
  "Every pump needs a bagholder. Thanks for volunteering, cousin.",
  "I took {x} and left. You took the stairs down.",
  "Cousin, you held so long I thought you were the dev.",
  "Sold at {x}. Your bags are my retirement plan.",
  "You call it diamond hands. I call it exit liquidity.",
  "I sold at {x} and I'm still laughing, cousin.",
  "Cousin, that was the top at {x} and you watched it happen.",
  "I'll send you a pic from the lambo. Sold at {x}.",
  "I dumped at {x} and you still didn't get the hint.",
  "That wasn't a dip, cousin. That was me selling at {x}.",
  "Next time follow the family. I was out at {x}.",
  "I sold the top at {x}. You bought a cliff.",
  "Cousin, some people trade. You donate.",
  "Don't worry cousin, I'll buy you a coffee with your money.",
  "{x} and out. That's how the family eats.",
  "Holding to zero is a choice, cousin. A bad one.",
  "Cousin, the chart was screaming sell at {x}.",
  "You're the reason I made money today. Thanks, cousin.",
  "I sold at {x}. You sold your dignity.",
  "Gen wealth, cousin. For my generation, not yours.",
  "Rule one, cousin. Never be the last one holding.",
  "Your mom called. She wants her card back, cousin.",
  "You got those 25k you owe me yet, cousin?",
  "Sold at {x}. Now about those 25k you owe me, cousin.",
  "Sold the top at {x}. Outsmarted you again, PT.",
  "{x} and out. You're new in the trenches, PT.",
  "Noobie move. I was out at {x}.",
  "I sold at {x} before you even found the sell button.",
  "You trade like it's your first day in the trenches.",
  "Called the top at {x}. Add it to my track record.",
  "You were 11 doubles away from a million. Now you're 12.",
  "FOMC didn't save you, PT. I sold at {x}.",
  "The rate cut wasn't priced in. Me selling at {x} was.",
];
// You sold early, he held way higher (the big-gap popup under the title).
const TAUNT = [
  "You sold at {me}. I held to {x}.",
  "{me}? I rode it to {x}, cousin.",
  "You left {x} on the table, cousin.",
  "Paper hands at {me}. Diamond hands at {x}.",
  "I was still in at {x}. Where were you, cousin?",
  "You sold at {me} like the chart owed you money.",
  "{me} is a nice start. I took {x}.",
  "Cousin, you got shaken out at {me}. I sold at {x}.",
  "Scared money makes no money, cousin.",
  "You sold at {me}? Cute. I took {x}, noobie.",
  "You sold at {me}. I sold the top at {x}. That's why I'm the cousin.",
  "Tourists sell at {me}. I held to {x}.",
  "Paper hands at {me}. Grown-up money at {x}.",
];
// You both rode it to zero.
const BOTH_REKT = [
  "We both got rekt, but I had conviction.",
  "Rate cut tonight. We make it back.",
  "Saylor would've held too. Probably.",
];
// While you're holding (he talks every so often).
const HECKLE = [
  "This is where noobies sell.",
  "Your hands are shaking, PT. I can see it from here.",
  "Holding through FOMC? Brave.",
  "Saylor wouldn't sell here.",
  "Sell now, PT. Or don't. I'm not your dad.",
];
// ZachGPT (the scam-exposing AI) pops in now and then. Pure flavor: it's random
// and knows nothing about the crash.
const ZACH = [
  "Suspicious wallet detected 👀",
  "Dev wallet just moved funds. Probably nothing.",
  "Tracing Cousin Dick's wallet… this is bad.",
  "Insiders hold 87% of supply. Totally normal.",
  "Scanning contract… mint function still on 👀",
  "This chart has been reported 69 times.",
  "Same dev rugged 4 coins this week. Stay safe.",
  "Bundled wallets detected. Good luck, PT.",
];
// Candy (PT's high-school sweetheart) on big wins. She still thinks he's a genius.
const CANDY = [
  "I always knew you were a genius investor, PT 😍",
  "French dinner tonight? You're paying, crypto king.",
  "My mom said crypto was a scam. Wait till I tell her.",
  "Is this what they call generational wealth?",
  "Proof of steak, baby.",
];
// Fake news ticker.
const NEWS = [
  "FOMC meeting tonight. Rate cut obviously moons",
  "Saylor buys more Bitcoin, again",
  "Cousin Dick spotted at a Lambo dealership",
  "ZachGPT exposes another rug",
  "Powell seen near the money printer",
  "Local degen doubles $100 for the 4th time. 7 to go",
  "SD has not been seen in 3 weeks",
  "Candy still believes in PT",
  "CT influencer: \"this is the one\"",
  "Analysts confirm number go up",
  "PT's mom asks where her card is",
  "Cousin Dick claims he called the top. Again",
];
// You sold for a small win.
const SMALL_WIN = [
  "{me}? That's ramen money, PT.",
  "Real traders wait. You'll learn.",
];
// He dumped mid-round while you're holding (a shakeout).
const DUMP = [
  "<b>Cousin Dick</b> just dumped on you. Shakeout or top?",
  "<b>Cousin Dick</b> hit sell. Scared yet?",
  "<b>Cousin Dick</b> is shaking out the paper hands.",
  "<b>Cousin Dick</b> dumped. Hold or fold, cousin?",
  "<b>Cousin Dick</b> sold. He always comes back though.",
  "<b>Cousin Dick</b> is freeing up capital to deploy more.",
];
// He buys the chart before you do.
const EARLY = [
  "<b>Cousin Dick</b> got in before you. Early bird, cousin.",
  "<b>Cousin Dick</b> already bought. You coming or what?",
  "<b>Cousin Dick</b> is in. Family always gets in first.",
  "<b>Cousin Dick</b> aped in. This is the right ticker, he can feel it.",
];
// He follows you in a few seconds after your buy.
const ENTRY = [
  "<b>Cousin Dick</b> followed you in.",
  "<b>Cousin Dick</b> is in too. Family trade.",
  "<b>Cousin Dick</b> aped in behind you.",
  "<b>Cousin Dick</b> is deploying capital.",
];
// He bought back in.
const REBUY = [
  "<b>Cousin Dick</b> bought the dip.",
  "<b>Cousin Dick</b> is back in. Told you it was a shakeout.",
  "<b>Cousin Dick</b> loaded up again.",
  "<b>Cousin Dick</b> aped back in.",
  "<b>Cousin Dick</b> is deploying more capital.",
];
// He took profit while you're still holding.
const EXIT = [
  "<b>Cousin Dick</b> took profit at <b>{x}</b>. You still holding?",
  "<b>Cousin Dick</b> is out at <b>{x}</b>. Your call, cousin.",
  "<b>Cousin Dick</b> cashed out at <b>{x}</b>. Brave of you to stay.",
  "<b>Cousin Dick</b> sold at <b>{x}</b> and he's not coming back.",
];

// ---------------- markers + floating labels ----------------
let markers = [];
function clearMarkers() { markers.forEach((m) => m.el.remove()); markers = []; $("markers").querySelectorAll(".float").forEach((e) => e.remove()); }
function addMarker({ time, price, img, sell, me, label }) {
  const el = document.createElement("div");
  // You: buys under the candle, sells over it. Cousin: the other way round, so you never cover each other.
  const above = me ? sell : !sell;
  el.className = `mk pop-in ${sell ? "sell" : "buy"} ${above ? "above" : "below"}${me ? " me" : " bot"}`;
  el.innerHTML = `<img src="${img}" alt=""><b>${label}</b>`;
  $("markers").appendChild(el);
  markers.push({ time, price, el });
  placeMarkers();
}
function placeMarkers() {
  const ts = chart.timeScale();
  for (const m of markers) {
    const x = ts.timeToCoordinate(m.time), y = series.priceToCoordinate(m.price);
    if (x == null || y == null) { m.el.style.opacity = 0; continue; }
    m.el.style.opacity = 1;
    m.el.style.left = x + "px";
    m.el.style.top = (m.el.classList.contains("above") ? y - 6 : y + 6) + "px";
  }
}
function floatText(time, price, text, up) {
  const x = chart.timeScale().timeToCoordinate(time), y = series.priceToCoordinate(price);
  if (x == null || y == null) return;
  const el = document.createElement("div");
  el.className = "float " + (up ? "up" : "dn");
  el.textContent = text;
  el.style.left = x + 26 + "px"; el.style.top = y - 10 + "px";
  $("markers").appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

// ---------------- toasts + popups ----------------
let lastToastAt = 0;
function toast(img, html, ms = 3200) {
  lastToastAt = performance.now();
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<img src="${img}" alt=""><div>${html}</div>`;
  // Lives under the trade buttons, newest on top; phones only have room for one.
  const box = $("toasts");
  box.prepend(el);
  const keep = isPhone() ? 1 : 3;
  [...box.children].slice(keep).forEach((x) => x.remove());
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, ms);
}
let popAction = null;
let popTimer = null;
let popShareData = null;
function popup({ kind, img, title, line, num, btn = "Run it back", action = "rebuy", autoClose = 0, badge = "", share = null }) {
  clearTimeout(popTimer);
  if (autoClose) popTimer = setTimeout(closePop, autoClose);
  $("pop").className = "pop " + kind;
  $("popImg").src = img;
  $("popImg").classList.toggle("photo", PHOTOS.has(img));
  $("popTitle").textContent = title;
  $("popBadge").textContent = badge || "";
  $("popShares").hidden = !share;
  shareNote("");
  popShareData = share || null;
  cardBlob = null;
  if (share) {
    makeCard(share).then((b) => { if (popShareData === share) cardBlob = b; });
    share.link = shareLink(share);
  }
  $("popLine").textContent = line;
  $("popNum").textContent = num || "";
  $("popBtnText").textContent = btn;
  $("popBtnSub").hidden = action !== "rebuy"; // "Run it back" popups say it's the same trade
  $("popClose").hidden = action !== "rebuy"; // ...and also get a Close button
  popAction = action;
  $("pop").hidden = false;
}
// ---------------- share card ----------------
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
async function makeCard({ mult, pnl, img }) {
  const W = 1080, H = 1080, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { await Promise.all([document.fonts.load('80px "Rubik Glitch"'), document.fonts.load('800 60px Manrope')]); } catch {}
  const [logo, ch] = await Promise.all([loadImg("img/ptsd-logo.webp"), loadImg(img)]);
  g.fillStyle = "#0e0f11"; g.fillRect(0, 0, W, H);
  // chart
  try {
    const shot = chart.takeScreenshot();
    const cw = W - 60, chh = Math.min(560, (shot.height / shot.width) * cw);
    g.drawImage(shot, 30, 170, cw, chh);
    g.strokeStyle = "#292a2c"; g.lineWidth = 2; g.strokeRect(30, 170, cw, chh);
  } catch {}
  const grad = g.createLinearGradient(0, 560, 0, H);
  grad.addColorStop(0, "rgba(14,15,17,0)"); grad.addColorStop(0.45, "rgba(14,15,17,.92)"); grad.addColorStop(1, "#0e0f11");
  g.fillStyle = grad; g.fillRect(0, 560, W, H - 560);
  // header
  if (logo) g.drawImage(logo, 40, 40, (logo.width / logo.height) * 90, 90);
  g.fillStyle = "#fff"; g.font = '800 46px Manrope, sans-serif'; g.textBaseline = "middle";
  g.fillText("CRASH", 70 + (logo ? (logo.width / logo.height) * 90 : 0), 88);
  g.textAlign = "right"; g.fillStyle = ticker.color; g.font = '800 44px Manrope, sans-serif';
  g.fillText("$" + ticker.sym, W - 40, 88);
  g.textAlign = "left";
  // result
  g.fillStyle = "#12b886"; g.font = '800 190px Manrope, sans-serif'; g.textBaseline = "alphabetic";
  g.fillText(mult.toFixed(2) + "x", 40, 900);
  g.font = '800 58px Manrope, sans-serif';
  g.fillText(`${sgn(pnl)} ${coin}`, 46, 980);
  g.fillStyle = "#e7e9ee"; g.font = '800 30px Manrope, sans-serif';
  g.fillText(titleFor({ state: mult >= MAXM ? "max" : "sold", soldMult: mult }).toUpperCase(), 48, 700);
  if (ch && PHOTOS.has(img)) {
    const sz = 360, x = W - sz - 34, y = H - sz - 90;
    g.save(); g.beginPath(); g.roundRect(x, y, sz, sz, 28); g.clip(); g.drawImage(ch, x, y, sz, sz); g.restore();
    g.strokeStyle = "#12b886"; g.lineWidth = 6; g.beginPath(); g.roundRect(x, y, sz, sz, 28); g.stroke();
  } else if (ch) { const hh = 420, ww = (ch.width / ch.height) * hh; g.drawImage(ch, W - ww - 10, H - hh - 50, ww, hh); }
  g.fillStyle = "#6a727d"; g.font = '700 26px Manrope, sans-serif';
  g.fillText("PTSD Crash", 48, H - 34);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
let cardBlob = null;
function gameUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
// Every win gets its own link (<game>/win/...). X and Telegram show the win
// card under the post by themselves, and clicking it lands on the game.
// Phones also get the system share sheet with the image attached.
function shareLink(d) {
  if (!d.id) return Promise.resolve(gameUrl());
  return api("share", { id: d.id, sym: ticker.sym, color: ticker.color }).then((j) => j.url).catch(() => gameUrl());
}
const touchDevice = () => window.matchMedia("(pointer: coarse)").matches;
// The player's own win link is added after this text (X's &url=, or "text link" in the share sheet), so it ends on the call to action.
function shareText(d) { return `I just hit a ${d.mult.toFixed(2)}X playing @${(cfg && cfg.handle) || "ptsdshow"}'s PTSD CRASH and made ${sgn(d.pnl)} ${coin} 📈\n\nMega fun and addictive, try it free 👉`; }
function cardName(d) { return `ptsd-crash-${d.mult.toFixed(2)}x.png`; }
function shareNote(t) { $("popShareNote").textContent = t; $("popShareNote").hidden = !t; }
async function nativeShare(d) {
  if (!touchDevice() || !navigator.canShare) return false;
  const [blob, link] = await Promise.all([cardBlob || makeCard(d), d.link]);
  const file = blob && new File([blob], cardName(d), { type: "image/png" });
  if (!file || !navigator.canShare({ files: [file] })) return false;
  try { await navigator.share({ files: [file], text: `${shareText(d)} ${link}` }); } catch (e) { if (!e || e.name !== "AbortError") return false; }
  return true;
}
// Open the tab inside the tap (or the browser blocks it), fill in the address once the link is ready.
async function openShare(d, make) {
  const w = window.open("", "_blank");
  const url = make(await d.link);
  if (w) { try { w.opener = null; } catch {} w.location.href = url; } else location.href = url;
}
$("popShare").onclick = async () => {
  const d = popShareData;
  if (!d) return;
  clearTimeout(popTimer);
  if (touchDevice()) { if (await nativeShare(d)) return; }
  openShare(d, (link) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText(d))}`);
};
$("popShareX").onclick = async () => {
  const d = popShareData;
  if (!d) return;
  clearTimeout(popTimer);
  if (touchDevice()) { if (await nativeShare(d)) return; }
  openShare(d, (link) => `https://x.com/intent/post?text=${encodeURIComponent(shareText(d))}&url=${encodeURIComponent(link)}`);
};

function closePop() {
  $("pop").hidden = true;
  if (round && round.over) backToIdleSoon();
}
$("pop").addEventListener("click", (e) => { if (e.target === $("pop")) closePop(); });
$("popClose").onclick = closePop;
$("popBtn").onclick = () => {
  const rebuy = popAction === "rebuy" && (!round || round.over);
  $("pop").hidden = true;
  if (rebuy) doBuy(); else if (round && round.over) backToIdleSoon();
};
// After a rug the crash stays on screen ~2s, then the calm pre-buy chart comes back.
let idleTimer = null;
function backToIdleSoon() {
  if (!round || !round.over) return;
  clearTimeout(idleTimer);
  const wait = Math.max(0, 2000 - (performance.now() - (round.overAt || 0)));
  const id = round.id;
  idleTimer = setTimeout(() => { if (round && round.id === id && round.over && $("pop").hidden) skipRound(); }, wait);
}
$("chartWrap").addEventListener("click", () => { if (round && round.over && $("pop").hidden) backToIdleSoon(); });

// ---------------- game state ----------------
let cfg = null, coin = "CREDITS", lim = { min: 1000, max: 10000 }, balance = 0, sessionPnl = 0;
let round = null;   // the position on screen
let history = [];

function setBalance(b) { balance = b; $("balTop").textContent = fmt(b); $("balBottom").textContent = `${fmt(b)} ${coin}`; if (user) rankSoon(); }
// Top-bar rank: your place on the leaderboard (the campaign board while a campaign runs).
let rankTimer = 0;
async function refreshRank() {
  if (!user) { $("rankPill").hidden = true; return; }
  try {
    const j = await api("leaderboard?limit=1");
    $("rankNum").textContent = j.mine ? j.mine.rank : "–";
    $("rankTot").textContent = j.players || "–";
    $("rankPill").hidden = false;
  } catch {}
}
function rankSoon() { clearTimeout(rankTimer); rankTimer = setTimeout(refreshRank, 1500); }
setInterval(() => { if (document.visibilityState === "visible") refreshRank(); }, 30000);
let onb = null; // onboarding + claim state from the server
function setPnl() { const el = $("pnlBottom"); el.textContent = `${sgn(sessionPnl)} ${coin}`; el.className = sessionPnl > 0 ? "w" : sessionPnl < 0 ? "l" : ""; }

function chipsUI() {
  const vals = [lim.min, lim.min * 2, lim.min * 5, lim.max].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
  $("chips").innerHTML = vals.map((v) => `<button class="chip" data-v="${v}" type="button">${v === lim.max ? "MAX" : v >= 1000 ? v / 1000 + "K" : v}</button>`).join("");
  $("chips").querySelectorAll(".chip").forEach((b) => (b.onclick = () => { $("amtIn").value = fmt(+b.dataset.v); sfx.chip(); markChip(); }));
}
function amount() { return Math.floor(Number(String($("amtIn").value).replace(/[^0-9]/g, ""))); }
function markChip() { const a = amount(); $("chips").querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", +b.dataset.v === a)); }
$("amtIn").addEventListener("input", () => { const a = amount(); $("amtIn").value = a ? fmt(a) : ""; markChip(); });

// A title for every round, shown in history and on the popups.
function titleFor(h) {
  if (h.state === "max") return `${h.cap || MAXM}x God`;
  if (h.state === "rekt") {
    if (h.halfMult) return "Half Saved";
    if (h.crash != null && h.crash < 1.1) return "Instant Rug";
    if (h.crash != null && h.crash >= 5) return "Round Tripped";
    return "Rekt";
  }
  const m = h.soldMult;
  if (m == null) return "";
  if (m < 1) return "Panic Seller";
  if (h.crash != null && m >= 1.5 && m >= h.crash * 0.9) return "Sold the Top";
  if (m < 1.5) return "Paper Hands";
  if (m < 3) return "Took Profit";
  if (m < 10) return "Diamond Hands";
  if (m >= MAXM - 0.5) return `${MAXM}x God`;
  return "Gen Wealth";
}

function renderHistory() {
  if (!history.length) { $("hist").innerHTML = `<div class="side-empty">No rounds yet.</div>`; $("pills").innerHTML = ""; return; }
  $("hist").innerHTML = history.slice(0, 25).map((h) => {
    const won = h.pnl > 0;
    const cx = h.crash != null ? h.crash.toFixed(2) + "x" : "…";
    const ttl = titleFor(h);
    const res = h.state === "rekt" ? `Rekt at ${cx}` : h.state === "max" ? `${xf(h.soldMult || MAXM)} MAX` : `Sold ${h.soldMult.toFixed(2)}x`;
    const t = new Date(h.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `<div class="hrow" data-id="${h.id}" title="Tap to check this round"><span class="h-res ${won ? "w" : "l"}">${res}</span><span class="h-res ${won ? "w" : "l"}">${sgn(h.pnl)}</span><span class="h-sub">${ttl ? `<i class="ttl ${won ? "w" : "l"}">${ttl}</i>` : ""}${t} · bet ${fmt(h.bet)} ${h.coin} · crashed at ${cx}</span></div>`;
  }).join("");
  $("pills").innerHTML = history.slice(0, 20).map((h) => `<span class="pill ${h.pnl > 0 ? "w" : "l"}" data-id="${h.id}">${h.crash != null ? h.crash.toFixed(2) + "x" : "…"}</span>`).join("");
}

// Only touch the label text, never rebuild the button: rebuilding it mid-tap
// made phones drop the tap, so Sell sometimes did nothing.
function setSellText(label, amt) {
  if ($("sellLbl").textContent !== label) $("sellLbl").textContent = label;
  if ($("sellAmt").textContent !== amt) $("sellAmt").textContent = amt;
}
function setHalfText(amt) { if ($("halfAmt").textContent !== amt) $("halfAmt").textContent = amt; }
function setButtons() {
  const buy = $("buyBtn"), sell = $("sellBtn"), half = $("halfBtn");
  const live = round && !round.over;
  buy.disabled = !!live || busy;
  const canHalf = live && !round.sold && !round.half && round.t >= 0 && !busy;
  half.disabled = !canHalf;
  half.hidden = !!(live && (round.sold || round.half));
  if (!canHalf) setHalfText("");
  if (!live) { sell.disabled = true; sell.classList.remove("hot"); setSellText("Sell", ""); return; }
  if (round.sold) { sell.disabled = false; sell.classList.remove("hot"); setSellText("Skip", ""); return; }
  sell.disabled = busy || round.t < 0;
  sell.classList.add("hot");
}
let busy = false;

// ---------------- buying ----------------
async function doBuy() {
  if (busy || (round && !round.over)) return;
  const amt = amount();
  if (!user) { openSignIn(); return; }
  if (cfg && cfg.claims && onb && (!onb.wallet || !onb.starter)) { showOnb(); return; }
  if (cfg && cfg.claims && balance < lim.min) { toast(IMG.cousin, onb && onb.canClaim ? `Out of credits. Claim your free <b>${fmt(cfg.daily)}</b> below.` : `Out of credits, cousin. Next free <b>${fmt(cfg.daily)}</b> in <b>${untilTxt(onb && onb.claimAt)}</b>.`, 4500); return; }
  if (!amt || amt < lim.min || amt > lim.max) { toast(IMG.cousin, `Bet between <b>${fmt(lim.min)}</b> and <b>${fmt(lim.max)}</b> ${coin}.`); return; }
  if (amt > balance) { toast(IMG.cousin, `Not enough ${coin}. You have <b>${fmt(balance)}</b>.`); return; }
  ctx(); sfx.chip(); voicePreload();
  busy = true; setButtons();
  if (round && round.over) { round = null; resetChart(); }
  try {
    const clientSeed = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    let j, shown = nextCommit;
    try { j = await api("buy", { coin, amount: amt, clientSeed, commit: shown }); }
    catch (e) {
      // seed moved on (bet from another tab): bet again against the fresh lock
      if (e.status !== 409) throw e;
      shown = nextCommit;
      j = await api("buy", { coin, amount: amt, clientSeed, commit: shown });
    }
    if (shown) saveCommit(j.round.id, shown);
    setBalance(j.balance);
    startRound(j.round, false);
  } catch (e) {
    toast(IMG.cousin, e.message);
  } finally { busy = false; setButtons(); }
}
$("buyBtn").onclick = doBuy;

function startRound(r, resumed) {
  const lastBar = bars[bars.length - 1];
  const base = lastBar.time + 1;
  const open = lastBar.close;
  round = {
    id: r.id, bet: r.bet, coin: r.coin, startAt: r.startAt, path: buildPath(r.noiseSeed),
    base, open, P0: open * 1.03, k: -1, t: -1, sold: null, end: null, over: false, crashed: false,
    botDone: 0, lastStep: 1, vols: {}, trades: {}, resumed,
  };
  round.botTrades = round.path.bot;
  round.cousinEarly = !!idle.cousin;
  if (r.halfAt) round.half = { t: (r.halfAt - r.startAt) / 1000, mult: r.halfMult, payout: r.halfPayout };
  $("idleMsg").hidden = true;
  $("multBox").hidden = false;
  entryLine = series.createPriceLine({ price: round.P0, color: "#12b886", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "ENTRY" });
  addMarker({ time: base, price: round.P0, img: IMG.me, me: true, label: `${ME} BUY` });
  if (!resumed) setTimeout(() => floatText(base, round.P0, "+3.00%", true), 120);
  waitEnd(round.id);
  setButtons();
}

async function waitEnd(id) {
  for (let tries = 0; tries < 200; tries++) {
    try {
      const j = await api("wait?id=" + encodeURIComponent(id));
      if (j.pending) continue;
      if (j.state === "sold") pushHistory({ id, crash: j.crashShown });
      if (!round || round.id !== id) return;
      round.end = { t: (j.endAt - round.startAt) / 1000, state: j.state, crash: j.crash, shown: j.crashShown, payout: j.payout, pnl: j.pnl, soldMult: j.soldMult };
      return;
    } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
}

// ---------------- selling ----------------
// What's still riding after "Sell 50%".
const ridingOf = (r) => r.bet - (r.half ? Math.floor(r.bet / 2) : 0);
const lockedOf = (r) => (r.half ? r.half.payout : 0);

async function doSellHalf() {
  if (!round || round.over || round.sold || round.half || busy || round.t < 0) return;
  const at = Math.round(now()); // the sale counts from the tap, not from when it lands
  busy = true; setButtons(); sfx.chip();
  const id = round.id;
  try {
    const j = await api("sell", { id, part: "half", at });
    if (!round || round.id !== id) return;
    setBalance(j.balance);
    if (j.half) {
      const t = (j.halfAt - round.startAt) / 1000;
      round.half = { t, mult: j.halfMult, payout: j.halfPayout };
      const time = round.base + Math.max(0, Math.floor(t)), price = round.P0 * j.halfMult;
      addMarker({ time, price, img: IMG.me, me: true, sell: true, label: `${ME} SOLD 50% ${j.halfMult.toFixed(2)}x` });
      setTimeout(() => floatText(time, price, "-2.25%", false), 150);
      if (j.halfMult >= 1) sfx.win();
      toast(IMG.me, `Sold half at <b>${j.halfMult.toFixed(2)}x</b>, <b>${fmt(j.halfPayout)} ${round.coin}</b> locked in. The rest is riding.`);
    } else if (j.state !== "open") {
      toast(IMG.rekt, j.lateMs != null ? `Too late. It crashed <b>${(j.lateMs / 1000).toFixed(2)}s</b> before your tap got there.` : "Too late. It already crashed.");
    }
  } catch (e) { toast(IMG.cousin, e.message); }
  finally { busy = false; setButtons(); }
}
let lastHalfDown = 0;
$("halfBtn").addEventListener("pointerdown", (e) => { if (e.button === 0 || e.pointerType !== "mouse") { lastHalfDown = Date.now(); doSellHalf(); } });
$("halfBtn").addEventListener("click", () => { if (Date.now() - lastHalfDown > 900) doSellHalf(); });

async function doSell() {
  if (!round || round.over) return;
  if (round.sold) { skipRound(); return; }
  if (busy) return;
  const at = Math.round(now()); // the sale counts from the tap, not from when it lands
  busy = true; setButtons(); sfx.chip();
  const id = round.id;
  try {
    const j = await api("sell", { id, at });
    if (!round || round.id !== id) return;
    setBalance(j.balance);
    if (j.state === "sold") {
      const t = (j.soldAt - round.startAt) / 1000;
      round.sold = { t, mult: j.soldMult, payout: j.payout, pnl: j.pnl };
      sessionPnl += j.pnl; setPnl();
      const time = round.base + Math.max(0, Math.floor(t));
      const price = round.P0 * j.soldMult;
      addMarker({ time, price, img: IMG.me, me: true, sell: true, label: `${ME} SOLD ${j.soldMult.toFixed(2)}x` });
      setTimeout(() => floatText(time, price, "-4.50%", false), 150);
      pushHistory({ id, coin: round.coin, bet: round.bet, crash: null, state: "sold", soldMult: j.soldMult, halfMult: j.halfMult, payout: j.payout, pnl: j.pnl, ts: Date.now() });
      winFeedback(j.soldMult, j.pnl, id);
    } else if (j.state === "max") {
      round.end = round.end || { t: (j.soldAt - round.startAt) / 1000, state: "max", payout: j.payout, pnl: j.pnl, shown: MAXM };
    } else {
      toast(IMG.rekt, j.lateMs != null ? `Too late. It crashed <b>${(j.lateMs / 1000).toFixed(2)}s</b> before your tap got there.` : "Too late. It already crashed.");
    }
  } catch (e) { toast(IMG.cousin, e.message); }
  finally { busy = false; setButtons(); }
}
let lastSellDown = 0;
$("sellBtn").addEventListener("pointerdown", (e) => { if (e.button === 0 || e.pointerType !== "mouse") { lastSellDown = Date.now(); doSell(); } });
// Backup for taps that never sent a pointerdown; ignored right after one so a
// quick sell isn't followed by an accidental Skip.
$("sellBtn").addEventListener("click", () => { if (Date.now() - lastSellDown > 900) doSell(); });

function winFeedback(mult, pnl, id) {
  if (mult >= MAXM - 0.5) {
    sfx.big();
    popup({ kind: "big", img: IMG.max, title: `${mult.toFixed(2)}X`, line: `You sold at ${mult.toFixed(2)}x, right at the top. Candy: "${pick(CANDY)}"`, num: `${sgn(pnl)} ${coin}`, btn: "Keep watching", action: "close", autoClose: 12000, badge: `${MAXM}x God`, share: { id, mult, pnl, img: IMG.max } });
    return;
  }
  if (mult >= 4) {
    sfx.big();
    const candy = Math.random() < 0.5;
    const img = candy ? IMG.candy : IMG.win4;
    popup({ kind: "big", img, title: `${mult.toFixed(2)}X`, line: candy ? `Candy: "${pick(CANDY)}"` : "4x or more and you actually sold. Respect.", num: `${sgn(pnl)} ${coin}`, btn: "Keep watching", action: "close", autoClose: 9000, badge: titleFor({ state: "sold", soldMult: mult }), share: { id, mult, pnl, img } });
  } else if (mult >= 2) {
    sfx.win();
    popup({ kind: "win", img: IMG.win2, title: `${mult.toFixed(2)}X`, line: "Doubled up. Now watch what you left on the table.", num: `${sgn(pnl)} ${coin}`, btn: "Keep watching", action: "close", autoClose: 9000, badge: titleFor({ state: "sold", soldMult: mult }), share: { id, mult, pnl, img: IMG.win2 } });
  } else {
    if (pnl >= 0) sfx.win();
    toast(IMG.me, `Sold at <b>${mult.toFixed(2)}x</b>, <b>${sgn(pnl)} ${coin}</b>`);
    if (pnl > 0 && mult < 1.5) setTimeout(() => { const v = pickVoice("small"); toast(IMG.cousin, `<b>${BOT}:</b> ${esc(v.text)}`, 4200); sayVoice(v, true); }, 900);
  }
}

function skipRound() {
  if (!round) return;
  round = null;
  $("multBox").hidden = true;
  $("idleMsg").hidden = false;
  nextLine();
  resetChart();
  setButtons();
}

function pushHistory(h) {
  const i = history.findIndex((x) => x.id === h.id);
  if (i >= 0) history[i] = { ...history[i], ...h, crash: h.crash ?? history[i].crash }; else history.unshift(h);
  renderHistory();
  clearTimeout(statsTimer); statsTimer = setTimeout(loadStats, 600);
}
let statsTimer = 0;

// ---------------- the live chart ----------------
function sellDip(r, t) {
  if (!r.sold || t < r.sold.t) return 1;
  const x = t - r.sold.t;
  return 1 - 0.045 * (x < 0.4 ? x / 0.4 : Math.max(0, 1 - (x - 0.4) / 2.2));
}
// Price only changes when a trade prints, like a real market.
function priceTick(r, n) { return r.P0 * multAtTick(r.path, n) * sellDip(r, r.path.ticks[n]); }
function priceAt(r, t) { return priceTick(r, tickIndex(r.path, t)); }

function roundBar(r, k, tNow) {
  const end = Math.min(k + 1, tNow);
  const o = k === 0 ? r.open : priceAt(r, k);
  let h = o, l = o, c = o, trades = 0;
  const ticks = r.path.ticks;
  for (let n = tickIndex(r.path, k) + 1; n < ticks.length && ticks[n] <= end; n++) {
    c = priceTick(r, n); h = Math.max(h, c); l = Math.min(l, c); trades++;
  }
  if (k === 0) { c = Math.max(c, l); h = Math.max(h, r.P0); }
  r.trades[k] = trades;
  return { time: r.base + k, open: o, high: h, low: l, close: c };
}
// Volume grows with the trades printed in the candle.
function volOf(r, k) {
  if (r.vols[k] == null) {
    let extra = k === 0 ? 160 : 0;
    for (const b of r.botTrades) if (Math.floor(b.t) === k) extra += 140;
    r.vols[k] = { per: 5 + Math.random() * 5, extra };
  }
  const v = r.vols[k];
  const sold = r.sold && Math.floor(r.sold.t) === k ? 120 : 0;
  return (r.trades[k] || 0) * v.per * (1 + k * 0.04) + v.extra + sold;
}

function liveFrame() {
  const r = round;
  const t = (now() - r.startAt) / 1000;
  r.t = t;
  if (t < 0) return;
  const endT = r.end ? r.end.t : Infinity;
  // never step backwards in time (a clock nudge would otherwise stall the chart)
  const tt = Math.max(r.tt || 0, Math.min(t, endT));
  r.tt = tt;
  const k = Math.max(Math.floor(tt), r.k);
  for (let kk = Math.max(0, r.k); kk < k; kk++) putBar(roundBar(r, kk, kk + 1), volOf(r, kk));
  putBar(roundBar(r, k, tt), volOf(r, k));
  r.k = k;

  // Cousin's trades
  while (r.botDone < r.botTrades.length && r.botTrades[r.botDone].t <= tt) {
    const b = r.botTrades[r.botDone++];
    if (b.t >= endT) break;
    const quiet = t - b.t > 2;
    const time = r.base + Math.floor(b.t), price = priceAt(r, b.t);
    if (b.side === "buy" && b === r.botTrades[0]) {
      if (r.cousinEarly) continue;
      addMarker({ time, price, img: IMG.cousin, label: "COUSIN DICK BUY" });
      if (!quiet) toast(IMG.cousin, pick(ENTRY));
    } else if (b.side === "buy") {
      addMarker({ time, price, img: IMG.cousin, label: "COUSIN DICK BUY" });
      if (b.t > 2 && !quiet) { floatText(time, price, "+" + (8 + Math.random() * 8).toFixed(2) + "%", true); toast(IMG.cousin, pick(REBUY)); }
    } else {
      addMarker({ time, price, img: IMG.cousin, sell: true, label: b.exit ? `COUSIN DICK SELL ${paidMult(r.path, b.t).toFixed(2)}x` : "COUSIN DICK SELL" });
      const w = r.path.waves.find((w) => w.bot && Math.abs(w.s - b.t) < 0.01);
      if (!quiet) { floatText(time, price, "-" + ((w ? w.depth : 0.15) * 100).toFixed(2) + "%", false); cousinSold(r, b); }
    }
  }

  // Now and then he heckles you while you hold (after he's in, never right on top of another toast).
  if (!r.sold && !r.resumed && tt > 5 && r.botDone > 0) {
    if (!r.heckleAt) r.heckleAt = tt + 4 + Math.random() * 5;
    else if (tt >= r.heckleAt) {
      r.heckleAt = tt + 14 + Math.random() * 10;
      if (performance.now() - lastToastAt > 2500) {
        if (performance.now() >= voiceEndsAt) {
          const v = pickVoice("heckle");
          toast(IMG.cousin, `<b>${BOT}:</b> ${esc(v.text)}`, 4200);
          sayVoice(v);
        }
      }
    }
  }

  // ZachGPT drops in on about 1 round in 4, once, at a random moment.
  if (r.zachAt == null) r.zachAt = !r.resumed && Math.random() < 0.25 ? 4 + Math.random() * 14 : Infinity;
  if (tt >= r.zachAt) {
    r.zachAt = Infinity;
    if (performance.now() - lastToastAt > 1500) toast(IMG.zach, `<b>ZachGPT:</b> ${pick(ZACH)}`, 3800);
  }

  // multiplier readout
  const m = Math.min(paidMult(r.path, tt), r.end && r.end.shown ? Math.max(r.end.shown, 1) : MAXM);
  const box = $("multBox");
  if (r.sold) {
    box.className = "mult out";
    $("multX").textContent = m.toFixed(2) + "x";
    $("multPct").textContent = `You sold at ${r.sold.mult.toFixed(2)}x`;
    $("multPnl").textContent = `${sgn(r.sold.pnl)} ${r.coin}`;
  } else {
    box.className = "mult " + (m >= 1 ? "up" : "dn");
    $("multX").textContent = m.toFixed(2) + "x";
    $("multPct").textContent = (m >= 1 ? "+" : "") + ((m - 1) * 100).toFixed(2) + "%";
    const ride = ridingOf(r);
    $("multPnl").textContent = `${sgn(lockedOf(r) + ride * m - r.bet)} ${r.coin}`;
    if (r.half) $("multPct").textContent += ` · half sold at ${r.half.mult.toFixed(2)}x`;
    setSellText(r.half ? "Sell rest" : "Sell", `${fmt(ride * m)} ${r.coin}`);
    setHalfText(`${fmt(Math.floor(r.bet / 2) * m)} ${r.coin}`);
    const step = Math.floor(m);
    if (step > r.lastStep && step >= 2) { r.lastStep = step; sfx.step(); }
    heartbeat(m);
  }
  if (r.end && t >= endT && !r.crashed) finish(r);
}

function cousinSold(r, b) {
  if (!b.exit) {
    if (!r.sold) toast(IMG.cousin, pick(DUMP));
    return;
  }
  const bm = paidMult(r.path, b.t);
  const bigGap = r.sold && bm >= r.sold.mult * 1.6 && bm - r.sold.mult >= 1;
  if (r.sold && bm > r.sold.mult && !bigGap) {
    toast(IMG.cousin, `<b>Cousin Dick</b> sold at <b>${bm.toFixed(2)}x</b>.`);
  } else if (bigGap) {
    const v = pickVoice("taunt", bm);
    const said = v ? `${v.text} (You sold at ${r.sold.mult.toFixed(2)}x, he sold at ${bm.toFixed(2)}x.)` : pick(TAUNT).replaceAll("{x}", bm.toFixed(2) + "x").replaceAll("{me}", r.sold.mult.toFixed(2) + "x");
    popup({ kind: "taunt", img: IMG.cousinBody, title: "Cousin, scared money don't make money", line: said, num: "", btn: "Ugh", action: "close", autoClose: 6000 });
    sayVoice(v, true);
  } else if (!r.sold) {
    toast(IMG.cousin, pick(EXIT).replaceAll("{x}", bm.toFixed(2) + "x"), 3800);
  }
}

// The big red candle.
function crashCandle() {
  const lastBar = bars[bars.length - 1];
  const from = lastBar.close, to = from * (0.03 + Math.random() * 0.04);
  const time = lastBar.time + 1;
  const t0 = performance.now();
  const anim = () => {
    const p = Math.min(1, (performance.now() - t0) / 420);
    const c = from - (from - to) * (1 - Math.pow(1 - p, 3));
    putBar({ time, open: from, high: from, low: c, close: c }, 900);
    updateView(true);
    if (p < 1) requestAnimationFrame(anim);
  };
  anim();
  $("flash").classList.remove("go"); void $("flash").offsetWidth; $("flash").classList.add("go");
  $("chartWrap").classList.remove("shake"); void $("chartWrap").offsetWidth; $("chartWrap").classList.add("shake");
}

function finish(r) {
  r.crashed = true;
  r.overAt = performance.now();
  const e = r.end;
  if (e.state === "max") {
    r.over = true;
    crashCandle();
    $("multBox").className = r.sold ? "mult crashed" : "mult up";
    $("multX").textContent = r.sold ? "RUGGED" : MAXM.toFixed(2) + "x";
    $("multPct").textContent = r.sold ? `Rugged at ${MAXM}x` : "MAX WIN, sold right before the rug";
    $("multPnl").textContent = r.sold ? `You sold at ${r.sold.mult.toFixed(2)}x` : `${sgn(e.pnl)} ${r.coin}`;
    if (!r.sold) {
      sessionPnl += e.pnl; setPnl();
      pushHistory({ id: r.id, coin: r.coin, bet: r.bet, crash: MAXM, state: "max", soldMult: MAXM, payout: e.payout, pnl: e.pnl, ts: Date.now() });
      sfx.big();
      popup({ kind: "big", img: IMG.max, title: `${MAXM}X MAX`, line: `It hit ${MAXM}x and you got sold at the top, right before the rug. Candy: "${pick(CANDY)}"`, num: `${sgn(e.pnl)} ${r.coin}`, badge: `${MAXM}x God`, share: { id: r.id, mult: MAXM, pnl: e.pnl, img: IMG.max } });
      refreshBalance();
    } else {
      pushHistory({ id: r.id, crash: MAXM });
      toast(IMG.cousin, `It went all the way to <b>${MAXM}x</b>. Painful.`);
      setTimeout(() => { if ($("pop").hidden) backToIdleSoon(); }, 2000);
    }
    setButtons();
    return;
  }
  crashCandle();
  $("multBox").className = "mult crashed";
  $("multX").textContent = "RUGGED";
  $("multPct").textContent = `Crashed at ${e.shown.toFixed(2)}x`;
  r.over = true;
  // Cousin Dick is "out" if his last trade before the crash was a sell. That
  // includes a shakeout dump he never got to buy back from before the rug.
  const dickTrades = r.botTrades.filter((b) => b.t < e.t);
  const dickLast = dickTrades[dickTrades.length - 1];
  const dickOut = dickLast && dickLast.side === "sell" ? dickLast : null;
  const cousinRekt = !dickOut;
  if (r.sold) {
    $("multPnl").textContent = `You sold at ${r.sold.mult.toFixed(2)}x`;
    pushHistory({ id: r.id, crash: e.shown });
    if ($("pop").hidden) toast(IMG.me, `Crashed at <b>${e.shown.toFixed(2)}x</b>. You were out at ${r.sold.mult.toFixed(2)}x.`);
    setTimeout(() => { if ($("pop").hidden) backToIdleSoon(); }, 2000);
  } else {
    sfx.loss();
    const lost = lockedOf(r) - r.bet;
    $("multPnl").textContent = `${sgn(lost)} ${r.coin}`;
    sessionPnl += lost; setPnl();
    pushHistory({ id: r.id, coin: r.coin, bet: r.bet, crash: e.shown, state: "rekt", soldMult: null, halfMult: r.half ? r.half.mult : null, payout: lockedOf(r), pnl: lost, ts: Date.now() });
    // Cousin sold before the crash and you didn't: he lets you know about it.
    const cExit = dickOut;
    if (cExit) {
      const cx = paidMult(r.path, cExit.t).toFixed(2) + "x";
      const owed = addDebt(-lost);
      const v = Math.random() < 0.2 ? null : pickVoice("tilt", paidMult(r.path, cExit.t));
      const tilt = v ? v.text : Math.random() < 0.6 ? `That's ${fmt(owed)} ${r.coin} you owe me now, PT.` : pick(TILT).replaceAll("{x}", cx);
      setTimeout(() => sayVoice(v, true), 1000);
      setTimeout(() => popup({
        kind: "rekt tilt", img: IMG.cousinBody, title: "YOU GOT REKT", badge: "Exit Liquidity",
        line: tilt, num: `${sgn(lost)} ${r.coin}`,
      }), 1000);
      setButtons();
      return;
    }
    const bothV = cousinRekt ? pickVoice("both") : null;
    if (bothV) setTimeout(() => sayVoice(bothV, true), 1000);
    setTimeout(() => popup({
      kind: "rekt", img: Math.random() < 0.5 ? IMG.rekt : IMG.rekt2, title: "YOU GOT REKT", badge: titleFor({ state: "rekt", crash: e.shown, halfMult: r.half ? r.half.mult : null }),
      line: r.half
        ? `It crashed at ${e.shown.toFixed(2)}x. You saved half at ${r.half.mult.toFixed(2)}x, the other half got rekt.`
        : e.shown >= MAXM - 0.5 ? `It went to ${e.shown.toFixed(2)}x and you didn't sell. That one's going to hurt for a while.` : cousinRekt ? `It crashed at ${e.shown.toFixed(2)}x and Cousin Dick got rekt with you. "${bothV ? bothV.text : pick(BOTH_REKT)}"` : `It crashed at ${e.shown.toFixed(2)}x and you were still holding.`,
      num: `${sgn(lost)} ${r.coin}`,
    }), 1000);
  }
  setButtons();
}

async function refreshBalance() {
  try { const j = await api("me"); setBalance(j.balances[coin] ?? 0); } catch {}
}

// ---------------- loop ----------------
let lastFrame = 0, lastIdle = 0, idleGap = 200;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastFrame < 33) return;
  if (lastFrame && ts - lastFrame > 2500 && document.visibilityState === "visible") {
    const gap = Math.round(ts - lastFrame);
    // timers kept ticking = the browser paused drawing (window covered, screenshot tool);
    // timers stopped too = the page itself was blocked
    report("stall", `${gap}ms between frames, timers ${maxTimerGap > 1500 ? "ALSO stopped (" + Math.round(maxTimerGap) + "ms)" : "kept running"}, hidden during: ${hiddenSince && hiddenSince > performance.now() - gap ? "yes" : "no"}, focus: ${document.hasFocus()}`);
  }
  maxTimerGap = 0;
  lastFrame = ts;
  try {
    if (round && !round.crashed) liveFrame();
    else if (!round && ts - lastIdle > idleGap) { lastIdle = ts; idleGap = 70 + Math.random() * 380; idleTick(); }
    if (!(round && round.crashed)) updateView(false);
    placeMarkers();
    if (round && round.t >= 0) setButtons();
  } catch (e) { report("frame", e && (e.stack || e.message)); }
}

// Watchdog: a plain timer that keeps the game moving if drawing frames pause,
// and measures what kind of pause it was.
let lastTimer = performance.now(), maxTimerGap = 0, hiddenSince = 0;
document.addEventListener("visibilitychange", () => { if (document.hidden) hiddenSince = performance.now(); });
setInterval(() => {
  const n = performance.now();
  maxTimerGap = Math.max(maxTimerGap, n - lastTimer);
  lastTimer = n;
  if (n - lastFrame > 400 && round && !round.crashed && document.visibilityState === "visible") {
    try { liveFrame(); } catch (e) { report("timer-frame", e && (e.stack || e.message)); }
  }
}, 250);

// Send errors to the server log (LOG_DIR/ptsd.jsonl) so freezes can be traced.
let reports = 0;
function report(type, msg) {
  if (reports >= 20) return;
  reports++;
  const state = round ? { t: round.t, k: round.k, tt: round.tt, end: round.end && round.end.t, over: round.over, bars: bars.length, last: bars.length && bars[bars.length - 1].time } : { idle: true, bars: bars.length };
  try { fetch("api/clientlog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, msg: String(msg).slice(0, 1500), state, ua: navigator.userAgent, w: innerWidth, h: innerHeight }), keepalive: true }); } catch {}
}
window.addEventListener("error", (e) => report("error", e.error ? e.error.stack : e.message));
window.addEventListener("unhandledrejection", (e) => report("rejection", e.reason && (e.reason.stack || e.reason.message || e.reason)));

// ---------------- stats, leaderboard, round check ----------------
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const xf = (m) => (m ? m.toFixed(2) + "x" : "-");
const day = (ts) => new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
let sheetTab = "stats", myStats = null;

async function loadStats() {
  try { myStats = await api("stats?coin=" + coin); } catch { return; }
  renderSideStats();
  if (!$("sheet").hidden && sheetTab === "stats") renderSheet();
}
function statTiles(s) {
  const rate = s.rounds ? Math.round((s.wins / s.rounds) * 100) + "%" : "-";
  const streak = s.streak > 0 ? `${s.streak}W` : s.streak < 0 ? `${-s.streak}L` : "-";
  const net = `<b class="${s.net > 0 ? "w" : s.net < 0 ? "l" : ""}">${sgn(s.net)}</b>`;
  return [
    ["Best take profit", `<b class="gold">${xf(s.bestMult)}</b>`],
    ["Biggest win", `<b class="w">${s.bestWin ? "+" + fmt(s.bestWin) : "-"}</b>`],
    ["Net PnL", net],
    ["Win rate", `<b>${rate}</b>`],
    ["Rounds", `<b>${fmt(s.rounds)}</b>`],
    ["Rekt", `<b>${fmt(s.rekt)}</b>`],
    ["Best win streak", `<b>${s.bestStreak || "-"}</b>`],
    ["Current streak", `<b class="${s.streak > 0 ? "w" : s.streak < 0 ? "l" : ""}">${streak}</b>`],
  ].map(([k, v]) => `<div class="st"><span>${k}</span>${v}</div>`).join("");
}
function renderSideStats() {
  if (!myStats) return;
  $("sideStats").innerHTML = statTiles(myStats);
}

async function sha256Hex(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}
// Same math as the server: the crash point comes only from the seeds.
async function crashFromSeeds(serverSeed, clientSeed, nonce, edge, curve) {
  const h = await hmacHex(serverSeed, `${clientSeed}:${nonce}`);
  const r = parseInt(h.slice(0, 13), 16) / 2 ** 52;
  return crashFromR(r, edge, curve);
}
async function renderCheck(id) {
  const body = $("sheetBody");
  body.innerHTML = `<div class="side-empty">Checking…</div>`;
  let j;
  try { j = await api("round?id=" + encodeURIComponent(id)); } catch (e) { body.innerHTML = `<div class="side-empty">${esc(e.message)}</div>`; return; }
  if (!crypto.subtle) { body.innerHTML = `<div class="side-empty">This browser can't run the check.</div>`; return; }
  const lockOk = (await sha256Hex(j.serverSeed)) === j.commit;
  const shown = savedCommit(id);
  const crash = await crashFromSeeds(j.serverSeed, j.clientSeed, j.nonce, j.edge, j.curve);
  const crashOk = crash === j.crash;
  const fair = j.fair >= 2;
  const noiseOk = fair && (await hmacHex(j.serverSeed, `noise:${j.clientSeed}:${j.nonce}`)).slice(0, 32) === j.noiseSeed;
  const ck = (ok, txt) => `<div class="ck ${ok ? "ok" : "bad"}"><i>${ok ? "✓" : "✗"}</i><span>${txt}</span></div>`;
  const checks = [
    ck(lockOk && (!shown || shown === j.commit), fair
      ? (shown ? "The result was locked in before you bet. The lock you were shown matches this round." : "The result was locked in before the bet and matches its lock.")
      : "The seed matches its lock."),
    ck(crashOk, `Crash point worked out again from the seeds: <b>${crash.toFixed(2)}x</b>${crashOk ? "" : ` (server said ${j.crash.toFixed(2)}x)`}.`),
  ];
  if (fair) checks.push(ck(noiseOk, "The chart's dips came from the same locked seed."));
  const dipNote = j.crashShown && Math.abs(j.crashShown - j.crash) >= 0.01 ? `<div class="lb-note">The chart showed ${j.crashShown.toFixed(2)}x when it crashed because it was in a dip right then.</div>` : "";
  const old = fair ? "" : `<div class="lb-note">This round is from before results were locked in ahead of the bet.</div>`;
  const res = j.state === "rekt" ? "Rekt" : j.state === "max" ? `${j.maxMult}x max` : `Sold at ${xf(j.soldMult)}`;
  body.innerHTML = `<div class="ck-head"><b>${res}</b><span>bet ${fmt(j.bet)} ${esc(j.coin)} · ${new Date(j.ts).toLocaleString()} · house edge ${Math.round(j.edge * 100)}%</span></div>
    ${checks.join("")}${dipNote}${old}
    <details class="raw"><summary>Raw seeds</summary>
      <div><span>Server seed</span><code>${esc(j.serverSeed)}</code></div>
      <div><span>Lock (SHA-256 of server seed)</span><code>${esc(j.commit)}</code></div>
      <div><span>Your seed</span><code>${esc(j.clientSeed)}</code></div>
      <div><span>Round number</span><code>${esc(j.nonce)}</code></div>
      ${fair ? `<div><span>Chart seed</span><code>${esc(j.noiseSeed)}</code></div>` : ""}
    </details>
    <div class="lb-note">Your next round is already locked: <code>${esc(nextCommit.slice(0, 16))}…</code></div>`;
}

function renderSheet() {
  document.querySelectorAll(".sheet-tabs [data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === sheetTab));
  const titled = sheetTab === "check";
  $("sheetTabs").hidden = titled;
  $("sheetTitle").hidden = !titled;
  $("sheetTitle").textContent = "Round check";
  $("sheet").classList.toggle("chatting", sheetTab === "chat");
  if (sheetTab !== "chat") dockChat();
  if (sheetTab === "past") $("sheetBody").innerHTML = `<div class="past">${$("hist").innerHTML}</div><div class="lb-note">Tap a round to check it.</div>`;
  if (sheetTab === "stats") $("sheetBody").innerHTML = myStats ? `<div class="stgrid">${statTiles(myStats)}</div>` : `<div class="side-empty">${user ? "Loading…" : "Sign in to see your stats."}</div>`;
  if (sheetTab === "chat") { $("sheetBody").innerHTML = ""; $("sheetBody").appendChild($("chat")); chatSeen(); scrollChat(true); }
}
function closeSheet() { $("sheet").hidden = true; dockChat(); }
function openSheet(tab, id) {
  sheetTab = tab;
  $("sheet").hidden = false;
  renderSheet();
  if (tab === "stats") loadStats();
  if (tab === "check") renderCheck(id);
}
$("statsBtn").onclick = () => openSheet("stats");
$("chatBtn").onclick = () => { if (isPhone()) openSheet("chat"); else { sideTab("chat"); $("chatIn").focus(); } };
$("sheetX").onclick = closeSheet;
$("sheet").addEventListener("click", (e) => {
  if (e.target === $("sheet")) { closeSheet(); return; }
  const row = e.target.closest(".past [data-id]");
  if (row) { openSheet("check", row.dataset.id); return; }
  const t = e.target.closest("[data-tab]");
  if (t) { sheetTab = t.dataset.tab; renderSheet(); if (sheetTab === "stats") loadStats(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSheet(); closeSignIn(); } });
for (const el of [$("hist"), $("pills")]) el.addEventListener("click", (e) => {
  const r = e.target.closest("[data-id]");
  if (r && r.dataset.id && !(round && round.id === r.dataset.id && !round.over)) openSheet("check", r.dataset.id);
});

// Left column on desktop: Chat / Your rounds / How it works.
function sideTab(name) {
  document.querySelectorAll("#sideTabs [data-side]").forEach((b) => b.classList.toggle("on", b.dataset.side === name));
  $("paneChat").hidden = name !== "chat"; $("paneRounds").hidden = name !== "rounds"; $("paneHow").hidden = name !== "how";
  if (name === "chat") { dockChat(); chatSeen(); scrollChat(true); }
}
$("sideTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-side]"); if (b) sideTab(b.dataset.side); });

// ---------------- avatars ----------------
const AV_COLORS = ["#F05150", "#00D8C6", "#E8A317", "#8a3bb0", "#12b886", "#3b82f6", "#ff7a1a", "#e64fa3"];
// X picture if we have one, else a colored letter (placeholder until real X sign-in).
function avatar(u, cls = "av") {
  const name = (u && (u.username || u.name)) || "?";
  if (u && u.pfp) return `<span class="${cls}"><img src="${esc(u.pfp)}" alt="" referrerpolicy="no-referrer" loading="lazy"></span>`;
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="${cls} letter" style="background:${AV_COLORS[h % AV_COLORS.length]}">${esc(name[0].toUpperCase())}</span>`;
}

// ---------------- sign-in ----------------
function syncUser() {
  $("signInBtn").hidden = !!user;
  $("meChip").hidden = !user;
  $("rankPill").hidden = true; refreshRank();
  if (user) { $("meAv").outerHTML = avatar(user, "av").replace('class="av', 'id="meAv" class="av'); $("meName").textContent = "@" + user.username; }
  $("chatForm").classList.toggle("off", !user);
  $("chatIn").placeholder = user ? "Say something…" : "Sign in with X to chat";
}
function openSignIn() {
  if ($("onb")) { showOnb("x"); return; }
  const demo = cfg && cfg.login === "demo";
  $("signXGo").hidden = demo;
  $("signDemo").hidden = !demo;
  $("signErr").textContent = "";
  $("signIn").hidden = false;
  if (demo) setTimeout(() => $("signUser").focus(), 50);
}
function closeSignIn() { $("signIn").hidden = true; }
$("signInBtn").onclick = openSignIn;
$("signX").onclick = closeSignIn;
$("signIn").addEventListener("click", (e) => { if (e.target === $("signIn")) closeSignIn(); });
$("signDemo").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("auth/demo", { username: $("signUser").value });
    location.reload();
  } catch (err) { $("signErr").textContent = err.message; }
});
$("meChip").onclick = async () => {
  if (!confirmBox("Sign out of @" + user.username + "?")) return;
  try { await api("auth/logout", {}); } catch {}
  location.reload();
};
// Small in-page confirm (some wallet browsers block window.confirm).
function confirmBox(text) { return window.__ptsdConfirm ? window.__ptsdConfirm(text) : (() => { try { return window.confirm(text); } catch { return true; } })(); }

// ---------------- chat ----------------
let chatLast = 0, chatSince = 0, chatAdmin = false, chatUnread = 0, chatBusy = false, chatLoaded = false;
const chatMsgs = new Map();
function dockChat() { if ($("chat").parentElement !== $("paneChat")) $("paneChat").appendChild($("chat")); }
function chatVisible() {
  if (!$("sheet").hidden && sheetTab === "chat") return true;
  return !isPhone() && !$("paneChat").hidden && $("chat").parentElement === $("paneChat");
}
function chatSeen() { chatUnread = 0; $("chatDot").hidden = true; }
function scrollChat(force) {
  const l = $("chatList");
  if (force || l.scrollHeight - l.scrollTop - l.clientHeight < 80) l.scrollTop = l.scrollHeight;
}
const ago = (ts) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? "now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : day(ts); };
function chatRow(c) {
  const del = c.mine || chatAdmin ? `<button class="c-del" data-del="${c.id}" type="button" title="Delete">✕</button>` : "";
  return `<div class="c-row${c.mine ? " mine" : ""}" data-cid="${c.id}">${avatar(c)}<div class="c-body"><div class="c-top"><b>@${esc(c.username)}</b><time data-ts="${c.ts}">${ago(c.ts)}</time>${del}</div><div class="c-text">${esc(c.text)}</div></div></div>`;
}
function renderChat() {
  const list = [...chatMsgs.values()].sort((a, b) => a.id - b.id).slice(-150);
  $("chatList").innerHTML = list.length ? list.map(chatRow).join("") : `<div class="side-empty">No messages yet. Say gm.</div>`;
}
async function pollChat() {
  if (chatBusy) return;
  chatBusy = true;
  try {
    const j = await api(`comments?after=${chatLast}&since=${chatSince}`);
    chatAdmin = j.admin;
    let added = 0;
    for (const c of j.comments) { if (!chatMsgs.has(c.id)) added++; chatMsgs.set(c.id, c); chatLast = Math.max(chatLast, c.id); }
    for (const id of j.deleted) chatMsgs.delete(id);
    chatSince = j.now - 60_000;
    const first = !chatLoaded; chatLoaded = true;
    if (first) { renderChat(); scrollChat(true); return; }
    if (added || j.deleted.length || !chatLast) {
      renderChat(); scrollChat(false);
      if (added && chatLoaded && !chatVisible()) { chatUnread += added; $("chatDot").hidden = false; }
    } else $("chatList").querySelectorAll("time[data-ts]").forEach((t) => (t.textContent = ago(+t.dataset.ts)));
  } catch {} finally { chatBusy = false; }
}
setInterval(() => { if (document.visibilityState === "visible") pollChat(); }, 4000);
$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!user) { openSignIn(); return; }
  const text = $("chatIn").value.trim();
  if (!text) return;
  $("chatSend").disabled = true;
  try {
    const j = await api("comments", { text });
    $("chatIn").value = "";
    chatMsgs.set(j.comment.id, j.comment); chatLast = Math.max(chatLast, j.comment.id);
    renderChat(); scrollChat(true);
  } catch (err) { toast(IMG.cousin, esc(err.message)); }
  finally { $("chatSend").disabled = false; }
});
$("chatIn").addEventListener("focus", () => { if (!user) { $("chatIn").blur(); openSignIn(); } });
$("chatList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-del]");
  if (!b || !confirmBox("Delete this message?")) return;
  try { await api("comments/delete", { id: +b.dataset.del }); chatMsgs.delete(+b.dataset.del); renderChat(); } catch (err) { toast(IMG.cousin, esc(err.message)); }
});

// ---------------- Cousin Dick's tab ----------------
// Running joke: every time he sells before you get rekt, your loss goes on his tab.
// Kept on this device, per player.
const debtKey = () => "ptsd.debt." + (user ? user.username.toLowerCase() : "anon");
function getDebt() { try { return Number(localStorage.getItem(debtKey())) || 0; } catch { return 0; } }
function showDebt() { const d = getDebt(); $("debtBox").hidden = !d; $("debtAmt").textContent = `${fmt(d)} ${coin}`; }
function addDebt(n) {
  const d = getDebt() + Math.max(0, Math.round(n));
  try { localStorage.setItem(debtKey(), String(d)); } catch {}
  showDebt();
  return d;
}

// ---------------- news ticker ----------------
function fillNews() {
  const items = [...NEWS].sort(() => Math.random() - 0.5);
  const html = items.map((t) => `<span>${esc(t)}</span>`).join("");
  $("newsRun").innerHTML = html + html; // twice, so the loop is seamless
  $("newsRun").style.animationDuration = Math.round(items.join("").length * 0.22) + "s";
}
fillNews();

// ---------------- boot ----------------
// ---------------- how to play + FAQ (PTSD team's copy) ----------------
const HOW = [
  "Choose your order size",
  "Buy opens your position at 1.00x.",
  "The chart pumps and dumps, and your multiplier moves with it.",
  "Sell any time to lock it in. If it crashes first, you get rekt.",
  "Max win is 100x. If the chart gets there, you better sell at 100x",
  "Cousin Dick trades on the same chart. He doesn't know when it crashes either.",
  "Your sell counts from the moment you tap, so lag doesn't cost you.",
  "Every result is locked in before you bet. Nobody, not even us, can see it until the round ends. Tap any round to check it yourself.",
];
const FAQ = [
  ["How to win?", "Be at the top of the leaderboard"],
  ["What are the prizes?", "Top 25 on the leaderboard win 1 FREE MINT and 1 Guaranteed WL spot\nTop 500 on the leaderboard win 1 Guaranteed WL spot"],
  ["How long does this WL campaign will last?", "10 days (leaderboard snapshot on Friday October 16th at 12pm EST)"],
  ["What is a Guaranteed WL spot?", "2 mints during the Guaranteed mint window of the PTSD Show For Fuddable Tickets Mint"],
  ["How many Guaranteed WL spots?", "Up to 500 max Guaranteed WL spots, 1 per every 10 accounts on the leaderboard\nex. 2500 people play, 250 WLs rewarded, 5000 people play = 500 WL spots, 10,000 people play = 500 WL spots"],
  ["How to submit a wallet when you win a Guaranteed WL spot?", "Submit the wallet you want to mint with by copy and pasting it into the onboarding flow when you first start playing the game"],
  ["Why do I need to connect my X account?", "That is how your progress is tracked. You can login on desktop and mobile and play 24/7."],
  ["How many FREE MINTS?", "Max 25, 1 for every 200 participants that join."],
  ["How to claim FREE MINTS?", "They will be airdropped to the winners after the collection sell out on mint day."],
  ["What does the leaderboard track?", "PnL"],
  ["Do I need to bet real money?", "No, the game uses credits. Just connect your X account and copy and paste the ETH wallet address you would like to use to mint when you win the WL"],
  ["How much can I play?", "Forever, until you run out of credits"],
  ["How do I get credits?", "You start the game with 100k credits. Trade them to profit more credits. Every 24 hours you can claim another 100k credits"],
  ["What if I don’t get to the 10% of the leaderboard?", "Then you have a skill issue"],
];
$("rules").innerHTML = HOW.map((t) => `<li>${esc(t)}</li>`).join("");
$("howList").innerHTML = HOW.map((t) => `<li>${esc(t)}</li>`).join("");
$("faq").innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a).replace(/\n/g, "<br>")}</p></details>`).join("");

// ---------------- onboarding: X -> wallet -> social -> how to play ----------------
let onbStep = null, onbMode = "flow";
function nextOnbStep() {
  if (!user) return "x";
  if (!cfg || !cfg.claims || !onb) return null;
  if (!onb.wallet) return "wallet";
  if (!onb.starter) return "social";
  if (!onb.onboarded) return "how";
  return null;
}
// Flagged accounts get one locked screen: what happened and where to appeal.
function showBlocked(j) {
  blockedInfo = j;
  $("blockedMsg").textContent = j.error || "Your account has been flagged as suspected bot activity. Contact support.";
  const url = j.support || (cfg && cfg.support) || "";
  $("blockedSupport").hidden = !url;
  if (url) $("blockedSupport").href = url;
  showOnb("blocked");
}
function showOnb(step, mode = "flow") {
  if (blockedInfo) { step = "blocked"; mode = "flow"; }
  step = step || nextOnbStep();
  if (!step) { $("onb").hidden = true; return; }
  onbStep = step; onbMode = mode;
  document.querySelectorAll(".onb-step").forEach((el) => (el.hidden = el.dataset.step !== step));
  const order = ["x", "wallet", "social", "how"], at = order.indexOf(step);
  document.querySelectorAll("#onbDots i").forEach((d, i) => { d.className = i < at ? "done" : i === at ? "on" : ""; });
  $("onbDots").hidden = mode === "info" || step === "blocked";
  $("howLabel").textContent = mode === "info" ? "PTSD Crash" : "Step 4 · How to play";
  $("apeIn").textContent = mode === "info" ? "Got it" : "APE IN 🦍";
  // the X step and the how-to-play screen can be closed; wallet + social are needed to play
  $("onbX").hidden = !(step === "x" || mode === "info");
  if (step === "x") { const demo = cfg && cfg.login === "demo"; $("onbXGo").hidden = demo; $("onbDemo").hidden = !demo; $("onbXErr").textContent = ""; }
  if (step === "wallet") { $("walletErr").textContent = ""; setTimeout(() => $("walletIn").focus(), 80); }
  if (step === "claim") {
    document.querySelectorAll(".dailyAmt").forEach((e) => (e.textContent = fmt((cfg && cfg.daily || 100000) / 1000) + "k"));
    $("claimOpen").href = CLAIM_POST;
    $("claimOpen").classList.remove("done"); $("claimGo").disabled = true; $("claimErr").textContent = "";
  }
  if (step === "social") {
    const handle = (cfg && cfg.handle) || "ptsdshow";
    $("handleTxt").textContent = "@" + handle;
    $("taskFollow").href = `https://x.com/intent/follow?screen_name=${encodeURIComponent(handle)}`;
    // The post task only shows once there's an announcement post (ANNOUNCE_POST_URL).
    $("taskPost").hidden = !(cfg && cfg.post);
    if (cfg && cfg.post) $("taskPost").href = cfg.post;
    document.querySelectorAll(".startAmt").forEach((e) => (e.textContent = fmt((cfg && cfg.start || 100000) / 1000) + "k"));
    $("starterErr").textContent = "";
  }
  $("onb").scrollTop = 0;
  $("onb").hidden = false;
}
function closeOnb() { if (blockedInfo) return; $("onb").hidden = true; }
$("onbX").onclick = closeOnb;
$("howBtn").onclick = () => showOnb("how", "info");
$("howMore").onclick = () => showOnb("how", "info");
$("faqBtn").onclick = () => showOnb("faq", "info");
$("faqMore").onclick = () => showOnb("faq", "info");
$("faqClose").onclick = closeOnb;
$("onbDemo").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await api("auth/demo", { username: $("onbUser").value }); location.reload(); }
  catch (err) { $("onbXErr").textContent = err.message; }
});
$("onbWallet").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const j = await api("wallet", { address: $("walletIn").value.trim() });
    onb = j.state; syncClaim(); showOnb();
  } catch (err) { $("walletErr").textContent = err.message; }
});
// We can't check they did it, but the claim only unlocks after they've opened the follow link (or the post, when there is one).
const taskDone = new Set();
for (const id of ["taskFollow", "taskPost"]) $(id).addEventListener("click", () => {
  taskDone.add(id); $(id).classList.add("done");
  ctx();
  const need = cfg && cfg.post ? "taskPost" : "taskFollow";
  if (taskDone.has(need)) setTimeout(() => ($("claimStarter").disabled = false), 1500);
});
$("claimStarter").onclick = async () => {
  ctx();
  $("claimStarter").disabled = true;
  try {
    const j = await api("claim", { kind: "starter" });
    onb = j.state; setBalance(j.balance); syncClaim();
    sfx.big();
    showOnb();
  } catch (err) { $("starterErr").textContent = err.message; $("claimStarter").disabled = false; }
};
$("apeIn").onclick = async () => {
  ctx();
  if (onbMode === "flow" && onb && !onb.onboarded) { try { const j = await api("onboarded", {}); onb = j.state; } catch {} }
  closeOnb();
  if (onbMode === "flow") sfx.chip();
};

// ---------------- free credits (every CLAIM_HOURS) ----------------
function untilTxt(t) {
  const mins = Math.ceil(Math.max(0, (t || 0) - now()) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function syncClaim() {
  const show = !!(cfg && cfg.claims && user && onb && onb.starter);
  $("claimRow").hidden = !show;
  if (!show) return;
  const ready = now() >= (onb.claimAt || 0);
  $("claimBtn").hidden = !ready;
  $("claimBtn").textContent = `Claim ${fmt(cfg.daily / 1000)}k`;
  $("claimWait").hidden = ready;
  $("claimWait").textContent = `next in ${untilTxt(onb.claimAt)}`;
}
setInterval(syncClaim, 30000);
// Claiming asks them to engage with the announcement post first (like, comment, retweet). We can't check they did it,
// so the claim button just unlocks once they've opened the post (same as the onboarding tasks).
const CLAIM_POST = "https://x.com/ptsdshow/status/2107833456952848705";
$("claimBtn").onclick = () => { ctx(); showOnb("claim", "info"); };
$("claimOpen").addEventListener("click", () => {
  ctx(); $("claimOpen").classList.add("done");
  setTimeout(() => ($("claimGo").disabled = false), 1500);
});
$("claimGo").onclick = async () => {
  ctx();
  $("claimGo").disabled = true;
  try {
    const j = await api("claim", { kind: "daily" });
    onb = j.state; setBalance(j.balance); syncClaim();
    closeOnb();
    sfx.big(); toast(IMG.me, `<b>+${fmt(j.amount)}</b> free credits. Go get rekt.`);
  } catch (err) { refreshMe(); $("claimErr").textContent = err.message; }
};
async function refreshMe() { try { const j = await api("me"); onb = j.onb || null; setBalance(j.balances[coin] ?? 0); syncClaim(); } catch {} }

// ---------------- intro song on page open ----------------
let introDone = false;
try { introDone = sessionStorage.getItem("ptsd.intro") === "1"; } catch {}
async function tryIntro() {
  if (introDone || muted()) return;
  const c = ctx(); if (!c) return;
  if (c.state !== "running") { try { await c.resume(); } catch {} }
  if (c.state !== "running" || introDone) return;
  introDone = true;
  try { sessionStorage.setItem("ptsd.intro", "1"); } catch {}
  playSong();
}
function introOnGesture(e) {
  // never on taps that open a new tab (X links, share): those need the tap for themselves
  if (e && e.target && e.target.closest && e.target.closest('a[target="_blank"], #popShare, #popShareX')) return;
  tryIntro();
  if (introDone) { document.removeEventListener("pointerdown", introOnGesture, true); document.removeEventListener("keydown", introOnGesture, true); }
}
if (!introDone) { document.addEventListener("pointerdown", introOnGesture, true); document.addEventListener("keydown", introOnGesture, true); }

// Loading screen: stays up at least 2s (and until the game has loaded).
// performance.now() counts from when the page started opening.
// Shown once per visit: coming back from the leaderboard skips it.
let bootSeen = false;
try { bootSeen = sessionStorage.getItem("ptsd.booted") === "1"; sessionStorage.setItem("ptsd.booted", "1"); } catch {}
if (bootSeen) $("boot").remove();
function hideBoot() {
  if (!$("boot")) return;
  const wait = Math.max(0, 2000 - performance.now());
  setTimeout(() => { $("boot").classList.add("out"); setTimeout(() => $("boot").remove(), 450); }, wait);
}
async function boot() {
  try {
    cfg = await api("config");
    MAXM = cfg.maxMult || MAX_MULT;
    document.querySelectorAll(".maxm").forEach((e) => (e.textContent = MAXM));
    coin = Object.keys(cfg.coins)[0];
    lim = cfg.coins[coin];
    $("testBar").hidden = !cfg.test;
    $("balCur").textContent = coin;
    document.querySelectorAll(".amt-coin").forEach((e) => (e.textContent = coin));
    chipsUI();
    $("amtIn").value = fmt(lim.min); markChip();
    const me = await api("me");
    user = me.user || null;
    onb = me.onb || null;
    syncUser(); syncMute(); syncClaim();
    showDebt();
    setBalance(me.balances[coin] ?? 0);
    history = me.recent || []; renderHistory(); setPnl();
    if (user) loadStats();
    resetChart();
    if (me.open) startRound(me.open, true);
    pollChat();
    if (new URLSearchParams(location.search).get("signin") === "failed") { toast(IMG.cousin, "X sign-in didn't go through. Try again.", 6000); window.history.replaceState(null, "", location.pathname); }
    // direct links: #stats / #chat open that panel, #leaderboard goes to its page
    if (location.hash === "#leaderboard") location.href = "leaderboard";
    else if (location.hash === "#stats") openSheet("stats");
    else if (location.hash === "#chat") $("chatBtn").click();
  } catch (e) {
    resetChart();
    toast(IMG.cousin, e.message || "Could not load. Refresh the page.", 6000);
  }
  requestAnimationFrame(loop);
  hideBoot();
  tryIntro(); // plays right away where the browser allows it
  // first visit / unfinished steps: walk them through it
  if (nextOnbStep()) setTimeout(() => showOnb(), bootSeen ? 200 : Math.max(300, 2100 - performance.now()));
}
$("refillBtn").onclick = async () => { try { const j = await api("refill", {}); setBalance(j.balance); toast(IMG.me, "Test balance refilled."); } catch (e) { toast(IMG.cousin, e.message); } };
$("balPill").onclick = () => (user ? $("amtIn").focus() : openSignIn());
boot();
// Test hook (headless checks only).
if (new URLSearchParams(location.search).get("test") === "1") window.__ptsd = { makeCard, titleFor, popup, IMG };
