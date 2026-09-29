# Student To Do opens on web

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_34e12976`
**Lane:** `t_fb8cba56`
**Finding:** `t_a7868c98` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**Intent:** `notes/company/student-todo-opens-on-web-intent.md`
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so a student To Do row opens on the web. Title tap or an Open control must navigate. Phone-only is not enough.
**Status:** PM DESIGN STAMP APPROVED (`t_34e12976`). Not Eng from this seat. No `src/`. No new To Do screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: student To Do opens on web
Quality goals: AC-TODO-OPEN-1, AC-TODO-OPEN-2, AC-TODO-OPEN-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_34e12976
QA Supervisor: see t_e411d9d7 (not this card)
Intent gaps remaining: none
```

## Lock lines

Surface: web
Persona: student
Motion: none
AC-TODO-OPEN-1: On the web, a student can open a To Do row from the title or an Open control.
AC-TODO-OPEN-2: The opened row is that student's own work, not another student's.
AC-TODO-OPEN-3: The phone To Do open path still works.

## 0. Choice

The choice is locked. Title tap or an Open control on the existing student To Do row must navigate on the web. Phone-only is not enough. This stamp does not offer a new To Do screen, a phone-only path, or a different product.

Stories below match `notes/company/student-todo-opens-on-web-intent.md`. They do not add a destination the phone open path does not already have.

## 1. Stories

**Web open.** As the signed-in student, on the web, I open a To Do row the phone path already opens. I use the title or an Open control. At least one of those navigates. Both may. Neither is a fail. Motion is none. No third control.

**Where it lands.** Practice lands on the existing `/todo/[submissionId]`. Lesson lands on the existing `/lesson/[assignmentId]`. The id is the row I used. A new screen is not success.

**Both lists.** The same row is on Assignments To Do (`/todo`, To Do pane) and on class assignments To Do (`/student/class`, assignments pane, To Do). Opening only one list and leaving the other dead is not done.

**Own work.** The opened row is my submission, not another student's, and not a different row in the same list. A class chip does not retarget the click.

**Phone.** The phone To Do open path still opens those same destinations. A web fix that breaks phone fails.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-TODO-OPEN-1.** On the web, a student can open a To Do row from the title or an Open control. Or means at least one navigates, on both existing lists, to the existing destination for that row.

**AC-TODO-OPEN-2.** The opened row is that student's own work, not another student's. The destination id is the clicked row.

**AC-TODO-OPEN-3.** The phone To Do open path still works. Same destinations. Phone-only does not pass AC-TODO-OPEN-1.

## 3. Hats and non-goals

| Hat | This open |
|---|---|
| Student | Existing To Do row opens on web from the title or an Open control. |
| Teacher, parent, office, superintendent | Do not gain this control. Unchanged. |

Entry is the existing student To Do row. Not a new tab, route, or screen. Ask is not the open path.

Non-goals:

- No new To Do screen. No second list. No third control. No new motion.
- No destination for a kind the phone open path ignores. Practice and lesson are the destinations that path already has.
- No Done-tab redesign. Do not regress a Done open the phone path already has.
- No Turn in change. No grade. Nothing is a grade until the teacher Approves.
- Do not unblock `t_a7868c98`. Do not parent work onto it. Do not staff Engineering from this card.

## 4. Handoff

OBJECTIVE: Stamp the locked student To Do web-open fix, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance against the existing row, both student To Do lists, and the phone destinations. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, the three AC-TODO-OPEN lines, Surface web, Persona student, Motion none, and the non-goals. A new screen is not success. Phone-only is not success.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_e411d9d7`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: Continuation `t_edb34119` waits on this stamp and `t_e411d9d7`. Do not staff Engineering from this card. Do not unblock `t_a7868c98`.
