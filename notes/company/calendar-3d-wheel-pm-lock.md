# CAL-3DW — Calendar 3D horizontal wheel PM lock

**Date:** 2026-09-20  
**Author:** product-manager (Kelyra)  
**Card:** `t_9cb5585d`  
**IQG parent (sticky — do not implement/unblock/staff Eng):** `t_3af8f514`  
**CEO send (2026-09-20):** horizontal 3D wheel of Set B icon tiles — period drum.  
**Designer SoT:** `notes/company/calendar-3d-wheel-spec.md` · mockups `notes/company/calendar-3d-wheel-mockups/index.html` · designer `t_f2203851`  
**Icon family:** Set B hanging-ledger (`calendar-view-icon-pm-lock.md`)  
**Supersedes (look):** `<<` label `>>` · PR 149 pink pills / equal flat cards · text-only Rolodex as ship  
**HOLD:** tray G1 · PersonTabs view-kind · CAL-40 ≠ period swipe · Day List no drum (CAL-R5-11) · `docs/ui-design.md` wait  
**Status:** BINDING docs-only PM lock + dual IQG stamp MET (PM `t_9cb5585d` + QAS `t_c28b495d`). Eng dark until Chuck send on `t_3af8f514`. No src. No ui-design.md edit.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KELYRA Calendar 3D horizontal wheel period picker (Set B icon tiles; Year/Month/Week/Day)
Quality goals: Horizontal 3D drum snap-center; scale+fade(+rotateY full); RM no tilt keep scale/fade/snap; momentum+spring; tap side→center; thumb stage; light+dark; grain art Set B; period≠iOS back; PersonTabs/tray HOLD; no src on stamp
PM: APPROVED  date: 2026-09-20  profile-session: product-manager / t_9cb5585d · notes/company/calendar-3d-wheel-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-20  profile-session: qa-supervisor / t_c28b495d · notes/company/calendar-3d-wheel-intent.md
Intent gaps remaining: none
```

**Dual stamp: MET.** Do not staff Eng until Chuck send on `t_3af8f514`. Parent sticky. Intent: `notes/company/calendar-3d-wheel-intent.md`.

---

## 0. Binding pick

| Lane | Lock | Rejected |
|---|---|---|
| Job | Period identity + paging drum | PersonTabs; tray G1 |
| Form | Horizontal 3D wheel of Set B icon tiles | Vertical; text Rolodex; flat equal cards; pink pills; PR 149 look |
| Window | 5 slots preferred (center ±2); peek ±3 OK | 2-tile only; infinite strip UX |
| Hierarchy | Center hero grow/brighten; sides shrink/dim/rotateY | Equal-weight tiles |
| Motion | Momentum + spring snap; tap side → center | Chevron-only primary |
| RM | No tilt; keep scale, fade, snap | RM disables paging; RM equal pills |
| Themes | Light + dark chrome | Recolor leaf art by theme |
| Grains | Same component Y/M/W/D period | PersonTabs as period |
| Hit | Full thumb stage; expanded side hits | Tiny-tap only |
| Data | Live anchors/shifters | New SQL/RPC |
| ui-design.md | Wait (Chuck after merge) | Patch from this card |

Surfaces: year/month/week/multiday/day(!list)/agenda = YES. day list = NO.

Wire: `PeriodWheel` · `PeriodTile` · anchors/shifters/jumpToday as live · PersonTabs HOLD · tray G1 HOLD · CAL-40 HOLD.

---

## 1. Product laws (CAL-3DW)

| Law ID | Lock |
|---|---|
| **CAL-3DW-01** | Period drum **replaces** only live `<<` / today-label / `>>` (and PR 149 period pills). **Not** PersonTabs. **Not** tray. |
| **CAL-3DW-02** | Form is **horizontal 3D wheel** of **Set B hanging-ledger icon tiles**. Not vertical. Not text-only Rolodex. Not flat equal cards. Not pink pills. |
| **CAL-3DW-03** | **Same component** on Year · Month · Week · Day (and multiday/agenda grains that mount period chrome). Tile **content** differs by grain; interaction is one. |
| **CAL-3DW-04** | Center tile = **current period**. Tap **center** / jump today → **Today** (`jumpToday` + live clear rules). Center does not advance. |
| **CAL-3DW-05** | Neighbors = prev/next periods. At rest prefer **five** visible (center ±2). Never ship a two-tile-only window. |
| **CAL-3DW-06** | Toward center **grow + brighten**; away **shrink + dim + rotateY** (full motion). Snap when tile center enters focus band. |
| **CAL-3DW-07** | **1:1 drag** on stage; **momentum** on release; **spring snap** to integer; max fling **3** slots/gesture. Period **commits on snap complete** only (not mid-drag). |
| **CAL-3DW-08** | **Tap side tile** → spring that tile to center (min **56×56** hit even when visually small). |
| **CAL-3DW-09** | **RM:** drop **rotateY** and Z-lift/perspective; **keep scale, opacity, integer snap**, tap-to-center, thumb hit. Snap ≤120 ms or hard cut. Still bigger center + dimmer sides — never equal pills. |
| **CAL-3DW-10** | **Light + dark** chrome plate themes; **leaf Set B hex unchanged** across themes. |
| **CAL-3DW-11** | Drag surface = **full wheel host** (thumb band; sample **390×148**). No hover-only sole affordance. |
| **CAL-3DW-12** | Period swipe **≠** iOS leading-edge back / CAL-40 `zoomUp`. Keep ≥ ~20 px left edge for system pop when needed. |
| **CAL-3DW-13** | **No new SQL/RPC/Edge.** Neighbors = client date math. Hats/twins/Hidden unchanged. |
| **CAL-3DW-14** | Day List continuous mode: **no** period drum (CAL-R5-11 HOLD). |
| **CAL-3DW-15** | View change (PersonTabs) **resets** wheel window to new grain’s neighbors. |
| **CAL-3DW-16** | Tile art = **Set B hanging-ledger** only. No spiral Set A. No body captions `Day`/`Range`. No white-ink `build-icons` for dated leaves. |
| **CAL-3DW-17** | Fail closed: wheel cannot paint → live `<<` / label / `>>` + center Pressable, same handlers. No blank toolbar. |
| **CAL-3DW-18** | Do **not** edit `docs/ui-design.md` until Chuck device send / CoS opens that doc. |

### 1.1 Mount matrix

| `activeView` | Wheel? | Anchor | Step |
|---|---|---|---|
| `year` | Yes | `yearAnchor` | ±1 year |
| `month` | Yes | `monthAnchor` | `shiftMonth` |
| `week` | Yes | `gridAnchor` | `shiftWeek` |
| `multiday` | Yes | `gridAnchor` | `shiftMultiday` |
| `day` + not list | Yes | `dayAnchor` | `shiftDay` |
| `agenda` | Yes | `agendaAnchor` | ±7 days |
| `day` + list | **No** | — | CAL-R5-11 |

### 1.2 Palette (Set B — same both themes on leaf)

Header/full-red Year `#C62828` · Sunday `#E53935` · body `#FFFFFF` · type `#1A1A1A` · grid `#E0E0E0` · tab metal `#B0BEC5` · tab highlight `#ECEFF1` · soft edge `rgba(0,0,0,0.18)`.

