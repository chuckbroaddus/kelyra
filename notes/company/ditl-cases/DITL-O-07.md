# DITL-O-07 Cases (Office bio attach existing student (card fields))
<!-- DITL-UPDATE t_79d94259 2026-09-28: manual preferred_name edit is separate from the photo-extract GAP -->

**Plan:** [DITL-O-07](../ditl-plans/DITL-O-07.md)
**Preconditions (all cases):** F-OFFICE admin, S1, F-ART-CARD-STUDENT-HW, metadata keys per seed.

**DITL-O-07-UI-01** | tags: bio, student_card, admin
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`, metadata keys per seed, `ditl-pen-student-card-S-01.jpg`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Open Details for existing S1. 3. Tap the Preferred name row (not the photo circle). It opens the existing Details editor, not the photo sheet. 4. Type preferred_name=Jordy and save. 5. Photo attach of `ditl-pen-student-card-S-01.jpg` is a separate step and is not how the name is saved.
- Expected: Manual preferred_name edit saves on existing S1 only. The Preferred name row does not open the photo sheet. Photo-from-card extract stays a known GAP and is not this case. No new student. No photo extractor added.
- Artifact: `ditl-pen-student-card-S-01.jpg`
- DB assert: student metadata on S1 only
- Teardown: clear keys, delete artifact, sign out.
- PARTIAL/GAP: office photo-extract from the card is a known GAP. Do not treat a failed extract as a fail of the manual preferred_name edit.

**DITL-O-07-UI-02** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. On S1 Details, edit preferred_name by hand and save. Confirm the photo sheet did not open from that row. 3. Confirm S2–S5 are unchanged. 4. Do not use a photo extractor to write the name.
- Expected: Manual edit stays on S1. Sibling names do not change. Photo-extract remains a separate GAP. No photo extractor added.
- DB assert: preferred_name on S1 only
- Teardown: sign out.
- PARTIAL/GAP: office photo-extract from the card is a known GAP. Do not treat a failed extract as a fail of the manual preferred_name edit.

**DITL-O-07-UI-03** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Clear one metadata key path on S1. 3. Verify key removed from students.metadata.
- Expected: Key removed cleanly.
- Artifact: none
- DB assert: metadata key deleted
- Teardown: sign out.
- PARTIAL/GAP: none
