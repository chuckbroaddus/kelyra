# Kelyra data model (MVP)

**Date:** 2026-08-12  
**Maps to:** `docs/vision.md`, `docs/mvp.md`  
**Target store:** Postgres (Supabase). UUIDs, `timestamptz`, soft rules below.

Two hard rules:

1. A **student row is allowed to be only a name**. Everything else is optional and arrives later as captures, gaps, and results.
2. A **capture may exist with `student_id` null**. Unassigned is a first-class state. The matcher never inserts a student.

Grade book is relational (`assignments` + `submissions`), not JSON. Sparse student extras live in `students.metadata`.

---

## Entity map

```
teacher ──< class ──< enrollment >── student
                │                      │
                ├──< roster_import     ├── current_focus_skill ──> skill
                ├──< capture ──────────┤
                │       │              ├──< skill_gap ──> skill
                │       │              ├──< parent_access
                │       └──< skill_gap │
                ├──< skill <───────────┘
                ├──< practice_set ──< assignment ──< submission
                └── class_code
```

`assignment` is the grade-book column. `submission` is the cell. A homework capture, once Approved, gets one assignment + one submission. A practice set gets one assignment and one submission per assigned student.

---

## Entities and fields

Nullable columns are how incomplete data is stored. `*` = required on insert.

### `teachers`

The signed-in customer. One auth user.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK, matches auth uid |
| `email` * | text | no | unique |
| `display_name` | text | yes | |
| `active_class_id` | uuid | yes | FK `classes`, last-used class for capture |
| `created_at` * | timestamptz | no | |

### `classes`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `teacher_id` * | uuid | no | FK `teachers` |
| `name` * | text | no | “Room 14 math” — from voice or type |
| `join_code` * | text | no | unique short code for the student class link |
| `created_at` * | timestamptz | no | |
| `name_source` * | enum | no | `voice` \| `typed` |

A teacher may own more than one class; capture always uses `teachers.active_class_id`.

### `students`

Sparse by design. Insert requires a display name and nothing else.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK — stable `studentId` |
| `teacher_id` * | uuid | no | owner; simplifies RLS |
| `display_name` * | text | no | “Maya Chen” / “Jamal W.” |
| `sort_name` | text | yes | for roster order; default from display_name |
| `name_aliases` * | text[] | no | default `{}`; nicknames for the matcher (“Sammy”) |
| `current_focus_skill_id` | uuid | yes | FK `skills`; set on Approve |
| `parent_sentence` | text | yes | last teacher-approved one-liner; parent view |
| `metadata` * | jsonb | no | default `{}`; later extras (contacts, accommodations). **No UI in MVP.** |
| `created_at` * | timestamptz | no | |
| `created_via` * | enum | no | `voice` \| `photo_list` \| `typed` |

No email, SIS id, grade level, or IEP fields in v1.

### `enrollments`

Roster membership. The matcher for a capture runs against students enrolled in that class.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | FK `classes` |
| `student_id` * | uuid | no | FK `students` |
| `created_at` * | timestamptz | no | |

Unique `(class_id, student_id)`.

### `roster_imports`

One photographed class list. Suggested names are not students until confirmed.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | FK `classes` |
| `photo_asset_id` * | uuid | no | FK `assets` |
| `status` * | enum | no | `pending` \| `confirmed` |
| `suggestions` * | jsonb | no | `[{name, confidence, selected, already_enrolled}]` |
| `created_at` * | timestamptz | no | |
| `confirmed_at` | timestamptz | yes | |

Confirm writes `students` + `enrollments` for checked, non-duplicate names. Low-confidence rows start `selected: false`.

### `assets`

Binary blobs in object storage. Captures and roster photos point here.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `teacher_id` * | uuid | no | |
| `kind` * | enum | no | `photo` \| `audio` |
| `storage_path` * | text | no | |
| `mime_type` | text | yes | |
| `byte_size` | int | yes | |
| `created_at` * | timestamptz | no | |

### `captures`

One fragment: a homework photo, a voice note, or both. **This is the incremental record.** It is valid with only a photo and no student.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | FK `classes` |
| `student_id` | uuid | **yes** | null = Unassigned |
| `kind` * | enum | no | `homework` \| `voice_note` |
| `photo_asset_id` | uuid | yes | required if `kind = homework` |
| `audio_asset_id` | uuid | yes | spoken name / observation |
| `transcript` | text | yes | from audio; may be empty |
| `input_source` * | enum | no | `voice` \| `camera` \| `typed` |
| `status` * | enum | no | see status machine below |
| `guessed_student_id` | uuid | yes | matcher suggestion; not the filing |
| `match_confidence` | real | yes | 0–1 |
| `model_draft` | jsonb | yes | raw model JSON; never overwritten by Approve |
| `draft_score` | numeric | yes | |
| `approved_score` | numeric | yes | copied to submission on Approve |
| `teacher_note` | text | yes | Glow/Grow; not student-visible until Approve |
| `parent_sentence` | text | yes | optional one-liner copied to `students.parent_sentence` on Approve |
| `assignment_id` | uuid | yes | set when Approve creates the grade column |
| `created_at` * | timestamptz | no | |
| `attached_at` | timestamptz | yes | when `student_id` was set |
| `approved_at` | timestamptz | yes | |

