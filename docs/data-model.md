# Kelyra data model (MVP)

**Date:** 2026-08-16  
**Maps to:** `docs/vision.md`, `docs/mvp.md`, `docs/ui-design.md`  
**Target store:** Postgres (Supabase). UUIDs, `timestamptz`, soft rules below.  
**This pass adds:** student/parent profile photos, a first-class `parents` person, canonical metadata keys with a UI, and honest hard-delete / cascade rules. Implementer writes `supabase/migrations/20260816000000_people_photos_delete.sql` and runs it by hand (no Supabase CLI in this workflow).

Two hard rules:

1. A **student row is allowed to be only a name**. Everything else is optional and arrives later as captures, gaps, photos, metadata, and results.
2. A **capture may exist with `student_id` null**. Unassigned is a first-class state. The matcher never inserts a student. Delete never auto-creates anyone.

Grade book is relational (`assignments` + `submissions`), not JSON. Sparse extras live in `students.metadata` and `parents.metadata` under **canonical keys only** (see Metadata shapes). Nothing is a grade until the teacher Approves.

Teacher-created rows are **hard-deleted** from the UI (no undo, no trash table). Confirm copy must say “This cannot be undone.” Detach (unenroll, unlink, clear a field, remove a photo) is not delete. Sending a capture to Inbox is not delete.

---

## Entity map

```
teacher ──< class ──< enrollment >── student
    │           │                      │
    │           ├──< roster_import     ├── photo_asset ──> assets
    │           ├──< capture ──────────┤
    │           │       │              ├── current_focus_skill ──> skill
    │           │       └──< skill_gap ├──< skill_gap ──> skill
    │           ├──< skill             └──< parent_student >── parent
    │           ├──< practice_set ──< assignment ──< submission
    │           └── class_code                              │
    │                                                       │
    └──< parent ── photo_asset ──> assets                   │
            │                                               │
            ├── metadata (jsonb)                            │
            └──< parent_access (invite token) ──────────────┘
                 (token → parent; children via parent_student)
```

`assignment` is the grade-book column. `submission` is the cell. A homework capture, once Approved, gets one assignment + one submission. A practice set gets one assignment and one submission per assigned student.

A **parent** is a teacher-owned person, not an auth user and not an invite token. The invite (`parent_accesses`) points at the parent. The parent then has zero or more children via `parent_students`. Unlinking a child is not deleting the parent. Deleting a parent does not delete the child.

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
| `name_aliases` * | text[] | no | default `{}`; nicknames for the matcher (“Sammy”). Preferred name from metadata is **also** written here on save |
| `photo_asset_id` | uuid | yes | FK `assets` ON DELETE SET NULL. Profile photo only — never a homework capture unless the teacher explicitly chooses “Use as profile photo” |
| `current_focus_skill_id` | uuid | yes | FK `skills`; set on Approve; cleared when that approved gap is deleted and no other approved gap remains |
| `parent_sentence` | text | yes | last teacher-approved one-liner; parent view |
| `metadata` * | jsonb | no | default `{}`; **canonical keys only** — see Metadata shapes. UI exists (student Details) |
| `created_at` * | timestamptz | no | |
| `created_via` * | enum | no | `voice` \| `photo_list` \| `typed` |

No SIS id, IEP/504 columns, or district grade-book fields. `metadata.grade_or_age` is optional free text, not a SIS grade.

`photo_asset_id` is independent of `captures.photo_asset_id`. Removing the profile photo sets this null and deletes the asset (and its storage object) if nothing else references it. The student row stays.

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

One photographed class list. Suggested names are not students until confirmed. **Live SQL does not have this table yet** — `20260816000000_people_photos_delete.sql` creates it so parked drafts can be deleted.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | FK `classes` ON DELETE CASCADE |
| `photo_asset_id` * | uuid | no | FK `assets` ON DELETE RESTRICT until unref (app deletes the import first) |
| `status` * | enum | no | `pending` \| `confirmed` \| `discarded` |
| `suggestions` * | jsonb | no | `[{name, confidence, selected, already_enrolled}]` |
| `created_at` * | timestamptz | no | |
| `confirmed_at` | timestamptz | yes | |

