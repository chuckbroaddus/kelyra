# Splash logo centering — IQG intent (phase 1)

Date: 2026-09-28
Card: t_90e16065
Parent: t_e39e470a
Pack: notes/company/splash-logo-center-options.md (designer t_608e362f, done)
Measure: notes/company/splash-logo-center-measure.md
PM: t_11031ee7 chose option 2. PM stamp on the parent is still REJECTED until PM copies the proof line. Note: notes/company/splash-logo-center-pm.md
Author: qa-supervisor
Status: QA Supervisor APPROVED 2026-09-28 on t_19fd75aa. Drive gap closed. Option 2 stands. Not a new still.
Restamp: t_19fd75aa. Stamp 1 on t_90e16065 stays REJECTED. That reject was only the missing Drive line.

Drive: not a Drive click. Chuck 2026-09-28: prove the settled signed-out splash with Sign in visible, no tray tap.

This note does not implement, staff Engineering, or choose an option. It does not invent a click, Persona, Seat, or Mockup path. The line above is copied from Chuck.

## CEO ask

Chuck, 2026-09-28: on some devices and web pages the logo/splash looks off-center and not directly over Sign in.

## Today

Facts from the pack and the screen. This note does not re-measure pixels.

Signed-out splash is `SplashLanding`. `/` mounts it without `initialRevealForm`, so the clip plays, then the settled still, then Sign in. `/sign-in` mounts it with `initialRevealForm`, so the form is already revealed on the same still.

The mark is ink in the shipped still, not a separate wordmark. Sign in is the centered footer button (`label` `Sign in`). Cover plus `objectPosition: 'center'` centers the JPG box. That is not the same as the mark sitting on the button. Footer `alignItems: 'center'` is not proof.

The pack, from `notes/company/splash-logo-center-measure.md`, scores the settled still only. Positive miss means the mark is right of a viewport-centered Sign in button. Y is centered in the filed note (+4 px in the JPG) and is not scored.

| Viewport | Asset | Mark X vs button | Result |
|---|---|---|---|
| 390×844 phone or web narrow | 9×16 | +11 px | Fail |
| 430×932 phone | 9×16 | +13 px | Fail |
| 768×1024 iPad portrait | 9×16 | +18 px | Fail |
| 800×800 web | 16×9 | +14 px | Fail |
| 1024×768 iPad landscape | 16×9 | +13 px | Fail |
| 1280×720 web | 16×9 | +12 px | Fail |
| 1440×900 web | 16×9 | +15 px | Fail |
| 1920×800 web | 16×9 | +18 px | Fail |

AC-SPLASH-CENTER-1 fails on every measured size. One miss is a miss. The neon letter-box is right of the JPG center: +18.5 px on the 16×9 still (about 50.9% of 1920), +26.0 px on the 9×16 still (about 52.4% of 1080). That is why the mark sits 11–18 px right of the button.

A fixed `object-position` cannot close every row. Width-locked covers have no horizontal slack (768×1024, 1280×720, 1920×800), so no anchor percentage moves X there. Playback was not measured. Live scrollbar was not measured. Phone landscape is not a splash size: `lockPreAuthPortrait` locks native phones (shortest side under 720, not web, not iPad) to portrait. The lock is a no-op on web and tablet, which is why iPad landscape and wide web are in the table.

PM card t_11031ee7 locked option 2 on parent t_e39e470a and in notes/company/splash-logo-center-pm.md. This seat does not reopen the choice. PM's own stamp text is still REJECTED until PM copies the proof line. That is not an intent gap.

The Drive gap is closed. Copied, not invented:

Drive: not a Drive click. Chuck 2026-09-28: prove the settled signed-out splash with Sign in visible, no tray tap.

Source: `.grok/skills/verify-kelyra/features/splash-center.md` and the README Splash centering row. Phone sign-in stays a different note. This note does not invent `/ click=[aria-label=Sign in]` or any other click.

## Hats

Signed-out visitors on phone and on web. That is the only hat.

This is not an office, teacher, parent, student, or superintendent tray. Dual-hat does not apply. There is no seat on this screen. Persona is omitted. Seat is omitted.

