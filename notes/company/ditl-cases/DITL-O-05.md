# DITL-O-05 Cases (Class + teacher assignment lifecycle)

**Plan:** [DITL-O-05](../ditl-plans/DITL-O-05.md)
**Preconditions (all cases):** F-OFFICE admin, F-TEACHER-A/B/C, S1-S5.

**DITL-O-05-UI-01** | tags: class, staff, admin
- Pre: F-OFFICE admin=`ditl-admin`, F-TEACHER-A=`ditl-teacher-a`, S1=`Jordan Lee`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Create new class Math-A. 3. Assign `ditl-teacher-a` as owner. 4. Enroll S1 to Math-A. 5. Verify roster.
- Expected: Lifecycle works; assignments persisted.
- Artifact: none
- DB assert: classes, staff_assign, enrollments
- Teardown: remove assignments, sign out.
- PARTIAL/GAP: none

**DITL-O-05-UI-02** | tags: class, staff
- Pre: F-OFFICE admin=`ditl-admin`, F-TEACHER-A=`ditl-teacher-a`, F-TEACHER-B=`ditl-teacher-b`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Reassign Math-A owner from A to B. 3. Verify history preserved on staff_assign.
- Expected: History preserved; new owner active.
- Artifact: none
- DB assert: staff_assign history
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-05-UI-03** | tags: class, staff
- Pre: F-OFFICE admin=`ditl-admin`, F-TEACHER-C=`ditl-teacher-c`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Attempt delete-from-school on victim teacher C. 3. Document explicit GAP.
- Expected: GAP per plan (delete victim not supported).
- Artifact: none
- DB assert: none
- Teardown: sign out.
- PARTIAL/GAP: delete victim = GAP

**DITL-O-05-UI-04** | tags: class, staff
- Pre: F-OFFICE admin=`ditl-admin`, teachers
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Reassign class. 3. Verify no ownership bleed to other teachers.
- Expected: Correct ownership enforced.
- Artifact: none
- DB assert: staff_assign isolation
- Teardown: sign out.
- PARTIAL/GAP: none
