# PTSD-25 Card — Trading Card / Graded Slab (FINAL DESIGN)

This supersedes all previous card formatting docs. This is a full visual
direction change, not a tweak — moving from a dark clinical-dashboard card
to a Pokemon-style graded trading card. Apply this to all 5 diagnosis types
and all severity bands.

## Why this direction

The old dark-mode/monospace/neon-border card reads as generic AI-generated
UI — that aesthetic is now instantly recognizable regardless of execution
quality. This version instead borrows a design language people already
have deep pattern-recognition for: graded trading cards (Pokemon/PSA slabs)
— a plastic outer case with a grading label, a light card-stock inner card
with a portrait window, and a trait/ability callout box. The content stays
100% PTSD-25 (clinical language, subscale scores, patient numbers); only
the visual container changes.

## Structure (top to bottom)

```
┌─ SLAB (holographic outer casing) ──────────┐
│ ┌─ LABEL PLAQUE (light, like a grading sticker) ─┐ │
│ │ PTSD-25 ONCHAIN                    #0011   │ │
│ │ THE PERMA BEAR          Diagnosed: Chronic │ │
│ │ [barcode strip]                            │ │
│ │            [P·25 badge]                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                   │
│ ┌─ TRADING CARD (light card-stock) ─────────────┐ │
│ │ [@handle pill] ──────────────── [4,951 power] │ │
│ │ ┌─ PORTRAIT WINDOW ─────────────────────────┐ │ │
│ │ │            (character photo               │ │ │
│ │ │           or empty placeholder)     Exhibit A│ │
│ │ └───────────────────────────────────────────┘ │ │
│ │ [🕯️7] [👻9] [🐻17] [👁️8] [💀5]  <- stat strip │ │
│ │ ┌─ TRAIT BOX ───────────────────────────────┐ │ │
│ │ │ [icon]  THE PERMA BEAR                     │ │ │
│ │ │         "Patient calls everything a rug..."│ │ │
│ │ └───────────────────────────────────────────┘ │ │
│ │ Degens Anonymous Institute          [C badge] │ │
│ └─────────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

## What's fixed vs. what varies by band/type

**Driven by SEVERITY BAND** (Untouched / Exposed / Chronic / Terminal —
same logic as before, just applied to new elements):
- Slab holo gradient color
- Label plaque's "Diagnosed:" value + accent color
- Card border color (the 3px border around `.tcard` and `.window`)
- Name pill background color
- "Power" chip background/text color
- Trait icon chip background color
- Wave badge (bottom-right circle) background color

Reference band colors (carry over from the old system):
- Untouched → green `#3aa35a`
- Exposed → green-to-amber `#8fbf5a` → `#ffb020`
- Chronic → orange `#ff8a3d` (used in the reference build below)
- Terminal → red `#ff4545` / `#7a1f1f` — for Terminal specifically, also
  desaturate the card-stock background slightly and add a subtle grime
  texture to the slab, consistent with how Terminal was degraded in the
  old design

**Fixed regardless of band or type** (never changes):
- The 5 stat-strip icons and their meaning: 🕯️ Intrusion, 👻 Avoidance,
  🐻 Cognition, 👁️ Hypervigilance, 💀 Dissociation
- Card-stock base color (parchment/light `#efe8d4` → `#e2d9be` gradient) —
  this does NOT go dark for any band; the slab and accents carry the
  severity signal, the card stock itself stays consistent card material
- Label plaque background (always the light grading-sticker color)

**Driven by TYPE** (the 5 diagnosis types):
- Type name text (in the label plaque and the trait box title)
- Clinical note text (in the trait box)
- Trait icon emoji (🕯️ / 👻 / 🐻 / 👁️ / 💀 matching whichever cluster won)
- Portrait art, when available for that type

## Reference implementation (canonical CSS + HTML)

