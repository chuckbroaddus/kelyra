# Kelyra DITL Test Plans (plans only) — REFINE-2 2026-09-10

**Date:** 2026-09-10  
**Author:** qa-supervisor (t_d9c91d8c refine-2; prior t_e3aecb51, t_fbf77e9a)  
**SoT research:** `notes/company/ditl-role-research.md`  
**CEO gate parent:** t_7ebea568  
**Cases:** CEO APPROVED 2026-09-10 — QA Engineer **not** staffed until Chuck says so.

---

## CEO APPROVAL BLOCK

```
CEO STAMP (Chuck) — DITL test plans
Status:    APPROVED
Date:      2026-09-10
Notes:     REFINE-2 pack (21 plans). PM SCOPE STAMP APPROVED same day.
           Artifact research t_e04d5c84 unblocked after this stamp.
           QE/cases: wait for explicit CEO ask (not auto-staffed).
Do not:    staff Engineering; invent features; treat NOT IN PRODUCT as fail steps.
```

## PM SCOPE STAMP (product-manager)

```
PM STAMP — DITL test-plan scope (plans only; t_06e8e745 → parent t_7ebea568)
Status:    APPROVED
Date:      2026-09-10
Reviewer:  product-manager
Pack:      notes/company/ditl-testplans.md + notes/company/ditl-plans/*.md (21 plans)
QAS:       refine-2 t_d9c91d8c done before stamp
Research:  t_e04d5c84 stays blocked until CEO also APPROVES this parent
QE/cases:  do not staff until CEO APPROVE
Quality:   role coverage OK; dual-path UI+Ask OK; teardown all 21 + global contract OK;
           F-ARTIFACTS HW/typed/mixed multi-subject + DB assert OK; T-05/O-07 student-card OK;
           PARTIAL/GAP honest (no invented chrome/tools/tables). Matcher spoken-name law OK.
Non-block: OPEN ISSUES 1–13 remain CEO/product truth; T-05 depends on shipped student_card
           (ui-design §14.2 D) — if build lacks extract, QE fails PARTIAL per issue 12.
Do not:    unblock Research; staff QE; invent fixtures beyond F-ARTIFACTS; invent Ask tools.
```

---

## How to read this pack

- **Plans only** — ordered beats + surfaces + tags. No T-xx case scripts.
- **Dual path (mandatory):** every in-app activity has **(A) Chrome UI** and **(B) Ask** (`/ask`, role-correct tools). Physical-only beats (camera capture, car-ahead photo) stay UI-primary with Ask noted if product allows a related action; else **PHYSICAL-ONLY**.
- If Ask cannot do a UI task yet: mark Ask beat **PARTIAL / GAP** + name the UI surface that works. Do **not** invent Ask tools.
- Beats exercise **SUPPORTED** or **PARTIAL** (gap called out). **NOT IN PRODUCT** lives in Non-goals / OPEN ISSUES — still listed so QE can fail honestly after stamp.
- **Teardown (mandatory on mutating plans):** every plan that writes durable state has **Teardown / cleanup** — what was created, UI + Ask delete paths (GAP if missing), DB leftover check against **data-model tables only**, isolation (`ditl-` / fixture IDs), reverse-create order, idempotent if mid-plan fail. See **Global teardown contract**.
- **Artifacts + DB assert:** ingest plans name fixture IDs from **F-ARTIFACTS** and fields to assert after ingest.
- IQG: hats, chrome entry, lifecycle start+finish+reverse, multiplicity, dual-hat, explicit non-goals, FERPA walls.
- Split files: `notes/company/ditl-plans/<plan-id>.md`. This file is the **index + coverage matrix**.

---

## Plan catalog (IDs)

