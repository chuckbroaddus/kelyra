# DITL-T-04 — Teacher academic day (authoring + grade + comms)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Journal daychrome B + follow-tab; month survives Ledger; DB-PROD-04/DB-LEDGER-01 -->
<!-- DITL-UPDATE t_3be49702 2026-09-24: RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->
<!-- DITL-UPDATE t_71f42604 2026-09-24: Students ClassTabs single row (layout host only; no Screen.collapse duplicate) -->
<!-- DITL-UPDATE t_730cda45 2026-09-24: CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-04 |
| Title | Teacher: syllabus, assignment, quiz, keys, focus, grade, parent msg, diary, class feed |
| Primary hat | teacher |
| Support | SUPPORTED teacher desk/AVG/assign/key/grade/msg; diary draft Ask; feed UI; Ask feed create GAP |
| Regression tags | `teacher`, `syllabus`, `assignment`, `quiz`, `answer-key`, `focus`, `gradebook`, `messages`, `diary`, `feeds`, `ask-dual`, `web` |
| CEO story | 6 — Teacher academic day |

## Goal / story

Full teacher academic day on shipped surfaces: apply syllabus to class; create assignment; create quiz (category); answer key → assignment; answer key → quiz; focus exercise for a student; grade assignment + quiz; message a student’s parent; multiple diary entry types; multiple class feed entries. **Every** in-app write has UI + Ask dual path (GAP where tools missing).

## Preconditions / fixtures

- F-TEACHER-A, F-AVG, F-QUIZ key photo, F-DRAFTS, F-FOCUS candidate student, F-PARENT linked, F-DIARY, F-FEED class
- Web width ≥720 preferred for desk

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in teacher | SUPPORTED | `/sign-in` tray Desk·Capture·Needs·Class·Ask | — |
| 2 | Apply/publish syllabus to class | SUPPORTED | `/class/{id}/syllabus` publish when weights valid | `/ask` `scan_class_syllabus` → confirm → publish path; `get_class_syllabus_draft` / `discard_class_syllabus_draft`; `get_published_class_syllabus` |
| 3 | Create assignment (homework) | SUPPORTED | `/assignment` create UI | `/ask` `create_assignment` (after confirm) |
| 4 | Create quiz (category=quiz) | SUPPORTED | assign UI category quiz | Ask `create_assignment` category quiz — **no** quiz→include shortcut |
| 5 | Scan answer key → associate assignment | SUPPORTED | key photo + assign flow | `/ask` `scan_answer_key` then confirm `create_assignment` |
| 6 | Scan answer key → associate quiz | SUPPORTED | same with quiz category | Ask scan + create quiz category |
| 7 | Focus exercise for one student | SUPPORTED | Approve gap sets `current_focus_skill`; generate/assign practice to student | Ask `approve_capture` / desk tools + `create_assignment` practice; `summarize_class_desk` focus list — map “focus exercise” to practice-on-focus, not invented object |
| 8 | Grade assignment submission | SUPPORTED | gradebook / submission score after Approve gate | Ask `list_grade_cells`; score write may be UI-primary if no grade-write tool → **PARTIAL** score-via-Ask |
| 9 | Grade quiz submission | SUPPORTED | gradebook | same PARTIAL Ask score |
| 10 | Message student’s parent | SUPPORTED | `/messages` or class parent page | `/ask` `send_message` / `list_threads` |
| 11 | Diary day-browse multiple types | SUPPORTED | `/diary` Journal daychrome **B** + follow-active-tab (month survives Ledger); Today; multi-day scroll; empty day + New entry; Diary≠Calendar | `/ask` `draft_diary_entry` then user **Save** (never auto-ledger); day-browse Ask **GAP** |
| 12 | Class feed multiple posts | SUPPORTED | class feed composer posts | Ask `list_feed` read; create **PARTIAL/GAP** |
| 13 | Reverse: unpublish syllabus; discard draft gap; discard diary draft; discard msg | SUPPORTED | respective UIs | Ask discard_class_syllabus_draft / delete_gap / abandon |
| 14 | Multiplicity: second student no cross-file; second class independent | SUPPORTED | class switch | Ask class_id grounded tools; class switch clears assignment ground |
| 15 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: syllabus publish → author assign/quiz/keys → focus → grade → msg → diary → feed → sign-out
- Reverse: unpublish; discard drafts; delete gap retarget focus
- Dual-hat: none (DH-01)
- Non-goals: office syllabus.manage; Ask auto-publish grades; solver keys to students; invent focus chrome name; feed Ask create tool

## Suggested QE themes

Key never in student Ask pack; quiz category ≠ include shortcut; diary Save gate; dual-path parity matrix.

## Artifacts + DB assert (refine-2)