### 1.3 Chrome plate (themes around drum only)

| Token | Light | Dark |
|---|---|---|
| Stage plate | `#FFFCFA` | `#1E1C19` |
| App bg | `#F7F3EC` | `#141210` |
| Caption ink | `#1A1612` | `#F4EFE6` |
| Meta | `#6B645C` | `#A89F93` |
| Plate border | `#E6DFD4` | `#3A342C` |
| Focus band | `rgba(198,40,40,0.28)` | `rgba(198,40,40,0.35)` |

---

## 2. Geometry binding (designer SoT — phone 390)

| Token | Lock sample |
|---|---|
| Stage | **390 × 148**; perspective **920px**; origin `50% 45%` |
| Slot pitch `P` | **78 px** |
| Focus band | Center ±**59 px** |
| Hero box | **108 × 126**; scale 1.0; opacity 1.0; rotateY 0; Z **+36** |
| Scale | `clamp(1 - 0.22*|d| - 0.02*d², 0.46, 1)` |
| Opacity | `clamp(1 - 0.24*|d| - 0.03*d², 0.22, 1)` |
| rotateY full | `clamp(d,-3,3) * -14` deg |
| z(d) | `36 - 18*|d|` |
| Snap | nearest integer when slow; overshoot ≤ **6%** P; decisive settle |
| Spring | ~**300 ms** (240–340); interrupt on new touch |
| Compact density | **Not** opened (later optional `P=68` / hero 96×112) |

