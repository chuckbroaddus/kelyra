# DITL-O-07 Cases (Office bio attach existing student (card fields))

**Plan:** [DITL-O-07](../ditl-plans/DITL-O-07.md)
**Preconditions (all cases):** F-OFFICE admin, S1, F-ART-CARD-STUDENT-HW, metadata keys per seed.

**DITL-O-07-UI-01** | tags: bio, student_card, admin
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`, metadata keys per seed, `ditl-pen-student-card-S-01.jpg`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Open Details view for S1. 3. Attach `ditl-pen-student-card-S-01.jpg` to existing S1. 4. Update canonical metadata keys (preferred_name=Jordy, birthday=2017-04-12, phone=555-0101, email, address, emergency_name, emergency_phone, grade_or_age=3rd).
- Expected: Updates on existing S1 only; no new student created; photo attached.
- Artifact: `ditl-pen-student-card-S-01.jpg`
- DB assert: student metadata on S1 only
- Teardown: clear keys, delete artifact, sign out.
- PARTIAL/GAP: none

**DITL-O-07-UI-02** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Attach card to S1. 3. Verify matcher updates S1 only (no bleed to S2-S5). 4. Check metadata keys.
- Expected: No bleed; updates isolated to S1.
- Artifact: `ditl-pen-student-card-S-01.jpg`
- DB assert: student metadata on S1 only
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-07-UI-03** | tags: bio, student_card
- Pre: F-OFFICE admin=`ditl-admin`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Clear one metadata key path on S1. 3. Verify key removed from students.metadata.
- Expected: Key removed cleanly.
- Artifact: none
- DB assert: metadata key deleted
- Teardown: sign out.
- PARTIAL/GAP: none
