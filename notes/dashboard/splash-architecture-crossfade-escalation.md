# ESCALATION: Splash end black — architectural rewrite (CEO 2026-08-30)

## Severity
P0 product. **3+ prior fix loops failed** (still under video, pause-not-unload, peak frame, original last frame, CEO JPG, unmount-first). Systematic-debugging Phase 4.5: **stop patching expo-av end behavior — change architecture.**

## Root cause (confirmed by investigation)
1. **Opaque `expo-av` `<Video>`** paints its own surface. Near end / on stop it often paints **black**. Anything “under” the video is invisible while Video is mounted and opaque.
2. Unmount-on-complete still leaves a **frame gap**: video shows black → React commits → still appears. User reports **black**.
3. Relying on video last frame, didJustFinish, or unload timing is the wrong architecture for a **guaranteed logo hold**.

## CEO assets (only stills allowed)
```
~/kelyra_splash_screen_last_image_16x9.jpg
~/kelyra_splash_screen_last_image_9x16.jpg
```
Already copied to:
```
assets/brand/splash/kelyra_splash_still_16x9.jpg
assets/brand/splash/kelyra_splash_still_9x16.jpg
```
Import **only** these JPGs as hold art. Do not re-ffmpeg stills.

## New architecture (required)

### Layer model (always)
```
[root black #000]
  [CEO JPG still — ALWAYS mounted, zIndex 1, full window width×height]
  [Video — ONLY while animating, zIndex 2, opacity animated 1→0]
  [UI chrome CTA/form — zIndex 3 after complete]
```

### Playback model
1. On mount (if not session-completed): start video playing on top of still.
2. **Crossfade OFF the video well before the clip’s dead end:**
   - When `positionMillis >= durationMillis * 0.72` (or fixed ~1.8s into a 2.55s clip), start `Animated` video opacity **1 → 0** over ~250–350ms.
   - At opacity 0 (or immediately when fade starts): set `showVideo=false` / unmount Video.
   - **Still JPG never unmounts** and never depends on video frame.
3. After fade: `hasCompletedSplash=true`, fade in Sign in CTA (existing unified auth).
4. Skip tap: **immediately** set video opacity 0 + unmount video + show still + CTA + form. No waiting on pause/unload.
5. Orientation after complete: **only swap still JPG** (portrait/landscape CEO files). Never remount video.

### Sizing (critical for web)
Do **not** rely on `absoluteFill` alone for the still on web. Set **explicit** `width` and `height` from `useWindowDimensions()` on both still and video so the logo cannot collapse to a zero-size or letterboxed black hole.

### Video stack
- Keep `expo-av` for this slice **or** migrate to `expo-video` if cleaner — either OK if the **opacity crossfade architecture** holds.
- `isLooping={false}`. Audio rules as today.
- Prefer `pointerEvents="none"` on video container during fade-out.
- **Forbidden:** pause/unload while video opacity is 1 and covering the still; relying on last decoded video frame as the hold.

### Auth UX (keep)
- CTA hidden during play; fades in after complete.
- Sign in reveals fields on same screen; office footer with fields.
- Mid-animation tap skips to still + CTA + fields.
- `/sign-in` reuses same component.
- Neon SplashSignInButton.

### Delete / simplify
- Remove SPLASH_PEAK_FRAME=76 end-cut logic that races the black end of the file.
- Remove any path that “holds last video frame.”
- Scrim: soft bottom gradient only under chrome, never full opaque black over logo.

## Tests
- Still imports `.jpg` CEO files; assets exist.
- Structural: still always rendered; video gated by playing flag; crossfade/opacity path present; complete does not require didJustFinish for logo hold.
- Skip path unmounts video immediately.
- Typecheck green.

## Acceptance (CEO dogfood)
1. Watch splash once: animation plays, then **crossfades to CEO JPG logo** — **never a full black screen**.
2. Logo remains until Sign in / form.
3. Skip mid-animation: instant CEO JPG + chrome.
4. Hard reload still works (clear Metro if needed: `npx expo start -c` note in handoff).

## Constraints
- `~/projects/kelyra` only. No commit/push.
- Smallest rewrite that implements this architecture — may replace large portions of SplashLanding.tsx.
- 0 P0/P1.

## CoS note to implementer
This is an **architecture change**, not another timing tweak. If you only adjust epsilon/ms again, the loop fails acceptance.
