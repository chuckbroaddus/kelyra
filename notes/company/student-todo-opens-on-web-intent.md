# Student To Do opens on web

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_e411d9d7`
**PM card:** `t_34e12976` (parallel; this seat does not wait)
**Lane:** `t_fb8cba56`
**Finding:** `t_a7868c98` (blocked, unassigned; do not unblock; do not parent onto it)
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so a student To Do row opens on the web. Title tap or an Open control must navigate. Phone-only is not enough.
**Status:** QA Supervisor DESIGN STAMP below. Not Eng from this seat. No `src/`. No new To Do screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: student To Do opens on web
Quality goals: AC-TODO-OPEN-1, AC-TODO-OPEN-2, AC-TODO-OPEN-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_e411d9d7
Intent gaps remaining: none
```

Surface: web
Persona: student
Motion: none
AC-TODO-OPEN-1: On the web, a student can open a To Do row from the title or an Open control.
AC-TODO-OPEN-2: The opened row is that student's own work, not another student's.
AC-TODO-OPEN-3: The phone To Do open path still works.

## 1. What is broken

The student already has a To Do list. Assignments home is `src/app/todo.tsx` (`/todo`). Class assignments reuse the same list in `src/app/student/class.tsx`. Both render `StudentWorkList`, which renders `WorkRow`.

The phone open path already has destinations. Practice goes to `/todo/[submissionId]`. Lesson goes to `/lesson/[assignmentId]`. `todo.tsx` `open` and class `openWork` are that path. Kinds those functions ignore have no destination. This stamp does not invent one.

`StudentWorkList` does not pass `onPress` into `WorkRow`, so a title click is not a navigation control. An Open pill is attached only when kind is lesson or practice. DITL-S-01-UI-01 (exec seq 36, finding `t_a7868c98`, PARTIAL) says that Open control does not navigate on web, and the title click does not navigate. Phone-only is not the fix.

Make the existing row open. Do not design a new To Do screen.

## 2. Hats and entry

**Student.** The only hat. DITL-S-01 says students cannot wear staff or parent hats. Jordan Lee (`ditl-student-s1`) and any student on the student seat. The fix surface is web. The phone open path stays. Motion is none.

**Not teacher, parent, or office.** Those seats do not gain this open. Teacher review stays the existing review route. Parent stays read-only. Office is out.

**Dual-hat.** Not in scope. A person who also has another role does not get a student To Do open on teacher, parent, or office chrome. Switching off the student seat does not open a student row. Do not invent a dual-hat menu for this bug.

**Entry.** Existing chrome only. No new tab, no new route, no new screen.

1. Assignments To Do (`/todo`, To Do pane). This is DITL-S-01-UI-01 steps 2–3: Open Assignments, select assigned practice.
2. Class assignments To Do (`/student/class`, assignments pane, To Do). Same list, same row. Opening only one of these two and leaving the other dead is not done.

Title tap or an Open control. The lock is or. At least one of those must navigate on web. Both may. If neither navigates, it fails. Do not add a third control.

Ask stays UI-primary. Do not make Ask the open path for this bug.


## 3. Lifecycle

**Start.** A signed-in student is on a To Do row the phone open path already opens (practice or lesson). They use the title or the Open control. Motion is none. No new gesture.

**Finish.** Navigation lands on the existing destination for that clicked row. Practice lands on `/todo/[submissionId]`, the screen that already has Back to To Do. Lesson lands on `/lesson/[assignmentId]`. The id is the clicked row. It is that student's own work (AC-TODO-OPEN-2). It is not a sibling row. It is not another student's row. Jamie Lee's work does not open from Jordan Lee's list.

**Leave.** Use the back path that screen already has. Practice detail already replaces `/todo` from Back to To Do. No new close screen. No new cancel control. Leaving does not submit. Turn in is a different stamp. Do not change submit here.

**Already there.** Opening the same row again is the same destination. Do not create a submission. Do not submit.

**Phone.** The phone To Do open path still navigates to that same destination (AC-TODO-OPEN-3). Do not remove it. A web-only break of the phone path fails.

**Multiplicity.** Many To Do rows, and two classes, are normal. The click opens that row's submission id (practice) or assignment id (lesson). It does not open the first row. It does not open the other class's row. A class chip does not change which row a click opens. Own `student_id` only.

**Reverse.** Back returns by the path that already exists. Do not add a return route. Do not regress leave-without-submit (DITL-S-01-UI-02).

## 4. Acceptance

These are the lock. They do not add a second product.

**AC-TODO-OPEN-1.** On the web, a student can open a To Do row from the title or an Open control. Or means at least one of those navigates. Either is a pass. Both is a pass. Neither is a fail. The landing is the existing destination in section 3, on both existing student To Do lists in section 2. A new screen is not a pass.

