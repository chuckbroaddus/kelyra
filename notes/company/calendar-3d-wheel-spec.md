# Calendar 3D horizontal wheel — period icon tiles (sample)

**Date:** 2026-09-20  
**Card:** `t_f2203851`  
**Role:** UI/UX Designer — visual + motion sample. **No lock. No Eng. No src.**  
**Binding brief:** CEO Chuck 2026-09-20 (this card body).

## 0. Job

Touch-only **horizontal 3D wheel** of **Set B hanging-ledger ICON TILES** as the Calendar **period selector drum**.

Same component on **Year · Month · Week · Day** (period grain only).  
**Not** PersonTabs Y/M/W/D (view-kind).  
**Not** vertical picker · text Rolodex · flat equal-size card row · pink pills · PR 149 live look.

Center tile = current period (and **Today** when teacher taps center / jumps today).  
Neighbors = prev/next periods, smaller · faded · tilted. Swipe advances period.

## 1. Status

**Complete for CoS screenshot** (docs + HTML sample).

- [x] Geometry (sizes, curves, spacing, rotateY, focus band)
- [x] Motion (swipe, momentum, spring snap, tap-to-center)
- [x] States (idle / dragging / snapped / disabled)
- [x] Light + dark surfaces
- [x] Reduced-motion fallback
- [x] Hit targets + recognizability
- [x] Non-goals + handoff

**Mockups:** `notes/company/calendar-3d-wheel-mockups/index.html`  
**Icon family:** Set B hanging-ledger — `calendar-view-icon-options.md`  
**What NOT to ship:** `calendar-period-pager-ceo-shots/` · live pink pills

---

## 2. Geometry (phone 390-wide)

### 2.1 Stage

| Token | Value | Notes |
|---|---|---|
| Stage width | **390** (phone chrome content) | Web desk may widen stage; curves stay index-based |
| Stage height | **148** | Thumb drag band; tiles sit vertically centered |
| Perspective | **920px** | Camera distance; not shallow (avoids fish-eye) |
| Perspective origin | `50% 45%` | Slightly above mid so hanging tabs read upright |
| Visible slots | **5** preferred (center ±2); peek ±3 OK | Never only 2 (PR 149 Year miss) |
| Slot pitch `P` | **78 px** | Center-to-center along wheel X at rest |
| Focus band | Center **±59 px** (118 wide dashed cue optional in sample) | Snap locks when tile center enters band |

### 2.2 Hero tile (center, distance 0)

| Token | Value |
|---|---|
| Layout box | **108 × 126** |
| Leaf art | Set B full color, opacity **1.0**, scale **1.0** |
| rotateY | **0°** |
| translateZ | **+36 px** (lift toward camera) |
| Shadow | Soft drop `rgba(0,0,0,0.35)` dark / `rgba(26,22,18,0.18)` light |

### 2.3 Scale curve vs signed distance `d` (slot units)

`d` = continuous offset from center (0 at snapped center). Integer neighbors at rest: −2, −1, 0, +1, +2.

| \|d\| | scale | Intent |
|---|---|---|
| 0 | **1.00** | Hero — full recognizability |
| 0.5 | **0.90** | Mid-drag between slots |
| 1 | **0.78** | Immediate neighbor |
| 1.5 | **0.68** | |
| 2 | **0.60** | Outer rest neighbor |
| 2.5 | **0.52** | |
| ≥3 | **0.46** clamp | Far peek only |

**Formula (sample):**  
`scale(d) = clamp(1 - 0.22 * |d| - 0.02 * d², 0.46, 1)`

### 2.4 Opacity curve

| \|d\| | opacity |
|---|---|
| 0 | **1.00** |
| 1 | **0.78** |
| 2 | **0.50** |
| ≥3 | **0.28** |

**Formula:** `opacity(d) = clamp(1 - 0.24 * |d| - 0.03 * d², 0.22, 1)`

Side tiles stay **readable**, not ghosts. Year full-red and Day big numeral must still parse at \|d\|=2.

### 2.5 rotateY tilt (full motion only)

Signed: left neighbors rotate **positive** (turn inward to face center); right **negative**.

| \|d\| | \|rotateY\| |
|---|---|
| 0 | **0°** |
| 1 | **28°** |
| 2 | **40°** |
| ≥3 | **48°** clamp |

**Formula:** `rotateY(d) = clamp(d, -3, 3) * -14` degrees  
(left d&lt;0 → positive yaw facing in; right d&gt;0 → negative)

No rotateX/Z. No parallax on body content under RM bans (see §6).

### 2.6 Spacing / world X

At rest, tile world X = `d * P` with `P = 78`.  
During drag, fractional `d` from scroll position: `d = (scrollX / P)` inverted so finger right → content left (natural carousel).

Composite transform (full motion):

```
translateX(d * P) · translateZ(z(d)) · rotateY(ry(d)) · scale(s(d))
```

