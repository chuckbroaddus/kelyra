# Splash logo vs Sign in — option pack

Recommendation only. Product Manager chooses. This note does not lock a pick, stamp intent, or change the app.

Source: `notes/company/splash-logo-center-measure.md`. No new pixel probe. No mockup. No Drive line. No persona. No seat.

## Job

Signed-out splash. `/` holds the settled still after the clip. `/sign-in` opens the same still with Sign in already up. The mark is ink in that still, not a separate wordmark. Sign in is the centered footer button.

## Measured sizes

Settled still only. Playback was not measured. The clip fades off this still before Sign in is the judged frame, so playback is not scored. Phone landscape is not a size: pre-auth phones stay portrait (`lockPreAuthPortrait`). The splash asset does not rotate there.

Positive miss means the mark is right of a viewport-centered Sign in button. Y is centered in the filed note (+4 px in the JPG, not scored). Footer `alignItems: 'center'` and `objectPosition: 'center'` are not treated as proof.

| Viewport | Asset | Mark X vs button | Result |
|---|---|---|---|
| 390×844 phone or web narrow | 9×16 | +11 px | Fail |
| 430×932 phone | 9×16 | +13 px | Fail |
| 768×1024 iPad portrait | 9×16 | +18 px | Fail |
| 800×800 web (height not greater than width) | 16×9 | +14 px | Fail |
| 1024×768 iPad landscape | 16×9 | +13 px | Fail |
| 1280×720 web | 16×9 | +12 px | Fail |
| 1440×900 web | 16×9 | +15 px | Fail |
| 1920×800 web | 16×9 | +18 px | Fail |
| Phone landscape | — | — | Not a splash size |

AC-SPLASH-CENTER-1 fails on every measured size. One miss is a miss. Live scrollbar was not measured.

Cover maps the JPG center to the viewport center. The neon letter-box is right of that center: +18.5 px on the 16×9 still (about 50.9% of 1920), +26.0 px on the 9×16 still (about 52.4% of 1080). That is why the mark sits 11–18 px right of the button.

A fixed `object-position` cannot close every row. CSS percentage alignment does not park an image point on the viewport center, and one value cannot hit both stills. Width-locked covers have no horizontal slack, so no anchor percentage moves X at all:

| Viewport | Horizontal slack (half the cover overflow) | Extra scale needed |
|---|---|---|
| 390×844 | about 42 px | no |
| 430×932 | about 47 px | no |
| 768×1024 | 0 | about 5% (9×16) |
| 800×800 | about 311 px | no |
| 1024×768 | about 171 px | no |
| 1280×720 | 0 | about 2% (16×9) |
| 1440×900 | about 80 px | no |
| 1920×800 | 0 | about 2% (16×9) |

Slack is derived from the filed offsets and cover math. It is not a new pixel probe.

## Options

Three stances. Not pixel tweaks of one idea.

### 1. No change

Job stays the shipped splash: full-bleed still, Sign in in the lower third, no teacher chrome.

Before and after are the same. The mark stays 11–18 px right of Sign in on every measured size.

Constraints honored: nothing moves. `docs/ui-design.md` signed-out splash, portrait-only phones, centered footer, matcher and grades untouched.

Non-goals: calling cover-center a pass. The filed numbers are not on the centerline.

### 2. Crop anchor on the existing still

Job unchanged. Same still, same Sign in, same copy. Only the still's crop anchor moves so the letter-box center — not the JPG center — sits on the Sign in horizontal centerline.

Before: mark 11–18 px right. After: mark on that centerline at the eight measured sizes. Y stays cover-center. Do not chase the +4 px source Y.

File that would change: `src/components/ui/SplashLanding.tsx` (the settled `Image`, `resizeMode="cover"`). Do not edit it in this pack. Do not edit the JPGs. Do not move Sign in. Do not change `SplashVideo.tsx` or `SplashVideo.web.tsx`. Playback was not shown to be off.

The change is not one shared `object-position`, and not one percentage per still. Those cannot hit both letter-boxes (50.9% vs 52.4%), and they cannot move X when cover has no horizontal slack (768×1024, 1280×720, 1920×800).

Rule for a builder, after PM chooses:

- Keep the shipped JPGs.
- Place the 16×9 letter-box (+18.5 px on 1920) and the 9×16 letter-box (+26.0 px on 1080) on the viewport horizontal center.
- Where cover already has more horizontal slack than the miss, do not scale past cover.
- Where slack is zero, scale just enough that the frame still covers after that shift: about 2% on 16×9, about 5% on 9×16. That is a tighter crop of the same still, not a new composition.
- `splashLanding.test.ts` locks `resizeMode="cover"` and web `objectPosition: 'center'`. Those locks are not this change. A builder who drops the cover string will hit the test. This pack does not edit the test.

Constraints honored: signed-out splash in `docs/ui-design.md`, no teacher chrome, phones stay portrait-only, no new glyphs, matcher never inserts a student, nothing becomes a grade.

Non-goals: a new still, moving Sign in, a playback retune, a scrollbar fix (not measured), office splash-stuck, auth.

### 3. New still

Only if a tighter crop on the three width-locked sizes is rejected as a new look. Then a new still is required, and this pack stops. The still is not designed here. No mockup path.

## Recommendation

Recommendation only: option 2. Product Manager chooses. This pack does not lock it.

Option 1 does not match the filed misses (11–18 px right on every measured size). Option 3 is not required. The mark is already in the still. A crop anchor in `SplashLanding.tsx` can put that ink on the Sign in centerline without a new composition. The about 2% / about 5% extra scale is only for the three width-locked sizes, so the shift does not uncover an edge.

`docs/ui-design.md` is not patched. After the choice is recorded, the designer may record option 2 there and only there.

Open, not scored: live scrollbar; playback frames. Drive line is not invented.
