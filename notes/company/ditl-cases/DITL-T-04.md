# DITL-T-04 Cases (Teacher academic day)

**Plan:** [DITL-T-04](../ditl-plans/DITL-T-04.md)
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a`, S1-S5, F-ART-HW-HIST-HW=`ditl-pen-hist-homework-T-04.jpg`, F-ART-KEY-MATH-MIXED=`ditl-mixed-math-key-T-04.jpg`, F-ART-KEY-ENG-TYPED=`ditl-typed-eng-key-T-04.jpg`, F-ART-SYL-SCI-TYPED=`ditl-typed-sci-syllabus-T-04.jpg`, assignments, passwords `DITL-teacher-test`.

**DITL-T-04-UI-01** | tags: author, grades, comms, teacher, capture
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee`, F-ART-HW-HIST-HW=`ditl-pen-hist-homework-T-04.jpg`, passwords `DITL-teacher-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Author new assignment at `/assignment` using history HW.
  3. Capture HW for S1.
  4. Grade via gradebook.
  5. Message parent.
  6. Check comms.
- Expected: Full day flow; all linked.
- Artifact: `ditl-pen-hist-homework-T-04.jpg`, `ditl-mixed-math-key-T-04.jpg`
- DB assert: assignments, artifacts, grades, messages
- Teardown: delete test artifacts/assignments, sign out.
- PARTIAL/GAP: none

**DITL-T-04-UI-02** | tags: author, grades
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Weighted overall verify in gradebook.
  3. Confirm correct calc.
- Expected: Correct calc.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-04-UI-03** | tags: author, grades, capture
- Pre: same + F-ART-KEY-MATH-MIXED=`ditl-mixed-math-key-T-04.jpg`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Key capture path for math key.
  3. Ingest success verify.
- Expected: Ingest success.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-04-UI-04** | tags: author, grades, comms
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Parent Ask tie-in check.
  3. Verify visible.
- Expected: Visible.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-04-UI-05** | tags: author, grades
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Multi student assign path.
  3. Verify no bleed across students.
- Expected: No bleed.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-04-UI-06** | tags: author, grades
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Publish + notify path.
  3. Confirm parent sees.
- Expected: Parent sees.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-04-ASK-01** | tags: ask, grades, author
- Pre: same
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Use `/ask` assignment list + grade explain.
  3. Verify dual path.
- Expected: Dual path.
- Teardown: sign out.
- PARTIAL/GAP: none
