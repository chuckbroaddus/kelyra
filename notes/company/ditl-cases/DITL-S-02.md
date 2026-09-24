# DITL-S-02 Cases (Student grades Diary Ask)
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

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

**DITL-S-02-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog

- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat
