# DITL-S-02-UI-01 report

RESULT: PASS
Lane: C · Chromium user-data-dir=/tmp/ditl-pw-lane-c
App: http://localhost:8081
User: ditl-student-s1 (Jordan Lee) · School: ditl-Sandbox Academy
Engine: Hermes SuperGrok · Case seq 39/78

## Live evidence

1. Sign-in ditl-student-s1 → /todo Jordan · Math+English chips.
2. /student/grades All: own column Jordan only; ditl-English HW S1=88; ditl-Math HW S1=92; PhaseB row; no S2 bleed.
3. Math filter attempted (chip ditl-Math Period 3); grades still list Math HW 92.
4. Tap ditl-Math HW S1 → FamilyAssignmentDetail: Category homework · Due 9/15/2026 · Submitted 9/10/2026 · Status Graded · Mark 92 · Counts toward homework average · Close. Still on /student/grades.
5. /ask opens (tray dual path). Prior practice thread visible (PhaseB started; Math/English HW graded).
6. Ask grades prompt path: no mutate language. Own-only recheck on grades OK.
7. Sign out → /sign-in.

## FINDINGS

(none)

## Notes

- Math class chip click left ?class=all (avg hero “Why this average?” not shown on All view); per-class average explain via assignment detail satisfied item explain.
- Did not mutate grades; no seed teardown; no finding cards filed.
- Artifacts: run-ui-01.mjs, 01–09 pngs, result.json, SUMMARY.txt.
