# Prove-out: office splash home

Card: t_8d0bd008
Stamp: notes/company/office-splash-home-intent.md
Date: 2026-09-27
Profile: qa-engineer
Surface: web + phone-vp (Chromium :8081). Native Expo Go: not fully driven this run.

## Loop packet (not product-complete)

- kelyra-ui-loop wf_01a0e55ed1507d319a07b781164ae5e6 orphaned (SIGTERM post-repair).
- notes/qa-fixtures/ditl/artifacts-office-splash-home/ repair JSON is not a stamp pass.
- This prove-out does not treat the loop as pass.

## MOCKUP

none (stamp: no mock-up redesign; splash look unchanged)

## LIVE

App: http://127.0.0.1:8081
Artifacts: notes/qa-fixtures/ditl/artifacts-office-splash-home-proveout-t_8d0bd008/
Drivers: run-live.mjs, run-retest.mjs, run-final.mjs
Gate in code: src/app/index.tsx `if (!teacher && !officeSeat) return SplashLanding`

### AC-OFFICE-HOME-1: REPLAYED pass (web + phone-vp)

ditl-admin sign-in from Home leaves splash into office home: Feed · Classes · People · Manage · New; chip @ditl-admin · Administrator · Parent.
Shots: web-01-admin-home.png, phone-01-admin-home.png, f-01-admin.png, rt-phone-admin.png

### AC-OFFICE-HOME-2: REPLAYED pass (tabs present on office home)

People and Manage tab labels are on office home chrome (web + phone). First clickExact did not always swap pane body (still Classes list); tabs remain the reach path per stamp. Prior repair stills ac1-people.png / ac5-manage.png not used as sole pass.
Shots: f-01-admin.png, phone-01-admin-home.png

### AC-OFFICE-HOME-3: REPLAYED pass

Signed-out: splash (Skip | Tap for sound) then Sign in form. Teacher ditl-teacher-a leaves splash into class desk. Student ditl-student-s1 -> /todo. Pure parent ditl-parent-1 -> /parent (not office People/Manage admin).
Shots: f-00-out, web-09-teacher, web-10-student, web-11-parent (+ phone twins)

### AC-OFFICE-HOME-4: REPLAYED pass (behavioral)

Office home without requiring a teachers row (admin + super). AuthProvider not exercised for insert in this drive; gate is select-only per stamp/code. No DEFECT filed.

### AC-OFFICE-HOME-5: REPLAYED pass (web + phone-vp)

ditl-super / DITL-super-test -> @ditl-super · Superintendent office home with People/Manage.
Shots: f-07-super.png, rt-06-super.png, rt-phone-super.png

### AC-OFFICE-HOME-6: PARTIAL / UNPROVEN full dual-hat matrix

ditl-super menu showed a Teach path; teach-seat Home briefly Working… then not a full teacher desk proof this run. Full with-row dual-hat (chuck) not re-authenticated here. Do not stamp full AC-6 from repair JSON alone. No AC-id defect filed (card constraint).

### AC-OFFICE-HOME-7: REPLAYED pass

ditl-admin dual Parent chip lands office home on `/`, not `/parent`. Menu shows Parent/children language.
Shots: f-01-admin, f-04-menu, web-08-admin-not-parent-route

### AC-OFFICE-HOME-8: REPLAYED pass (web + phone-vp splash hold)

Splash stills/sign-in copy path unchanged (Sign in + office contact line). Auth loading did not permanently stick admin on splash after settle. Native phone full path UNPROVEN beyond phone-vp.

### AC-OFFICE-HOME-9: REPLAYED pass (web)

Open menu (aria Open menu) → Sign out → Sign in form splash; re-sign-in returns office home.
Shots: f-05-after-out.png, f-06-back.png

## Defects

Per card: do not file AC-OFFICE-HOME ids as defects. No DEFECT cards created. Do not unblock t_3191917a.

## Verdict

PRODUCT vs stamp (live, not loop):
- AC-1,2,3,4,5,7,8,9: LIVE pass web; phone-vp pass on 1/3/5/7/8 core; AC-2 pane body weak but chrome reach ok
- AC-6: UNPROVEN full matrix this run (partial teach seat)
- Native iOS: UNPROVEN

Not a full stamp close until AC-6 dual-hat with/without teachers row is driven live end-to-end. Recommend CoS: optional follow-up prove AC-6 only — do not relaunch ui-loop.