Confirm writes `students` + `enrollments` for checked, non-duplicate names. Low-confidence rows start `selected: false`. Teacher **Delete** on a parked card hard-deletes the row (unref the photo). Already-confirmed students stay.

### `assets`

Binary blobs in object storage. Homework captures, roster list photos, and **profile photos** (student and parent) all point here. Same private `photos` / `audio` buckets. Path stays `{teacher_id}/{timestamp}-{rand}.{ext}` — teacher-owned. Do not put profile photos in a public bucket.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `teacher_id` * | uuid | no | |
| `kind` * | enum | no | `photo` \| `audio` |
| `storage_path` * | text | no | |
| `mime_type` | text | yes | |
| `byte_size` | int | yes | |
| `created_at` * | timestamptz | no | |

An asset may be referenced by a capture, a roster import, a student profile, and/or a parent profile. Delete the storage object + `assets` row only when **no remaining FK** points at it (see Delete / cascade). Never reuse a homework capture as a profile photo unless the teacher taps “Use as profile photo” (then `photo_asset_id` points at that same asset; deleting the capture later must **not** delete a still-referenced profile asset).

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

**Delete** of a capture is a different verb. Hard-delete the row (gaps cascade). Do not leave it in Inbox. See Delete / cascade.

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

Deleting a gap (draft or approved) hard-deletes the `skill_gaps` row. If that gap’s `skill_id` is the student’s `current_focus_skill_id`, retarget focus to the next remaining **approved** gap for that student (lowest `sort_order`, then newest `created_at`); if none remain, set `current_focus_skill_id` null. Do not delete the `skills` row (other students / practice sets may still use it). Dismissed gaps are already unused for focus; deleting one is just a row delete.

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

A grade-book **column**. Teachers may **plan** one before any capture. Capture files into an existing column or creates a one-off on Approve.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `class_id` * | uuid | no | |
| `title` * | text | no | “HW #17 Long Division Practice 3”, “6.1 Unit Test” |
| `kind` * | enum | no | `planned` \| `capture` \| `practice` |
| `category` | text | no | default `homework`. quiz, test, midterm, final, project, presentation, participation, behavior, other |
| `capture_id` | uuid | yes | last capture filed into this column (optional) |
| `practice_set_id` | uuid | yes | when `kind = practice` |
| `due_at` | timestamptz | yes | |
| `max_score` | numeric | yes | optional |
| `weight_band` | text | no | `none` \| `daily` \| `major` \| `custom` |
| `weight_percent` | numeric | yes | used when `custom` (e.g. 15) |
| `term` | text | no | `none` \| `q1`–`q4` \| `semester` \| `year` |
| `score_scheme` | text | no | `numeric` \| `pass_fail` \| `either` |
| `include_in_average` | bool | no | default true; Pass/Fail is never averaged as a number |
| `key_kind` | text | no | `none` \| `photo` \| `items` \| `both`. Default `none` |
| `key_notes` | text | yes | Teacher rubric one-liner |
| `key_pass_at` | numeric | yes | Pass/Fail bar |
| `key_items` | jsonb | no | `[{n, stem, answer, points, needsTeacher, note}]` |
| `key_asset_id` | uuid | yes | FK `assets` — blank or filled key photo |
| `key_phash` | text | yes | Print perceptual hash for match |
| `key_layout` | jsonb | yes | 8×8 print-density grid |
| `key_header` | text | yes | Printed title / first line |
| `key_blank_map` | jsonb | yes | Optional blank rectangles |
| `key_ready_at` | timestamptz | yes | Signature built |
| `unit` | text | yes | Optional grade-book group (e.g. Fractions) |
| `section` | text | yes | Optional group under a unit (e.g. 6.1 Adding) |
| `created_at` * | timestamptz | no | |

Creating a planned assignment seeds one `submissions` row per roster student at `assigned` so the column appears immediately.

