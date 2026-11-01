// Signed-in user chip with a hover menu (Profile, Log out) for the pages that don't have their own header logic.
// The game page builds the same markup itself in index.html / app.js.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const COLORS = ["#F05150", "#E8A317", "#00D8C6", "#3b82f6", "#a855f7"];
function avatar(u) {
  if (u.pfp) return `<span class="av"><img src="${esc(u.pfp)}" alt="" referrerpolicy="no-referrer"></span>`;
  const n = String(u.username || "?"); let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="av" style="background:${COLORS[h % COLORS.length]}">${esc(n[0].toUpperCase())}</span>`;
}
(async () => {
  const bar = document.querySelector(".dbar-right");
  if (!bar) return;
  let me;
  try { me = (await (await fetch("api/me")).json()).user; } catch { return; }
  if (!me) return;
  const box = document.createElement("div");
  box.className = "um";
  box.innerHTML = `<button class="me-chip" type="button" aria-haspopup="true">${avatar(me)}<b>@${esc(me.username)}</b></button>
    <div class="um-pop"><a href="p/${encodeURIComponent(me.username)}">👤 Profile</a><button type="button" data-out>↩ Log out</button></div>`;
  bar.appendChild(box);
  box.querySelector(".me-chip").onclick = () => box.classList.toggle("open");
  document.addEventListener("click", (e) => { if (!box.contains(e.target)) box.classList.remove("open"); });
  box.querySelector("[data-out]").onclick = async () => {
    try { await fetch("api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); } catch {}
    location.href = "./";
  };
})();
