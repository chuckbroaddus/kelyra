# DITL-S-01 — Student assignments submit
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->
<!-- DITL-UPDATE t_0aafd388 2026-09-29: Stamp 6 header Open Capture; Capture camera non-goal superseded for this shutter; tray count unchanged -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-S-01 |
| Title | Student: see to-do, open practice/lesson, submit, multi-class |
| Primary hat | student |
| Other hats | none (students cannot wear staff/parent hats) |
| Support | SUPPORTED M8 student to-do / submit |
| Regression tags | `auth`, `todo`, `submit`, `assignments`, `chrome-student`, `lessons`, `ask-dual` |

## Goal / story

A student signs in, uses the 6-tab student tray, opens Assignments, completes an assigned practice (and optional lesson pack), submits, checks Done, and if enrolled in two classes confirms work does not mash.

## Preconditions / fixtures

- Student login enrolled in ≥1 class (prefer 2).
- ≥1 assigned practice set awaiting submit; optional lesson assignment.
- No teacher chrome on this login.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Sign in student | `/sign-in` |
| 2 | Confirm tray 6: Assignments · Feeds · Classes · Grades · People · Ask. Tray count stays six. Do not add or remove a student tray tab. Header shutter is not a tray tab. | student tray |
| 3 | Assignments Home To Do | `/todo` |
| 4 | Open assigned set; answer items | `/todo` or assignment route |
| 5 | Submit; confirm leaves To Do → Done path | `/todo` Done tab |
| 6 | **Reverse:** abandon in-progress without submit if allowed | assignment |
| 7 | Classes tab: open class landing / assignments | `/student/class` |
| 8 | Optional lesson Open → metrics as evidence not grade until teacher Approve | lesson routes |
| 9 | Feeds glance (class + school feed) | `/student/feed` |
| 10 | People directory read-only | `/student/people` |
| 11 | Second class: switch context; no cross-class submission | `/student/class` |
| 12 | Sign out (ends session; does not unenroll) | hamburger |

## Lifecycle

Sign-in → work → submit → sign-out.

## Multiplicity

Multiple assignments; two classes isolation.

## Reverse / cancel

Leave assignment mid-way; do not submit blank if product blocks.

## Dual-hat

N/A for student role.

## Functions exercised

Student auth; tray; to-do/submit; class landing; feeds; people read.

## Explicit non-goals

Capture camera as a header-dark non-goal is **superseded, kept**. Grade Approve stays out (turning homework in is not a grade). Ride tab; parent seat; editing roster; a Capture tray tab; changing the tray count. DITL-S-02 diary camera is a different sheet. Do not merge them.

## Dual path (UI + Ask) — refine 2026-09-10

| Activity | UI | Ask |
|----------|----|-----|
| To Do list | `/todo` | `list_my_practice` |
| Open/submit practice | assignment UI submit | Ask `open_screen` to practice; **UI-primary submit**; Ask refuses graded solve |
| Classes landing | `/student/class` | `open_screen` / list classes if allowed |
| Feeds glance | `/student/feed` | `list_feed` |
| People read-only | `/student/people` | `list_people` read walls |
| Multi-class isolation | class switch | Ask ground per class |

## Suggested QE themes

Own work only; Done state; multi-class; sign-out ≠ leave class; Ask not solver.

## Artifacts + DB assert (refine-2)

Consumer of teacher-authored work: open assignments created under T-04 / F-ASSIGN (diverse subjects). After submit: `submissions.status` progressed/completed for **own** student_id only; no cross-class mash. **Superseded, kept:** "Does not re-ingest photos" as a reason to keep the student header dark. Own homework for submission may use the header shutter. Turning it in is not a grade. Do not re-run teacher ingest.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — submission status on assigned work.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| `submissions` progress/completed | Teacher/seed reset or delete test submission if RPC exists | Student Ask must not wipe gradebook | `submissions.status` for S1 on ditl assignments → `assigned` or row removed |
| In-progress abandon | leave without submit | — | no half-grade |

**Isolation:** only this student submission; do not delete teacher assignment column unless run created it.
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

## Stamp 6 Capture (header)

Card `t_0aafd388`. Lock: Stamp 6 in `notes/company/superintendent-capture-stamp.md`. PM lock: `notes/company/superintendent-capture-pm.md`. Not a new day. Not a case rewrite. Do not copy a dark student header.

**Header this plan names.** The student seat shows one header shutter, spoken name Open Capture, except Messages and open Search. Not dark. Not a tray tab. Tray stays six: Assignments · Feeds · Classes · Grades · People · Ask. Do not add or remove a student tray tab. Do not change that count.

**Seat list this plan owns.** Own face for the avatar, a linked parent's face for that parent's avatar, or own homework for submission. Turning it in is not a grade. A photo does not set a grade. Only the teacher sets a classwork grade. The leave is the same camera. Confirm again on that same linked parent replaces the avatar. A wrong face does not attach. Cancel before confirm is not that leave. Not another student. Not a new person. Not the office list. Not the school logo. A contact or emergency card with no field this seat can already change stays a refusal. Nothing is filed. The portrait stays in.

**Not this sheet.** Capture camera is no longer a non-goal for this header shutter. DITL-S-02 diary camera is a different sheet. Do not merge them. Teach keeps today's teacher Capture. Do not add the office list to Teach.

## Changelog


- **2026-09-29 (t_0aafd388):** Stamp 6 header Open Capture on the student seat. Capture-camera non-goal superseded for this shutter. Tray count stays six. S-02 diary camera not merged.
- **2026-09-24 (t_0a62f427):** Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar
- **2026-09-24 (t_b4f598b3):** Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways
