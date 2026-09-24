# DITL-P-01 Cases (Parent AM grades + car line)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar R4/R5/3DW/P6 navigation case -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

**Plan:** [DITL-P-01](../ditl-plans/DITL-P-01.md)
**Preconditions (all cases):** F-PARENT-1, S1, S2, published grades on Math (A), V1, Line A, passwords `DITL-parent-test`. No prior Ride events.

**DITL-P-01-UI-01** | tags: grades, avg, chrome-parent, multiplicity, ride
- Pre: F-PARENT-1 (`ditl-parent-1`), S1=`Jordan Lee`, S2=`Jamie Lee`, published grades on Math (A), V1=`DITL-AAA1`, Line A, passwords `DITL-parent-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test` → parent seat.
  2. Confirm tray Home·Ride·Ask (no camera/staff) at `/parent`.
  3. Home (`/parent`): see child chips for S1+S2 (no bleed).
  4. Select S1 (`Jordan Lee`) → thin grades/focus visible (P-H2 style) at `/parent/grades`.
  5. Switch S2 (`Jamie Lee`) → prior state clears (isolation).
  6. Tray Ride → hub at `/parent/ride`.
  7. Select V1=`DITL-AAA1`.
  8. Select S1+S2 for drop-off.
  9. Check-in (photo or first) → position XX visible only at `/parent/ride`.
  10. Leave line → `left` event.
  11. Sign out.
- Expected: Sibling isolation; position only; leave succeeds (no released mint); tray=3 only.
- Artifact: none
- DB assert: ride_events for parent only (type check-in/left); no other parents affected.
- Teardown: per plan: leave line if waiting → sign out (idempotent). Isolation `ditl-` only.
- PARTIAL/GAP: none (Ride check-in PHYSICAL-ONLY shutter noted but UI primary)

**DITL-P-01-ASK-01** | tags: ask-dual, grades, avg
- Pre: same as UI-01
- Steps (Ask):
  1. Route `/sign-in` sign in `ditl-parent-1` / `DITL-parent-test` → parent seat.
  2. Use Ask tool `my_children_progress` (select S1=`Jordan Lee` then S2=`Jamie Lee`).
  3. Use Ask tool `explain_my_class_average` for S1 Math.
  4. Confirm no grade mutation possible (read-only).
- Expected: Dual-path grades read; sibling isolation in Ask ground; no write.
- Artifact: none
- DB assert: no new rows from Ask.
- Teardown: sign out.
- PARTIAL/GAP: vehicle pick / Ride check-in / leave = PARTIAL/GAP (no Ask tools; PHYSICAL-ONLY for camera)

**DITL-P-01-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog


- **2026-09-24 (t_0a62f427):** Calendar R4/R5/3DW/P6 navigation case
- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat

**DITL-P-01-UI-CAL-R5** | tags: calendar, chrome
- Pre: parent login; Calendar reachable
- Steps (UI): 1. Open Calendar. 2. Confirm phone Year-first (or web Month default per seat). 3. Tap-zoom Year→Month→Day; Up/back hierarchical. 4. PersonTabs Y/M/W/D + gear; Clear Filters → none. 5. PeriodPager 3D wheel (or << label >> fail). 6. Leave to Diary and back — first-tap titles correct; Diary≠Calendar; Desk≠Year.
- Expected: R4/R5/CR/3DW/P6 laws above; seat-scoped.
- PARTIAL/GAP: none for chrome navigation

