# DITL seed-school fixture bible (spec only)

**Date:** 2026-09-10  
**Author:** qa-supervisor (`t_f0368947`)  
**Status:** SPEC ONLY — do **not** apply SQL, create live Supabase rows, git push, or staff QA Engineer.  
**Parent program:** `t_7ebea568` (stays sticky; QE not unblocked by this card)  
**Plans SoT:** `notes/company/ditl-testplans.md` + `notes/company/ditl-plans/*.md` (21 IDs)  
**Artifacts map:** `notes/qa-fixtures/ditl/ditl-pen-README.md`  
**Data model:** `docs/data-model.md` · MVP matcher: `docs/mvp.md` · Ride tables: `supabase/migrations/20260907000000_ride_schema.sql`

---

## 1. Purpose

Concrete people, classes, cars, and Ride lines so later QE cases bind to stable fixture IDs (`F-*`) instead of inventing ad-hoc names. This file is the **index bible** for a single **throwaway test school**.

## 2. Isolation law

| Rule | Detail |
|------|--------|
| School | One throwaway school only — never production / never live classroom data |
| Naming | Titles, usernames, class names, assignment titles, feed bodies prefix **`ditl-`** or use fixture IDs below |
| PII / FERPA | **Synthetic only.** No Broaddus/family names. No real student data. Card values below are invented. |
| Passwords | Placeholder pattern `DITL-<role>-test` — set **only** on throwaway school. No production secrets in this doc. |
| Apply | **Later**, via CEO-authorized `devops-release` only. This card writes docs. |
| QE | Do **not** staff QA Engineer from this card. |

---

## 3. F-SCHOOL (throwaway school)

| Field | Seed value |
|-------|------------|
| Fixture ID | `F-SCHOOL` |
| Display name | `ditl-Sandbox Academy` |
| Short code / slug (if used) | `ditl-sandbox` |
| Logo | optional; may omit for seed |
| Feed icon | default school feed glyph (`feedSchool` catalog) |
| Identity | superintendent may edit name/logo later (O-01 super-only beats) |

**Never** seed this onto a production school_id. Create a dedicated school row when apply is authorized.

---

## 4. Account table (logins)

Username is unique per school, stored **without** `@` (`profiles.username`). Password placeholders are **not** real secrets — operators set them only on the throwaway school.

| Fixture | Username | `profiles.role` | Extra hats | Linked person | Plans (primary) |
|---------|----------|-----------------|------------|---------------|-----------------|
| F-OFFICE super | `ditl-super` | `superintendent` | — | — | O-01..O-07 (pass B), O-01 identity/matrix/archive |
| F-OFFICE admin / F-DH-OP | `ditl-admin` | `administrator` | `parent_id` → parent person **P-ADMIN** (S1) | parents row P-ADMIN | O-01..O-07 (pass A), DH-02, O-04 office |
| F-TEACHER-A / F-DH-TP | `ditl-teacher-a` | `teacher` | `parent_id` → parent person **P-AVERY** (S3) | teachers + parents P-AVERY | T-01..T-05, T-04, DH-01, O-05 |
| F-TEACHER-B | `ditl-teacher-b` | `teacher` | — | teachers | T-*, DH-01 (S3 class owner), O-05 |
| F-TEACHER-C | `ditl-teacher-c` | `teacher` | — | teachers | O-05 reassignment / delete-from-school GAP victim |
| F-PARENT-1 | `ditl-parent-1` | `parent` | — | parents **P1** | P-01, P-02, P-03, O-04 ban subject |
| F-PARENT-2 | `ditl-parent-2` | `parent` | — | parents **P2** | P-03 alt, O-04 allowed co-parent |
| F-STUDENT-LOGIN S1 | `ditl-student-s1` | `student` | — | students **S1** | S-01, S-02, S-03 |
| F-STUDENT-LOGIN S2 | `ditl-student-s2` | `student` | — | students **S2** | S-01 twin control; optional S-02 |
| Duty staff (optional) | reuse `ditl-teacher-c` or `ditl-admin` | staff | `dismissal_duty` curb on Line A | — | O-01 ride staff smoke, P-01 staff view |