A signed-in person who still sees the splash is not this bug. That is office splash-stuck, card t_3191917a. Do not fold it in.

## Entry

Two doors. No in-app chrome. No tray tab. No header icon.

- `/` (`src/app/index.tsx`) mounts `SplashLanding` without `initialRevealForm`. The clip plays, then the settled still, then Sign in.
- `/sign-in` (`src/app/sign-in.tsx`) mounts `SplashLanding` with `initialRevealForm`. The form is already revealed. There is no clip to wait through.

Sign in stays the footer button. Do not move it to make the mark look centered. Do not add a second control for this bug.

## Lifecycle

Judge the settled still with Sign in visible. That is the frame the pack scored.

**Playing.** `/` plays the clip, then fades onto this still. Playback was not measured. PM put it out of this acceptance. Do not retune `SplashVideo.tsx` or `SplashVideo.web.tsx`. A later measurement that shows the mark off before settle is a new card, not this stamp.

**Skip.** The control is `accessibilityLabel` `Skip splash`. Skip cuts the clip and shows the settled still. Alignment is required after skip, same as after the clip ends on its own. Do not add a second skip.

**Settled still.** Required. Mark visual center on the Sign in horizontal centerline. Y stays cover-center. Do not chase the +4 px source Y.

**`/sign-in` already revealed.** Required. Same still, form already up, no playback. The centerline rule is the same as the settled still on `/`.

**Finish of this bug.** The still meets AC-SPLASH-CENTER-1 on every measured size. A successful login is not the finish. Do not require credentials to judge alignment.

## Multiplicity

One miss is a miss. All eight measured sizes fail today.

| Class | What is in scope | Today |
|---|---|---|
| Phone portrait | 390×844, 430×932, 9×16 still | Fail, +11 and +13 px |
| Phone landscape | Not a splash size | `lockPreAuthPortrait` holds native phones in portrait. Do not require a phone-landscape splash shot. If a handset ignores the lock and the asset rotates, that is an orientation miss, not a pass of this AC. |
| Tablet portrait | 768×1024, 9×16, width-locked | Fail, +18 px |
| Tablet landscape | 1024×768, 16×9 | Fail, +13 px |
| Web narrow | 390×844 uses the 9×16 still | Fail, +11 px |
| Web square and wide | 800×800, 1280×720, 1440×900, 1920×800 | Fail, +14, +12, +15, +18 px |

Web and iPad are not portrait-locked. Wide web and iPad landscape are in scope. Phone landscape is not, unless the lock fails and the asset rotates.

Live scrollbar was not measured. Do not treat an unmeasured scrollbar as a pass or as a required fix.

## Reverse / cancel

There is no cancel on the mark. Do not add one.

Skip is the reverse of waiting out the clip. After skip, the settled still must already be on the centerline. A visitor must not have to wait for the clip to see a centered mark.

`/sign-in` is the already-in-flow door. The form is up. Alignment is required with no playback and no skip.

Leaving the screen (back, or a successful sign-in) is not this bug. Sign-out is not this screen. Do not add a leave control.

## Non-goals

Explicitly out. "Not built" here is not "done."

- Not a new brand composition. Not a new still, unless PM stops for Chuck (option 3). This note does not design that still. Mockup is omitted.
- Not moving Sign in, the footer, or the copy to fake a centerline.
- Not office splash-stuck (t_3191917a).
- Not auth logic, matcher, grades, or a new student.
- Not a tray, a header icon, or any in-app chrome.
- Not a playback retune, unless a later measurement shows the mark off before settle.
- Not a scrollbar fix. It was not measured.
- Not chasing the +4 px source Y.
- Not a click invented by this seat. Chuck named the proof. The gap is closed. Do not add a tray tap or a Sign in click to judge the still.
- Not `docs/ui-design.md` from this seat. After PM records a choice, the designer may record option 2 there and only there.

## Quality goal

AC-SPLASH-CENTER-1. After the splash settles, and on `/sign-in`, the Kelyra mark's visual center is on the same horizontal centerline as the Sign in button.

Phone and web. Settled still with Sign in visible. After skip, same rule. `/sign-in` already-revealed form, same rule. One measured miss is a miss. Y is not the goal.

