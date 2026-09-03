# Fix splash ending on black (CEO 2026-08-30)

## Bug
After the splash animation the screen **goes black** (logo disappears). CEO confirmed still.

## Root causes (address all)
1. **The MP4 itself fades toward black** after the peak logo. Last frames (~68–76 of 76) are much darker than the peak. Waiting for `didJustFinish` means the user **watches the fade to black**, then we swap still — too late; feels like “goes black.”
2. Possibly `didJustFinish` flaky on web → stuck on final blackish video frame with root `backgroundColor: #000`.
3. Scrim / overlay must not paint the logo region black.

## Frame analysis (already done by CoS — use this)
76 frames. Peak full neon logo = **frame 52** (both 16×9 and 9×16).  
Stills on disk should be frame 52:
- `assets/brand/splash/kelyra_splash_still_16x9.png`
- `assets/brand/splash/kelyra_splash_still_9x16.png`  
If missing/wrong, re-extract frame index **52** (1-based ffmpeg `%52`) from the bundled MP4s and overwrite. Do **not** use last frame or second-to-last if those are past the fade.

## Required UX fix
1. **Layer the peak still under the video at all times** (or mount still as soon as splash starts). Video plays on top; when we leave the animation, remove/hide video — still is already visible (no black flash).
2. **Switch off the video at the peak**, not after the fade:
   - Prefer `onPlaybackStatusUpdate`: when `positionMillis / durationMillis` crosses the peak ratio (**52/76 ≈ 0.684**) OR position reaches `duration * (52/76)`, call the same completion path (hide video, mark completed, fade in CTA).
   - Still handle `didJustFinish` as a fallback if peak never fires.
   - Optional safety timeout near duration.
3. Skip-tap mid-animation: hide video immediately → peak still already underneath + CTA/form per existing unified flow.
4. After completion: **never show the video again** this session (orientation only changes still aspect) — already intended.
5. **Scrim**: only a soft bottom gradient behind the CTA/form band. Must **not** cover the center logo with opaque black. Remove or shrink any full-bleed black scrim that washes out the still.
6. Verify still Image uses `resizeMode` that keeps the logo visible (cover is OK if letterboxing isn’t needed; logo is centered).

## Keep
- Unified single-screen auth (no second sign-in screen)
- CTA hidden during play; fade in after complete/skip
- Tap-anywhere skip → form + CTA
- Neon button, office footer when form shown
- Audio rules

## Files
- `src/components/ui/SplashLanding.tsx` (primary)
- still PNGs if re-extract needed
- tests: assert peak-ratio completion path / still under video / no reliance on last-frame-only

## Acceptance
1. Natural play: logo reaches full brightness and **stays** (peak still) — user never left on black field.
2. No multi-second black void between video end and UI.
3. Skip tap: immediate peak still + chrome.
4. Rotate after complete: peak still visible, not black.
5. typecheck + splash tests green; 0 P0/P1.
