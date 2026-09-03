# Splash last-frame still + no replay on rotate + shared login hero (CEO 2026-08-30 OOB)

## CEO correction (must ship)
1. After the splash **animation plays once**, the screen must remain on the **LAST frame** of the animation — not loop back to / freeze on the **first** frame.
2. You may need to **extract the last frame into its own image file** and show that still after playback ends (and whenever we should not be animating).
3. On **reorientation**, do **NOT** play the animation again. Stay on the **last-frame still image** (correct portrait vs landscape still for the new aspect).
4. That **same last-frame still** is what the **Sign-in / login screen** uses as the hero (already in flight as T32 — unify).

## Implementation guidance
### Assets
- From bundled (or original) splash MP4s, extract near-end / last frame PNGs:
  - `assets/brand/splash/kelyra_splash_still_16x9.png`
  - `assets/brand/splash/kelyra_splash_still_9x16.png`
- Verify visually they show the completed neon wordmark, not the open black/first frame.

### Splash landing (`SplashLanding.tsx`)
- Play MP4 **once** with audio rules as today.
- On `didJustFinish` (or reliably at end): switch UI to the **still Image** for current aspect (or overlay Image on top and hide/unload video). Do **not** leave Video showing frame 0.
- Track `hasCompletedSplash` in component state (or module/session ref for the signed-out session) so:
  - After first completion, **orientation changes only swap still images** (9x16 ↔ 16x9) — **no Video remount play**.
  - Cold first visit to the gate: play video once for the initial aspect, then still.
- If user leaves splash and returns within same app session before sign-in, prefer still (already completed) over replaying — optional but good; minimum is: after finish, rotate never replays.
- Remove reliance on expo-av “hold last frame” alone if it snaps to first frame on this platform.

### Sign-in (`sign-in.tsx`)
- Hero = same still assets (aspect-aware), not KelyraMark, no “Kelyra” text wordmark.
- Neon shared Sign in button; office-only footer copy per T32 request.
- Share constants/components so splash and sign-in cannot drift.

### Tests
- Assert still asset paths exist; splash switches to Image/still after finish path; orientation after complete does not set shouldPlay on a new Video (structural assertions OK).
- Update any tests that required post-finish Video last-frame seek only.

## Constraints
- kelyra only; no commit/push; keep auth fail-closed; typecheck green.

## Acceptance
1. Play splash → ends on **last** frame still (completed logo), never first frame.
2. Rotate after end → other aspect **still**, no replay, no black void.
3. Sign-in hero = that last-frame still.
4. Neon CTA + office copy on sign-in.
