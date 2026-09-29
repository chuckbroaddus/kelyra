# Preferred name edit on existing student Details

**Date:** 2026-09-27
**Author:** qa-supervisor
**Card:** `t_d9b02609`
**PM card:** `t_50a11b62` (must not write this file)
**Finding:** `t_87f01316` (leave blocked, unassigned)
**Case:** DITL-O-07-UI-01
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**CEO lock:** Chuck 2026-09-27. Preferred name on an existing student's Details edits and saves, and does not open the photo sheet. Not the office photo-extract gap.
**Status:** QA Supervisor DESIGN STAMP APPROVED 2026-09-27 (`t_d9b02609`). PM stamp is not on this note until `t_50a11b62` closes APPROVED. Not Eng from this seat. No `src/`. No new Details screen. Do not unblock `t_87f01316`. Do not add a photo extractor.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: PREFERRED NAME EDIT — existing student Details edits and saves; tap does not open the photo sheet
Quality goals: office seats edit preferred_name on the existing student only; siblings stay; photo control unchanged; photo-extract stays a gap
PM: pending  date:  profile-session: product-manager / t_50a11b62
QA Supervisor: APPROVED  date: 2026-09-27  profile-session: qa-supervisor / t_d9b02609
Intent gaps remaining: none
```

Surface: both. Persona: office. Seat: office. Motion: none. No mock-up.

## 1. What is broken

The name field already exists. Do not design a new Details screen.

Office on an existing student (DITL-O-07-UI-01, S1) tapped Preferred name on Details. The photo sheet opened. Canonical keys did not persist (`students.metadata` stayed empty of the typed values). Plan DITL-O-07 already marks manual metadata update on existing S1 SUPPORTED. Photo-from-card extract is a separate GAP (beat 5). This stamp is the manual edit only.

Two existing Details surfaces already show Preferred name for an existing student. Both are in this lock. Neither is a new screen.

**Class student Details.** `/class/{classId}/student/{studentId}`. Office seat tabs are Classes, Parents, Details, and Details is the default. The Details rows include Name plus `STUDENT_DETAIL_FIELDS`, and the first of those is Preferred name (`students.metadata.preferred_name`). Empty prompt is `Add preferred name`. That row's press must open the existing Details editor (`FormSheet` title Details), not `PhotoSheet`. The photo circle / hero hit (`Change photo, {name}`) may still open the photo sheet. A preferred-name string drawn inside that photo hit is not a second editor and is not the Details row.

**Office People person card.** People opens `/profile?person={profileId}`. Office does not bounce a student login to the class page. `ProfileDetails` already lists Preferred name for a student profile that has a `student_id`. That row's press must open the existing Edit profile sheet, not the photo sheet. The avatar circle may still open the photo sheet.

Save already has a writer: `updateStudentMetadata` sets `students.metadata` and upserts a trimmed preferred name into `name_aliases` when it is not already there. This stamp uses that writer. It does not add a second persist protocol.

## 2. Hats

Prove-out seats are the office job on the office seat. The record is an existing student only. Do not mint a student so the name can save.

| Hat | Seat | Preferred name on existing student Details |
|---|---|---|
| Office administrator | office | Edits and saves. Tap does not open the photo sheet. |
| Superintendent | office | Same edit and save. No extra grant. No lost grant. |
| Office who is also a teacher | office (default) | Same Details edit. Seat switch to teacher does not insert a row and does not add a second editor. |
| Office who is also a parent | office (default) | Same Details edit. Not sent to the parent home to do this. Parent-seat child editor is out of this stamp. |

Teacher seat already uses the class student Details row. Parent seat already has a separate child editor. A student may edit their own profile. This stamp does not add those hats and does not remove an edit they already have. The Preferred name row must not start opening the photo sheet for them. Do not special-case the office tap onto the photo sheet. Do not widen who can edit.

Photo control may still open the photo sheet for whoever can change a photo today. Preferred name must not.

## 3. Entry

No new route, tab, button, or Details screen. Web and phone. No motion.

**Class path.** Office seat opens the existing student from a class list, search, or the class student URL. Land on Details (office default). Tap the Preferred name row, or `Add preferred name` when it is empty. That tap edits the name.

**People path.** Office seat opens People, then the existing student's person card (`/profile?person=`). Tap Preferred name on that card. That tap edits the name.

Do not add a splash button, a Capture tray, or an office card scanner as the way in.

The photo control stays where it is: class hero `Change photo`, and the person-card avatar circle. Those may open the photo sheet. They are not the Preferred name entry.

## 4. Lifecycle

**Start.** Tap Preferred name on Details for an existing student. The existing editor opens with the preferred name editable (shared Details / Edit profile sheet is enough; do not build a new screen). The photo sheet is not open. If the photo sheet was already open from the photo control, cancel on that sheet still closes it. Preferred name is not what opens it.

**Change.** Type a preferred name. Other fields already loaded stay as loaded unless the person edits them in that same save. Trim whitespace. A spaces-only value is empty.

**Finish.** Save writes `students.metadata.preferred_name` on that student only. Upsert that trimmed value into `name_aliases` if it is not already present. Do not drop other aliases. Do not change `display_name` or `sort_name` unless Name was edited in that same save. Do not write another student. Close the editor. Details shows the saved preferred name. Leave and come back: it is still there.

**Sibling fields.** A name-only save must not clear phone, email, address, birthday, emergency name, emergency phone, grade or age, allergies, health conditions, notes, or any other canonical key already on that student. Those fields can still be edited and saved on the same Details screen. A failed save shows the existing error, writes nothing, and does not open the photo sheet.

**Cancel.** Close the editor without save. No metadata write. No alias write. Photo sheet stays closed.

**Clear.** The class Details row already has Clear. Clear preferred name removes that key only (and does not open the photo sheet, and does not clear sibling keys). Do not add a Clear control on the People person card. Do not invent alias garbage collection when the preferred name changes or clears.

**Already in flow.** Photo sheet open, edit sheet open, or a validation error on a field the person changed: Preferred name's tap is still not the photo sheet. An unchanged legacy birthday must not block a preferred-name save. Do not split the editor to work around that.

## 5. Multiplicity and dual-hat

One student row, even if enrolled in more than one class. Edit from either class student page writes the same `students.metadata` and the same `name_aliases`. Twins are two students. S1's preferred name must not appear on S2.

One preferred name value, not a list. Aliases may already hold other nicknames. Append the new preferred name if missing. Do not replace the alias list with only the new name.

Office who is also a teacher, and office who is also a parent, do this on the office seat. Switching to the teacher seat or the parent seat does not create a student, a teacher row, or a new editor. Administrator and superintendent stay different grants everywhere else. This fix does not merge seats.

Signed-out persons do not get the editor. A seat that cannot edit that profile today still cannot edit it. Their Preferred name row must not open the photo sheet as a substitute.

## 6. Acceptance

These match the lock. They do not add a second product choice.

**AC-PREFNAME-1.** Tapping Preferred name on an existing student's Details edits the name. It does not open the photo sheet. Covers the class student Details row (including `Add preferred name`) and the People person-card Preferred name row. Web and phone. Office administrator, superintendent, office+teacher on the office seat, and office+parent on the office seat.

**AC-PREFNAME-2.** Saving writes the preferred name on that student only. Canonical key is `students.metadata.preferred_name`. On save it is also upserted into `name_aliases` if missing. Other aliases stay. `display_name` stays unless Name was edited in that same save. A second student is unchanged. No new student is created.

**AC-PREFNAME-3.** The other canonical detail fields on that Details screen can be edited and saved. They are not cleared by the name edit. A name-only save leaves them as they were.

**AC-PREFNAME-4.** The known office photo-extract gap stays a gap. This fix does not add a photo extractor, an office Capture tray, or a card-to-metadata scan. The photo control may still open the photo sheet (Take photo, Choose from library, and the homework-as-profile action that already exists). That sheet is not a pass and not a fail of this stamp.

**AC-PREFNAME-5.** Cancel writes nothing. Class Details Clear of preferred name removes that key only and does not open the photo sheet. Do not add Clear on the People person card.

**AC-PREFNAME-6.** One student enrolled in two classes has one preferred name. Editing it from either class writes the same row.

## 7. Non-goals

**Photo extract is out.** DITL-O-07 beat 5 stays PARTIAL/GAP. Teacher card capture (DITL-T-05) is not this fix. Do not invent Document AI or an office scan tool.

**No new Details screen.** No new field, tab, route, or hero editor. The field already exists.

**No mint.** A person with no `student_id` is not this stamp. Do not create a student so a preferred name can save.

**No permission widen.** Reaching the editor does not grant actions the matrix already denies. Do not let a parent seat or a student seat gain office powers. Do not change the parent-home child editor.

**No rename side effect.** Preferred name is not the legal / display name.

**No Ask rewrite.** Ask `update_student` may already write this key. Do not break it. Do not make Ask the fix for the tap.

**Splash wall is out.** `t_3191917a` is not this stamp.

**Do not unblock `t_87f01316`.** Do not staff Engineering from this card. Chief of Staff starts the Surface workflow only after this stamp and the Product Manager stamp are both APPROVED.

**No IEP/504.** Details keys only. Do not add those columns.

## 8. DITL IMPACT

```
DITL IMPACT
Change: Preferred name on an existing student's Details edits and saves, and does not open the photo sheet. Manual write of students.metadata.preferred_name plus name_aliases upsert. Office photo-from-card extract stays a GAP.
Verdict: UPDATE_CASES
Plans touched: none
Cases touched: DITL-O-07-UI-01, DITL-O-07-UI-02
New DITL needed: no
Seed/artifacts: none
Notes: QA Supervisor (t_d9b02609) owns this verdict. DITL-O-07 already marks Details metadata update SUPPORTED and photo extract PARTIAL/GAP (beat 5). DITL-O-02 already asserts preferred_name on the manual path. Do not rewrite those plans to describe the bug, and do not add a photo extractor to the plans. DITL-O-07-UI-01 expected text still says photo attached and PARTIAL/GAP none, and UI-02 is the card-attach matcher path. That photo line must not be the pass bar for this stamp. Case rewrite, when Chuck unblocks it, splits manual preferred_name edit from the known photo-extract GAP. This card does not rewrite cases and does not staff ditl-scribe. Prove-out of this stamp does not wait on that rewrite. Do not unblock t_87f01316.
```

## 9. Prove-out OBJECTIVE

Chief of Staff pastes this onto the `qa-engineer` card after the Surface loop is terminal. This seat does not staff that card. Do not send AC-PREFNAME-* to engineering as defects. There is no mock-up. Do not grade a mock-up review.

```
OBJECTIVE:
Prove the stamped Preferred name edit. Yardstick is notes/company/preferred-name-edit-intent.md and QA Supervisor DESIGN STAMP APPROVED 2026-09-27 on t_d9b02609. Experience first. Web and phone. Office seat. No mock-up. No new Details screen. No photo extractor.

