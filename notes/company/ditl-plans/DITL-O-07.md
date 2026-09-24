# DITL-O-07 — Office bio attach for existing student (card fields)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-07 |
| Title | Office/Super: attach contact/bio fields to existing student (card data); no invent roster |
| Primary hat | administrator **and** superintendent (run both) |
| Support | SUPPORTED Details + `update_student`; photo extract **PARTIAL/GAP** (no office Capture tray) |
| Regression tags | `office`, `bio`, `student-card`, `people`, `ask-dual`, `ferpa`, `teardown` |
| CEO story | Associate student data-card fields to existing DB record (office hat) |

## Goal / story

Office attaches the **same contact/bio field set** as the handwritten student data card onto an **already-existing** student (F-STUDENTS S1). Photo OCR/extract lives on teacher Capture (`DITL-T-05`). Office path: open existing person → edit canonical metadata (UI + Ask) → DB assert → revert. Do not invent Document AI for office chrome.

## Preconditions / fixtures

- F-OFFICE both hats; existing S1 with known baseline `students.metadata`
- Card field values from `F-ART-CARD-STUDENT-HW` transcribed for QE (same expected DB values as T-05)
- Prefer run **after or independent of** T-05 with fresh baseline snapshot

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office/super | SUPPORTED | `/sign-in` office tray | — |
| 2 | Open existing student (search/directory) | SUPPORTED | People / student person | `search_students` / `list_people` |
| 3 | Edit bio fields from card values | SUPPORTED | Details / profile | `update_student` |
| 4 | **DB assert** each canonical key | SUPPORTED | read-back Details | Ask get student if available |
| 5 | Photo-from-card extract on office seat | **PARTIAL/GAP** | no Capture tray on office | no office scan-card tool — do not invent |
| 6 | Reverse: revert metadata to baseline | SUPPORTED | Details | `update_student` |
| 7 | FERPA: no IEP/504 columns | SUPPORTED | Details keys only | same |
| 8 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: find existing student → write fields → assert → revert → sign-out
- Multiplicity: twins — pick correct S1 only
- Dual-hat: not required (DH-02 separate)
- Non-goals: invent student; office camera student_card pipeline; IEP/504; teacher Capture (T-05)

## Artifacts + DB assert

Same targets as T-05: `preferred_name`, `birthday`, `phone`, `email`, `address`, `emergency_*`, optional `grade_or_age`, unrecognized → `notes`. Assert exact values; parent must not see teacher-only keys.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — metadata only on existing student.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `students.metadata` / aliases | revert baseline | `update_student` | baseline match; student row remains |

**Order:** revert → sign out. Never delete S1.
**Isolation:** fixture person only.

## Suggested QE themes

Office vs super parity on update_student; GAP honest on office photo extract; teardown baseline; pairs with T-05.

## Soft v8b chrome (idle/working)

**Soft v8b chrome (idle / working):** Ask header K and other WorkingLine / Soft chrome marks follow Soft v8b:
- **Idle** = original `kelyra.png` (letter only; no face).
- **Working** = PNG letter + face + v7 Soft gas comet on the letter ink box; **1:1** letter outline idle↔working (face/comet overlay only).
- Morph **both ways** idle↔working when work starts/ends; look/blink allowed on working face.
- Opening Kelyra / splash / school logo stay still — do **not** drive Soft from app open alone.
- Dual-hat: same Soft chrome per active seat; no seat-mash Soft.

Strike any Soft-static-idle / pencil-only / v7-plate-as-idle assumptions. Cases that wait on Ask/Busy/capture Asking AI / ingest wait / chrome Ask tab should expect **working** Soft while busy, then return to idle.

SoT: `working-k-avatar-soft-v8b-verbatim-host.md` (+ `working-k-avatar-soft-intent.md` when present). Card `t_b4f598b3`.

## Calendar surface (CAL-R2+)

**Calendar surface (CAL-R2…R5 + CR-CalTabs + CAL-3DW + CAL-P6):** Every role plan that can open Calendar must treat it as a **first-class surface**, not “desk chips only / no calendar.”

### Binding deltas (accumulate; do not thin)
- **R4:** Phone **Year-first**; tap-zoom Year→Month→Day; hierarchical Up/back; quieter view chips; header gear/search/+; Month **Compact|List**; Day **Single|List**. Replace Agenda-default phone assumptions. **Desk ≠ Year**. **Diary ≠ Calendar**. Dual-hat = active seat scope only.
- **CR-CalTabs:** PersonTabs **Y/M/W/D** + right cluster **+ · search · gear**; filters under gear (not trio-above-chips / canvas-filter copy).
- **R5:** First-tap **Diary↔Calendar** titles (no lag); Year **single year row**; Month label **Month, Year**; Week **3/5/7** columns + range **MM/DD/YYYY–MM/DD/YYYY**; Settings **no JUMP** / **no academic preset row** / **no helper footer**; **Clear Filters** = none selected; Calendars **Done → Settings**; Day List continuous density **A** (no date chevron); tight header→tabs.
- **CAL-3DW:** Shared **PeriodPager** 3D horizontal wheel + Set B PeriodLeaf Y/M/W/D; rotateY+scale+dim; RM **no tilt** (keep scale/fade/snap); wheel-fail → `<< label >>`; Agenda Earlier/Later wheel grain; Day List still no drum unless later lock.
- **CAL-P6 (1A 3A 4A 5C 6B 8A 9A 10B):** Full-band drum claim; tap-down + pinch-up + web `<`; empty Day always-on full hour timeline; bidirectional list↔drum lockstep; soft month-edge then commit; drum pinned while PersonTabs hide/show with tray scroll; stack-honest forward restores Calendar; slot tap → Add Event prefilled (no confirm).

### Plan expectations
- Add/keep a UI beat that opens `/calendar` (or tray Calendar when live) and exercises Y/M/W/D + gear Settings lightly for this hat.
- Do **not** add Ask Calendar beats unless the plan already has Ask calendar tools.
- Dual-hat plans: Calendar follows **active seat**; no cross-seat leak.

SoT: `calendar-r5-intent.md`, `calendar-3d-wheel-intent.md`, card `t_0a62f427` comments (R4/CR/R5/3DW/P6). Missing on-disk proveout/intent files noted in card complete comment.

## Changelog


- **2026-09-24 (t_0a62f427):** Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