| Plan ID | Title | Primary hat | Day shape |
|---------|-------|-------------|-----------|
| DITL-P-01 | Parent AM grades + car line | parent | Morning drop-off |
| DITL-P-02 | Parent PM homework Ask + message | parent | Evening help |
| DITL-P-03 | Parent Ride multi-child multi-car | parent | Staggered lines / vehicles |
| DITL-T-01 | Teacher Capture morning (+ Pack B phone Approve) | teacher | Phone capture + keyed Pack B Approve |
| DITL-T-02 | Teacher Grade and Assign (web) | teacher | Afternoon desk (web Approve; phone Approve allowed on T-01) |
| DITL-T-03 | Teacher Messages + Needs | teacher | Comms + inbox |
| DITL-T-04 | Teacher academic day (author+grade+comms) | teacher | Full authoring day |
| DITL-T-05 | Handwritten student data card → existing student | teacher | Capture student_card |
| DITL-S-01 | Student assignments submit | student | Class + home practice |
| DITL-S-02 | Student grades Diary Ask | student | Progress + journal |
| DITL-S-03 | Student messages + focus | student | Comms + focus work |
| DITL-DH-01 | Dual-hat Teacher+Parent mixed day | teacher→parent | AM teach (+ Pack B Approve) / PM family (no Approve) |
| DITL-DH-02 | Dual-hat Office+Parent | office→parent | Desk then family Ride |
| DITL-O-01 | Office People/Manage (partial) | administrator | Supported office only |
| DITL-O-02 | Roster + family link + bio + class | administrator/superintendent | People CRUD day |
| DITL-O-03 | Remove + archive history preserve | administrator/superintendent | Detach / deactivate |
| DITL-O-04 | Banned pickup / messy divorce | administrator/superintendent | Restriction + notify |
| DITL-O-05 | Class + teacher assignment lifecycle | administrator/superintendent | Class staff day |
| DITL-O-06 | Alerts + school feed | administrator/superintendent | Comms blast |
| DITL-O-07 | Office bio attach existing student (card fields) | administrator/superintendent | People Details bio |
| DITL-X-01 | Author Studio pack emit | author (studio) | Studio-only day |

**Count:** 21 plans (kept prior 19 + T-05 + O-07).

---

## Role coverage / exclusions

| Role | Plans | Exclusion reason if none |
|------|-------|--------------------------|
| Parent | P-01, P-02, P-03 | — |
| Teacher | T-01, T-02, T-03, T-04, T-05 | — |
| Student | S-01, S-02, S-03 | — |
| Dual-hat | DH-01, DH-02 | superintendent+teacher multi-school day NOT IN PRODUCT |
| Administrator/office | O-01..O-07 | Attendance/SIS/reports NOT IN PRODUCT |
| Superintendent | O-01..O-07 (super-only beats called out) | Multi-school district dashboard NOT IN PRODUCT (mvp L13). Same plans run under both office hats where both can act. |
| Author studio | X-01 | Separate repo; not class-app daily role |

**Superintendent vs Office:** Where both can act (people link, restrict, create class, feed/alert, bio update), plans run once as administrator and once as superintendent. Super-only: school name/logo (`school.identity`), Ride day photo archive (`ride.archive`), capability matrix edit (`school.matrix`).

---

## Dual-path law (all class-app plans)

| Path | Meaning |
|------|---------|
| **UI** | Named tray tab / hamburger / route / control (chrome SoT `docs/ui-design.md`, `trayTabs.ts`) |
| **Ask** | Same actor + outcome from `/ask` using **listed** tools in `askToolPolicy.ts` / `askTools.ts` only |
| **PARTIAL / GAP** | Ask cannot perform UI task yet — record tool missing; keep UI beat |
| **PHYSICAL-ONLY** | Requires camera/mic hardware path; Ask may only navigate or post-process if tool exists |
| **NOT IN PRODUCT** | CEO story beat retained as plan expectation; QE fails honestly; do not invent tables |

Confirm/undo: if product shows ConfirmSheet / destructive “cannot be undone”, both UI and Ask paths must exercise that gate (Ask may return confirm proposal before write).

---

## Global teardown contract (refine-2)