**Password pattern (throwaway only):**

| Role | Placeholder |
|------|-------------|
| superintendent | `DITL-super-test` |
| administrator | `DITL-admin-test` |
| teacher | `DITL-teacher-test` (same string OK for A/B/C on throwaway) |
| parent | `DITL-parent-test` |
| student | `DITL-student-test` |

Auth: real school logins (no anon parent token for Ride). Network on.

**Dual-hat seats (required):**

1. **F-DH-TP:** Teacher A login; job of record `teacher`; `parent_id` = P-AVERY linked only to **S3** in Teacher B class (never own class).
2. **F-DH-OP:** Administrator login; job of record `administrator`; `parent_id` = P-ADMIN linked to **S1** (third family link alongside P1/P2).

Seat switch: staff **My children** / parent altitude per chrome SoT — not a second auth user.

---

## 5. Students S1–S5 (F-STUDENTS)

Synthetic display names only. Twin pair S1–S2 share family name **Lee** for matcher near-duplicate stress.

| ID | `display_name` | Twin | Classes (seed) | `name_aliases` seed | Baseline `metadata` (pre T-05/O-07) | Notes |
|----|----------------|------|-----------------|---------------------|--------------------------------------|-------|
| **S1** | `Jordan Lee` | twin of S2 | Math (A) primary; optional 2nd class English (B) for O-03 multi-enroll | `{"Jordan"}` | `{}` or minimal `grade_or_age: "3rd"` | Student login; card target T-05/O-07; Parent-1+2+P-ADMIN |
| **S2** | `Jamie Lee` | twin of S1 | Math (A) | `{"Jamie"}` | `{}` | Student login optional; twin multiplicity |
| **S3** | `Morgan Patel` | no | **English (B) only** — not in Teacher A class | `{"Morgan"}` | `{}` | Child of Teacher A dual-hat (P-AVERY) |
| **S4** | `Riley Chen` | no | Math (A) | `{"Riley"}` | `{}` | F-FOCUS candidate / capture depth |
| **S5** | `Samira Okonkwo` | no | Math (A) | `{"Samira","Sammy"}` | `preferred_name: "Sammy"` + alias Sammy | Near-duplicate / alias matcher |

**Roster size:** Math ≥5 (S1–S2,S4,S5 + room); English holds S3 (+ optional S1 for multi-class beats).

### 5.1 T-05 / O-07 card target values (existing S1 only)

After teacher `student_card` confirm (T-05) or office Details/`update_student` (O-07), assert these **canonical** keys on **existing** S1. Unchecked proposals must not write. Clear = delete key.

| Key | Expected synthetic value | DB |
|-----|--------------------------|-----|
| `preferred_name` | `Jordy` | `students.metadata` + upsert `name_aliases` |
| `birthday` | `2017-04-12` | metadata; parent sees month+day only |
| `phone` | `555-0101` | metadata; parent never |
| `email` | `jordan.lee.ditl@example.test` | metadata |
| `address` | `100 Ditl Lane, Testville` | metadata |
| `emergency_name` | `Taylor Lee` | metadata |
| `emergency_phone` | `555-0199` | metadata |
| `grade_or_age` | `3rd` | metadata |
| unrecognized | append `notes` only | no IEP/504 columns |

Photo fixture: `F-ART-CARD-STUDENT-HW` → `notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg`. Capture stays `note_only` (no grade).

**Baseline snapshot:** before T-05/O-07, record S1 metadata + aliases; teardown reverts to baseline (never delete S1).

---

## 6. Parents (F-PARENT-*)

