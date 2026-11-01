// Side panel (desktop): who you are, where to go, and what's live (sentiment, jackpot, Double XP hour).
// On the game page it sits on top of the existing left column; on every other page it is a rail down the left side.
// The arrow on its edge hides it (the choice is remembered). On phones the top bar keeps the navigation and the panel isn't used.
(() => {
  const KEY = "sp-collapsed";
  const game = document.querySelector("aside.side");
  const css = document.createElement("style");
  css.textContent = `
  .sp-top,.sp{font:600 13px/1.35 Manrope,sans-serif;color:var(--txt)}
  .sp-top{padding:10px 10px 8px;border-bottom:1px solid var(--bd);display:flex;flex-direction:column;gap:8px;flex:none}
  .sp{position:fixed;left:0;bottom:0;top:var(--sp-top,92px);width:250px;overflow:auto;background:var(--panel);border-right:1px solid var(--bd);z-index:4;padding:10px 10px 16px;display:flex;flex-direction:column;gap:8px}
  .sp-me{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--bd);border-radius:12px;background:var(--panel2);text-decoration:none;color:inherit}
  .sp-me:hover{border-color:var(--gold)}
  .sp-av{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;background:#2a2d35;font-weight:900;overflow:hidden}
  .sp-av img{width:100%;height:100%;object-fit:cover}
  .sp-me-b{min-width:0;flex:1}
  .sp-me-n{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sp-me-l{font-size:11px;color:var(--mut);font-weight:700}
  .sp-bar{height:5px;border-radius:99px;background:#23262d;margin-top:5px;overflow:hidden}
  .sp-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#F05150,#ffc400);border-radius:99px;transition:width .6s}
  .sp-chips{display:flex;gap:6px;flex-wrap:wrap}
  .sp-chip{font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--panel2);border:1px solid var(--bd);color:#cfd4dc;white-space:nowrap}
  .sp-nav{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .sp-nav a{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--panel2);color:var(--txt);text-decoration:none;font-weight:800;font-size:12px;white-space:nowrap;position:relative}
  .sp-nav a:hover{border-color:var(--gold)}
  .sp-nav a.on{background:#2a1416;border-color:#F05150;color:#fff}
  .sp-h{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin:2px 2px -2px}
  .sp-card{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:1px solid var(--bd);border-radius:12px;background:var(--panel2);color:var(--txt);text-decoration:none;text-align:left;font:inherit;cursor:pointer}
  .sp-card:hover{border-color:var(--gold)}
  .sp-card svg{flex:none;width:54px;height:32px}
  .sp-card .t{min-width:0;flex:1}
  .sp-card .t b{display:block;font-weight:800;font-size:13px}
  .sp-card .t small{display:block;font-size:11px;color:var(--mut);font-weight:700;font-variant-numeric:tabular-nums}
  .sp-card.fear{border-color:#ff4d4d;animation:spFear 1.2s ease-in-out infinite}
  .sp-card.greed{border-color:#19c37d;animation:spGreed 1.2s ease-in-out infinite}
  @keyframes spFear{50%{background:#3a1315;box-shadow:0 0 12px rgba(255,77,77,.5)}}
  @keyframes spGreed{50%{background:#0d3a29;box-shadow:0 0 12px rgba(25,195,125,.5)}}
  .sp-card.dx{border-color:#ffb800;background:linear-gradient(90deg,#3a2c05,#1c1503)}
  .sp-ico{font-size:22px;width:54px;text-align:center;flex:none}
  #spArrow{position:fixed;z-index:7;bottom:90px;left:0;width:22px;height:46px;border:1px solid var(--bd);border-left:0;border-radius:0 12px 12px 0;background:var(--panel2);color:var(--txt);font:900 16px/1 Manrope,sans-serif;cursor:pointer;padding:0}
  #spArrow:hover{border-color:var(--gold);color:var(--gold)}
  @media (min-width:900px){
    nav.nv-wrap a.nv:not(.jp):not(.sent){display:none}
    body.sp-collapsed nav.nv-wrap a.nv:not(.jp):not(.sent){display:inline-flex}
    aside.side{overflow-y:auto}
    aside.side .side-pane{min-height:240px}
    body.sp-collapsed .term{grid-template-columns:44px minmax(0,1fr) 270px;grid-template-areas:"tb tb tb" "news news news" "tools chart trade"}
    body.sp-collapsed aside.side{display:none}
    body.sp-pad{padding-left:250px}
    body.sp-pad > header.dbar,body.sp-pad > #dxp,body.sp-pad > .testbar{margin-left:-250px;width:calc(100% + 250px)}
    body.sp-collapsed.sp-pad{padding-left:0}
    body.sp-collapsed.sp-pad > header.dbar,body.sp-collapsed.sp-pad > #dxp,body.sp-collapsed.sp-pad > .testbar{margin-left:0;width:auto}
    body.sp-collapsed .sp{display:none}
  }
  @media (max-width:899px){.sp,.sp-top,#spArrow{display:none!important}}
  @media (prefers-reduced-motion:reduce){.sp-card.fear,.sp-card.greed{animation:none}}`;
  document.head.appendChild(css);

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const two = (n) => String(n).padStart(2, "0");
  const here = location.pathname.replace(/\/+$/, "").split("/").pop();
  const link = (href, ico, label, on) => `<a href="${href}" class="${on ? "on" : ""}">${ico} ${label}</a>`;

  const box = document.createElement(game ? "div" : "aside");
  box.className = game ? "sp-top" : "sp"; box.id = "sp";
  box.innerHTML = `
    <a class="sp-me" id="spMe" href="#"><span class="sp-av" id="spAv">?</span><span class="sp-me-b"><div class="sp-me-n" id="spName">Sign in to play</div><div class="sp-me-l" id="spLvl"></div><div class="sp-bar"><i id="spXp"></i></div></span></a>
    <div class="sp-chips" id="spChips"></div>
    <div class="sp-nav">
      ${link("./", "🎮", "Play", game)}${link("tasks", "🎯", "Bounties", here === "tasks")}${link("leaderboard", "🏆", "Leaderboard", here === "leaderboard")}${link("jackpot", "🎫", "Jackpot", here === "jackpot")}
    </div>
    <div class="sp-h">Live now</div>
    <button class="sp-card" id="spSent" type="button" title="Open Fear &amp; Greed">
      <svg viewBox="0 0 60 36" aria-hidden="true"><path d="M6 32A24 24 0 0 1 54 32" fill="none" stroke="#23262d" stroke-width="7"/><path d="M6 32A24 24 0 0 1 20 10" fill="none" stroke="#e5484d" stroke-width="7"/><path d="M20 10A24 24 0 0 1 40 10" fill="none" stroke="#f3c64d" stroke-width="7"/><path d="M40 10A24 24 0 0 1 54 32" fill="none" stroke="#2fd08a" stroke-width="7"/><g id="spNeedle" style="transform-origin:30px 32px;transition:transform 1s"><line x1="30" y1="32" x2="30" y2="12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="30" cy="32" r="3" fill="#fff"/></svg>
      <span class="t"><b id="spSentL">Sentiment</b><small id="spSentS">reading the room</small></span>
    </button>
    <a class="sp-card" id="spJp" href="jackpot"><span class="sp-ico">🎫</span><span class="t"><b id="spPot">Jackpot</b><small id="spJpS"></small></span></a>
    <div class="sp-card dx" id="spDx" hidden><span class="sp-ico">⚡</span><span class="t"><b id="spDxL">Double XP hour</b><small id="spDxS"></small></span></div>`;
  if (game) game.prepend(box); else { document.body.appendChild(box); document.body.classList.add("sp-pad"); }

  const arrow = document.createElement("button");
  arrow.id = "spArrow"; arrow.type = "button";
  document.body.appendChild(arrow);
  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === "1"; } catch {}
  const apply = () => { document.body.classList.toggle("sp-collapsed", collapsed); arrow.textContent = collapsed ? "›" : "‹"; arrow.title = arrow.ariaLabel = collapsed ? "Show the side panel" : "Hide the side panel"; place(); };
  arrow.addEventListener("click", () => { collapsed = !collapsed; try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch {} apply(); });

  // where the panel starts (below the top bar and any banner) and where its edge is
  function place() {
    let top = 0;
    for (const el of document.querySelectorAll("body > header.dbar, body > #dxp, body > .testbar")) { const r = el.getBoundingClientRect(); if (r.height) top = Math.max(top, r.bottom); }
    document.documentElement.style.setProperty("--sp-top", Math.round(top) + "px");
    const edge = collapsed ? 0 : (game ? game.getBoundingClientRect().right : 250) - 1;
    arrow.style.left = Math.max(0, Math.round(edge)) + "px";
  }
  addEventListener("resize", place);
  apply();

  const $ = (id) => document.getElementById(id);
  let rank = null;
  async function loadRank() {
    try {
      const j = await (await fetch("api/rank", { cache: "no-store" })).json();
      rank = j;
      if (!j.me) { $("spName").textContent = "Sign in to play"; $("spLvl").textContent = ""; $("spChips").innerHTML = ""; $("spMe").href = "./"; return; }
      $("spName").textContent = "@" + j.me.username;
      $("spMe").href = "p/" + encodeURIComponent(j.me.username);
      $("spAv").innerHTML = j.me.pfp ? `<img src="${esc(j.me.pfp)}" alt="">` : esc((j.me.username || "?")[0].toUpperCase());
      const lv = j.level;
      $("spLvl").textContent = lv ? `Level ${lv.n} · ${lv.name}` : "";
      $("spXp").style.width = (lv ? (lv.next ? lv.pct : 100) : 0) + "%";
      const s = j.streak, chips = [];
      if (j.rank) chips.push(`#${j.rank} of ${j.players}`);
      if (s && s.win > 0) chips.push(`${s.win >= 10 ? "🔥🔥🔥" : s.win >= 5 ? "🔥🔥" : "🔥"} ${s.win} wins`);
      if (s && s.login > 0) chips.push(`📅 Day ${s.login}`);
      $("spChips").innerHTML = chips.map((c) => `<span class="sp-chip">${c}</span>`).join("");
    } catch {}
  }
  loadRank(); setInterval(loadRank, 45_000);
  window.__spRefresh = loadRank;

  $("spSent").addEventListener("click", (e) => { e.stopPropagation(); const b = document.getElementById("sentBtn"); if (b) b.click(); });
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 3600)}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`; };
  function tick() {
    place();
    const st = window.__sentiment && window.__sentiment();
    if (st) {
      const k = st.kind || "neutral", card = $("spSent");
      card.classList.toggle("fear", k === "fear"); card.classList.toggle("greed", k === "greed");
      $("spSentL").textContent = k === "neutral" ? st.label : k === "fear" ? "Fear" : "Greed";
      $("spSentS").textContent = k === "fear" ? "be greedy" : k === "greed" ? "be fearful" : "Fear & Greed";
      $("spNeedle").style.transform = `rotate(${(st.index - 50) * 1.8}deg)`;
    }
    const jp = window.__jackpot;
    if (jp) {
      $("spPot").textContent = fmt(jp.pot) + " pot";
      $("spJpS").textContent = `${fmt(jp.tickets)} tickets · ${clock(jp.nextDrawAt - Date.now() - (jp.skewMs || 0))}`;
    }
    const dx = window.__dxp, box = $("spDx");
    if (dx && (dx.active || dx.next)) {
      const now = Date.now() + (dx.skew || 0);
      box.hidden = false;
      $("spDxL").textContent = dx.active ? `Double XP hour is live` : "Next Double XP hour";
      $("spDxS").textContent = dx.active ? `ends in ${clock(dx.end - now)}` : `in ${clock(dx.next - now)}`;
      box.style.opacity = dx.active ? 1 : .75;
    } else box.hidden = true;
  }
  tick(); setInterval(tick, 1000);
})();
