# DITL-S-02 — Student grades Diary Ask
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_2c13f9ac 2026-09-24: Keep student diary daychrome as GAP (ST-A GAP-S1) -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-02 |
| Title | Student: grades book, how-averages, Diary/ledger, Ask tutor-brief |
| Primary hat | student |
| Other hats | none |
| Support | SUPPORTED grades + Ask; SUPPORTED Diary journal/ledger |
| Regression tags | `grades`, `avg`, `diary`, `ask`, `chrome-student`, `auth`, `ask-dual` |

## Goal / story

Student reviews own grades (All + per-class), understands how grades/why average when published, writes a diary entry with optional photo, opens ledger deep-link if present, uses Ask for help on a focus skill, signs out.

## Preconditions / fixtures

- Student with graded cells and/or published syllabus family/student visibility.
- Diary feature available to student (`/diary`).
- Focus skill or assignment ground for Ask.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in student | `/sign-in` |
| 2 | Grades → All classes grid (own column only) | `/student/grades` |
| 3 | Filter one class; open how-grades / why average if offered | `/student/grades` |
| 4 | Assignment row detail if shipped (S-G4); else note PARTIAL | grades |
| 5 | Hamburger or entry → Diary / Journal | `/diary` |
| 6 | Create entry; optional camera attach; filters/sort if present | `/diary` |
| 7 | Ledger view / deep-link from entry if present | `/diary` ledger UI |
| 8 | **Reverse:** delete or cancel draft entry | `/diary` |
| 9 | Ask with assignment/skill ground | `/ask` |
| 10 | New chat archives prior thread behavior | `/ask` |
| 11 | Confirm no classmate scores visible | grades/people |
| 12 | Sign out | hamburger |

## Lifecycle

Sign-in → review/write/ask → sign-out. Diary entry create→optional delete.

## Multiplicity

Multiple class grade chips; multiple diary entries; Ask history threads.

## Reverse / cancel

Cancel diary draft; clear Ask thread (new chat); back from grade detail.

## Dual-hat

N/A.

## Functions exercised

Student grades; AVG explainers; Diary; Ask; FERPA own-only.

## Explicit non-goals

Teacher gradebook edit; parent Ride; publishing own grades; tutor infinite chat product.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| Grades All / class filter | `/student/grades` | explain average / published syllabus read tools |
| Diary create + photo | `/diary` | **Note:** `draft_diary_entry` policy student=`none` → diary Ask **PARTIAL/GAP**; UI diary remains P |
| Ledger deep-link | diary ledger UI | GAP if no tool |
| Ask tutor-brief on focus | tray Ask | primary Ask path; refuse graded finals |
| New chat archive thread | Ask UI | same |

## Suggested QE themes

No classmates in grades; diary photo UI; student diary Ask GAP honest; Ask not a grade.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — diary entries; Ask thread.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Diary journal entry + optional photo | delete entry / discard draft `/diary` | draft then Save — delete via UI; student diary Ask may be GAP | diary rows for student run; photo unref |
| Ask turns | New chat | same | ask_messages archived OK |
| Grades views | read-only | read tools | no grade writes |

**Order:** delete diary test entries → New chat → sign out.

## Soft v8b chrome (idle/working)

**Soft v8b chrome (idle / working):** Ask header K and other WorkingLine / Soft chrome marks follow Soft v8b:
- **Idle** = original `kelyra.png` (letter only; no face).
- **Working** = PNG letter + face + v7 Soft gas comet on the letter ink box; **1:1** letter outline idle↔working (face/comet overlay only).
- Morph **both ways** idle↔working when work starts/ends; look/blink allowed on working face.
- Opening Kelyra / splash / school logo stay still — do **not** drive Soft from app open alone.
- Dual-hat: same Soft chrome per active seat; no seat-mash Soft.

Strike any Soft-static-idle / pencil-only / v7-plate-as-idle assumptions. Cases that wait on Ask/Busy/capture Asking AI / ingest wait / chrome Ask tab should expect **working** Soft while busy, then return to idle.

SoT: `working-k-avatar-soft-v8b-verbatim-host.md` (+ `working-k-avatar-soft-intent.md` when present). Card `t_b4f598b3`.

## Journal daychrome (student GAP)

**Student Diary GAP (HOLD):** Per ST-A GAP-S1 / DIARY L7, student zero Diary daychrome — keep DITL-S-02 student diary day-browse as **GAP** if already GAP. Do not invent student Journal month chrome to match teacher layout B. Card `t_2c13f9ac`.

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
- **2026-09-24 (t_2c13f9ac):** Keep student diary daychrome as GAP (ST-A GAP-S1)
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