| ID | `display_name` | Links (`parent_students`) | Login | `parents.metadata` seed | Plans |
|----|----------------|---------------------------|-------|-------------------------|-------|
| **P1** | `Taylor Lee` | S1, S2 | `ditl-parent-1` | `relationship: "guardian"`, `phone: "555-0201"` | P-01..P-03, O-04 ban subject |
| **P2** | `Cameron Brooks` | S1 only (allowed co-parent) | `ditl-parent-2` | `relationship: "guardian"`, `phone: "555-0202"` | O-04 allowed check-in; P-03 alt car |
| **P-AVERY** | `Avery Quinn` (same human as Teacher A) | **S3 only** | via Teacher A `parent_id` | `relationship: "guardian"` | F-DH-TP / DH-01 |
| **P-ADMIN** | `Devon Hale` (same human as Administrator) | **S1** (third link) | via Admin `parent_id` | `relationship: "guardian"` | F-DH-OP / DH-02 |

Teacher-only parent `notes` never leak to other families. Unlink ≠ delete person.

---

## 7. Vehicles + Ride (F-RIDE)

Fake plates only. `pickup_restrictions` **empty by default** (O-04 sets/clears).

### 7.1 Dismissal lines

| Line ID | `dismissal_lines.name` | `sort` | Status | Duty seed |
|---------|------------------------|--------|--------|-----------|
| **Line A** | `ditl-Line A Front` | 1 | `active` | curb duty: `ditl-teacher-c` or `ditl-admin` |
| **Line B** | `ditl-Line B Side` | 2 | `active` | optional stage duty |

### 7.2 Vehicles (`parent_vehicles`)

| Vehicle ID | Parent | `plate_raw` | `plate_norm` | make/model | label | validity |
|------------|--------|-------------|--------------|------------|-------|----------|
| **V1** | P1 | `DITL-AAA1` | `DITLAAA1` | Blue Sedan | `Morning car` | `indefinite` / active |
| **V2** | P1 | `DITL-BBB2` | `DITLBBB2` | Gray SUV | `Afternoon car` | `indefinite` / active |
| **V3** | P2 | `DITL-CCC3` | `DITLCCC3` | White Hatch | `Co-parent car` | `indefinite` / active |
| **V4** (optional) | P-AVERY | `DITL-DDD4` | `DITLDDD4` | Green Wagon | `Teacher dual-hat` | `indefinite` / active |
| **V5** (optional) | P-ADMIN | `DITL-EEE5` | `DITLEEE5` | Black Coupe | `Admin dual-hat` | `indefinite` / active |

Two vehicles on P1 satisfy P-03 multi-car. Active unique `(school_id, plate_norm)` among non-void currently valid rows.

### 7.3 Pickup restrictions

Seed: **no rows** (empty). O-04 creates restriction Parent-1 ↔ S1 then clears in teardown.

---

## 8. Classes + teachers

| Class fixture | `classes.name` | Teachers (`class_teachers` / owner) | Roster seed | Purpose |
|---------------|----------------|--------------------------------------|-------------|---------|
| **C-MATH** | `ditl-Math Period 3` | **Teacher A** primary; C may be added in O-05 | S1, S2, S4, S5 (≥4; room for 5th) | Capture, gradebook, AVG, quiz, focus |
| **C-ENG** | `ditl-English Homeroom` | **Teacher B** primary | S3; optional S1 for multi-enroll | Dual-hat child not in parent-teacher class; O-03 Class B |
| **C-SPARE** (optional empty) | `ditl-Spare Lab` | none until O-05 | empty | O-05 create/staff/delete disposable copy — prefer create-in-plan over shared wipe |

Teacher A `active_class_id` → C-MATH. Teacher B → C-ENG.

**F-TEACHER-C:** person+login present; not required on Math home class until O-05.

---

## 9. Academic seed bundles (non-account F-*)

