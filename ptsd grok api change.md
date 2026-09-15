Restore the Trauma Index and 5-cluster subscale bars to the Grok-based flow,
and replace the "Cycle" field with the user's real X account join year.

## 1. Expand the Grok call's output contract

Update the system prompt and expected response shape so Grok returns FIVE
subscale scores instead of a single type, plus the note and a "worst" field:

```
Return ONLY valid JSON in this exact shape, nothing else:
{
  "scores": { "A": 0-20, "B": 0-20, "C": 0-20, "D": 0-20, "E": 0-20 },
  "note": "...",
  "worst": "..."
}
```

Update the system prompt instructions to:

```
Based on the user's actual X posts, score them 0-20 on each of these five
clusters, using your judgment of how strongly their posts reflect each
pattern:

A - Intrusion: unprompted recall of past trades/prices, thinking about old
    positions unprompted.
B - Avoidance: avoiding checking portfolio, avoiding certain topics/tickers,
    going quiet on losses.
C - Cognition: cynicism, calling things rugs, distrust, self-blame framing.
D - Hypervigilance: late-night posting/checking, anxious tone, obsessive
    monitoring language.
E - Dissociation: numbness, detachment, treating losses/gains as unreal or
    "just numbers."

A score of 0 means no evidence of this pattern in their posts. A score of 20
means overwhelming, repeated evidence. Most people should NOT max every
category — differentiate based on what you actually find.

Then write ONE short clinical-note-style sentence (1-2 sentences, third
person, dry, deadpan, like a psychiatrist's chart note) for whichever
cluster scored highest, referencing something SPECIFIC and real found in
their posts. Match this tone/register exactly (these are the five reference
notes for the existing fixed types — write in this exact voice, but make
YOUR note specific to what you actually found, not generic):

- THE HAUNTED: "Patient sees a specific candle in his sleep. Candle does
  not see him back."
- THE BAG HOLDER: "Patient has renamed 'down 94%' to 'averaging down.'
  Denial is now load-bearing."
- THE PERMA BEAR: "Patient calls everything a rug. Patient has been right
  four times. Patient will not let this go."
- THE PARANOID DEGEN: "Patient checks the chart at 3am and calls it
  discipline. It is not discipline."
- THE NUMB: "Patient felt the portfolio hit zero and felt nothing else
  that day either."

Finally, find ONE specific bad call, loss, or regret visible in their
post history and paraphrase it in a single line for the "worst" field.
PARAPHRASE ONLY — never quote their post text directly/verbatim. If you
can't find a clear specific example, write "Undisclosed. Patient declined
to elaborate." instead of guessing.
```

## 2. Compute everything else server-side from the five scores

In the backend endpoint, after parsing Grok's { scores, note, worst }
response:

```
raw = scores.A + scores.B + scores.C + scores.D + scores.E   // 0-100
index = min(9001, round(raw * 90.01))
band = lookup from the existing band table (same thresholds as the
       original 25-question version — 0-15 Untouched, 16-35 Exposed,
       36-55 Symptomatic, 56-75 Chronic, 76-95 Terminal, 96-100 Over 9000)

winner = whichever of scores.A..E is highest
tie-break priority if tied (highest priority wins): E > D > C > B > A
       (Numb > Paranoid Degen > Perma Bear > Bag Holder > Haunted)

type_name = fixed lookup based on winner's cluster letter:
  A -> "THE HAUNTED"
  B -> "THE BAG HOLDER"
  C -> "THE PERMA BEAR"
  D -> "THE PARANOID DEGEN"
  E -> "THE NUMB"
```

Do not ask Grok for the type name directly — it's always derived from the
five scores using this fixed logic, so it's guaranteed to always be one of
the five valid types with no drift in naming.

## 3. Restore the subscale bars on the result card

Bring back the 5-row bar chart (A-E, each 0-20, colored per cluster,
labeled with the full cluster name + emoji as already designed in the v2
card mockup) using the `scores` object from the Grok response. Same visual
treatment as the mockup already approved — no new design work needed here,
just wire real data back into it.

## 4. Replace "Cycle" with real X account join year

This requires a second API call — X's own API, not Grok. Add a call to:

```
GET https://api.x.com/2/users/by/username/{handle}?user.fields=created_at
```

