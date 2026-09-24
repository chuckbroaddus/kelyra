# DITL-O-05 — Class + teacher assignment lifecycle
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-05 |
| Title | Office/Super: create class, assign teacher, roster, change teacher, delete teacher |
| Primary hat | administrator **and** superintendent |
| Support | SUPPORTED create_class / add|remove teacher / enroll; PARTIAL whole-school teacher delete |
| Regression tags | `office`, `classes`, `teachers`, `roster`, `ask-dual`, `lifecycle` |
| CEO story | 4 — Class + teacher assignment lifecycle |

## Goal / story

Office creates a class, assigns a teacher, assigns student roster, **changes** the teacher, then **deletes** a teacher from the school (CEO). Dual path UI+Ask. Teacher deletion while class has roster must not orphan silently.

## Preconditions / fixtures

- F-TEACHER-A, F-TEACHER-B/C available
- Students to enroll; F-OFFICE

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Create class | SUPPORTED | Classes tab / admin create | `/ask` `create_class` (officeOnly) |
| 3 | Assign teacher A | SUPPORTED | `/admin/class/{id}` add teacher | `/ask` `add_teacher_to_class` |
| 4 | List teachers on class | SUPPORTED | admin class card | `/ask` `list_class_teachers` |
| 5 | Assign roster students | SUPPORTED | roster UI | `/ask` `enroll_student` / `add_student` |
| 6 | Change teacher: add B, remove A | SUPPORTED | admin class remove/add | Ask `add_teacher_to_class` + `remove_teacher_from_class` |
| 7 | Confirm class still has roster after teacher change | SUPPORTED | roster | `list_roster` |
| 8 | Delete teacher from school (person/login) | PARTIAL/GAP | If no school-wide teacher delete RPC, document; removing from all classes ≠ delete person | Ask: no `delete_teacher` tool — GAP |
| 9 | Multiplicity: second class independent teachers | SUPPORTED | create second class | Ask create_class |
| 10 | Reverse: re-add teacher A to a class | SUPPORTED | add teacher | Ask add_teacher |
| 11 | Optional delete empty class | SUPPORTED destructive | delete class ConfirmSheet | Ask `delete_class` with confirm |
| 12 | Super-only smoke: matrix/identity not required here | — | — | — |
| 13 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: create → staff → roster → restaff → delete-teacher attempt → sign-out
- Reverse: re-add teacher; class delete only when intentional
- Multiplicity: two classes; roster present during teacher swap
- Non-goals: teacher self-create class; office teaching desk; multi-school

## Suggested QE themes

Office-only create_class; teacher swap with live roster; honest GAP on school teacher delete.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — classes, teacher assigns, roster.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Class created `ditl-*` | delete class (cascades class work) | delete_class tool else UI | `classes` no ditl class; class enrollments/assignments gone |
| Teacher assigned/reassigned | remove_teacher_from_class | tools if listed | class_teachers baseline |
| Whole-school teacher delete attempt | PARTIAL — re-seed F-TEACHER-C if deleted | may GAP | teachers/profiles seed restored |
| Enrollments on test class | deleted with class | — | clean |

**Order:** remove roster → remove teachers from class → delete class → re-seed any deleted shared teacher → sign out.
**Do not:** delete F-TEACHER-A home class unless run created a disposable copy.

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
