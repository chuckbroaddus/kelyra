# Student Turn in of assigned practice

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_9c0ee2de`
**PM card:** `t_08a3739f` (parallel; this seat does not wait)
**Lane:** `t_036d43d9`
**Finding:** `t_ae57706e` (blocked, unassigned; do not unblock; do not parent onto it)
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so a student Turn in submits the assigned practice work. Do not fix this by editing sandbox seed only.
**Status:** QA Supervisor DESIGN STAMP below. Not Eng from this seat. No `src/`. No new Turn in screen. No seed-only fix.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: student Turn in submit of assigned practice
Quality goals: AC-TURNIN-1, AC-TURNIN-2, AC-TURNIN-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_9c0ee2de
Intent gaps remaining: none
```

Surface: both
Persona: student
Motion: none
AC-TURNIN-1: Turn in on an assigned practice row succeeds, and the row no longer says it could not submit.
AC-TURNIN-2: A row that is already submitted is not submitted a second time.
AC-TURNIN-3: Another student's work is not changed.

## 1. What is broken

The student already has one Turn in control. It is the primary button on the existing todo detail, `src/app/todo/[submissionId].tsx`, phone and web. That button calls `submitStudentTodo`, which calls `student_submit` for the opened submission id. There is no second composer.

DITL-S-01-UI-01, confirmed on DITL-S-03-UI-02: Jordan Lee opened the seeded assigned row ditl-PhaseB Assign NoUnhide (submission 8c1e6ed0). The screen showed the title and Turn in, and no prompts. Turn in showed Could not submit. `student_submit` returned 400: Submission not found or already submitted. The row stayed started, with empty items and kind=planned. No cross-student bleed.

The list still shows that row as the student's own open work. The button is shown because the status is open (`assigned` or `started`), not because kind is `practice`. The live `student_submit` (migration `20260825000001_submission_lifecycle.sql`) updates only when the row is that student's, status is `assigned` or `started`, and assignment kind is `practice`. A miss raises the same exception as a missing row or an already submitted row. That is why this open started row 400s.

That 400 is the failure. The fix is the product path from this Turn in to a successful submit of that assigned work. Changing the sandbox seed so the row is kind=practice, or so it has items, is not the fix.

## 2. Hats and entry

**Student.** The only hat. Jordan Lee (and any student on the student seat) opens their own assigned row and uses the existing Turn in. Surface is phone and web. The same route is both. Motion is none. Do not add a gesture, a new button, or a new screen.

**Not teacher, parent, or office.** Those seats do not gain Turn in. Teacher Approve stays the grade. Parent stays read-only. Office is out.

**Dual-hat.** This control stays on the student seat only. A person who also has another role does not get a second Turn in on teacher, parent, or office chrome. Switching away from the student seat does not submit. Switching back uses the same existing detail. Do not invent a dual-hat menu for this bug.

**Entry.** Assignments (`/todo`) and the focus list that already opens the same detail (`/todo/[submissionId]`). DITL-S-01 and DITL-S-03 are the same control. Ask stays UI-primary. Do not make Ask the submit path. Do not add a composer.

## 3. Lifecycle

**Start.** The student opens one assigned row. Opening may mark `assigned` to `started` as it does today. That mark is not this bug. The row they can already open, including started, empty items, kind=planned, is the work Turn in must submit.

**Finish.** Turn in on that open row succeeds. `student_submit` does not return 400 Submission not found or already submitted for that own open row. The screen does not say Could not submit. The row does not stay started. Success leaves by the path already in the screen: done tab, replace `/todo`. No new confirmation screen. Empty items do not block submit. The student is not required to have answer fields. Answers may be empty. That is still a submit of the assigned work they opened.

**Already submitted.** A row that is already submitted (`completed` or `graded`, or otherwise not open) is not submitted a second time. A second attempt does not write a new submit, does not move status again, and does not change that row's submitted time as a new turn-in. The open planned row in the evidence is not "already submitted." The shared error text must not be used to reject that open row.

