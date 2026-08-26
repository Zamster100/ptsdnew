# PTSD-25 — Implementation Spec

Diagnostic instrument + result card, ready to port from the HTML prototype into the website stack. This doc covers data model, scoring logic, UI flow, and the card output. It does **not** cover the X bot / tagging / leaderboard layer — that's separate backend work (see "Out of scope" at the end).

Reference build: `ptsd25.html` (vanilla JS prototype, fully working, scoring verified).

---

## 1. Data model

### 1.1 Clusters (5)

| id | name | tagline | accent color | result type | type line |
|----|------|---------|--------------|-------------|-----------|
| A | Intrusion | "The chart follows you home." | `#ff4545` | THE HAUNTED | "You still see the wick." |
| B | Avoidance | "It's still there whether you look or not." | `#5aa9ff` | THE GHOST | "The wallet is fine. You just don't go in there." |
| C | Cognition | "The part that doesn't come back." | `#b06bff` | THE CYNIC | "Everything is a rug. You're usually right. That's the problem." |
| D | Hypervigilance | "Nobody is coming, so you watch." | `#ffb020` | THE SENTINEL | "You have not slept properly since 2021 and you consider this an edge." |
| E | Dissociation | "It stopped being money a while ago." | `#9aa393` | THE NPC | "You're not playing anymore. You're just still logged in." |

### 1.2 Response scale (all 25 items)

| value | label |
|---|---|
| 0 | Never |
| 1 | Once or twice |
| 2 | Some weeks |
| 3 | Most days |
| 4 | I'm doing it right now |

### 1.3 The 25 items

5 per cluster, in fixed order. `reverse: true` marks the 2 items scored backwards.

```js
const ITEMS = [
  // Cluster A — Intrusion
  { c:'A', t:"A specific candle, wick, or chart formation appears in your mind while you're doing something completely unrelated." },
  { c:'A', t:"You calculate what a bag would be worth today if you'd held. Nobody asked you to. You just did it." },
  { c:'A', t:"You have dreamt about the price of something you own, or used to own." },
  { c:'A', t:"A number surfaces unprompted — an entry, a floor, a price you didn't take — with no trigger you can identify." },
  { c:'A', t:"Your body reacts before your brain does: a notification sound, a color, a certain shade of red." },

  // Cluster B — Avoidance
  { c:'B', t:"You deliberately don't open your portfolio, because you already know." },
  { c:'B', t:"You muted or left a group chat because of where the conversation was heading." },
  { c:'B', t:'Someone outside crypto asks how "the crypto thing" is going and you change the subject.' },
  { c:'B', t:"There is a ticker, a project, or a founder's name you avoid entirely. You know which one." },
  { c:'B', t:"You can open your wallet without bracing first.", reverse:true },     // item #10

  // Cluster C — Negative Cognition & Mood
  { c:'C', t:"You assume every new project is a rug until proven otherwise, including ones run by people you like." },
  { c:'C', t:"You blame yourself specifically — not the market, not the team. You saw it. You did it anyway." },
  { c:'C', t:"Something goes right and you feel nothing. The green doesn't land anymore." },
  { c:'C', t:"You don't trust your own research even when the research is good." },
  { c:'C', t:"You feel permanently, structurally behind people who got in before you." },

  // Cluster D — Hypervigilance
  { c:'D', t:"You have checked a price between 2am and 5am." },
  { c:'D', t:"Your phone vibrates and something in your chest moves first." },
  { c:'D', t:"You're short with people who have nothing to do with any of this." },
  { c:'D', t:"You read every announcement looking for the bad news hidden in the good news." },
  { c:'D', t:"You sleep through the night regardless of what your positions are doing.", reverse:true },  // item #20

  // Cluster E — Dissociation
  { c:'E', t:"The numbers don't feel like money. They're just numbers on a screen now." },
  { c:'E', t:"You have watched yourself make a decision you knew was bad, from somewhere slightly outside your own body." },
  { c:'E', t:"Hours have disappeared. You were scrolling. You can't recall a single thing you read." },
  { c:'E', t:"None of it feels real — the jpegs, the tokens, the profile picture, the person behind it." },
  { c:'E', t:"The person who made your first buy would not recognize you, and you're not sure they'd be glad." },
];
```

### 1.4 Unscored intake (shown before the 25 items)

- **Q1 — "What cycle did you get in?"** → `2013 or earlier | 2017 | 2021 | 2024 | I'm still not sure I'm in`
- **Q2 — "Your worst one was:"** → `A rug | A liquidation | Not selling | A hack | A friend`

These don't affect scoring. They render on the final card and feed aggregate stats later (see §6).

---

## 2. Scoring

```
per-item score  = reverse ? (4 − selected) : selected
cluster score   = sum of that cluster's 5 item scores      → range 0–20
raw score       = sum of all 25 item scores                → range 0–100
trauma index    = min(9001, round(raw × 90.01))             → range 0–9001
```

Verified boundary values:

| raw | index |
|---|---|
| 0 | 0 |
| 15 | 1,350 |
| 35 | 3,150 |
| 55 | 4,951 |
| 75 | 6,751 |
| 95 | 8,551 |
| 100 | 9,001 |

> Only a perfect raw 100 reaches **OVER 9000**. Keep it rare — that's the point.

### 2.1 Severity bands (by raw score)

| raw range | index range | band | card copy |
|---|---|---|---|
| 0–15 | 0–1,350 | UNTOUCHED | "Clean scan. You have never actually been in it." |
| 16–35 | 1,440–3,150 | EXPOSED | "Early symptoms. It's started." |
| 36–55 | 3,240–4,950 | SYMPTOMATIC | "You're in it. You know you're in it." |
| 56–75 | 5,040–6,750 | CHRONIC | "This is load-bearing now." |
| 76–95 | 6,840–8,550 | TERMINAL | "There is no version of you without this." |
| 96–100 | 8,640–9,001 | OVER 9000 | "PATIENT ZERO. Do not attempt treatment." |

