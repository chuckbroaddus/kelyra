# DITL-S-02 Cases (Student grades Diary Ask)

**Plan:** [DITL-S-02](../ditl-plans/DITL-S-02.md)
**Preconditions (all cases):** S1, published grades, Diary available.

**Preconditions (all cases):** F-STUDENT-LOGIN S1=`ditl-student-s1` (Jordan Lee), grades published (T-05), Diary available.

**DITL-S-02-UI-01** | tags: grades, diary, ask, student
- Pre: S1, grades published
- Steps (UI): 1. Sign in `ditl-student-s1`. 2. Diary tab (/diary or grades). 3. View published grades for Math. 4. Tap explain on item. 5. Confirm Ask opens.
- Expected: Grades visible; Ask dual works; own grades only.
- Artifact: none
- DB assert: no mutation
- Teardown: sign out.
- Routes: /sign-in, /diary, /grades, ask entry
- PARTIAL/GAP: none

**DITL-S-02-ASK-01** | tags: grades, diary, ask, student
- Pre: same
- Steps (Ask): 1. `/ask` my_grades for S1. 2. explain on specific assignment. 3. Confirm read-only.
- Expected: Read only; isolation per student.
- PARTIAL/GAP: none

**DITL-S-02-UI-02** | tags: grades, diary, student
- Pre: same
- Steps (UI): 1. Sign in. 2. Grades list. 3. Filter by class. 4. Drill to assignment detail.
- Expected: Correct S1 data; no S2 bleed.
- Teardown: sign out.
- PARTIAL/GAP: none

**Thickened via small patches per rule.**