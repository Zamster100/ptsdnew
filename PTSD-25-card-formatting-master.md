# PTSD-25 Card — Formatting Update (apply to all 5 types)

This is the final, locked layout for the result card. Apply this exact
structure/formatting to ALL FIVE diagnosis types (Haunted, Bag Holder, Perma
Bear, Paranoid Degen, Numb) and ALL FOUR severity bands (Untouched, Exposed,
Chronic, Terminal — plus Over 9000 if wired separately). Do not redesign
anything — this is a formatting pass on top of themes that already exist.

## What stays the same across every card (do not change)

- The 5 type names, their clinical notes, and their cluster-to-type mapping
  — untouched by this pass.
- **Severity band drives the accent color** — the top strip, the corner
  stamp, the type name color, the photo border, and the Trauma
  Index/Condition text all take their color from the BAND (severity), not
  from the type. Reference the band color mapping already established:
  - Untouched → green (#3aa35a / pastel variant)
  - Exposed → green-to-amber (#8fbf5a → #ffb020)
  - Chronic → orange (#ff8a3d)
  - Terminal → red (#ff4545 / #7a1f1f), with the degraded grime/glitch
    treatment already built (desaturation, text-shadow glitch on the type
    name, grime overlay)
- **The five subscale bars keep their own FIXED colors regardless of band**
  — these do not change with severity:
  - Intrusion (A) → red `#ff4545`, icon 🕯️
  - Avoidance (B) → blue `#5aa9ff`, icon 👻
  - Cognition (C) → purple `#b06bff`, icon 🐻
  - Hypervigilance (D) → amber `#ffb020`, icon 👁️
  - Dissociation (E) → grey-green `#9aa393`, icon 💀
- The photo, when present, gets the same treatment across all types
  (bordered box, "Exhibit A" tag, `object-fit: cover` filling the box
  completely) — only the border color shifts with the band accent, same as
  everything else.
- Untouched-band cards keep the separate pastel/light theme already built
  (light background, dark text) — this pass doesn't touch that variant's
  color inversion, only its internal layout/spacing per the structure below.

## What changed — the new structure (apply everywhere)

Old layout: full-width handle, then a photo clipped/floating separately,
then a boxed readout container with Trauma Index + Band squeezed together.

New layout, top to bottom:

```
PATIENT NO. ─────────────────────── DGN-XXXXX
─────────────────────────────────────────────
@handle                              ┌────────┐
Cycle: 2019                          │        │
Trauma Index: 4,951 / 9001           │ PHOTO  │
Condition: Chronic                   │        │
                                      │Exhibit A│
                                      └────────┘
─────────────────────────────────────────────
CLINICIAN'S NOTE
THE PERMA BEAR
"Patient calls everything a rug..."

🕯️ Intrusion       ▓▓▓▓░░░░░░  7
👻 Avoidance        ▓▓▓▓▓░░░░░  9
🐻 Cognition        ▓▓▓▓▓▓▓▓░░ 17
👁️ Hypervigilance   ▓▓▓▓░░░░░░  8
💀 Dissociation     ▓▓░░░░░░░░  5
─────────────────────────────────────────────
Infected by: @ptsd
Worst: Called it three weeks early, sold nothing
Not FDA approved. Not approved by anyone, actually.
```

Key structural rules:
- Handle sits alone at the top of the left column (not full-width across
  the whole card — it shares the row with the photo).
- Directly under the handle, three label:value lines, in this exact order:
  **Cycle → Trauma Index → Condition**. No gap-filling, no
  bottom-pinning — they sit close together right under the handle with
  ~14px separation from the handle and ~9px between each line.
- The photo sits to the right of this text column, in its own fixed-width
  box (168px wide, 210px tall), vertically starting at the same top edge
  as the handle.
- "Worst" no longer includes "Member since"/"Cycle" appended to it in the
  footer — that value moved up to the Cycle line under the handle. Footer
  now only shows Infected By and Worst.

## Reference implementation (canonical CSS + HTML)

Use this as the literal source of truth — copy these class names and
structure exactly, then apply the appropriate band-color variant class
(`.exposed`, `.chronic`, `.terminal`, `.untouched`) the same way the
existing band system already works.

```css
.card{
  width: 480px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  padding: 28px 26px 24px;
  color: #e9e6dc;
  box-shadow: 0 20px 50px rgba(0,0,0,0.55);
  background:
    radial-gradient(circle at 85% -10%, rgba(255,255,255,0.05), transparent 45%),
    linear-gradient(180deg, #14170f 0%, #0d0f0a 100%);
}
.strip{ position:absolute; top:0; left:0; right:0; height:5px; }
.stamp{
  position:absolute; top: 18px; right: -34px; width: 160px; padding: 5px 0;
  text-align:center; font-family:'Archivo Black', sans-serif; font-size: 10px;
  letter-spacing: 0.18em; transform: rotate(34deg);
  border-top: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  opacity: 0.75;
}

.header-block{
  padding-bottom: 12px;
  border-bottom: 1px dashed #2a2d22;
  margin-bottom: 16px;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a8f7c;
}
.header-block b{ color:#e9e6dc; display:block; margin-top:2px; font-size:12px; }

.id-row{
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 24px;
  width: 100%;
}
.id-left{
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.handle{
  font-family:'Archivo Black', sans-serif;
  font-size: 22px;
  line-height: 1.15;
  word-break: break-word;
  margin: 0;
}

.readout-line{
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-size: 11.5px;
  color: #8a8f7c;
  margin-top: 14px;
}
.readout-line .row{ display:flex; align-items:baseline; gap: 6px; }
.readout-line .row .lbl{
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #767c68;
}
.readout-line .cycle .val{ font-size: 13px; color: #e9e6dc; font-weight: 600; }
.readout-line .idx-row .idx{
  font-family:'Archivo Black', sans-serif; font-size: 20px; line-height: 1;
  /* color set by band variant */
}
.readout-line .idx-row .idx small{
  font-size: 10.5px; color: #767c68; font-family: 'IBM Plex Mono', monospace; font-weight: 400;
}
.readout-line .band{
  font-size: 9.5px; letter-spacing: 0.13em; text-transform: uppercase;
  border: 1px solid currentColor; border-radius: 20px; padding: 2px 9px;
  /* color set by band variant */
}

.pfp{
  position: relative;
  width: 168px;
  height: 210px;
  flex: 0 0 168px;
  border-radius: 4px;
  overflow: hidden;
  background: #0d0f0a;
  /* border color set by band variant */
}
.pfp img{
  width: 100%; height: 100%;
  object-fit: cover; object-position: top center;
  display: block;
}
.pfp .tag{
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.55);
  font-size: 6px; letter-spacing: 0.1em; text-transform: uppercase;
  text-align: center; padding: 1.5px 0; color: #e9e6dc;
}
.pfp.empty{
  border-style: dashed; border-color: #4a4f3f;
  display: flex; align-items: center; justify-content: center;
}
.pfp.empty svg{ width: 24px; height: 24px; opacity: 0.35; }

.type-block{ margin-bottom: 14px; }
.type-name{
  font-family:'Archivo Black', sans-serif; font-size: 34px; line-height: 1;
  text-transform: uppercase; margin: 0 0 4px;
  /* color set by band variant */
}
.clinician{ font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #767c68; margin: 0 0 4px; }
.note{
  font-style: italic; font-size: 13.5px; line-height: 1.5; color: #e9d6c9;
  border-left: 2px solid currentColor; padding-left: 10px;
  /* border-left color set by band variant */
}

.bars{ margin: 14px 0; }
.bar-row{ display:flex; align-items:center; gap:8px; margin-bottom:7px; font-size:10.5px; }
.bar-row .ic{ width:16px; text-align:center; }
.bar-row .lbl{ width:96px; color:#8a8f7c; text-transform:uppercase; letter-spacing:0.03em; }
.bar-row .track{ flex:1; height:7px; background:#1c1f16; border-radius:4px; overflow:hidden; }
.bar-row .fill{ height:100%; } /* per-cluster FIXED colors — see mapping above, never band-driven */
.bar-row .val{ width:16px; text-align:right; color:#e9e6dc; }

.foot{
  border-top: 1px dashed #2a2d22; margin-top: 14px; padding-top: 12px;
  font-size: 11px; color: #8a8f7c; display:flex; flex-direction:column; gap: 4px;
}
.foot b{ color:#e9e6dc; }
.finePrint{ font-size: 9px; color: #4d5142; margin-top: 8px; font-style: italic; }
```

```html
<div class="card [band-variant-class]">
  <div class="strip"></div>
  <div class="stamp">Confirmed Diagnosis</div>

  <div class="header-block">Patient No.<b>{{PATIENT_NO}}</b></div>

  <div class="id-row">
    <div class="id-left">
      <div class="handle">{{HANDLE}}</div>
      <div class="readout-line">
        <div class="row cycle"><span class="lbl">Cycle:</span> <span class="val">{{CYCLE}}</span></div>
        <div class="row idx-row"><span class="lbl">Trauma Index:</span> <span class="idx">{{INDEX}}<small> / 9001</small></span></div>
        <div class="row"><span class="lbl">Condition:</span> <span class="band">{{BAND_LABEL}}</span></div>
      </div>
    </div>

    <!-- IF photo exists: -->
    <div class="pfp">
      <img src="{{PHOTO_URL}}" alt="patient photo">
      <div class="tag">Exhibit A</div>
    </div>
    <!-- IF no photo, use this instead: -->
    <!--
    <div class="pfp empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="#8a8f7c" stroke-width="1.5">
        <circle cx="12" cy="8" r="3.4"/>
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
      </svg>
    </div>
    -->
  </div>

  <div class="type-block">
    <div class="clinician">Clinician's Note</div>
    <div class="type-name">{{TYPE_NAME}}</div>
    <div class="note">"{{NOTE}}"</div>
  </div>

  <div class="bars">
    <div class="bar-row"><span class="ic">🕯️</span><span class="lbl">Intrusion</span><div class="track"><div class="fill" style="width:{{PCT_A}}%; background:#ff4545;"></div></div><span class="val">{{SCORE_A}}</span></div>
    <div class="bar-row"><span class="ic">👻</span><span class="lbl">Avoidance</span><div class="track"><div class="fill" style="width:{{PCT_B}}%; background:#5aa9ff;"></div></div><span class="val">{{SCORE_B}}</span></div>
    <div class="bar-row"><span class="ic">🐻</span><span class="lbl">Cognition</span><div class="track"><div class="fill" style="width:{{PCT_C}}%; background:#b06bff;"></div></div><span class="val">{{SCORE_C}}</span></div>
    <div class="bar-row"><span class="ic">👁️</span><span class="lbl">Hypervigilance</span><div class="track"><div class="fill" style="width:{{PCT_D}}%; background:#ffb020;"></div></div><span class="val">{{SCORE_D}}</span></div>
    <div class="bar-row"><span class="ic">💀</span><span class="lbl">Dissociation</span><div class="track"><div class="fill" style="width:{{PCT_E}}%; background:#9aa393;"></div></div><span class="val">{{SCORE_E}}</span></div>
  </div>

  <div class="foot">
    <div><b>Infected by:</b> {{REFERRER}}</div>
    <div><b>Worst:</b> {{WORST}}</div>
    <div class="finePrint">Not FDA approved. Not approved by anyone, actually.</div>
  </div>
</div>
```

## Implementation checklist

1. Apply this exact `.header-block` / `.id-row` / `.id-left` / `.readout-line`
   structure to every card component in the project, regardless of which of
   the 5 types or 4 bands is rendering.
2. Confirm the band-variant classes (whatever you currently have for
   Untouched/Exposed/Chronic/Terminal) still control: `.strip` background,
   `.stamp` color, `.type-name` color, `.note` border-left color, `.pfp`
   border color, `.readout-line .idx` color, `.readout-line .band` color.
   These should NOT be hardcoded per type — they come from the band, same
   value regardless of which of the 5 types is showing.
3. Confirm the 5 bar-row fill colors stay fixed and are NEVER touched by
   band variant CSS — Intrusion is always red, Avoidance always blue, etc.,
   in every band, in every type.
4. Wire the photo slot to conditionally render the image markup or the
   empty-placeholder markup depending on whether art exists for that
   type/patient.
5. Remove any leftover "Member since" or duplicate "Cycle" text from the
   footer — it now lives only in the readout-line under the handle.

Show me one full rendered example per band (Untouched, Exposed, Chronic,
Terminal) using the same type, so we can confirm the band-color swap is
working correctly across the new structure before you roll it out to all
five types.
