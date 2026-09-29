# Office splash home without a teacher row

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_7004c843`
**Finding:** `t_3191917a` (do not unblock from this card)
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. An office administrator gets into the office home without a teacher row. Do not seed a fake teacher row. Do not leave the splash gate as it is.
**Status:** PM DESIGN STAMP APPROVED (`t_7004c843`). QA Supervisor DESIGN STAMP APPROVED 2026-09-27 (`t_0baa4f63`). Dual stamp MET on this note. Not Eng from this seat. No `src/`. No splash redesign. Do not unblock `t_3191917a`.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: OFFICE SPLASH HOME — signed-in office seat leaves SplashLanding on Home without a teachers row
Quality goals: office-only, office+teacher, and office+parent reach the existing office home; People and Manage reachable; signed-out splash stays; teacher and student seats unchanged; no teachers insert
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_7004c843
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_0baa4f63
Intent gaps remaining: none
```

## 0. What is broken

Home (`src/app/index.tsx`) returns `SplashLanding` when `teacher` is null, before the office home renders. That runs after auth has settled.

`AuthProvider` is fail-closed. `shouldLoadTeacherRow` may select an existing `teachers` row for staff. `loadTeacherProfile` selects only. A missing row returns null. It must not insert.

Chrome already resolves an office seat from the profile (`administrator` or `superintendent`) with no teacher row. `isOfficeChromeRole` does not need `teacher`. The wall is the Home return, not a missing office home. Office home below that return already has Feed, Classes, People, Manage, and New when grants allow.

Sign-in already does `router.replace('/')` after a successful password sign-in. The person lands on Home and stays on the splash.

Surface: web and phone. Persona: office. Seat: office. Motion: none. Do not redesign the splash.

## 1. Stories

**Office-only.** As an office administrator with no teacher row, after I sign in I leave the splash and see the office home that already exists, so I can open People and Manage without a fake teacher record.

**Superintendent.** As a superintendent with no teacher row, I get the same leave-splash into that home. Manage still shows only what a superintendent can touch today. I do not gain administrator-only powers, and an administrator does not gain superintendent-only powers.

**Office who is also a teacher.** On the office seat (the default), I see office home whether or not a `teachers` row exists. If I already have a real `teachers` row, the teacher seat still leaves the splash into the teacher home as it does today, including the one-class redirect. Switching seats does not create a `teachers` row. A teacher seat with no row does not get a teacher home and does not get an inserted row.

**Office who is also a parent.** My job is office. I am not sent to the parent home on sign-in. I see office home. People and Manage are reachable. My children on Manage still opens the parent surface. The parent seat still reaches the parent home. No `teachers` row is created because I am also a parent.

**Everyone else.** A signed-out person still sees the splash. A teacher seat with a real `teachers` row, and a student seat, still leave the splash as they do today. A pure parent still leaves toward the parent home, not the office home.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-OFFICE-HOME-1.** A signed-in office administrator with no teacher row leaves the splash and sees the office home. Home is `/` after sign-in. Office home means the existing school home (tabs already built), not a new screen and not the splash video.

**AC-OFFICE-HOME-2.** People and Manage are reachable from that home. The People tab and the Manage tab on that home are the reach. `/?tab=people`, `/?tab=manage`, and `/admin/people` (redirect to the People tab) land on those panes, not the splash.

**AC-OFFICE-HOME-3.** A signed-out person still sees the splash. A teacher seat with a real `teachers` row, and a student seat, still leave the splash as they do today. A pure parent still does not see the office home.

**AC-OFFICE-HOME-4.** The fix does not create a `teachers` row for an office admin, a student, or a parent. Same ban for a superintendent and for an office person who is also a parent. Select-null is not an error and must not clear the session. A select failure is not fixed by an insert.

**AC-OFFICE-HOME-5.** A signed-in superintendent with no teacher row leaves the splash into the same office home. Administrator and superintendent grants on that home stay as they are today.

**AC-OFFICE-HOME-6.** Office who is also a teacher, on the office seat, sees office home with or without a `teachers` row. If a real row already exists, the teacher seat still leaves the splash into the teacher home as today. Seat switch does not insert a row. Teacher seat with no row does not render teacher home and does not render office home under a teacher seat. That hold is the existing splash. Do not invent a third screen for it.

**AC-OFFICE-HOME-7.** Office who is also a parent (`administrator` or `superintendent` with `parent_id`, not `role=parent`) lands on office home, not parent home. People and Manage are reachable. My children on Manage still opens parent. Parent seat switch still reaches parent home. No `teachers` row is created.

**AC-OFFICE-HOME-8.** Web and phone. Splash look, copy, and video do not change. While auth is loading, Home does not stick on the splash. After auth settles, an office seat proceeds to office home. No session and no office profile stays on the splash.

**AC-OFFICE-HOME-9.** Sign out from office home returns to the splash. Leaving the office seat and coming back shows office home again, still with no inserted `teachers` row.

## 3. Hats

