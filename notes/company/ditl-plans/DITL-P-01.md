# DITL-P-01 — Parent AM grades + car line
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Journal daychrome scan note (primary on T-04) -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-01 |
| Title | Parent morning: grades per child + Ride check-in |
| Primary hat | parent |
| Other hats | none (pure parent seat) |
| Support | SUPPORTED grades thin Home + PARTIAL Ride check-in |
| Regression tags | `auth`, `grades`, `avg`, `ride`, `multiplicity`, `chrome-parent`, `ask-dual` |

## Goal / story

Before school, a parent with two children opens Kelyra, checks each child’s published progress on Parent Home, then uses Ride to check into the car rider line for drop-off with the correct vehicle and children. Day ends (for this plan) after successful check-in status is visible and parent can leave the line or complete the drop-off wait without staff release powers.

## Preconditions / fixtures

- Parent login linked to **two** students (twins or siblings) via `parent_students`.
- Each child enrolled in at least one class with **published** family-visible grades/syllabus where AVG applies; one child with focus skill.
- At least one vehicle on parent record (valid plate / today-or-indefinite window).
- Ride lines configured for school day; parent seat chrome available.
- No staff duty session on this device.

## Beat list (ordered)

| # | Beat | Surface / chrome |
|---|------|------------------|
| 1 | Sign in as parent | `/sign-in` → lands parent seat |
| 2 | Confirm tray **Home · Ride · Ask** (3 tabs; no camera; no staff tabs) | Parent tray |
| 3 | Open **Home**; see child chips / list for both children | `/parent` |
| 4 | Select child A; review thin grades / class cards / focus (P-H2 style) | `/parent` (+ `/parent/grades` if present) |
| 5 | Switch to child B; confirm A state clears (sibling isolation) | `/parent` |
| 6 | Open upcoming/assigned work cues if shown on Home | `/parent` |
| 7 | Tray **Ride** → Ride hub | `/parent/ride` |
| 8 | Select vehicle (if multi-car fixture present; else single car) | `/parent/ride` or `/parent/vehicles` |
| 9 | Select trip children for this drop-off (not auto-mix twins) | `/parent/ride` |
| 10 | Check in (photo of car ahead **or** I’m first) for chosen line | `/parent/ride` |
| 11 | See own position XX only (no “of N”, no neighbor plates) | `/parent/ride` |
| 12 | **Reverse:** Leave this line while waiting → event `left` (parent cannot mint `released`) | `/parent/ride` |
| 13 | Optional re-check-in same line or stop | `/parent/ride` |
| 14 | Sign out | Hamburger → Sign out |

## Lifecycle

Start: sign-in → parent seat. Finish: leave line (or documented end wait) + sign-out.

## Multiplicity

Two children; sibling switch must not blend grades. Vehicle pick if multi-car (else note single-car). One device.

## Reverse / cancel / already-in-flow

Leave line while waiting (L-08). Fail closed on restricted child (no reason string). Already checked-in: no double-mint chaos — observe product behavior; do not invent.

## Dual-hat

None. Do not use My children deep-link from staff seat in this plan (see DH-*).

## Functions exercised

Auth parent; parent tray chrome; family grade Home; sibling isolation; Ride check-in/leave; vehicle+child pick; FERPA thin parent view.

## Explicit non-goals

Full parent grades book (P-G* if still open defect — call PARTIAL, do not fail plan for missing book if research/AVG notes gap). Full line management / staff curb release. Attendance. SMS. GPS/placard-only check-in. Neighbor queue visibility.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Sign-in / tray confirm | `/sign-in` → Home·Ride·Ask | — |
| Review child grades / focus | `/parent` (+ `/parent/grades`) | `/ask` `my_children_progress`; `explain_my_class_average` / `get_published_class_syllabus` if offered |
| Sibling switch isolation | child chips on Home | Ask ground must follow selected child; no mash |
| Vehicle pick | `/parent/ride` or `/parent/vehicles` | **PARTIAL/GAP** — no vehicle CRUD Ask tool |
| Ride check-in (photo / I’m first) | `/parent/ride` | **PHYSICAL-ONLY** shutter; Ask may not mint check-in |
| Leave line | Leave control → `left` | **PARTIAL/GAP** no leave tool |
| Restricted fail-closed | UI message opaque | Ask must not leak restriction reason |
| Sign out | hamburger | — |

Ask must not publish/mutate grades. Physical camera beats stay UI-primary.

## Suggested QE case themes (not cases)

Sibling clear; check-in success XX; leave→left; restricted fail; tray = 3 only after parent login; Ask dual-path grades read without grade write.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — Ride check-in / leave events (fixtures pre-exist).

| Created / touched | UI cleanup | Ask cleanup | DB leftover check (data-model only) |
|--------------------|------------|-------------|--------------------------------------|
| Ride trip / queue events for this parent run | Leave line if still waiting; end session | **PARTIAL/GAP** — no leave/check-in Ask tool | Live ride session for fixture parent only; no parent-minted `released` |
| Car-ahead photo asset if stored | Product discard if any | PHYSICAL-ONLY | Orphan `assets` only if this run wrote them |
| Session | Sign out | — | No leftover auth session on device |

**Isolation:** this parent’s trip only (`ditl-` in QE log). Do not wipe school Ride lines or other vehicles.
**Order:** leave line → sign out. Idempotent if already left.
**Do not:** delete shared F-PARENT vehicles/students unless this run created them.

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

**Parent Diary:** hamburger Diary entry; Journal daychrome B + follow-tab if parent Diary present; twins fail-closed. Month survives Ledger. Diary≠Calendar. Card `t_2c13f9ac`.

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
