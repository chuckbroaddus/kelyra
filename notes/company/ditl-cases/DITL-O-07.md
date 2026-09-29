# DITL-O-07 Cases (Office bio attach existing student (card fields))
<!-- DITL-UPDATE t_79d94259 2026-09-28: manual preferred_name edit is separate from the photo-extract GAP -->
<!-- DITL-UPDATE t_151cae2d 2026-09-29: Stamp 6 — office contact card no longer photo-extract gap; UI-01/UI-02 stay manual preferred-name -->

**Plan:** [DITL-O-07](../ditl-plans/DITL-O-07.md)
**Preconditions (all cases):** F-OFFICE admin, S1, F-ART-CARD-STUDENT-HW, metadata keys per seed.

**DITL-O-07-UI-01** | tags: bio, student_card, admin
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`, metadata keys per seed, `ditl-pen-student-card-S-01.jpg`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Open Details for existing S1. 3. Tap the Preferred name row (not the photo circle). It opens the existing Details editor, not the photo sheet. 4. Type preferred_name=Jordy and save. 5. Photo attach of `ditl-pen-student-card-S-01.jpg` is a separate step and is not how the name is saved. Do not rewrite this case into a camera / Open Capture test.
- Expected: Manual preferred_name edit saves on existing S1 only. The Preferred name row does not open the photo sheet. No new student. No photo extractor invented for this case. No Capture tray tab added. **Superseded, kept:** treating office photo-extract from the card as a known GAP that blocks this manual path, or as a fail of this case. Plan Stamp 6: a contact card on either office seat is no longer a photo-extract gap; this case remains the manual preferred-name path only.
- Artifact: `ditl-pen-student-card-S-01.jpg`
- DB assert: student metadata on S1 only
- Teardown: clear keys, delete artifact, sign out.
- PARTIAL/GAP: none for manual preferred_name. **Superseded, kept:** "office photo-extract from the card is a known GAP" as the reason this seat stays dark or as this case's gap. Do not fail the manual edit when extract is absent. Do not add a Capture tray tab. Camera/Open Capture contact-card prove-out is not UI-01.

**DITL-O-07-UI-02** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. On S1 Details, edit preferred_name by hand and save. Confirm the photo sheet did not open from that row. 3. Confirm S2–S5 are unchanged. 4. Do not use a photo extractor to write the name. Do not rewrite this case into a camera test.
- Expected: Manual edit stays on S1. Sibling names do not change. No photo extractor added for this case. No Capture tray tab. **Superseded, kept:** photo-extract remains a separate GAP that defines this case. Stamp 6: contact card is not a photo-extract gap on either office seat; UI-02 stays manual preferred-name only.
- DB assert: preferred_name on S1 only
- Teardown: sign out.
- PARTIAL/GAP: none for manual preferred_name. **Superseded, kept:** "office photo-extract from the card is a known GAP" as this case's gap line. Do not treat a failed extract as a fail of the manual preferred_name edit.

**DITL-O-07-UI-03** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Clear one metadata key path on S1. 3. Verify key removed from students.metadata.
- Expected: Key removed cleanly. No Capture tray tab added or removed by this case.
- Artifact: none
- DB assert: metadata key deleted
- Teardown: sign out.
- PARTIAL/GAP: none

## Changelog

- **2026-09-29 (t_151cae2d):** Stamp 6 — office contact card no longer a photo-extract gap because of missing Capture tray; UI-01 and UI-02 stay manual preferred-name path; no Capture tray tab
- **2026-09-28 (t_79d94259):** manual preferred_name edit is separate from the photo-extract GAP
