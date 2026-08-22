# Messaging + feed v1 — implementation brief

**Date:** 2026-08-18  
**Source:** `deep-research-7` (Partial). Do not invent items that report marked unverified.  
**Status:** v1 implemented. Paste `supabase/migrations/20260818000000_messaging_v1.sql` in the SQL editor before using the new screens.

One busy teacher, **200–300 students**. Capture cheaper than skipping. Matcher never invents a student. Teacher last click / Approve. No model keys in the Expo bundle. FERPA/COPPA. Chrome: Facebook / Instagram / Amazon iPhone; System / Light / Dark; portrait + landscape.

---

## 1. What already exists — do not rebuild

| Piece | Where |
|---|---|
| 1:1 threads | `message_threads`, `message_thread_members`, `messages` |
| List + send + mark read | `src/lib/messages/api.ts` — `listThreads`, `listMessages`, `sendMessage`, `openThread`, `unreadCount`, `markRead` |
| Screens | `/messages`, `/messages/{threadId}` |
| Start from `@handle` | `HandleLink` → thread |
| Directory pick | `/messages` uses `listProfiles()` minus self (still wide) |
| Bubbles | mine `brandSoft` right, theirs `wash` left |
| Mail icon + unread badge | `AppHeader` + `unread_message_count` |
| Bell | `/notifications` — derived Needs you / practice / parent note. **Not** a second messenger |
| Assign after Approve | `assignPractice` — writes practice set + assignment + submission. **Not** a share |
| Parent links | `parent_students` |
| Family letter | copy / `mailto` only. No mail vendor, no SMS |

**Do not rebuild** 1:1 tables, `/messages` routes, HandleLink, or the header mail/bell split.

---

## 2. v1 scope (must ship)

Keep 1:1. Add only:

1. **Named group chats** (every member can send), created only for:
   - staff (super / admin / teachers)
   - parents of **one** child (that child’s teachers + `parent_students`)
   - a **short** selected-parent list (roster multi-select — not the whole class)
2. **Class / school posts** with replies **under the post** (not a new 1:1). Class-wide and school-wide are **posts**, never a 200–300 person chat.
3. **Work card** in a message: assignment or gap/skill practice. Opens in-app. Default-on **Notify parent(s)** of the student(s) involved. Sharing is not Assign and not a grade.
4. **Mute** a thread (and mute a class/school post audience).
5. **Alerts** (cannot-miss) as extra rows on the **existing bell**. No new notifications table for chat.

**Subscribe** in v1 is not a Follow button. Roster + `parent_students` *are* the audience.

---

## 3. Permission rules (not RACI)

### Who may message whom

| From ↓ / To → | Super or admin | Teacher | Parent | Student |
|---|---|---|---|---|
| Super / admin | 1:1 and staff group | 1:1 and staff group | 1:1; class/school-wide = post/alert | No 1:1 in v1 |
| Teacher | 1:1 | 1:1 and staff group | 1:1 or small group (one child or selected parents) | Class **post** only |
| Parent | 1:1 to office | 1:1 to their child’s teachers | **Forbid** | **Forbid** |
| Student | Forbid | Own class teachers only | **Forbid** | **Forbid** |

Directory on New message must follow this table. Today `listProfiles()` minus self is too wide — tighten in v1.

Students never start threads with other students. Parents never start with other parents or other families’ children.

### Who may post / alert

| Actor | School feed | Class feed | Reply under a post | Alert |
|---|---|---|---|---|
| Super / admin | Yes | Yes | Yes | Yes |
| Teacher | No | Own classes | Yes | Own class, sparingly |
| Parent | No | No | Own child’s class posts, after login | No |
| Student | **No** | **No** | **No** (COPPA) | No |

Recipients of a one-way post must not see one another as a group chat.

---

## 4. Screens and routes

Reuse `/messages` and HandleLink. Add the minimum.

| Action | Lives on |
|---|---|
| Open / start 1:1 | `@handle`, People, header mail, `/messages` compose |
| New **group** | `/messages` compose: multi-select, only allowed member sets above |
| Staff group | People multi-select (admin or teacher) |
| Parents of one child | Student page or that child’s parent page — **Message parents** |
| Selected parents | Roster multi-select — **Message these parents** |
| Teacher ↔ class | Class page **Post to class** → **post**, not a group |
| Admin ↔ parents | Feed composer or admin People → **post** or **alert** |
| Admin ↔ staff | People → staff **group chat** |
| Share assignment / practice | Overflow on student page, gap/practice, assignment: **Share in a message** |
| Notify parents of this work | Same share sheet, default-on switch — no second compose |
| Post to school | Super/admin, feed composer |
| Mute | Thread header; post/class audience |
| Alerts | Admin or class overflow; appear on `/notifications` |
| Feed | `/feed` (or Home card that opens it). Story-style, not an X timeline |