`captures.assignment_id` (nullable FK) is how a photo/voice files into a planned column. Approve updates that student’s cell; it does not invent a second column.

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

### `parents`

First-class person the teacher creates. Not an auth user. Not a token. Teacher-owned, same as students.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `teacher_id` * | uuid | no | owner; RLS |
| `display_name` * | text | no | “Amina Chen” / “Jamal’s dad” |
| `sort_name` | text | yes | default from display_name |
| `photo_asset_id` | uuid | yes | FK `assets` ON DELETE SET NULL |
| `metadata` * | jsonb | no | default `{}`; canonical keys only |
| `created_at` * | timestamptz | no | |
| `created_via` * | enum | no | `typed` \| `photo_card` \| `voice` — new enum `parent_created_via` |

No login account. The existing invite token is how they open `/parent`. Do not add `parents` to Auth.

### `parent_students`

Which children this parent may see. Unlink deletes this row only.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `parent_id` * | uuid | no | FK `parents` ON DELETE CASCADE |
| `student_id` * | uuid | no | FK `students` ON DELETE CASCADE |
| `created_at` * | timestamptz | no | |

Unique `(parent_id, student_id)`. A parent may have many children; a student may have many parents. Link / unlink never inserts a student. Deleting a student cascades this row (the parent record stays). Deleting a parent cascades this row (the student stays).

### `parent_accesses`

