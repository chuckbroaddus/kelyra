# LAND-P1: Class landing feature set, UI/UX, AI, implementation approach

**Date:** 2026-09-03  
**Author:** chief-of-staff (unblocking; PM workers could not finish the artifact — grok-4.5 stream died on one-shot `write_file`)  
**Card:** `t_c6351efa` · Parent research: `t_09c36fdc`  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/class-landing-research.md` (LAND-R1, 2026-09-03)  
**Also grounded in:** `notes/company/calendar-plan.md` (join, not duplicate), `notes/company/teacher-ux-plan.md` (desk-centric IA), `docs/mvp.md` (phone capture / web review), hats + twin separation, CEO Bible-verse NL example.

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Class landing** | One **webpage-like home** for a single taught class: live Kelyra blocks + a few named teacher fields | Not the class menu, not Feed/stream as the only home, not a public marketing site, not free HTML in v1 |
| **Named regions** | Teacher-authored fields (verse, welcome, daily focus) that AI can draft into | Not Ask-as-superuser; not student data in prompts |
| **Live blocks** | Assignments due, announcements, calendar slice, files — **joined** from canonical tables | Not copies of calendar events or lesson plans |
| **AI edit** | NL update of a **named** region → preview → teacher confirm → publish | Not auto-publish; not silent HTML rewrite |

**CEO bar (LAND-R1):** Webpage-like class home; named regions for NL (e.g. “Update the Bible Verse for Fundamentals of Math to Genesis 1:1 (KJV)”); live data joined; signed-in only; hat walls; twins never mixed; no class-create.

---

## 1. Problem statement

Kelyra already lets hats open a class via **chrome/tabs** (Feed, Assignments, etc.). There is **no single “this is the class” page** that reads like a course home (Canvas Front Page / Syllabus home) instead of an app menu.

Teachers still maintain parallel Google Sites or a noisy Classroom Stream. Parents need one child-scoped class home, not a firehose. The CEO example (Bible verse NL) is a **named field**, not a CMS.

---

## 2. Explicit non-goals

| Non-goal | Why |
|---|---|
| Anonymous public class URL in v1 | FERPA; LAND-R1 found no K-12 taught-class default that is public |
| Free-form HTML / Sites clone in v1 | Maintenance + XSS + AI-unsafe; later maybe |
| Duplicate calendar events or lesson-plan bodies onto the landing | Join/reference only (CAL-P1 / LPLAN-R1) |
| Class create from landing or Ask | Teachers do not create classes |
| Widen `is_staff` / office SELECT into parent doctor notes or student personal | Hat walls |
| Mixing twins (Saydee/Sydnee) on one landing | Hard product law |
| Auto-publish AI or live-block drafts | Confirm-before-publish for authored fields; live blocks follow source publish rules |
| Landing as the teacher grade loop | Desk stays capture → match → Approve (TEACH-UX) |
| Student-editable landing | Teacher authors; students/parents read |
| Grades / `approved_score` on the landing | Gradebook stays elsewhere |
| kelyra.app DNS / public CDN until Chuck says | Existing hold |

---

## 3. Hats — user stories (v1)

### Teacher (taught class only)

- Open **Class landing** from the class desk as a webpage-like home (web) or WebView (phone), not a tenth PersonTab dump.
- See **live**: this week’s due work, recent announcements, upcoming calendar slice, key files.
- Edit **named regions** (Welcome, Daily focus, Bible verse / quote) as plain text; Save = draft, Publish = visible.
- Tell Ask: “Update the Bible Verse for Fundamentals of Math to Genesis 1:1 (KJV)” → preview on that region → Confirm.
- Unpublished assignments (pop quiz) **do not** appear on student/parent landing.

### Student (enrolled class only)

- Open the same landing; see published live blocks + published named regions.
- Cannot edit. Cannot see other classes/grades.

### Parent / guardian (linked child, that class only)

- Open landing **for that child**; summary of announcements / due / calendar slice + published verse/welcome.
- Never see the sibling’s class home on this route. Never school-wide homework firehose.

### Office / superintendent

- **No** extra landing editor in v1. Directory still owns classes. Optional later: school-wide template defaults.

---

## 4. Block / element inventory

### Live (canonical data — no teacher retype)

| Block | Source | Publish rule |
|---|---|---|
| Assignments due (today / this week) | `assignments` + `due_at` | Same as calendar: **published** only |
| Announcements (recent) | existing announcement / feed class-scoped | Class-visible items only |
| Calendar slice | CAL-P1 events **join** | Hat-visible, published |
| Files / resources | class files the hat can read | No Files-API 403 invention |
| Lesson focus link | LPLAN published span **link**, not embed | Hidden if draft |

### Authored (named regions — AI targets)

| Region id | Label | v1 |
|---|---|---|
| `welcome` | Welcome / teacher note | **on** |
| `daily_focus` | Daily / lesson focus blurb | **on** |
| `verse` | Bible verse / quote | **on** (optional empty) |
| `header_title` | Display title (defaults to class name) | **on** |

Not v1: hero image CMS, HTML widgets, embedded grade sparkline, email/phone blocks (clutter).

**Above the fold (web):** title, welcome, verse, due-this-week, next calendar items.  
**Below:** announcements, files, lesson-plan link.  
**Phone:** same stack, single column; no extra chrome beyond existing signed-in shell.

---

## 5. AI edit + confirm

1. Teacher (only) NL names **class + region + new text**.
2. Matcher binds to **one taught class** the teacher owns. Unassigned → confirm picker. Never invent a class. Never “Ask as superuser.”
3. System drafts a **region patch** (plain text). Show before/after.
4. Teacher Confirm → publish that region. Reject → discard. Edit → treat as human save.
5. Audit: who, when, region, old/new (ledger later; v1 at least a comment-quality log).
6. Prompts contain **no roster, no grades, no sibling names**.
7. Students/parents cannot invoke landing AI.

Example: “Update the Bible Verse for the Fundamentals of Math landing page to Genesis 1:1 (KJV)” → `verse` on that class → confirm.

---

## 6. Access, mobile vs web

| Channel | v1 |
|---|---|
| Signed-in web route | `/class/:id/landing` (name TBD) inside existing app shell |
| Signed-in native | WebView of the same document (school-pilot already uses LessonWebView pattern) |
| Public URL | **No** |
| Pre-auth | Portrait splash/login unchanged; landing is **after** sign-in (landscape allowed only when signed in, per product preference) |

Web: page layout (`object-fit` issues on splash are unrelated; landing is HTML document not cover video).  
Phone: one column, large tap targets; AI confirm is a sheet, not a tiny modal.

---

## 7. Visibility matrix (fail closed)

| Viewer | Sees |
|---|---|
| Student | Own enrolled class landing, published only |
| Parent | Linked child’s class landing, published only; **per child** |
| Teacher | Taught class; drafts + published; AI |
| Other grade / other class | Nothing |
| Twins | Separate viewer context — never one merged home |
| Anonymous | Nothing |

RLS: class membership / guardian link / taught-by. No `is_staff` widen. Teachers do not create classes.

---

## 8. Implementation approach (no SQL in this ticket)

**v1 architecture:** **template + named regions + live joins**. Not a free HTML document.

- One `class_landing` row per class (or equivalent): region texts, draft vs published timestamps, `updated_by`.
- Live blocks are **queries** with the same publish/visibility rules as Calendar/Assignments — not stored copies.
- Calendar slice = filter of CAL-P1 items for this `class_id`.
- Lesson plan = link to published LPLAN if/when that ships; landing does not wait on LPLAN code.
- AI writes **only** region columns, never live-block tables.
- Web renderer: server- or client-composed sections; `pointer-events` / media rules N/A except don’t embed splash video.
- Tests: hat walls, twin split, unpublished assignment absent, AI confirm required.

**v1 vs later**

| v1 | Later |
|---|---|
| Named regions + live due/announce/calendar/files | Free HTML region |
| Signed-in web + WebView | Public open-house page if Chuck + legal |
| Teacher NL + confirm | Student-facing AI (no) |
| Join calendar | iCal, Sites import |

---

## 9. Acceptance for this card

- This file exists for CEO/CoS review.
- No application code, no SQL, no git push, no kelyra-qa-loop.
- Next: Chuck reviews; **do not** staff `senior-developer` until he says send.

## 10. Open issues (not blockers for this spec)

- Exact route name vs Class desk entry (TEACH-UX must not add a 11th tab — prefer one “Home” replacing a noisy tab).
- Parent guardian link mechanics (roster) — same as rest of app.
- Whether `verse` is school-optional (empty allowed).
