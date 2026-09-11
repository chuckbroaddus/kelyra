# DITL-S-01 Cases (Student assignments submit)

**Plan:** [DITL-S-01](../ditl-plans/DITL-S-01.md)
**Preconditions (all cases):** F-STUDENT-LOGIN S1=`ditl-student-s1`, S1=`Jordan Lee`, assignments published.

**Preconditions (all cases):** F-STUDENT-LOGIN S1=`ditl-student-s1` (Jordan Lee), F-STUDENT-LOGIN S2=`ditl-student-s2` (Jamie Lee), assignments published (T-04), enrolled in Math(A) + English(B).

**DITL-S-01-UI-01** | tags: submit, student, todo, multi-class
- Pre: S1 login, assignment ready in todo
- Steps (UI): 1. Sign in `ditl-student-s1` (DITL-student-test). 2. Open Assignments tab (/todo). 3. Select assigned practice. 4. Answer items. 5. Submit. 6. Confirm in Done tab. 7. Switch class context (/student/class) verify isolation.
- Expected: Submission recorded for S1 only; teacher sees.
- Artifact: none
- DB assert: submissions row created for S1
- Teardown: reset submission status to assigned, sign out.
- Routes: /sign-in, /todo, assignment detail, /student/class
- PARTIAL/GAP: none

**DITL-S-01-ASK-01** | tags: ask, submit, student
- Pre: same
- Steps (Ask): 1. `/ask` list_my_practice for S1. 2. open_screen to practice detail. 3. Confirm submit UI-primary.
- Expected: Dual path visible; Ask ground per class.
- PARTIAL/GAP: submit via Ask (UI-primary)

**DITL-S-01-UI-02** | tags: submit, student, abandon
- Pre: same
- Steps (UI): 1. Sign in. 2. Open assignment. 3. Partial work. 4. Navigate away without submit.
- Expected: No half-grade; status assigned.
- Teardown: sign out.
- PARTIAL/GAP: none

**Thickened via small patches per rule.**