```css
.slab{
  width: 360px;
  border-radius: 16px;
  padding: 10px;
  position: relative;
  background: linear-gradient(155deg, #3a2415 0%, #1a1109 35%, [BAND_ACCENT] 50%, #1a1109 65%, #3a2415 100%);
  box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08);
}
.slab::before{
  content:"";
  position:absolute; inset:10px;
  border-radius: 10px;
  background: repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 14px);
  pointer-events:none;
  opacity: 0.5;
}
.slab-inner{
  background: #100c08;
  border-radius: 10px;
  padding: 10px 10px 14px;
  position:relative;
}

.label{
  background: #f4f1e6;
  border-radius: 4px;
  padding: 10px 12px 9px;
  margin-bottom: 10px;
  color: #16150f;
  box-shadow: 0 3px 8px rgba(0,0,0,0.4);
}
.label .row1{ display:flex; justify-content:space-between; align-items:baseline; font-family:'Archivo Black', sans-serif; font-size: 12.5px; }
.label .row1 .num{ font-size: 15px; }
.label .row2{ display:flex; justify-content:space-between; align-items:center; margin-top: 4px; }
.label .type-mini{ font-family:'Archivo Black', sans-serif; font-size: 12.5px; text-transform: uppercase; }
.label .grade{ text-align:right; font-size: 9.5px; line-height: 1.35; color:#3a3a30; text-transform:uppercase; letter-spacing:0.04em; }
.label .grade b{ display:block; color:#16150f; font-size:11px; }
.label .barcode{
  margin-top: 6px; height: 20px;
  background: repeating-linear-gradient(90deg, #16150f 0px, #16150f 2px, transparent 2px, transparent 4px, #16150f 4px, #16150f 5px, transparent 5px, transparent 8px);
  opacity: 0.85;
}
.label .badge-row{ display:flex; justify-content:center; margin-top: -12px; }
.badge{
  background: [BAND_ACCENT]; color:#1a1109;
  font-family:'Archivo Black', sans-serif; font-size: 9px; letter-spacing: 0.08em;
  padding: 3px 12px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}

.tcard{
  background: linear-gradient(180deg,#efe8d4,#e2d9be);
  border-radius: 12px;
  border: 3px solid [BAND_ACCENT];
  padding: 12px;
  color: #1e1c14;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.4);
}

.name-pill{
  display:flex; align-items:center; justify-content:space-between;
  background: [BAND_ACCENT]; color: #1a1109;
  border-radius: 20px; padding: 6px 8px 6px 14px; margin-bottom: 10px;
}
.name-pill .handle{ font-family:'Archivo Black', sans-serif; font-size: 13.5px; }
.name-pill .power{
  background:#1a1109; color:[BAND_ACCENT_LIGHT];
  font-family:'Archivo Black', sans-serif; font-size: 11px; padding: 4px 9px; border-radius: 14px;
}

.window{
  position:relative; border-radius: 8px; border: 3px solid [BAND_ACCENT];
  overflow:hidden; background: #12100a; aspect-ratio: 1 / 0.82; margin-bottom: 10px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
}
.window img{ width:100%; height:100%; object-fit:cover; object-position: top center; display:block; }
.window.empty{ display:flex; align-items:center; justify-content:center; }
.window.empty svg{ width:34px; height:34px; opacity:0.3; stroke:#8a8f7c; }
.window .corner-tag{
  position:absolute; bottom:4px; right:6px; font-size:7px; letter-spacing:0.1em; text-transform:uppercase;
  color:#e9e6dc; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:3px;
}

.stat-strip{ display:flex; justify-content:space-between; gap:4px; margin-bottom: 10px; }
.stat-strip .s{ flex:1; text-align:center; background: rgba(0,0,0,0.06); border-radius: 5px; padding: 4px 2px; }
.stat-strip .s .ic{ font-size:11px; display:block; }
.stat-strip .s .v{ font-family:'Archivo Black', sans-serif; font-size:11px; display:block; margin-top:1px; }
/* NOTE: stat-strip icon order/meaning is fixed — see "fixed regardless of band" above.
   The numeric values are the per-cluster scores; do not recolor these per band. */

.trait-box{
  display:flex; gap: 9px; background: rgba(0,0,0,0.05); border: 1.5px solid #c9b98f;
  border-radius: 8px; padding: 9px 10px; margin-bottom: 10px;
}
.trait-icon{
  flex:none; width: 34px; height:34px; background:[BAND_ACCENT]; border-radius: 6px;
  display:flex; align-items:center; justify-content:center; font-size: 17px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.trait-text .t-title{ font-family:'Archivo Black', sans-serif; font-size: 12.5px; text-transform: uppercase; margin-bottom: 2px; }
.trait-text .t-desc{ font-size: 10px; line-height: 1.45; color: #3a3830; }

.tcard-foot{ display:flex; justify-content:space-between; align-items:center; font-size: 8px; letter-spacing:0.05em; color:#6b6650; text-transform:uppercase; }
.wave-badge{
  width: 22px; height:22px; border-radius:50%; background:#1a1109; color:[BAND_ACCENT_LIGHT];
  display:flex; align-items:center; justify-content:center; font-size: 9px; font-family:'Archivo Black', sans-serif;
}
```