| Fixture | Concrete seed rows | Notes |
|---------|-------------------|-------|
| **F-DRAFTS** | ≥2 `captures` on C-MATH: one matched draft gap on S4/S5; one Unassigned (`student_id` null) | Prefer run T-01 before T-02 or pre-insert with `ditl-` titles |
| **F-ASSIGN** | One approved gap + practice assignment on S1; one `submissions` ready (`assigned` or `completed`) | Titles `ditl-*` |
| **F-AVG** | Math syllabus draft/published categories weights **sum 100**; `publish_to_family` on when testing family Home | Teacher-owned `syllabus.manage` |
| **F-QUIZ** | Assignment `category=quiz` + answer-key photo path from F-ARTIFACTS | Key ↔ `assignment_id` |
| **F-FOCUS** | S4 or S1 with `current_focus_skill_id` set; practice set assigned | Map “focus exercise” → practice-on-focus |
| **F-DIARY** | Diary feature enabled for teacher path `/diary` | No auto-ledger from Ask |
| **F-FEED** | School + class feed composers available to office/teacher | Ask create feed = GAP |
| **F-GRADES-HIST** | S1 (or designated) with **approved** grades + submissions in **C-MATH and C-ENG** | O-03 archive-preservation; disposable victim only |
| **F-ARTIFACTS** | File map SoT: `notes/qa-fixtures/ditl/ditl-pen-README.md` | Do not invent new IDs here |
| **F-AUTHOR** | See §12 Author pointer | Studio only; no class-app DB |

**Matcher law (mvp):** homework match = **spoken name** + roster — not OCR name-off-page. Student data card is the named exception for field extract onto existing id.

---

## 10. Plan ID → required seed (minimal vs full)

Legend: **M** = minimal subset to start the plan; **F** = full shared seed recommended for less setup mid-run. Shared core = F-SCHOOL + relevant logins.

| Plan ID | Minimal (M) | Full / optional (F) | Notes |
|---------|-------------|---------------------|-------|
| **DITL-P-01** | F-PARENT-1, S1(+S2), V1, Line A, F-AVG published family-on, F-RIDE empty ban | F-ASSIGN grades visible; duty staff | AM grades + car line |
| **DITL-P-02** | F-PARENT-1, S1, messaging thread w/ Teacher A, F-ASSIGN homework | F-AVG | PM homework Ask + message |
| **DITL-P-03** | F-PARENT-1, S1+S2, **V1+V2**, Line A+B | F-PARENT-2 optional | multi-child multi-car |
| **DITL-T-01** | F-TEACHER-A, C-MATH roster ≥5 twins, F-ARTIFACTS HW math + typed eng | camera | Capture morning; spoken-name match |
| **DITL-T-02** | F-TEACHER-A, F-DRAFTS, F-AVG, web ≥720 | F-QUIZ, F-FOCUS | Grade + Assign desk |
| **DITL-T-03** | F-TEACHER-A, Needs/inbox seed, parent message target | search people | Messages + Needs |
| **DITL-T-04** | F-TEACHER-A, F-AVG, F-QUIZ+keys, F-DRAFTS, F-FOCUS, F-PARENT, F-DIARY, F-FEED, F-ARTIFACTS multi | F-ASSIGN | Full author day |
| **DITL-T-05** | F-TEACHER-A, S1 enrolled, F-ART-CARD-STUDENT-HW, baseline metadata snap | twins on roster | existing student only |
| **DITL-S-01** | F-STUDENT-LOGIN S1, F-ASSIGN practice/hw | F-FOCUS | submit own work |
| **DITL-S-02** | S1 login, graded cells visible, F-DIARY if student diary path | F-AVG family/student book | grades + diary Ask |
| **DITL-S-03** | S1 login, message counterparty, F-FOCUS practice | second thread | messages + focus |
| **DITL-DH-01** | F-DH-TP (Teacher A + P-AVERY→S3), C-MATH + C-ENG, F-PARENT Ride bits for S3 | F-RIDE V4 | AM teach / PM family |
| **DITL-DH-02** | F-DH-OP (admin + P-ADMIN→S1), F-RIDE, F-OFFICE | V5 | desk then family Ride |
| **DITL-O-01** | F-OFFICE both hats, F-SCHOOL, F-RIDE duty smoke | identity logo optional | supported office only |
| **DITL-O-02** | F-OFFICE, empty slots on C-MATH, room for new names | twins optional create-in-plan | people CRUD — teardown persons created |
| **DITL-O-03** | F-OFFICE, **F-GRADES-HIST** Sx in Class A+B, two enrollments | F-PARENT co-parent FERPA | destructive → **re-seed** |
| **DITL-O-04** | F-PARENT-1+2→S1, vehicles, F-RIDE empty restrict, F-OFFICE | — | ban/unban lifecycle |
| **DITL-O-05** | F-OFFICE, F-TEACHER-A/B/C, students to enroll | disposable class create-in-plan | do not wipe Math home |
| **DITL-O-06** | F-FEED, F-OFFICE, audience families/teachers | class feed contrast | alerts + school feed |
| **DITL-O-07** | F-OFFICE, S1 baseline metadata, card field values (§5.1) | run indep of T-05 | office field attach; photo extract GAP |
| **DITL-X-01** | F-AUTHOR paths only (§12) | — | **no** class-app DB seed |

