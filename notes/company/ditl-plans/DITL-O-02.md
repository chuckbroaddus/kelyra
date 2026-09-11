# DITL-O-02 — Roster + family link + bio + class assign

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
