# CAL-3DW — Calendar 3D horizontal wheel IQG real-world intent

**Date:** 2026-09-20  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_c28b495d` · IQG parent (sticky — do not unblock/implement): `t_3af8f514`  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` · DITL: `notes/company/DITL_OS.md`  
**Feature:** KELYRA Calendar 3D horizontal wheel period picker (Set B icon tiles; Year/Month/Week/Day)  
**Status:** Design-stage IQG intent. Docs only. **No** `src/` / SQL / Edge / qa-loop / Eng from this card.

**CEO lock (2026-09-20):** horizontal 3D wheel of Set B icon tiles — period drum.  
**PM lock (APPROVED):** `calendar-3d-wheel-pm-lock.md` (`t_9cb5585d`) — CAL-3DW-01…18 · US-3DW-01…13 · AC-01…40 · AC-M01…18.  
**Designer SoT:** `calendar-3d-wheel-spec.md` + `calendar-3d-wheel-mockups/index.html` (`t_f2203851`).  
**Icon family:** Set B hanging-ledger (view-icon dual-stamp track separate).  
**Supersedes (look):** `<<` label `>>` · PR 149 pink pills / equal flat cards · text-only Rolodex as ship (CAL-PP).  
**HOLD:** tray G1 · PersonTabs view-kind · CAL-40 ≠ period swipe · Day List no drum (CAL-R5-11) · `docs/ui-design.md` wait.

**Role:** Phase 1 real-world intent + QAS DESIGN STAMP. Eng dark until dual stamp + Chuck device send on parent.

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

**Dual stamp: MET** with PM when pm-lock QAS line matches this block. Eng still dark until Chuck **send** on `t_3af8f514`.

**QA Supervisor stamp meaning:** Real-world intent for CAL-3DW 3D period wheel is fully specified (not happy-path only): hats + dual-hat, chrome entry under PersonTabs, lifecycle + reverse (drag/fling/tap-side/Today/cancel-drag/view-switch reset/leave route), multiplicity (prefer 5 visible; filters/empty data still show period identity), motion honesty (3D scale+fade+rotateY + RM scale/fade/snap never equal pills), empty/disabled/loading/fail honesty (wheel-fail → chevron toolbar), leading-edge pop not stolen, thumb hit floor, Agenda grain + Day List absence, light/dark chrome vs fixed leaf art, relation to prior CAL-PP (this CEO 3D wheel is ship form), and explicit non-goals. Companion to PM CAL-3DW-01…18 / AC-01…40 / AC-M01…18. Does **not** invent chrome. Does **not** staff Eng. Does **not** unblock parent. Does **not** declare product-complete. Phase 4 prove-out OBJECTIVE is a later card after implement. Loop `passed` alone is not stamp-met.

---

## 0. One-line law (binding)

| Dimension | Lock | Not |
|---|---|---|
| **Row job** | Period identity + paging drum | PersonTabs; tray G1 |
| **Form** | Horizontal 3D wheel of Set B hanging-ledger icon tiles | Vertical; text Rolodex ship; flat equal cards; pink pills |
| **Window** | Prefer 5 slots (center ±2); peek ±3 OK | 2-tile only; infinite strip UX |
| **Hierarchy** | Center hero grow/brighten; sides shrink/dim/rotateY | Equal-weight tiles |
| **Motion** | 1:1 drag; momentum; spring snap; tap side→center; commit on snap | Chevron-only primary; mid-drag commit |
| **RM** | No tilt/Z-lift; keep scale, fade, integer snap, taps | RM disables paging; RM equal pills |
| **Center** | Current period; tap = Today (`jumpToday`) | Center advances period |
| **Themes** | Light + dark chrome plate | Recolor leaf Set B hex by theme |
| **Back** | Period swipe ≠ CAL-40 / iOS pop | Steal leading edge |
| **Fail** | `<<` label `>>` fallback | Blank; PersonTabs art as tiles |
| **Data** | Live anchors/shifters | New SQL/RPC |

**Surfaces:** year/month/week/multiday/day(!list)/agenda = YES. day list = NO (CAL-R5-11).

**Wire:** `PeriodWheel` · `PeriodTile` · anchors/shifters/jumpToday as live · PersonTabs HOLD · tray G1 HOLD · CAL-40 HOLD.

**Restamp triggers (post-stamp drift → REJECT until closed):**

1. Text-only Rolodex or PR 149 equal flat / pink pills ship as primary look (CEO 3D wheel miss).  
2. Two-tile-only window or infinite strip as ship UX.  
3. Equal-size pills as rest hierarchy (no scale/fade center hero).  
4. RM collapses to equal pills or loses tappable page/Today.  
5. Period swipe steals leading-edge iOS pop or maps to `zoomUp`.  
6. Wheel fail blanks toolbar or ships PersonTabs/Set B chips as period tiles.  
7. Day List mounts drum (CAL-R5-11 break).  
8. New SQL/RPC for neighbors.  
9. Dual-hat or any Calendar seat gets different wheel / Teach-only.  
10. Leaf Set B hex recolored by theme (chrome plate only may theme).  
11. PNG atlas / white-ink `build-icons` for dated period leaves.  
12. Eng ships without dual stamp + Chuck send on `t_3af8f514`.  
13. Patch `docs/ui-design.md` from stamp cards before Chuck device send.  
14. Compact second density pack shipped without Chuck ask.

---

## 1. Hats + dual-hat

### 1.1 Who sees the period wheel

| Hat | Wheel applies? | Notes |
|---|---|---|
| **Teacher (Teach seat)** | **Yes — primary** | Full grain matrix on `/calendar` where chevron/pill period toolbar lives today |
| **Student** | **Yes** | Same wheel; no new privilege; no Hidden leak via period tiles |
| **Parent** | **Yes** | Same wheel; CH-A focus laws HOLD (wheel does not change data scope) |
| **Office / superintendent** | **Yes** | School-visible Calendar seats get same tiles/laws |
| **Substitute / co-teacher** | **Yes on own seat** | RLS-scoped; same chrome |
| **Signed-out** | **No** | Auth wall only — no Calendar chrome invent |

No hat gains new Calendar privilege from this pack (AC-40). Wheel is chrome replacement for existing period toolbar, not ACL.

### 1.2 Dual-hat (binding)

| Intent | Specified? |
|---|---|
| Teacher+parent, office+parent, office+teacher, etc. — wheel follows **Calendar surface**, not hat skin | Yes — AC-36 |
| Seat switch does **not** remove wheel or change tile laws (Year full-red, Month Sunday red, 5-slot hierarchy, etc.) | Yes |
| Seat switch rebuilds data scope per prior law; wheel still mounts wherever period toolbar would | Yes |
| Never invent dual-hat-only alternate drum, Teach-only leaves, or merged Diary+Calendar period row | Yes — no invent |
| Tray G1 remains tray entry art for every hat; not hat-skinned into period tiles | Yes |

**P1 if miss after Eng:** any seat that already opens `/calendar` with a period toolbar lacks wheel (or fallback) or sees Teach-only art laws.

---

## 2. Chrome entry

| Affordance | Where | Period wheel job |
|---|---|---|
| **Period drum** | `/calendar` under PersonTabs | Replaces live `<<` / today-label / `>>` (and PR 149 period pills) with PeriodWheel when compose succeeds |
| **PersonTabs Y/M/W/D** | CR-CalTabs row above | **HOLD** — view identity only; not period tiles; Set B chips separate stamp |
| **Tray Calendar** | System tray key `calendar` | **G1 KEEP** — enters `/calendar`; art **unchanged** |
| **Deep link / last view** | `/calendar` + view + anchor | Matching grain’s neighbors after mount (AC-39) |
| **Hamburger Calendar** | — | **No restore** |
| **Diary** | Separate product | Not this pack; Diary ≠ Calendar HOLD |

**Not entry / not this slice:** tray glyph change; Desk = Year; invent View-stroke; gear/R5 reopen; Agenda as PersonTabs key; §32.2 app-wide flip; compact density pack.

