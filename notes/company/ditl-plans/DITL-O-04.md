# DITL-O-04 — Banned pickup / messy divorce
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-04 |
| Title | Office bans one parent pickup; banned tries Ride; office notified |
| Primary hat | administrator **and** superintendent |
| Other hats | banned parent + allowed co-parent (separate sessions) |
| Support | SUPPORTED restrict + fail-closed check-in; PARTIAL office notify + Ask restrict tool |
| Regression tags | `office`, `ride`, `pickup-ban`, `ferpa`, `messages`, `ask-dual`, `multiplicity` |
| CEO story | 3 — Banned pickup / messy divorce |

## Goal / story

Messy divorce: two parents on one child. Office blocks Parent-1 from pickup. Parent-1 tries car rider check-in → fail closed (“Check in failed”, no reason). Parent-2 still can pick up. Office/super gets **notification** of banned attempt (CEO). UI and Ask paths for ban set/clear and notify.

## Preconditions / fixtures

- F-PARENT-1 + F-PARENT-2 both linked to S1; vehicles each
- F-RIDE lines; empty restrictions initially
- F-OFFICE

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Set pickup restriction Parent-1 ↔ S1 | SUPPORTED | `/admin/ride` Pickup restriction + Save (`office_set_pickup_restriction`) | **PARTIAL/GAP** — no Ask restrict tool; `open_screen` to admin ride only |
| 3 | Confirm restriction saved (duty/office view) | SUPPORTED | admin ride UI | Ask cannot list restrictions → GAP or UI verify |
| 4 | Sign out office; sign in Parent-1 | SUPPORTED | auth | — |
| 5 | Parent-1 Ride check-in attempt | SUPPORTED | `/parent/ride` check-in | Ask: no check-in tool → PHYSICAL/UI primary; Ask may only explain |
| 6 | Observe fail closed opaque message | SUPPORTED | “Check in failed” no reason/blacklist copy | — |
| 7 | Parent-1 leave if stuck waiting state | SUPPORTED | Leave line | — |
| 8 | Parent-2 check-in succeeds (allowed) | SUPPORTED | Parent-2 `/parent/ride` | — |
| 9 | Parent-2 leave | SUPPORTED | leave | — |
| 10 | Office notification of banned attempt | PARTIAL/GAP | Messages/Alerts / notifications / activity / duty wall | Ask: “notify office banned parent tried Ride” via `send_message` or alert — if no auto-notify, manual + tag GAP for missing auto fan-out |
| 11 | FERPA: Parent-2 never sees Parent-1 ban reason or unpublished grades | SUPPORTED | parent Home/messages | Ask parent seat |
| 12 | Reverse: clear/unban restriction | SUPPORTED | admin ride clear/update restriction | Ask GAP same as set |
| 13 | Parent-1 re-check-in after unban works | SUPPORTED | `/parent/ride` | — |
| 14 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: ban → denied attempt → allowed parent success → notify → unban → re-allow
- Multiplicity: two parents opposite rights; one child
- Reverse: unban
- Non-goals: reason strings to parent; LPR inserts; inventing notify chrome; student Ride tab

## Suggested QE themes

L-restriction fail-closed; co-parent isolation; notify GAP filing; unban restore.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — pickup restrictions; Ride attempts.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Pickup restriction ban on F-PARENT-1 | clear/unban UI | **PARTIAL/GAP** no Ask restrict tool | restriction row gone for parent/student pair |
| Banned check-in attempts | none required | — | no sticky fail blocking allowed parent |
| Notify messages if sent | residual OK | GAP | optional |
| Allowed parent trip | leave line | GAP | no live trip |

**Order:** leave any live Ride → **unban before** any parent delete → sign out. Idempotent clear.

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