Invite token that opens the parent progress view. **Now points at a parent**, who then has children via `parent_students`.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` * | uuid | no | PK |
| `parent_id` * | uuid | no | FK `parents` ON DELETE CASCADE. Required after backfill |
| `student_id` | uuid | yes | **legacy / optional hint** of which child the teacher was looking at when they copied the link. Not the access scope. FK `students` ON DELETE SET NULL |
| `token` * | text | no | unique plaintext token (matches live `20260813000001_parent_access.sql`; do not rename to a hash in this pass) |
| `email` | text | yes | after they redeem, if we ever collect it |
| `accepted_at` | timestamptz | yes | |
| `created_at` * | timestamptz | no | |

**Backfill (in the same migration):** for every existing `parent_accesses` row, insert a `parents` row (`teacher_id` from the student, `display_name` = `'Parent of ' || students.display_name`, `created_via` = `typed`), insert `parent_students (parent_id, student_id)`, then set `parent_accesses.parent_id`. Then `ALTER parent_accesses.parent_id SET NOT NULL` and drop the old “token → one student” mental model.

**`parent_open(p_token)`** (replace the current function) returns one parent + every linked child that still exists:

```
parent_id, parent_display_name, parent_photo_path,
children: [{
  student_id, display_name, preferred_name, photo_path,
  birthday_md,          -- 'Aug 12' or null; never the year
  class_name, focus_label, practice_status, parent_sentence
}]
```

Never returns scores, homework photos, drafts, allergies, emergency contacts, teacher notes, addresses, or other families. Photo paths are storage paths; the client (or a tiny Edge helper) mints a short-lived signed URL only for those paths after the token checks out. Do not make the `photos` bucket public.

Revoking an invite deletes the `parent_accesses` row. The parent record stays. Creating a new invite inserts a new token on the same parent.

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
| student | parent | N:N | `parent_students`; unlink ≠ delete |
| teacher | parent | 1:N | owner |
| parent | asset | N:1 | profile photo |
| student | asset | N:1 | profile photo |
| parent | parent_access | 1:N | invite tokens |

---

## Metadata shapes (canonical keys)

The app **must not invent keys**. Classifier fields that do not map to a key below are appended to `notes` (or `allergies` only if the teacher explicitly files them there). Missing key = empty UI (“Add phone”), never the string `"null"`. Clear a field by **deleting the key** from the object (or setting it to JSON `null`); do not store `""` as a sentinel.

Preserve unknown keys the teacher did not edit (e.g. existing `focusLog` used by `closeFocusSkill`). The Details UI only reads/writes the keys listed here.

### `students.metadata`

| Key | JSON type | Example | Matcher? | Teacher UI | Parent `/parent` | Student `/todo` |
|---|---|---|---|---|---|---|
| `preferred_name` | string | `"Sammy"` | **Yes** — on save, upsert into `name_aliases` if not already present | Details | Child’s preferred name if set, else `display_name` | Own name only (display / preferred). Never classmates’ legal names beyond first name |
| `birthday` | string `YYYY-MM-DD` | `"2017-03-14"` | no | Details, date-friendly field | **Month + day only** (`Mar 14`), that parent’s child only. Omit if unset. Never the year | no |
| `grade_or_age` | string | `"3rd"` / `"8"` | no | Details | no | no |
| `phone` | string | `"555-0100"` | no | Details | no | no |
| `email` | string | `"maya@…"` | no | Details | no | no |
| `address` | string | multiline | no | Details, multiline | no | no |
| `emergency_name` | string | `"Amina Chen"` | no | Details | no | no |
| `emergency_phone` | string | `"555-0199"` | no | Details | no | no |
| `allergies` | string | `"Peanuts"` | no | Details. **Teacher-only** | **never** | **never** |
| `notes` | string | free text | no | Details. **Teacher-only** | **never** | **never** |
| `focusLog` | array | existing skill-history log | no | not a Details field (skill history already renders it) | no | no |

No other student keys. No IEP/504, SIS id, pronouns-as-a-required-enum, or bus number.

### `parents.metadata`

| Key | JSON type | Example | Teacher UI | Parent `/parent` |
|---|---|---|---|---|
| `relationship` | string enum | `"mother"` \| `"father"` \| `"guardian"` \| `"other"` | Details, plus free text when `other` | Own relationship label only |
| `relationship_other` | string | `"Stepdad"` | shown when relationship is `other` | same |
| `phone` | string | | Details | Own phone (they already know it). Default **show** |
| `email` | string | | Details | Own email. Default **show** |
| `address` | string | multiline | Details | Own address. Default **show** |
| `preferred_contact` | string enum | `"call"` \| `"text"` \| `"email"` | Details | Own preference. Default **show** |
| `notes` | string | | Details. **Teacher-only** | **never** |

Parent never sees another family’s anything. Parent never sees student `allergies`, `notes`, `phone`, `email`, `address`, `emergency_*`, or `grade_or_age`.

---

## How incomplete / incremental data works

| What arrives | What is written | What stays empty |
|---|---|---|
| Teacher creates class | `classes.name` | no students |
| “Add Maya Chen” (confirmed) | `students.display_name` + `enrollments` | focus, sentence, metadata `{}`, photo, captures |
| Photo of list, 3 names confirmed | 3 students + enrollments | same |
| Homework photo, no speech | `captures` with `student_id` null, `status = unassigned` | no gaps, no assignment |
| Speech names Mateo | `student_id` set, `status = attached` then `draft` | scores unpublished |
| Teacher Approves | `skill_gaps.status`, `students.current_focus_skill_id`, assignment + approved submission | practice set still absent |
| Teacher Assigns practice | `practice_sets`, assignment, submission `assigned` | `answers`, scores |
| Student submits | `answers`, `submitted_at` | `approved_score` until teacher Approves |
| Add parent “Amina” | `parents.display_name` | photo, metadata, children, invite |
| Link Amina → Maya | `parent_students` | invite still optional |
| Create parent link | `parent_accesses` with `parent_id` | email / accepted_at |
| Set student photo | `assets` + `students.photo_asset_id` | — |
| Clear a metadata field | delete that key from jsonb | other keys stay |
| Delete homework | hard-delete `captures` (gaps cascade) | student stays; Inbox does **not** receive it |

**Do not** use placeholders like `"TBD"` or empty-string required fields. Use SQL `NULL`. `metadata` starts as `{}`. Empty UI is “Add phone”, not `null`.

**Publication** is status, not a second copy of the row. Student/parent queries filter `captures.status = approved` and `submissions.status in (assigned, submitted, approved)` as appropriate. Drafts are teacher-only.

**Matcher** updates `guessed_student_id` + `match_confidence`. Filing updates `student_id`. Those are different columns so a high-confidence guess can be shown as a chip without committing until the teacher lets it stand (or taps another name).

---

## What comes from photos vs voice vs manual

| Data | Photo | Voice | Manual (type / tap) |
|---|---|---|---|
| Class name | — | transcript → `classes.name` | name field |
| New student name | roster list → `suggestions[].name` then confirm | “Add Maya Chen” → confirm card | add-student field |
| Nickname / alias | — | later from speech if teacher confirms | `name_aliases` and/or `metadata.preferred_name` |
| Student / parent profile photo | new `assets` row + `photo_asset_id`. Header-camera **portrait** proposes; teacher confirms. Homework capture is **not** copied unless “Use as profile photo” | — | Photo pill / library |
| Parent name | contact-card classifier → confirm | “Add parent Amina Chen” → confirm | Add-parent field |
| Parent / student metadata fields | contact or emergency card → proposed keys, teacher checks each | — | Details edit sheet |
| Homework image | `assets` + `captures.photo_asset_id` | — | — |
| Spoken name on work | — | transcript + matcher → `guessed_student_id` | pick from roster / Unassigned |
| Observation text | — | `transcript`, optional `teacher_note` | typed note (S1) |
| Skill gap labels | model reads the **photo** after student is attached | optional hint in transcript (“still lining up place value”) | teacher edits label before Approve |
| Draft score | model from photo | — | teacher edits score |
| Parent sentence | — | can be drafted from transcript | teacher edits on Approve |
| Practice items | photo used as **context** only | teacher_prompt | Assign / Regenerate / Discard |
| Practice answers | — | — | student UI → `submissions.answers` |
| Approved score | — | — | teacher Approve |
| Parent email | contact card (proposed) | — | Details, or after invite redeem |
| IEP / 504 fields | **not extracted** | — | not in schema |

If a teacher photographs an IEP, force the note-only path: store a `capture` with **no analysis** and copy `This looks private. It will be saved as a note only — we will not extract a form.` Do not invent IEP columns in `metadata`. Unrecognized printed fields append to `metadata.notes` after the teacher checks them.

---

## Suggested Postgres notes

```text
enrollments      UNIQUE (class_id, student_id)
skills           UNIQUE (class_id, normalized_label)
submissions      UNIQUE (assignment_id, student_id)
classes          UNIQUE (join_code)
parent_students  UNIQUE (parent_id, student_id)
parent_accesses  UNIQUE (token)