**Entry acceptance:** Every hat that already reaches Calendar still reaches it via tray/route. Period identity is visible as 3D wheel neighbors (or honest chevron fallback) without hunting. PersonTabs still select grain; wheel pages **within** grain.

### 2.1 Mount matrix (entry by grain)

| `activeView` | Wheel? | Anchor | Step |
|---|---|---|---|
| `year` | Yes | `yearAnchor` | ±1 year |
| `month` | Yes | `monthAnchor` | `shiftMonth` |
| `week` | Yes | `gridAnchor` | `shiftWeek` |
| `multiday` | Yes | `gridAnchor` | `shiftMultiday` |
| `day` + not list | Yes | `dayAnchor` | `shiftDay` |
| `agenda` | Yes | `agendaAnchor` | ±7 days |
| `day` + list | **No** | — | CAL-R5-11 continuous list |

---

## 3. Full lifecycle (happy path alone = IQG reject)

| Phase | Behavior |
|---|---|
| **Enter Calendar** | Tray G1 / drawer heritage / deep link → `/calendar`; period drum mounts neighbors of current grain anchor (prefer 5; or Day List: no drum) |
| **Orient** | Rest 3D: center hero full size/color/bright; sides smaller + dimmer (+ rotateY full motion); Set B leaf identity readable |
| **Read Year** | Full-red leaves; center four-digit year; sides `'YY`; metal hanging tabs |
| **Read Month** | Hanging ledger + real grid + Sunday red; center prefers MONTH + year header; sides real grids (no empty stub) |
| **Read Week / Multiday** | Double-height red wrap header; 7-day strip + Sunday cue; neighbors adjacent week identity |
| **Read Day (non-list)** | Double-height wrap header; large black day numeral; hanging tabs not rings; sides neighbor numerals still readable ~scale 0.60 |
| **Read Agenda** | Same wheel over agenda windows; Earlier/Later/reset a11y nouns; ±7 day step; not a PersonTab |
| **Page period (drag)** | 1:1 horizontal drag on full stage; continuous fractional `d`; scale/opacity/(rotateY full) interpolate; **no** period commit mid-drag |
| **Page period (fling)** | Momentum on release; spring snap to integer; max **3** slots/fling; commit on snap complete only |
| **Tap side → center** | Spring that tile to center (min **56×56** hit even when visually small); debounce second tap during spring |
| **Jump Today** | Tap **center** tile → `jumpToday` (+ live clear rules); center does **not** advance |
| **Switch view** | PersonTabs change grain → **reset** wheel window to new grain neighbors (CAL-3DW-15) |
| **Cancel drag** | Undershoot / spring back → **no** anchor change; prior period remains |
| **Leave Calendar** | Existing route pop / tray exit; no special period teardown beyond unmount |
| **Re-enter** | Last view + anchors OK; neighbors of that grain after mount |
| **Seat / child change** | Scope rebuild HOLD; wheel remains same chrome laws |

**Must:** Paging preserves hat scope, filters, focused child (prior law). Wheel never grants Hidden or cross-seat data. Vertical scroll on Month/Week grids wins when `|dy| >= |dx|` off-stage (AC-M03). Axis lock once horizontal intent > ~6 px.

**Grain leaf locks (must match PM §3):**

| Grain | Leaf lock |
|---|---|
| Year | Entire leaf `#C62828`; center full year white; sides `'YY`; tabs |
| Month | Hanging tabs; Sunday `#E53935`; real grid body both center and sides |
| Week/Multiday | Double-height red header wrap; strip identity; Sunday cue |
| Day non-list | Double-height wrap header; large black numeral; tabs not rings |
| Agenda | Runtime window identity; Earlier/Later a11y; ±7 |
| Day list | **No mount** |

Optional caption under wheel **after snap only** (e.g. `June 2025`) — not generic `Range`/`Day` nouns inside leaf body.

---

## 4. Multiplicity

