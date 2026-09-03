# Splash still = last frame of ORIGINAL mp4 (CEO correction 2026-08-30)

## CEO correction
Frame 76 of the **original** `~/kelyra_splash_16x9.mp4` and `~/kelyra_splash_9x16.mp4` is **not** black — it is the full Kelyra name he wants as the hold still. Earlier “black” was likely: (a) optimized repo encode last frame weaker, and/or (b) `unloadAsync` blanking the Video surface over the still.

## Assets (CoS already did — verify, do not reverse)
- Stills extracted from **original** last frame via sseof into:
  - `assets/brand/splash/kelyra_splash_still_16x9.png`
  - `assets/brand/splash/kelyra_splash_still_9x16.png`
- Bundled MP4s re-encoded from **originals** with AAC (keep last frame fidelity).

## Code changes required
1. Change peak/hold cutover to the **last frame**, not 52:
   - `SPLASH_PEAK_FRAME = 76` (or `SPLASH_FRAME_COUNT`)
   - `SPLASH_PEAK_RATIO = 1` or `(76/76)` — complete at end / didJustFinish / position near duration
   - Prefer completing on `didJustFinish` or `position >= duration - small epsilon`, with still underlay always present
2. Keep T35 fix: **never `unloadAsync` while Video still covers the still** — pause only, then unmount Video via `hasCompletedSplash`
3. Still Image always under Video; on complete hide Video → last-frame still remains
4. Soft bottom scrim only
5. Update comments/tests that say “frame 52” / “before fade” / “second-to-last” to **original last frame (76)**
6. `splashBrand.ts` comment: last frame of original splash, full neon wordmark

## Keep unified auth UX
CTA fade after complete; skip tap; inline fields; no second screen.

## Acceptance
1. After animation, hold still matches original MP4 last frame (full Kelyra name), not black.
2. No black flash from unloadAsync.
3. Tests green; 0 P0/P1.
