// Level perks: each badge stage you reach pays a little more on the free credit claims (the daily claim and the NFT bonus claim).
// Credits only. A perk never touches the odds, the bet limits, profit, XP or the leaderboard, so it can't be a way to win more.
// The starter pack is not boosted. Levels never go down, so a perk, once earned, stays.
//   PERKS=0   switch the perks off
export const PERKS = [
  { level: 5, name: "Paper Hands", claimPct: 5 },
  { level: 10, name: "Diamond Hands", claimPct: 10 },
  { level: 15, name: "Chart Reader", claimPct: 15 },
  { level: 20, name: "Degen", claimPct: 20 },
  { level: 25, name: "Rug Survivor", claimPct: 25 },
  { level: 30, name: "Legend", claimPct: 30 },
];
const on = () => process.env.PERKS !== "0";
// bonus (in percent) on free claims for a player at this level
export const claimPct = (level) => (on() ? PERKS.reduce((p, k) => (level >= k.level ? k.claimPct : p), 0) : 0);
export const claimMult = (level) => 1 + claimPct(level) / 100;