INDEX captures (class_id, status)
INDEX captures (student_id, created_at)
INDEX submissions (student_id, status)
INDEX students USING GIN (metadata)
INDEX parents USING GIN (metadata)
INDEX parents (teacher_id)
INDEX parent_students (student_id)
INDEX parent_accesses (parent_id)
```

`roster_imports` is specified above and still missing from live SQL (`20260812000000` said it was out of slice 01). This pass’s migration **creates it** so parked list-photos can be deleted. Status enum: `pending` | `confirmed` | `discarded`.

Live `parent_accesses.token` stays `token text unique` (not a hash). Do not break existing `/parent?t=` links.

---

## Delete / cascade (SQL rules)

No trash table. No undo. App-layer confirms are in `docs/ui-design.md` §20. The migration must make the **database** match this table so a teacher delete cannot leave grade-book cells, parent links, or photos the teacher thinks are gone.

Matcher rule unchanged: none of these paths insert a student.

Write **security-definer RPCs** the teacher client calls (so multi-table work is one transaction). Suggested names: `teacher_delete_class`, `teacher_delete_student`, `teacher_remove_enrollment`, `teacher_delete_capture`, `teacher_delete_gap`, `teacher_delete_practice_set`, `teacher_delete_assignment`, `teacher_delete_submission`, `teacher_delete_parent`, `teacher_unlink_child`, `teacher_revoke_invite`, `teacher_clear_profile_photo`, `teacher_delete_roster_import`. Each checks `auth.uid()` owns the row.

### Orphaned assets

Helper used by every photo/audio delete:

```
unref(asset_id) =
  not exists capture.photo_asset_id
  and not exists capture.audio_asset_id
  and not exists students.photo_asset_id
  and not exists parents.photo_asset_id
  and not exists roster_imports.photo_asset_id
