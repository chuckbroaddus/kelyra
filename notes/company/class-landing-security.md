# LAND-S1: Security / FERPA — class landing

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** t_e26944c1 (LAND-S1)
**Status:** Review only — no SQL, no app code, no migrations, no Edge handlers, no kelyra-qa-loop, no git push.
**Depends on:** `notes/company/class-landing-architecture.md` (LAND-A1); plan `class-landing-plan.md`; research `class-landing-research.md`.
**Live ground:** `class_teacher_of` (AVG write wall), `teaches_class` (admin OR class_teachers), `can_see_post`, `parent_students`, `askToolPolicy.ts` + Edge twin, `syllabus.manage` pattern, CAL-P1 `calendar_visibility` (not shipped as family predicate).
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

LAND-A1 product law is sound: signed-in only; no public URL; named regions are plain text; live blocks are joins not copies; family must not `SELECT class_landing`; writes use `class_teacher_of` not `teaches_class`; new Ask capability `landing.manage` not `assignments.manage`; twins fail closed; no grades on the landing; AI parks draft; Confirm publishes; teachers do not create classes.

**Do not implement** until the v1 must-fix list in §2.4 is copied into A1 / the future qa-loop. Architecture already states most walls. Gaps that would still ship a leak if implementers follow A1 literally:

1. “No sanitizer because no HTML” is false if the client interpolates region text into HTML / WebView.
2. One fat `landing_published` SECURITY DEFINER that “returns live blocks” can bypass `can_see_post` / assignment publish RLS.
3. “Hat-readable class files” can include student work if the catalog is captures/submissions.
4. Ask `publish_class_landing_region` must copy the **parked draft**, not model-supplied text (or omit publish from Ask, UI RPC only — same as AVG confirm).
5. Edge/matrix defaults for `landing.manage` must be teacher `own`, parent/student/office **`none`**. Copying `assignments.manage` repeats the AVG P0 (students `own`, office `school`).

Soft FERPA posture unchanged. Security does not authorize implementation. CEO still must say send.

## 1. Threats

Attacker profiles: curious student JWT, parent JWT (incl. invite token), teacher of class A on class B, office seat, dual-hat teacher-parent, modified Expo client, model tool-loop, WebView HTML injection, vendor logs.

### 1.1 Data classes

| Data | FERPA / sensitivity | Where | Family-visible? |
|---|---|---|---|
| Published named-region text (welcome, verse, daily_focus, header_title) | Generally **not** education records if teacher-authored class policy/directory-ish. Can become records if a teacher pastes a student name/score. | `class_landing.*_published` | Yes, enrolled / linked child in that class |
| `*_draft` columns | Teacher work product; may contain incidental student names | same row | **Never** |
| Assignment titles + `due_at` on family landing | Can reveal a hidden quiz (education-record adjacent) | live query | Only if published-to-family / `calendar_visibility=published`. **Fail closed until that flag exists.** No scores. |
| `approved_score` / draft scores / roster | **Education records** | gradebook / submissions | **Never on landing** |
| Posts / announcements | Class communication; may name a student | `posts` + `can_see_post` | Existing post RLS only; do not loosen |
| Class files that are student work / captures | **High** | storage + assets | **Never** on landing |
| Sibling’s other class home | **High** — classic over-read | must not exist in payload | **Never** |
| Model prompt for NL region edit | Third-party processing | xAI via Edge / `ai:dev` | **Never** (teacher UI only; no roster in prompt) |

**Product law (unchanged):** Nothing is a grade until Approve. Matcher never inserts a student. This path never creates classes. Twins never mix.

### 1.2 T1 — Public / pre-auth class URL

**Severity: P0 if shipped; A1 already forbids**

Anonymous or CDN class home is a FERPA disclosure surface. LAND-R1: no K-12 taught-class default that is public. kelyra.app DNS stays held.

**Must-fix:** No pre-auth route. `anon` deny on table + RPCs. No public storage object. WebView is the **signed-in** document, not a shareable URL. Do not put JWT in query string.

### 1.3 T2 — Family SELECT of `class_landing` (draft leak)

**Severity: P0** — same class as `class_syllabi.ask_draft`

