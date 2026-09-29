# Ask cannot approve

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_2dc13cef`
**Lane:** `t_52542373`
**Finding:** `t_07c1b2b4` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**QA Supervisor card:** `t_d1b27ecb` (their stamp is not this note)
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Stop Ask from writing a score. Approve stays on the screen only. Do not add a confirm card. Do not keep the silent write.
**Case:** DITL-T-02-ASK-01
**Status:** PM DESIGN STAMP APPROVED (`t_2dc13cef`). Not Eng from this seat. No `src/`. No confirm card. No new Approve screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Ask cannot approve
Quality goals: AC-ASK-APPROVE-1, AC-ASK-APPROVE-2, AC-ASK-APPROVE-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_2dc13cef
QA Supervisor: pending t_d1b27ecb
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-ASK-APPROVE-1: Ask cannot write an approved score, for a teacher or for an office admin.
AC-ASK-APPROVE-2: The on-screen Approve control still approves that teacher's own capture.
AC-ASK-APPROVE-3: Ask does not show a confirm card for approve. The tool is gone or fail-closed, not gated by a new dialog.

## 0. What is broken

Ask tool `approve_capture` writes a grade with no Approve tap. It lives in `src/lib/ai/askTools.ts`. The run calls `approveCapture()` in `src/lib/gaps/api.ts`, which writes `approved_score` (from the tool score, else the draft score) and the approved gaps. Student and parent already get an error. Teacher own-class and office school-wide do not. Policy lists the tool in `src/lib/ai/askToolPolicy.ts` and `supabase/functions/_shared/askToolPolicy.ts`. `capture.approve` is teacher `own`, administrator `school`, superintendent `school`. The teacher prompt tells the model it may Approve via that tool when it is listed. There is no confirm step and no pending-write card.

Case DITL-T-02-ASK-01 says Ask cannot silently publish `approved_score`, Ask Approve must fail closed, and Ask Approve is a non-goal. `docs/ui-design.md` says do not auto-Approve from Ask. The plan line "Ask approve parity" disagrees. Chuck locked the call on 2026-09-27: stop the Ask write. Approve stays on the screen only. Do not add a confirm card. Do not keep the silent write.

The screen path is the existing control, not a new one. It already calls `approveCapture()` from Capture review, the proposal screen, and the class student page. Those stay.

## 1. Stories

**Teacher, phone and web.** As the teacher, Ask cannot write an approved score on my capture. I still Approve that capture with the on-screen control. Surface both. Seat teacher. Motion none.

**Office.** As an office admin, Ask cannot write an approved score, including school-wide. Office admin here is the school-scoped seats that already have `capture.approve`: administrator and superintendent. That is the finding's office write, not a new hat and not a new screen.

**No confirm.** Ask does not show a confirm card, a dialog, or a second tap that then writes. The tool is removed, or the run fails closed and does not call `approveCapture()`. A gate that still writes after Yes is not this choice.

**Parent and student.** They stay refused. This stamp does not give them Approve.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-ASK-APPROVE-1.** Ask cannot write an approved score, for a teacher or for an office admin. A teacher Ask turn does not write `approved_score` on that teacher's own capture. An office Ask turn does not write `approved_score` school-wide. Administrator and superintendent are that office write. Parent and student stay refused. Client tool list and edge policy both fail closed. Success is no row write. A prompt that still offers a working `approve_capture` is not success. If the tool is removed, it is not callable. If it stays listed, the run returns an error and does not call `approveCapture()`.

**AC-ASK-APPROVE-2.** The on-screen Approve control still approves that teacher's own capture. The existing control on Capture review, the proposal screen, and the class student page still writes through `approveCapture()`. Phone and web. Do not delete that API to kill the Ask tool. Do not add a screen.

**AC-ASK-APPROVE-3.** Ask does not show a confirm card for approve. The tool is gone or fail-closed, not gated by a new dialog. No confirm card, no Yes/No that then writes, no second Approve screen inside Ask.

**Must hold with those three.** Nothing is a grade until the on-screen Approve. This fix does not clear or rewrite scores already approved. `delete_capture` and `delete_gap` are not this stamp. Do not remove them to satisfy AC-1.

## 3. Hats and non-goals

| Hat | Ask | Screen |
|---|---|---|
| Teacher | Cannot write an approved score. | Existing control still approves that teacher's own capture. |
| Office admin (administrator and superintendent, school scope) | Cannot write an approved score, including school-wide. | No new screen. Do not add one. |
| Teacher who is also office | Ask cannot write on either hat. | Screen still approves that teacher's own capture. |
| Parent, student | Still refused. | Not this control. |

Entry for Approve is the existing on-screen control, phone and web. Ask is not an entry.

Lifecycle: an Ask attempt does not start a grade write and does not finish one. The screen tap still starts and finishes Approve for that teacher's own capture. No confirm step is added. Scores already approved are not reversed.

Multiplicity: one teacher's own capture on the screen path. Office school-wide is closed on Ask, not replaced with a school-wide confirm.

Non-goals:

- No confirm card. No silent write. No new Approve screen.
- No change to parent or student refusal, except that they stay refused.
- No delete-tool removal. `delete_capture` and `delete_gap` are out of this stamp.
- No rewrite of scores already approved.
- The plan phrase "Ask approve parity" does not keep the write. This lock wins.
- Do not unblock `t_07c1b2b4`. Do not parent work onto it. Do not staff Engineering from this card.

## 4. Handoff

OBJECTIVE: Stamp the locked Ask-cannot-approve choice, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance for removing or fail-closing Ask `approve_capture`. Screen Approve stays. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, the three AC-ASK-APPROVE lines, Surface both, Persona teacher, Seat teacher, Motion none, and the non-goals. No confirm card. No silent write. No new Approve screen.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_d1b27ecb`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: QA Supervisor stamps `t_d1b27ecb`. Continuation `t_3036a35d` waits on both stamps. Do not staff Engineering from this card.