| Case | Intent law |
|---|---|
| **Prefer five visible identities** | center ±2 at rest; peek ±3 OK — never two-tile-only window (CAL-3DW-05 / AC-20) |
| **One current period at a time** | Snap commits one integer slot; no multi-select periods |
| **Multi-child / multi-class filters** | Unchanged; no second fetch; empty item grids still show **period identity** tiles (AC-37) |
| **Twins / Hidden / sport-off** | Defaults unchanged; wheel does not invent twin merge or staff path |
| **Phone + web** | Same wheel contract both surfaces (AC-M17); no fake iOS pop on web |
| **Agenda vs PersonTabs** | Agenda is toolbar grain only — not a fifth tab (AC-17) |
| **Day List vs Day grid** | List mode removes drum entirely; non-list Day keeps it |
| **Set B chips vs period tiles** | Two jobs: view identity chips ≠ dated period tiles — never reuse chip PNGs as drum tiles |
| **CAL-PP relation** | Prior 3-tile text Rolodex lock **superseded as ship look** by this CEO 3D wheel; shared grain/Set B/back/RM honesty laws carry where compatible |

### 4.1 Multiplicity pass/fail (testable)

| Check | PASS | FAIL |
|---|---|---|
| Window | Prefer 5 tiles at rest after settle | 2-tile only; infinite strip UX |
| Empty data | Tiles still show year/month/week/day identity | Blank row because no events |
| Filters | Period chrome unchanged by child/class count | Second fetch / hat-only strip |
| View switch | New grain neighbors only | Year strip lingering under Month |
| Day List | No drum row | Chevrons/drum restored on list |
| Hierarchy | Center larger/brighter than sides | Equal pills at rest |

---

## 5. Reverse / cancel / already-in-flow

| Action | Reverse |
|---|---|
| Page next period (fling/tap) | Opposite fling/tap restores prior period neighbors |
| Page prev period | Opposite returns |
| Drag past focus band + snap | Commit + neighbors recycle to new center |
| Cancel / undershoot drag | Spring back; **no** anchor change (AC-38) |
| Center Today jump | Returns to live today anchors for grain (same as chevron center) |
| PersonTabs view switch | Reset window; prior grain strip discarded |
| Hierarchical back (Day→Month→Year zoom) | **Still** `zoomUp` only via `setPushedBackHandler` — period swipe must **not** map to it (AC-M10 / AC-29) |
| iOS leading-edge interactive pop | Leading ~20–24 pt left to system (AC-M09 / AC-28) |
| Leave Calendar route | Existing platform/tray pop |
| Deep-linked view + anchor | Correct grain neighbors already showing after mount (AC-39) |
| Cancel Eng mid-flight | Product remains live chevron/pill toolbar until dual-stamped 3D wheel ships; no half-PNG hybrid |

**Already-in-flow:** User mid-Calendar with filters/search/gear open keeps those sheets; wheel does not dismiss or block them. Vertical grid scroll wins over horizontal page when `|dy| >= |dx|` off-stage. Mid-row horizontal period drag does **not** pop navigation stack (AC-30). Drawer drag wins at left edge; tray hide-on-scroll is vertical list — wheel ignores vertical after axis lock (AC-M18).

---

## 6. Motion honesty (3D wheel) + RM / a11y + light/dark

### 6.1 Full motion (must — AC-M01…AC-M08 / AC-19…21)

| ID | Intent |
|---|---|
| Rest | Prefer 5 tiles; center hero full size/color; sides smaller + dimmer + rotateY |
| During drag | Continuous fractional `d`; scale/opacity/rotateY interpolate; **no** period commit mid-drag |
| Axis lock | Horizontal intent > ~6 px → vertical page scroll does not steal; vertical list still wins when `|dy| >= |dx|` off-stage |
| Momentum | Release with velocity; half-life ~90 ms or `v*=0.92`/16ms; stop `|v|<0.04` → snap; max **3** slots/fling |
| Spring snap | ~300 ms (240–340); overshoot ≤6% P; new touch cancels spring and re-bases from visual `d` |
| Tap side | Expanded ≥56×56 hit; spring that index to center; debounce <120 ms during spring |
| Center tap | Today / jump current period — does **not** advance |
| Commit + a11y | Period value + announce **only** when snap completes (or RM instant settle) |
| Leading edge | ~20–24 pt not claimed for period swipe |
| Back handler | `setPushedBackHandler` remains only `zoomUp` |
| Finite edge | Rubber ≤0.35 slot if list finite; infinite calendar period → no hard wall |
| Thumb stage | Full wheel host draggable (sample 390×148); no hover-only sole affordance |
| Web | Same contract; no fake iOS pop |
| Touch path | Touch-only production; desktop pointer OK stand-in; no keyboard/arrow requirement |

