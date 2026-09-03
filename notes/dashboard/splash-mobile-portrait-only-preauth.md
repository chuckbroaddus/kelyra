# Mobile: portrait-only login/splash; landscape only after sign-in (CEO 2026-08-30)

## Goal
On **mobile devices (phones)**, the pre-auth experience (splash + login on `SplashLanding`) must stay in **portrait only**. Ignore / lock out landscape while signed out. After the user successfully signs in, allow landscape again (app default).

## Scope
- **Mobile native (iOS/Android phone):** enforce portrait lock while showing splash/login (signed-out).
- **After auth** (teacher/staff/student/parent session established): unlock to allow portrait + landscape as today (`app.json` orientation default / all).
- **Web:** do not hard-lock browser orientation (not reliable). Portrait-first still OK for still/video choice; resizing web landscape is fine for now unless trivial.
- **Tablets:** CEO said “mobile device” — prefer lock portrait on **phones only** (`Platform` + smallest dimension / existing `layout.isPhone` if present). Tablets may keep default free orientation unless the codebase already treats them as phones.

## Implementation guidance
1. Add `expo-screen-orientation` if not present (Expo SDK 54 compatible) and wire plugin in `app.json` if required.
2. On `SplashLanding` mount (and `/sign-in` same component): if native phone, `ScreenOrientation.lockAsync(OrientationLock.PORTRAIT_UP)` (or PORTRAIT).
3. On successful sign-in (before/after `router.replace('/')`) and when auth session becomes signed-in in app root: `ScreenOrientation.unlockAsync()` (or lock to DEFAULT / ALL).
4. Also unlock on sign-out? If user returns to splash, lock portrait again — handle in SplashLanding mount and optionally AuthProvider logout path.
5. `app.json` can stay `"orientation": "default"` so post-login supports rotation; runtime lock handles pre-auth.
6. Splash still/video: on locked portrait phone, always use **9×16** assets (CEO JPGs + portrait MP4). No landscape splash path on phone while locked.
7. Do not break web splash crossfade architecture or unified auth.

## Tests
- Structural: SplashLanding locks portrait on native phone; unlock after sign-in path exists.
- typecheck green.

## Constraints
- Class app only. No commit/push. Smallest coherent change.
- 0 P0/P1.

## Acceptance
1. iPhone signed-out: rotating to landscape does not show landscape login UI (stays portrait lock).
2. After sign-in: landscape works again for the app.
3. Web still usable.
