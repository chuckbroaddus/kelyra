# DITL-S-03 — Student messages + focus
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-03 |
| Title | Student: send/reply messages; complete focus exercise |
| Primary hat | student |
| Support | SUPPORTED messages.use student; focus via assigned practice / to-do |
| Regression tags | `student`, `messages`, `focus`, `todo`, `ask-dual`, `chrome-student`, `auth` |
| CEO story | 7 — Student messages + focus |

## Goal / story

Student sends and replies to messages, and completes a focus exercise (shipped as focus-linked practice / assigned set — not a separate invented module). Dual path UI + Ask.

## Preconditions / fixtures

- F-STUDENT-LOGIN S1; messaging thread with teacher or allowed peer per v1 rules
- F-FOCUS: assigned practice tied to current_focus_skill or labeled focus work
- Second class optional

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in student | SUPPORTED | `/sign-in` tray 6 | — |
| 2 | Open Messages | SUPPORTED | header mail / `/messages` | `/ask` `list_threads` / `my_unread_messages` |
| 3 | Send new message (allowed counterparty) | SUPPORTED | thread composer | `/ask` `send_message` |
| 4 | Reply on existing thread | SUPPORTED | `/messages/{id}` | Ask `list_thread_messages` + `send_message` |
| 5 | Reverse: discard unsent draft | SUPPORTED | back without send | abandon Ask turn |
| 6 | Open focus work / practice | SUPPORTED | `/todo` or assignment; focus cue on grades/Home if shown | `/ask` `list_my_practice`; `open_screen` to assigned practice only |
| 7 | Complete + submit focus exercise | SUPPORTED | practice items → submit | Ask cannot fill answers as solver — **UI-primary submit**; Ask may hint only if practice-help path, never graded final answers |
| 8 | Confirm Done / completion state | SUPPORTED | To Do Done | Ask `list_my_practice` status |
| 9 | FERPA: no classmate scores via messages/Ask | SUPPORTED | — | student Ask refuse walls |
| 10 | Multiplicity: second thread; second assignment isolation | SUPPORTED | UI | Ask |
| 11 | Sign out (does not unenroll) | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / non-goals

- Lifecycle: message send/reply → focus complete → sign-out
- Reverse: discard drafts; abandon practice mid-way
- Dual-hat: N/A
- Non-goals: student Ride; student create class; Ask solving graded quiz; diary required (see S-02)

## Suggested QE themes

send_message RLS; focus submit Done; Ask not a homework solver; dual-path message parity.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — messages; focus practice submit.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Student messages `ditl-` | residual if no delete | send | threads marked |
| Focus practice submission | reset like S-01 | UI-primary | submissions baseline |

**Order:** reset submission → sign out.

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
