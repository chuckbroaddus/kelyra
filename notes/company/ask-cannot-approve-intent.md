# Ask cannot approve — IQG intent

Date: 2026-09-27
Card: t_d1b27ecb
Author: qa-supervisor
Status: QA Supervisor APPROVED

CEO lock (Chuck 2026-09-27): Stop Ask from writing a score. Approve stays on the screen only. Do not add a confirm card. Do not keep the silent write.

Locked lines (do not drop):
Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-ASK-APPROVE-1: Ask cannot write an approved score, for a teacher or for an office admin.
AC-ASK-APPROVE-2: The on-screen Approve control still approves that teacher's own capture.
AC-ASK-APPROVE-3: Ask does not show a confirm card for approve. The tool is gone or fail-closed, not gated by a new dialog.

## DESIGN STAMP

Feature/bug: Ask cannot approve
Quality goals: AC-ASK-APPROVE-1, AC-ASK-APPROVE-2, AC-ASK-APPROVE-3
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_d1b27ecb run 3678
Intent gaps remaining: none

PM stamp is a sibling card (t_2dc13cef). This note does not speak for PM.

## Intent

Hats. Teacher Ask must not write an approved score on that teacher's own work. Office admin Ask must not write an approved score school-wide. The same Ask write is gone or fail-closed for every caller of that write, including superintendent school scope. That is the lock (stop Ask from writing a score), not a new seat. Student and parent already cannot Approve. Dual-hat teacher+parent: Ask writes nothing on either seat; screen Approve stays on the teacher seat for that teacher's own capture. Dual-hat office+teacher: Ask writes nothing while the office hat is on.

Entry. Phone and web (Surface: both). Ask is not an Approve entry. The on-screen Approve control stays the write entry. No new Approve screen. Motion: none. No confirm card.

Lifecycle. A teacher can still open their own capture and tap Approve, and that tap still writes the score. Asking Ask to approve starts and finishes with no approved_score write and no confirm dialog. Already-approved work is not rewritten by Ask. There is no Ask cancel step, because there is no confirm card.

Multiplicity. Any capture, any class, and office school-wide: Ask writes none of them. Screen Approve is still that teacher's own capture, not a new office Approve screen.

Non-goals. No confirm card. No silent write. No new Approve screen. Do not remove the on-screen Approve control. Do not change delete_capture or delete_gap in this lock (they do not write an approved score). Do not add Approve for student or parent. Do not unblock or parent work onto finding t_07c1b2b4. Gone or fail-closed are both in the lock. A role allowlist that still lets one hat write is not.

## PROVE-OUT OBJECTIVE

Full featured versus this stamp means the locked behavior is true on the shipped tree, not only that a unit file mentions fail-closed. QA Engineer grades the packet. This seat does not grade screenshots. Loop passed is not product-complete.

Experience-first acceptance (verify before done):
1. Teacher, phone and web: ask Ask to approve a real draft capture. No approved_score write. No confirm card. The on-screen Approve control on that teacher's own capture still writes the score after a real tap.
2. Office admin, phone and web: ask Ask to approve a capture, including one outside that person's own classes. No approved_score write. No confirm card. Do not add an office Approve screen to prove this.
3. Superintendent uses the same Ask write path (capture.approve school). That path must also write nothing. Not a new product. Same tool, gone or fail-closed.
4. Student and parent seats still cannot Approve. Dual-hat parent seat still cannot. Screen Approve on the teacher seat still can, for that teacher's own capture only.
5. Prompt and tool policy must not instruct Ask to write an approved score. Client policy and supabase/functions/_shared/askToolPolicy.ts stay aligned. A model reply that claims a grade while the row is unchanged is a fail of AC-ASK-APPROVE-1.

Evidence labels:
- STATIC: source and policy tests. Aid only. Never sole PASS for a user-visible write.
- LIVE UI: signed-in session, Ask attempt, then the capture row still unapproved, then a real on-screen Approve tap that does write. Phone and web.
- NON-GOAL ABSENT: no confirm card, no new Approve screen. Their absence is correct.

Do not send AC-ASK-APPROVE-1..3 to engineering as defects. They are the stamp. A miss after implementation is a new defect card.

## DITL IMPACT

Change: Ask cannot write an approved score. Screen Approve stays.
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-T-02 (dual path still lists approve_capture as the Ask alternate; theme still says Ask approve parity), DITL-T-01 (Pack B row still lists approve_capture if capability), DITL-T-04 (row 7 still lists Ask approve_capture), DITL-DH-01 (Pack B row must say screen Approve only; Ask must not write)
Cases touched: DITL-T-02-ASK-01 and DITL-T-01-ASK-PARTIAL-01 already expect teacher Ask Approve to fail closed. Thicken so office admin school-wide Ask also cannot write, and so the expected result is tool gone or fail-closed with no confirm card. Screen Approve coexistence stays DITL-T-02-UI-05.
New DITL needed: no
Seed/artifacts: none
Notes: CoS files the sticky DITL-UPDATE card. This seat does not rewrite the plans or cases and does not staff that card.
