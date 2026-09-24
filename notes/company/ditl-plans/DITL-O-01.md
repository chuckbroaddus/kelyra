# DITL-O-01 — Office People/Manage (partial day)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Journal daychrome scan note (primary on T-04) -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-01 |
| Title | Administrator/office supported surfaces only |
| Primary hat | administrator (superintendent notes called out) |
| Other hats | optional also_teacher / parent_id → see DH-* not duplicated |
| Support | PARTIAL — people/activity/manage/identity; attendance NOT |
| Regression tags | `office`, `people`, `manage`, `auth`, `school-identity`, `ride-duty`, `ask-dual` |

## Goal / story

Office user runs a **supported** slice of a school day in Kelyra: sign in, scan Feed/Classes, manage people links within role rules, school manage settings they can touch, staff Ride duty wall if on duty, Ask for ops question. Explicitly does **not** attempt attendance, behavior, SIS, or district multi-school reports.

## Preconditions / fixtures

- Administrator login (separate pass: superintendent for logo/name/archive-only beats).
- Classes exist; parents/students to link per permissions.
- Super-only: school logo/name; Ride day photo archive if shipped.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in office | `/sign-in` |
| 2 | Feed tab glance | `/?tab=feed` |
| 3 | Classes tab / admin class | `/?tab=classes`, `/admin/class…` |
| 4 | People: view directory; link parent↔student if administrator allowed | `/?tab=people`, `/admin/people` |
| 5 | **Reverse:** unlink parent-student without deleting persons | people UI |
| 6 | Manage: school settings available to role | `/?tab=manage` |
| 7 | Super-only: set school name/logo if superintendent | manage / identity |
| 8 | Staff Ride duty under Manage (order/curb as shipped) | `/admin/ride`, `/ride` |
| 9 | Activity / audit skim if exposed | `/activity` |
| 10 | Matrix if present (admin) | `/admin/matrix` |
| 11 | Ask | `/ask` |
| 12 | Confirm **no** attendance UI; **no** syllabus.manage as office | negative checks |
| 13 | Sign out | hamburger |

## Lifecycle

Sign-in → office loop → sign-out. Duty enter/exit if applicable without parent leave controls.

## Multiplicity

Many people/classes; role edit walls (admin cannot edit other admins/super per data-model).

## Reverse / cancel

Unlink; abandon manage edit; leave duty view.

## Dual-hat

Defer full switch to DH-02.

## Functions exercised

Office chrome; people link; manage; duty Ride; activity; auth walls.

## Explicit non-goals

Attendance, behavior, SIS, CSV district reports, multi-school, becoming grade-of-record, office AVG policy editor.

## Superintendent

No separate DITL plan. Super may run O-01 plus identity + Ride archive beats. Multi-school oversight **NOT IN PRODUCT**.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Feed/Classes glance | office tray tabs | `list_feed` / `list_classes` |
| People link/unlink | people admin | `link_parent_student` / `unlink_parent_student` |
| Manage settings | `/?tab=manage` | limited; identity super-only via `set_school_name`/`set_school_logo` |
| Staff Ride duty | Manage altitude | open_screen; no restrict tool (see O-04) |
| Activity/audit | `/activity` | `search_audit` |
| Matrix | `/admin/matrix` | `set_capability_grant` super |
| Ask ops | `/ask` | office tools; no syllabus.manage |

Deep people/class/ban/feed days: **O-02..O-06**.

## Suggested QE themes

Role edit matrix; no attendance; Manage owns duty Ride; super-only archive; Ask dual on link.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Light — identity/settings only if changed.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| School name/logo if super changed | restore fixture logo/name | identity tools if any else UI | school identity baseline |
| People link if touched | unlink | unlink tool | parent_students |
| Ride duty | end | — | — |
| Attendance attempts | N/A NOT IN PRODUCT | — | **no** invented attendance tables |

**Order:** restore identity → unlink test → sign out.

## Soft v8b chrome (idle/working)

**Soft v8b chrome (idle / working):** Ask header K and other WorkingLine / Soft chrome marks follow Soft v8b:
- **Idle** = original `kelyra.png` (letter only; no face).
- **Working** = PNG letter + face + v7 Soft gas comet on the letter ink box; **1:1** letter outline idle↔working (face/comet overlay only).
- Morph **both ways** idle↔working when work starts/ends; look/blink allowed on working face.
- Opening Kelyra / splash / school logo stay still — do **not** drive Soft from app open alone.
- Dual-hat: same Soft chrome per active seat; no seat-mash Soft.

Strike any Soft-static-idle / pencil-only / v7-plate-as-idle assumptions. Cases that wait on Ask/Busy/capture Asking AI / ingest wait / chrome Ask tab should expect **working** Soft while busy, then return to idle.

SoT: `working-k-avatar-soft-v8b-verbatim-host.md` (+ `working-k-avatar-soft-intent.md` when present). Card `t_b4f598b3`.

## Journal daychrome (scan)

**Office Diary scan:** hamburger Diary; Journal daychrome B if office Diary exercised; owner-only body. Card `t_2c13f9ac`.

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
- **2026-09-24 (t_2c13f9ac):** Journal daychrome scan note (primary on T-04)
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
