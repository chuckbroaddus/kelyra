# Sign-in screen visual + copy update (CEO 2026-08-30)

## Context
Splash landing is done (play once, audio, neon CTA, orientation unload race fixed). When the user taps **Sign in**, they land on `/sign-in` (`src/app/sign-in.tsx`) with the old mark/wordmark/terracotta button/dev bootstrap blurb. CEO wants that screen updated to match the splash brand.

## Required UI changes (`src/app/sign-in.tsx`)

1. **Hero image** — Replace `<KelyraMark size={72} />` with the **final frame of the Kelyra splash video** (the still after the animation completes — neon violet→cyan “Kelyra” wordmark on black).
   - Extract stills from the bundled splash MP4s (or originals in `~/kelyra_splash_*.mp4`) via ffmpeg last-frame / near-end frame.
   - Bundle as static images under `assets/brand/splash/` e.g. `kelyra_splash_still_16x9.png` and `kelyra_splash_still_9x16.png` (or one square/mark crop if that looks better on the form — prefer the **actual final frame** of the video, aspect-aware: portrait still on tall viewports, landscape still on wide).
   - Render with `Image` (or existing pattern), not a playing video. Not the old `assets/brand/kelyra.png` KelyraMark on this screen.
2. **Remove** the text wordmark `"Kelyra"` under the mark (`styles.wordmark` / `>Kelyra</Text>`).
3. **Keep** the credential fields and sign-in behavior:
   - Kicker can stay “Sign in with email or @username” OR a minimal equivalent — CEO did not ask to remove field labels/placeholders; keep usable form UX.
   - Email/username + password fields, error message, busy state, `signInWithPassword` → refresh → `router.replace('/')` unchanged in purpose.
4. **Sign in button** — Match the splash landing CTA exactly:
   - Same violet→cyan gradient (`splashCtaGradient` `#6B4CFF` → `#2EC6F0`), white/near-white label (`splashCtaLabel`), letter-spacing/weight, border glow treatment.
   - Prefer **shared export** from `SplashLanding.tsx` (or a tiny shared `SplashSignInButton` / constants module) so the two screens cannot drift. Do not use terracotta `PrimaryButton` / `colors.brand` on this screen.
   - Label remains “Sign in” / “Signing in…” when busy; disabled when busy.
5. **Footer copy** — Replace **all** words below the Sign in button with exactly:
   > Account creation is performed by the school office. Please contact your school's administration for access.
   - Remove the long bootstrap blurb about Supabase / `school_claim_superintendent()` / dev password from the **shipped UI**.
   - **Do not** reintroduce public teacher signup. Auth behavior stays fail-closed.

## Tests that will break — update them intentionally
- `src/components/ui/splashLanding.test.ts` test `'sign-in form still keeps KelyraMark + wordmark'` → rewrite to assert splash still image + no wordmark text + neon CTA + new office copy.
- `src/lib/auth/failClosedTeacherProvision.security.test.ts`:
  - Q12: still no Create teacher / signUp; may still require an office/account-creation message — update regex to the **new** copy (and drop hard dependency on `school_claim_superintendent` **in the UI source** if removed). Bootstrap SQL docs can remain elsewhere; UI must not teach claim-superintendent.
  - `sign-in: full-color KelyraMark above text wordmark` → replace with assertions for splash final-frame still (no tint pipeline), no `>Kelyra</Text>` wordmark, shared neon CTA.

## Docs
- Brief update in `docs/ui-design.md` if it documents the old sign-in stack.

## Constraints
- Class app only. No commit/push. No DNS. No Author studio.
- Smallest coherent change. Do not restyle the whole app.
- Orientation black-out fix on SplashLanding must remain (ownedVideo cleanup, last-frame lock, isMuted={awaitingGesture}).
- typecheck + relevant unit/security tests green.

## Acceptance
1. `/sign-in` shows splash **final still** (aspect-aware), not KelyraMark PNG + not “Kelyra” text title.
2. Sign in button matches splash neon gradient CTA.
3. Footer is only the school-office account-creation sentence (exact CEO wording).
4. Sign-in still works; no public signup; tests updated and green; 0 P0/P1.