using an X Developer App bearer token (separate credential from the xAI
key — flag to me if this isn't set up yet, since it needs its own
developer app registration on X's side).

Extract the year from `created_at` and use it to replace the "CYCLE:"
field on the card with "MEMBER SINCE: {year}" instead. This is real,
factual data — no inference, no fallback guessing needed. If this call
fails (rate limit, invalid handle, etc.), fall back to omitting the field
from the card rather than showing a placeholder or guess.

## 5. Update the "Worst" field

Replace the old 5-option multiple-choice "worst" value with the
Grok-generated paraphrased one-liner from the updated schema (see step 1).
Render it on the card exactly where the old "WORST:" field was.

## What NOT to change

- Don't touch the video interstitial, WL wallet flow, or share-intent
  logic from the previous pass — this is scoped only to the scoring
  pipeline and the two footer fields (Cycle -> Member Since, Worst).
- Don't change the fixed tie-break order or the five type names/colors
  already locked.

Show me a sample of 3-4 real Grok responses against test handles (mix of
high/low activity accounts) before wiring this into the live card, so we
can sanity-check the score distributions look reasonable and not everyone
is landing at either 0 or 20 across the board.

---

## 6. Reference: approved card design (v2)

This is the already-approved visual design for the result card — use this
markup/CSS as the source of truth for the card component. It includes three
severity-band variants (Exposed, Terminal, Untouched) showing how the card's
look shifts by band. Wire the restored `scores` (for the bar chart), `note`,
`worst`, and the new "Member Since" field (replacing "Cycle") into this
existing markup — don't redesign it from scratch.

Note: the sample markup below still shows "Cycle:" in the footer — per
step 4 above, rename that label to "Member Since:" and populate it from the
X API `created_at` year instead of the old intake value.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PTSD-25 Card Redesign — v2</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap');

*{ box-sizing:border-box; }
body{
  margin:0;
  background:#050604;
  padding: 40px 20px;
  font-family:'IBM Plex Mono', monospace;
  display:flex;
  flex-wrap:wrap;
  gap:40px;
  justify-content:center;
}
.label{
  color:#666;
  font-size:11px;
  letter-spacing:0.15em;
  text-transform:uppercase;
  text-align:center;
  margin-bottom:10px;
}

.card{
  width: 480px;
  aspect-ratio: 4/5;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  padding: 28px 26px 24px;
  color: #e9e6dc;
  box-shadow: 0 20px 50px rgba(0,0,0,0.55);
  display:flex;
  flex-direction:column;
}

/* base clinical texture */
.card{
  background:
    radial-gradient(circle at 85% -10%, rgba(255,255,255,0.05), transparent 45%),
    linear-gradient(180deg, #14170f 0%, #0d0f0a 100%);
}
.grain{
  position:absolute; inset:0;
  pointer-events:none;
  opacity: 0.05;
  background-image: repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 3px);
  mix-blend-mode: overlay;
}
.scan{
  position:absolute; inset:0;
  pointer-events:none;
  background: repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0px, transparent 1px, transparent 2px);
}

/* top severity strip */
.strip{
  position:absolute; top:0; left:0; right:0; height:5px;
}

/* stamp */
.stamp{
  position:absolute;
  top: 18px; right: -34px;
  width: 160px;
  padding: 5px 0;
  text-align:center;
  font-family:'Archivo Black', sans-serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  transform: rotate(34deg);
  border-top: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: 0.75;
}

