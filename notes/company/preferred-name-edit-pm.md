# Preferred name edits and saves

**Date:** 2026-09-27
**Author:** product-manager
**Card:** `t_50a11b62`
**Finding:** `t_87f01316` (leave blocked, unassigned)
**Case:** DITL-O-07-UI-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Preferred name on an existing student's Details edits and saves, and does not open the photo sheet. Not the office photo-extract gap.
**QA intent file:** `notes/company/preferred-name-edit-intent.md` (QA Supervisor owns it. This note does not replace it.)
**Status:** PM DESIGN STAMP APPROVED (`t_50a11b62`). QA Supervisor stamp is not this card. Not Eng. No `src/`. Do not unblock `t_87f01316`.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: PREFERRED NAME EDIT — existing student Details edits and saves preferred name; tap does not open the photo sheet
Quality goals: office admin and superintendent; dual-hats that open the same screens; that student only; sibling fields kept; photo extract stays a gap
PM: APPROVED  date: 2026-09-27  profile-session: product-manager / t_50a11b62
QA Supervisor: pending  date:  profile-session: qa-supervisor / t_d9b02609
Intent gaps remaining: none
```

## 0. What is broken

The name field already exists. Do not design a new Details screen.

Two existing office paths show Preferred name on an existing student. The DITL miss is the first.

**Class student Details.** `/class/[id]/student/[studentId]`, Details tab. Office opens it from a class list (`src/app/admin/class/[id].tsx` pushes that route). DITL-O-07-UI-01 opened S1 Jordan Lee there. `DetailsRows` lists Preferred name. Empty value reads `Add preferred name`. `onPress` is `openEdit`, which fills a draft and opens the existing FormSheet titled Details. Save calls `updateStudentMetadata`. The hero above the tabs is a separate control: accessibility label `Change photo, {name}`, and it opens `PhotoSheet` (Take photo, Choose from library, Use this homework as profile when a homework photo exists, Remove, Cancel). Evidence: Preferred name did not persist (`filledKeys` empty) and the photo sheet was what the run left on screen. That is this bug. It is not the office photo-extract gap.

**People login card.** Office People opens `/profile?person=` (`peopleDirectoryPersonHref`). A student login uses `ProfileDetails`. Preferred name is a row in `STUDENT_OFFICE_OPTIONAL_FIELDS`. Tap opens the existing Edit profile sheet, not the photo circle. The photo circle is the only photo hit on that page. This path must not regress. It is the same field, not a second product.

Canonical key is `students.metadata.preferred_name`. On save, `updateStudentMetadata` upserts that trimmed value into `name_aliases` when it is not already there (`normalizeRosterName`). It does not delete older aliases. Do not invent a second persist protocol.

Surface: web and phone. Persona: office. Seat: office. Motion: none.

## 1. Stories

**Office administrator.** As an office administrator, I open an existing student's Details, tap Preferred name (the label, the value, or `Add preferred name`), edit the name, and save. I am not sent to the photo sheet. The write lands on that student only.

**Superintendent.** As a superintendent, I use the same Details screens and the same save. I do not gain a photo extractor, and I do not lose the edit an administrator has.

**Office who is also a teacher.** On the office seat I open the same class student Details and the same People login card. On the teacher seat I open the same class student Details from the class list. Preferred name edits and saves on that screen. Switching seats does not open the photo sheet from that tap and does not write a different student.

**Office who is also a parent.** On the office seat I open the same Details screens as an office administrator. Preferred name edits and saves there. The parent seat is a different screen (`src/app/parent.tsx`, Edit details). This lock does not retarget that screen.

**Not a new student.** I am editing a student who already exists. Save does not mint a student, does not enroll a new row, and does not copy the name onto a sibling.

## 2. Acceptance

These match the lock. They do not add a second product choice. AC-PREFNAME-1 through AC-PREFNAME-4 are the CEO lines. Later ids only apply that lock to hats, the second existing surface, and the save that already exists.

**AC-PREFNAME-1.** Tapping Preferred name on an existing student's Details edits the name. It does not open the photo sheet.

On the class student page, that tap is the Details row (label, current value, or `Add preferred name`). It opens the existing Details sheet and shows the Preferred name field editable. It does not set the photo sheet visible. On the People login card, that tap opens the existing Edit profile sheet the same way. It does not open the photo circle's sheet.

The control named `Change photo, {name}` may still open the existing photo sheet. That is the profile photo control, not Preferred name, and not a card extractor.

**AC-PREFNAME-2.** Saving writes the preferred name on that student only.

Save writes `students.metadata.preferred_name` on the open student id. A non-empty trimmed value is upserted into that row's `name_aliases` when it is not already an alias. An empty trim deletes the key. It does not delete older aliases. It does not write another student's metadata or aliases. It does not mint a student.

**AC-PREFNAME-3.** The other canonical detail fields on that Details screen can be edited and saved. They are not cleared by the name edit.

A preferred-name-only edit leaves the other fields on that screen as they were. On the class student sheet those fields are Name (`display_name`), Birthday, Grade or age, Phone, Email, Address, Emergency contact, Emergency phone, Allergies, Health conditions, and Notes, plus `focusLog` and any other key the sheet did not edit. On the People login card, the other profile fields and the other optional student fields on that sheet are the same rule. Those fields can still be changed in the same existing sheet and saved. A bad or unchanged birthday must not block a preferred-name save when the birthday was not changed.

**AC-PREFNAME-4.** The known office photo-extract gap stays a gap. This fix does not add a photo extractor.

No office Capture tray. No student-card OCR. No new photo-sheet action that reads a card into metadata. Photo sheet actions stay the ones that exist today.

**AC-PREFNAME-5.** A superintendent on an existing student gets AC-PREFNAME-1 through AC-PREFNAME-4 on the same screens. Administrator and superintendent grants stay as they are. This fix does not add a grant and does not remove one.

**AC-PREFNAME-6.** Office who is also a teacher, on the office seat and on the teacher seat, uses the same class student Details for this edit. The office seat also uses the People login card when that student has a login. Both seats edit and save Preferred name and do not open the photo sheet from that tap.

**AC-PREFNAME-7.** Office who is also a parent, on the office seat, uses the same Details screens as AC-PREFNAME-1. The parent seat does not open those screens. This fix does not change `src/app/parent.tsx`.

**AC-PREFNAME-8.** Web and phone. No new Details layout, copy, or tab. While the photo sheet is not the result of the Preferred name tap, the edit sheet is. Closing the edit sheet without Save writes nothing.

**AC-PREFNAME-9.** Clear on a filled Preferred name row (class student Details) still deletes that key on that student only and does not open the photo sheet. It does not clear sibling fields and does not strip older aliases. Cancel of the clear confirm writes nothing.

**AC-PREFNAME-10.** Two students open as two Details screens. Saving on one does not change the other's `preferred_name` or `name_aliases`. Display name changes only if the Name field on that sheet was changed.

## 3. Hats

| Hat | Opens this Details? | Preferred name |
|---|---|---|
| Office administrator | Yes. Class student Details and People login card. | Edit and save. Tap does not open the photo sheet. |
| Superintendent | Yes. Same screens. | Same edit and save. Grants unchanged. |
| Office + teacher, office seat | Yes. Same screens. | Same edit and save. |
| Office + teacher, teacher seat | Yes. Class student Details from the class list. | Same edit and save on that screen. |
| Office + parent, office seat | Yes. Same screens as office administrator. | Same edit and save. |
| Office + parent, parent seat | No. Parent home Edit details is a different screen. | Out. Do not retarget `src/app/parent.tsx`. |
| Teacher-only | Yes, class student Details, when they already can open it. | Do not remove the edit they already have. Not a new hat. |
| Pure parent | No. | Out. |
| Student | Own profile hides the office optional student fields. | Do not widen that. |
| Signed-out | No. | Fail closed. No write. |

Default chrome seat for an office job stays office, even when `also_teacher` or `parent_id` is set. Do not flip that default.

## 4. Entry and lifecycle

**Entry.** Existing student, already on file. Class list or admin class opens `/class/[id]/student/[studentId]`, Details tab. People opens `/profile?person=` for a student login. No new route. No new tab. No new button labeled Preferred name.

**Start.** Tap the Preferred name row. The existing edit sheet opens. The photo sheet does not.

**Change.** Type a preferred name, replace one, or clear the field in the sheet. Other fields on that sheet stay editable.

**Finish.** Save writes that student only, as AC-PREFNAME-2. The sheet closes. The Details row shows the saved value, or `Add preferred name` if the key was deleted. Read-back is that same student.

**Reverse.** Close the sheet without Save: no write. Clear on the row: deletes that key only, after confirm. Cancel of confirm: no write.

**Already in flow.** If the photo sheet is open because the photo control was tapped, that is still the photo control. Dismiss it with the existing Cancel. It must not be the thing Preferred name opens. Do not add a card reader to get out of it.

**Multiplicity.** One open student. Twins are two rows. Save the one whose Details is open. One school. No school picker.

**Ask.** `update_student` may already patch this key. Do not add a tool. Do not break the existing patch. This stamp's proof is the Details tap and save, not Ask.

## 5. Non-goals

**Photo extract stays a gap.** DITL-O-07 beat 5. No office scan-card tool. No classifier. No new photo-sheet row. Do not file that gap again as this bug.

**No new Details screen.** No new route, tab, field, or key. `preferred_name` already exists. Health conditions and the other rows already on the sheet stay. Do not add IEP, 504, pronouns, or bus.

**Do not unblock `t_87f01316`.** Do not staff Engineering from this card. Chief of Staff starts the Surface workflow only after this stamp and the QA Supervisor stamp are both APPROVED.

**Parent seat is out.** `src/app/parent.tsx` is not this Details screen. Do not retarget it.

**Create-account is out.** People New may seed optional fields on a mint. This stamp is an existing student only. Do not change mint.

**Ask is not the fix.** Do not add an Ask tool. Do not require Ask for the proof.

**Alias cleanup is out.** Saving does not remove an older alias. That is the current upsert. Do not add a delete-alias product.

**Splash wall is out.** `t_3191917a` is not this bug.

## 6. DITL IMPACT

```
DITL IMPACT
Change: Preferred name on an existing student's Details edits and saves, and that tap does not open the photo sheet. Write is students.metadata.preferred_name on that student, plus the existing name_aliases upsert. Sibling fields stay. Office photo-extract stays a gap.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: DITL-O-07 already marks beat 3 metadata update SUPPORTED and beat 5 photo-from-card extract PARTIAL/GAP. This stamp matches that plan. Do not rewrite the plan to describe the bug. Do not staff ditl-scribe from this card. Prove-out after Eng re-runs the Details edit on existing S1 (beats 3, 4, 6) against AC-PREFNAME-1..10. Beat 5 stays the known gap and must not fail this fix. Case DITL-O-07-UI-01 text that expects a photo attach and says PARTIAL/GAP none is already out of line with the plan. That split is not a new product and is not rewritten here. Do not unblock t_87f01316.
```

## 7. Handoff

**WORK PERFORMED:** PM stamped the locked Preferred name fix. Spec is this note. QA Supervisor still owns `notes/company/preferred-name-edit-intent.md`. No app code.

**VERIFICATION:** Class student Details row calls `openEdit` and save calls `updateStudentMetadata` (`src/app/class/[id]/student/[studentId].tsx`). Photo sheet is the hero `Change photo` control (`PhotoSheet`). People opens `/profile?person=` and `ProfileDetails` edits the same key. Parent seat uses `src/app/parent.tsx`, a different screen. Office and superintendent both use the class student route and People.

**RESULT:** PM APPROVED 2026-09-27. Intent gaps remaining: none. Not a build. Not a photo extractor. Not a new Details screen. DITL IMPACT: NONE.

**OPEN ISSUES:** QA Supervisor stamp on `t_d9b02609` is still required. Dual stamp is not MET until that line is APPROVED.

**ESCALATION NEEDED:** No. Do not unblock `t_87f01316`.

**RECOMMENDED NEXT ACTION:** Chief of Staff reads this stamp and the QA Supervisor stamp. If both are APPROVED, start the Surface workflow from `t_c8f5928a`. If QA rejects, do not staff Engineering. Build shape when both approve: make the existing Preferred name row open the existing edit sheet and save `preferred_name` plus the existing alias upsert. Do not open the photo sheet from that tap. Do not add a photo extractor.

