# CAL-DRUM P1 ship (t_befaa28a)

**CEO override / restamp authorization:** 2026-09-24 — fixed plate idle (F1) departs dual-stamped Set B hanging-ledger idle art; CEO authorized restamp for this path.

## Shipped

1. **Fixed plate idle** — `PeriodLeaf` red header + single body line/numeral/range. Never mounts `MonthHangingGrid` / `WeekDayStrip` on the drum (grids remain in Calendar body only).
2. **N=7** — `WHEEL_SLOT_OFFSETS = [-3,-2,-1,0,1,2,3]`, `WHEEL_VISIBLE_SLOTS = 7`, `WHEEL_CENTER_INDEX = 3`, `WHEEL_FLING_CLEAR_RADIUS = 3`, short-snap freeze `|steps| ≤ 3`, `WHEEL_LOCAL_SAMPLE_SLOTS = 4`.
3. **RNGH 2** — `PeriodPager` uses `Gesture.Pan()` + `GestureDetector` (RNGH 3.2.1). Reanimated `dragShared` / `withSpring` / `NativeSlotMotion` kept. `useDrumStackGestureGate` hold on begin / release on end-or-cancel (PR #194 iOS-back gate preserved). `GestureHandlerRootView` at `AppShell`.
4. Segment atlas = out of scope (no new binder art).
