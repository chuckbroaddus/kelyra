# DITL-O-03 Cases (Remove + archive history preserve)

**Plan:** [DITL-O-03](../ditl-plans/DITL-O-03.md)
**Preconditions (all cases):** F-OFFICE admin, S1, multi-enroll.

**DITL-O-03-UI-01** | tags: archive, people, admin
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`, multi-enroll
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Remove S1 from Math class (A). 3. Check archive history for Math. 4. Verify S1 still in English if multi.
- Expected: History preserved per class; student removed from active only.
- Artifact: none
- DB assert: archive rows, no hard delete
- Teardown: restore if needed, sign out.
- PARTIAL/GAP: none

**DITL-O-03-UI-02** | tags: archive, people
- Pre: F-OFFICE admin=`ditl-admin`, S1, multi-enroll
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Remove S1 from Math (A). 3. Remove S1 from English (B). 4. Check archive history per class.
- Expected: History preserved per class; student removed from active enrollments.
- Artifact: none
- DB assert: archive rows per class, no hard delete
- Teardown: restore if needed, sign out.
- PARTIAL/GAP: none

**DITL-O-03-UI-03** | tags: archive, people
- Pre: F-OFFICE admin=`ditl-admin`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Perform remove/archive ops. 3. Query archive table. 4. Verify no data loss on S1 record.
- Expected: Archive intact; full history queryable.
- Artifact: none
- DB assert: archive rows intact
- Teardown: sign out.
- PARTIAL/GAP: none