.head{
  display:flex; justify-content:space-between; align-items:flex-start;
  padding-bottom: 12px;
  border-bottom: 1px dashed #2a2d22;
  margin-bottom: 16px;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a8f7c;
}
.head b{ color:#e9e6dc; display:block; margin-top:2px; font-size:12px; }

.handle{
  font-family:'Archivo Black', sans-serif;
  font-size: 26px;
  margin: 0 0 14px;
  word-break: break-word;
}

.readout{
  display:flex;
  gap: 14px;
  align-items:baseline;
  background: rgba(255,255,255,0.03);
  border: 1px solid #262b1e;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 16px;
}
.readout .idx{
  font-family:'Archivo Black', sans-serif;
  font-size: 22px;
}
.readout .idx small{ font-size:11px; color:#767c68; font-family:'IBM Plex Mono',monospace; font-weight:400;}
.readout .band{
  margin-left:auto;
  font-size: 10.5px;
  letter-spacing:0.14em;
  text-transform:uppercase;
  border:1px solid currentColor;
  border-radius: 20px;
  padding: 3px 10px;
}

.type-block{ margin-bottom: 14px; }
.type-name{
  font-family:'Archivo Black', sans-serif;
  font-size: 34px;
  line-height: 1;
  text-transform: uppercase;
  margin: 0 0 4px;
}
.clinician{
  font-size: 9.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #767c68;
  margin: 0 0 4px;
}
.note{
  font-style: italic;
  font-size: 13.5px;
  line-height: 1.5;
  color: #c9c6ba;
  border-left: 2px solid currentColor;
  padding-left: 10px;
}

.bars{ margin: 14px 0 auto; }
.bar-row{ display:flex; align-items:center; gap:8px; margin-bottom:7px; font-size:10.5px; }
.bar-row .ic{ width:16px; text-align:center; }
.bar-row .lbl{ width:96px; color:#8a8f7c; text-transform:uppercase; letter-spacing:0.03em; }
.bar-row .track{ flex:1; height:7px; background:#1c1f16; border-radius:4px; overflow:hidden; position:relative; }
.bar-row .fill{ height:100%; }
.bar-row .val{ width:16px; text-align:right; color:#e9e6dc; }

.foot{
  border-top: 1px dashed #2a2d22;
  margin-top: 14px; padding-top: 12px;
  font-size: 11px;
  color: #8a8f7c;
  display:flex; flex-direction:column; gap: 4px;
}
.foot b{ color:#e9e6dc; }
.finePrint{
  font-size: 9px;
  color: #4d5142;
  margin-top: 8px;
  font-style: italic;
}

/* ===== BAND VARIANTS ===== */

/* EXPOSED — mostly clean, slight warmth */
.exposed .strip{ background: linear-gradient(90deg,#8fbf5a,#ffb020); }
.exposed .stamp{ color:#8fbf5a; }
.exposed .type-name{ color:#c9d98f; }
.exposed .note{ color:#c9c6ba; border-color:#8fbf5a; }
.exposed .readout .idx, .exposed .readout .band{ color:#c9d98f; }

/* TERMINAL — grimy, glitchy, red */
.terminal{ filter: contrast(1.1) saturate(0.9); }
.terminal .strip{ background: linear-gradient(90deg,#ff4545,#7a1f1f); }
.terminal .stamp{ color:#ff4545; }
.terminal .type-name{ color:#ff6b6b; text-shadow: 1px 0 0 rgba(255,0,0,0.4), -1px 0 0 rgba(0,255,255,0.15); }
.terminal .note{ color:#e9c9c9; border-color:#ff4545; }
.terminal .readout .idx, .terminal .readout .band{ color:#ff6b6b; }
.terminal .grain{ opacity:0.12; }
.terminal .grime{
  position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(circle at 20% 90%, rgba(122,31,31,0.35), transparent 60%);
  mix-blend-mode: multiply;
}

/* UNTOUCHED — pastel, insultingly clean */
.untouched{ background: linear-gradient(180deg,#eef2ea,#e2e8db); color:#1b1b16; }
.untouched .grain, .untouched .scan{ display:none; }
.untouched .strip{ background: linear-gradient(90deg,#3aa35a,#8fbf5a); }
.untouched .stamp{ color:#3aa35a; }
.untouched .head{ color:#6b7362; }
.untouched .head b{ color:#1b1b16; }
.untouched .type-name{ color:#2f7a45; }
.untouched .note{ color:#3f453a; border-color:#3aa35a; }
.untouched .readout{ background:rgba(0,0,0,0.03); border-color:#c9d2c0; }
.untouched .readout .idx, .untouched .readout .band{ color:#2f7a45; }
.untouched .bar-row .lbl{ color:#6b7362; }
.untouched .bar-row .track{ background:#d7ddcf; }
.untouched .bar-row .val{ color:#1b1b16; }
.untouched .foot{ color:#6b7362; border-color:#c9d2c0; }
.untouched .foot b{ color:#1b1b16; }
.untouched .finePrint{ color:#9aa38f; }

</style>
</head>
<body>

<div>
  <div class="label">Band: Exposed</div>
  <div class="card exposed">
    <div class="strip"></div>
    <div class="grain"></div><div class="scan"></div>
    <div class="stamp">Confirmed Diagnosis</div>
    <div class="head">Patient No.<b>DGN-04417</b></div>
    <div class="handle">@bigdick1010</div>
    <div class="readout">
      <div class="idx">3,150<small> / 9001</small></div>
      <div class="band">Exposed</div>
    </div>
    <div class="type-block">
      <div class="clinician">Clinician's Note</div>
      <div class="type-name">The Haunted</div>
      <div class="note">"Patient sees a specific candle in his sleep. Candle does not see him back."</div>
    </div>
    <div class="bars">
      <div class="bar-row"><span class="ic">🕯️</span><span class="lbl">Intrusion</span><div class="track"><div class="fill" style="width:60%; background:#ff4545;"></div></div><span class="val">12</span></div>
      <div class="bar-row"><span class="ic">👻</span><span class="lbl">Avoidance</span><div class="track"><div class="fill" style="width:35%; background:#5aa9ff;"></div></div><span class="val">7</span></div>
      <div class="bar-row"><span class="ic">🐻</span><span class="lbl">Cognition</span><div class="track"><div class="fill" style="width:15%; background:#b06bff;"></div></div><span class="val">3</span></div>
      <div class="bar-row"><span class="ic">👁️</span><span class="lbl">Hypervigilance</span><div class="track"><div class="fill" style="width:45%; background:#ffb020;"></div></div><span class="val">9</span></div>
      <div class="bar-row"><span class="ic">💀</span><span class="lbl">Dissociation</span><div class="track"><div class="fill" style="width:20%; background:#9aa393;"></div></div><span class="val">4</span></div>
    </div>
    <div class="foot">
      <div><b>Infected by:</b> self-referred</div>
      <div><b>Worst:</b> Not selling &nbsp;·&nbsp; <b>Cycle:</b> 2013 or earlier</div>
      <div class="finePrint">Not FDA approved. Not approved by anyone, actually.</div>
    </div>
  </div>
</div>

<div>
  <div class="label">Band: Terminal (degraded)</div>
  <div class="card terminal">
    <div class="strip"></div>
    <div class="grain"></div><div class="scan"></div><div class="grime"></div>
    <div class="stamp">Confirmed Diagnosis</div>
    <div class="head">Patient No.<b>DGN-00092</b></div>
    <div class="handle">@speedberg</div>
    <div class="readout">
      <div class="idx">6,840<small> / 9001</small></div>
      <div class="band">Terminal</div>
    </div>
    <div class="type-block">
      <div class="clinician">Clinician's Note</div>
      <div class="type-name">The Numb</div>
      <div class="note">"Patient felt the portfolio hit zero and felt nothing else that day either."</div>
    </div>
    <div class="bars">
      <div class="bar-row"><span class="ic">🕯️</span><span class="lbl">Intrusion</span><div class="track"><div class="fill" style="width:55%; background:#ff4545;"></div></div><span class="val">11</span></div>
      <div class="bar-row"><span class="ic">👻</span><span class="lbl">Avoidance</span><div class="track"><div class="fill" style="width:70%; background:#5aa9ff;"></div></div><span class="val">14</span></div>
      <div class="bar-row"><span class="ic">🐻</span><span class="lbl">Cognition</span><div class="track"><div class="fill" style="width:65%; background:#b06bff;"></div></div><span class="val">13</span></div>
      <div class="bar-row"><span class="ic">👁️</span><span class="lbl">Hypervigilance</span><div class="track"><div class="fill" style="width:60%; background:#ffb020;"></div></div><span class="val">12</span></div>
      <div class="bar-row"><span class="ic">💀</span><span class="lbl">Dissociation</span><div class="track"><div class="fill" style="width:90%; background:#e9e6dc;"></div></div><span class="val">18</span></div>
    </div>
    <div class="foot">
      <div><b>Infected by:</b> @ptsd</div>
      <div><b>Worst:</b> A friend &nbsp;·&nbsp; <b>Cycle:</b> 2021</div>
      <div class="finePrint">Not FDA approved. Not approved by anyone, actually.</div>
    </div>
  </div>
</div>

<div>
  <div class="label">Band: Untouched (rage bait)</div>
  <div class="card untouched">
    <div class="strip"></div>
    <div class="stamp">Confirmed Diagnosis</div>
    <div class="head">Patient No.<b>DGN-08812</b></div>
    <div class="handle">@normiewallet</div>
    <div class="readout">
      <div class="idx">1,080<small> / 9001</small></div>
      <div class="band">Untouched</div>
    </div>
    <div class="type-block">
      <div class="clinician">Clinician's Note</div>
      <div class="type-name">Clean Scan</div>
      <div class="note">"Patient has never actually been in it. Recommend continued observation from a safe distance."</div>
    </div>
    <div class="bars">
      <div class="bar-row"><span class="ic">🕯️</span><span class="lbl">Intrusion</span><div class="track"><div class="fill" style="width:10%; background:#ff4545;"></div></div><span class="val">2</span></div>
      <div class="bar-row"><span class="ic">👻</span><span class="lbl">Avoidance</span><div class="track"><div class="fill" style="width:15%; background:#5aa9ff;"></div></div><span class="val">3</span></div>
      <div class="bar-row"><span class="ic">🐻</span><span class="lbl">Cognition</span><div class="track"><div class="fill" style="width:5%; background:#b06bff;"></div></div><span class="val">1</span></div>
      <div class="bar-row"><span class="ic">👁️</span><span class="lbl">Hypervigilance</span><div class="track"><div class="fill" style="width:10%; background:#ffb020;"></div></div><span class="val">2</span></div>
      <div class="bar-row"><span class="ic">💀</span><span class="lbl">Dissociation</span><div class="track"><div class="fill" style="width:5%; background:#9aa393;"></div></div><span class="val">1</span></div>
    </div>
    <div class="foot">
      <div><b>Infected by:</b> self-referred</div>
      <div><b>Worst:</b> Not selling &nbsp;·&nbsp; <b>Cycle:</b> 2024</div>
      <div class="finePrint">Not FDA approved. Not approved by anyone, actually.</div>
    </div>
  </div>
</div>

</body>
</html>
```
