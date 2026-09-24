# Calendar Drum / Wheel Picker — Research Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/calendar-drum-wheel-research.md` · `notes/company/calendar-drum-wheel-plan.md`  
**Prototype:** `notes/research/calendar-drum-wheel-prototype.html`  
**Card:** `t_78363b5e`  
**Access date for all URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above. Research + recommendation only — **no app implementation**. No Hermes AI staffing.

**Stamp note:** Prior dual-stamp locked Set B hanging-ledger. CEO 2026-09-24 invites redesign — restamp required if we leave Set B.

---

## Recommendation (pick)

### Best approach: **(A) Fixed-geometry recycled tiles + GPU transforms only during fling**

| Approach | Verdict |
|---|---|
| (E) Keep Set B + tune springs only | **No** — cheese is layout/content mid-spin |
| (C) Skia Canvas wheel first | **Defer** — Eng cost; P2 escalation |
| (D) CSS scroll-snap web + Reanimated native split | **Incomplete** as sole strategy |
| (B) Segment atlas stitch alone | **Incomplete** — good P1 art, not P0 fix |
| **(A) Fixed tiles + recycle 7–9 + transform-only fling** | **Yes — lock this** |

### Locked recommendation bullets

- Recycle **~7–9** slot hosts with **stable React keys by slot index**.  
- During fling: **GPU transforms only** (translateX / rotateY / scale / opacity).  
- **Never** change text layout mid-spin (no MonthHangingGrid mount, no header line growth, no fontSize swap).  
- Center focus = scale/opacity or pre-drawn focus chrome; optional detail overlay **after** snap only.  
- Kill web per-frame `setWebDragPx` React state; add web inertial spring.  
- Drop BlurView silhouette during fling → opacity dim.  
- Network **0**.  
- Segment binder stitch = **valid P1** art, not P0 mandate.  
- Departing Set B idle look = **CEO override + restamp**.

---

## Root-cause (compressed)

Live `PeriodPager` mounts **N=9** `PeriodLeaf` trees. Mid-fling `visualShift` rebuilds the period window and remounts via `periodKey:slotIndex` keys. `showCenterExtras` mounts a **35-cell month grid** / expands week-day headers on center after snap — and full ledgers stay sharp for ±4 during fling. Web updates React state every drag pixel. That combo is the glitchy cheese, not the spring math.

Hotspots: `PeriodPager.tsx`, `PeriodLeaf.tsx`, `periodWheel.ts` (`WHEEL_SLOT_OFFSETS`), `periodPager.ts` (`buildPeriodWindow`).

Missing docs: `calendar-p6-drum-perf-eval.md` / `calendar-p6-item2-research.md` — not on disk.

---

## Industry patterns (compressed)

| Source | Lesson |
|---|---|
| iOS UIPickerView | Recycle row views (`reusing:`) |
| Android NumberPicker | Only ~3 selector slots; Scroller fling; draw, don’t allocate N views |
| Reanimated + GH | UI-thread shared values + velocity spring |
| Skia Atlas | P1/P2 sprite transforms |
| FlashList | Wrong primary tool (long lists ≠ 9-slot drum) |
| CSS scroll-snap | Web fallback for snap physics |

---

## Phased plan (compressed)

| Phase | Work |
|---|---|
| **P0** | Fixed geometry; stable keys; no mid-spin extras/blur; web shared-value/rAF + spring |
| **P1** | Optional segment atlas / N=7 / RNGH 2 / idle DetailOverlay; restamp if look changes |
| **P2** | Skia only if metrics fail |

---

## How to open the prototype

```bash
open /Users/chuckbroaddus/projects/kelyra/notes/research/calendar-drum-wheel-prototype.html
```

Or double-click the file. Offline, dark UI, Y/M/W/D toggles, flick/momentum/snap, FPS HUD, and a **Legacy cheese mode** checkbox that expands center text mid-drag (to feel the bug).

---

## Coverage map

| Topic | Research § | Plan § |
|---|---|---|
| Root-cause / code cites | Research §A | Plan §4 |
| Industry patterns | Research §B | — |
| Segment stitch eval | Research §C | Plan §0, D1 |
| Perf budget | Research §D | Plan N8 |
| Architecture | Research §E | Plan §0 |
| Visual redesign | Research §F | Plan §3 |
| Phases | Research §G | Plan §3 |
| Sources | Research §H | — |

---

## Top 5 implementation priorities (future Eng)

1. Stable slot keys + fixed-geometry compact tiles during fling.  
2. Gate MonthHangingGrid / tall headers to post-snap idle only.  
3. Web transform driver without React state per frame + real spring.  
4. Replace blur silhouette with opacity.  
5. Restamp path if Chuck picks binder/segment look over Set B.
