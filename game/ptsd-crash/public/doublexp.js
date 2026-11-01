// Double XP hour banner: shows right under the top bar on every page.
// While the hour is on it pulses and counts down; the rest of the day it shows when the next one starts.
(() => {
  const css = document.createElement("style");
  css.textContent = `
  #dxp{display:none;flex:none;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:6px 12px;font:600 12px/1.3 inherit;font-family:inherit;text-align:center;letter-spacing:.02em;border-bottom:1px solid rgba(255,255,255,.08);color:#9aa4b2;background:rgba(255,255,255,.03)}
  #dxp.on,#dxp.off{display:flex}
  #dxp b{font-weight:800}
  #dxp .t{font-variant-numeric:tabular-nums}
  #dxp.live{color:#1a1200;background:linear-gradient(90deg,#ffb800,#ffe066,#ffb800);background-size:200% 100%;animation:dxpSlide 3s linear infinite;border-bottom-color:#ffb800;font-size:14px;padding:9px 12px;letter-spacing:.04em}
  #dxp.live .bolt{display:inline-block;animation:dxpPulse 1s ease-in-out infinite}
  #dxp.live .x{background:#1a1200;color:#ffe066;border-radius:6px;padding:1px 8px;font-weight:900}
  @keyframes dxpSlide{to{background-position:200% 0}}
  @keyframes dxpPulse{50%{transform:scale(1.35)}}
  @media (max-width:640px){#dxp .ap{display:none}#dxp.live{font-size:13px;padding:7px 10px}#dxp.off span+span{display:none}}
  @media (prefers-reduced-motion:reduce){#dxp.live,#dxp.live .bolt{animation:none}}`;
  document.head.appendChild(css);

  const bar = document.createElement("div");
  bar.id = "dxp";
  bar.setAttribute("role", "status");
  const head = document.querySelector("header");
  document.body.prepend(bar);

  let st = null, skew = 0;
  const two = (n) => String(n).padStart(2, "0");
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ":" + two(m) : m) + ":" + two(s % 60); };
  const list = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "bonus XP");
  const when = (t) => new Date(t).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  const x = () => (st.mult % 1 ? st.mult.toFixed(1) : st.mult) + "×";

  function draw() {
    if (!st) return;
    const now = Date.now() + skew;
    const cur = [st.current, ...(st.upcoming || [])].find((w) => w && now >= w.start && now < w.end) || null;
    const nx = (st.upcoming || []).find((w) => w.start > now);
    window.__dxp = { active: !!cur, mult: cur ? st.mult : 1, end: cur ? cur.end : null, next: nx ? nx.start : null, skew };
    if (cur) {
      bar.className = "on live";
      bar.innerHTML = `<span class="bolt">⚡</span><span><b>DOUBLE XP HOUR</b><span class="ap"> — ${list(st.applies)} pay</span> <span class="x">${x()}</span></span><span>ends in <b class="t">${clock(cur.end - now)}</b></span>`;
      bar.title = "Profit and referral points are never doubled. Points keep their doubled value.";
      return;
    }
    const next = (st.upcoming || []).find((w) => w.start > now);
    if (!next) { bar.className = ""; return; }
    bar.className = "on off";
    bar.innerHTML = `<span>⚡ Next <b>Double XP hour</b> in <b class="t">${clock(next.start - now)}</b></span><span>${when(next.start)} · ${list(st.applies)} pay ${x()}</span>`;
    bar.title = "Every day. Profit and referral points are never doubled.";
  }

  async function load() {
    try {
      const j = await (await fetch("api/config", { cache: "no-store" })).json();
      if (j.doubleXp) { st = j.doubleXp; skew = (j.serverNow || Date.now()) - Date.now(); draw(); }
    } catch {}
  }
  load();
  setInterval(draw, 1000);
  setInterval(load, 5 * 60_000);
  // the window may have just opened or closed: re-sync when we cross a boundary
  setInterval(() => {
    if (!st) return;
    const now = Date.now() + skew;
    const edge = [st.current && st.current.end, ...(st.upcoming || []).map((w) => w.start)].filter(Boolean).find((t) => Math.abs(now - t) < 1500);
    if (edge) load();
  }, 1000);
})();