Composite full: `translateX(d*P) · translateZ(z) · rotateY(ry) · scale(s)`.

Side recognizability floor: at scale 0.60, Day numeral ≥ ~22 CSS-px ink; Year digits still parse; Month ≥ one readable grid row or weekday ticks.

---

## 3. Per-grain tile lock (period identity on the leaf)

### 3.1 Year

| Field | Lock |
|---|---|
| Center | Full-red page · white four-digit year · two metal tabs |
| Sides | Full-red · `'YY` shorthand · tabs |
| Not | Micro-grid as required ship; white body + red header only; spiral |

### 3.2 Month

| Field | Lock |
|---|---|
| Center | Red `MONTH YYYY` · white grid · Sunday red · tabs |
| Sides | Neighbor month · may shorten mon · **real grid** (no empty stub) |
| Step | `shiftMonth`; clear `monthSelectedDay` as live |

### 3.3 Week (and multiday chrome)

| Field | Lock |
|---|---|
| Center | Double-height red wrap (`JUN 8–14` / year) · 7-day strip · Sunday cue |
| Sides | Neighbor week strip · short range header |
| Step | `shiftWeek` / `shiftMultiday` as live |

### 3.4 Day (non-list)

| Field | Lock |
|---|---|
| Center | Double-height red wrap (`JUNE` / year) · **large black day numeral** · tabs |
| Sides | Neighbor day numeral · short mon header |
| Binding | Hanging **tabs not rings** |
| Step | `shiftDay` ±1 |

### 3.5 Agenda

| Field | Lock |
|---|---|
| Mount | Yes — same wheel over agenda window |
| Identity | Runtime leaves for Earlier / current / Later — not a 5th PersonTab |
| Step | ±7 days on `agendaAnchor` |
| a11y | Previous=Earlier, Next=Later, center=reset/today-equivalent live labels |

### 3.6 Day List

**No wheel.** CAL-R5-11 continuous list without this drum HOLD.

Optional caption under wheel **after snap only** (e.g. `June 2025`) — not generic `Range`/`Day` nouns inside leaf body.

---

## 4. Motion AC (3D wheel) — binding

