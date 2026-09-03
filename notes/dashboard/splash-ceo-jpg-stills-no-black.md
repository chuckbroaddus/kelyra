# Use CEO home JPGs as splash stills + stop black end (2026-08-30)

## CEO assets (mandatory)
Copy from home into the repo and **import these as the hold stills**:
- `/Users/chuckbroaddus/kelyra_splash_screen_last_image_16x9.jpg`
- `/Users/chuckbroaddus/kelyra_splash_screen_last_image_9x16.jpg`

Canonical in repo (CoS may already have copied):
- `assets/brand/splash/kelyra_splash_still_16x9.jpg`
- `assets/brand/splash/kelyra_splash_still_9x16.jpg`

Update `src/components/ui/splashBrand.ts` to import the **.jpg** files (not the old .png extracts). Remove dependence on ffmpeg-extracted stills for the hold.

## Why it still goes black (fix the layering bug)
Still Image is under Video, but **Video is opaque**. When the clip ends (or pauses), the player often shows a **black frame** that **covers** the still until React unmounts Video. Pause-before-unmount is not enough — **hide/unmount the Video layer first** so the still is visible immediately.

## Required code behavior (`SplashLanding.tsx`)
1. Always render CEO still full-bleed underneath (`resizeMode="cover"`).
2. While playing: Video on top (`absoluteFill`).
3. On natural end / skip / safety timer:
   - **First** set state so Video is **not rendered** (or `opacity: 0` + `pointerEvents: 'none'`) so still shows **immediately**.
   - **Then** pause (optional). **Never** `unloadAsync` while Video is visible on top of the still.
4. Do not wait for a delayed second paint with Video still showing black.
5. Prefer completing slightly early if needed (`duration - 120ms`) so we cut while logo is still on the last good video frame, then still JPG holds forever.
6. Soft bottom gradient scrim only under CTA/form — must not paint center logo black.
7. Keep unified auth: CTA fade after complete; skip tap; inline fields; neon button; office footer with form.

## Tests
- splashBrand imports `.jpg` CEO stills
- Assets exist
- Completion path does not unload while Video covers still; Video gated off on complete
- Still non-black smoke if easy (jpg bytes)

## Constraints
- Class app only; no commit/push; typecheck + tests green; 0 P0/P1.

## Acceptance
1. End of splash (or skip) shows CEO JPG full Kelyra logo — **never a black field**.
2. Hard reload still works (jpg bundled).
3. Rotate after complete keeps CEO still.
