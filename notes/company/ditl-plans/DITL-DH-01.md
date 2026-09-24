# DITL-DH-01 — Dual-hat Teacher+Parent mixed day (BATCH-v1 UPDATE)
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_3be49702 2026-09-24: RS-B Decision Accept-first; draft≠grade; Parent never Accept; Pack B still required -->
<!-- DITL-UPDATE t_1520f9f5 2026-09-24: DRIVE-NEEDS Settings sticky Drive/folder/Scan → Needs-first split -->
<!-- DITL-UPDATE t_f7164ca9 2026-09-24: SWITCH-G Disconnect Gmail + Open Drive return-to-picker; Teach-only -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->
<!-- DITL-UPDATE t_71f42604 2026-09-24: Students ClassTabs single row (layout host only; no Screen.collapse duplicate) -->
<!-- DITL-UPDATE t_730cda45 2026-09-24: CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-DH-01 |
| Title | Dual-hat: AM teacher capture (+ Pack B phone Approve) + BATCH-v1 stack on Teach seat only; PM Parent seat Ride + child grades |
| Primary hat | teacher (job of record) + parent_id hat |
| Other hats | switches to parent seat |
| Support | SUPPORTED hats / seat switch (ui-design §31.4b); KEYGRADE Teach-seat phone Approve / Parent never Approve; BATCH-v1 stack chrome Teach seat only (CE-A) |
| Regression tags | `dual-hat`, `seat-switch`, `capture`, `approve`, `keygrade`, `ride`, `grades`, `chrome-teacher`, `chrome-parent`, `ask-dual`, `batch-ingest` |
| KEYGRADE | Teach seat may Pack B phone-Approve keyed captures; Parent seat must **not** Approve or see drafts |
| BATCH | Upload stack / Split Review **only** on Teach seat. Parent seat: **zero** stack entry (not a disabled mystery button). Phone gate honesty remains Teach-session status / “open on computer.” |

## Goal / story

Same login is a teacher and a parent of a student (not necessarily own class). Morning: teach on teacher seat (capture; optional **Pack B phone confirm+Approve** on keyed work for **own classes** only; optional **BATCH-v1 web Upload class stack** on **Teach seat only** — bind class, Split Review, Confirm → captures). Afternoon: **altitude switch to Parent seat** (not merely My children deep-link) so tray becomes Home · Ride · Ask, check child **post-Approve** grades only (M11), Ride pickup, then switch back to Teach and sign out. **Parent seat must never Approve** keyed drafts; no draft/extract leak across seat; **no Upload stack / Split Review / Needs batch chrome on Parent seat**.

## Preconditions / fixtures

- Profile: `role=teacher` with `parent_id` linked to ≥1 child (prefer child in another teacher’s class to stress walls).
- Teacher class roster + capture-ready work.
- Parent vehicles + Ride lines.
- `canChooseSeat` / drawer rows **Parent** and **Teach** per ui-design.
- **BATCH (optional beat):** web on Teach seat; synthetic stack under `notes/qa-fixtures/batch-ingest/`.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in; land teacher seat | `/sign-in` → teacher tray |
| 2 | Drawer: both **My children** (deep-link) and **Parent** (seat switch) visible as designed | hamburger |
| 3 | Capture one file on own class | `/capture` |
| 3b | Optional keyed: Pack B confirm + **phone Approve** on Teach seat only (own class) | `/capture` review |
| 3c | **BATCH-v1 (Teach only):** Upload class stack on web; bind one class; Split Review; Confirm → captures/Inbox | web CE-A / SR-A (Teach seat) |
| 3d | **Assert no Parent stack:** after optional peek at Parent seat chrome (or drawer), Upload stack / Split Review entry is **absent** (zero discovery) | Parent chrome |
| 4 | **My children** deep-link: opens `/parent` **without** flipping tray to parent (no Ride tab under teacher chrome); no Approve chrome here; **no** stack upload | `/parent` under staff chrome |
| 5 | Back; confirm still teacher tray (Desk…Ask) | tray |
| 6 | Drawer **Parent** altitude switch → atomic rebuild tray Home·Ride·Ask | seat switch |
| 7 | Parent Home: own children only; post-Approve cells only; **no** Approve / draft / extract; no teacher gradebook write; **no** Upload stack | `/parent` |
| 8 | Ride check-in for linked child | `/parent/ride` |
| 9 | Leave line | `/parent/ride` |
| 10 | Ask on parent seat (parent context) — Ask must not expose class-stack tools | `/ask` |
| 11 | Drawer **Teach** switch back; tray teacher 5; wordmark from new seat only; stack entry available again only on Teach | seat switch |
| 12 | Confirm no concatenated trays / no Ride on teacher | tray |
| 13 | Sign out | hamburger |

## Lifecycle

Teacher session (capture → optional Pack B phone Approve → optional BATCH stack on Teach) → parent seat (published grades only; never Approve; never stack) → enter/leave Ride → return Teach → sign-out. Seat switch is full lifecycle both directions.