Geometry sample (phone 390 — designer SoT binding): stage 390×148; perspective 920px; slot pitch P=78; focus band ±59; hero 108×126 scale 1.0 opacity 1.0 rotateY 0 Z+36; scale/opacity/rotateY/z formulas per PM §2.

**Motion honesty law:** If ship is equal chevrons/pills with no center hero scale+fade (and full-path rotateY), that is **not** CEO 3D wheel — stamp miss vs AC-M01 / AC-19.

### 6.2 RM + non-gesture path (must — AC-M11/12 / AC-22…24)

| Intent | Specified? |
|---|---|
| RM: rotateY=0; flatten Z/perspective | Yes |
| Keep scale + opacity hierarchy + integer snap + tap-to-center + thumb hit | Yes |
| Snap ≤120 ms or hard cut; durations → 0–120 ms | Yes |
| RM still reads as period chooser (bigger center, dimmer sides) — **never** equal pills | Yes |
| Taps still change period (side→center / Today) | Yes |
| a11y announce **period**, not “image”; labels Previous/Next/Today (Agenda: Earlier/Later/Reset) | Yes |
| Swipe is **additive** — never the only path | Yes |

**P1 if miss after Eng:** RM user cannot page without tilt fling; RM equal pills; or VO only hears “image.”

### 6.3 Light + dark honesty (must — AC-31/32 / CAL-3DW-10)

| Intent | Specified? |
|---|---|
| Chrome plate / caption / border / app bg follow PM §1.3 light and dark tokens | Yes |
| Leaf Set B hex (red/white/black/Sunday/grid/tab metal) **identical** both themes | Yes |
| Never recolor leaf art as the dark-mode solution | Yes |
| Focus band may tint slightly per theme token; leaf ink stays fixed | Yes |

**P1/P2 after Eng:** unreadable chrome in dark = P1; leaf recolor drift = P1 vs CAL-3DW-10; plate token nit with readable chrome = P2/P3.

---

## 7. Empty / disabled / loading / failure honesty

| State | Intent |
|---|---|
| **Wheel compose throw / empty paint** | Fall back to live `<<` / label / `>>` GhostButtons + center Pressable, **same handlers** (AC-33) |
| **No blank toolbar** | Never leave empty hit-less chrome (AC-34) |
| **No PersonTabs art as tiles** | Set B chips are not period leaves |
| **No PNG-per-date atlas / `npm run icons` path** for period leaves | Runtime Set B hanging-ledger compose only |
| **Empty Calendar item data** | ≠ wheel fail — period identity tiles still show |
| **Disabled / empty wheel state** | Tiles ≤0.35 opacity; no advance drag/tap; optional empty reason in caption (AC-M14) |
| **Loading** | Keep last snapped tiles; ignore or queue input (no shimmer required) (AC-M15) |
| **Offline** | Anchors are client date math; paging still works; item load follows existing offline laws |
| **Wrong grain mount** | Day List must not show drum; Agenda must not appear as PersonTab |
| **Gesture theft** | Leading-edge pop broken = stamp miss (back honesty) |
| **Partial grain ship** | Year-only leaves without Month/Week/Day/Agenda matrix = incomplete vs stamp |
| **Tiny-tap only** | Side hits <56×56 or stage not full-thumb = stamp miss vs AC-25/26 |