Surface: both. Motion: settled still with Sign in visible. Persona: omit. Seat: omit. Mockup: omit.

## Locked choice

Product Manager has chosen. This seat does not reopen it.

Locked choice: option 2, crop anchor on the existing still. Recorded on t_e39e470a and in notes/company/splash-logo-center-pm.md. Not option 1. Not option 3. Not a new composition.

The pack's three stances, and what the lock means:

1. No change. The mark stays 11–18 px right on every measured size. That does not meet AC-SPLASH-CENTER-1. This seat will not APPROVE a stamp that claims the quality goal is met under option 1. Choosing it is a decision not to fix, not a pass.

2. Crop anchor on the existing still. Same stills, same Sign in, same copy. The letter-box center, not the JPG center, sits on the Sign in horizontal centerline. File that would change: `src/components/ui/SplashLanding.tsx` (the settled `Image`, `resizeMode="cover"`). Do not edit the JPGs. Do not move Sign in. Do not change `SplashVideo` on this evidence.

   Builder rule, now that PM has chosen this option:

   - Keep the shipped JPGs.
   - Place the 16×9 letter-box (+18.5 px on 1920) and the 9×16 letter-box (+26.0 px on 1080) on the viewport horizontal center.
   - Where cover already has more horizontal slack than the miss, do not scale past cover.
   - Where slack is zero (768×1024, 1280×720, 1920×800), scale just enough that the frame still covers after the shift: about 2% on 16×9, about 5% on 9×16. That is a tighter crop of the same still, not a new composition.
   - `splashLanding.test.ts` locks `resizeMode="cover"` and web `objectPosition: 'center'`. Those locks are not this change. Do not delete them to bless a mis-centered cover. If the chosen anchor is not `center`, the test must lock the chosen anchor. It must not be removed to hide the miss.

3. New still. Only if a tighter crop on the three width-locked sizes is rejected as a new look. Then stop for Chuck. This pack does not design the still. No mockup path. This seat does not APPROVE option 3. A new look is a CEO stop, not a build.

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
PM: REJECTED  date: 2026-09-28  profile-session: product-manager / t_11031ee7
QA Supervisor: APPROVED  date: 2026-09-28  profile-session: qa-supervisor / t_19fd75aa
Intent gaps remaining: none
```

Stamp 1 (t_90e16065) stays REJECTED. That reject was only the unnamed Drive line. The line is now copied. This seat does not reopen option 2 and does not APPROVE a new still.

QA Supervisor: APPROVED. Hats, entry, lifecycle, and the eight measured sizes are covered by option 2 plus that proof line. PM's stamp on the parent is still REJECTED until PM copies the same line. Engineering stays unstaffed until both stamps on t_e39e470a say APPROVED. This seat does not staff PM.

## DITL IMPACT

Change: signed-out splash logo alignment vs Sign in (phone and web), only if a fix is chosen
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: PM chose option 2 (crop anchor on the existing still). That fix does not change a Day-in-the-Life beat. The proof line does not change one either. It is how to look at the settled splash. No tray tap. No sign-in. Plans already say opening Kelyra / splash / school logo stay still and do not drive Soft from app open alone. No plan and no case scores the mark against the Sign in centerline. Option 3 was rejected, so no new still. Verdict stays NONE. CoS does not file DITL-UPDATE from this NONE.

## Gaps

The Drive gap is closed. Not guessed. Not a remaining real-world path.

1. Drive line was the only stamp blocker. Closed. Copied, not invented:

Drive: not a Drive click. Chuck 2026-09-28: prove the settled signed-out splash with Sign in visible, no tray tap.

2. PM choice is closed. Option 2 is locked. Not a remaining gap.
3. Playback was not measured. PM put it out of this acceptance. Not a scored miss. Not a reason to retune the clip. A later measurement that shows the mark off before settle is a new card, not this stamp.
4. Live scrollbar was not measured. PM put it out of this acceptance. Not a scored miss. Not a required fix.

Hats, entry, lifecycle, multiplicity, reverse, and non-goals were already specified against locked option 2. This restamp did not reopen them. No new gap.