**Design note carried over from the spec:** UNTOUCHED is the highest-virality result — it reads as a status attack on a crypto account. Its card should look visibly cleaner/pastel than every other band. TERMINAL/OVER 9000 cards should look visually degraded (grime texture, desaturation, slight contrast push).

### 2.2 Result type (identity, separate from band)

Take the max of the 5 cluster scores.

- **Single winner** → that cluster's type (e.g. Cluster D wins → `THE SENTINEL`).
- **Two-way tie** → hybrid name: `THE {WINNER_1} {WINNER_2}` (strip "THE " from each, join). E.g. Intrusion + Hypervigilance tie → `THE HAUNTED SENTINEL`.
- **Three-way tie (or more)** → `THE COMPOSITE`, with its own generic type line: *"Three-way tie. The rarest non-perfect presentation on file."*

### 2.3 Malingering flag

If **all 25 raw selected values equal 4** (before reverse adjustment), show a `RESPONSE PATTERN FLAGGED — MALINGERING` banner on the card, above the normal result. Don't suppress the underlying score — still compute and show it; the flag is an overlay, not a replacement. This is the intentional easter egg for people chasing OVER 9000 by mashing the top option.

---

## 3. UI flow

```
1. INTRO         → handle input, optional "referred by" input, "Begin Evaluation"
2. INTAKE (x2)   → unscored, single-select, both required to proceed
3. QUIZ (x25)    → one item at a time, 5-button scale, cluster header + tagline shown,
                   progress = cluster bar (5 segments) + item ticks (25 segments)
4. RESULT        → the card (see §4) + Download + Retake
```

Live feedback while answering (signature UI element, optional but recommended):
- A running raw-score counter ("LIVE READOUT") updates after every answer.
- An accent color tied to the *current* cluster (see color table in §1.1) drives progress bar highlight and any ambient motion element (the prototype uses a scrolling EKG-line SVG whose color and speed shift with the live score — nice-to-have, not required for parity).

---

## 4. The result card

This is the shareable artifact — treat it as its own component, fixed aspect ratio, legible at timeline-thumbnail size.

**Required fields:**

```
PTSD-25 · CLINICAL CHART
PATIENT No. <sequential-or-random-id>
─────────────────────────
<handle>
TRAUMA INDEX: <index> / 9001
BAND: <band>
TYPE: <type name>
─────────────────────────
[subscale bar chart — 5 bars, A–E, colored per cluster]
─────────────────────────
INFECTED BY: <referrer or "self-referred">
SPREAD: 3 remaining
WORST: <intake Q2 answer>          CYCLE: <intake Q1 answer>
```

- **Patient No.** — in the prototype this is randomly generated client-side. For production, this should be a **real sequential ID from your backend** (low numbers are a flex — see §6, this only works with a real counter, not a random one).
- **Subscale bars** — each cluster score (0–20) as a horizontal bar, colored per cluster's accent. This is what lets two people compare charts side by side.
- Card should support **PNG export** (prototype uses html2canvas client-side; you may prefer server-side rendering for consistent output across devices/fonts — recommended for production since it also lets you watermark/brand the export reliably).

---

## 5. Copy & tone guardrails (carry these into every string you write)

1. **Keep the joke pointed at crypto, never at trauma survivors.** Nothing in the item bank references combat, assault, or real clinical trauma for a laugh — keep new copy (bot replies, marketing, card flavor) to that same standard.
2. **Off-ramp, always visible, never sarcastic.** Small text below the result card, every time, regardless of band:

   > *This is satire, not a clinical instrument. If financial loss is genuinely affecting you, help is real and it's free — 988 (US) or your local equivalent, any time.*

   Don't gate this behind a click, don't drop it for "funnier" bands, don't make it part of the joke.
3. **No economic stakes on the result.** Badges, patient numbers, leaderboard rank, character art — fine. If anyone proposes tying a score/band/type to token allocation, a whitelist spot, or a multiplier, that needs legal review before it ships (flag it, don't implement it). Whitelist-for-completion (not score-based) is a lesser gray area but still worth a quick ask.

---

## 6. Out of scope for this component (needs separate backend work)

The card generator above is self-contained. The growth mechanics from the original doc need real infrastructure and aren't covered here:

- **Tagging/referral bot** — listens for `@ptsd test @handle`, DMs a one-time intake link, posts the result card as a reply. Needs an X API integration + reply-variant rotation (20+ variants, capped replies/hour) to avoid spam classification.
- **Sequential patient numbers + contagion tree** — needs a real database (`patients` table: id, handle, referrer_id, result fields, created_at) so low numbers are genuinely early and the tree is real, not decorative.
- **3 exposures per patient** — a `remaining_exposures` counter per patient row, decremented on each successful tag-forward.
- **Public chart pages** (`ptsd.show/patient/handle`) — read view of a patient row.
- **Cross-diagnosis / prediction market** — pre-result public guesses tied to a patient row; correct guesses post-hoc grant a "Clinician" badge on the guesser's own chart.
- **30-day retest cooldown**, with UNTOUCHED getting one free early retest (`RETEST: STILL UNTOUCHED` copy variant).
- **Aggregate stats** ("73% of 2021 entrants scored Terminal") — a weekly rollup query across `intake.cycle` × `band`, safe to publish since it's aggregate, not per-patient.

Recommend building the card/scoring component (this spec) first and shipping it as a standalone quiz to validate the instrument and copy, then layering the bot/tree/leaderboard on top once that's live.