**P1/P2 guidance after Eng:** blank toolbar or no fallback = P1; Teach-only wheel = P1; Day List drum restore = P1 vs CAL-R5-11; missing 3D rest hierarchy = P1 vs motion stamp; RM equal pills = P1; side hit floor miss = P1; leaf dark recolor = P1; caption mid-drag only nit if rest/center-after-snap still holds = judge P2/P3.

---

## 8. Explicit non-goals

| Out | Why |
|---|---|
| PersonTabs Y/M/W/D Set B chip recipes | Separate dual-stamp view-icon track |
| Tray G1 Calendar glyph change | Tray HOLD |
| Hamburger Calendar restore | Tray drop HOLD |
| Vertical drum / picker | CEO horizontal only |
| Text-only Rolodex as ship | CEO icon-tile 3D wheel supersedes CAL-PP look |
| Flat equal card strip / pink pills / PR 149 live look | Rejected |
| PNG atlas / per-date stored assets | Unbounded |
| White-ink `build-icons` / `iconAssets` for period leaves | Chrome icons ≠ dated pages |
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
| Staff Eng / qa-loop / src from this card | Docs + QAS stamp only |
| Unblock / implement IQG parent `t_3af8f514` | Sticky; Chuck device send later |
| Prove-out execution | Phase 4 later after Eng terminal |
| Full DITL case rewrite on this card | IMPACT only |
| Re-open spiral Set A / competing visual | CEO loves this wheel |

Missing spiral Day romance or Set B chip polish is **not** a defect under CAL-3DW. Missing text Rolodex ship is **not** a defect — CEO 3D wheel is the ship form.

---

## 9. Must-include vs gaps

### 9.1 Must-include (stamp complete only if all true)

1. Hats + dual-hat parity for every seat that already opens `/calendar` with period toolbar.  
2. Chrome entry: period drum under PersonTabs replaces chevrons/pills; tray G1 separate; mount matrix including Agenda yes / Day List no.  
3. Full lifecycle: enter → orient 5-slot 3D → drag/fling/tap-side/Today → cancel-drag → view-switch reset → leave/re-enter.  
4. Multiplicity: prefer 5 visible; empty data still shows period identity; no second fetch; Set B chips ≠ period tiles; CAL-PP look superseded.  
5. Reverse: opposite page; drag cancel; CAL-40 `zoomUp` + leading-edge pop untouched.  
6. Motion honesty: 3D rest + drag scale/fade/rotateY; momentum+spring; commit on snap; RM scale/fade/snap never equal pills; taps always work.  
7. Light/dark: chrome themes; leaf Set B hex fixed.  
8. Failure honesty: wheel fail → chevron toolbar; disabled/loading honesty; thumb hit floor; no icons pipeline.  
9. Explicit non-goals including PNG atlas, PersonTabs/tray, Day List drum, ui-design.md wait, Eng dark.  
10. Alignment with PM CAL-3DW-01…18, AC-01…40, AC-M01…18 without thinning CEO 3D wheel.

### 9.2 Intent gaps remaining

**none** — PM residual risks closed:

| PM residual risk | Closed in |
|---|---|
| Dual-hat + every Calendar seat sees wheel | §1 |
| Lifecycle: drag, fling, tap-side, Today, cancel-drag, view-switch reset, leave | §3 §5 |
| Multiplicity: multi-visible neighbors; filters/empty still show identity | §4 |
| Reverse: opposite page; drag cancel; CAL-40 untouched | §5 |
| RM + a11y non-gesture; no equal-pill collapse | §6.2 |
| Light/dark chrome vs fixed leaf art | §6.3 |
| Empty/disabled/loading honesty | §7 |
| Agenda toolbar grain + Day List absence | §2.1 §3 |
| Wheel-fail fallback honesty | §7 |
| Leading-edge pop not stolen; thumb hit floor | §5 §6.1 §7 |
| Explicit non-goals | §8 |
| Relation to prior CAL-PP: this CEO 3D wheel is ship form | §0 §4 §8 |

No designer re-staff needed. No competing chrome invent. Designer SoT + PM lock + mockups sufficient.

### 9.3 PM alignment