```

If unref: `storage.objects` delete on that `storage_path`, then `DELETE FROM assets`. If still referenced (e.g. homework also set as profile): leave the asset.

### Object → SQL

| Object | Verb | SQL |
|---|---|---|
| **Class** | Hard-delete the class | 1. List enrollments. 2. For each student whose **only** enrollment is this class: call student-delete (below). 3. For each student also enrolled elsewhere: delete **this** enrollment only; hard-delete this class’s captures for them (not their other-class work); delete this class’s submissions (assignments of this class cascade in a moment); if `current_focus_skill_id` points at a skill of **this** class, set it null. 4. `DELETE FROM classes WHERE id = ?` — existing FKs then cascade: remaining enrollments, skills, captures (unassigned inbox included), skill_gaps (via captures), practice_sets, assignments, submissions, roster_imports. 5. `teachers.active_class_id` already `ON DELETE SET NULL`. 6. Parents are **teacher-owned**, not class-owned: do not delete parent rows. `parent_students` for students deleted in step 2 cascade with those students. Orphan parents (zero remaining children) stay; teacher deletes them separately. |
| **Student** | Hard-delete the person | 1. Hard-delete **all** of their captures (every class) via capture-delete so photos the teacher thinks are gone actually go (do **not** rely on `captures.student_id ON DELETE SET NULL` — that would park work in Inbox). 2. `guessed_student_id` on *other* people’s captures: `ON DELETE SET NULL` is enough. 3. `DELETE FROM students` — cascades enrollments, skill_gaps (`student_id`), submissions, `parent_students`. 4. `parent_accesses.student_id` SET NULL (legacy hint). Invite tokens stay on the parent. 5. Clear/delete `photo_asset_id` via unref helper. 6. Assignments (columns) stay if other students still have cells; if an assignment now has **zero** submissions, delete that assignment (empty grade-book column). Capture-kind assignments whose capture was already deleted: delete if no submissions remain. |
| **Enrollment** | Detach from one class | If this is the student’s last class: **refuse** and tell the UI to offer student-delete instead (do not leave a student with zero enrollments unless we are mid student-delete). Else: `DELETE` that enrollment; capture-delete every capture with `(class_id, student_id)`; delete submissions whose assignment is in this class; if focus skill belongs to this class, set `current_focus_skill_id` null. Student row, photo, metadata, parents, other-class work stay. |
| **Capture / homework / voice / multi-page** | Hard-delete | `DELETE FROM captures` — `skill_gaps` CASCADE. `assignments.capture_id` is currently `ON DELETE SET NULL`: after delete, if that assignment has no remaining purpose (kind = `capture` and capture gone), `DELETE` the assignment (submissions cascade). `practice_sets.source_capture_id` SET NULL. Then unref photo + audio assets. If an approved gap on this capture held the student’s focus, retarget or clear focus (same rule as gap-delete). **Not** Inbox. |
| **Skill gap** (draft, approved, or dismissed) | Hard-delete the row | `DELETE FROM skill_gaps WHERE id = ?`. If it was the focus: retarget to the next remaining approved gap for that student, else `current_focus_skill_id = null`. Do not delete `skills`. Do not un-approve the capture. Do not delete the grade-book cell. |
| **Practice set** | Hard-delete | Delete assignments with `practice_set_id` first (submissions cascade), then `DELETE` the set. Do not delete the source capture. |
| **Assignment** (grade-book column) | Hard-delete | `DELETE FROM assignments` — submissions CASCADE. Capture stays (`assignments.capture_id` was the only link). Practice set: if no assignments remain, `status = discarded` or delete the set if `preview`/`discarded`. |
| **Submission** (one cell) | Hard-delete | `DELETE` that submission. If it was the last cell on the assignment, delete the assignment too (column disappears). Student to-do loses that set. |
| **Parent** | Hard-delete the person | `DELETE FROM parents` — `parent_students` CASCADE, `parent_accesses` CASCADE. Students stay. Unref profile photo. |
| **Parent ↔ child link** | Detach | `DELETE FROM parent_students`. Not a person delete. Invite tokens stay. Parent with zero children stays. |
| **Invite link** | Revoke | `DELETE FROM parent_accesses WHERE id = ?`. Parent stays. |
| **Profile photo** | Detach + maybe delete asset | `UPDATE students/parents SET photo_asset_id = null`. Unref helper. Person stays. |
| **Metadata field** | Clear | `jsonb - key` (or set null). No row delete. Preserve `focusLog` and every other key. |
| **Roster-import draft** | Hard-delete | `DELETE FROM roster_imports`. Unref its photo. Already-confirmed students from an earlier import are untouched. `discarded` is an allowed status if the UI parks then later deletes. |

Existing live FKs that **conflict** with “teacher thinks it’s gone” and what the migration must do:

| Live FK | Today | This pass |
|---|---|---|
| `captures.student_id` | `ON DELETE SET NULL` | **Keep the FK** (inbox still needs nullable student). Student-delete RPC must delete that student’s captures **first** so SET NULL never creates surprise Inbox rows. |
| `captures.guessed_student_id` | `ON DELETE SET NULL` | Keep. |
| `assignments.capture_id` | `ON DELETE SET NULL` | Keep, then RPC deletes orphan capture-kind assignments. |
| `assignments.practice_set_id` | `ON DELETE SET NULL` | Practice-set RPC deletes assignments first (so cells do not linger with a null set). |
| `students.photo_asset_id` (new) | — | `ON DELETE SET NULL` |
| `parents.photo_asset_id` (new) | — | `ON DELETE SET NULL` |
| `parent_accesses.parent_id` (new) | — | `ON DELETE CASCADE` |
| `parent_accesses.student_id` | `ON DELETE CASCADE` | Change to `ON DELETE SET NULL` (token now lives on the parent). |
| `parent_students.*` | — | both sides `ON DELETE CASCADE` |

Student/parent roles **cannot** call these RPCs. `student_submit` / `student_open_class` stay read-or-submit-own. Parent token stays read-only via `parent_open`. Student **Leave class** only clears the device session; it does not unenroll. Parent cannot delete a child record.

---

## RLS

Teacher (`auth.uid()` = `teachers.id`):

| Table | Policy |
|---|---|
| `parents` | `teacher_id = auth.uid()` all + check |
| `parent_students` | parent’s `teacher_id = auth.uid()` and student’s `teacher_id = auth.uid()` |
| `parent_accesses` | via `parents.teacher_id` (replace the current via-student-only policy after backfill) |
| `roster_imports` | via `classes.teacher_id` |
| `students` / `assets` / `classes` / … | unchanged teacher-own |

Parent token (anon): **no direct table SELECT**. Only `parent_open(p_token)` (and a signer that only signs `photo_asset_id` of that parent and of linked children). Returned child fields are the public-safe set in Metadata shapes. Teacher-only keys (`allergies`, `notes`, `emergency_*`, student `phone`/`email`/`address`, `grade_or_age`) must not appear in the SQL select list.

Student join-code session: existing `student_*` functions. Extend `student_open_class` (or add `student_list_classmates`) to return classmate `display_name` + profile `storage_path` only — never grades, gaps, notes, metadata. Sign those profile paths the same way as parent photos. Homework assets stay teacher-only.

Storage: existing `photos` / `audio` policies stay teacher-path-prefixed. Do **not** add a public-read policy. Parent/student photo bytes go through short-lived signed URLs minted after token/join-code checks.

---

## Out of the MVP schema

No tables yet for: SIS/`sourcedId`, LMS line-item passback, weighted categories, CSV jobs, SMS, points/streaks, skill-history facts (S4 is still derived from `skill_gaps` + `submissions` + `focusLog`), offline outbox, IEP documents, multi-teacher roles, parent login users beyond the invite token.

Do not add per-student color, story rings, likes, or a public feed.
