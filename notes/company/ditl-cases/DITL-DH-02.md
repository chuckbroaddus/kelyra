# DITL-DH-02 Cases (Dual-hat Office+Parent)

**Plan:** [DITL-DH-02](../ditl-plans/DITL-DH-02.md)
**Preconditions (all cases):** F-DH-OP=`ditl-admin` (admin job + P-ADMIN parent to S1), S1, seat switch.

**Preconditions (all cases):** F-DH-OP=`ditl-admin` (admin job + P-ADMIN parent to S1=`Jordan Lee`), S1, seat switch.

**DITL-DH-02-UI-01** | tags: dual-hat, office, parent, auth
- Pre: F-DH-OP, S1
- Steps (UI): 1. Sign in `ditl-admin` (DITL-admin-test). 2. Office seat: roster view (/admin/roster). 3. Switch to parent seat (My children). 4. Confirm S1 only (P-ADMIN link, no other students). 5. View S1 details.
- Expected: Isolation; S1 visible as parent; office tools hidden in parent seat.
- Artifact: none
- DB assert: seat context
- Teardown: sign out.
- Routes: /sign-in, /admin/roster, parent my-children, /student/detail
- PARTIAL/GAP: none

**DITL-DH-02-UI-02** | tags: dual-hat, office, parent
- Pre: same
- Steps (UI): 1. Office bio attach in office seat (S1). 2. Switch. 3. Parent view S1.
- Expected: Updates visible correctly in parent.
- PARTIAL/GAP: none

**DITL-DH-02-UI-03** | tags: dual-hat, office, parent
- Pre: same
- Steps (UI): 1. Parent Ride in parent seat (S1). 2. Confirm no office tools visible.
- Expected: No office bleed.
- PARTIAL/GAP: none

**DITL-DH-02-ASK-01** | tags: dual-hat, ask, office, parent
- Pre: same
- Steps (Ask): 1. `/ask` in office context (roster). 2. Switch to parent context. 3. `/ask` my_children S1.
- Expected: Context aware; isolation.
- PARTIAL/GAP: none

**Thickened via small patches per rule.**