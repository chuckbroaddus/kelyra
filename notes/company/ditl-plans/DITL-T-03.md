# DITL-T-03 — Teacher Messages + Needs
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_3be49702 2026-09-24: RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-03 |
| Title | Teacher: messages, alerts, search, parent person, Needs triage |
| Primary hat | teacher |
| Other hats | none |
| Support | SUPPORTED messaging v1 + Needs inbox |
| Regression tags | `messages`, `inbox`, `search`, `parents`, `chrome-teacher`, `auth`, `ask-dual` |

## Goal / story

Between blocks, teacher clears communication and filing debt: reads alerts via Messages center, replies to a parent, finds a student via Search, opens parent directory on class, triages Needs without full Approve session (pointer to T-02).

## Preconditions / fixtures

- Teacher; class with parents linked to students.
- Unread alert and/or existing message thread.
- ≥1 Needs item (Unassigned or draft).

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in teacher | `/sign-in` |
| 2 | Header messages badge → `/messages` | header mail |
| 3 | PersonTabs: Messages / Alerts (and feed tabs if present) | `/messages` |
| 4 | Open alert detail if any | `/notifications/{id}` or alerts tab |
| 5 | Open 1:1 parent thread; reply | `/messages/{id}` |
| 6 | **Reverse:** back without send; draft discard | composer |
| 7 | Search glass → find student by name | `/search` |
| 8 | Open student record from search | `/class/{id}/student/{sid}` |
| 9 | Class → Parents directory | `/class/{id}/parents` |
| 10 | Open parent person page | `/class/{id}/parent/{pid}` |
| 11 | Needs triage list only (no full Approve mandatory) | `/inbox` |
| 12 | Ask optional quick question about class (not grade write) | `/ask` |
| 13 | Sign out | hamburger |

## Lifecycle

Sign-in → comms/search/people → sign-out.

## Multiplicity

Multiple threads; class-scoped parents list.

## Reverse / cancel

Discard message; close search; leave Needs unapproved.

## Dual-hat

None.

## Functions exercised

Messages; alerts badge; search; class parents; Needs; Ask.

## Explicit non-goals

Group chat product expansion; SMS; email digest; SIS contacts import.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Messages / Alerts tabs | header → `/messages` | `list_threads` / `my_unread_messages` |
| Reply parent | composer | `send_message` |
| Search student | `/search` | `search_students` / `list_roster` |
| Class parents directory | `/class/{id}/parents` | `search_parents` / `get_parent` |
| Needs triage | `/inbox` | `list_inbox` |
| Ask class question | tray Ask | same — no grade write |

## Suggested QE themes

Badge=alerts not DM count; parent thread RLS; search does not invent students; Ask send_message parity.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; optional inbox file.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Teacher↔parent messages (`ditl-` body) | delete if UI allows else residual OK | send only; delete GAP | threads with ditl marker |
| Needs refile Unassigned | leave filed or delete capture | `list_inbox` | no extra Unassigned from run |

**Order:** optional capture delete → sign out.

## Soft v8b chrome (idle/working)

**Soft v8b chrome (idle / working):** Ask header K and other WorkingLine / Soft chrome marks follow Soft v8b:
- **Idle** = original `kelyra.png` (letter only; no face).
- **Working** = PNG letter + face + v7 Soft gas comet on the letter ink box; **1:1** letter outline idle↔working (face/comet overlay only).
- Morph **both ways** idle↔working when work starts/ends; look/blink allowed on working face.
- Opening Kelyra / splash / school logo stay still — do **not** drive Soft from app open alone.
- Dual-hat: same Soft chrome per active seat; no seat-mash Soft.

Strike any Soft-static-idle / pencil-only / v7-plate-as-idle assumptions. Cases that wait on Ask/Busy/capture Asking AI / ingest wait / chrome Ask tab should expect **working** Soft while busy, then return to idle.

SoT: `working-k-avatar-soft-v8b-verbatim-host.md` (+ `working-k-avatar-soft-intent.md` when present). Card `t_b4f598b3`.

## REVIEW-SUM (RS-B + RS-B-K)

**REVIEW-SUM RS-B (+ RS-B-K):** Teacher turned-in assignment review opens with an **executive summary + recommendation Decision card** at the top (RS-B). Laws:
- **Draft ≠ grade** until Accept / approve path.
- Teacher may **Accept** without expanding every student answer (Accept-first).
- Same durable path as `approveTurnedInReview` (do not invent Conflict-X / alternate publish).
- **RS-B-K / Pack B:** phone Pack B confirm-each + banner still required on T-01 keyed Capture review — RS-B does not remove Pack B gates.
- **T-03:** Needs → Review entry can land on RS-B Decision card.
- **DH-01 / Parent:** Parent seat **never Accept**; no Decision Accept chrome on Parent.
- Dual-hat Teach seat only for Accept.

SoT: `teacher-review-exec-summary-*` when present. Card `t_3be49702`.

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
- **2026-09-24 (t_3be49702):** RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
