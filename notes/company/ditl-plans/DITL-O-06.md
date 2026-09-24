# DITL-O-06 — Alerts + school feed
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-06 |
| Title | Office/Super: send alert notification + school feed message |
| Primary hat | administrator **and** superintendent |
| Support | SUPPORTED UI create_feed_post kind alert|post; Ask create PARTIAL/GAP |
| Regression tags | `office`, `alerts`, `feeds`, `messages`, `ask-dual`, `ferpa` |
| CEO story | 5 — Alerts + school feed |

## Goal / story

Office sends an **alert** notification and a **school feed** post. Recipients see alert vs ordinary post per messaging-v1. Dual path: UI composer required; Ask create tagged GAP if no tool.

## Preconditions / fixtures

- F-FEED, F-OFFICE, families/teachers who can see school audience
- Prefer one class feed contrast optional

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office | SUPPORTED | `/sign-in` | — |
| 2 | Open Feed tab | SUPPORTED | `/?tab=feed` or `/feed` | Ask `open_screen` / `list_feed` |
| 3 | Compose **alert** (kind=alert) | SUPPORTED | FeedPane kind Alert + publish `create_feed_post` | **PARTIAL/GAP** no create_feed tool; may draft text only |
| 4 | Verify alert surfaces in Messages/Alerts / notifications | SUPPORTED | header mail Alerts tab / `/notifications` | Ask `my_unread_messages` / list threads — may not equal alert fan-out |
| 5 | Compose school **feed post** (kind=post) | SUPPORTED | Feed composer post | Ask create GAP; `list_feed` readback after UI post |
| 6 | Optional reply under post (not alert) | SUPPORTED | feed reply composer | Ask GAP |
| 7 | Reverse: discard unsent composer | SUPPORTED | back without send | Ask abandon turn |
| 8 | Multiplicity: second alert does not mash threads | SUPPORTED | feed | list_feed |
| 9 | FERPA: no student grade PII in blast | SUPPORTED | body review | Ask must refuse grade blast |
| 10 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: alert → post → verify → sign-out
- Reverse: discard draft; no requirement to unsend if product has none
- Non-goals: SMS/email digest; class-sized chat; inventing Ask post tool

## Suggested QE themes

Alert≠post; office author; Ask GAP filed; no grade leak in body.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — feed posts / alerts.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| School feed / alert posts `ditl-` | delete/archive if UI | create **GAP**; delete **GAP** | feed/alert rows with ditl body gone |

**Order:** delete test posts → sign out. Idempotent.

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
