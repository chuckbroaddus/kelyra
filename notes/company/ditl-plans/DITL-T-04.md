# DITL-T-04 — Teacher academic day (authoring + grade + comms)

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
| 11 | Diary entries multiple types | SUPPORTED | `/diary` create text + photo + filters if present | `/ask` `draft_diary_entry` then user **Save** (never auto-ledger) |
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