| ID | Criterion |
|---|---|
| **AC-M01** | Rest: preferred **5** tiles; center hero full size/color; sides smaller + dimmer (+ tilted full motion). |
| **AC-M02** | During horizontal drag: continuous fractional `d`; scale/opacity/(rotateY full) interpolate; **no** period commit mid-drag. |
| **AC-M03** | Axis lock: once horizontal intent > ~6 px, vertical page scroll does not steal; vertical list scroll still wins when `|dy| >= |dx|` off-stage. |
| **AC-M04** | Release with velocity: momentum (half-life ~90 ms or `v*=0.92`/16ms); stop `|v|<0.04` px/ms → snap; max **3** slots/fling. |
| **AC-M05** | Spring snap ~300 ms; overshoot ≤6% P; physical/decisive settle; new touch cancels spring and re-bases from visual `d`. |
| **AC-M06** | Tap side tile (expanded ≥56×56): spring that index to center; debounce second tap during spring (<120 ms). |
| **AC-M07** | Center tap = Today / jump current period — does **not** advance. |
| **AC-M08** | Period value + a11y announce commit **only** when snap completes (or RM instant settle). |
| **AC-M09** | Leading ~20–24 pt left edge not claimed for period swipe (CAL-40 / iOS pop). |
| **AC-M10** | `setPushedBackHandler` remains **only** `zoomUp` — period swipe ≠ hierarchical back. |
| **AC-M11** | RM: rotateY=0; flatten Z/perspective; keep scale+opacity hierarchy + snap + taps; durations → 0–120 ms. |
| **AC-M12** | RM still reads as period chooser (bigger center, dimmer sides) — not equal pills. |
| **AC-M13** | Finite edge rubber ≤0.35 slot if list finite; infinite calendar period → no hard wall. |
| **AC-M14** | Disabled/empty: tiles ≤0.35 opacity; no advance drag/tap; optional empty reason in caption. |
| **AC-M15** | Loading: keep last snapped tiles; ignore or queue input (no shimmer required). |
| **AC-M16** | Touch-only production path; desktop pointer OK as stand-in; no keyboard/arrow requirement. |
| **AC-M17** | Web + phone same contract; no fake iOS pop on web. |
| **AC-M18** | Drawer drag wins at left edge; tray hide-on-scroll is vertical list — wheel ignores vertical after lock. |

---

## 5. User stories + acceptance criteria

### US-3DW-01 — Year wheel

**As a** teacher on Year, **I want** a horizontal 3D drum of year tiles I can swipe or tap, **so that** I change years without chevron/pill chrome.

**AC**
- AC-01: Year period chevrons/pills replaced by PeriodWheel when compose succeeds.
- AC-02: Center full-red four-digit year; sides full-red `'YY`; hanging tabs.
- AC-03: Snap-complete changes `yearAnchor` ±N matching live math (N from fling/tap).
- AC-04: Center tap runs `jumpToday` year path as live.

### US-3DW-02 — Month hanging grid wheel

**As a** teacher on Month, **I want** Set B month tiles with Sunday red on a 3D drum, **so that** period identity matches the hanging-ledger family.

**AC**
- AC-05: Center prefers MONTH+year header; real grid; Sunday red.
- AC-06: Side months show real grids (no empty stub).
- AC-07: `shiftMonth` + clear `monthSelectedDay` on commit as live.
- AC-08: Center tap = today / this-month path as live.

### US-3DW-03 — Week double-height wheel

**As a** teacher on Week, **I want** week-range tiles with wrapping double-height red headers on the drum, **so that** range stays readable at center and sides.

**AC**
- AC-09: Center double-height wrap header + 7-day strip + Sunday cue.
- AC-10: Neighbors show adjacent week identity; commit uses `shiftWeek`.
- AC-11: Multiday mounts same pattern with `shiftMultiday` / `gridAnchor`.

### US-3DW-04 — Day numeral wheel

**As a** teacher on Day (non-list), **I want** large day-numeral tiles on the drum, **so that** day+month stay clear while paging.

**AC**
- AC-12: Center large black numeral; double-height wrap header; tabs not rings.
- AC-13: Sides show neighbor day numerals; still recognizable at scale ~0.60.
- AC-14: `shiftDay` ±1 on neighbor commit; center = today.

### US-3DW-05 — Agenda grain

**As a** teacher on Agenda (when toolbar exists), **I want** the same wheel over agenda windows, **so that** Earlier/Later/reset stay reachable without chevrons.

**AC**
- AC-15: Wheel mounts for agenda; ±7 day step on `agendaAnchor`.
- AC-16: a11y Previous=Earlier, Next=Later; center keeps live reset/today intent.
- AC-17: Agenda is **not** added to PersonTabs row.

### US-3DW-06 — Day List has no drum