Shared rules so QE can later implement one cleanup harness:

1. **Scope:** only rows/files/assets/events **this run created or mutated**, tagged `ditl-` in titles/bodies/QE log or recorded fixture IDs. Never school-wide wipe of seed the plan did not create.
2. **Every mutating plan** ends with section **Teardown / cleanup** listing: created objects → UI delete/archive → Ask delete (or **GAP**) → DB leftover check naming **data-model** tables/RPCs only.
3. **Order:** reverse of create (examples: unlink before delete person; leave Ride before delete vehicle; unban before delete parent; unpublish syllabus before delete class; revert metadata before delete student).
4. **Idempotent:** safe if a beat failed mid-plan (skip missing; no error storms).
5. **Destructive plans (O-03):** teardown is often **re-seed**, not undo.
6. **Studio (X-01):** filesystem emit dirs only; no class-app DB.
7. **Harness hooks (future QE):** collect `created[]` during run; call plan teardown; assert empty leftover query per plan checklist.
8. **Ask gaps:** missing delete/leave/restrict/feed-create tools stay PARTIAL/GAP — UI cleanup still required.

---

## Shared fixtures (class-app)

| Fixture ID | Contents |
|------------|----------|
| F-SCHOOL | One school; logo optional; feed icon set |
| F-TEACHER-A | Teacher A; class Math; roster ≥5 including near-duplicate names |
| F-TEACHER-B | Teacher B; other class; dual-hat child not in own class |
| F-TEACHER-C | Extra teacher for reassignment / delete-from-school beats |
| F-STUDENTS | S1…S5 enrolled; S1–S2 twins |
| F-PARENT-1 | Parent linked to S1+S2; two vehicles; messaging to Teacher A |
| F-PARENT-2 | Second parent on S1 (allowed pickup); used with ban on F-PARENT-1 |
| F-DRAFTS | Captures: matched draft gaps + one Unassigned |
| F-ASSIGN | Approved gap + assigned practice on S1; one submission ready |
| F-AVG | Syllabus draft/published sum=100 on Math; publish_to_family on |
| F-QUIZ | Quiz-category assignment + answer-key photo fixture |
| F-FOCUS | Student with current_focus_skill + focus practice set assigned |
| F-RIDE | Two lines A/B; duty staff; vehicles; pickup_restrictions empty |
| F-OFFICE | Administrator + superintendent logins; people/link rights |
| F-DH-TP | Teacher A also parent_id→S3 in Teacher B class |
| F-DH-OP | Administrator also parent_id→S1 |
| F-STUDENT-LOGIN | Student logins S1 (and S2) |
| F-DIARY | Diary enabled `/diary` |
| F-FEED | School + class feed composers available to office/teacher |
| F-AUTHOR | kelyra-author deck sample for X-01 |
| F-GRADES-HIST | Prior approved grades + submissions for archive-preservation checks |
| F-ARTIFACTS | See catalog below — mixed handwritten/typed multi-subject work + student card |

Auth: real school logins (no anon parent token for Ride). Network on. Phone + web viewports for teacher split (M10).

---

## F-ARTIFACTS catalog (refine-2)

Physical/print fixtures for ingest + DB accuracy. Formats: **HW** = handwritten photo, **TYPED** = typed/print photo, **MIXED** = both on page. Subjects span English, math, science, history, Bible (+ art optional if class list allows).

