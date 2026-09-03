# Unified splash auth screen (CEO 2026-08-30)

## Problems / goals
1. Extracted “last frame” still is often **black**. Use the **second-to-last frame** (or last *non-black* frame) as the hold still for both portrait and landscape.
2. **Sign in button must NOT show during the splash animation.** After animation completes → button **fades in** on top of the still.
3. **No navigation to a separate `/sign-in` screen.** Tapping Sign in **reveals username + password fields on this same splash screen** (fade in). Same screen hosts the full sign-in.
4. **Tap anywhere during the animation** → skip: jump to completed still + fade in Sign in button **and** the username/password fields (user can enter credentials without waiting). Treat skip as “completed + form revealed.”
5. Move footer copy onto this screen, **only when the credential fields are visible** (after Sign in tap *or* mid-animation skip tap):
   > Account creation is performed by the school office. Please contact your school's administration for access.
6. **Retire the old second screen UX** for this flow: signed-out users should not need `router.push('/sign-in')` from the landing. Either remove `/sign-in` route usage from the gate, redirect `/sign-in` to the unified splash auth, or make `/sign-in` render the same component — pick the smallest coherent approach so deep links to `/sign-in` still work. No duplicate divergent UIs.

## Behavior matrix
| State | Video | Still | Sign in btn | Email/password | Office footer |
|---|---|---|---|---|---|
| Playing animation (no skip) | playing once | hidden | **hidden** | hidden | hidden |
| Animation finished naturally | gone | 2nd-to-last frame still | **fade in** | hidden until Sign in | hidden until fields shown |
| User taps Sign in (after finish) | — | still | visible | **fade in** | **fade in** |
| User taps anywhere **during** animation | stop/unload | still immediately | **fade in** | **fade in** | **fade in** |

- After any completion/skip path: orientation changes only swap stills (no replay) — keep `splashSessionCompleted` (or equivalent) session flag.
- Sign-in submit: same `signInWithPassword` → `refresh` → `router.replace('/')` as today. Busy/error states on this screen.
- Neon violet→cyan Sign in button (existing `SplashSignInButton` / gradient). Fields should remain readable on black (theme-aware inputs or light-on-dark treatment that fits neon splash — keep usable contrast).

## Assets
- Re-extract stills from splash MP4s as **second-to-last frame** (or scan backward for first non-near-black frame if 2nd-to-last is still black). Overwrite:
  - `assets/brand/splash/kelyra_splash_still_16x9.png`
  - `assets/brand/splash/kelyra_splash_still_9x16.png`
- Verify stills show full neon Kelyra wordmark, not black.

## Files (likely)
- `src/components/ui/SplashLanding.tsx` — become the unified splash + auth UI (or rename clearly)
- `src/components/ui/splashBrand.ts` — stills/sources
- `src/components/ui/SplashSignInButton.tsx` — reuse
- `src/app/index.tsx` — signed-out gate wires unified component; no push to `/sign-in` for the primary path
- `src/app/sign-in.tsx` — redirect to `/` or re-export same UI so old links work
- Tests: `splashLanding.test.ts`, update security/sign-in tests that assumed separate screen KelyraMark/wordmark/bootstrap blurb
- Fade: `Animated` opacity (RN) is fine; keep deps light

## Constraints
- Class app only. No commit/push. No DNS.
- No public teacher signup. Fail-closed auth unchanged.
- Teachers must not create classes (untouched).
- typecheck + tests green. 0 P0/P1.
- Smallest coherent change; don’t invent product beyond this flow.

## Acceptance
1. Stills are second-to-last (or non-black) end frames with visible logo.
2. During animation: no Sign in button.
3. After natural end: still + Sign in fades in; fields stay hidden until Sign in.
4. Tap Sign in: fields + office footer fade in; submit works.
5. Tap anywhere mid-animation: still + button + fields + footer fade in; can sign in immediately.
6. No separate second sign-in screen required for the happy path; `/sign-in` doesn’t strand users on the old UI.
7. Rotate after complete: still only, no replay.
