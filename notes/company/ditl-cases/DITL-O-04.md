# DITL-O-04 Cases (Banned pickup / messy divorce)

**Plan:** [DITL-O-04](../ditl-plans/DITL-O-04.md)
**Preconditions (all cases):** F-OFFICE admin, P1/P2/S1, banned/restricted fixture.

**DITL-O-04-UI-01** | tags: restrictions, notify, admin
- Pre: F-OFFICE admin=`ditl-admin`, `ditl-parent-1` (P1), S1=`Jordan Lee`, banned/restricted fixture
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Set banned pickup for `ditl-parent-1` on S1. 3. Verify notify path to P1. 4. Confirm restriction in pickup_restrictions.
- Expected: Restriction enforced; notify sent; ban active on P1.
- Artifact: none
- DB assert: restrictions, notifications
- Teardown: remove ban, sign out.
- PARTIAL/GAP: none

**DITL-O-04-UI-02** | tags: restrictions, notify
- Pre: F-OFFICE admin=`ditl-admin`, `ditl-parent-1` banned on S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Attempt pickup by banned `ditl-parent-1` on S1. 3. Confirm fail-closed.
- Expected: Pickup denied; restriction enforced.
- Artifact: none
- DB assert: restrictions active
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-04-UI-03** | tags: restrictions, notify
- Pre: F-OFFICE admin=`ditl-admin`, `ditl-parent-2` allowed co-parent on S1
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Verify `ditl-parent-2` allowed pickup on S1. 3. Confirm access granted.
- Expected: Access granted for allowed co-parent.
- Artifact: none
- DB assert: no restriction on P2
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-O-04-UI-04** | tags: restrictions, notify
- Pre: F-OFFICE admin=`ditl-admin`, ban fixture
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Set/clear ban. 3. Query audit/history. 4. Verify preserve.
- Expected: Audit log intact.
- Artifact: none
- DB assert: restrictions history
- Teardown: sign out.
- PARTIAL/GAP: none
