# DITL-DH-02 — Dual-hat Office+Parent
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-DH-02 |
| Title | Dual-hat: office People/Manage then Parent seat Ride |
| Primary hat | administrator (or superintendent with also_ flags) |
| Other hats | parent seat |
| Support | SUPPORTED office chrome + parent hat; duty Ride under Manage not tray |
| Regression tags | `dual-hat`, `seat-switch`, `office`, `ride`, `people`, `chrome-office`, `chrome-parent`, `ask-dual` |

## Goal / story

Office staff who is also a parent: morning on office seat (Feed/Classes/People/Manage/Ask), links or views people as allowed, opens staff Ride duty via **Manage** altitude (no office Ride tray tab). Later switches to Parent seat for own children’s Ride check-in, then returns to Office.

## Preconditions / fixtures

- `role=administrator` (or superintendent) with `parent_id`.
- Optional `also_teacher` off unless testing Teach row.
- School people directory; Ride admin routes exist (`/admin/ride` or `/ride` → Manage active).
- Parent vehicles for own children.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in office seat | `/sign-in` |
| 2 | Tray: Feed · Classes · People · Manage · Ask (no Ride tab) | office tray |
| 3 | People: directory / admin people | `/?tab=people`, `/admin/people` |
| 4 | Manage pane; open staff Ride/duty wall | `/?tab=manage`, `/admin/ride`, `/ride` |
| 5 | Confirm Manage tab active for duty routes | tray |
| 6 | **Do not** expect parent leave control on duty wall | duty UI |
| 7 | Drawer **Parent** seat switch | hamburger |
| 8 | Parent tray Home·Ride·Ask only | parent tray |
| 9 | Own child Ride check-in + leave | `/parent/ride` |
| 10 | Parent Home children isolation | `/parent` |
| 11 | Switch **Office** back; tray office 5 | seat switch |
| 12 | If `also_teacher`: optional Teach switch smoke (not full T-01) | drawer |
| 13 | Sign out | hamburger |

## Lifecycle

Office → Parent (Ride in+leave) → Office → sign-out.

## Multiplicity

School people vs own children; staff lines vs parent trip children.

## Reverse / cancel

Seat switch reverse; leave parent line; abandon duty without release if testing read-only.

## Dual-hat

Office+Parent primary; optional Teach row.

## Functions exercised

Office tray; Manage-altitude Ride; people; parent seat Ride; atomic seat switch.

## Explicit non-goals

Attendance SIS; multi-school super dashboard; parent mint released; office syllabus edit.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| People directory | `/?tab=people` | `list_people` office seat |
| Manage duty Ride | Manage / `/admin/ride` | `open_screen`; no parent leave on duty |
| Parent seat Ride | drawer Parent → `/parent/ride` | PHYSICAL check-in after seat UI switch |
| Ask office vs parent | `/ask` each seat | office people tools vs parent `my_children_progress` only |

## Suggested QE themes

No office Ride tab; duty≠parent leave; seat rebuild; Ask tool set follows seat.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Maybe light people link; parent Ride.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Any people link made in run | unlink | `unlink_parent_student` | parent_students only run links |
| Parent Ride | leave | GAP | no live trip |
| Office duty session | end duty | — | no sticky duty |

**Order:** unlink test links → leave Ride → office seat → sign out. Do not delete F-DH-OP persons.

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
