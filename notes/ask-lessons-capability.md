# Ask tools: interactive lessons (later)

Status: **HOLD**. UX / Lesson / Ship own the product spec this round. Do not send this to Grok Build. Monday credits.

Human action (when it ships): a teacher assigns a **hosted lesson page**; the student runs it; **results write to that student’s records**.

## Later Ask tools (same permission wall)

| Tool | Seat | Does | Must not |
|---|---|---|---|
| `assign_lesson` | Teacher of that class (`classes.teach` / assignments.manage **own**). Office only if the matrix says school for that capability. | Assign a hosted lesson to roster or named students the JWT can already assign work to. | Ride `is_staff` or `teaches_class` (office = every class). Teacher must never get superintendent/office writes. |
| `open_lesson` | Assigned student (own). Teacher may open a preview of a lesson they can assign. Parent: none unless the lesson spec later allows a parent-safe view. | Return the hosted page URL / in-app href the caller is allowed to open. | Hand a student another student’s lesson. Service-role fetch. |
| `read_lesson_results` | Teacher: own class. Student: **own** results only. Parent: only if parent progress already shows equivalent (no scores if parent RPCs hide scores). Office: school only if gradebook/overview already is. | List completion / item results the JWT can already SELECT. | School-wide dump for a one-class teacher. Drafts to parent. New SECURITY DEFINER wider than the UI. |

Control plane (already decided for Ask):

1. Load `profiles` + grants from `auth.uid()`. Ignore `body.role`.
2. Filter the tool list on the server. Execute as the **user JWT**. No service role.
3. Anticipate (e.g. “this looks like assigning the whole school”) → **ask**, don’t silently escalate.
4. Do **not** add tools that ride `is_staff`.

## Out of scope this round

Approve, deletes, admin logins/hats, matrix edits, `add_thread_member`, PPT-to-practice (not in repo). Lesson **hosting, player, and write path** are UX / Lesson / Ship.

When those land, Ask only wraps the same APIs the screens use.
