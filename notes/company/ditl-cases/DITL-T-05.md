# DITL-T-05 Cases (Handwritten student data card → existing student)
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

**Plan:** [DITL-T-05](../ditl-plans/DITL-T-05.md)
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a`, S1=`Jordan Lee` baseline (existing row only, never create new), F-ART-CARD-STUDENT-HW=`notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg`, metadata keys per seed, passwords `DITL-teacher-test`.

**DITL-T-05-UI-01** | tags: capture, student_card, teacher, PHYS
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee` (existing), `notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Capture card photo (T-05 PHYS camera) at `/capture` using `ditl-pen-student-card-S-01.jpg`.
  3. Match to existing S1=`Jordan Lee` only (no new student).
  4. Confirm fields (grade_or_age, aliases).
- Expected: Card attached to S1 only; no new student created.
- Artifact: `notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg`
- DB assert: student metadata updated on existing S1; no insert
- Teardown: clear metadata keys, delete artifact, sign out.
- PARTIAL/GAP: none (PHYSICAL-ONLY camera path explicit)

**DITL-T-05-UI-02** | tags: capture, student_card
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Verify matcher uses seed S1=`Jordan Lee` only.
  3. Confirm no bleed to S2-S5.
- Expected: No bleed to S2-S5.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-05-UI-03** | tags: capture, student_card
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Field update path (canonical keys) on existing S1.
  3. Verify updates only; clear works.
- Expected: Updates only; clear works.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-05-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog

- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat
