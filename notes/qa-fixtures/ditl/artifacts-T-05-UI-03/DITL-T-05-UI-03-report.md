# DITL-T-05-UI-03 report (lane A)

RESULT: PASS

## Case
Field update path (canonical keys) on existing S1 Jordan Lee; updates only; clear works.

## Live evidence
- App: http://localhost:8081
- Browser: Chromium persistent /tmp/ditl-pw-lane-a
- Teacher: ditl-teacher-a (password not logged)
- Script: notes/qa-fixtures/ditl/artifacts-T-05-UI-03/run-ui-03.mjs
- result.json: PASS, findings=[]

## Evidence bullets
- Sign-in teacher seat → ditl-Math Period 3
- S1 Jordan Details tab: pre-existing card fields (Mar 15, phone, email, maple address); no case markers
- Edit sheet: set preferred_name=DITL-UI03-Pref, grade_or_age=UI03-G4 → Save
- After save: hero "DITL-UI03-Pref · Mar 15"; Details rows show both markers with Clear
- Clear Preferred name + Clear Grade or age (confirm) → markers gone; Add preferred name / Add grade or age
- S2 Jamie Lee Details: empty optional fields; no UI03 markers (no bleed)
- Profile → Sign out → /sign-in
- Screenshots: 01-signin … 11-signout under artifacts-T-05-UI-03/

## FINDINGS
(none)

## Notes
- Did not create student; cleared only preferred_name + grade_or_age case markers
- Left card phone/email/address/birthday on S1 (from prior UI-01 seed)
- Sign-out OK
- Do not implement / merge / unblock t_7ebea568