**AC-TODO-OPEN-2.** The opened row is that student's own work, not another student's. The destination id is the clicked row. Not another student. Not a different row in the same list.

**AC-TODO-OPEN-3.** The phone To Do open path still works. Same destinations. A phone-only build does not pass AC-TODO-OPEN-1.

## 5. Non-goals

**No new To Do screen.** No new route, no second list, no composer, no third control.

**No phone-only fix.** Web must navigate. Phone must still navigate.

**No Done-tab redesign.** This lock is the To Do row. Do not require a new Done behavior. Do not regress a Done open the phone path already has.

**No new kind.** Do not invent a destination for a kind the phone open path ignores. Practice and lesson are the destinations that path already has.

**No grade.** Nothing is a grade until the teacher Approves. This stamp does not Approve.

**No other hat.** Teacher, parent, and office do not receive this control.

**Ask is not the fix.** Open stays on the existing row. Ask remains the dual path that points at the UI.

**Do not unblock `t_a7868c98`.** Do not parent work onto it. Do not staff Engineering from this card.

**Motion none.** No animation requirement.

**Do not change Turn in.** `student_submit` is a different stamp.


## 6. DITL IMPACT

```
DITL IMPACT
Change: On the web, a student To Do row opens from the title or an Open control to the existing destination for that student's own row. Phone open path stays. No new To Do screen.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: QA Supervisor (t_e411d9d7) owns this verdict: NONE. DITL-S-01 beat 4 and DITL-S-01-UI-01 already expect the student to open assigned practice from /todo and land on assignment detail. The wall is web navigation, not a missing plan or case. Do not rewrite plans or cases to describe the bug. Prove-out re-runs that open step on web against this stamp, and checks the phone open path still works. Do not unblock t_a7868c98. Do not staff ditl-scribe from this card.
```

## 7. Prove-out

Chief of Staff staffs `qa-engineer` from the OBJECTIVE below after the Surface workflow is terminal. This seat does not staff that card and does not grade the screenshots. Loop passed is not product-complete.

```
PROVE-OUT OBJECTIVE:
Prove the stamped student To Do web-open fix against notes/company/student-todo-opens-on-web-intent.md. Full featured means a signed-in student, on the web, can open their own To Do row from the title or an Open control and land on the existing destination for that clicked row. Practice lands on /todo/[submissionId]. Lesson lands on /lesson/[assignmentId]. At least one of title or Open must navigate. Both is a pass. Neither is a fail. A new To Do screen is not a pass.

Do this on both existing lists: Assignments To Do (/todo, To Do pane) and class assignments To Do (/student/class, assignments pane, To Do). The opened id is that student's own clicked row, not a sibling row and not another student's row (Jordan Lee does not open Jamie Lee's work).

AC-TODO-OPEN-1, AC-TODO-OPEN-2, AC-TODO-OPEN-3.
Surface: web
Persona: student
Motion: none

The phone To Do open path still opens those same destinations. Phone-only is a fail.

Experience-first. Do not pass on code inspection alone. Sign in as the student, click, and confirm the destination id. Re-run the DITL-S-01-UI-01 open step on web. Check the phone open path still works. Do not grade Turn in. Do not unblock t_a7868c98. DITL IMPACT stays NONE unless shipped behavior changes the case steps.
```

## 8. Handoff

**WORK PERFORMED:** Reviewed the locked web-open choice against the existing student To Do lists, `WorkRow`, the phone destinations, and DITL-S-01. DESIGN STAMP APPROVED on this note and on card `t_e411d9d7`.

**VERIFICATION:** `StudentWorkList` is the row on `/todo` and on class assignments. It does not pass title `onPress`. Open is a pill only for lesson or practice. Phone `open` / `openWork` already navigate practice to `/todo/[submissionId]` and lesson to `/lesson/[assignmentId]`. No new screen was designed. No app code was changed. Finding `t_a7868c98` was not unblocked and was not parented.

**RESULT:** QA Supervisor APPROVED 2026-09-27. Intent gaps remaining: none. DITL IMPACT: NONE.

**OPEN ISSUES:** None on this stamp. PM stamp is the parallel card `t_34e12976`. Engineering is not staffed from this seat.

**ESCALATION NEEDED:** No. Do not unblock `t_a7868c98`.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the PM stamp on `t_edb34119`. If both are APPROVED, start the Surface workflow with the lock lines, then staff qa-engineer from the PROVE-OUT OBJECTIVE. If either is REJECTED, comment that gap on `t_a7868c98` and stop.