**Hard line so the teacher does not keep three inboxes**

- **Message** — 1:1 or small group. Header **mail** + `/messages`.
- **Post** — school/class broadcast. Replies stay under the post. **Feed**.
- **Alert** — urgent. Existing **bell** only.

Chat look: iMessage / Messenger DMs — existing bubbles, `ListRow`, `AvatarTray`. Mute/leave on the thread header.  
Feed look: ClassDojo / Facebook-simple story (photo, short text, file, link card). Same composer as Messages (+ · field · send). Not Slack, not Teams, no channel rail, no @here. Paste `20260819000006_feed_attachments.sql`.

Work share is a themed `Card` (title, student name, assignment or practice, one in-app button). Not a raw URL. Confirm parent-notify with existing `ConfirmSheet` only if turning the default **off**.

---

## 5. Data / RLS

Extend; do not replace 1:1.

**Threads**

- `message_threads.kind`: `direct` \| `group`
- `message_threads.title` (group name)
- `message_threads.muted` is **per member** — add `message_thread_members.muted_at`
- Members already support N people; `openThread` today assumes exactly two. Add `openGroupThread` that inserts N members and refuses a class-sized roster (cap groups well below 200 — product default: parents of one child, or a short pick list).
- `messages.payload` jsonb nullable: `{ type: 'work_card', assignment_id?, practice_set_id?, student_id, notify_parents: boolean }`
- Sending a work card with `notify_parents` true writes the same card into that child’s parent group (or 1:1s) in the same send. Does **not** call `assignPractice` and does **not** change a score.

**Posts (new)**

- `posts`: school or class audience, author, body, photo optional, `kind` post \| alert
- `post_replies`: belong to the post
- Audience from class enrollments and/or `parent_students` — no follow table in v1
- Alerts also surface as a derived row on `/notifications` (query posts, do not duplicate into a chat notifications table)

**RLS**

- Thread: member only, same as today (`is_thread_member`)
- Creating a thread: enforce the who-may-message table in a security-definer RPC (do not trust the client)
- Posts: author + audience by role and class/parent link
- Students cannot insert posts or student–student members

Matcher still never inserts a student. Group membership uses existing enrollments / `parent_students` / staff profiles only.

---

## 6. Acceptance (busy teacher, five minutes)

1. Open mail. Existing 1:1 with a colleague still works. `@handle` still opens that thread.
2. On a student’s page, **Message parents** opens (or creates) one group with that child’s linked parents. Send a line. Each parent sees it after sign-in on `/messages`.
3. Roster: select three parents, **Message these parents**. Cannot select the whole 200-person roster as one chat (blocked or warned).
4. On that student’s practice, **Share in a message**. Card appears. **Notify parent(s)** is on. Send. Parent opens the card in-app to the practice — no browser URL. Score unchanged. Approve/Assign still required to put work on the books.
5. Class page **Post to class**. Parents of that class see it on the feed. Replies stay under the post. Mail list does not grow by 200 threads.
6. Super **Post to school** and one **Alert**. Alert shows on the bell next to existing Needs you rows. Mail icon still means chat.
7. Student login cannot start a thread with another student. Parent login cannot start a thread with another parent.
8. Mute a group. New messages do not badge mail for that thread.
9. Appearance System / Light / Dark and portrait / landscape still work. No new left rail.

---

## 7. Explicit non-goals (v1)

- Student-to-student chat or student-started posts
- Parent-to-parent chat
- Teacher–student 1:1 (later: teacher starts, older grades)
- SMS, push vendor choice, scheduled email jobs (family letter copy/`mailto` stays)
- Slack/Teams topic channels, X Follow/Lists/Communities
- Read receipts beyond today’s `last_read_at`
- Attaching a capture photo into a thread
- Public share URLs for assignments
- A third conversation list besides mail and feed
- Mutating a grade or submission from a message or post

---

## 8. Later (do not build now)

Teacher-initiated student 1:1; optional parent-to-parent if both families connect; student replies on class posts after school COPPA/FERPA sign-off; digest email if a vendor appears; read receipts / capture attachment only if they earn a tap.

---

## Handoff

When the product owner says **build it**, implement this brief only. If a detail is missing, ask — do not invent SMS, Slack channels, or student social graph. Research uncertainties (exact competitor receipts, April 2025 COPPA text, CIPA on home devices) stay out of v1.
