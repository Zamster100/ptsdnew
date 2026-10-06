import crypto from "node:crypto";
import { buildPath, paidMult, timeForMult, crashFromR, MAX_MULT } from "../public/path.js";
const crash = () => crashFromR(crypto.randomInt(0, 2 ** 47) / 2 ** 47);
const N = +process.argv[2] || 10000;
const plans = { "all at 2x": [[1, 2]], "all at 10x": [[1, 10]], "half 2x + half 10x": [[0.5, 2], [0.5, 10]], "half 1.5x + half 20x": [[0.5, 1.5], [0.5, 20]] };
const tot = Object.fromEntries(Object.keys(plans).map((k) => [k, 0]));
for (let i = 0; i < N; i++) {
  const C = crash(), p = buildPath(crypto.randomBytes(16).toString("hex")), T = timeForMult(C);
  for (const [name, legs] of Object.entries(plans)) {
    for (const [frac, x] of legs) {
      let got = C >= MAX_MULT ? MAX_MULT : 0;
      for (let t = 0; t < T; t += 0.03) { const m = Math.min(paidMult(p, t), C); if (m >= x) { got = m; break; } }
      tot[name] += frac * got;
    }
  }
}
for (const k in tot) console.log(`${k}: players get back ${(tot[k] / N * 100).toFixed(1)}%`);