| Artifact ID | Work type | Subject | Format | Used by | Primary DB assert targets |
|-------------|-----------|---------|--------|---------|---------------------------|
| F-ART-HW-MATH-HW | homework page | math | HW | T-01 | `captures.student_id` (spoken match), `photo_asset_id`, status |
| F-ART-HW-ENG-TYPED | homework page | English | TYPED | T-01 Unassigned | `captures.student_id` null |
| F-ART-HW-HIST-HW | homework / assign source | history | HW | T-04 | `assignments.title/subject/category` |
| F-ART-QUIZ-BIBLE-TYPED | quiz | Bible | TYPED | T-04 | assignment category=quiz |
| F-ART-QUIZ-SCI-HW | quiz | science | HW | T-04 alt | category=quiz |
| F-ART-KEY-MATH-MIXED | answer key | math | MIXED | T-04 | key ↔ `assignment_id`; asset |
| F-ART-KEY-ENG-TYPED | answer key | English | TYPED | T-04 | key ↔ quiz assignment |
| F-ART-SYL-SCI-TYPED | syllabus weights | science | TYPED | T-04 | published weights sum 100 |
| F-ART-SYL-MATH-HW | syllabus weights | math | HW | T-04 alt | weights sum 100 |
| F-ART-FOCUS-PRACTICE | focus/practice set | math | TYPED/gen | T-04, S-01/S-03 | practice assignment; submission |
| F-ART-CARD-STUDENT-HW | student data card | — | HW | T-05, O-07 | `students.metadata` canonical keys on **existing** id |
|| F-ART-TEST-HIST-TYPED | test | history | TYPED | T-04 optional | assignment category test if product distinguishes |
| F-ART-HW-MATH-ALG-TYPED | homework + key | math (algebra) | TYPED md | T-02, T-04 | `notes/qa-fixtures/math-algebra-homework.md` |
| F-ART-QUIZ-ELA-TYPED | quiz + rubric | English | TYPED md | T-04 | `notes/qa-fixtures/ela-reading-comprehension-quiz.md` |
| F-ART-TEST-SCI-TYPED | test + key | science | TYPED md | T-04 | `notes/qa-fixtures/science-cell-biology-test.md` |
| F-ART-PROJECT-CIVICS-TYPED | project + rubric | social studies | TYPED md | T-04 | `notes/qa-fixtures/social-studies-civics-project.md` |
| F-ART-HW-MUSIC-TYPED | homework + key | elective music | TYPED md | T-04 | `notes/qa-fixtures/elective-music-theory-homework.md` |
| F-ART-STUDY-BIBLE-TYPED | study | Bible | TYPED md | T-04, S-03 | `notes/qa-fixtures/bible-verse-memory-study.md` |

Former **QA-FIX** (`t_687d9499`) 7 CC0/PD markdown samples are now DITL F-ARTIFACTS (this table + `ditl/ditl-pen-README.md`). Do not keep a parallel fixture track.

**Matcher law (mvp):** homework student match uses **spoken name** (+ roster), not required OCR of name off the page. Student **data card** is the named exception for field extraction onto an existing student (ui-design `student_card`).

---

## Coverage matrix (plan ID × function / chrome)

Legend: **P** = primary, **s** = secondary/smoke, **—** = out of plan (not a fail).