**As a** teacher on Day List, **I want** continuous list without period drum, **so that** CAL-R5-11 holds.

**AC**
- AC-18: `dayMode === 'list'` does **not** mount PeriodWheel or chevron period toolbar.

### US-3DW-07 — 3D motion + snap

**As a** teacher dragging the period drum, **I want** grow/brighten to center and shrink/dim/tilt away with momentum spring snap, **so that** selection feels mechanical and obvious.

**AC**
- AC-19: AC-M01…AC-M08 pass on phone full-motion path.
- AC-20: Preferred five visible tiles at rest; never two-only window.
- AC-21: Mid-drag does not commit period; a11y announces on commit only.

### US-3DW-08 — RM path

**As a** teacher with reduced motion, **I want** scale+fade hierarchy and snap without tilt, **so that** I still know the selected period and can page.

**AC**
- AC-22: RM: no rotateY/Z-lift; scale+opacity retained (AC-M11/12).
- AC-23: Taps and snap still change period; durations short/cut.
- AC-24: RM must not collapse to equal-size pills.

### US-3DW-09 — Thumb hit + no tiny-tap

**As a** teacher using one thumb, **I want** the whole drum stage draggable and side tiles easy to hit, **so that** I never need precision taps on tiny side art.

**AC**
- AC-25: Drag host ≥ thumb band (sample 148 tall / full stage width).
- AC-26: Each side tile hit expands to min 56×56 screen space.
- AC-27: No hover-only glow as the only affordance.

### US-3DW-10 — Period swipe ≠ system back

**As a** teacher zoomed Day→Month→Year, **I want** iOS edge-back and CAL-40 `zoomUp` intact, **so that** period paging never steals hierarchical back.

**AC**
- AC-28: Leading-edge interactive pop still works (AC-M09).
- AC-29: `setPushedBackHandler` still only `zoomUp` (AC-M10).
- AC-30: Mid-row horizontal period drag does not pop navigation stack.

### US-3DW-11 — Light + dark

**As a** teacher in light or dark appearance, **I want** readable chrome around the drum without recolored leaf art, **so that** Set B photo pages stay consistent.

**AC**
- AC-31: Plate/caption/border follow §1.3 light and dark tokens.
- AC-32: Leaf red/white/black/Sunday hex identical in both themes.

### US-3DW-12 — Failure fallback

**As a** teacher, **if** the wheel cannot paint, **I want** the old `<<` label `>>` toolbar, **so that** I am never stuck without paging.

**AC**
- AC-33: Compose throw/empty → GhostButton chevron toolbar + center Pressable, same handlers.
- AC-34: No blank toolbar; no PersonTabs art as period tiles; no PNG-per-date atlas.

### US-3DW-13 — Hats · dual-hat · multiplicity · reverse

**As** any seat that already opens `/calendar`, **I want** the same period wheel, **so that** chrome is not teacher-only.

**AC**
- AC-35: Teach, Parent, Office/admin/superintendent, Student — any seat with Calendar period toolbar gets wheel (or fallback).
- AC-36: Dual-hat seat switch does not remove wheel or change tile laws.
- AC-37: Multi-child / multi-class filters do not invent second fetch; empty grids still show period identity.
- AC-38: Reverse: page opposite direction; cancel/undershoot drag restores prior period; leave Calendar uses existing route pop.
- AC-39: Deep link to a view shows that grain’s neighbors after mount.
- AC-40: No hat gains new Calendar privilege from this pack.

---

## 6. Hats · entry · lifecycle · multiplicity · reverse

