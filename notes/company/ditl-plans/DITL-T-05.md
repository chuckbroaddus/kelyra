# DITL-T-05 — Handwritten student data card → existing student
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-05 |
| Title | Teacher: photograph handwritten student data card; associate fields to existing student |
| Primary hat | teacher |
| Support | SUPPORTED intent `student_card` (ui-design §14.2 D); human confirm; no invent student |
| Regression tags | `capture`, `student-card`, `bio`, `metadata`, `matcher`, `ask-dual`, `ferpa`, `teardown` |
| CEO story | Handwritten student data card scan → existing record |

## Goal / story

Teacher photographs a **handwritten** student data card (name, date, address, phone, email, birthday, emergency contacts). Product classifies `student_card`, proposes canonical metadata fields + student guess. Teacher confirms **existing** `studentId` (spoken name and/or roster picker — **never invent** a roster row). Confirmed fields persist on that student; QE asserts DB accuracy; teardown reverts bio + deletes card capture.

## Preconditions / fixtures

- F-TEACHER-A; roster includes **existing** target S1 (do not create new student this plan)
- `F-ART-CARD-STUDENT-HW` handwritten card photo fixture (see index F-ARTIFACTS)
- Baseline snapshot of S1 `students.metadata` + `name_aliases` before run
- Camera permissions; active class with S1 enrolled

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in teacher | SUPPORTED | `/sign-in` tray | — |
| 2 | Capture card photo | SUPPORTED | `/capture` shutter | **PHYSICAL-ONLY** camera |
| 3 | Spoken name / picker for **existing** student | SUPPORTED | proposal sheet AvatarTray / Unknown | PHYSICAL + UI confirm; Ask does not OCR-insert |
| 4 | Intent `student_card`; review proposed `fields[]` | SUPPORTED | proposal sheet checkboxes | no Ask invent Document AI; may `open_screen` capture/inbox |
| 5 | Human confirm write metadata on existing student | SUPPORTED | primary Save on sheet | Ask `update_student` **after** fields known — dual path: UI extract+confirm **or** Ask update with same values on second pass |
| 6 | **DB assert** each canonical field | SUPPORTED | Details UI read-back | Ask read student if tool lists fields |
| 7 | Card image filed as note_only capture (no grade) | SUPPORTED | product behavior | — |
| 8 | IEP/504 lookalike control (optional) | SUPPORTED | force note-only; no IEP columns | — |
| 9 | Reverse: revert metadata to baseline; delete capture | SUPPORTED | Details clear keys; delete capture | `update_student` revert; capture delete PARTIAL/UI |
| 10 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: photo → confirm existing student → confirm fields → DB assert → revert → sign-out
- Multiplicity: wrong-guess twin names — picker corrects; second student not written
- Dual-hat: none (office field path → O-07)
- Non-goals: invent student; IEP/504 extraction; SIS columns; auto-grade; parent_card path (separate); OCR-name-as-sole-matcher for homework (this plan is card fields + existing id)

## Artifacts + DB assert

| Field | Source on card | DB target after confirm |
|-------|----------------|-------------------------|
| preferred / given name | handwritten | `students.metadata.preferred_name`; upsert `name_aliases` |
| birthday | handwritten | `metadata.birthday` `YYYY-MM-DD` |
| phone / email / address | handwritten | `metadata.phone` / `email` / `address` |
| emergency name/phone | handwritten | `metadata.emergency_name` / `emergency_phone` |
| grade/age optional | handwritten | `metadata.grade_or_age` |
| unrecognized lines | — | `metadata.notes` only |
| capture | photo asset | `captures` note_only on student; **no** grade cell |

Unchecked proposed fields must **not** write. Clear = delete key (not `""`).

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — metadata + capture/asset.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `students.metadata` keys written this run | Details revert to baseline snapshot | `update_student` baseline | metadata keys match pre-run baseline; no extra keys |
| `name_aliases` preferred upsert | remove test alias if added | same | aliases baseline |
| note_only capture + asset | delete capture | PARTIAL | no leftover capture/asset for card |

**Order:** revert metadata → delete capture/asset → sign out. Idempotent.
**Isolation:** existing S1 row stays; never delete student.

## Suggested QE themes

Existing student only; field-level DB parity; FERPA no IEP columns; teardown restores baseline; dual-path UI extract + Ask update.

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
