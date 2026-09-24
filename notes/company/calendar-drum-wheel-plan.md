# Calendar Drum / Wheel Picker — Plan (CAL-DRUM-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** P1 shipped  
**Revision:** R1  
**Research:** `notes/company/calendar-drum-wheel-research.md`  
**Digest:** `notes/research/2026-09-24-calendar-drum-wheel-report.md`  
**Prototype:** `notes/research/calendar-drum-wheel-prototype.html`  
**Cards:** `t_78363b5e`  
**Stack:** Expo + RN (ios/android) + RN Web. No app/SQL from this card.

**Product law:** Period drum must feel mechanical (1:1 drag → inertial coast → spring snap) without glitchy center-text cheese. **Network = 0** for picker. Look may change — prior Set B dual-stamp needs **CEO override / restamp** if we depart hanging-ledger idle art.

**Stamp note:** Dual stamp MET on Set B (`calendar-3d-wheel-pm-lock.md` + `calendar-3d-wheel-intent.md`). CEO 2026-09-24 invites redesign for perf/feel. Eng must not silently ship non-Set-B chrome without restamp.

---

## 0. Decision lock (recommended)

| Decision | Lock |
|---|---|
| Architecture | **(A) Fixed-geometry recycled tiles + GPU transforms only during fling** |
| Recycle pool | **7–9** stable slot hosts (default keep 9 for parity; prefer **7** = center ±3 after Chuck OK) |
| Mid-spin layout | **Forbidden** — no MonthHangingGrid, no header line-count change, no fontSize swap, no BlurView |
| Focus | Scale / opacity / pre-drawn focus chrome — **never** text reflow |
| Detail overlay | Month grid / week strip **idle-only** after `onSpringRest`; dismantle on pan grant |
| Segment atlas stitch | **P1 optional** for binder rings+gradient — not P0 blocker |
| Web drag | SharedValue / rAF transforms — **kill** per-frame `setWebDragPx` React state |
| Network | **0** |
| Rejected sole fixes | Springs-only; live grids on all slots; FlashList as primary; Skia-first |
| Implementation | Future Eng card(s); this card = research + plan + HTML prototype only |

---

## CEO locks (2026-09-24) — Eng authorized

| Lock | Decision |
|---|---|
| Idle look | **Fixed plate** (F1) — red header + single body line/numeral/range |
| Drum grid | **None on picker** — month/week grids stay in Calendar **body** only |
| Segment binder / atlas | **Dropped** for this path |
| Pan driver | **RNGH 2** `Gesture.Pan` (P1) |
| N=9 → N=7 | **N=7 locked** — `WHEEL_SLOT_OFFSETS = [-3..+3]`, clear radius 3, freeze ≤3 |
| Implement | **Shipped** (CAL-DRUM P1) |

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| App code / SQL on this card | Research epic |
| Hermes AI staffing / worker dispatch | CoS research only |
| Force-push | Safety |
| Silent Set B abandonment without restamp | Dual-stamp law |
| PNG `build-icons` white-ink dated leaves as P0 | Prior CAL-3DW-16 HOLD; if atlas ships, restamp intentionally |
| PersonTabs / tray / CAL-40 changes | Out of scope |
| Day List continuous drum restore | CAL-R5-11 HOLD (unless separate CEO ask) |
| Networked tile CDN | Violates zero-network budget |

---

## 2. Needed vs Desired

### Needed (P0) — anti-cheese + 60fps path

| ID | Capability | Rationale |
|---|---|---|
| N1 | **Stable slot keys** by index (`slot-0`…); rewrite labels on integer cross | Stop remount thrash |
| N2 | **Fixed 108×126** tile tree for all roles during motion | Kill layout cheese |
| N3 | **Disable `showCenterExtras` mid-spin permanently** — extras only post-rest overlay | CEO pain |
| N4 | **No BlurView / CSS blur during fling** — dim via opacity | Fill-rate |
| N5 | **Web:** Reanimated shared value **or** rAF CSS transforms (no React state per move) | Web jank |
| N6 | **Web inertial spring** parity (today jumps via microtask) | Feel |
| N7 | Keep commit-on-snap, absorb-interrupt, CAL-P6-1A full-band start claim | Prior laws |
| N8 | Perf check: Release build fling ≥55fps on mid device; 0 network | Budget |
| N9 | RM: no rotateY; keep scale/opacity/snap | Accessibility |
| N10 | Document restamp need if idle look leaves Set B | Stamp honesty |

