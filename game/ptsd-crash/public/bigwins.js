// Big-win popups: when another player sells at 5x or more, a small card slides in at the bottom right with their name.
// Polls a public feed every few seconds; the first load only sets the starting point so nothing old pops up.
(() => {
  const css = document.createElement("style");
  css.textContent = `
  #bw{position:fixed;right:14px;bottom:14px;z-index:30;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;font-family:Manrope,sans-serif}
  .bw{pointer-events:auto;display:flex;align-items:center;gap:10px;min-width:210px;max-width:290px;padding:9px 12px;border-radius:14px;color:#fff;text-decoration:none;background:linear-gradient(135deg,#0f2a1d,#0b1510);border:1px solid #1d6b49;box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 18px rgba(59,227,138,.18);animation:bwIn .35s ease-out}
  .bw.out{animation:bwOut .3s ease-in forwards}
  .bw i{font-style:normal;font-size:22px}
  .bw b{display:block;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bw small{display:block;font-size:12px;font-weight:700;color:#7ee7b3;font-variant-numeric:tabular-nums}
  .bw.huge{border-color:#e8a317;background:linear-gradient(135deg,#2a2210,#140f05);box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 22px rgba(232,163,23,.3)}
  .bw.huge small{color:#ffd54a}
  @keyframes bwIn{from{transform:translateX(30px);opacity:0}}
  @keyframes bwOut{to{transform:translateX(30px);opacity:0}}
  @media (max-width:899px){#bw{bottom:74px;right:8px}}
  @media (prefers-reduced-motion:reduce){.bw,.bw.out{animation:none}}`;
  document.head.appendChild(css);
  const box = document.createElement("div");
  box.id = "bw"; box.setAttribute("aria-live", "polite");
  document.body.appendChild(box);

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  let since = null, seen = new Set();
  function pop(w) {
    const nm = String(w.name || "").replace(/^@/, "");
    const a = document.createElement("a");
    a.className = "bw" + (w.x >= 25 ? " huge" : ""); a.href = "p/" + encodeURIComponent(nm);
    a.innerHTML = `<i>${w.x >= 25 ? "🌕" : "🚀"}</i><span><b>@${esc(nm)}</b><small>sold at ${w.x.toFixed(2)}x · +${fmt(w.pnl)}</small></span>`;
    box.appendChild(a);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { a.classList.add("out"); setTimeout(() => a.remove(), 320); }, 7000);
  }
  async function poll() {
    if (document.hidden) return;
    try {
      const j = await (await fetch("api/bigwins?since=" + (since || 0), { cache: "no-store" })).json();
      const fresh = (j.wins || []).filter((w) => !seen.has(w.id)).sort((a, b) => a.ts - b.ts);
      for (const w of fresh) { seen.add(w.id); since = Math.max(since || 0, w.ts); if (since !== null && started) pop(w); }
      if (!started) { started = true; if (since === null) since = j.serverNow || Date.now(); }
    } catch {}
  }
  let started = false;
  poll(); setInterval(poll, 8000);
})();