```html
<div class="slab">
  <div class="slab-inner">
    <div class="label">
      <div class="row1">
        <span>PTSD-25 ONCHAIN</span>
        <span class="num">#{{PATIENT_NO}}</span>
      </div>
      <div class="row2">
        <span class="type-mini">{{TYPE_NAME}}</span>
        <div class="grade">Diagnosed<br><b>{{BAND_LABEL}}</b></div>
      </div>
      <div class="barcode"></div>
      <div class="badge-row"><div class="badge">P·25</div></div>
    </div>

    <div class="tcard">
      <div class="name-pill">
        <span class="handle">{{HANDLE}}</span>
        <span class="power">{{TRAUMA_INDEX}}</span>
      </div>

      <!-- IF photo exists: -->
      <div class="window">
        <img src="{{PHOTO_URL}}" alt="patient photo">
        <div class="corner-tag">Exhibit A</div>
      </div>
      <!-- IF no photo: -->
      <!--
      <div class="window empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
          <circle cx="12" cy="8" r="3.4"/>
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
        </svg>
      </div>
      -->

      <div class="stat-strip">
        <div class="s"><span class="ic">🕯️</span><span class="v">{{SCORE_A}}</span></div>
        <div class="s"><span class="ic">👻</span><span class="v">{{SCORE_B}}</span></div>
        <div class="s"><span class="ic">🐻</span><span class="v">{{SCORE_C}}</span></div>
        <div class="s"><span class="ic">👁️</span><span class="v">{{SCORE_D}}</span></div>
        <div class="s"><span class="ic">💀</span><span class="v">{{SCORE_E}}</span></div>
      </div>

      <div class="trait-box">
        <div class="trait-icon">{{WINNING_TYPE_ICON}}</div>
        <div class="trait-text">
          <div class="t-title">{{TYPE_NAME}}</div>
          <div class="t-desc">"{{NOTE}}"</div>
        </div>
      </div>

      <div class="tcard-foot">
        <span>Degens Anonymous Institute</span>
        <div class="wave-badge">{{BAND_INITIAL}}</div>
      </div>
    </div>
  </div>
</div>
```

## Band accent values to wire in

| Band | `[BAND_ACCENT]` | `[BAND_ACCENT_LIGHT]` (used for power/wave text) |
|---|---|---|
| Untouched | `#3aa35a` | `#c9d98f` |
| Exposed | `#8fbf5a` (or gradient to `#ffb020`) | `#ffb27a` |
| Chronic | `#ff8a3d` | `#ffb27a` |
| Terminal | `#ff4545` (darker `#7a1f1f` in slab gradient) | `#ff6b6b` |

For Terminal specifically, also add a light grime/desaturation pass to the
slab (reuse the grime texture technique from the old design) so the worst
band still visually escalates beyond just a color swap.

## Cluster icon reference (fixed, never band-driven)

| Cluster | Icon | Used when this cluster wins |
|---|---|---|
| A — Intrusion | 🕯️ | Type: THE HAUNTED |
| B — Avoidance | 👻 | Type: THE BAG HOLDER |
| C — Cognition | 🐻 | Type: THE PERMA BEAR |
| D — Hypervigilance | 👁️ | Type: THE PARANOID DEGEN |
| E — Dissociation | 💀 | Type: THE NUMB |

## Implementation checklist

1. Replace the old dark-dashboard card component entirely with this
   slab + trading-card structure, for all 5 types and all 4 bands.
2. Wire `[BAND_ACCENT]` / `[BAND_ACCENT_LIGHT]` per the table above into
   every element listed under "Driven by SEVERITY BAND."
3. Confirm the stat-strip's 5 icons/order are hardcoded and never
   recolored or reordered by band or type.
4. Wire the portrait window's conditional empty-state markup for types
   without character art yet.
5. Confirm the card-stock background (`#efe8d4` → `#e2d9be`) stays
   constant across all bands except Terminal, which gets the additional
   desaturation/grime pass described above.
6. Drop all remnants of the old dark-dashboard styling (`.card`,
   `.header-block`, `.id-row`, `.readout-line`, old `.pfp`, `.bars` list
   style) — this is a full replacement, not an addition.

Show me one rendered example per band (Untouched, Exposed, Chronic,
Terminal) using the same type, so we can confirm the accent swap and the
Terminal degradation pass both look right before rolling this out across
all five types.