### Desired (P1–P2)

| ID | Capability | Phase |
|---|---|---|
| D1 | Segment atlas: binder rings + gradient bg shared; header/body/footer strips | P1 |
| D2 | Reduce visible slots 9 → 7 (center ±3) if Chuck prefers cleaner stage | P1 |
| D3 | Migrate PanResponder → RNGH 2 `Gesture.Pan` | P1 |
| D4 | Idle DetailOverlay: MonthHangingGrid only on snapped center | P1 |
| D5 | Skia Atlas wheel if View path misses budget on low-end Android | P2 |
| D6 | Pre-rasterize chrome once per theme; Text overlays for dates | P2 |
| D7 | CSS scroll-snap web-only experiment (A/B) | P2 |

---

## 3. Phased delivery

### P0 — Fix cheese without mandatory restamp (F3 path)

1. Eng: refactor `PeriodPager` / `PeriodLeaf`  
   - Slot React `key={slotIndex}` stable.  
   - `PeriodLeaf` gains `motionCompact` prop: single-line / fixed header height always while `flinging \|\| !showCenterExtras`.  
   - Gate `MonthHangingGrid` / tall headers strictly behind idle center.  
   - Replace silhouette BlurOut with opacity-dimmed clone of fixed tile.  
2. Web: drive `dragShared` (Reanimated web) or rAF; remove `setWebDragPx` hot path; implement spring settle on web.  
3. QE: device fling Year/Month/Week/Day — no center pop mid-drag; FPS HUD or Instruments.  
4. Docs: note ContentPolicy change vs prior silhouette blur.

**Exit:** CEO no longer sees mid-spin text expand; web no longer jumps without coast.

**P0 shipped (t_033325c3):** ContentPolicy silhouette is **opacity-dim** (no BlurView/CSS blur).
React SlotPool hosts use **stable `slot-${index}` keys** (`stableSlotHostKey`) — period labels
rewrite in place mid-fling. `motionCompact` freezes leaf geometry during fling. Web drag/snap
uses the same Reanimated `dragShared` + `withSpring` path as native (no per-frame `setWebDragPx`).


### P1 — Redesign-friendly art (optional F1/F2)

1. Chuck picks idle look: keep Set B chrome **or** fixed plate **or** segment binder.  
2. If non-Set-B: PM+QAS **restamp** before Eng.  
3. Segment stitch pipeline (local assets only).  
4. RNGH 2 + optional N=7.

### P2 — Escalation

1. Skia Atlas only if P0/P1 metrics fail on target devices.  
2. Glyph atlas for year numerals if Text measure still shows up in profiles.

---

## 4. File / hotspot map (future Eng)

| File | Change |
|---|---|
| `src/components/calendar/PeriodPager.tsx` | Stable keys; web driver; extras gate |
| `src/components/calendar/PeriodLeaf.tsx` | Fixed geometry modes; kill blur fling |
| `src/lib/calendar/periodWheel.ts` | Possibly `WHEEL_VISIBLE_SLOTS=7`; ContentPolicy tweak |
| `src/lib/calendar/periodPager.ts` | Keep shifters; maybe expose compact captions |
| Tests under `src/**/calendar*` | Window + snap unit tests stay; add “no remount on visualShift” assertion if feasible |

---

## 5. Acceptance (future Eng card)

- [ ] Fling Year/Month/Week/Day: no center text height/line-count change until spring rest  
- [ ] Slot React trees do not remount solely because period key slid (keys stable)  
- [ ] Web: continuous coast + spring; no per-frame React drag state  
- [ ] No network requests from drum interaction  
- [ ] ≥55fps mid-device Release (or documented exception + P2 Skia)  
- [ ] RM path: scale/opacity/snap still work  
- [ ] If look ≠ Set B: restamp artifacts linked on Eng card  

---

## 6. Prototype (this card)

`notes/research/calendar-drum-wheel-prototype.html` demonstrates:

- Fixed-geometry tiles + transform-only fling (recommended)  
- Y/M/W/D grain toggle  
- Momentum + snap  
- Optional **Legacy cheese mode** (center text expands mid-drag)  
- FPS HUD  
- Offline single file  

Open: double-click the file, or `open notes/research/calendar-drum-wheel-prototype.html` on Mac.