| Hat | Leaves splash into | Teachers row |
|---|---|---|
| Office-only administrator | Office home | Must not create one |
| Superintendent | Office home | Must not create one |
| Office + teacher, office seat | Office home | Load an existing row if present. Never insert. |
| Office + teacher, teacher seat, row exists | Teacher home, as today | Keep the existing row. Do not insert another. |
| Office + teacher, teacher seat, no row | Not office home. Not a teacher home. | Must not insert. |
| Office + parent, office seat | Office home | Must not insert. |
| Office + parent, parent seat | Parent home, as today | Must not insert. |
| Pure parent | Parent path, as today | Must not insert. |
| Student | Student path, as today | Must not insert. |
| Teacher-only with a row | Teacher home, as today | Load only. |
| Signed-out | Splash | None. |
| Session missing or profile not office | Splash (fail closed) | Must not assume office. Must not insert. |

Default chrome seat for an office job is office, even when `also_teacher` or `parent_id` is set. Do not flip that default.

## 4. Entry and lifecycle

**Entry.** Sign in on the existing splash, then Home. Office seat shows the existing PersonTabs. People and Manage are tabs on that home, not new routes. Do not add a splash button, a new wordmark, or a new gate screen.

**Lifecycle.** Sign in → office home → People and Manage → sign out → splash. Seat switch office → parent → office, and office → teacher → office when a real teacher row exists, must not trap the office seat on the splash and must not insert a row.

**Multiplicity.** One school. Many people and classes on the existing lists. Admin and superintendent stay different grants. This fix does not add a school picker and does not merge seats into one tray.

**Reverse.** Sign out returns to the splash. Cancel is not a new control. A failed class list must not send the person back to the splash if they are a settled office seat. Empty classes may show the existing empty copy.

**Loading.** Office home may render while classes are still loading, same as an office seat that already has a teacher row. Do not hold the splash until classes load.

## 5. Non-goals

**Roster is out.** One try of `/admin/roster` said the screen does not exist. There is no `src/app` roster route. That miss is not this stamp. Do not add `/admin/roster`. Do not alias it to People. Do not treat it as a second product choice. People on the office home is the People surface this stamp unlocks.

**Logo attach is out.** `SchoolIdentity` still refuses a logo upload when `teacher` is null (`Sign in to attach a logo`). Do not mint a `teachers` row so that upload can run. Do not retarget that upload in this fix. Reaching Manage is in. Making logo upload succeed without a teacher row is not.

**Splash look is out.** No new splash layout, copy, video, or button.

**Other teacher gates stay.** Capture, inbox, profile, and any screen that already requires a teacher row stay that way. This stamp is Home for an office seat.

**Do not unblock `t_3191917a`.** Do not staff Engineering from this card. Chief of Staff staffs Engineering only after this stamp and the QA Supervisor stamp are both APPROVED.

**No permission widen.** Reaching People and Manage does not grant actions the matrix already denies.

## 6. DITL IMPACT

```
DITL IMPACT
Change: Signed-in office seat (administrator and superintendent, including office+teacher and office+parent) leaves splash into the existing office home without a teachers row. People and Manage on that home become reachable. Signed-out splash and teacher/student leave-splash stay. No teachers insert.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: QA Supervisor (`t_0baa4f63`) owns this verdict: NONE. DITL-O-01 through DITL-O-07 and DITL-DH-02 already expect sign-in then office chrome (People/Manage). The wall blocked execution (finding t_3191917a, case DITL-O-01-UI-01 and later office cases on the same wall). Do not rewrite those plans to describe the bug. Do not staff ditl-scribe from this card. Prove-out after Eng re-runs those office sign-in paths from Home, not from a direct-route workaround. /admin/roster in DITL-DH-02 stays a separate miss and is OUT of this stamp. Logo attach without a teacher row is also OUT. Do not unblock t_3191917a.
```

## 7. Handoff

**WORK PERFORMED:** QA Supervisor reviewed the locked office splash fix against live Home, fail-closed auth, and office chrome. DESIGN STAMP APPROVED on this note and on card `t_0baa4f63`. PM stamp remains APPROVED on `t_7004c843`.

**VERIFICATION:** Home returns `SplashLanding` when `teacher` is null (`src/app/index.tsx`). `AuthProvider` selects a teachers row for staff and does not insert. `loadTeacherProfile` is select-only. Office chrome does not need a teacher row. Office home tabs already include People and Manage. `/admin/people` redirects to `/?tab=people`. There is no `src/app` roster route. Sign-out is the leave. Signed-out, teacher, and student paths stay as they are.

**RESULT:** QA Supervisor APPROVED 2026-09-27. Intent gaps remaining: none. Not a build. Not a splash redesign. `/admin/roster` and logo attach without a teacher row are explicit non-goals. DITL IMPACT: NONE.

**OPEN ISSUES:** None on this stamp. Dual stamp is MET on this note. Engineering is not staffed from this seat.

**ESCALATION NEEDED:** No. Do not unblock `t_3191917a`.

**RECOMMENDED NEXT ACTION:** Chief of Staff staffs Engineering only because both stamps are APPROVED. Eng shape: stop Home from returning `SplashLanding` for a settled office seat with no teacher row. Do not insert a `teachers` row. Do not change splash look. Do not add `/admin/roster`. Do not retarget logo upload.