Postgres RLS is row-level. Draft and published share one row. Family `SELECT *` leaks unpublished AI text.

**Must-fix:** Family **must not** `SELECT` the table. Teacher client SELECT full row iff `class_teacher_of`. Family reads via SECURITY DEFINER RPC/view that returns **only** `*_published` (plus live blocks already filtered). Missing row is legal: empty regions, live queries still run.

### 1.4 T3 — Office / `teaches_class` write widen

**Severity: P0**

Live `teaches_class` is true when `is_school_admin()` **OR** `class_teachers`. AVG already forbids mapping class-policy writes to it. Landing writes that reuse `teaches_class` give office an editor A1 explicitly does not want.

**Must-fix:** INSERT/UPDATE/DELETE and teacher SELECT of drafts = `class_teacher_of` only (`class_teachers` row, `teacher_id = auth.uid()`). `also_teacher` without a row: denied. Co-teachers with a row: allowed. Do not widen `is_staff` / `is_school_admin` into landing SELECT.

### 1.5 T4 — Ask becomes superuser (`assignments.manage`)

**Severity: P0** — live matrix: teacher `own`, **student `own`**, office `school`.

A1 names `landing.manage` (good). Implementers who copy `scan_answer_key` will offer draft/publish to students.

**Must-fix (normative):**

| Future tool | Seat | Capability | Extra wall |
|---|---|---|---|
| `draft_class_landing_region` | Teacher of that `class_id` | **New** `landing.manage` (teacher `own`; parent/student/office **`none`**) | `teacherSeatOnly`; handler `class_teacher_of`; allow-list region id; writes **draft only** |
| `discard_class_landing_region_draft` | Same | Same | Does not touch published |
| `publish_class_landing_region` | **Prefer UI RPC**; Ask optional | Same | Copies **parked** `*_draft` → `*_published` for **one** region; optimistic `row_version`; ignore model-supplied body text |

Hard rules: unknown names denied; client + Edge twins; `filterAskToolDefs` after `getUser` + profile — never `body.role`; do not set `officeOnly` (SQL is SoT) **and** keep live `teacherSeatOnly` (office JWT is not offered Ask landing tools; dual-hat office who teaches uses the class UI/RPC). Do not call `create_class` / roster insert.

Live `teacherSeatOnly` already returns false for `isOfficeRole` before SQL. **Do not weaken** that to “office if they also teach.”

### 1.6 T5 — Fat `landing_published` definer bypasses source RLS

**Severity: P0**

A1: family RPC “returns published texts + live block query results already filtered.” A SECURITY DEFINER that SELECTs `assignments` / `posts` / calendar / files as the owner **skips** invoker RLS. One missed predicate = family sees hidden quizzes, school-wide posts (`class_id` null), or another class’s due list.

**Must-fix:** Prefer composing from **existing** hat-filtered queries (invoker rights, or call the same helpers `can_see_post` already uses). If one definer: re-apply source predicates in SQL (published-to-family / fail-closed due; `can_see_post` AND `posts.class_id = p_class_id`; no school-wide). **Two serializers:** teacher DTO may label hidden due items; family DTO must omit them. Do not share one JSON shape and “hide in UI.”

### 1.7 T6 — XSS / WebView HTML (plain text is not enough)

**Severity: P0**

A1: “No HTML. No sanitizer needed in v1 because there is no HTML.” Storage type ≠ renderer. If web uses `dangerouslySetInnerHTML` or the phone WebView loads a string template with region text, a teacher (or AI draft the teacher confirms) can ship `<script>` / `javascript:` / HTML that runs in the family session.

**Must-fix:** Render named regions as **text nodes** (React text / `Text`; WebView must not interpolate unescaped HTML). v1 has no HTML region. Later free-HTML needs a sanitizer **and** Confirm — out of v1.

### 1.8 T7 — Pop quiz / unpublished due on family landing

**Severity: P0**

Due-this-week is the highest-risk live block. Titles of hidden assessments are education-record adjacent.

**Must-fix:** Until CAL-P1 `calendar_visibility` exists as a real column used by family calendar, **omit the family due block entirely** (A1 fail-closed). Do not substitute “all rows with `due_at` this week.” **No scores, no `draft_score`, no roster.** Teacher landing may show hidden items **labeled**. Landing RPCs must not INSERT/UPDATE assignments.