### 10.1 Full-seed “day zero” checklist (when apply authorized)

1. F-SCHOOL throwaway  
2. Logins: super, admin, teachers A/B/C, parents 1/2, students S1/S2  
3. Parent persons P1, P2, P-AVERY, P-ADMIN + links  
4. Students S1–S5 + enrollments  
5. Dual-hat `parent_id` on teacher-a and admin profiles  
6. C-MATH + C-ENG (+ optional spare)  
7. Lines A/B, vehicles V1–V3 (V4/V5 optional), duty row, **no** pickup_restrictions  
8. F-AVG published sum 100; light F-ASSIGN / F-FOCUS / F-GRADES-HIST as needed  
9. F-ARTIFACTS on disk (already present under `notes/qa-fixtures/ditl/`)

---

## 11. Teardown (global + seed)

Aligns with **Global teardown contract** in `ditl-testplans.md`. This bible’s seed is **shared**; plans must not school-wipe it.

### 11.1 What plans may destroy vs must preserve

| May mutate / delete (run-tagged `ditl-`) | Must **not** wipe |
|------------------------------------------|-------------------|
| Captures/assets created this run | Shared S1–S5 persons (except O-03 tagged victim + **re-seed**) |
| Assignments/submissions/practice with `ditl-` titles | F-TEACHER-A home Math class |
| Syllabus draft beyond baseline (restore weights) | Production any school |
| Pickup restriction rows created in O-04 (clear) | Other families’ data |
| Feed posts/alerts with `ditl-` body | Shared vehicles V1–V3 unless run created extras |
| Disposable O-05 class | F-DH-TP / F-DH-OP person rows |
| Studio emit dirs tagged `ditl-` | Golden author packs / `fom-ch01-v4` |

### 11.2 Reverse-create order (seed destroy — throwaway school only)

Only when retiring the **entire** throwaway school (never production):

1. Leave live Ride trips / clear queue_events for school_date  
2. Clear `pickup_restrictions`  
3. Void/delete `parent_vehicles`  
4. Remove `dismissal_duty` → archive/delete `dismissal_lines`  
5. Delete feed posts / messages threads created for seed (if any)  
6. Unpublish syllabus; delete `ditl-*` assignments → submissions CASCADE; practice_sets; skill_gaps; captures → unref assets  
7. Unlink `parent_students`; revoke invites  
8. Remove enrollments; delete disposable classes  
9. Delete student/parent person rows (hard-delete law)  
10. Remove dual-hat `parent_id` links; delete profiles/auth users for ditl-* usernames  
11. Delete school row last  