AC-PREFNAME-1: On an existing student, tap Preferred name (and Add preferred name when empty) on the class student Details tab. The existing editor opens and the name is editable. The photo sheet does not open. Repeat on the office People person card (/profile?person=) for a student who already has a student row. The photo circle / Change photo control may still open the photo sheet. That tap is not this test.

AC-PREFNAME-2: Save a preferred name. Leave and return. Details shows it. students.metadata.preferred_name is that value on that student only. name_aliases contains it and still contains aliases that were already there. display_name is unchanged if Name was not edited. A twin (other student) is unchanged. No new student row.

AC-PREFNAME-3: With other canonical detail fields already set, save a preferred-name-only edit. Those fields are still set. Edit and save one of them (phone or birthday is enough) and the preferred name remains.

AC-PREFNAME-4: Do not fail this stamp because office card-to-metadata extract did not run. Photo sheet on the photo control is allowed. Do not build or require an extractor.

AC-PREFNAME-5: Cancel writes nothing. On the class Details row, Clear preferred name removes that key only, does not open the photo sheet, and does not clear sibling keys.

AC-PREFNAME-6: A student in two classes has one preferred name. Save from either class student page and read it back on the other.

Hats: administrator, superintendent, office+teacher on the office seat, office+parent on the office seat. Same existing student. Do not require the parent-home child editor. Spot-check only: a teacher on the class Details row still edits Preferred name and does not open the photo sheet. Do not treat a miss there as a new product. File it as a defect against this stamp if the shared row opens the photo sheet.

