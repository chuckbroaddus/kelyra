# Pack B Approve on saved homework draft

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_1da8d81a`
**Lane:** `t_457b3d60`
**Finding:** `t_019ab036` stays blocked and unassigned. Do not unblock. Do not parent work onto it.
**QA Supervisor card:** `t_c35bd2e8` (their stamp is not this note)
**Continuation:** `t_941e07f4` waits on both stamps. Do not staff Engineering from this card.
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Fix the product so Approve appears on a saved homework draft in the teacher review. The parent seat must keep hiding Approve.
**Status:** PM DESIGN STAMP APPROVED (`t_1da8d81a`). Not Eng from this seat. No `src/`. No new review screen.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Pack B Approve on saved homework draft
Quality goals: AC-PACKB-1, AC-PACKB-2, AC-PACKB-3
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_1da8d81a
QA Supervisor: pending t_c35bd2e8
Intent gaps remaining: none
```

## Lock lines

Surface: both
Persona: teacher
Seat: teacher
Motion: none
AC-PACKB-1: After a teacher saves a keyed homework draft, Pack B Approve or Accept recommendation appears for that draft.
AC-PACKB-2: The teacher can accept that draft from that control.
AC-PACKB-3: The parent seat still does not show Approve.

## 0. What is broken

CASE: DITL-DH-01-UI-02. Teach seat saved a keyed math homework draft for Jordan Lee (draft 1f4e9f54). Inbox showed the draft. Pack B / Accept recommendation never appeared. Parent seat switch was fine: Morgan Patel only, no Approve.

The control already exists for other drafts. A live keyed capture shows Pack B Decision card and Accept recommendation on Teach seat only. Practice submission review shows the same Accept recommendation when the seat may approve. Web homework proposal already has an Approve path on the same Teach-seat check. This miss is the saved homework draft in the teacher review: the inbox listed it, and that review did not show the existing control.

Do not design a new review screen. Do not add inbox-row chrome. Make the existing Pack B Approve or Accept recommendation appear on the teacher review of that saved draft.

## 1. Stories

**Saved draft, Teach seat.** After a teacher saves a keyed homework draft, the teacher opens that draft in the existing teacher review (the review for a draft the inbox already lists). Pack B Approve or Accept recommendation is visible for that draft. Phone and web. Seat is teacher.

**Accept.** The teacher accepts that draft from that same control. Accept uses the existing approve path. Nothing is a grade until that accept. No second persist protocol. No new button that does not accept.

**Parent seat.** The parent seat still does not show Approve, on phone or web, including after an altitude switch from Teach to Parent. The evidence switch (Morgan only, no Approve) must not regress. Switching back to Teach still shows the control on that saved draft.

**Same control, same gates.** The control is the one other drafts already use. Existing gates stay: parent, office, and superintendent cannot approve; unassigned and twin confirms stay as they already are on that control. Those gates must not be a new reason the control is absent on a saved keyed homework draft that is already filed to a student. A filed saved draft must not show a permanently dead control. The teacher can finish accept from it.

## 2. Acceptance

These match the lock. They do not add a second product choice.

**AC-PACKB-1.** After a teacher saves a keyed homework draft, Pack B Approve or Accept recommendation appears for that draft. Appears means on the teacher review of that saved draft, phone and web, not only on a live unsaved capture sheet, and not as new inbox-row chrome. The inbox may already list the draft. Listing it without the control on the review is the failure (draft 1f4e9f54).

**AC-PACKB-2.** The teacher can accept that draft from that control. Accept is the existing approve path. A visible control the teacher cannot use to accept a filed saved keyed draft is not success. Confirm-each, twin, and unassigned rules that already belong to that control stay. They are not a new screen.

**AC-PACKB-3.** The parent seat still does not show Approve. Phone and web. After altitude switch to Parent, no Approve on that draft or elsewhere in the parent seat. Family view stays post-Approve only. No draft leak.

**Must hold with those three.** Surface both. Persona teacher. Seat teacher. Motion none. No new review screen. Return to Teach seat still shows the control. Already-approved rows are not reopened as a second publish. Office and superintendent stay out of KEYGRADE. Ask does not approve.

## 3. Hats and non-goals

| Hat | This fix |
|---|---|
| Teacher, Teach seat | Existing control appears on the saved keyed homework draft review. Teacher can accept. Phone and web. |
| Parent, including dual-hat after switch | Does not show Approve. |
| Office, superintendent | Unchanged. KEYGRADE still out. |
| Student | Unchanged. |

Entry is the existing teacher review of a saved keyed homework draft the inbox already lists. Not a new screen.

Lifecycle: save, review shows the control, accept finishes on the existing approve path. Parent switch hides it. Teach return shows it again.

Multiplicity: the opened saved draft. Accepting it does not approve another student's draft. Other drafts that already show the control keep it.

Non-goals:

- No new review screen. No inbox-row redesign. No new motion.
- No parent Approve. No office or superintendent Approve. No Ask Approve.
- No second approve protocol.
- Do not drop existing confirm, twin, or unassigned gates on the existing control.
- Do not unblock `t_019ab036`. Do not parent work onto it.
- Do not staff Engineering from this card.

## 4. Handoff

OBJECTIVE: Stamp the locked Pack B Approve-on-draft fix, or name a gap. Choice stays locked.
WORK PERFORMED: Stories and acceptance for the existing control on a saved keyed homework draft. No app code. No Engineering card. Finding left blocked.
VERIFICATION: This note has PM: APPROVED, the three AC-PACKB lines, Surface both, Persona teacher, Seat teacher, Motion none, and the non-goals.
RESULT: PM: APPROVED. Intent gaps remaining: none.
OPEN ISSUES: QA Supervisor stamp is `t_c35bd2e8`, not this card. Dual stamp is not claimed here.
ESCALATION NEEDED: none.
RECOMMENDED NEXT ACTION: QA Supervisor stamps `t_c35bd2e8`. Continuation `t_941e07f4` waits on both stamps. Do not staff Engineering from this card.

