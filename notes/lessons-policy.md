# Lesson assignment — privilege wall

Fail closed to the same wall as “work on a student in a class I teach.”
User JWT is the actor. Service role is not.

## What is stored

- `assignments.kind = lesson` plus `deck_id` + `lesson_version` (never a URL), and a copied `storage_deck_id` + `beat_start` / `beat_end` window.
- One `submissions` cell per assigned student (`unique (assignment_id, student_id)`).
- Metrics live in `submissions.answers` jsonb (`kind: lesson`). Known keys:
  `state`, `attempt`, `started_at`, `completed_at`, `duration_ms`, `correct`,
  `incorrect`, `marks`, `hints`, `audio_used`, `kinetic_used`, `extras`.
  Anything else the page emits is kept under `extras` (or leftover keys).
  There is no extra table for extras.

## Repeat vs leave

- **Overwrite.** Repeat Open writes the same cell. `attempt` increments on
  complete. The teacher record shows the latest payload.
- **In progress:** leave after the student has moved a beat or attempted an
  item. Status is `started`; `answers.state = in_progress`.
- **Abandoned:** only if the page sends `state=abandoned`. Same cell; status stays `started`.
- **Done:** `state=complete` → `status=completed`. Not a grade until the teacher grades (`graded`).
- Opening the lesson marks **Started**. Teacher preview does not.

## Who may do what

| Action | Actor | Wall |
|---|---|---|
| List catalog | Teacher in `class_teachers` | No `is_staff`, no office dump. `published` is the picker filter; unpublished review packs stay SELECT-able so open/update can copy the window |
| Assign lesson | Insert `assignments` / `submissions` under existing RLS `teaches_class`, **plus** app `assertTaughtClass` (`class_teachers` for `auth.uid()`) | Class A cannot attach to Class B because chrome is active |
| Student open | `student_open_lesson` DEFINER | `my_student_id()` must own that assignment’s cell. Anon revoked |
| Student results | `student_report_lesson` DEFINER | Same student wall. Never another student’s row |
| Teacher read | Existing `submissions_via_class` | Teacher B cannot SELECT Class A |
| Parent | `parent_progress` / `parent_open_mine` | Linked children only; `lesson_status` is Assigned / Started / Completed / Graded, no scores |
| Catalog write | None for authenticated | Seed / admin SQL only |
| `lessons` bucket | No authenticated storage policies | Students never list. Upload is an admin script (service role), out of band |

`student_open_lesson` returns identity + catalog `deck_id`/`version` +
`storage_deck_id` + beat window. It does **not** mint a URL or token. Edge
`student-open-lesson` calls that RPC **with the user JWT**, then signs a ~1h
lesson JWT (`sub`, `aid`, `prefix`, `role`, `exp`). `prefix` is
`{storage_deck_id}/{version}` (shared folder `fom-ch01/v4`), never the
section catalog id. The beat window rides `kelyra.identity` `pack`, not `?section=`.

`lesson-host` has `verify_jwt = false` because `<img>` / `Audio()` cannot send
the user session. It verifies the **lesson** JWT, then reads
`lessons/{storage_deck_id}/{version}/…` with the service role **as infrastructure**,
not as the teacher or student. Stolen URL without the app: the injected bridge
shows “Sign in to Kelyra to open this lesson.” S2 opening S1’s assignment id
hits S2’s own cell (class-wide) or fails closed (S1-only).

Ask tools `assign_lesson` / `open_lesson` / `read_lesson_results` are **not**
in this slice.

## Not used

- `is_staff` to expand access
- `get_parent_card`, `school_*_for_link`, thread-member insert
- New class create on this flow
- Public / unlisted lesson URLs