**Leave without Turn in.** Back or navigate away without Turn in does not submit. No new cancel control. Do not regress that leave.

**Multiplicity.** Turn in submits only the opened submission. It does not submit every open row, and it does not submit another class's row. Another student's row on the same assignment is unchanged. Same student, other class, unchanged except the opened row.

## 4. Acceptance

These are the lock. They do not add a second product.

**AC-TURNIN-1.** Turn in on an assigned practice row succeeds, and the row no longer says it could not submit. The assigned practice row is the row the student already opened, including the failure shape: own row, status started (or assigned), empty items, kind=planned. Success is that submit, on phone and web, through the existing button. The row leaves started. Could not submit is gone. A seed edit that only relabels kind or adds items, while this Turn in still 400s on that shape, is not success.

**AC-TURNIN-2.** A row that is already submitted is not submitted a second time. Second attempt does not count as a new submit.

**AC-TURNIN-3.** Another student's work is not changed. Own `student_id` only. No cross-student write. No cross-student bleed.

## 5. Non-goals

**No new Turn in screen.** No second button, no second composer, no new route.

**No seed-only fix.** Do not treat a sandbox edit of ditl-PhaseB Assign NoUnhide as the product fix.

**No grade.** Nothing is a grade until the teacher Approves. This stamp does not Approve, and does not change teacher grading.

**No other hat.** Teacher, parent, and office do not receive this control.

**Ask is not the fix.** Submit stays on the existing Turn in. Ask remains the dual path that points at that UI.

**Do not unblock `t_ae57706e`.** Do not parent work onto it. Do not staff Engineering from this card.

## 6. DITL IMPACT

```
DITL IMPACT
Change: Student Turn in on the existing todo detail submits the assigned practice row the student already opened, including the started / empty items / kind=planned shape that 400s today. Already submitted is not submitted again. Other students unchanged. No new screen. No seed-only fix.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: QA Supervisor (t_9c0ee2de) owns this verdict: NONE. DITL-S-01-UI-01 and DITL-S-03-UI-02 already expect Turn in / complete to record the student's own work. The wall is the product 400, not a missing plan. Do not rewrite those plans or cases to describe the bug. Do not add a seed step that changes kind to practice or inserts items. Prove-out re-runs those cases against the product fix. Do not unblock t_ae57706e. Do not staff ditl-scribe from this card.
```

## 7. Prove-out

Chief of Staff staffs `qa-engineer` from the OBJECTIVE below after the Surface workflow is terminal. This seat does not staff that card and does not grade the screenshots. Loop passed is not product-complete.

## 8. Handoff

**WORK PERFORMED:** Reviewed the locked Turn in choice against the existing todo detail, `student_submit`, and the DITL-S-01 / DITL-S-03 evidence. DESIGN STAMP APPROVED on this note and on card `t_9c0ee2de`.

**VERIFICATION:** Turn in is one primary button on `src/app/todo/[submissionId].tsx` for open status, phone and web. It calls `student_submit`. That function updates only an own `assigned` or `started` row whose assignment kind is `practice`, and otherwise raises Submission not found or already submitted. The evidence row is own, started, empty items, kind=planned, so the update misses. No new screen was designed. No app code was changed.

**RESULT:** QA Supervisor APPROVED 2026-09-27. Intent gaps remaining: none. DITL IMPACT: NONE.

**OPEN ISSUES:** None on this stamp. PM stamp is the parallel card `t_08a3739f`. Engineering is not staffed from this seat.

**ESCALATION NEEDED:** No. Do not unblock `t_ae57706e`.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the PM stamp. If both are APPROVED, start the Surface workflow with the lock lines, then staff qa-engineer from the PROVE-OUT OBJECTIVE. If either is REJECTED, comment that gap on `t_ae57706e` and stop.

