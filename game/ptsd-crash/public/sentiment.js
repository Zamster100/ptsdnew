// Sentiment button + Fear & Greed meter, in the top bar of every page.
// The button flashes red in a Fear window and green in a Greed window. Click it for the meter, the rules and the log.
(() => {
  const css = document.createElement("style");
  css.textContent = `
  .nv.sent{cursor:pointer}
  .nv.sent.fear{border-color:#ff4d4d;color:#fff;animation:sentFear 1s ease-in-out infinite}
  .nv.sent.greed{border-color:#19c37d;color:#fff;animation:sentGreed 1s ease-in-out infinite}
  @keyframes sentFear{0%,100%{background:var(--panel2);box-shadow:0 0 0 rgba(255,77,77,0)}50%{background:#5a1517;box-shadow:0 0 16px rgba(255,77,77,.75)}}
  @keyframes sentGreed{0%,100%{background:var(--panel2);box-shadow:0 0 0 rgba(25,195,125,0)}50%{background:#0f4a33;box-shadow:0 0 16px rgba(25,195,125,.75)}}
  @media (prefers-reduced-motion:reduce){.nv.sent.fear{background:#5a1517;animation:none}.nv.sent.greed{background:#0f4a33;animation:none}}
  #sentPop{position:fixed;z-index:9000;top:58px;left:50%;transform:translateX(-50%);width:min(380px,calc(100vw - 20px));max-height:calc(100vh - 70px);overflow:auto;background:#121317;border:1px solid #2a2d35;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.65);padding:16px 18px 14px;color:#e8eaf0;font:600 13px/1.45 Manrope,sans-serif;display:none}
  #sentPop.open{display:block}
  #sentPop h3{margin:0 0 2px;font:800 15px Manrope,sans-serif;text-align:center}
  #sentPop .sub{text-align:center;color:#8d94a3;font-size:12px;margin-bottom:6px}
  #sentPop svg{display:block;margin:0 auto;width:100%;max-width:300px;height:auto}
  #sentPop .needle{transform-origin:100px 100px;transition:transform 1.2s cubic-bezier(.2,.9,.3,1)}
  #sentPop .state{text-align:center;font:900 24px Manrope,sans-serif;letter-spacing:.06em;margin:-4px 0 2px}
  #sentPop .state.fear{color:#ff5a5a}#sentPop .state.greed{color:#2fd08a}#sentPop .state.mid{color:#f3c64d}
  #sentPop .msg{text-align:center;margin:6px 0 4px}
  #sentPop .tip{text-align:center;color:#f3c64d;font-style:italic;margin:6px 0 10px}
  #sentPop .row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid #23262d;font-size:12px}
  #sentPop .row b{font-weight:800}
  #sentPop .log h4{margin:10px 0 4px;font:800 11px Manrope,sans-serif;letter-spacing:.08em;color:#8d94a3;text-transform:uppercase}
  #sentPop .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
  #sentPop .foot{margin-top:8px;color:#6d7483;font-size:11px;text-align:center}
  #sentPop .x{position:absolute;top:8px;right:10px;background:none;border:0;color:#8d94a3;font-size:18px;cursor:pointer}
  #sentToast{position:fixed;z-index:9100;left:50%;bottom:22px;transform:translate(-50%,20px);opacity:0;transition:all .35s;pointer-events:none;background:#121317;border:1px solid #2a2d35;border-radius:12px;padding:10px 16px;font:700 13px Manrope,sans-serif;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.6);max-width:calc(100vw - 24px);text-align:center}
  #sentToast.show{opacity:1;transform:translate(-50%,0)}`;
  document.head.appendChild(css);

  const nav = document.querySelector("nav.nv-wrap");
  if (!nav) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "nv sent"; btn.id = "sentBtn"; btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = `📊<span> Sentiment</span>`;
  nav.appendChild(btn);

  const pop = document.createElement("div");
  pop.id = "sentPop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Fear and Greed");
  // gauge: five coloured arcs from Fear (left) to Greed (right) and a needle
  const arc = (a0, a1, col) => {
    const pt = (a) => [100 + 80 * Math.cos(Math.PI * (1 - a / 100)), 100 - 80 * Math.sin(Math.PI * (1 - a / 100))].map((n) => n.toFixed(2));
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return `<path d="M${x0} ${y0} A80 80 0 0 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="butt"/>`;
  };
  pop.innerHTML = `<button class="x" type="button" aria-label="Close">×</button>
    <h3>Fear &amp; Greed</h3><div class="sub">The mood of the market</div>
    <svg viewBox="0 0 200 116" aria-hidden="true">
      ${arc(0, 20, "#e5484d")}${arc(20, 40, "#f2803c")}${arc(40, 60, "#f3c64d")}${arc(60, 80, "#a3cf55")}${arc(80, 100, "#2fd08a")}
      <text x="14" y="114" fill="#8d94a3" font-size="10" font-weight="800" font-family="Manrope,sans-serif">FEAR</text>
      <text x="186" y="114" fill="#8d94a3" font-size="10" font-weight="800" text-anchor="end" font-family="Manrope,sans-serif">GREED</text>
      <g class="needle" id="sentNeedle" style="transform:rotate(0deg)"><line x1="100" y1="100" x2="100" y2="34" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
      <circle cx="100" cy="100" r="7" fill="#fff"/><circle cx="100" cy="100" r="3" fill="#121317"/>
    </svg>
    <div class="state mid" id="sentState">…</div>
    <div class="msg" id="sentMsg"></div>
    <div class="tip" id="sentTip"></div>
    <div id="sentRows"></div>
    <div class="log" id="sentLog"></div>
`;
  document.body.appendChild(pop);
  const toast = document.createElement("div");
  toast.id = "sentToast"; document.body.appendChild(toast);

  const $ = (id) => document.getElementById(id);
  const pct = (e) => (e < 0 ? "−" : "") + Math.abs(Math.round(e * 1000) / 10) + "%";
  const two = (n) => String(n).padStart(2, "0");
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + two(s % 60); };
  const hm = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const KIND = { fear: ["Fear", "#ff5a5a"], greed: ["Greed", "#2fd08a"] };

  let st = null, skew = 0, lastKind = null, firstLoad = true;
  function say(t) { toast.innerHTML = t; toast.classList.add("show"); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove("show"), 5500); }

  function draw() {
    if (!st) return;
    const now = Date.now() + skew;
    const live = st.kind;
    btn.classList.toggle("fear", live === "fear");
    btn.classList.toggle("greed", live === "greed");
    btn.title = live === "fear" ? "Fear is live" : live === "greed" ? "Greed is live" : "Fear & Greed sentiment";
    btn.style.display = st.on ? "" : "none";
    if (!pop.classList.contains("open")) return;
    $("sentNeedle").style.transform = `rotate(${(st.index - 50) * 1.8}deg)`;
    const s = $("sentState");
    s.textContent = live === "neutral" ? st.label.toUpperCase() : KIND[live][0].toUpperCase();
    s.className = "state " + (live === "fear" ? "fear" : live === "greed" ? "greed" : "mid");
    const TIP = "Be fearful when everyone is greedy, and greedy when everyone is fearful.";
    let msg;
    if (live === "fear") msg = "Everyone is fearful right now.";
    else if (live === "greed") msg = "Everyone is greedy right now.";
    else if (st.building) msg = "Still reading the room.";
    else if (st.index >= 55) msg = "Players are on a hot streak. Greed may be coming.";
    else if (st.index <= 45) msg = "Players are struggling. Fear may be coming.";
    else msg = "The market is calm.";
    $("sentMsg").innerHTML = msg; $("sentTip").textContent = TIP;
    $("sentRows").innerHTML = "";
    const log = (st.log || []).slice(0, 5);
    $("sentLog").innerHTML = log.length ? `<h4>Recent windows</h4>` + log.map((w) => `<div class="row"><span><i class="dot" style="background:${KIND[w.kind][1]}"></i>${KIND[w.kind][0]}</span><span>${w.end ? `${hm(w.start)}–${hm(w.end)}` : `since ${hm(w.start)} · now`}</span></div>`).join("") : "";
  }

  async function load() {
    try {
      const j = await (await fetch("api/sentiment", { cache: "no-store" })).json();
      skew = (j.serverNow || Date.now()) - Date.now();
      const prev = lastKind; st = j; lastKind = j.kind;
      if (!firstLoad && prev !== null && prev !== j.kind) {
        if (j.kind === "fear") say(`🔴 <b>FEAR</b> is live. Be greedy when others are fearful.`);
        else if (j.kind === "greed") say(`🟢 <b>GREED</b> is live. Be fearful when others are greedy.`);
        else say(`Sentiment is back to neutral.`);
      }
      firstLoad = false; draw();
    } catch {}
  }
  const open = (v) => { pop.classList.toggle("open", v); if (v) draw(); };
  btn.addEventListener("click", (e) => { e.stopPropagation(); open(!pop.classList.contains("open")); });
  pop.querySelector(".x").addEventListener("click", () => open(false));
  pop.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => open(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
  load();
  setInterval(load, 5000);
  setInterval(draw, 1000);
  window.__sentiment = () => st;
})();
