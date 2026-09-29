# Student Turn in submit of assigned practice

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_08a3739f`
**Lane:** `t_036d43d9`
**Finding:** `t_ae57706e` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**QA Supervisor card:** `t_9c0ee2de` (their stamp is not this note)
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so a student Turn in submits the assigned practice work. Do not fix this by editing sandbox seed only.
**Status:** PM DESIGN STAMP APPROVED (`t_08a3739f`). Not Eng from this seat. No `src/`. No new Turn in screen. No seed-only fix.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: student Turn in submit of assigned practice
Quality goals: AC-TURNIN-1, AC-TURNIN-2, AC-TURNIN-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_08a3739f
QA Supervisor: pending t_9c0ee2de
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: student
Motion: none
AC-TURNIN-1: Turn in on an assigned practice row succeeds, and the row no longer says it could not submit.
AC-TURNIN-2: A row that is already submitted is not submitted a second time.
AC-TURNIN-3: Another student's work is not changed.

## 0. What is broken

The student opened the seeded assigned row ditl-PhaseB Assign NoUnhide (submission 8c1e6ed0) on the existing practice screen (`/todo/[submissionId]`). Cases: DITL-S-01-UI-01, confirmed on DITL-S-03-UI-02. Turn in is the existing control. It calls `submitStudentTodo`, which calls `student_submit`. The screen showed Could not submit. `student_submit` returned 400: Submission not found or already submitted. The row stayed started, with empty items and kind=planned. No cross-student bleed.

The live `student_submit` updates a row only when it is owned by the signed-in student, status is assigned or started, and the assignment kind is practice. If that update matches nothing, it raises Submission not found or already submitted. Teacher Assign writes kind planned. This row exists, is owned, and is not submitted. The 400 is false. Empty items are why the screen has zero answer fields. Turn in is still shown for open work. A seed edit that flips this row to kind practice, or stuffs items, would hide the failure. That is not the fix.

To Do offers Open only for lesson or practice. The evidence case already reached Turn in on the existing screen. A known Open-pill miss is not this stamp. Do not add a screen to reach Turn in.

## 1. Stories

**Own open row.** As the student who owns an assigned practice row that is still assigned or started, I press the existing Turn in. `student_submit` records that submit. The screen does not say it could not submit. This includes the evidence shape: kind planned, items empty, answers empty. Kind practice, which already matches the RPC, must keep working.

**Phone and web.** Same Turn in, same RPC. Surface both. Motion none.

**Already submitted.** If that row is already completed or graded, a second Turn in does not write again. Status, answers, and submitted_at stay as they were.

**Other student.** Turning in my row does not change another student's submission, including a classmate on the same assignment.

**Not a grade.** A successful Turn in finishes the student's submit. It does not grade the work. Nothing is a grade until the teacher Approves.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-TURNIN-1.** Turn in on an assigned practice row succeeds, and the row no longer says it could not submit. The row is the student's own, still assigned or started, opened on the existing Turn in screen. Success includes the evidence shape (kind planned, items empty, answers empty) and kind practice. `student_submit` records the submit. The screen does not show Could not submit. The row does not stay started. A seed-only edit is not success.

**AC-TURNIN-2.** A row that is already submitted is not submitted a second time. Completed or graded is already submitted. A second call does not change status, answers, or submitted_at. The UI must not treat that second call as a new successful turn-in.

**AC-TURNIN-3.** Another student's work is not changed. Turning in one student's row does not update a classmate's submission, including on the same assignment. A call that is not the signed-in student's row does not write that other row.

**Must hold with those three.** Phone and web. The existing Turn in control only. No second composer. Submit does not grade. Kind practice does not regress. The false 400 must not fire when the student's own row is still assigned or started.

## 3. Hats and non-goals

| Hat | This Turn in |
|---|---|
| Student | Existing Turn in submits their own open assigned practice row. |
| Teacher, parent, office, superintendent | Do not use this control. Unchanged. |

Entry is the existing Turn in on `/todo/[submissionId]`, phone and web. Not a new screen.

Lifecycle: open assigned or started work, Turn in finishes the submit. Already submitted does not write again.

Multiplicity: only the opened submission. Other students and other assignments stay as they were.

Non-goals:

- No new Turn in screen. No second composer. No Ask submit path.
- No seed-only fix (kind, items, or status on the sandbox row).
- No list Open-pill work. That miss is not this stamp. Do not hide the assigned row. Do not remove Turn in.
- No lesson-player change. Lessons stay on their existing path. Do not pull lesson completion into this Turn in.
- No capture-kind widening. This stamp is assigned practice the student already opens on the existing Turn in screen.
- No new motion. No chrome invention. No grade on submit.
- Do not unblock `t_ae57706e`. Do not parent work onto it.

## 4. Handoff

OBJECTIVE: Stamp the locked student Turn in fix, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance for the existing Turn in control and `student_submit`. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, the three AC-TURNIN lines, Surface both, Persona student, Motion none, and the non-goals. The 400 on an own open planned row is the failure. A seed-only edit is not success.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_9c0ee2de`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: QA Supervisor stamps `t_9c0ee2de`. Continuation `t_53877764` waits on both stamps. Do not staff Engineering from this card.