| Function / chrome | P01 | P02 | P03 | T01 | T02 | T03 | T04 | T05 | S01 | S02 | S03 | DH1 | DH2 | O01 | O02 | O03 | O04 | O05 | O06 | O07 | X01 |
|-------------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| auth sign-in/out | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | — |
| chrome-parent tray 3 | P | P | P | — | — | — | — | — | — | — | — | P | P | — | — | — | s | — | — | — | — |
| chrome-teacher tray 5 | — | — | — | P | P | P | P | P | — | — | — | P | s | — | — | — | — | — | — | — | — |
| chrome-student tray 6 | — | — | — | — | — | — | — | — | P | P | P | — | — | — | — | — | — | — | — | — | — |
| chrome-office tray 5 | — | — | — | — | — | — | — | — | — | — | — | — | P | P | P | P | P | P | P | P | — |
| seat-switch dual-hat | — | — | — | — | — | — | — | — | — | — | — | P | P | — | — | — | — | — | — | — | — |
| dual-path UI+Ask | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | — |
| teardown / cleanup | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| artifacts HW/typed | — | — | — | P | s | — | P | P | s | — | — | s | — | — | s | — | — | — | — | s | — |
| DB assert after ingest | — | — | — | P | P | — | P | P | s | — | — | — | — | — | P | — | — | — | — | P | — |
| student-card ingest | — | — | — | — | — | — | — | P | — | — | — | — | — | — | s | — | — | — | — | P | — |
| grades family Home | P | s | — | — | — | — | — | — | — | — | — | P | s | — | — | s | — | — | — | — | — |
| grades student book | — | — | — | — | — | — | — | — | s | P | s | — | — | — | — | — | — | — | — | — | — |
| gradebook teacher | — | — | — | — | P | — | P | — | — | — | — | — | — | — | — | s | — | — | — | — | — |
| avg syllabus | s | — | — | — | P | — | P | — | — | s | — | — | — | — | — | — | — | — | — | — | — |
| approve gaps | — | — | — | — | P | — | P | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| assign / quiz / key | — | — | — | — | P | — | P | — | P | — | s | — | — | — | — | — | — | — | — | — | — |
| focus exercise | — | — | — | — | s | — | P | — | s | s | P | — | — | — | — | — | — | — | — | — | — |
| capture / matcher | — | — | — | P | — | — | s | P | — | — | — | s | — | — | — | — | — | — | — | — | — |
| inbox Needs | — | — | — | P | s | P | s | s | — | — | — | — | — | — | — | — | — | — | — | — | — |
| ask | s | P | s | s | s | s | P | s | s | P | P | s | s | s | P | P | P | P | P | P | — |
| messages | — | P | — | — | — | P | P | — | — | — | P | — | — | — | — | — | — | — | — | — | — |
| search | — | — | — | — | — | P | s | — | — | — | — | — | — | — | s | — | — | — | — | s | — |
| ride parent in/leave | P | — | P | — | — | — | — | — | — | — | — | P | P | — | — | — | P | — | — | — | — |
| ride vehicles multi | s | — | P | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| ride staff duty | — | — | — | — | — | — | — | — | — | — | — | — | s | P | — | — | s | — | — | — | — |
| ride pickup-ban | — | — | s | — | — | — | — | — | — | — | — | — | — | — | — | — | P | — | — | — | — |
| diary / ledger | — | — | — | — | — | — | P | — | — | P | — | — | — | — | — | — | — | — | — | — | — |
| student todo/submit | — | — | — | — | — | — | — | — | P | — | P | — | — | — | — | — | — | — | — | — | — |
| feeds class/school | — | — | — | — | — | — | P | — | s | — | — | — | — | s | — | — | — | — | P | — | — |
| alerts | — | — | — | — | — | s | s | — | — | — | — | — | — | — | — | — | s | — | P | — | — |
| people CRUD / bio | — | — | — | — | — | s | — | P | s | — | — | — | s | P | P | P | s | s | — | P | — |
| family link / unlink | — | — | — | — | — | — | — | — | — | — | — | — | — | P | P | P | P | — | — | — | — |
| class-teacher assign | — | — | — | — | — | — | — | — | — | — | — | — | — | s | s | — | — | P | — | — | — |
| remove/archive history | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | P | — | s | — | — | — |
| school identity | — | — | — | — | — | — | — | — | — | — | — | — | — | P | — | — | — | — | — | — | — |
| author pack CLI | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | P |

### Suggested update-rerun selection (for later QE matrix)

| Change area | Prefer plans |
|-------------|--------------|
| Auth / profiles / seats | P-01, DH-01, DH-02, O-01, O-02 |
| Capture / matcher / OCR | T-01, T-05, DH-01 |
| Ingest artifacts / keys / syllabus scan | T-01, T-04, T-05, O-07 |
| Approve / assign / gradebook / quiz / key | T-01 (Pack B phone), T-02 (web), T-04, S-01, DH-01 (Teach-only Approve) |
| AVG / syllabus | T-02, T-04, P-01, S-02 |
| Focus exercise | T-04, S-03, S-01 |
| Ask dual-path | all class-app plans smoke; deep P-02, T-04, O-02, O-07, S-03 |
| Messages | P-02, T-03, T-04, S-03 |
| Ride / ban | P-01, P-03, O-04, DH-01, DH-02 |
| People / archive / bio | O-02, O-03, O-05, O-07, T-05 |
| Alerts / feeds | O-06, T-04, T-03 |
| Diary | S-02, T-04 |
| Student chrome | S-01, S-02, S-03 |
| **Cleanup / teardown bugs** | **all mutating plans** |
| Author manifest | X-01 |
| Full smoke (release) | P-01, T-01 (incl. Pack B Approve when keyed), T-04, T-05, S-01, O-02, DH-01 |

