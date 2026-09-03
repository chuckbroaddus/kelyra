# Fix splash landing: play once + audio + button matches splash palette (CEO 2026-08-29)

## Context
Prior slice shipped `SplashLanding` on the signed-out home gate. CEO review found three defects — fix all three in one pass.

Current issues in `src/components/ui/SplashLanding.tsx`:
1. `isLooping` true → endless loop. **Must play exactly once**, then hold the final frame (no restart).
2. No audible audio: (a) repo MP4s under `assets/brand/splash/` were re-encoded **without an audio track**; (b) player sets `isMuted` / `volume={0}`. Originals at home **have AAC stereo**.
3. CTA uses default `PrimaryButton` (`colors.brand` orange terracotta `#B03E0E` light / `#E07A3A` dark) which **clashes** with the splash. Splash is **not** the app terracotta brand — it is a neon violet→cyan wordmark on pure black.

## Color analysis (do this work; hexes are guidance from CoS frame sampling + vision)

Splash look:
- Background: pure / near-black (`#000000`–`#0a0a12`)
- Logo left (K): violet / electric purple ~`#6058E8`–`#8040F0` (hue ~240–258)
- Logo mid→right: cyan / aqua ~`#38A0F8`–`#40D0F8` (hue ~190–210)
- Soft dual glow: purple bloom left, teal bloom right
- Mood: dark cinematic neon, modern geometric sans wordmark

**Sign in button must match this splash**, not global app brand orange:
- Prefer a **horizontal gradient fill** violet → cyan approximating the logo (e.g. `#6B4CFF` → `#2EC6F0` or sampled equivalents). Use `expo-linear-gradient` if already in package.json; otherwise add it the Expo-supported way, or a clean solid mid-blend (`#4B7BE8` / `#3D9BE8`) **only if** gradient is impractical — gradient is preferred.
- Label color: white / near-white (`#F5FBFF` or `#FFFFFF`), weight **600–700**, tracking slightly open to echo the mark (e.g. letterSpacing ~0.4–1). System/UI font is fine unless a splash-matching font is already in the app — do **not** vendor a random font file.
- Shape: rounded enough to feel premium on black (existing radius.md/lg OK); optional 1px luminous border `rgba(120,200,255,0.35)` or soft outer glow/shadow in cyan/purple — not the terracotta scrim look.
- Do **not** reuse stock `PrimaryButton` orange on this gate. Local splash CTA component or explicit override styles on this screen only. Do not restyle every PrimaryButton app-wide.
- Remove or restyle the brown `rgba(20,12,8,…)` scrim if it muddies the neon look; a soft black fade is OK for contrast under the CTA.

## Audio + asset pipeline
1. Re-encode **from the originals** (keep audio):
   - `/Users/chuckbroaddus/kelyra_splash_16x9.mp4`
   - `/Users/chuckbroaddus/kelyra_splash_9x16.mp4`
2. Overwrite `assets/brand/splash/kelyra_splash_16x9.mp4` and `…_9x16.mp4` with optimized H.264 **+ AAC** (yuv420p, faststart, reasonable CRF/audio bitrate). Still bundle in-app; keep files lean but **do not strip audio**.
3. Verify with ffprobe both files have an audio stream before finishing.
4. Player: `isMuted={false}`, sensible `volume` (1), `isLooping={false}`, still `shouldPlay`, no native controls.
5. Configure audio mode so splash can be heard (iOS silent switch / mix): use `expo-av` `Audio.setAudioModeAsync` appropriately for playback with speakers (`playsInSilentModeIOS: true`, etc.) when the landing mounts; clean up on unmount if required.
6. Web autoplay: browsers often block unmuted autoplay. Prefer: attempt unmuted autoplay once; if blocked, still show last-frame/poster path and ensure first user gesture (including Sign in or a tap-to-hear if needed) can start audio — but **native must hear audio on launch without an extra tap** if the platform allows. Do not leave mute hard-coded.
7. On finish: stay on final frame (status listener / `didJustFinish`); do not loop. Button remains available the whole time (below animation).

## Playback behavior
- Exactly **one** playthrough per mount/focus of the signed-out landing.
- Orientation change may remount the other aspect source — that new source may play once (acceptable).
- Pause/unload on blur/unmount (keep existing focus cleanup pattern).

## Files
- `src/components/ui/SplashLanding.tsx` (primary)
- `assets/brand/splash/*.mp4` (re-encode with audio)
- `src/components/ui/splashLanding.test.ts` (assert once / not looping; not muted constants if testable; button not using colors.brand orange on this gate)
- `src/app/index.tsx` only if wiring must change (should stay SplashLanding)
- Do not break `/sign-in` form or Q12 / KelyraMark tests
- Optional brief ui-design note if the landing CTA is documented

## Constraints
- Class app only (`~/projects/kelyra`). No commit/push. No DNS. No Author studio.
- Smallest coherent change. No drive-by theme refactor of the whole app palette.
- Never print secrets.
- typecheck + splash tests green.

## Acceptance
1. Splash plays **once** then freezes on last frame (no endless loop).
2. Audio from original soundtrack is present in bundled MP4s and audible on device/simulator path (unmute + audio mode).
3. Sign in button visually matches splash violet→cyan neon system (gradient preferred), white label, not terracotta Primary brand.
4. Still routes to `/sign-in`. Portrait/landscape sources unchanged in purpose.
5. QA loop Verify green; 0 P0/P1 on this fix.
