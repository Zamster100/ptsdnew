// Shared page background: soft glowing particles. Pages with their own <canvas id="fx"> use it, others get one.
// Floating particles behind the page: soft glowing dots drifting upward in the PTSD colors.
(() => {
  let cv = document.getElementById("fx");
  if (!cv) {
    cv = document.createElement("canvas"); cv.id = "fx"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";
    document.body.prepend(cv);
  }
  const cx = cv.getContext("2d");
  if (!cx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const COLORS = ["240,81,80", "232,163,23", "0,216,198", "168,85,247"];
  let w = 0, h = 0, dots = [], raf = 0;
  const make = (anywhere) => ({ x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10, r: 1 + Math.random() * 2.6, vy: 0.15 + Math.random() * 0.45, ph: Math.random() * 6.28, sw: 0.2 + Math.random() * 0.5, c: COLORS[(Math.random() * COLORS.length) | 0], a: 0.25 + Math.random() * 0.5 });
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight; cv.width = w * d; cv.height = h * d; cx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(Math.min(70, Math.max(24, (w * h) / 22000)));
    while (dots.length < n) dots.push(make(true));
    dots.length = n;
  }
  function frame(t) {
    cx.clearRect(0, 0, w, h);
    for (const p of dots) {
      p.y -= p.vy; p.x += Math.sin(t / 1800 + p.ph) * p.sw;
      if (p.y < -10) Object.assign(p, make(false));
      const tw = 0.6 + 0.4 * Math.sin(t / 700 + p.ph);
      const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(${p.c},${p.a * tw})`); g.addColorStop(1, `rgba(${p.c},0)`);
      cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, 6.2832); cx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  addEventListener("resize", size);
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
  size(); raf = requestAnimationFrame(frame);
})();
