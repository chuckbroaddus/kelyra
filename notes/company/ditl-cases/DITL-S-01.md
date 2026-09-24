# DITL-S-01 Cases (Student assignments submit)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar R4/R5/3DW/P6 navigation case -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

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

**DITL-S-01-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog


- **2026-09-24 (t_0a62f427):** Calendar R4/R5/3DW/P6 navigation case
- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat

**DITL-S-01-UI-CAL-R5** | tags: calendar, chrome
- Pre: student login; Calendar reachable
- Steps (UI): 1. Open Calendar. 2. Confirm phone Year-first (or web Month default per seat). 3. Tap-zoom Year→Month→Day; Up/back hierarchical. 4. PersonTabs Y/M/W/D + gear; Clear Filters → none. 5. PeriodPager 3D wheel (or << label >> fail). 6. Leave to Diary and back — first-tap titles correct; Diary≠Calendar; Desk≠Year.
- Expected: R4/R5/CR/3DW/P6 laws above; seat-scoped.
- PARTIAL/GAP: none for chrome navigation

