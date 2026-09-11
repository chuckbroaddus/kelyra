# DITL-O-01 Cases (Office People/Manage partial)

**Plan:** [DITL-O-01](../ditl-plans/DITL-O-01.md)
**Preconditions (all cases):** F-OFFICE super=`ditl-super`, F-OFFICE admin=`ditl-admin`.

**DITL-O-01-UI-01** | tags: office, people
- Pre: F-OFFICE admin=`ditl-admin`
- Steps (UI): 1. Sign in as `ditl-admin` (password DITL-admin-test). 2. Navigate to People tab from office chrome. 3. View directory list (supported partial). 4. Attempt unsupported manage action (document GAP).
- Expected: Supported beats render/work; unsupported surfaces show explicit GAP note.
- Artifact: none
- DB assert: per supported (profiles, links visible to admin)
- Teardown: sign out.
- PARTIAL/GAP: NOT IN PRODUCT beats documented as GAP

**DITL-O-01-UI-02** | tags: office, people
- Pre: F-OFFICE super=`ditl-super`, F-OFFICE admin=`ditl-admin`
- Steps (UI): 1. Sign in as `ditl-super`. 2. Verify school identity edit available (logo/name). 3. Sign in as `ditl-admin`. 4. Confirm matrix shows restricted (no super beats).
- Expected: Permission matrix enforces super-only vs admin.
- Artifact: none
- DB assert: school settings visible only to super
- Teardown: sign out.
- PARTIAL/GAP: partial per plan (super beats only)