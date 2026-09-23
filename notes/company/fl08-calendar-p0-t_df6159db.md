# FL-08 Calendar P0 — t_df6159db

Hermes consultant task lock for two Expo Go / period-wheel P0s.

## DEFECT [P0] Calendar translateZ invalid transform

- Symptom: Expo Go red screen — Fabric rejects `translateZ` in RN `style.transform`.
- Fix on main: PR #152 (`fix/cal-period-wheel-no-translatez`) merged. `PeriodPager`
  documents "No translateZ"; NativeSlotMotion / WebSlotMotion use
  `perspective` · `translateX` · `rotateY` · `scale` only.
- SoT `wheelZForNorm` / `wheelSample.translateZ` remain geometry math only — never
  applied to RN styles. Soft-avatar CSS `translateZ` in `softV8bHostHtml.ts` is
  unrelated (web CSS, not RN Fabric).

## DEFECT [P0] PeriodPager tile.key of undefined

- Symptom: crash reading `tile.key` when a SlotPool slot index had no tile.
- Fix on main: `renderSlot` does `if (!tile) return null` before `tile.key`;
  `buildPeriodWindow` / `packWindow` align to `WHEEL_SLOT_OFFSETS` (N=9, center ±4).
- Stale OPEN PR #154 (`fix/cal-periodpager-slot-key-guard`, 7-slot window) conflicts
  with later 9-slot drum merges and is superseded.

## Regression lock (this task)

Tests in `periodWheel.test.ts` / `periodPager.test.ts` assert:

1. Every `style.transform` array in `PeriodPager.tsx` omits `translateZ`.
2. `PeriodPager` never references `wheelZForNorm` / `wheelSample` / `.translateZ`.
3. `renderSlot` null-guards before the single `tile.key` read; no `window.slots[…]!`.

```bash
node --experimental-strip-types --test \
  src/lib/calendar/periodWheel.test.ts \
  src/lib/calendar/periodPager.test.ts
```