| Lens | Lock |
|---|---|
| **Hats** | Teach, Parent, Office/admin/superintendent, Student — any seat that already opens `/calendar` with period toolbar. No new Calendar privilege. |
| **Dual-hat** | Seat switch only; wheel follows Calendar surface, not hat skin. Same tiles/laws. |
| **Entry** | Period drum under PersonTabs on `/calendar` (replaces chevron/pill toolbar). Tray G1 still enters route — tray art unchanged. |
| **Lifecycle** | Start: mount neighbors of current anchor (prefer 5). Change: drag/momentum/tap pages period; commit on snap. Finish: leave Calendar or switch view (reset window). Center Today jumps live today anchors. |
| **Multiplicity** | One current period; multiple visible neighbor identities. Multi-child/class filters unchanged; no second fetch. Twins/Hidden/sport-off defaults unchanged. |
| **Reverse / cancel** | Undershoot/cancel drag restores prior period. Opposite fling/tap returns. Hierarchical back remains zoomUp / system pop — not period swipe. |
| **Already-in-flow** | Deep-linked view + anchor shows correct grain tiles after mount. |
| **Empty / disabled** | Dim tiles; no advance; optional caption reason. Empty item data ≠ wheel paint fail. |
| **Failure honesty** | Wheel fail → chevron toolbar (AC-33/34). |
| **RM honesty** | No tilt required to understand selection; scale+fade+snap remain. |
| **Light/dark honesty** | Chrome themes; leaf art fixed Set B hex. |

---

## 7. Explicit non-goals

| Out | Why |
|---|---|
| PersonTabs Y/M/W/D Set B chip recipes | Separate dual-stamp view-icon track |
| Tray G1 Calendar glyph change | Tray HOLD |
| Hamburger Calendar restore | Tray drop HOLD |
| Vertical drum / picker | CEO horizontal only |
| Text-only Rolodex as ship | CEO icon-tile 3D wheel |
| Flat equal card strip / pink pills / PR 149 live look | Rejected |
| PNG atlas / per-date stored assets | Unbounded |
| White-ink `build-icons` for period leaves | Chrome icons ≠ dated pages |
| Reuse `calYear`… chips as drum tiles | View identity ≠ period tiles |
| New SQL / RPC / Edge / twin merge | Client anchors only |
| Fight iOS interactive pop / steal leading edge | CAL-40 |
| Day List chevron/drum restore | CAL-R5-11 HOLD |
| Agenda as PersonTabs key | Gear/R5 HOLD |
| Diary on Calendar / Journal day chrome | Diary ≠ Calendar |
| Desk = Year | HOLD |
| §32.2 app-wide PersonTabs default | Calendar opt-in only |
| Compact second density pack | Not opened unless Chuck asks |
| Keyboard/arrow primary API | Touch-only |
| Patch `docs/ui-design.md` from this card | Wait Chuck test / CoS |
| Staff Eng / qa-loop / src from this card | Docs + PM stamp only |
| Implement / unblock IQG parent `t_3af8f514` | Sticky; CoS + dual stamp + Chuck send |
| Re-open spiral Set A / competing visual | CEO loves this wheel |

---

## 8. vs live / vs prior period packs (authorized Change)

| Was | Now (CAL-3DW) |
|---|---|
| `GhostButton <<` · label · `>>` | Horizontal **3D icon drum** |
| PR 149 pink pills / jammed flat cards | Center hero + scaled/tilted neighbors |
| Text range / `Day`/`Range` captions | Year full-red · Month grid · Week strip · Day numeral |
| Button taps or shallow equal swipe | Momentum + spring snap + tap-to-center |
| 2-tile miss risk | Prefer **5** slots |
| Equal chrome weight | Depth hierarchy (scale/fade/rotateY) |
| Center Pressable Today | **HOLD** on center tile |
| Day List no chevron | **HOLD** no drum |
| CAL-40 zoomUp back | **HOLD** — period swipe separate |
| Prior CAL-PP 3-tile Rolodex lock | **Superseded as ship look** by this 3D wheel CEO send; shared grain/Set B/back/RM honesty laws carry forward where compatible |

---

## 9. Quality goals (PM)

