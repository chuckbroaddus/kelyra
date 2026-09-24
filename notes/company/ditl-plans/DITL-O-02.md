# DITL-O-02 — Roster + family link + bio + class assign
<!-- DITL-UPDATE t_0a62f427 2026-09-24: Calendar surface R4/CR/R5/3DW/P6 deltas; Desk≠Year; Diary≠Calendar -->
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle=kelyra.png / working=letter+face+comet; morph both ways -->

| Field | Value |
|-------|-------|
| Plan ID | DITL-O-02 |
| Title | Office/Super: add students/parents, link family, edit bio, assign classes |
| Primary hat | administrator **and** superintendent (run both) |
| Other hats | none (dual-hat → DH-02) |
| Support | SUPPORTED people/link/enroll; bio via profile details |
| Regression tags | `office`, `people`, `roster`, `family-link`, `bio`, `enroll`, `ask-dual`, `auth` |
| CEO story | 1 — Roster + family link + bio + class assign |

## Goal / story

Superintendent/Office adds students and parents, associates them, edits bio/contact, assigns students to classes. Every write runs **UI then Ask** (or Ask then UI on a second person) so both paths produce the same durable outcome.

## Preconditions / fixtures

- F-OFFICE, F-SCHOOL, F-TEACHER-A class empty slots, F-STUDENTS room for new names
- Twins multiplicity: two new siblings optional
- Run pass A as administrator; pass B as superintendent

## Dual-path beat list

| # | Activity | Support | UI path | Ask path |
|---|----------|---------|---------|----------|
| 1 | Sign in office seat | SUPPORTED | `/sign-in` → office tray Feed·Classes·People·Manage·Ask | — (auth) |
| 2 | Add student person | SUPPORTED | People / admin people → add student | `/ask` `add_student` (officeOnly) |
| 3 | Edit student bio (name/contact/notes as allowed) | SUPPORTED | `/profile?person=…` or student person Details | `/ask` `update_student` |
| 4 | Create parent person | SUPPORTED | People → add parent | `/ask` `create_parent` |
| 5 | Edit parent bio | SUPPORTED | parent person Details / profile | `/ask` `update_parent` |
| 6 | Link parent ↔ student (family) | SUPPORTED | People link UI / admin_set_parent_link | `/ask` `link_parent_student` (officeOnly) |
| 7 | Second parent on same child (multiplicity) | SUPPORTED | link F-PARENT-2 style | Ask `link_parent_student` second parent |
| 8 | Enroll student into class | SUPPORTED | class roster add / admin class | `/ask` `enroll_student` |
| 9 | Enroll same student second class | SUPPORTED | second class roster | Ask enroll other class |
| 10 | Optional avatar | SUPPORTED | photo UI | `/ask` `set_avatar` |
| 11 | Provision logins if needed | SUPPORTED | people provision | Ask `provision_student_login` / `provision_parent_login` / `admin_create_login` |
| 12 | Reverse: unlink one parent (keep persons) | SUPPORTED | unlink control | `/ask` `unlink_parent_student` |
| 13 | Verify directory lists + FERPA walls | SUPPORTED | `/?tab=people` | Ask `list_people` / `search_students` / `get_parent` |
| 14 | Sign out | SUPPORTED | hamburger | — |

## Lifecycle / reverse / multiplicity / dual-hat / non-goals

- Lifecycle: create persons → link → bio edit → enroll → unlink → sign-out
- Multiplicity: twins/siblings; two parents; two classes
- Reverse: unlink without delete; do not hard-delete in this plan (see O-03)
- Dual-hat: not required
- Non-goals: attendance SIS; teacher minting family link (`link_parent_student` officeOnly); inventing fields; office syllabus

## Suggested QE themes

Office vs super same outcomes; Ask+UI parity on link/enroll; unlink keeps persons; no cross-family bleed.

## Artifacts + DB assert (refine-2)

Bio edits use canonical `students.metadata` / `parents.metadata` keys only (data-model). After `update_student` / Details save: assert `preferred_name`, `phone`, `email`, `address`, `birthday` (and parent keys) match typed values. New persons: `students.display_name`, `enrollments`, `parent_students` rows. **Photo student-card ingest is T-05** (teacher capture intent); O-02 is manual/Ask field path.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — persons, links, enrollments, bios, logins.

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| New students `ditl-*` names | remove enrollment(s); delete student if test-only | remove enroll; `delete_student` if allowed | `students`, `enrollments` — no ditl test students left |
| New parents | unlink all children; delete parent | `unlink_parent_student`; delete parent UI/RPC | `parents`, `parent_students` |
| Bio edits on **fixture** persons | revert metadata keys to baseline | `update_student` / `update_parent` | `students.metadata` / `parents.metadata` canonical keys only |
| Logins provisioned | revoke/disable if UI | provision reverse GAP/UI | `profiles` test logins gone |
| Avatars set | clear profile photo | clear if tool | `photo_asset_id` null + asset unref |

**Order:** revoke logins → clear photos → unlink parents → remove enrollments → delete test persons (not shared F-* seed) → revert fixture bios → sign out.
**Idempotent:** skip already-deleted. **Do not** wipe entire school roster.

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