**Idempotent:** skip missing; no error storms. **O-03:** teardown is often **re-seed F-GRADES-HIST**, not undo.

### 11.3 Never

- Production school_id  
- Broaddus / real family data  
- Invent attendance archive tables to “clean”  
- Assume Ask has delete/leave/restrict/feed-create tools (many UI-only — see plan GAPs)

---

## 12. F-AUTHOR (X-01) — existing paths only

Do **not** emit packs from this card. Point QE/studio at existing samples:

| Role | Path |
|------|------|
| Live gold source (gitignored local) | `~/projects/kelyra/notes/teacher-decks/fom-ch01-v4/` |
| Author studio repo | `~/projects/kelyra-author` |
| Round-trip scratch sample | `~/projects/kelyra-author/scratch/fom-ch01-s11-test/` (`manifest.json` present) |
| Round-trip ids (docs) | `deck_id=fom-ch01-s11-test`, `storage_deck_id=fom-ch01-author-test` |
| Pack/interface SoT | `~/projects/kelyra-author/docs/package-spec.md`, `publish-lesson-pack.md`, `author-kelyra-interface.md` |

X-01 teardown = filesystem emit dirs only; **no** class-app DB.

---

## 13. F-* completeness checklist

| Fixture ID | Concrete in this bible? |
|------------|-------------------------|
| F-SCHOOL | §3 ditl-Sandbox Academy |
| F-TEACHER-A/B/C | §4 + §8 Avery Quinn / Blake Nguyen / Casey Ortiz usernames |
| F-STUDENTS S1–S5 | §5 Jordan/Jamie Lee twins + Morgan/Riley/Samira |
| F-PARENT-1/2 | §6 Taylor Lee / Cameron Brooks |
| F-DRAFTS | §9 |
| F-ASSIGN | §9 |
| F-AVG | §9 |
| F-QUIZ | §9 |
| F-FOCUS | §9 |
| F-RIDE | §7 lines A/B + vehicles + empty restrictions |
| F-OFFICE | §4 ditl-super + ditl-admin |
| F-DH-TP | §4 Teacher A → S3 |
| F-DH-OP | §4 Admin → S1 |
| F-STUDENT-LOGIN | §4 S1/S2 |
| F-DIARY | §9 |
| F-FEED | §9 |
| F-AUTHOR | §12 |
| F-GRADES-HIST | §9 |
| F-ARTIFACTS | pen-README file map |

Teacher display names for profiles (synthetic):

| Login | `display_name` |
|-------|----------------|
| ditl-super | `Ditl Superintendent` |
| ditl-admin | `Devon Hale` |
| ditl-teacher-a | `Avery Quinn` |
| ditl-teacher-b | `Blake Nguyen` |
| ditl-teacher-c | `Casey Ortiz` |

---

## 14. APPLY LATER appendix (no SQL applied this card)

**CEO lock:** live SQL → `devops-release` only; CoS has **not** authorized apply. This section names **existing** tables/RPCs from `docs/data-model.md` and ride migrations only. **No SQL files. No invented tables.**

### 14.1 Core people / school (data-model)

