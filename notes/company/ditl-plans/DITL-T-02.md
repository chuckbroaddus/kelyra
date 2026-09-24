# DITL-T-02 — Teacher Grade and Assign (web) (BATCH-v1 UPDATE)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_3be49702 2026-09-24: RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required -->
<!-- DITL-UPDATE t_1520f9f5 2026-09-24: DRIVE-NEEDS Settings sticky Drive/folder/Scan → Needs-first split -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->
<!-- DITL-UPDATE t_71f42604 2026-09-24: Students ClassTabs single row (layout host only; no Screen.collapse duplicate) -->
<!-- DITL-UPDATE t_730cda45 2026-09-24: CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-T-02 |
| Title | Teacher afternoon web: Approve gaps, assign practice, grade book, syllabus; BATCH-v1 batch-origin captures in Needs/Approve |
| Primary hat | teacher |
| Other hats | none |
| Support | SUPPORTED M6–M9; AVG syllabus teacher path; web Approve alternate to Pack B phone (KEYGRADE); BATCH-v1 stack captures consumed via same Inbox/Needs (NA-A) |
| Regression tags | `approve`, `assign`, `gradebook`, `avg`, `syllabus`, `keygrade`, `chrome-teacher`, `web`, `ask-dual`, `batch-ingest` |
| KEYGRADE | Web Approve remains valid alternate; phone Pack B Approve is **allowed** (see T-01) — this plan must **not** claim phone Approve is forbidden |
| BATCH | Needs/Approve consumes batch-origin captures after upstream Split Review Confirm (T-01). Origin flag internal; same Approve laws. Phone gate honesty is upstream (T-01) — this plan is web. |

## Goal / story

After class, on web/tablet width, teacher clears Needs drafts: opens student work, Approves named gaps (nothing is a grade before Approve), generates/assigns short practice, scores a submission, checks grade book and published syllabus weights. Ends with sign-out.

