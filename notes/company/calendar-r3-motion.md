# CAL-R3 Motion — Apple-like transitions for Kelyra Calendar

**Date:** 2026-09-14  
**Card:** `t_c53154d6`  
**Status:** Spec only. No Eng. Ties to packs R3-A / R3-B / R3-C in `calendar-r3-ux-options.md`.

**Principles (from R2, still law):** reduced-motion first; no error-shake; no confetti; no parallax; no required shimmer; no required save-check flourish. Calm school tool.

**Class**
- **Essential** — ship if the pack ships the surface; under reduced-motion use instant/fade substitute.
- **Enhancing** — drop entirely under reduced-motion; optional in full-motion.

---

## Reduced-motion contract (all packs)

| Setting | Behavior |
|---|---|
| OS/accessibility reduce motion ON | Duration → 0–120ms fade or hard cut; no springs; no pinch zoom animation; multi-day uses explicit control not pinch |
| Prefers normal | Springs allowed within caps below |
| Screen readers | Announce view name on change; sheet title focused on present |

---

## Transition catalog

| ID | Trigger | Full motion | Duration / spring | Reduced-motion | Class | Packs |
|---|---|---|---|---|---|---|
| **M-SHEET-PRESENT** | Open composer / Calendars / menus | Sheet slides up from bottom (phone); web modal scale+fade 0.98→1 | Spring: damping ~0.86, response ~0.35s; cap 420ms | 120ms opacity fade or instant | **Essential** | A B C |
| **M-SHEET-DISMISS** | X, Save success, scrim (if clean) | Reverse slide / settle | Same spring reverse; interruptible | Instant or 100ms fade | **Essential** | A B C |
| **M-SHEET-DIRTY** | Scrim/back while dirty | No dismiss; confirm dialog present (no shake) | Dialog: fade 150ms | Instant dialog | **Essential** | A B C |
| **M-RANGE-SHIFT** | Prev/Next day·week·agenda | Content crossfade or horizontal slide 24px | 220ms ease-out | Instant swap + announce | **Essential** | A B C |
| **M-TODAY-JUMP** | Today control | Short settle to today anchor | Spring response ~0.4s; optional highlight ring 300ms | Instant jump; ring optional static | **Enhancing** (jump itself Essential without spring) | A B C |
| **M-VIEW-SWITCH** | Agenda↔Day↔Week chips | Crossfade body 180ms; chrome sticky | Ease-in-out 180ms | Instant | **Enhancing** | A B C |
| **M-FILTER-APPLY** | Chip / preset / layer toggle | List items fade-reflow | 150ms opacity | Instant filter | **Enhancing** | A B C |
| **M-BADGE-STATE** | Hidden → published (after Needs) | Badge text swap; soft color fade | 200ms | Instant text swap | **Essential** (state truth) | A B C |
| **M-SKELETON** | Loading | Static structure placeholders (no shimmer required) | N/A | Same | **Essential** | A B C |
| **M-YEAR-DRILL** | Tap mini-month / day in year | Year zooms toward month/day | Shared-element-ish 320ms spring | Hard cut to month/day | **Essential** if year ships | B C |
| **M-MONTH-SCROLL** | Vertical month continuum | Native scroll; month title sticky collapse | Scroll physics platform | Same without parallax title | **Essential** if month ships | B C |
| **M-DAY-SWIPE** | Horizontal swipe on day timeline | Adjacent day slide | 280ms ease; cancelable | Buttons only; no swipe req | **Enhancing** | A B C |
| **M-DATE-INLINE** | Expand Starts/Ends picker | Grid expands under row | Height spring 300ms | Instant expand | **Enhancing** | B C (A if DATE skin) |
| **M-COLOR-POP** | Calendar row | Popover scale from row | 200ms | Instant menu | **Enhancing** | B C |
| **M-PINCH-MULTIDAY** | Pinch week grid | Column count 7→5→3 (or reverse) | Continuous; settle spring 250ms | **No pinch** — stepper control 3/5/7 | **Enhancing** (C only); Essential *control* if multi-day ships | C |
| **M-MULTIDAY-STEPPER** | Tap 3/5/7 under RM or always as a11y | Column recount + width animate | 220ms | Instant recount | **Essential** if multi-day ships | C |

---

## Bans (all packs)

| Ban ID | Why |
|---|---|
| M-ERROR-SHAKE | Anxiety; fails a11y vestibular |
| M-CONFETTI / celebration on Save | School tool calm; Save is commit not party |
| M-PARALLAX-YEAR | Motion sickness; RM nightmare |
| M-SHIMMER-REQUIRED | Battery + distraction; skeleton OK static |
| M-SAVE-CHECKMARK-REQUIRED | Optional quiet is fine; not blocking |
| M-AUTO-OPEN-INBOX | Publish lives in Needs |

---

## Pack motion scope

| Pack | Essential motion set | Enhancing allowed | Not in pack |
|---|---|---|---|
| **R3-A** | Sheet present/dismiss/dirty; range shift; badge; skeleton; day timeline layout (no year) | Today spring; view crossfade; filter fade; day swipe | Year drill; pinch multi-day |
| **R3-B** | All A + year drill + month scroll | A enhancing + date inline + color pop | Pinch multi-day |
| **R3-C** | All B + multi-day stepper (and pinch when motion OK) | Full catalog | Still bans list |

---

## Implementation notes (design only — not Eng task)

- Prefer one motion token table later in `docs/ui-design.md` **after** Chuck + PM lock — do not patch ui-design on this card.
- Phone sheet should feel like Apple Calendar dark sheet (elevated #1C1C1E-class surface) without copying iOS private APIs.
- Web modal: less spring, more opacity; match desk density.
- Gesture conflicts: tray swipe / drawer must win over day swipe at screen edges.

---

## Verification checklist (for later Eng — not this card)

- [ ] Reduce Motion ON: no spring, no pinch animate, multi-day stepper works
- [ ] Dirty composer: no silent dismiss
- [ ] VoiceOver: sheet title, view change announced
- [ ] No shake on error
- [ ] Desk/tray gestures not stolen

**Related:** `calendar-r3-delta-vs-current.md` §10 · `calendar-r3-ux-options.md`