**BATCH seat law:** Active seat owns chrome. Teach → stack allowed. Parent → zero stack. Dirty mid-batch: seat switch must discard/confirm per product — do not silently continue Split Review under Parent chrome.

## Multiplicity

Own class students vs own children; must not blend. Teach-seat Approve on own classes only; Parent seat never Approves. BATCH packets stay on Teach-bound class; Parent never sees classmates’ stack PII tools.

## Reverse / cancel

My children without seat flip; leave Ride; switch back Teach; Cancel open batch on Teach before Confirm.

## Dual-hat

Core of this plan. Office not required. Parent/Student/Office DITL plans **unchanged** by BATCH-v1.

## Functions exercised

Seat switch atomic; dual drawer paths; capture; parent Home; Ride; Ask per seat; Teach-only BATCH stack entry + absence on Parent.

## Explicit non-goals

Teacher editing own child’s official grades via parent seat; Parent-seat KEYGRADE Approve or draft visibility; office Manage; inventing dual chrome mash; office/superintendent KEYGRADE chrome; **Parent-seat Upload stack / Split Review / Needs batch tools**; hot-folder; NEW_DITL.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Capture on Teach seat | `/capture` | PHYSICAL-ONLY |
| Pack B phone Approve (Teach only) | `/capture` review Approve | UI/`approve_capture`; **forbidden** on Parent seat |
| BATCH Upload stack (Teach only) | web CE-A / SR-A | —; Ask must not Confirm split; **forbidden** on Parent seat |
| My children deep-link | drawer My children → `/parent` staff chrome | Ask must not flip seat; no Approve; no stack |
| Parent seat switch | drawer **Parent** | no Ask seat-switch tool — **UI-primary** altitude |
| Parent grades / Ride | `/parent`, `/parent/ride` | Ask parent tools only **after** Parent seat; Ride PHYSICAL |
| Ask per seat | tray Ask | teacher ops vs parent co-teacher walls; no class-stack on Parent |
| Teach switch back | drawer Teach | UI-primary |

## Suggested QE themes

P-06 tray rebuild; Ride requires Parent seat; My children ≠ Ride menu; Ask walls follow seat; Teach seat may phone-Approve keyed; Parent seat cannot Approve / cannot see drafts; **BATCH only on Teach; Parent has zero stack discovery; phone gate honesty does not appear as Parent primary Split Review**.

## Artifacts + DB assert (refine-2)

| Beat | Fixture artifact | Format / subject | DB fields to assert |
|------|------------------|------------------|---------------------|
| 3 / 3b | T-01 capture fixtures | own-class capture | Teach-only Approve |
| 3c BATCH | `F-ART-BATCH-MATH-25P.pdf` (`notes/qa-fixtures/batch-ingest/`) | Teach stack | captures.class_id Teach-bound; no Parent-visible draft/extract |

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — teacher captures + parent Ride + optional batch.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Teacher-seat captures / BATCH | delete captures (T-01 rules); cancel open batch | PARTIAL | captures/assets clean for run |
| Parent-seat Ride events | leave line | GAP | no live trip |
| Seat switch | return Teach seat then sign out | — | profile seats unchanged |

**Order:** leave Ride → switch Teach → cancel open batch → delete captures → sign out.
**Isolation:** dual-hat fixture F-DH-TP not deleted.

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

## SWITCH-G (Gmail + Open Drive)

**SWITCH-G (Gmail switch + Open Drive):** Teach Settings / class-stack Drive chrome:
- Connect/bind one Google Drive Gmail for Teach user.
- **SW-A:** always-on **Disconnect Google** resets consent/token (including token-without-folder) so another Gmail can be chosen.
- **OD-A:** always-on **Open Google Drive** external link — user creates/organizes folder in Drive, then returns to Kelyra picker (return-to-picker lifecycle).
- One Drive Gmail per Teach user at a time.
- **Dual-hat (DH-01):** Teach seat only. Parent seat Settings: **zero** Drive switch / Open Drive / class-stack Drive chrome.

SoT: card comments + `batch-v2-switch-google-*` when present. Card `t_f7164ca9`.

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
- **2026-09-24 (t_f7164ca9):** SWITCH-G Disconnect Gmail + Open Drive return-to-picker; Teach-only
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
- **2026-09-24 (t_71f42604):** Students ClassTabs single row (layout host only; no Screen.collapse duplicate)
- **2026-09-24 (t_730cda45):** CT-A ClassTabs morph + DeskSpanTabs visibility on Teach desk
- **2026-09-10 (t_21f95d30):** KEYGRADE Pack B — Teach seat may phone-Approve keyed captures; Parent seat must not Approve or see drafts.
- **2026-09-12 (t_407a9f4a / IQG-BATCH UPDATE_PLANS):** BATCH-v1 — stack only on Teach seat; zero stack on Parent; phone gate honesty; fixtures `notes/qa-fixtures/batch-ingest/`; no NEW_DITL; Parent/Student/Office DITL unchanged.
