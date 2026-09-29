# Calendar Drum — Tried Log (A failed, P0+P1 shipped)

**Status:** P0+P1 shipped (PR 156). Approach A rejected in production.  
**Date:** 2026-09-27  
**Purpose:** Prevent re-exploration of dead paths by next Grok Bot cards.

## Timeline & Key Events
- Research A–F: see notes/company/calendar-p6-item2-research.md
- ARCH decision: Approach A (calendar-p6-item2-recommendation.md)
- HTML mock: calendar-p6-item2-approach-a.html (revealed missing slots)
- Shipped PR 155 (merge 2f116bd): WHEEL_VISIBLE_SLOTS=7, offsets −3..+3
- CEO feedback (2026-09-20): 7-slot pre-render insufficient (blank tiles + lag on web+mobile)
- Perf analysis: calendar-item2-perf-architecture.md (compose/remount/JS-thread dominate)
- ±5-only also rejected
- Next iteration: P0+P1 (N=9 SlotPool + fling silhouette + Reanimated 4.5.1 native + web CSS will-change)
- Dual stamp MET. Eng task t_5411feca
- PR 156 merged 8e89870. Worktree restored. Chuck self-testing.
- P2 OUT (FlashList / full Reanimated web)

## What Was Tried & Permanently Rejected
- Approach A (7-slot pre-render) — failed production test
- UIPicker
- nested ScrollView
- ±3-only as sole fix
- ±5-only as sole fix

## What to KEEP
- Set B look
- P6 1A pan
- RM no tilt

## Pointers
- Architecture details: calendar-item2-perf-architecture.md
- PM/QAS locks: P0+P1 in PR 156 (do not reopen without Chuck approval)

Next implementer: read this before any new Calendar drum work.

---

**End of tried-log.** All rejected paths documented. P0+P1 locks active.