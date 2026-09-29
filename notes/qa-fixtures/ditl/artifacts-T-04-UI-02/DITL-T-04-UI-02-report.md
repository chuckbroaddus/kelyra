# DITL-T-04-UI-02 report

RESULT: PASS
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://localhost:8081
CASE: DITL-T-04-UI-02 (weighted overall verify)
SCHOOL: ditl-Sandbox Academy
SEAT: ditl-teacher-a (teacher only)

## Evidence (live)
- Sign-in → desk ditl-Math Period 3 (`d1715000-0000-4000-a000-000000000301`). Shot: 01-after-signin.png
- Gradebook: Overall row present; Jordan column shows **92%** overall and cell mark **92**; Jamie/Riley/Samira overall **—**. Shot: 02-gradebook.png + gradebook-dump.json
- Syllabus: **Status: Published**, Sum 100% · OK, categories homework / quiz / participation. Shot: 03-syllabus.png
- Heatmap tab opened (brief Working…). Shot: 04-heatmap.png
- Jordan student page reachable. Shot: 07-jordan-student.png
- Teardown sign-out attempted → /. Shot: 99-signout.png

## Calc note
Published syllabus + Overall engine path active. Jordan overall 92% matches visible graded cell 92 (single scored path / category average collapses to that mark). Other students blank overall with no graded cells — correct blank behavior under teacherOveralls.

## FINDINGS
(none)

## Artifacts
notes/qa-fixtures/ditl/artifacts-T-04-UI-02/
run-ui-02.mjs, result.json, run2.log, screenshots, dumps
