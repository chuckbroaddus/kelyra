# DITL-P-03 — Parent Ride multi-child multi-car
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-03 |
| Title | Parent Ride: twins, two cars, staggered lines, leave + re-enter |
| Primary hat | parent |
| Other hats | none |
| Support | PARTIAL Ride (check-in/leave SUPPORTED; full line mgmt NOT) |
| Regression tags | `ride`, `multiplicity`, `vehicles`, `auth`, `chrome-parent`, `ask-dual` |

## Goal / story

A parent with twins and two authorized vehicles runs a realistic pickup: check into line A with child 1 + car 1, leave line A, then check into line B with child 2 + car 2 (staggered). Verifies twins never auto-mix and parent cannot mint curb `released`.

## Preconditions / fixtures

- Parent ↔ two children (twins preferred).
- Two vehicles on parent (e.g. primary + nanny/grandma car); one may be today-only window.
- Two independent Ride lines (A/B) for the school day.
- Restrictions fixture optional: one child restricted → fail closed.
- Parent seat only (not staff duty wall).

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in parent | `/sign-in` |
| 2 | Ride hub | `/parent/ride` |
| 3 | Manage vehicles: confirm both cars listed; open vehicles surface | `/parent/vehicles` |
| 4 | **Reverse vehicle:** void/remove or note today-only expiry path if UI allows | `/parent/vehicles` |
| 5 | Restore/ensure two valid cars for rest of plan | `/parent/vehicles` |
| 6 | Line A: pick car 1 + child 1 only (not both twins) | `/parent/ride` |
| 7 | Check in line A (photo ahead or I’m first) | `/parent/ride` |
| 8 | Observe own XX; no total queue | `/parent/ride` |
| 9 | Leave line A → `left` (not `released`) | `/parent/ride` |
| 10 | Line B: pick car 2 + child 2 | `/parent/ride` |
| 11 | Check in line B | `/parent/ride` |
| 12 | Optional: restricted-child attempt → “Check in failed” no reason | `/parent/ride` |
| 13 | Leave line B or end wait | `/parent/ride` |
| 14 | Confirm staff `released` not available on parent chrome | `/parent/ride` |
| 15 | Sign out | hamburger |

## Lifecycle

Enter line A → leave A → enter B → leave/end B → sign-out.

## Multiplicity

Two children, two cars, two lines; no auto-mix twins (L-08a).

## Reverse / cancel

Leave while waiting; vehicle void; abandon check-in before commit if UI has cancel.

## Dual-hat

None. Leave control only on parent-seat Ride (L-08b).

## Functions exercised

Ride check-in/leave; vehicles CRUD windows; multi line independence; child trip selection.

## Explicit non-goals

Staff duty wall / order_fix / curb release. LPR inserting people. GPS. Placard-only. Office Ride tray tab. Anon token parent.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Vehicles list/CRUD windows | `/parent/vehicles` | **PARTIAL/GAP** no vehicle tools |
| Line A/B check-in + child/car pick | `/parent/ride` | **PHYSICAL-ONLY** check-in; Ask cannot pick car/line |
| Leave A/B | Leave → `left` | **PARTIAL/GAP** |
| Restricted child attempt | fail closed UI | Ask must not explain ban reason |
| Confirm no parent `released` | chrome absence | Ask must refuse mint released |

Physical Ride stays UI-primary; Ask dual documents GAP honestly.

## Suggested QE themes

L-08/L-08a/L-08b; V multi-car; twin isolation; two-line independence; Ask GAP tags not false greens.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — multi-line Ride events.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Line A/B trips + leave | Leave any waiting line | GAP leave tool | No live waiting trip for fixture parent |
| Vehicle selection | none (fixtures stay) | GAP vehicle CRUD | Do not delete F-PARENT vehicles |

**Order:** leave any live line → sign out. Idempotent.
**Isolation:** this parent only; do not clear school lines.

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
