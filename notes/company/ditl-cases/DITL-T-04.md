# DITL-T-04 Cases (Teacher academic day)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar R4/R5/3DW/P6 navigation case -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Journal daychrome B + month-survives-Ledger case -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

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

**DITL-T-04-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog



- **2026-09-24 (t_0a62f427):** Calendar R4/R5/3DW/P6 navigation case
- **2026-09-24 (t_2c13f9ac):** Journal daychrome B + month-survives-Ledger case
- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat

**DITL-T-04-UI-JOURNAL-B** | tags: diary, journal, daychrome
- Pre: F-TEACHER-A; tray Diary (ST-A) available
- Steps (UI):
  1. Sign in teacher → tray **Diary** → `/diary` Journal.
  2. Confirm daychrome **layout B**; pick a day; scroll multi-day entries.
  3. Switch Journal → **Ledger** → confirm **month chrome survives** (not torn down); Ledger remains list+range (DB-LEDGER-01 / RR-L).
  4. Return Journal; Today; empty day → New entry opens Diary composer (not Calendar).
  5. Confirm Diary ≠ Calendar surface.
- Expected: follow-active-tab; month survives Ledger; no Calendar event chrome on Diary.
- PARTIAL/GAP: day-browse Ask GAP (hold)

**DITL-T-04-UI-CAL-R5** | tags: calendar, chrome
- Pre: teacher login; Calendar reachable
- Steps (UI): 1. Open Calendar. 2. Confirm phone Year-first (or web Month default per seat). 3. Tap-zoom Year→Month→Day; Up/back hierarchical. 4. PersonTabs Y/M/W/D + gear; Clear Filters → none. 5. PeriodPager 3D wheel (or << label >> fail). 6. Leave to Diary and back — first-tap titles correct; Diary≠Calendar; Desk≠Year.
- Expected: R4/R5/CR/3DW/P6 laws above; seat-scoped.
- PARTIAL/GAP: none for chrome navigation