`z(d) = 36 - 18 * |d|` (center closest; sides recede).

### 2.7 Focus band + snap physical

- Snap target = nearest integer slot when velocity low.
- If release velocity high, fling 1–N slots then spring to integer.
- Snap is **physical** (overshoot ≤ 6% of P, settle hard) — not floaty rubber forever.
- Center tile after snap owns period identity; sidecars are neighbors only.

---

## 3. Tile art (Set B — same family, period grain)

**Palette (explicit hex, no CSS vars):**

| Role | Hex |
|---|---|
| Header / full-red Year | `#C62828` |
| Sunday | `#E53935` |
| Body white | `#FFFFFF` |
| Type black | `#1A1A1A` |
| Grid line | `#E0E0E0` |
| Tab metal | `#B0BEC5` |
| Tab highlight | `#ECEFF1` |
| Soft edge | `rgba(0,0,0,0.18)` |

**Per grain (period identity on the leaf — not PersonTabs chips):**

| Grain | Center leaf | Side leaves |
|---|---|---|
| **Year** | Full-red page · white `2026` · two metal tabs | Full-red · `'YY` shorthand · tabs |
| **Month** | Red `MONTH YYYY` · white grid · Sunday red · tabs | Neighbor month · may shorten mon · real grid (no empty stub) |
| **Week** | Double-height red wrap (`JUN 8–14` / year) · 7-day strip · Sunday cue | Neighbor week strip · short range header |
| **Day** | Double-height red wrap (`JUNE` / year) · **large black day numeral** · tabs | Neighbor day numeral · short mon header |

**Law:** icons remain Set B hanging-ledger. Do not swap to spiral Set A. Do not put body captions `Day` / `Range`. Do not use pink pills.

**Side recognizability floor:** at scale 0.60, Day numeral ≥ ~22 CSS-px equivalent ink; Year digits still four/two glyph; Month shows ≥ one readable grid row or weekday ticks.

---

## 4. Motion

Touch-only. **No** keyboard · arrow keys · hover-required affordances. Desktop sample may use pointer as touch stand-in; production phone is finger.

### 4.1 Drag

| Token | Value |
|---|---|
| Tracking | 1:1 finger → scrollX while `pointerdown` on stage |
| Axis | Horizontal only; vertical scroll of page must not steal once drag intent &gt; 6 px horizontal |
| Hit area | Full stage **390 × 148** (thumb-sized) — not tiny side icon only |
| Mid-drag | Continuous `d`; **no** snap until release |
| Edge | Rubber-band ≤ 0.35 slot past first/last if finite list; infinite calendar period → no hard wall |

### 4.2 Momentum

| Token | Value |
|---|---|
| On release | Apply velocity (px/ms) from last 80–100 ms of samples |
| Friction | Exponential decay; half-life ~90 ms **or** `v *= 0.92` per 16 ms frame |
| Stop threshold | \|v\| &lt; 0.04 px/ms → hand to snap |
| Max fling slots | **3** per gesture (prevents runaway year skips) |
| Direction | Sign of velocity picks next integer beyond projected coast |

### 4.3 Spring snap

| Token | Value |
|---|---|
| Duration | **300 ms** typical (clamp 240–340) |
| Easing | `cubic-bezier(0.22, 1.0, 0.36, 1.0)` **or** spring damping **0.86**, response **0.32 s** |
| Overshoot | ≤ **6%** of slot pitch |
| Feel | **Physical / decisive** — settle, don’t float |
| Interrupt | New touch cancels spring; re-base from current visual `d` |

### 4.4 Tap side tile → center

| Token | Value |
|---|---|
| Hit test | Expand each tile’s hit to **min 56×56** in screen space even when visually small (no precision-tap on tiny side icons) |
| Action | Animate `d` → that tile’s index (spring §4.3) |
| Center tap | **Today / jump current period** (existing calendar today law) — does not advance |
| Debounce | Ignore second tap during spring (&lt; 120 ms) |

### 4.5 Period commit

Period value commits when snap **completes** (or RM instant settle). Mid-drag does not commit. Announce period to a11y on commit only.

### 4.6 Relation to other gestures

| Conflict | Winner |
|---|---|
| Tray hide-on-scroll | Vertical list scroll — wheel ignores vertical after lock |
| iOS edge back (CAL-40) | System back ≠ period swipe; keep ≥ 20 px from left edge dead for back if platform needs |
| PersonTabs | Separate row; wheel does not switch Y/M/W/D view-kind |
| Drawer | Drawer drag wins at left edge |

---

## 5. States