| Concern | Tables / objects | Suggested RPCs / notes (named in product) |
|---------|------------------|-------------------------------------------|
| School | `schools` | `set_school_name`, `set_school_logo` (super) |
| Logins | `auth.users`, `profiles` | admin provision / `admin_create_login`; hats: `also_teacher`, `also_administrator`, `parent_id`, `student_id` |
| Teachers | `teachers`, `class_teachers` | `add_teacher_to_class`, `remove_teacher_from_class` |
| Classes | `classes` | `create_class`, `delete_class` (office) |
| Students | `students`, `enrollments` | `add_student`, `enroll_student`, `update_student`; matcher never inserts |
| Parents | `parents`, `parent_students`, `parent_accesses` | `create_parent`, `link_parent_student`, `unlink_parent_student`, `update_parent` |
| Assets | `assets` + storage buckets | unref helper on delete |
| Captures / gaps | `captures`, `skill_gaps`, `skills` | teacher capture flow; `delete_gap` |
| Practice / gradebook | `practice_sets`, `assignments`, `submissions` | Approve gate; `create_assignment` |
| Syllabus / AVG | class syllabus draft/published (product tables as shipped) | `scan_class_syllabus`, `discard_class_syllabus_draft`, `get_published_class_syllabus` |
| Messages | `message_threads`, `message_thread_members`, `messages` | `send_message`, `list_threads` |
| Feed | feed post tables as shipped | UI `create_feed_post`; Ask create = **GAP** |
| Diary | diary tables as shipped | `draft_diary_entry` + user Save |
| Audit | `audit_events` | `write_audit` insert-only |
| Ask history | `ask_threads`, `ask_messages` | not grades |
| Lessons | `lesson_packs` / Storage `lessons/…` | Author publish path; X-01 studio |

Canonical metadata keys only (`students.metadata`, `parents.metadata`) — see data-model § Metadata shapes. No IEP/504 columns.

### 14.2 Ride (migrations `20260907000000_ride_schema.sql` + RPCs)

| Table | Seed use |
|-------|----------|
| `dismissal_lines` | Line A / Line B |
| `parent_vehicles` | V1–V5 fake plates |
| `pickup_restrictions` | empty default; O-04 via `office_set_pickup_restriction` |
| `dismissal_duty` | curb/stage staff |
| `line_photos` | runtime only (not day-zero seed) |
| `queue_events` | runtime only |

Named RPCs (apply/ops reference): `parent_upsert_vehicle`, `dismissal_parent_check_in`, `dismissal_parent_leave`, `dismissal_my_trip`, `dismissal_queue_live`, `dismissal_staff_walk_photo`, `dismissal_order_fix`, `dismissal_release`, `dismissal_nudge`, `office_set_pickup_restriction`, `dismissal_list_lines`, `dismissal_purge_old`, helpers `ride_*`.

### 14.3 GAPs (do not invent seed rows)

| CEO / plan need | Product truth | Seed action |
|-----------------|---------------|-------------|
| **Attendance archive** (O-03 / OPEN #1) | Attendance **NOT IN PRODUCT** | **GAP** — no attendance tables; QE fails honestly |
| Soft-archive people/grades remain | Largely **hard-delete** | **GAP** — F-GRADES-HIST re-seed after destructive; no trash table |
| Ask create feed/alert | UI only | no seed for Ask tool |
| Ask pickup restriction | UI only | seed empty restrictions; UI sets |
| Office photo student_card extract | no office Capture | O-07 field path only |
| Multi-school super dashboard | NOT IN PRODUCT | single throwaway school only |

### 14.4 Apply gate checklist (future devops-release)

- [ ] CoS/CEO authorize throwaway school only  
- [ ] No production credentials in scripts committed to git  
- [ ] Passwords set out-of-band to `DITL-*-test` pattern  
- [ ] Verify dual-hat: Teacher A parent of S3-not-in-own-class; Admin parent of S1  
- [ ] Verify twins S1/S2; restrictions empty  
- [ ] Point F-ARTIFACTS at `notes/qa-fixtures/ditl/`  
- [ ] Do not staff QE until CEO explicit ask  

---

## 15. Handoff

| Field | Value |
|-------|-------|
| Deliverable | `notes/company/ditl-seed-school.md` |
| Card | `t_f0368947` |
| SQL applied | **No** |
| QE staffed | **No** |
| Parent `t_7ebea568` | Comment only; stays sticky / not unblocked for QE |
| Next | CEO may staff QE cases **bound to this seed** when ready (not this card) |

**Related:** `notes/company/ditl-testplans.md`, `notes/company/ditl-plans/*.md`, `notes/qa-fixtures/ditl/ditl-pen-README.md`.