### 1.9 T8 — Files block = student work

**Severity: P0**

“Existing hat-readable class files” is underspecified. Teacher-readable captures, submission photos, and answer keys are not a class resource list.

**Must-fix:** v1 files block = teacher-published **class resources** only (omit if no such catalog). Never submissions, captures, people photos, syllabus source assets, or answer keys. No new public bucket. No Files-API 403 invention — omit.

### 1.10 T9 — Twin mash-up / missing child id

**Severity: P0**

Parent with 2+ `parent_students` (Saydee/Sydnee) calling `landing_published` without `p_child_student_id`, or with an unlinked id, must return **empty**, not a blend. Child must be enrolled in `p_class_id`. Client chips are not a control. Cache keys must include child id.

### 1.11 T10 — Auto-publish / model-supplied publish text

**Severity: P0**

Draft tool must not write `*_published`. Publish RPC copies one region’s parked draft; other regions stay. Reject discards draft. Human field save is a normal draft save, not a silent publish unless the UI’s Publish control calls the RPC.

If Ask exposes publish: arguments = `class_id` + region id + `row_version` only — **not** the new string. The string in the model loop is unreviewed.

### 1.12 T11 — Prompt PII / homework name injection

**Severity: P1 (v1 must-fix for prompts)**

Homework Ask injects first names. Landing tools must **not** copy that. Prompts: class name + region id + current draft/published of **that region only**. No roster, grades, sibling names, unpublished assignments, SIS/IEP.

Server-side only. Never `EXPO_PUBLIC_*`. Logs: `class_id`, region id — not full region bodies, not student names.

### 1.13 T12 — Dual-hat / IDOR / token stuffing

**Severity: P0 for IDOR and sibling; P1 for dual-hat**

`class_id` in route, Ask args, and RPC is attacker-controlled. Student/parent on another class → empty/403, no draft. Teacher of A cannot write B.

Dual-hat: teacher-parent does not `SELECT` another teacher’s drafts because they parent a child in that class. Family RPC for parent hat; taught-class CRUD only for classes they teach. Seat = signed-in profile role.

Do not stuff landing into `parent_open` / invite-token blobs. Token leak is still education-record adjacent if due/posts ride along. Same token hygiene as today; do not widen.

Do not stack on `get_parent_card`, `school_*_for_link`, or `is_staff`. User JWT only. No service-role as the Expo actor.

---

## 2. Controls

Fail closed. Prefer RPCs over table grants for family. No `CREATE TABLE` in this ticket — this is the contract Architect/SQL must not weaken.

### 2.1 RLS / RPC (for Architect)

ENABLE RLS. **No table GRANT to `anon`.** No public storage. Signed-in JWT only. Definer RPCs: `search_path = public`, `auth.uid()` not null, `REVOKE ALL FROM public, anon`, `GRANT EXECUTE` to `authenticated`.

| Object | Teacher (class_teachers row) | Office v1 | Student | Parent |
|---|---|---|---|---|
| `class_landing` table | SELECT/INSERT/UPDATE/DELETE iff `class_teacher_of(class_id)` | **No** | **No table privilege** | **No table privilege** |
| `*_draft` | Teacher via table | No | No | No |
| `landing_published(p_class_id, p_child_student_id)` | n/a (teacher UI uses table) | No | Execute; empty unless enrolled in that class; published texts only; live blocks family-filtered | Execute; **require** `p_child_student_id`; empty unless `parent_students` + child enrolled in `p_class_id`; never mash-up |
| `publish_class_landing_region` / draft upsert / discard | Execute + `class_teacher_of` + region allow-list + `row_version` | **No** (unless they also have a `class_teachers` row **and** call the UI RPC — still not Ask) | **No** | **No** |
| Live assignment / post / calendar queries | Existing RLS; teacher may see hidden due **labeled** | Unchanged | Existing; landing must not add a looser policy | Existing; landing must not add a looser policy |
| Storage | None in v1 | None | None | None |

