# Splash logo vs Sign in — PM lock

**Status:** Choice locked. PM stamp APPROVED. Not a build until QA Supervisor also APPROVED.
**Date:** 2026-09-28
**Card:** t_c06ab5f6 (restamp). Prior choice: t_11031ee7
**Parent:** t_e39e470a
**Options:** notes/company/splash-logo-center-options.md (t_608e362f)
**Author:** product-manager

## Choice

**2 — Crop anchor on the existing still.** Not 1. Not 3. Not a mix.

The mark is ink in the shipped still, not a separate wordmark. Sign in stays the centered footer button. The job does not change.

Option 1 is rejected. The filed measure fails AC-SPLASH-CENTER-1 on every named size. The mark sits 11–18 px right of a viewport-centered Sign in. Calling cover-center a pass would bless that miss.

Option 3 is rejected. A new still is not required. The designer did not say one is required. The about 2% extra scale on 16×9 and about 5% on 9×16 is only where cover has no horizontal slack, so the shift still covers. That is a tighter crop of the same still, not a new composition. Stop-for-Chuck is not this choice.

This card does not edit `SplashLanding.tsx`, the JPGs, the tests, or `docs/ui-design.md`.

## Acceptance

AC-SPLASH-CENTER-1. A builder implements this and nothing else. Do not invent chrome.

When the signed-out splash has settled, and when `/sign-in` opens with Sign in already up, the mark's visual center sits on the same horizontal centerline as the Sign in button. Phone and web. The mark is the neon letter-box in the shipped still, not the JPG file center, and not a separate wordmark.

Sizes, settled still, Sign in visible. Today each one fails. After the change, each one passes. One miss is a miss.

- 390×844, 9×16, today +11 px
- 430×932, 9×16, today +13 px
- 768×1024, 9×16, today +18 px
- 800×800, 16×9, today +14 px
- 1024×768, 16×9, today +13 px
- 1280×720, 16×9, today +12 px
- 1440×900, 16×9, today +15 px
- 1920×800, 16×9, today +18 px

Phone landscape is not a size. Pre-auth phones stay portrait. Do not add a landscape splash.

Y is already centered. Do not chase the +4 px source Y.

How:

- Keep the shipped JPGs. Do not replace them. Do not design a new still.
- Do not move Sign in. It stays the centered footer button in the lower third. Same label. Same button.
- Do not add teacher chrome, a wordmark, a tagline, or a second control.
- Change only the settled still crop in `src/components/ui/SplashLanding.tsx` (the settled `Image`, `resizeMode="cover"`). Do not edit `SplashVideo.tsx` or `SplashVideo.web.tsx`. Playback was not measured. It is not in this acceptance.
- Place the 16×9 letter-box (+18.5 px on the 1920-wide still) and the 9×16 letter-box (+26.0 px on the 1080-wide still) on the viewport horizontal center. That center is the Sign in button's horizontal center.
- Do not use one shared `object-position`. Do not use one percentage per still. Those cannot hit both letter-boxes, and they cannot move X when cover has no horizontal slack.
- Where cover already has more horizontal slack than the miss, do not scale past cover.
- Where slack is zero (768×1024, 1280×720, 1920×800), scale just enough that the frame still covers after the shift: about 2% on 16×9, about 5% on 9×16. Tighter crop of the same still. Not a new composition.
- Keep `resizeMode="cover"`. Do not drop that string to satisfy `splashLanding.test.ts`. Do not edit that test to bless the current mis-centered cover (`objectPosition: 'center'` is not a pass). A later build, after both stamps and a Chuck-named Drive line, may replace that lock with a lock that the letter-box center is on the Sign in centerline. This card does not edit the test.

Pass means the letter-box center and the Sign in button share one horizontal centerline at each named size. The old 11–18 px miss is not close enough.

Out of this acceptance: live scrollbar (not measured), playback frames (not measured), office splash-stuck, auth, matcher, grades.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: splash logo centering vs Sign in
Quality goals: AC-SPLASH-CENTER-1 — mark visual center on the Sign in horizontal centerline, phone and web, settled still and /sign-in
Surface: both
Drive: not a Drive click. Chuck 2026-09-28: prove the settled signed-out splash with Sign in visible, no tray tap.
Motion: settled still with Sign in visible
Persona: omit
Seat: omit
Mockup: omit
PM: APPROVED  date: 2026-09-28  profile-session: product-manager / t_c06ab5f6
QA Supervisor:
Intent gaps remaining: none
```

Choice stays option 2. The proof line is the one Chuck named, copied from `.grok/skills/verify-kelyra/features/splash-center.md`. This note does not invent a route, a click, or an aria-label. QA Supervisor stamps on their own card. Engineering stays unstaffed until that stamp also says APPROVED.

## Designer record

`docs/ui-design.md` §13.1 Signed out and §13.2 Hero. One sentence, not a redesign: the settled still's crop anchor puts the mark's visual center on the Sign in horizontal centerline; cover still fills the viewport; the shipped JPGs stay. Designer writes that. This card does not.
