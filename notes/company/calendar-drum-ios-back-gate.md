# CAL-DRUM iOS back-gate (t_15577793)

- PanResponder full-band claim (CAL-P6-1A) alone loses to native interactive pop on LTR.
- While finger is on the drum stage: `setSwipeRowStackGestures(nav, false)` via `useDrumStackGestureGate` (same parent-walk as ListRow).
- Restore on touch end / pan release / terminate / unmount — not for whole Calendar mount.
- Off-drum LTR still pops; spring after finger-up does not need the gate held.