---


---

## KEYGRADE Pack B DITL-UPDATE (2026-09-10, t_21f95d30)

IQG stamp APPROVED on `t_91db8376` chose **Pack B** (contextual inline confirm on Capture review). CEO locks: office+super KEYGRADE OUT v1; super multiplicity N/A; parent M11 unchanged; **phone must Approve in v1**.

| Plan | Update |
|------|--------|
| **DITL-T-01** | Pack B per-item confirm + phone Approve for keyed captures; Unassigned/matcher laws kept; removed “Approve is web-only” non-goal |
| **DITL-T-02** | Web Approve remains; must **not** claim phone Approve is forbidden |
| **DITL-DH-01** | Teach seat may phone-Approve; Parent seat must not |

Do **not** unblock KEYGRADE parent `t_15ae546e`. Do **not** implement KEYGRADE from this index note. Cases not rewritten on this card.

## Global non-goals (do not fail DITL for these)

- Attendance tables/UI, behavior points, ClassDojo rewards, SIS/OneRoster, LMS passback
- Multi-school / district superintendent dashboard
- Auto-publish AI grades; matcher inventing students
- Full car-line poles/GPS/SMS/face; placard-only check-in
- Parent mint of curb `released`
- IEP/504 field extraction; inventing Document AI beyond shipped `student_card` / classify-capture
- Student chat tutor product; points/gems/streaks
- Live phone+web grade cell merge (realtime sync product)
- Treating phone KEYGRADE Approve as forbidden (Pack B / CEO #4 — phone Approve is **in** v1 on T-01; web Approve on T-02 is alternate)
- Office as grade-of-record or syllabus policy owner (`syllabus.manage` teacher only)
- Anon/token parent for Ride
- Inventing soft-delete/archive tables if product is hard-delete (call PARTIAL instead)
- Inventing Ask tools not in `askToolPolicy.ts`
- Treating NOT IN PRODUCT admin reports as pass steps
- Requiring OCR name-off-page for homework matcher (spoken name is mvp)

PARTIAL call-outs stay inside plan non-goals / beat Support column.

---

## OPEN ISSUES (CEO / research — do not invent)

1. **Attendance archive (CEO story 2):** Attendance **NOT IN PRODUCT**. Plan O-03 keeps the beat as PARTIAL/GAP expectation — QE fails honestly; do not invent attendance rows.
2. **“Archived” people/grades remain:** Product delete/unenroll is largely **hard-delete**. Soft “inactive but history retained” is **PARTIAL/GAP** vs CEO wording.
3. **Banned-parent office notification (CEO story 3):** Restriction + fail-closed check-in **SUPPORTED**. Proactive office notify of banned attempt may be **PARTIAL/GAP**. O-04 tags both.
4. **Delete teacher from school (CEO story 4):** `remove_teacher_from_class` SUPPORTED. Whole-school teacher delete may be **PARTIAL**.
5. **Ask create feed/alert:** UI create feed SUPPORTED. Ask has `list_feed` but **no** create tool → O-06/T-04 Ask create = **PARTIAL/GAP**.
6. **Ask pickup restriction:** UI restrict SUPPORTED. No Ask tool → O-04 Ask ban = **PARTIAL/GAP**.
7. **Focus exercise product shape:** Map to practice-on-focus; not invented chrome.
8. **Author studio in class-app device farm?** X-01 studio-only.
9. **Parent full grades book (AVG P-G*):** if still open, P-01/P-02 PARTIAL.
10. **Student Ride:** no student Ride tab — intentional.
11. **FERPA:** banned-parent and archive beats must not leak co-parent data or unpublished grades.
12. **Student-card extraction support:** T-05 relies on shipped `student_card` classify + Details write (ui-design §14.2 D). If a build lacks extract/confirm write, QE fails PARTIAL/GAP honestly — do not invent Document AI. O-07 office photo extract = **GAP** (no office Capture); field attach via Details/`update_student` SUPPORTED.
13. **Teardown Ask gaps:** leave Ride, delete capture, delete message, create/delete feed, set/clear pickup restriction often UI-only — plans already GAP-tag; shared harness must not assume Ask cleanup exists.

---

## Plan files

| ID | Path |
|----|------|
| DITL-P-01 | `notes/company/ditl-plans/DITL-P-01.md` |
| DITL-P-02 | `notes/company/ditl-plans/DITL-P-02.md` |
| DITL-P-03 | `notes/company/ditl-plans/DITL-P-03.md` |
| DITL-T-01 | `notes/company/ditl-plans/DITL-T-01.md` |
| DITL-T-02 | `notes/company/ditl-plans/DITL-T-02.md` |
| DITL-T-03 | `notes/company/ditl-plans/DITL-T-03.md` |
| DITL-T-04 | `notes/company/ditl-plans/DITL-T-04.md` |
| DITL-T-05 | `notes/company/ditl-plans/DITL-T-05.md` |
| DITL-S-01 | `notes/company/ditl-plans/DITL-S-01.md` |
| DITL-S-02 | `notes/company/ditl-plans/DITL-S-02.md` |
| DITL-S-03 | `notes/company/ditl-plans/DITL-S-03.md` |
| DITL-DH-01 | `notes/company/ditl-plans/DITL-DH-01.md` |
| DITL-DH-02 | `notes/company/ditl-plans/DITL-DH-02.md` |
| DITL-O-01 | `notes/company/ditl-plans/DITL-O-01.md` |
| DITL-O-02 | `notes/company/ditl-plans/DITL-O-02.md` |
| DITL-O-03 | `notes/company/ditl-plans/DITL-O-03.md` |
| DITL-O-04 | `notes/company/ditl-plans/DITL-O-04.md` |
| DITL-O-05 | `notes/company/ditl-plans/DITL-O-05.md` |
| DITL-O-06 | `notes/company/ditl-plans/DITL-O-06.md` |
| DITL-O-07 | `notes/company/ditl-plans/DITL-O-07.md` |
| DITL-X-01 | `notes/company/ditl-plans/DITL-X-01.md` |

**Research SoT:** `notes/company/ditl-role-research.md`  
**Chrome SoT:** `docs/ui-design.md` §3 / §14.2 / §31 / `src/lib/chrome/trayTabs.ts`  
**Ask tools SoT:** `src/lib/ai/askToolPolicy.ts`, `askTools.ts`  
**Data model:** `docs/data-model.md` (teardown table names; metadata keys)  
**MVP flows:** `docs/mvp.md` M1–M11  
**Messaging/feed:** `docs/messaging-v1.md`

---

## Handoff

- Refine-2 pack ready for **CEO restamp on t_7ebea568** (APPROVE | REFINE | REJECT).
- Do **not** staff QA Engineer until APPROVE.
- After APPROVE: CoS creates qa-engineer card for cases + per-update rerun matrix using tags + coverage matrix above (include teardown harness).
- Parent card stays sticky blocked until Chuck stamps.

**DITL-UPDATE addendum (t_21f95d30):** T-01 / T-02 / DH-01 plans updated for KEYGRADE Pack B phone Approve. Index catalog + Approve rerun matrix refreshed. No Eng / no parent-epic unblock.