Verify by read-back on Details and on the student row. A filled input that never saved is a fail. Do not unblock t_87f01316. Do not grade DITL-O-07 photo extract as this stamp.
```

## 10. Handoff

**WORK PERFORMED:** QA Supervisor reviewed the locked Preferred name fix against the class student Details row, the office People person card, and `updateStudentMetadata`. DESIGN STAMP APPROVED on this note and on card `t_d9b02609`. No `src/` change. `notes/company/preferred-name-edit-pm.md` was not present. Product was not reopened.

**VERIFICATION:** Class student Details (`src/app/class/[id]/student/[studentId].tsx`) lists Preferred name and opens an existing Details editor on that row. The photo sheet is a separate control (`Change photo`). Office People stays on `/profile?person=` and `ProfileDetails` already lists Preferred name for a student with `student_id`. Save path is `students.metadata.preferred_name` plus `name_aliases` upsert. DITL-O-07 beat 3 is SUPPORTED. Beat 5 photo extract stays GAP.

**RESULT:** QA Supervisor APPROVED 2026-09-27. Intent gaps remaining: none. Not a build. Not a new Details screen. Not a photo extractor. DITL IMPACT: UPDATE_CASES.

**OPEN ISSUES:** PM stamp is still `t_50a11b62`. Dual stamp is not MET until that line is APPROVED. Finding `t_87f01316` stays blocked and unassigned.

**ESCALATION NEEDED:** No.

**RECOMMENDED NEXT ACTION:** Chief of Staff starts the Surface workflow only after this stamp and the Product Manager stamp are both APPROVED. After that loop is terminal, CoS staffs `qa-engineer` from section 9. CoS files the sticky `DITL-UPDATE` from the UPDATE_CASES verdict. This seat does not staff and does not unblock `t_87f01316`.
