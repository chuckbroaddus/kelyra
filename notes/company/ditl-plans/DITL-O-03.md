# DITL-O-03 — Remove + archive (history must remain)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-03 |
| Title | Office/Super: remove from class; deactivate people; history preserved |
| Primary hat | administrator **and** superintendent |
| Support | PARTIAL — detach/delete shipped as hard-delete; soft archive GAP; attendance NOT IN PRODUCT |
| Regression tags | `office`, `roster`, `archive`, `grades-history`, `delete`, `ask-dual`, `ferpa` |
| CEO story | 2 — Remove + archive (do not lose history) |

## Goal / story

Office removes a student from a class; removes students/parents from being active; **CEO expects** archived grade and attendance records to remain. Product today is largely hard-delete on person/class work — plan records honest Support tags so QE fails GAP without inventing tables.

## Preconditions / fixtures

- F-GRADES-HIST: student with approved grades in Class A and Class B
- Student with two enrollments (remove-from-one-class path available)
- F-OFFICE both hats

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Baseline: note grade cells / submissions IDs for Sx in Class A+B | SUPPORTED | gradebook / student record read | Ask `list_grade_cells` if allowed else UI-only note |
| 3 | Remove student from Class A only (still in B) | SUPPORTED (hard detach) | Student Details **Remove from {class}** (ui-design destructive) | Ask: no dedicated `unenroll` tool → **PARTIAL/GAP** (`delete_student` is full person — do not use as unenroll) |
| 4 | CEO check: grades/attendance for Class A still archived | PARTIAL/GAP | Inspect remaining DB/UI history | Same. Product copy says class work **deleted** on remove — expect fail vs CEO “remain” unless product changed |
| 5 | Attendance archive remains | NOT IN PRODUCT | Negative: no attendance UI | Ask must not invent attendance |
| 6 | Deactivate student “not active” without losing history | PARTIAL/GAP | If only hard-delete person exists, document; do not soft-invent | Ask `delete_student` = hard-delete — **not** soft archive |
| 7 | Deactivate parent similarly | PARTIAL/GAP | parent delete UI | Ask `delete_parent` hard-delete |
| 8 | If hard-delete used on disposable fixture only | SUPPORTED destructive | ConfirmSheet “cannot be undone” | Ask confirm before delete tools |
| 9 | FERPA: co-parent must not see other family’s unpublished | SUPPORTED | parent Home walls | Ask parent tools walls |
| 10 | Reverse desire: restore active / undelete | PARTIAL/GAP explicit non-goal if no undelete | — | — |
| 11 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: baseline → detach → history assert → optional delete fixture → sign-out
- Reverse: undelete/reactivate **non-goal** unless product ships it
- Multiplicity: two-class student; two parents
- Non-goals: invent archive tables; SIS; treating hard-delete success as CEO archive pass

## OPEN (plan-local)

Map to index OPEN #1–2. QE severity after stamp: missing soft-archive vs CEO = product defect disposition by PM, not silent plan skip.

## Suggested QE themes

Remove-from-class last-class refuse; history IDs; GAP tickets not false greens.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — detach/delete (destructive by design).

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Removed enrollment | already removed — **re-seed** fixture if shared env needs student | enroll again only if restoring seed | enrollment absent for removed class; other-class grades per product |
| Hard-deleted person | cannot undelete — **re-seed** F-GRADES-HIST after run | `delete_student` | person gone; history PARTIAL/GAP vs CEO archive story |
| Attendance archive beat | NOT IN PRODUCT — no rows | — | do not invent tables |

**Order:** complete destructive beats → **re-seed fixtures** for next run → sign out.
**Note:** teardown here is often **re-seed**, not undo. Isolation: only tagged victims.

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
