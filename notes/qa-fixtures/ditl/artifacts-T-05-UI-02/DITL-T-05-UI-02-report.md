# DITL-T-05-UI-02 report (lane A)

RESULT: PASS

## Case
Verify matcher stays on seed S1 Jordan Lee; no bleed to S2-S5.

## Live evidence
- App: http://localhost:8081
- Browser: Chromium persistent /tmp/ditl-pw-lane-a
- Teacher: ditl-teacher-a (password not logged)
- Script: notes/qa-fixtures/ditl/artifacts-T-05-UI-02/run-ui-02b.mjs
- result.json: PASS, findings=[], bleedList=[]

## Evidence bullets
- Sign-in teacher seat → ditl-Math Period 3 (class d1715000-…0301)
- S1 Jordan Lee /student/2bcee429-…: header Mar 15; no twin fields; cardHits=[] for maple/alex/phone on wrong students
- S2 Jamie Lee /student/899214d4-…: Add details (empty bio); cardHits=[]; no Mar 15; no maple/alex
- S5 Samira Okonkwo /student/cd84bffd-…: preferred Sammy only; cardHits=[]; no Jordan card OCR
- Class twins: Jordan and Jamie both visible as distinct roster rows
- Sign-out: cleared session → /sign-in
- Screenshots under artifacts-T-05-UI-02/*.png

## FINDINGS
(none)

## Notes
- S3 Morgan not on Teacher A Math roster (seed) — no bleed surface
- S4 Riley id click flaky on Review row; first-name tray still shows Riley distinct from Jordan
- Do not create student; no product fix; shared seed left intact