**KEYGRADE note (Pack B / CEO #4):** This plan covers the **web** Approve / bulk / multi-class desk path. Phone Pack B confirm+Approve on Capture review is in-scope on **DITL-T-01** and is a valid v1 path — **do not** treat phone Approve as forbidden or out-of-product. Web Approve remains a valid alternate, not exclusive.

**BATCH-v1:** Needs/Approve **consumes batch-origin captures** produced by T-01 web stack ingest (Upload → Split Review → Confirm). Same pipeline as phone/camera captures: class already bound; packets already human-split; unnamed still Inbox until filed (NA-A); **never** auto-Approve because origin=batch. Optional dismissible batch progress chip (PR-A) may still show if a batch is in flight — not a permanent banner; Needs badge grows as drafts arrive. Soft/hard size failures and phone “open on computer” are exercised on T-01, not re-tested as primary here.

## Preconditions / fixtures

- Teacher; class with drafts waiting Approve; ≥1 student with capture analyzed.
- ≥1 student submission ready to score optional.
- Syllabus: draft or published fixture (weights sum rules).
- Prefer width ≥720 for top tab chrome.
- **BATCH:** Prefer ≥1 draft whose capture came from Confirm of a class stack (`notes/qa-fixtures/batch-ingest/` packets seeded via T-01 or fixture seed). Include at least one unnamed Inbox row from batch if testing NA-A continuity.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in teacher (web) | `/sign-in` |
| 2 | Desk shows draft/Unassigned counts (include batch-origin drafts if seeded) | `/` or class desk |
| 3 | Needs → open draft item (prefer one batch-origin capture) | `/inbox` |
| 4 | Student record: review gaps photo | `/class/{id}/student/{sid}` |
| 5 | Approve gap (or edit then Approve); confirm pre-Approve hidden from family | student + gradebook |
| 6 | Generate practice from approved gap; tweak/discard regenerate as allowed | assign flow |
| 7 | Assign set to that student | assignment form |
| 8 | Grade book: score/mark after Approve path | `/class/{id}/gradebook` |
| 9 | Class setup / syllabus card: open syllabus editor | `/class/{id}/setup`, `/class/{id}/syllabus` |
| 10 | Publish only when weights valid; or unpublish (lifecycle) | syllabus |
| 11 | **Reverse:** dismiss/delete draft gap; confirm focus retarget rules | student record |
| 12 | Second student same class — no cross-file | student B |
| 13 | Optional second class independence | class switch |
| 14 | **BATCH consume:** file unnamed batch Inbox packet → student; then Approve gap on that capture — Confirm split ≠ Approve | `/inbox` → student |
| 15 | Optional bulk Approve including batch-origin drafts | Needs list |
| 16 | Sign out | hamburger |

## Lifecycle

Draft → Approve (web) → assign → score; syllabus draft → publish/unpublish; sign-out. Keyed captures may already be phone-Approved via T-01 Pack B; web Approve still valid for remaining drafts / bulk.

**BATCH:** Stack Confirm (T-01) → Inbox/Needs drafts → **this plan’s** Approve/assign/score. Split Review Confirm never publishes grades.

## Multiplicity

Multiple students; optional two classes independent syllabus/gradebook. Batch multiplicity (multi-PDF, many packets) handled upstream on T-01; this plan treats resulting drafts like any other. **No new DITL day** (QAS: no NEW_DITL).

## Reverse / cancel

Discard generated set; unpublish syllabus; delete draft gap; navigate away before Approve.

## Dual-hat

None. syllabus.manage teacher seat only. (DH-01: Parent seat has no Needs/Approve/stack.)

## Functions exercised

Approve gate; practice generate/assign; gradebook; syllabus AVG; Needs; student person page; consumption of BATCH-origin captures via same Needs/Approve.

## Explicit non-goals

SIS passback; weighted district report; office syllabus policy; auto-publish AI grades; rewards; office/superintendent KEYGRADE chrome; claiming that Approve is phone-forbidden (phone Pack B Approve is allowed on T-01); **re-running full Split Review as primary (T-01)**; hot-folder/Drive/QR; student/parent upload; whole-PDF to model; NEW_DITL day.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Needs open draft | `/inbox` | `list_inbox` |
| Approve gap / keyed draft (web) | student record Approve | `approve_capture` (capability) — web alternate; phone Pack B also valid (T-01) |
| Generate/assign practice | assign UI | `create_assignment` / revise_practice_page |
| Gradebook score | `/class/{id}/gradebook` | `list_grade_cells`; score write **PARTIAL** if no write tool |
| Syllabus publish/unpublish | `/class/{id}/syllabus` | `scan_class_syllabus` / draft get/discard / published get |
| Delete draft gap | UI | `delete_gap` |
| Second student isolation | student B | Ask must not cross-file |
| BATCH-origin draft in Needs | same Needs UI (origin internal) | same list/approve tools — no special Ask Confirm-split |

Deep authoring day expansion lives in **DITL-T-04**; T-02 remains Approve/assign/syllabus core.

## Suggested QE themes

Approve-before-visible; assignment 3–8 items; syllabus sum 100; class isolation; Ask approve parity; web Approve still works when phone Pack B path also exists (neither exclusive); **batch-origin drafts Approve only on explicit teacher tap; Confirm split ≠ Approve; unnamed batch packets stay Inbox until filed**.

## Artifacts + DB assert (refine-2)

Consumes captures from T-01 / F-DRAFTS **and** batch packets from `notes/qa-fixtures/batch-ingest/` after Split Review Confirm. After Approve: `skill_gaps.status` approved; optional `students.current_focus_skill_id`; assignment/submission cells only after teacher score. Syllabus weights sum 100 when published. Batch-origin: `captures.class_id` bound; pre-Approve family hidden; Confirm alone must not set `approved_score`.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — approvals, gaps, practice, scores, syllabus state.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Approved gaps / focus | delete gap or retarget focus | `delete_gap` | `skill_gaps`; `students.current_focus_skill_id` → fixture baseline |
| practice_sets + assignments `ditl-*` | delete assignment / discard practice | tools if listed else UI | `assignments`, `practice_sets`, `submissions` for ditl titles |
| Graded cells on test work | prefer delete test assignment | PARTIAL Ask score | no graded cell on ditl-only assignment |
| Syllabus draft/publish | unpublish / discard draft | `discard_class_syllabus_draft` | published weights = fixture baseline |
| Captures consumed (incl. batch-origin) | delete if test-only | PARTIAL | `captures` clean |

**Order:** unpublish syllabus → delete assignments/submissions → delete practice → delete gaps → restore focus → delete leftover captures.
**Isolation:** titles/prefix `ditl-`; never wipe whole class gradebook seed outside run.

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

## DRIVE-NEEDS (Settings Needs Scan)

**DRIVE-NEEDS (Settings → Needs-first Drive/folder/Scan):** Teach class-stack ingest is **Needs-first**, not class-bound at bind time:
- **Settings (User Settings)** hosts sticky Google Drive folder + computer folder (Mac/PC) + mobile folder binds — **not** Capture class-stack sheet. Sticky across logins for same Teach user.
- New Drive/folder/Scan files land as **Needs Attention** rows (+ badge); teacher opens row → **split-on-click** (class, pages, assignment, answer key in stack).
- Capture camera: **Scan** (multi-page class stack) vs **Photo**; after Scan completes, navigate Teach immediately to **Needs** (not stay on Capture).
- Phone: FG folder ingest while app open (honest no background daemon); sticky Drive bind triggers ingest on app open when new content.
- Platforms honest: no fake iPhone background watch.
- **Dual-hat:** Parent Settings zero Drive/folder class-stack chrome (DH-01).

SoT: card comments + `batch-v2-drive-needs-*` when present. Parent feature `t_17cf535d`. Card `t_1520f9f5`.

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
- **2026-09-24 (t_1520f9f5):** DRIVE-NEEDS Settings sticky Drive/folder/Scan → Needs-first split
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
- **2026-09-24 (t_71f42604):** Students ClassTabs single row (layout host only; no Screen.collapse duplicate)
- **2026-09-24 (t_730cda45):** CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk
- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — clarify web Approve remains; must **not** claim phone Approve is forbidden (phone path = T-01).
- **2026-09-12 (t_407a9f4a / IQG-BATCH UPDATE_PLANS):** BATCH-v1 — Needs/Approve explicitly consumes batch-origin captures; Confirm ≠ Approve; fixtures `notes/qa-fixtures/batch-ingest/`; no NEW_DITL; Parent/Student/Office plans unchanged.