| Beat | Fixture | Format / subject | DB assert after ingest/create |
|------|---------|------------------|-------------------------------|
| 2 syllabus | `F-ART-SYL-SCI-TYPED` | typed weights page; science | published syllabus categories/weights sum 100; class_id correct |
| 3 homework assign | `F-ART-HW-HIST-HW` title source | handwritten homework sheet; history | `assignments.title/subject/category`; class_id |
| 4 quiz | `F-ART-QUIZ-BIBLE-TYPED` | typed quiz; Bible | `assignments` category quiz (not include shortcut) |
| 5 key→assignment | `F-ART-KEY-MATH-MIXED` | mixed handwritten+typed key; math | key linked to `assignment_id`; asset stored |
| 6 key→quiz | `F-ART-KEY-ENG-TYPED` | typed key; English | key → quiz assignment_id |
| 7 focus practice | generated | — | `current_focus_skill_id`; practice assignment to student |
| 8–9 grades | submissions on ditl assigns | — | grade cell / submission score only after Approve gate |
| Dual path | UI create **and** Ask `create_assignment` / `scan_answer_key` / `scan_class_syllabus` where tools exist | — | same durable rows either path |

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — heavy authoring day.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Syllabus draft/publish | unpublish; discard draft | `discard_class_syllabus_draft` | class syllabus = baseline |
| Assignments (hw + quiz) `ditl-*` | delete assignment UI | if delete tool else UI | `assignments` gone; submissions CASCADE |
| Answer-key work + key photo assets | delete assignment; unref asset | `scan_answer_key` confirm — delete UI | no orphan key assets |
| Focus practice | delete assignment / clear focus | `delete_gap` / UI | `current_focus_skill_id` baseline |
| Grade cells on ditl assignments | deleted with assignment | PARTIAL | no cells |
| Parent messages `ditl-` | residual OK if no delete | `send_message` | optional |
| Diary drafts/entries | discard/delete `/diary` | `draft_diary_entry` never auto-ledger | diary rows for run |
| Class feed posts `ditl-` | delete/archive if UI | create **GAP**; delete **GAP** | feed posts with ditl body |

**Order:** delete feed → diary → messages optional → unpublish syllabus → delete assignments/keys → clear focus/gaps → delete captures/assets → sign out. Idempotent.

## ClassTabs morph (CT-A)

**CT-A (ClassTabs morph / FoM lock):** Teach class desk ClassTabs use `PersonTabs` with **hug-to-text** selected pill, **visibilityReserve** so **≥3 tabs stay visible** when n≥3 (2-tab shelves keep both), grow/shrink morph (975 ms CM-Linear), and scroll center — not left-pin. ClassTabs host lives in class `_layout` (persist across desk pane replaces). On desk **Today/Week**, **DeskSpanTabs** (`Today · This week`) remain **both visible** as a compact PersonTabs shelf under ClassTabs (not ChipRow). Parent seat: **zero** ClassTabs. Do not treat `/inbox` NT-A job tabs as PersonTabs.

SoT: `class-tabs-morph-appwide-lock.md` (+ `class-tabs-morph-intent.md` when present). Card `t_730cda45`.

## Students ClassTabs (single row)

**Students ClassTabs single-row law:** On Teach → Desk → class → ClassTabs **Students** (`/class/{id}/setup`), paint **exactly one** ClassTabs row. Layout `_layout` is the sole host (CT-A persist). Students Screen must **not** remount ClassTabs via `Screen.collapse` (no duplicate row). Peer desk panes stay single-row. Dual-hat Parent seat: zero ClassTabs. Office admin Students is a separate surface.

SoT: `students-classtabs-duplicate-intent.md`. Card `t_71f42604`.

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

## Journal daychrome (B + follow-tab)

**Journal daychrome (layout B + follow-active-tab):** On `/diary` **Journal** segment (not Calendar):
- Day chrome **layout B** with month/day browse that **follows the active Journal tab** (follow-tab).
- **Month chrome survives** when switching to **Ledger** (month not torn down solely because Ledger is selected) — reopen **DB-PROD-04** + **DB-LEDGER-01 / RR-L** notes: Ledger is list+range, not a second month-grid home; Journal owns day-browse.
- Today jump; empty day + New entry → Diary composer (not Calendar +).
- Twins fail-closed; teacher soft student pointer orthogonal to day chrome.
- **ST-A:** Teacher tray Diary entry (verify vs hamburger-only assumptions).
- **Student Diary (DITL-S-02):** keep as **GAP** if already GAP / ST-A GAP-S1 (student zero Diary) — do not invent student daychrome.
- Diary ≠ Calendar (HOLD).

SoT: `diary-day-browse-intent.md` + `journal-screen-daychrome-*` when present. Card `t_2c13f9ac`.

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
- **2026-09-24 (t_2c13f9ac):** Journal daychrome B + follow-tab; month survives Ledger; DB-PROD-04/DB-LEDGER-01
- **2026-09-24 (t_3be49702):** RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
- **2026-09-24 (t_71f42604):** Students ClassTabs single row (layout host only; no Screen.collapse duplicate)
- **2026-09-24 (t_730cda45):** CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk
