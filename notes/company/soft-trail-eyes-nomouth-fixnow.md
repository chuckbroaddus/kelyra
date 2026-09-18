# Soft FIX-NOW — gas trail + eyes/glasses no mouth (iPhone)

**Severity:** P0 (CEO product)  
**Disposition:** FIX-NOW  
**Date:** 2026-09-17  
**After:** PR #132 (always-facing ball + phase-z)  
**Why:** iPhone Soft shows round comet ball but **no gas trail**. Soft face shows floating/wrong **mouth** — CEO calls **eyes + glasses only** (overrides Soft SoT mouth).

## Root cause

1. #132 JS-orbits the ball but left Peek `gas-svg` on CSS `rotateX(90°)` inside gimbal/`ring-spin` — **WKWebView hides** the trail.
2. Soft v8b host still paints `.mouth` + tooth clipPath; mouth reads floating/wrong on app Soft.

## Binding approach

1. Drive **gas trail** with the **same always-facing orbit** as the ball (`data-soft-trail=js-orbit` scene-level `.gas-orbit`) — not CSS 3D gas alone on native.
2. **Hard-hide** `.mouth` / tooth clip for app Soft; keep eyes, glasses, lids, look.
3. SoftMark: `opaque={false}`, overflow visible, `ORBIT_PAD_FRAC`; keep `phase-z` front/behind K.
4. Tests: no-mouth + trail/orbit contract.

## Acceptance

1. iPhone: **visible trail** with ball full orbit.
2. iPhone: **eyes+glasses** while working; **no mouth** any phase.
3. Front/behind K still works (#132).
4. Web Soft matches; `tsc` + soft tests pass.
5. **PR only — do not merge** until Chuck verifies on device.

## Non-goals

- Do not reinvent face/gas as bead SoftMark.
- Do not reopen Soft PNG scale cards.
- Do not restore SoT mouth for app Soft without a new CEO call.
