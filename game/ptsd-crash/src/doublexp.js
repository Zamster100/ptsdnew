// Double XP hour: one window every day (default 9:00 to 10:00 AM New York time, the same moment the daily tasks reset)
// where the bonus XP players earn is doubled.
//
// What doubles: Activity points (win-streak bonuses, perfect sells, the daily login bonus, see xp.js / streaks.js).
// Task points double only when DOUBLE_XP_TASKS=1. Profit (PNL) and referral points never do, and payouts and odds are untouched.
// The multiplier is applied when the XP is earned, so points earned in the window keep their doubled value afterwards.
//
// Settings (env, all optional):
//   DOUBLE_XP_HOUR     hour of the day it starts, New York time, 0-23        (default 9)
//   DOUBLE_XP_MINUTES  how long it lasts, 1-1439                              (default 60)
//   DOUBLE_XP_MULT     the multiplier                                         (default 2)
//   DOUBLE_XP_TASKS    1 = task points double too                             (default 0)
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TZ = "America/New_York";

export function initDoubleXp() {
  const cfg = {
    hour: clamp(Math.floor(num(process.env.DOUBLE_XP_HOUR, 9)), 0, 23),
    minutes: clamp(Math.floor(num(process.env.DOUBLE_XP_MINUTES, 60)), 1, 1439),
    mult: Math.max(1, num(process.env.DOUBLE_XP_MULT, 2)),
    tasks: process.env.DOUBLE_XP_TASKS === "1",
  };
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const parts = (t) => { const o = {}; for (const p of fmt.formatToParts(new Date(t))) if (p.type !== "literal") o[p.type] = Number(p.value); return o; };
  // how far the New York clock is from UTC at instant t (handles daylight saving)
  const offsetMs = (t) => { const p = parts(t); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000; };
  // the instant the New York clock reads <hour>:00 on that calendar date
  const startOn = (y, m, d) => { const local = Date.UTC(y, m - 1, d, cfg.hour, 0, 0); return local - offsetMs(local - offsetMs(local)); };

  // windows around `now`: yesterday's, today's and the next few
  function windows(now, ahead = 3) {
    const p = parts(now), out = [];
    for (let k = -1; k <= ahead; k++) {
      const d = new Date(Date.UTC(p.year, p.month - 1, p.day + k));
      const start = startOn(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      out.push({ start, end: start + cfg.minutes * 60_000 });
    }
    return out.sort((a, b) => a.start - b.start);
  }
  const applies = ["win-streak bonuses", "perfect sells", "the daily login bonus", "achievement bonuses", ...(cfg.tasks ? ["task points"] : [])];

  // Everything the browser needs: is it on, when does it end, when are the next windows.
  function state(now = Date.now()) {
    const ws = windows(now), cur = ws.find((w) => now >= w.start && now < w.end) || null;
    return { active: !!cur, mult: cfg.mult, current: cur, upcoming: ws.filter((w) => w.start > now).slice(0, 2), hour: cfg.hour, minutes: cfg.minutes, tasks: cfg.tasks, applies };
  }
  const mult = (now = Date.now()) => (state(now).active ? cfg.mult : 1);
  return { cfg, state, mult };
}
