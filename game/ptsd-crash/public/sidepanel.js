// Menu rail (desktop): the site's navigation, separate from whatever page is open. Logo on top, the main pages, then what's live
// (sentiment, jackpot, Double XP hour). It is the same on every page, including the game, and the game keeps its own side panel.
// The arrow on its edge hides it (remembered). On phones the top bar keeps the navigation and the rail isn't used.
(() => {
  const KEY = "sp-collapsed", W = 220;
  const css = document.createElement("style");
  css.textContent = `
  .sp{font:600 13px/1.35 Manrope,sans-serif;color:var(--txt);position:fixed;left:0;bottom:0;top:var(--sp-top,0px);width:${W}px;overflow:auto;background:var(--panel);border-right:1px solid var(--bd);z-index:6;padding:14px 12px 18px;display:flex;flex-direction:column;gap:3px}
  .sp-logo{display:flex;align-items:center;gap:10px;padding:2px 6px 14px;text-decoration:none;color:var(--txt)}
  .sp-logo img{width:40px;height:40px;object-fit:contain}
  .sp-logo b{font:400 24px/1 "Rubik Glitch",Manrope,sans-serif}
  .sp-sep{height:1px;background:var(--bd);margin:10px 4px}
  .sp-it{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:none;color:var(--txt);text-decoration:none;text-align:left;font:800 13px Manrope,sans-serif;cursor:pointer;position:relative}
  .sp-it:hover{background:var(--panel2);border-color:var(--bd)}
  .sp-it.on{background:#2a1416;border-color:#F05150;color:#fff}
  .sp-it .i{width:22px;text-align:center;font-size:16px;flex:none}
  .sp-it .t{min-width:0;flex:1}
  .sp-it .t small{display:block;font-size:11px;color:var(--mut);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sp-bar{height:4px;border-radius:99px;background:#23262d;margin-top:4px;overflow:hidden}
  .sp-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#F05150,#ffc400);border-radius:99px;transition:width .6s}
  .sp-dot{position:absolute;top:6px;right:8px;width:9px;height:9px;border-radius:50%;background:#ffc400;box-shadow:0 0 8px #ffc400}
  .sp-it.fear{border-color:#ff4d4d;animation:spFear 1.2s ease-in-out infinite}
  .sp-it.greed{border-color:#19c37d;animation:spGreed 1.2s ease-in-out infinite}
  @keyframes spFear{50%{background:#3a1315;box-shadow:0 0 12px rgba(255,77,77,.5)}}
  @keyframes spGreed{50%{background:#0d3a29;box-shadow:0 0 12px rgba(25,195,125,.5)}}
  .sp-it.dx.live{border-color:#ffb800;background:linear-gradient(90deg,#3a2c05,#1c1503)}
  .sp-info{margin:2px 4px 4px 36px;font-size:11px;font-weight:600;color:var(--mut);line-height:1.45}
  #spArrow{position:fixed;z-index:7;bottom:90px;left:${W - 1}px;width:22px;height:46px;border:1px solid var(--bd);border-left:0;border-radius:0 12px 12px 0;background:var(--panel2);color:var(--txt);font:900 16px/1 Manrope,sans-serif;cursor:pointer;padding:0}
  #spArrow:hover{border-color:var(--gold);color:var(--gold)}
  @media (min-width:900px){
    nav.nv-wrap a.nv:not(.jp):not(.sent){display:none}
    body.sp-pad:not(.sp-collapsed) .dbar-title{display:none}
    body.sp-pad{padding-left:${W}px}
    body.sp-pad > #dxp{margin-left:-${W}px;width:calc(100% + ${W}px)}
    body.sp-collapsed nav.nv-wrap a.nv:not(.jp):not(.sent){display:inline-flex}
    body.sp-collapsed.sp-pad{padding-left:0}
    body.sp-collapsed.sp-pad > #dxp{margin-left:0;width:auto}
    body.sp-collapsed .sp{display:none}
    body.sp-collapsed #spArrow{left:0}
  }
  @media (max-width:899px){.sp,#spArrow{display:none!important}}
  @media (prefers-reduced-motion:reduce){.sp-it.fear,.sp-it.greed{animation:none}}`;
  document.head.appendChild(css);

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const two = (n) => String(n).padStart(2, "0");
  const here = location.pathname.replace(/\/+$/, "").split("/").pop();
  const game = !!document.querySelector("main.term");
  const item = (href, ico, label, on, extra = "") => `<a class="sp-it ${on ? "on" : ""}" href="${href}"><span class="i">${ico}</span><span class="t">${label}${extra}</span></a>`;
  const tool = (id, ico, label) => `<button class="sp-it" id="${id}" type="button"><span class="i">${ico}</span><span class="t"><span class="sp-l">${label}</span><small class="sp-s"></small></span></button>`;

  const box = document.createElement("aside");
  box.className = "sp"; box.id = "sp";
  box.innerHTML = `
    <a class="sp-logo" href="./"><img src="img/ptsd-logo.webp" alt="PTSD"><b>Crash</b></a>
    <a class="sp-it ${location.pathname.includes("/p/") ? "on" : ""}" id="spMe" href="./"><span class="i">👤</span><span class="t"><span id="spName">Profile</span><small id="spLvl"></small><div class="sp-bar" id="spBar" hidden><i id="spXp"></i></div></span></a>
    ${item("./", "🎮", "Play", game)}${item("leaderboard", "🏆", "Leaderboard", here === "leaderboard")}${item("tasks", "🎯", "Bounties", here === "tasks")}
    ${item("rewards", "🏅", "Rewards", here === "rewards", `<i class="sp-dot" id="spDot" hidden></i>`)}
    <div class="sp-sep"></div>
    ${item("stats", "📊", "Stats", here === "stats")}
    ${item("guide", "📖", "Guide", here === "guide")}
    ${tool("spSent", "🧭", "Sentiment")}
    <a class="sp-it ${here === "jackpot" ? "on" : ""}" id="spJp" href="jackpot"><span class="i">💰</span><span class="t"><span class="sp-l">Jackpot</span><small class="sp-s" id="spJpS"></small></span></a>
    ${tool("spDx", "⚡", "XP hour")}
    <div class="sp-info" id="spDxInfo" hidden>Once a day (9 AM Eastern) the XP you earn from rounds counts double for an hour.</div>`;
  document.body.appendChild(box); document.body.classList.add("sp-pad");

  const arrow = document.createElement("button");
  arrow.id = "spArrow"; arrow.type = "button";
  document.body.appendChild(arrow);
  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === "1"; } catch {}
  const apply = () => { document.body.classList.toggle("sp-collapsed", collapsed); arrow.textContent = collapsed ? "›" : "‹"; arrow.title = arrow.ariaLabel = collapsed ? "Show the menu" : "Hide the menu"; place(); };
  arrow.addEventListener("click", () => { collapsed = !collapsed; try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch {} apply(); });

  // the rail starts below the Double XP banner (which spans the full width on top)
  function place() {
    const b = document.getElementById("dxp"), r = b && b.getBoundingClientRect();
    document.documentElement.style.setProperty("--sp-top", Math.round(r && r.height ? Math.max(0, r.bottom) : 0) + "px");
  }
  addEventListener("resize", place);
  apply();

  const $ = (id) => document.getElementById(id);
  async function loadRank() {
    try {
      const j = await (await fetch("api/rank", { cache: "no-store" })).json();
      if (!j.me) { $("spName").textContent = "Profile"; $("spLvl").textContent = "Sign in to play"; $("spBar").hidden = true; $("spMe").href = "./"; return; }
      $("spName").textContent = "@" + j.me.username;
      $("spMe").href = "p/" + encodeURIComponent(j.me.username);
      const lv = j.level;
      $("spLvl").textContent = lv ? `Level ${lv.n} · ${lv.name}` : "";
      $("spBar").hidden = !lv; $("spXp").style.width = (lv ? (lv.next ? lv.pct : 100) : 0) + "%";
      $("spDot").hidden = !(j.rewards && j.rewards.claimable);
    } catch {}
  }
  loadRank(); setInterval(loadRank, 45_000);
  window.__spRefresh = loadRank;

  $("spSent").addEventListener("click", (e) => { e.stopPropagation(); const b = document.getElementById("sentBtn"); if (b) b.click(); });
  $("spDx").addEventListener("click", () => { $("spDxInfo").hidden = !$("spDxInfo").hidden; });
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 3600)}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`; };
  const set = (id, label, sub) => { const el = $(id); el.querySelector(".sp-l").textContent = label; el.querySelector(".sp-s").textContent = sub; };
  function tick() {
    place();
    const st = window.__sentiment && window.__sentiment();
    if (st) {
      const k = st.kind || "neutral", card = $("spSent");
      card.classList.toggle("fear", k === "fear"); card.classList.toggle("greed", k === "greed");
      set("spSent", "Sentiment", k === "fear" ? "Fear · be greedy" : k === "greed" ? "Greed · be fearful" : `${st.label} · ${Math.round(st.index)}`);
    }
    const jp = window.__jackpot;
    if (jp) {
      const left = jp.nextDrawAt - Date.now() - (jp.skewMs || 0), last = left > 0 && left < 3600_000 && jp.balance > 0 && !jp.auto;
      $("spJpS").textContent = last ? `LAST CALL · ${clock(left)}` : `${fmt(jp.pot)} · ${clock(left)}`;
    }
    const dx = window.__dxp, b = $("spDx");
    if (dx && (dx.active || dx.next)) {
      const now = Date.now() + (dx.skew || 0);
      b.classList.toggle("live", !!dx.active);
      set("spDx", "XP hour", dx.active ? `LIVE · ends in ${clock(dx.end - now)}` : `next in ${clock(dx.next - now)}`);
    } else set("spDx", "XP hour", "");
  }
  tick(); setInterval(tick, 1000);
})();
