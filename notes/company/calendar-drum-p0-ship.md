# CAL-DRUM P0 ship (t_033325c3)

- Stable `slot-${index}` React hosts (`stableSlotHostKey`) — no remount on periodKey mid-fling.
- `motionCompact` on PeriodLeaf during fling / extras-off — no MonthHangingGrid / header expand / year fontSize swap.
- Silhouette = opacity-dim (~0.4) via `DimOut` — no BlurView / CSS blur on hot path.
- Web: Reanimated `dragShared` + `withSpring` (same as native) — no per-frame `setWebDragPx`.
