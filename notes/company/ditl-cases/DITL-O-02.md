# DITL-O-02 Cases (Roster + family link + bio + class)

**Plan:** [DITL-O-02](../ditl-plans/DITL-O-02.md)
**Preconditions (all cases):** F-OFFICE admin, S1-S5, F-PARENT-1/2, P-ADMIN.

**DITL-O-02-UI-01** | tags: roster, people, admin
- Pre: F-OFFICE admin=`ditl-admin`, S1=`Jordan Lee`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Navigate to Roster list for Math class. 3. Link `ditl-parent-1` (P1) to S1. 4. Link `ditl-parent-2` (P2) to S1. 5. Edit bio fields on S1.
- Expected: Links created in parent_students; bio saved to students.metadata.
- Artifact: none
- DB assert: parents, students, links on S1
- Teardown: unlink if test, sign out.
- PARTIAL/GAP: none

**DITL-O-02-UI-02** | tags: roster, people
- Pre: F-OFFICE admin=`ditl-admin`, S1-S5
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Assign S1 to Math class (A). 3. Assign S3 to English class (B). 4. Verify roster shows correct enrollment per class.
- Expected: Class assignments correct; no bleed between classes.
- Artifact: none
- DB assert: enrollments table
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-02-UI-03** | tags: roster, people
- Pre: F-OFFICE admin=`ditl-admin`, S1, P-ADMIN
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Multi family link P-ADMIN + `ditl-parent-1` + `ditl-parent-2` to S1. 3. Verify all three parents visible in roster.
- Expected: P-ADMIN + P1/P2 links active.
- Artifact: none
- DB assert: parent_students for three
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-02-UI-04** | tags: roster, people
- Pre: F-OFFICE admin=`ditl-admin`, S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Update bio fields on S1 (preferred_name, birthday, phone). 3. Assert canonical metadata keys written.
- Expected: Metadata keys updated on S1.
- Artifact: none
- DB assert: students.metadata
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-02-UI-05** | tags: roster, people
- Pre: F-OFFICE admin=`ditl-admin`, S1-S5
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Perform roster ops on S1. 3. Verify no data bleed to S2-S5.
- Expected: Isolation enforced; no bleed.
- Artifact: none
- DB assert: no cross-student updates
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-02-ASK-PARTIAL** | tags: ask, roster
- Pre: F-OFFICE admin=`ditl-admin`
- Steps (Ask): 1. Sign in. 2. Issue `/ask` roster query (PARTIAL surface). 3. Note explicit GAP.
- Expected: GAP noted; full roster tools not supported in Ask.
- Artifact: none
- DB assert: none
- Teardown: sign out.
- PARTIAL/GAP: full roster tools = PARTIAL/GAP on Ask