**`captures.status`**

| Status | Meaning | Student/parent visible? |
|---|---|---|
| `unassigned` | Saved; no `student_id`. No analysis. | no |
| `attached` | Student set. Voice note, or homework waiting for analysis. | no |
| `draft` | Analysis written. Waiting for Approve. | no |
| `approved` | Teacher accepted. Grade cell written. | focus skill + sentence |
| `note_only` | Keep media; no grade, no practice. | no |

Analysis runs only when `kind = homework` and `student_id` is set. Voice notes stay `attached` unless the teacher later asks to analyze.

Sending a capture back to the wrong-kid inbox: set `student_id` null, `status = unassigned`, clear `guessed_student_id` if needed. Do not delete.

### `skills`

Teacher-named skills, scoped to a class. Created when a gap label is first approved or when practice is generated.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | FK `classes` |
| `label` * | text | no | “two-digit regrouping” |
| `normalized_label` * | text | no | lowercase/trimmed for reuse |

Unique `(class_id, normalized_label)`.

### `skill_gaps`

1–3 drafted gaps per homework capture. Separate rows so the teacher can pick the focus skill.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `capture_id` * | uuid | no | FK `captures` |
| `student_id` * | uuid | no | denormalized; always the capture’s student |
| `skill_id` | uuid | yes | null until Approve maps/creates the skill |
| `label` * | text | no | model or teacher text |
| `source` * | enum | no | `model` \| `teacher` |
| `status` * | enum | no | `draft` \| `approved` \| `dismissed` |
| `sort_order` * | int | no | 1–3 |
| `created_at` * | timestamptz | no | |

On Approve: first remaining approved gap (or the one the teacher picked) sets `students.current_focus_skill_id`.

### `practice_sets`

The generated packet. Not assigned until the teacher taps Assign.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | |
| `skill_id` * | uuid | no | FK `skills` |
| `source_capture_id` | uuid | yes | homework used as context |
| `teacher_prompt` | text | yes | “Use the textbook method…” |
| `items` * | jsonb | no | `[{id, prompt, answer_key?}]` — 3–8 items |
| `status` * | enum | no | `preview` \| `assigned` \| `discarded` |
| `created_at` * | timestamptz | no | |

No per-item table in MVP (S3). Regenerating inserts a new `practice_sets` row.

### `assignments`

A grade-book **column**.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | |
| `title` * | text | no | “Exit ticket Aug 12” or “Practice: regrouping” |
| `kind` * | enum | no | `capture` \| `practice` |
| `capture_id` | uuid | yes | when `kind = capture` |
| `practice_set_id` | uuid | yes | when `kind = practice` |
| `due_at` | timestamptz | yes | default tomorrow for practice |
| `max_score` | numeric | yes | optional |
| `created_at` * | timestamptz | no | |

Created on **Approve** (capture) or **Assign** (practice), never on shutter press.

### `submissions`

A grade-book **cell**. One per student per assignment.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `assignment_id` * | uuid | no | FK `assignments` |
| `student_id` * | uuid | no | FK `students` |
| `status` * | enum | no | `assigned` \| `submitted` \| `draft_scored` \| `approved` |
| `answers` | jsonb | yes | student responses for practice |
| `draft_score` | numeric | yes | |
| `approved_score` | numeric | yes | what the teacher grid shows |
| `submitted_at` | timestamptz | yes | locks student edits |
| `approved_at` | timestamptz | yes | |
| `created_at` * | timestamptz | no | |

Unique `(assignment_id, student_id)`.

Capture Approve: insert assignment + one submission with `status = approved` and `approved_score` from the capture.

Practice Assign: insert assignment + one submission per student with `status = assigned`. Student submit → `submitted` (+ optional `draft_scored`). Teacher Approve → `approved`.

### `parent_accesses`

Invite bound to **one student**.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `student_id` * | uuid | no | FK `students` |
| `email` | text | yes | after they redeem |
| `invite_token_hash` * | text | no | |
| `accepted_at` | timestamptz | yes | |
| `created_at` * | timestamptz | no | |

No parent user table beyond auth. Queries for the parent view: that student’s `display_name`, class name, `current_focus_skill_id`, latest practice submission status, `parent_sentence`. Never captures, scores, or other students.

### Student class-link access

No extra table. Student opens `/c/:join_code`, picks `enrollment` in that class. Optional later: `students.claimed_at` / `claimed_user_id` once they have an auth session. MVP can be a signed cookie with `student_id` after they pick their name.