| PM | QAS |
|---|---|
| CAL-3DW-01…18 | §0 law + restamp triggers |
| US-3DW-01…13 / AC-01…40 | §§1–8 must-include |
| AC-M01…18 | §6 motion honesty |
| Residual dual-hat / lifecycle / fail / back / RM / theme | §§1,3,5,6,7 |

---

## 10. DITL IMPACT

```
DITL IMPACT
Change: Calendar period toolbar << / label / >> (and PR 149 pills / CAL-PP text Rolodex look) becomes horizontal 3D PeriodWheel of Set B icon tiles (prefer 5 slots; scale+fade+rotateY; RM scale+fade+snap; momentum+spring; tap side→center; center=Today; light/dark chrome; wheel-fail→chevrons); Day List still no row; PersonTabs/tray HOLD
Verdict: UPDATE_PLANS
Plans touched: DITL-T-* / DITL-P-* / DITL-O-* / DITL-S-* / DITL-DH-* Calendar chrome beats that still describe plain text chevrons only, omit 3D drum hierarchy/motion, omit RM non-tilt hierarchy, omit wheel-fail fallback, omit Agenda Earlier/Later wheel grain, imply Day List still has period chevrons, or still treat CAL-PP 3-tile text Rolodex as ship look (extend existing Calendar DITL sticky — do not NEW_DITL)
Cases touched: none this card (cases after plans when Chuck unblocks DITL-UPDATE)
New DITL needed: no
Seed/artifacts: none | optional later F-ARTIFACTS screenshots of 5-slot 3D rest vs RM hierarchy vs chevron fallback vs Day List absence — not this stamp card
Notes: Prefer existing sticky t_0a62f427 (Calendar NEW+UPDATE_PLANS lineage). Extend with CAL-3DW 3D wheel delta (supersedes CAL-PP look notes) — do not file a second Calendar DITL parent. Do not rewrite DITL files on this card. Specialists do not staff. CoS owns tracker comment/extend. Chrome/motion on existing Calendar surface; no new role/day. QE prove-out separate after Eng. Parent t_3af8f514 stays sticky.
```

**Mapping note:** Enum NONE | UPDATE_PLANS | UPDATE_CASES | NEW_DITL. CAL-3DW is chrome+motion on existing Calendar surface already tracked → **UPDATE_PLANS** (not NEW_DITL). CoS files/extends sticky tracker only when IMPACT ≠ NONE — specialists do not staff.

---

## 11. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | Docs-only CAL-3DW IQG intent + QAS DESIGN STAMP + DITL IMPACT |
| CONTEXT | CEO 3D wheel 2026-09-20; PM APPROVED `t_9cb5585d`; parent `t_3af8f514` sticky |
| RESULT | `notes/company/calendar-3d-wheel-intent.md` APPROVED; pm-lock QAS line filled; dual MET; DITL UPDATE_PLANS |
| WORK PERFORMED | Hats/entry/lifecycle/multiplicity/reverse/motion/RM/light-dark/failure/non-goals; residual risks closed; stamp APPROVED |
| VERIFICATION | intent exists; DESIGN STAMP QAS APPROVED; gaps none; DITL IMPACT named; no `src/`; no `docs/ui-design.md` touch |
| OPEN ISSUES | Eng dark until Chuck device send on parent; prove-out later |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | Hermes CoS holds Eng until dual stamp + Chuck send; extend Calendar DITL sticky with CAL-3DW note; do not unblock `t_3af8f514` from this card |

### Acceptance checklist

- [x] `calendar-3d-wheel-intent.md` exists  
- [x] QAS DESIGN STAMP APPROVED on intent  
- [x] QAS line filled on `calendar-3d-wheel-pm-lock.md`  
- [x] DITL IMPACT **UPDATE_PLANS** named  
- [x] No `src/` / no Eng staff / parent not unblocked / no `docs/ui-design.md` edit  

---

*End intent — QA Supervisor DESIGN STAMP APPROVED 2026-09-20 (`t_c28b495d`). Dual MET with PM `t_9cb5585d`. DITL IMPACT UPDATE_PLANS. No app code.*