| State | Visual | Interaction |
|---|---|---|
| **idle** | Integer `d`; center hero; 5 tiles posed | Drag or tap side |
| **dragging** | Fractional `d` follows finger; focus band optional dim | Tracking; no commit |
| **snapped** | Spring finished; center full color; caption may show period label under stage | Ready |
| **disabled / empty** | All tiles opacity ≤ 0.35; grayscale optional; no tilt motion | No drag; no tap advance; show empty reason in caption if any |
| **loading** | Keep last snapped tiles; no shimmer required (R3 law) | Ignore input or queue |
| **RM** | See §6 — still has idle/drag/snapped | Snap durations → 0–120 ms fade/cut |

Caption under wheel (optional chrome): period prose **after** snap only (e.g. `June 2025`) — not generic `Range`/`Day` nouns inside the leaf body.

---

## 6. Reduced motion (RM) fallback

When OS reduce-motion is on:

| Keep | Drop |
|---|---|
| Scale curve | **rotateY** (force 0) |
| Opacity curve | translateZ lift (flatten to 2D row) |
| Slot pitch + snap to integer | Springs → **≤120 ms** ease or hard cut |
| Tap side → center | Momentum fling optional → step ±1 only |
| Thumb-sized hit area | Perspective (set none) |

**RM still must:** look like a period chooser with bigger center and dimmer sides — not equal pills.  
**RM must not:** require 3D to understand which period is selected.

---

## 7. Light + dark surfaces

Wheel sits on Calendar chrome elevated plate (not tray).

| Token | Light | Dark |
|---|---|---|
| Page/stage plate | `#FFFCFA` | `#1E1C19` |
| App bg behind plate | `#F7F3EC` | `#141210` |
| Caption ink | `#1A1612` | `#F4EFE6` |
| Meta / label | `#6B645C` | `#A89F93` |
| Plate border | `#E6DFD4` | `#3A342C` |
| Focus band | `rgba(198,40,40,0.28)` | `rgba(198,40,40,0.35)` |
| Leaf art | **Same Set B hex on both** (photo page does not re-theme) | Same |

Do not recolor leaf red/white/black by theme. Only chrome around the drum themes.

---

## 8. Hit targets + thumb law

1. **Drag surface** = entire wheel host (≥ 44 pt tall; sample 148).  
2. **Side tiles** expand hit boxes so teachers never precision-tap a 40-wide scaled leaf.  
3. **No** hover-only glow as the only affordance.  
4. Snap must feel like a **mechanical detent**, not a slow float into place.  
5. Icons on sides stay **recognizable** (scale floor 0.46, opacity floor ~0.28, art not replaced by ellipsis pills).

---

## 9. Before vs after

| | Before (rejected live / old chrome) | After (this sample) |
|---|---|---|
| Control | `<<` label `>>` or pink pills / jammed 3-flat | **3D icon drum** of Set B leaves |
| Hierarchy | Equal or broken 2-tile window | Center hero + scaled/tilted neighbors |
| Art | Text range / `Day`/`Range` captions | Year full-red · Month grid · Week strip · Day numeral |
| Motion | Button taps or shallow swipe | Touch wheel + momentum + spring snap |
| Density | One row of 3 flat | Same row footprint; depth hierarchy |

---

## 10. Constraints honored

- Teacher chrome clarity (period identity obvious)  
- Set B hanging-ledger family (tabs, red header / full-red Year, Sunday red)  
- Tray G1 HOLD · Diary ≠ Calendar · no hamburger Calendar restore  
- PersonTabs remain view-kind (not this drum)  
- Period swipe ≠ iOS back (CAL-40)  
- Touch-only  
- Matcher / grade laws untouched (chrome only)  
- Docs + HTML only on this card  

---

## 11. Explicit non-goals

- No `src/` · no Eng · no `npm run icons` · no PNG atlas of dates  
- No competing density pack unless Chuck asks (primary = one comfortable density)  
- No lock / winner language for PM stamp on this card  
- No vertical drum · no text-only Rolodex · no flat equal card strip as the proposal  
- No cloning PR 149 pink pills / empty month stubs / ISO-chopped week strings  
- No keyboard/arrow API in sample  
- No tray Calendar glyph change · no PersonTabs restyle  
- Do not patch `docs/ui-design.md` until PM chooses  

---

## 12. Recommendation (not a lock)

**Ship this single comfortable-density 3D wheel** as the period drum sample for Chuck screenshots. Geometry + motion numbers above are the binding sample values for CoS/CEO review. PM/Arch bind after nod; Eng does not start from this card.

If chrome height fights Month grid later, a **compact** pitch `P=68` / hero `96×112` may be a second density — **not** opened here.

---

## 13. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | 3D horizontal period wheel spec + four-view HTML |
| CONTEXT | CEO 2026-09-20 brief; PR 149 look rejected; Set B family |
| FILES | `calendar-3d-wheel-spec.md` · `calendar-3d-wheel-mockups/index.html` |
| CONSTRAINTS | Docs+HTML; no src; no lock; touch-only |
| RESULT | Sample ready for CoS screenshot |
| NEXT | CoS → Chuck review; PM stories only after nod |