Column note: a policy on the base table cannot hide `*_draft`. Do not give family SELECT “because they only need published columns.”

Unknown region id → deny. AI/RPCs must not INSERT/UPDATE `assignments`, `posts`, calendar, files, syllabus, roster.

Audit: `write_audit('publish_class_landing_region', …)` with region id. Old/new **snippets** are optional; do not dump full bodies into vendor logs; **no** diary body.

### 2.2 Ask allowlist (normative; do not register until CEO yes)

Copy into A1 / future `ASK_TOOL_POLICY` (client **and** Edge twin; test like `askToolPolicy.test.ts` / syllabus.manage):

```
landing.manage: superintendent none, administrator none, teacher own, parent none, student none
  tools: draft_class_landing_region, discard_class_landing_region_draft
  teacherSeatOnly: true
  officeOnly: false
  run: class_teacher_of(class_id) or deny
  writes: matching *_draft only

landing.publish: same matrix; **UI RPC primary**
  Ask: omit in v1 OR args = class_id + region id + row_version only (copy parked draft)
```

Unknown names denied. Teachers still cannot `create_class`. Region ids allow-list: `welcome` | `daily_focus` | `verse` | `header_title`.

### 2.3 Renderer / WebView / cache

- Named regions: text nodes only.
- Phone WebView: same signed-in session; no token in URL; do not `innerHTML` the document from region columns.
- Client cache: key `class_id` + hat + `child_id` for parents. Unenroll / unlink / un-publish region → next load empty.
- One Home route, not a public site. No 11th tab required for this review.

### 2.4 Findings — severity and v1 cut

#### v1 must-fix (block LAND implementation / qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| L-S1-01 | P0 | New `landing.manage`. **Do not** map to `assignments.manage`. Client + Edge twins. Office/parent/student **none**. `teacherSeatOnly`. Unknown denied. | Ask policy tests: student, parent, office, teacher-also-admin, teacher-parent |
| L-S1-02 | P0 | Family **never** `SELECT class_landing`; RPC/view omits every `*_draft` | Serializer tests |
| L-S1-03 | P0 | Writes + teacher draft SELECT = `class_teacher_of`, not `teaches_class` / `is_staff` / `is_school_admin` | SQL review + office JWT denied |
| L-S1-04 | P0 | `landing_published` must not bypass source RLS; two DTOs (teacher vs family); posts `class_id` = this class only | Hidden quiz absent from family; school-wide posts absent |
| L-S1-05 | P0 | Render regions as text, never HTML / unescaped WebView | XSS fixture |
| L-S1-06 | P0 | Family due block **omitted** until CAL publish flag; **no scores** | Unpublished assignment absent |
| L-S1-07 | P0 | Files block ≠ submissions/captures/keys; omit if no resource catalog | Fixture |
| L-S1-08 | P0 | Parent RPC requires `p_child_student_id`; 2+ links + missing/unlinked → **empty**; child enrolled | Twin mash-up test |
| L-S1-09 | P0 | AI writes draft only; publish copies parked draft (not model text); confirm required; students cannot invoke | No UPDATE published in draft tool |
| L-S1-10 | P0 | No public URL; `anon` 401; no v1 storage; no JWT in query | Route + GRANT |
| L-S1-11 | P0 | Teachers **must not** create classes; landing must not insert classes/students | Static + RPC |
| L-S1-12 | P1 | Prompts: no roster/grades/siblings/unpublished work; do not copy homework first-name injection; server-side keys | Prompt + Edge |
| L-S1-13 | P1 | Dual-hat: parent-hat cannot read other teachers’ drafts; teacher-hat cannot family-read unlinked kids | RLS tests |
| L-S1-14 | P1 | Definer hygiene (`search_path`, revoke anon, `row_version`) | SQL review |
| L-S1-15 | P1 | Do not stuff landing into `parent_open`; do not stack `get_parent_card` / directory dumps | Review of SQL + parent API |

#### Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| L-S1-L1 | P2 | Signed DPA / school-official claim |
| L-S1-L2 | P2 | Public open-house page only if Chuck + legal |
| L-S1-L3 | P2 | Free HTML region: sanitizer + Confirm required |
| L-S1-L4 | P2 | Hero image in private bucket + short-TTL signed URLs (teacher-only mint) |
| L-S1-L5 | P2 | CAL-P1 `calendar_visibility` becomes the family due predicate (until then omit) |
| L-S1-L6 | P2 | Office school-wide region defaults |
| L-S1-L7 | P3 | Eligible student (18+) FERPA rights transfer |
| L-S1-L8 | P3 | iCal / Sites import (XSS + over-copy) |

### 2.5 FERPA mapping (engineering)

| FERPA concern | LAND control |
|---|---|
| No anonymous disclosure of class/student context | Signed-in only; `anon` deny; no public URL |
| Education records (grades) not on this surface | No `approved_score` / draft scores / roster on landing |
| Hidden assessments not advertised to family | Due block fail-closed until publish flag |
| Parents see **their** child’s class home only | `p_child_student_id` + `parent_students` + enrollment; twins empty |
| Vendor as school official | **Not claimed**. Region NL is teacher text only; no roster in prompt; paid no-training |
| Directory vs record | Published verse/welcome OK as teacher-authored class page. Scores/files-of-work are records |
| COPPA | Unchanged; no new public child posting |
| Redisclosure | Family Ask must not exist for landing writes; logs without body dumps |

### 2.6 Tests a future qa-loop must include (do not run now)

1. Student JWT: draft/publish denied; family landing empty when not enrolled; no `*_draft` in any student RPC.
2. Parent JWT: child A cannot fetch child B landing; missing child id with 2+ links → empty; unlink → empty.
3. Teacher of class A cannot draft class B.
4. Office JWT cannot Ask-draft landing; office without `class_teachers` cannot write table/RPC.
5. Family due list empty while `calendar_visibility` absent; teacher may see labeled hidden.
6. Family payload: no scores, no drafts, no roster, no school-wide posts.
7. Region text containing `<script>` renders as text, not script.
8. Draft tool does not change `*_published`; publish without confirm does not.
9. Ask publish (if present) ignores model body string; copies parked draft.
10. `anon` 401 on table and RPCs.
11. Files block omits submission/capture paths.
12. Unenroll → next family load empty.

---

## 3. Acceptance

This file is for CEO/CoS. **No SQL, no app code, no kelyra-qa-loop, no git push.** Security does not authorize implementation.

### 3.1 Decisions (this ticket)

1. Family access is RPC/view-only; no base-table SELECT of `class_landing`.
2. Landing Ask writes get a **new** capability `landing.manage`, not `assignments.manage`.
3. Office and family seats cannot Ask-write landing in v1. Keep live `teacherSeatOnly` (do not weaken for dual-hat office).
4. Writes use `class_teacher_of`, not `teaches_class`.
5. Confirm/publish is UI RPC primary; if Ask exposes it, copy parked draft only.
6. Render published regions as text, not HTML.
7. Family due block omitted until CAL-P1 publish flag; no grades on landing.
8. Files block is class resources only — or omit.
9. Twins: empty mash-up; required `p_child_student_id`.
10. Soft FERPA posture unchanged until a DPA exists.
11. Teachers cannot create classes; this feature cannot either.
12. No implementation from this ticket.

### 3.2 Open questions (not blocking this review)

| # | Question | Owner |
|---|---|---|
| 1 | Exact route `/class/:id/home` vs Class desk “Home” | PM / CEO |
| 2 | Omit Ask publish entirely in v1 (security preference) vs allow with no body arg | Architect / PM |
| 3 | Whether any class-resource file catalog exists to join; if not, files block stays omitted | Architect |
| 4 | `verse` empty allowed — no security issue | — |

### 3.3 Downstream

| Ticket | Needs |
|---|---|
| LAND-A1 | Incorporate L-S1-01–15 (esp. XSS render, fat-RPC, files scope, Ask publish args, Edge matrix `none`) |
| Future qa-loop | §2.6 tests — **do not run now** |
| CEO / CoS | This artifact exists; **Chuck still must write yes**. Do not staff `senior-developer` |

**RECOMMENDED NEXT ACTION:** Architect patches A1 with the five gaps in §0. CoS/CEO gate. Do not launch kelyra-qa-loop from this ticket.
