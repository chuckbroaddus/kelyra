# Splash MP4 landing (CEO request 2026-08-29)

## Objective
Replace the unauthenticated first-launch / not-signed-in landing gate with looping Kelyra splash MP4s and a themed Sign in button overlaid below the animation. Remove the static wordmark + tagline copy.

## What the user sees today
`src/app/index.tsx` when `!teacher` (signed-out gate):
- Text wordmark "Kelyra"
- Lead: "Photograph the work. Approve the gap. Send a short practice set."
- PrimaryButton "Sign in" → `/sign-in`

**This gate is the target.** Do NOT replace the full email/password form on `/sign-in` (`src/app/sign-in.tsx`). After Sign in, keep the existing form flow (KelyraMark + fields + office-only bootstrap hint). Update any tests that asserted the *landing* copy; keep Q12 / sign-in form security tests intact unless they falsely target the landing.

## Source videos (on Chuck's Mac home — copy into the repo)
- Landscape / web / mobile landscape: `/Users/chuckbroaddus/kelyra_splash_16x9.mp4`
  - 1920×1080 H.264 + AAC, ~2.55s, ~498–510 KB
- Portrait / mobile portrait: `/Users/chuckbroaddus/kelyra_splash_9x16.mp4`
  - 1080×1920 H.264 + AAC, ~2.55s, ~565–578 KB

## Asset pipeline
1. Copy both files into the class app under something like `assets/brand/splash/` (or `assets/splash/`).
2. **Optimize for size + playback** with ffmpeg before commit-ready assets (re-encode H.264 yuv420p, reasonable CRF, no audio track if silent / strip audio if unused, faststart). Target: keep each file small (ideally well under ~400–500 KB if quality holds; current files are already short).
3. **Bundle in the app** (require/asset module). Do NOT stream from a remote URL on first paint — first launch must not wait on network. expo-av is already a dependency (`expo-av ~16.0.8`).
4. Register in `app.json` / Expo asset story only if required by the stack; follow existing brand asset patterns (`assets/brand/kelyra.png`, `KelyraMark`).
5. Leave the originals in `~/` untouched; repo copies are canonical for the app.

## UI / behavior requirements
1. Unauthenticated landing (`index.tsx` `!teacher` branch, and any equivalent first-launch gate if split):
   - Full-bleed (or max reasonable) splash video as the hero.
   - Choose **9×16** when viewport/window is portrait (height > width); **16×9** when landscape / web wide.
   - On dimension change (rotate, resize web), switch source cleanly without crash or black flash if practical.
   - Video: muted, plays inline, loops, no native controls, no download affordance. Prefer cover/contain that keeps the logo composition readable (cover is fine if letterboxing looks worse — pick the better fit for the mark).
   - **Remove** the "Kelyra" text wordmark and the "Photograph the work…" lead from this gate.
   - **Sign in** button overlaid **below** the animation (bottom safe-area / lower third), not covering the logo face if avoidable. Still routes to `/sign-in`.
   - Preserve auth error display if `error` is set (subtle, readable on video — contrast OK).
   - Preserve `configured === false` Supabase setup screen behavior (no need for splash there unless trivial).
2. Button look & feel:
   - Match the **color / theme / feel of the Kelyra logo in the splash** (full-color brand mark energy), not a generic grey ghost.
   - Prefer `colors.brand` / `brandInk` Primary treatment or a refined variant that reads on top of the video (may need scrim, soft plate, or stronger brand fill + shadow). Must remain accessible (contrast).
   - Label stays "Sign in" (or "Sign In" if existing casing on this gate — match product consistency; current gate uses "Sign in").
3. Performance:
   - No multi‑MB bloat. No remote fetch for splash.
   - Avoid blocking JS thread; unload/pause when leaving the gate if that is the platform-correct pattern for expo-av.
   - Web: works in Expo web (inline, muted autoplay policies).
   - iOS/Android: works in Expo Go / dev client patterns already used by the app.
4. Chrome:
   - Landing stays chrome-none if already (`ChromeProvider` treats `/sign-in` as none; ensure `/` signed-out gate also has no tray/header clutter).
5. Docs:
   - If `docs/ui-design.md` documents the old vertical wordmark → lead → Sign in stack for the gate, update that slice briefly to the video landing. No vision/MVP feature invention.

## Tests
- Update / replace the landing assertions if any exist for the old copy.
- Keep `failClosedTeacherProvision.security.test.ts` Q12 and sign-in KelyraMark tests for **`src/app/sign-in.tsx`** (form still has full-color mark + wordmark).
- Add a focused test that the signed-out home gate no longer shows the old tagline and does include splash asset references + Sign in navigation to `/sign-in`.
- `npm run typecheck` (and relevant unit tests) green.

## Constraints
- Repo: `/Users/chuckbroaddus/projects/kelyra` only. Do not touch Author studio.
- Do not git commit or push.
- Do not configure kelyra.app DNS.
- Do not invent product beyond this splash landing.
- Teachers still must not create classes; no auth/signup regression.
- Smallest coherent change; no drive-by refactors.
- Never print secrets.

## Acceptance
1. Cold open signed-out: user sees looping splash MP4 (correct aspect for orientation), no old tagline/wordmark stack.
2. Sign in below animation, brand-aligned, taps → `/sign-in` form unchanged in purpose.
3. Assets bundled + optimized in repo; both 9x16 and 16x9 present.
4. Web landscape uses 16x9; narrow/portrait uses 9x16.
5. Typecheck + targeted tests pass; QA loop Verify green.
