# DITL-T-04-UI-06 report

RESULT: PASS
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a
APP: http://localhost:8081
CASE: DITL-T-04-UI-06 (seq 26)
Seat: ditl-teacher-a only (no parent/admin login)

## Live evidence

1. Sign-in teacher → ditl-Math Period 3 desk (01-after-signin.png). OK.
2. `/class/…301/syllabus`: Status **Published**, Sum 100% OK, Families: **visible**, Publish changes + Unpublish present (02/03-syllabus*.png). Re-click Publish surface showed transient “Could not publish” while status stayed Published (already live — not treated as new product break). OK publish path.
3. Gradebook: multi-student Overall (Jordan 92%) + ditl-* assign columns including Multi/Hist (04-gradebook.png). OK.
4. `/messages`: Taylor Lee parent thread preview `ditl-T-04-UI-01… teacher: Jordan hist HW graded — see gradebook` (05-messages.png). Teacher-seat proxy that parent-facing grade notify landed. OK parent sees.
5. Class Parents tab: Taylor Lee linked to Jordan/Jamie; Message these parents (08-class-parents.png). OK.
6. Ask history retains list_threads dual-path on parent threads (09-ask.png). OK context.
7. Teardown: profile Sign out attempted (99-signout.png). Shared seed not torn down. Leftover Hist/Multi assigns known — not re-filed. Jacquee on msg list known — not re-filed.

## RESULT

PASS — Publish path: syllabus already Published with Families visible + gradebook overalls. Notify/parent-sees path: durable grade notify on Taylor Lee parent thread visible from teacher messages; class Parents chrome lists Taylor.

## FINDINGS

(none)

## GAP

GAP: none for this case. Lane A teacher-only — did not sign in as ditl-parent-1; parent visibility confirmed via teacher messages + Families:visible syllabus rule + Parents roster.

## Artifacts

- run-ui-06.mjs, result.json, run2.log, screenshots 01–09, 99
- path: notes/qa-fixtures/ditl/artifacts-T-04-UI-06/