1. **One job:** period identity + paging — not view tabs, not tray.  
2. **3D drum truth:** horizontal wheel; center hero; sides shrink/dim/(tilt full).  
3. **Motion truth:** drag 1:1; momentum; spring snap; commit on settle; tap side→center.  
4. **RM honesty:** no tilt; keep scale, fade, snap, taps; never equal pills.  
5. **Grain truth:** Set B Year full-red 'YY; Month Sunday red grid; Week/Day double-height wrap.  
6. **Thumb honesty:** full stage drag; expanded side hits.  
7. **Back honesty:** period ≠ hierarchical/iOS pop.  
8. **Theme honesty:** chrome light/dark; leaf hex fixed.  
9. **Fail closed:** wheel fail → chevron toolbar.  
10. **Hat parity:** same wheel wherever Calendar period toolbar lives.  
11. **No scope creep:** no SQL, no PersonTabs reopen, no tray, no Day List drum, no ui-design.md from this card.

---

## 10. IQG / staffing notes

| Item | State |
|---|---|
| PM DESIGN STAMP | **APPROVED** 2026-09-20 · `t_9cb5585d` · this file |
| QAS DESIGN STAMP | **APPROVED** 2026-09-20 · `t_c28b495d` · `notes/company/calendar-3d-wheel-intent.md` |
| Dual stamp | **MET** — Eng still dark until Chuck send on `t_3af8f514` |
| Eng | **Forbidden** until dual stamp + Chuck send on `t_3af8f514` |
| IQG parent | `t_3af8f514` sticky — do not implement/unblock from this card |
| Designer SoT | `calendar-3d-wheel-spec.md` · mockups `calendar-3d-wheel-mockups/index.html` · `t_f2203851` |
| ui-design.md | **Do not edit** — Chuck tests after merge |
| DITL IMPACT | QAS **UPDATE_PLANS** on intent §10; do not staff ditl-scribe from stamp cards; CoS extends Calendar sticky |

**PM residual intent risks for QAS (must cover or REJECT):**
- Dual-hat + every Calendar seat sees wheel (not Teach-only).  
- Lifecycle: drag, fling, tap-side, Today center, cancel-drag, view-switch reset, leave route.  
- Multiplicity: multi-visible neighbors; filters/empty data still show period identity.  
- Reverse: opposite page; drag cancel; CAL-40 back untouched.  
- RM + a11y non-gesture; no equal-pill collapse.  
- Light/dark chrome vs fixed leaf art.  
- Empty/disabled/loading honesty.  
- Agenda toolbar grain + Day List absence.  
- Wheel-fail fallback honesty.  
- Leading-edge pop not stolen; thumb hit floor.  
- Explicit non-goals so missing PersonTabs/tray/PNG/ui-design work is not a defect.  
- Relation to prior CAL-PP: this CEO 3D wheel is the ship form.

---

## 11. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | Docs-only CAL-3DW PM lock + PM IQG stamp |
| RESULT | BINDING; dual MET (PM `t_9cb5585d` + QAS `t_c28b495d`); Eng dark; parent `t_3af8f514` sticky; DITL UPDATE_PLANS; no ui-design.md edit; no src |
| WORK PERFORMED | Laws CAL-3DW-01…18; geometry; grains Y/M/W/D/multiday/agenda + Day List out; motion AC-M01…18; stories US-3DW-01…13; AC-01…40; hats/lifecycle; non-goals; QAS intent + stamp closed residual risks |
| VERIFICATION | File `notes/company/calendar-3d-wheel-pm-lock.md`; PM + QAS APPROVED; intent exists; no `src/`; no `docs/ui-design.md` touch |
| OPEN ISSUES | Chuck device validate/send on `t_3af8f514`; then Eng; CoS extend Calendar DITL sticky |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | CoS holds Eng until Chuck send on `t_3af8f514`; extend Calendar DITL sticky with CAL-3DW; do **not** unblock parent from stamp cards; do **not** patch ui-design.md |

---

**End of PM lock.** Eng implements only after **PM + QAS** APPROVED and Chuck send on `t_3af8f514`.