---

## Relationships

| From | To | Cardinality | Rule |
|---|---|---|---|
| teacher | class | 1:N | owner |
| class | enrollment | 1:N | roster |
| student | enrollment | 1:N | MVP usually one class |
| class | roster_import | 1:N | list photos |
| class | capture | 1:N | inbox is `student_id is null` |
| student | capture | 1:N | nullable FK |
| capture | asset | N:1 ×2 | photo, audio |
| capture | skill_gap | 1:N | 1–3 |
| class | skill | 1:N | named skills |
| student | skill | N:1 | current focus |
| skill_gap | skill | N:1 | set on Approve |
| practice_set | skill | N:1 | |
| practice_set | capture | N:1 | context photo |
| practice_set | assignment | 1:N | one set, maybe two students |
| assignment | submission | 1:N | cells |
| student | submission | 1:N | to-do = `status = assigned` |
| student | parent_access | 1:N | invite links |

---

## How incomplete / incremental data works

| What arrives | What is written | What stays empty |
|---|---|---|
| Teacher creates class | `classes.name` | no students |
| “Add Maya Chen” (confirmed) | `students.display_name` + `enrollments` | focus, sentence, metadata, captures |
| Photo of list, 3 names confirmed | 3 students + enrollments | same |
| Homework photo, no speech | `captures` with `student_id` null, `status = unassigned` | no gaps, no assignment |
| Speech names Mateo | `student_id` set, `status = attached` then `draft` | scores unpublished |
| Teacher Approves | `skill_gaps.status`, `students.current_focus_skill_id`, assignment + approved submission | practice set still absent |
| Teacher Assigns practice | `practice_sets`, assignment, submission `assigned` | `answers`, scores |
| Student submits | `answers`, `submitted_at` | `approved_score` until teacher Approves |

**Do not** use placeholders like `"TBD"` or empty-string required fields. Use SQL `NULL`. `metadata` starts as `{}` and is ignored in MVP.

**Publication** is status, not a second copy of the row. Student/parent queries filter `captures.status = approved` and `submissions.status in (assigned, submitted, approved)` as appropriate. Drafts are teacher-only.

**Matcher** updates `guessed_student_id` + `match_confidence`. Filing updates `student_id`. Those are different columns so a high-confidence guess can be shown as a chip without committing until the teacher lets it stand (or taps another name).

---

## What comes from photos vs voice vs manual

| Data | Photo | Voice | Manual (type / tap) |
|---|---|---|---|
| Class name | — | transcript → `classes.name` | name field |
| New student name | roster list → `suggestions[].name` then confirm | “Add Maya Chen” → confirm card | add-student field |
| Nickname / alias | — | later from speech if teacher confirms | `name_aliases` |
| Homework image | `assets` + `captures.photo_asset_id` | — | — |
| Spoken name on work | — | transcript + matcher → `guessed_student_id` | pick from roster / Unassigned |
| Observation text | — | `transcript`, optional `teacher_note` | typed note (S1) |
| Skill gap labels | model reads the **photo** after student is attached | optional hint in transcript (“still lining up place value”) | teacher edits label before Approve |
| Draft score | model from photo | — | teacher edits score |
| Parent sentence | — | can be drafted from transcript | teacher edits on Approve |
| Practice items | photo used as **context** only | teacher_prompt | Assign / Regenerate / Discard |
| Practice answers | — | — | student UI → `submissions.answers` |
| Approved score | — | — | teacher Approve |
| Parent email | — | — | after magic-link redeem |
| IEP / 504 fields | **not extracted** | — | not in schema |

If a teacher photographs an IEP, store it as a `capture` of `kind = homework` (or a future `attachment` kind) with **no analysis**. Do not write IEP fields into `metadata` in MVP.

---

## Suggested Postgres notes

```text
enrollments  UNIQUE (class_id, student_id)
skills       UNIQUE (class_id, normalized_label)
submissions  UNIQUE (assignment_id, student_id)
classes      UNIQUE (join_code)

INDEX captures (class_id, status)          -- inbox
INDEX captures (student_id, created_at)    -- student timeline
INDEX submissions (student_id, status)     -- student to-do
INDEX students USING GIN (metadata)        -- later sparse keys
```

RLS sketch: teacher sees rows where `teacher_id = auth.uid()` (or via `classes.teacher_id`). Student cookie may `select` own `submissions` and own approved focus. Parent token may `select` that one student’s progress columns only.

---

## Out of the MVP schema

No tables yet for: SIS/`sourcedId`, LMS line-item passback, weighted categories, CSV jobs, SMS, points/streaks, skill-history facts (S4 can be derived from `skill_gaps` + `submissions` later), offline outbox, IEP documents, multi-teacher roles.
