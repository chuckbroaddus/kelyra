# DITL-T-05-UI-01 report (EXEC 18, SuperGrok lane A)

## RESULT: PARTIAL

Core capture → student_card → existing Jordan Lee path **worked** on live :8081.
Teardown incomplete (sign-out flaky; metadata keys / note_only capture not fully cleared via UI).

## Engine / lane
- Engine: hermes · Pool: supergrok · Lane: A
- Browser: Chromium persistent `/tmp/ditl-pw-lane-a` (not 9223)
- App: http://localhost:8081
- Teacher: ditl-teacher-a (teacher seat only)
- Fixture: notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg (web library inject; PHYS camera is PHYSICAL-ONLY)
- Driver: notes/qa-fixtures/ditl/artifacts-T-05-UI-01/run-ui-01.mjs

## Evidence (live)

1. Sign-in → ditl-Math Period 3 desk (class d1715000-…0301). OK.
2. `/capture` drop well + Camera/Photo/Files. OK.
3. Library upload of student card fixture → Remove page. OK.
4. Note "Student card for Jordan Lee" + Ask AI → classify-capture hit; intent **This will be a student card**; fields proposed (Address 123 Maple St…, Phone (512) 555-0142, Email alex.rivera@school.edu, Birthday…). Copy: "We will not invent a student." OK.
5. Roster picker: Jordan Lee selected (not Jamie twin); Save details enabled. OK.
6. Save → navigated to `/class/…/student/2bcee429-11ce-4f84-b2de-9aab349f03cc` (Jordan Lee only). No new student. OK.
7. Student header shows Mar 15 (birthday read-back). Details tab click did not clearly surface full metadata panel in still 07 (Focus tab still dominant) — weak field UI assert. PARTIAL.
8. Sign-out: hamburger/profile path did not land on /sign-in (still class desk). MISS teardown step.
9. TEARDOWN_UI_CANDIDATES 0 — no Clear/Delete capture control found on student surface this run. Metadata keys + card capture may remain on S1 until a later cleanup pass.

Screenshots: `notes/qa-fixtures/ditl/artifacts-T-05-UI-01/01-after-signin.png` … `08-signout.png`
Machine log: `result.json`, `run6.out`

## Expected vs actual
| Expected | Actual |
| --- | --- |
| Card attached to S1 Jordan Lee only | YES — student id 2bcee429… |
| No new student | YES |
| Confirm fields | Proposed fields visible on capture sheet; full Details panel weak |
| Teardown metadata + delete artifact | NOT completed this run |

## FINDINGS
(none) — no unexpected SUPPORTED product break filed. Twin roster + no-invent copy behaved. Incomplete teardown is exec hygiene, not a product FINDING for this card.

## Notes
- Do not re-file Jacquee tray.
- Do not implement / merge / unblock t_7ebea568.
- Web used Photo library as stand-in for PHYS fixture (case tags PHYS; product web path supports library/files).

## RECOMMENDED NEXT ACTION
Chief of Staff records SuperGrok usage; optional follow-up cleanup of S1 metadata/card capture if shared seed must stay pristine; open next free lane.
