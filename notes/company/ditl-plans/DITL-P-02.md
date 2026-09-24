# DITL-P-02 — Parent PM homework Ask + message
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Journal daychrome scan note (primary on T-04) -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-P-02 |
| Title | Parent evening: review work, Ask help strategy, message teacher |
| Primary hat | parent |
| Other hats | none |
| Support | SUPPORTED Ask + messaging; SUPPORTED/PARTIAL assignment visibility on parent |
| Regression tags | `auth`, `ask`, `messages`, `grades`, `assignments`, `chrome-parent`, `ask-dual` |

## Goal / story

After school, a parent helps with homework: opens Parent Home for the child who has work due, reviews what is assigned/focus, uses Ask (parent context) to get a help strategy (not a grade), messages the teacher about one concern, then signs out. No Ride required in this plan.

## Preconditions / fixtures

- Parent with ≥1 linked child; child has at least one assigned practice or visible upcoming work and a teacher-approved focus skill when available.
- Messaging v1 enabled; parent can open a 1:1 thread with the child’s teacher (directory RLS as shipped).
- Ask available on parent tray.
- Prefer evening fixture: assignment not yet submitted or recently graded.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in parent | `/sign-in` |
| 2 | Home → select child with homework | `/parent` |
| 3 | Review progress / assignments cues / focus one-liner | `/parent` |
| 4 | If grades drill-down exists, open it; else stay Home (PARTIAL note) | `/parent` or `/parent/grades` |
| 5 | Tray **Ask** — ask how to help child on named skill/assignment ground | `/ask` |
| 6 | Confirm Ask does not publish grades; new chat / history behaves | `/ask` |
| 7 | Header **Messages** → open or start teacher thread | `/messages`, `/messages/{id}` |
| 8 | Send one message; optional attach if UI offers (photo of worksheet) | thread composer |
| 9 | **Reverse:** discard unsent composer draft / back without send | `/messages/{id}` |
| 10 | Return Home; switch child if multi; confirm no cross-child message bleed | `/parent` |
| 11 | Sign out | hamburger |

## Lifecycle

Login → help loop → sign-out. No Ride enter/leave.

## Multiplicity

If two children, switch chips between Ask/message contexts; threads stay person-scoped.

## Reverse / cancel

Abandon Ask turn; discard message draft; back from thread list.

## Dual-hat

None.

## Functions exercised

Parent Home; Ask parent; Messages 1:1; assignment/focus read; auth.

## Explicit non-goals

Ride. Teacher Approve. Student submit. Tutor chat product. Weekly email digest. Parent editing teacher academic fields.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Home child + homework cues | `/parent` | `my_children_progress` |
| Grades drill-down | `/parent` or `/parent/grades` | `explain_my_class_average` / published syllabus read |
| Help strategy on skill/assignment | tray **Ask** (already primary) | same `/ask` — dual means still verify header Messages path separately |
| Message teacher | `/messages` composer | `list_threads` + `send_message` |
| Discard draft | UI back | abandon Ask turn / new chat |
| Sibling isolation | chips | Ask child ground walls |

This plan already centers Ask; refine requires **explicit UI message path** and **Ask message tools** both pass.

## Suggested QE themes

Ask ground with assignment; message send UI+tool; sibling isolation; no grade mutation via Ask.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; Ask thread history.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Parent→teacher message(s) | Tag body `ditl-`; delete if UI exists | `send_message` only; delete **GAP** | message/thread rows with `ditl-` for this parent |
| Ask chat turns | **New chat** archives open thread | same | `ask_threads` / `ask_messages` — archive OK |

**Isolation:** `ditl-` message prefix. Do not delete real family threads outside run.
**Order:** finish sends → New chat → sign out. Idempotent.

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

**Parent Diary scan:** daychrome B / follow-tab / month-survives-Ledger laws apply if `/diary` exercised. Card `t_2c13f9ac`.

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
