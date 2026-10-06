// House starts with $100, player bets $1 per round, 200 rounds, random player style.
import crypto from "node:crypto";
import { buildPath, paidMult, timeForMult, crashFromR, MAX_MULT } from "../public/path.js";
const crash = () => crashFromR(crypto.randomInt(0, 2 ** 47) / 2 ** 47);
// random player: picks a target each round, mostly small, sometimes greedy
const target = () => { const u = Math.random(); return u < 0.5 ? 1.2 + Math.random() * 0.8 : u < 0.85 ? 2 + Math.random() * 3 : 5 + Math.random() * 45; };
function round() {
  const C = crash(), p = buildPath(crypto.randomBytes(16).toString("hex")), T = timeForMult(C), x = target();
  for (let t = 0; t < T; t += 0.05) { const m = Math.min(paidMult(p, t), C); if (m >= x) return m; }
  return C >= MAX_MULT ? MAX_MULT : 0;
}
function session(log) {
  let house = 100, low = 100, wins = 0, big = 0;
  for (let i = 0; i < 200; i++) { const m = round(); house += 1 - m; if (m > 0) wins++; if (m >= 5) big++; low = Math.min(low, house); }
  return { house, low, wins, big };
}
const one = session();
console.log("ONE RUN:", JSON.stringify({ house: one.house.toFixed(2), lowest: one.low.toFixed(2), playerWins: one.wins, wins5xPlus: one.big }));
const N = +process.argv[2] || 3000, res = [];
for (let i = 0; i < N; i++) res.push(session());
const h = res.map((r) => r.house).sort((a, b) => a - b), q = (f) => h[Math.floor(f * (h.length - 1))].toFixed(2);
console.log(`${N} RUNS: avg ${(h.reduce((a, b) => a + b) / N).toFixed(2)} | worst ${q(0)} | 10% ${q(0.1)} | median ${q(0.5)} | 90% ${q(0.9)} | best ${q(1)} | house ended down ${(res.filter((r) => r.house < 100).length / N * 100).toFixed(1)}% | dipped below $80 ${(res.filter((r) => r.low < 80).length / N * 100).toFixed(1)}%`);
