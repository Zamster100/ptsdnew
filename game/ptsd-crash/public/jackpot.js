// Jackpot link + lottery ticket counter in the top bar of every page. Your tickets for today's draw (instant rugs earn them).
(() => {
  const css = document.createElement("style");
  css.textContent = `
  .nv.jp b{font-variant-numeric:tabular-nums;margin-left:2px;color:#ffd54a}
  .nv.jp.pop{animation:jpPop .9s ease-out}
  @keyframes jpPop{0%{box-shadow:0 0 0 rgba(255,213,74,0);transform:scale(1)}30%{box-shadow:0 0 18px rgba(255,213,74,.9);transform:scale(1.12)}100%{box-shadow:0 0 0 rgba(255,213,74,0);transform:scale(1)}}
  @media (prefers-reduced-motion:reduce){.nv.jp.pop{animation:none}}`;
  document.head.appendChild(css);
  const nav = document.querySelector("nav.nv-wrap");
  if (!nav) return;
  const a = document.createElement("a");
  a.className = "nv jp" + (/\/jackpot\/?$/.test(location.pathname) ? " on" : "");
  a.href = "jackpot"; a.title = "Your lottery tickets for the next daily draw";
  a.innerHTML = `🎫 <b id="jpTix">0</b><span> Jackpot</span>`;
  nav.appendChild(a);
  let last = null;
  async function load() {
    try {
      const j = await (await fetch("api/jackpot", { cache: "no-store" })).json();
      if (!j.on) { a.style.display = "none"; return; }
      document.getElementById("jpTix").textContent = j.tickets.toLocaleString("en-US");
      a.title = `Your raffle tickets (held + pledged). Pot: ${j.pot.toLocaleString("en-US")}`;
      if (last !== null && j.tickets > last) { a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop"); }
      last = j.tickets; window.__jackpot = j;
    } catch {}
  }
  load();
  setInterval(load, 8000);
  window.__jackpotRefresh = load; // the game calls this right after a round ends
})();
