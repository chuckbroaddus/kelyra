# LPLAN-S1: FERPA / Security Review — Lesson Plans

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** `t_f68d844b`
**Status:** Review only — no SQL, no app code, no Edge handlers, no kelyra-qa-loop.
**Depends on:** `notes/company/lesson-plan-architecture.md` (LPLAN-A1)
**Also:** `notes/company/lesson-plan-plan.md`, `notes/company/lesson-plan-research.md`
**Live ground:** `docs/data-model.md` (`assignments`, `lesson_packs`, `submissions`); `class_teacher_of` (membership only); `teaches_class` (ORs `is_school_admin`); `parent_students`; `src/lib/ai/askToolPolicy.ts` + Edge twin; CAL-S1 / AVG-S1 / DIARY-A1 / LAND-P1.
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Soft FERPA still applies (`docs/architecture.md`, `docs/mvp.md`): paid model tier, no training on prompts, no district DPA unless Chuck signs one.

**Non-goals of this ticket:** Implementation, Architect SQL, QA plan, staffing `senior-developer`.

---

## 0. Verdict

LPLAN-A1 product law is sound on the walls that would otherwise fail FERPA minimization:

1. **New `lesson_plans` entity.** Do not overload `assignments` (those seed `submissions` and become grades after Approve). Plans are accreditation + run-of-show, not a grade-book column.
2. **Full-body SELECT = `owner_profile_id = auth.uid()` only.** Stricter than syllabus. Co-teachers, office, parents, students, substitutes: **no** table SELECT. Differentiation / IEP / ELL notes are teacher work product with named-child strategies — not a class-wide read.
3. **Never** copy `teaches_class`, `is_school_admin()`, `is_staff()`, or `assignments_via_class` onto this table. Writes: owner **and** still `class_teacher_of(class_id)`. Leave the class → keep own SELECT, **lose write**.
4. **Family path is a SECURITY DEFINER RPC**, not PostgREST SELECT. v1 payload: `title` + `parent_summary` (+ span/published_at). Never `procedures`, `differentiation`, `teacher_notes`, `assessment` internals, `materials` dump, `standards` dump, links, `source`, owner id.
5. **New capability `lesson_plan.manage`**, need=`own`, **teacherSeatOnly**, office **none**. Do **not** reuse `assignments.manage` (students already have `own`; office would get school-wide writes — same P0 as AVG-S1).
6. **AI drafts only.** No `publish_lesson_plan` Ask tool. No silent calendar write. No parent share. No roster/IEP/diary in prompts. Edge must **not** UPDATE `lesson_plans`.
7. **Publish ≠ share.** Unpublish → `draft` **and** clear `summary_shared_at`. Family calendar occupancy **no in v1**. Family landing does not deep-link the plan editor.

**Do not implement** until CEO says send **and** the v1 must-fix list in §2.4 is copied into any future architecture/qa-loop ticket. Filter chips, landing hides, and “only you can ever see this” copy are not security. Honest RLS: DBA / `service_role` / backups still exist.

Ready for CEO/CoS. This ticket does not authorize eng staffing.

## 1. Threats

Attacker profiles: curious student JWT; parent JWT (incl. invite); teacher of class A on class B; co-teacher of the same class; office seat; dual-hat teacher-parent; modified Expo client; model tool-loop; `SECURITY DEFINER` confused deputy; existence leak via `/activity` audit.

### 1.1 Data classes

| Data | FERPA / sensitivity | Where it would live | Family-visible? |
|---|---|---|---|
| Draft plan body | Teacher work product | `lesson_plans` `status=draft` | **Never** |
| Published procedures / materials / assessment internals | Teacher work product; not a grade | Same row | **Never** (v1) |
| `differentiation` | **High** — ELL/IEP/504/tier strategies, often named-child | Same column | **Never** |
| `teacher_notes` | Teacher work product; **not** Diary | Same column | **Never** |
| `parent_summary` when `summary_shared_at` set | Narrow teacher-authored operational note | Same column; family **RPC only** | Linked guardian of enrolled child C only |
| `standards` jsonb / `objectives` | Curriculum; not a student record | Same row | **Not in v1 RPC** (title + summary only) |
| Calendar projection title + span | Occupancy / “what we did today” | CAL join `source_kind=lesson_plan` | **Never in v1** (teacher only) |
| Assignment / pack **links** | Pointers into grade-book / player | `lesson_plan_links` | **Never** |
| `source=ai_draft`, owner id | Support metadata / identity | Same row | **Never** |
| NL prompt / completion | Possible names, IEP text if pasted | xAI via Edge / `ai:dev` | **Never** |
| Sibling blend / unlabeled twins | **High** — classic FERPA over-read | Must not exist in RPC | **Never** |
| Diary reflection | Owner-only journal (DIARY-A1) | `diary_entries`, not this row | **Never** via plan ACL |

**Product law (unchanged):** Nothing is a grade until Approve. Matcher never inserts a student. Teachers do not create classes. Publish does not seed `submissions`. Office does not SELECT IEP notes because a plan exists. Diary FK is not an ACL grant.

### 1.2 T1 — Office firehose (`teaches_class` / `is_staff`)

**Severity: P0 if implementers copy `assignments_via_class` or syllabus-adjacent policies.**

Live `teaches_class(class_id)` is true when **`is_school_admin()` OR `class_teachers`**. Reusing it for plan SELECT/UPDATE dumps every class’s differentiation notes to superintendent/administrator. `is_staff()` / `is_school_admin()` shortcuts are the same hole. A1 forbids this. Copy it anyway and FERPA minimization is gone.

**Must-fix:** Policies and RPCs `doesNotMatch` `teaches_class`, `is_school_admin`, `is_staff`, `also_administrator`. Office JWT: zero plan rows, zero family-RPC rows, zero Ask tools.

### 1.3 T2 — Family table SELECT (column over-read)

**Severity: P0**

Postgres RLS is **row**-level. Granting parents/students SELECT on `lesson_plans` “just for `parent_summary`” returns `differentiation`, `teacher_notes`, `procedures`, links. Mirror AVG family syllabus: **no family table SELECT**. Narrow SECURITY DEFINER RPC with an explicit column allow-list. Student JWT: **deny** the RPC in v1 (product law “no plan body”).

### 1.4 T3 — Reuse `assignments.manage`

**Severity: P0 (same trap as AVG-S1)**

Live Ask maps create/list assignment tools onto `assignments.manage`. Students have `own`; office has school. Mapping `draft_lesson_plan` / any plan write onto that capability mints plan AI for students and school-wide drafts for office.

**Must-fix:** New `lesson_plan.manage`, teacherSeatOnly, office none. Unknown tool names denied. Client map + Edge twin identical. Never `body.tools` / `body.role`.

### 1.5 T4 — Co-teacher / sub SELECT via `class_teacher_of`

**Severity: P0**

Syllabus CRUD = any `class_teacher_of`. Plans v1 are **owner row**. Copying syllabus SELECT onto `lesson_plans` lets a co-teacher (or anyone with a `class_teachers` row) read IEP/ELL strategies. Substitute cover SELECT is **parked**. Export/print is an **owner** action.

Writes still require `class_teacher_of` **and** owner so a departed teacher cannot keep publishing into a class they no longer teach.

### 1.6 T5 — Ask publish / Edge write / matcher superuser

**Severity: P0**

`publish_lesson_plan` must not be an Ask tool. Unknown names denied. Handler: `class_teacher_of` **before** the model call. `draft-lesson-plan` Edge: JWT + taught class **before** vendor; returns JSON only; **must not** UPDATE `lesson_plans`. Save is `save_lesson_plan_draft`. Publish stays a UI button.

Matcher binds **one taught class**. Unassigned → picker. **Never invent `class_id`.** Never `classes.create`, student insert, `link_parent_student`, `approved_score`, or silent span/calendar write. Parent/student/office JWT: no plan AI.

### 1.7 T6 — Twin / sibling mash-up on summary RPC

**Severity: P0**

Parent with 2+ `parent_students` and missing/invalid `p_student_id` → **empty**, not a union. Preconditions fail closed (empty / not_found, not a leaky error): guardian of that student, student enrolled in `p_class_id`, `status=published`, `summary_shared_at IS NOT NULL`, `parent_summary` non-empty. The other twin must not appear in C’s landing, calendar, or Ask context.

### 1.8 T7 — `SECURITY DEFINER` confused deputy

**Severity: P0**

`family_lesson_plan_summary` (and teacher RPCs) skip RLS. If they do not pin `search_path=public`, re-check `auth.uid()`, REVOKE `anon`/`public`, and apply §3.2 predicates **inside** the function, any authenticated caller can pass another family’s `p_student_id` / `p_class_id`. Client must never wide-select `lesson_plans` then filter.

Teacher RPCs: start with owner + `class_teacher_of`. `save_lesson_plan_draft` **cannot** set `status=published` or `summary_shared_at`.

### 1.9 T8–T14 — Remaining v1 threats

| ID | Sev | Threat |
|---|---|---|
| T8 Status bypass | P0 | Client UPDATE of `status` / `summary_shared_at` without RPC. A1 lock: RPCs own those columns; table UPDATE of them denied to `authenticated`. |
| T9 Unpublish drift | P0 | Unpublish leaves `summary_shared_at` set, or CAL still projects, or family landing still chips. Lock: unpublish → `draft` + **unshare**; join gone immediately. |
| T10 Dual-hat chrome | P0 | Teacher-parent queries by **active chrome seat**, not `also_teacher`. Parent seat: family RPC only (never full body). Teacher seat: own plans of taught classes — not the child’s other teachers’ plans. |
| T11 Copy-forward leak | P0 | Clone keeps `published_at` / `summary_shared_at` → family sees a draft copy. A1: new id, `status=draft`, **clear** publish/share timestamps; re-bind `class_id` still `class_teacher_of`. |
| T12 Client chrome as security | P0 | Calendar default-off chip, landing hide, or “Plans” tab absence used as the wall. Modified client / network tab wins. Server predicates only. |
| T13 Occupancy leak | P0 | Family CAL union includes `source_kind=lesson_plan` in v1. A1: teacher only. Do not reuse category `lesson` (`assignments.kind=lesson`). |
| T14 Crypto theater | P1 | Copy claiming “only you ever see this.” Honest RLS. No envelope E2E in v1. |

**Vendor / audit (P1):** Logs = request id, uid, class_id, latency, error class — **not** prompt/completion, differentiation, or teacher_notes. Do not `write_audit` drafts. Do not `write_audit` share onto Office `/activity` (existence leak). Ledger on Publish is owner-scoped (`write_ledger` action `plan`); skip `write_audit` so Office Activity is not a plan firehose.

**Later (not v1):** co-teacher / sub cover SELECT; office published-plan list; family calendar title chip; attachments bucket (if ever: private, owner path, no family signed URLs); school templates; public unauthenticated URL; eligible-student 18+; Cognia export of private notes.

## 2. Controls

A1’s matrix is the product contract. Server must enforce it. UI hiding is not FERPA control.

### 2.1 Helper / capability choice (lock)

| Helper | Plan use | Forbidden use |
|---|---|---|
| `owner_profile_id = auth.uid()` | Full-row SELECT; INSERT owner stamp; UPDATE/DELETE with taught-class | Co-teacher / office / family SELECT |
| `class_teacher_of(class_id)` | **Write** wall (with owner). Ask/Edge **before** vendor | Full-body SELECT (that is syllabus, not plans) |
| `teaches_class(class_id)` | **None** on this surface | Any plan SELECT/UPDATE/RPC |
| `is_school_admin()` / `is_staff()` | **None** | Any plan path |
| `parent_students` + enrollment | Inside family RPC only, after share | Table SELECT; mash-up when child missing |
| `my_student_id()` | **Deny** family RPC in v1 | Student plan body |
| Active chrome seat | Dual-hat: teacher query ≠ parent query | Job-of-record flags as a bypass |
| New `lesson_plan.manage` own / teacherSeatOnly | Ask `draft_lesson_plan` only | `assignments.manage`, `syllabus.manage`, `landing.manage` |

REVOKE ALL from `anon` on tables and RPCs. `lesson_plan_links`: no independent SELECT — CRUD iff parent plan is owner-selectable / owner-writable. Soft links: no cascade delete of the plan when assignment/pack is removed. No new Storage bucket in v1.

### 2.2 Visibility matrix (enforcement) — A1 §3.5 affirmed

| Viewer | Draft | Published full | Parent summary if shared | Diary via plan |
|---|---|---|---|---|
| Owner teacher | Yes | Yes | Edit | Own diary only |
| Other teacher (incl. co-teacher) | No | No | No | No |
| Substitute | No v1 | No v1 | No | No |
| Office | No | No | No | No |
| Student | No | No | No (RPC denied) | No |
| Parent (linked child in class) | No | No | RPC only | No |
| Other class / anonymous | No | No | No | No |

Teacher calendar projection: owner + published-or-draft-with-span per A1 §5.1. Family / office calendar: **no** `source_kind=lesson_plan` in v1. Family landing: same RPC payload or omit; **no** editor deep-link.

### 2.3 RPCs and Ask (fail closed)

| RPC / tool | Wall |
|---|---|
| `save_lesson_plan_draft` | Owner + `class_teacher_of`. Cannot set published or `summary_shared_at`. Optimistic `row_version`. |
| `publish_lesson_plan` | Owner + taught class. Does **not** share summary. `write_ledger` action **`plan`**. Skip `write_audit`. |
| `unpublish_lesson_plan` | → `draft`. Clears `summary_shared_at`. CAL join hides. |
| `archive_lesson_plan` | → `archived`. Same hide. |
| `share_` / `unshare_lesson_plan_summary` | Separate confirm. Share no-ops if not published or summary empty. |
| `copy_lesson_plan` | New draft; clear publish/share; `source=copy`; class still taught. |
| `family_lesson_plan_summary` | Guardian + enrollment + published + shared + non-empty summary. Twin: require `p_student_id`. Student/office JWT: deny. Allow-list columns only. |
| Ask `draft_lesson_plan` | `lesson_plan.manage` teacherSeatOnly. Returns JSON to editor. **No** publish tool. |
| Edge `draft-lesson-plan` | JWT; `class_teacher_of` before vendor; no table UPDATE. Server-side keys only. Never `EXPO_PUBLIC_*`. Company TTS (`grok-tts`) is not this path. |

Hard rules:

1. Prompt context is **paste-only** (topic/unit/standards/grade/optional syllabus excerpt). No silent roster or syllabus scrape. No diary body, IEP full text, sibling names, doctor notes, grades.
2. Matcher never INSERT students/classes. Never Approve grades.
3. Dual-hat: tool seat = signed-in chrome, then SQL walls.
4. Do not `write_audit` plan share/draft to Office `/activity`.

### 2.4 v1 must-fix (block implementation / qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| LPLAN-S1-01 | P0 | Never `teaches_class` / `is_school_admin` / `is_staff` on this table or RPCs | SQL `doesNotMatch` + office JWT: zero rows |
| LPLAN-S1-02 | P0 | Full SELECT = owner only — not `class_teacher_of` (co-teacher must not read IEP notes) | Co-teacher JWT fixture |
| LPLAN-S1-03 | P0 | No family/student table SELECT; RPC allow-list = title + parent_summary (+ span/published_at) | Parent SELECT empty; serializer fixtures |
| LPLAN-S1-04 | P0 | New Ask cap `lesson_plan.manage` teacherSeatOnly. **Not** `assignments.manage`. Unknown denied. No publish tool | `askToolPolicy` student/parent/office/dual-hat |
| LPLAN-S1-05 | P0 | Parent 2+ children: missing child → **empty**; student JWT deny RPC; office deny RPC | Parent/student/office fixtures |
| LPLAN-S1-06 | P0 | DEFINER hygiene: `search_path=public`, `auth.uid()`, revoke anon, predicates inside; no wide client SELECT | SQL + IDOR fixtures |
| LPLAN-S1-07 | P0 | RPCs own `status` / `summary_shared_at`; authenticated cannot UPDATE those columns | Direct UPDATE denied |
| LPLAN-S1-08 | P0 | Unpublish → draft + **unshare**; CAL join gone; family landing gone | Unpublish + family RPC empty |
| LPLAN-S1-09 | P0 | Copy-forward clears publish/share; new id; still `class_teacher_of` on target class | Clone fixture |
| LPLAN-S1-10 | P0 | Dual-hat by chrome seat; family CAL has **no** plan projection in v1; chips are not security | Dual-hat + family CAL union |
| LPLAN-S1-11 | P0 | Matcher never inserts students/classes; Edge does not UPDATE `lesson_plans`; AI never auto-publish | Static + Edge |
| LPLAN-S1-12 | P0 | Publish does not seed submissions / Approve grades; plan ≠ assignment | No `submissions` insert |
| LPLAN-S1-13 | P1 | Server-side AI keys; logs = ids not bodies/IEP text | Edge + `ai:dev` |
| LPLAN-S1-14 | P1 | No `write_audit` drafts/share to `/activity`; ledger on Publish only, owner-scoped | Office activity empty |

### 2.5 Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| LPLAN-S1-L1 | P2 | Signed DPA / school-official claim; keep soft FERPA copy until then |
| LPLAN-S1-L2 | P2 | Co-teacher / sub cover SELECT — new ACL, not “copy syllabus” |
| LPLAN-S1-L3 | P2 | Office published-plan list — still must not include `differentiation` / `teacher_notes` without a product decision |
| LPLAN-S1-L4 | P2 | Family calendar title chip — new disclosure; do not “just default-on the chip” |
| LPLAN-S1-L5 | P2 | Attachments: private bucket, owner path, no family signed URLs |
| LPLAN-S1-L6 | P2 | Envelope encryption (honest RLS first; no crypto theater) |
| LPLAN-S1-L7 | P2 | Eligible student (18+) / rights transfer |
| LPLAN-S1-L8 | P3 | School templates; Cognia export must not dump IEP notes to the wrong audience |

### 2.6 FERPA mapping (engineering)

| FERPA concern | Plan control |
|---|---|
| Education records disclosed to parent / eligible student / school official | Parent: shared summary RPC only. Student: deny v1. Office: **not** a school-official read of IEP notes in v1 |
| IEP/504/ELL strategies about named children | `differentiation` teacher-owner only; never in family RPC, CAL, landing, Ask logs |
| No peer / sibling records | Twin empty-not-mash; no classmate names in prompts |
| Directory vs record | Title+when of a shared summary is operational. Procedures and differentiation are not directory |
| Vendor as school official | **Not claimed** without DPA. Paid no-training; paste-only context; no IEP text in logs |
| Redisclosure | Ask must not echo differentiation or the other twin; `/activity` must not prove a plan share exists |
| COPPA | Unchanged: school context; no public child plan URL in v1 |
| Grades | Publish plan ≠ Approve. Links to assignments do not move `due_at` or scores |

## 3. Acceptance

Artifact for CEO/CoS. No SQL. No app code. No kelyra-qa-loop. No git push.

| Criterion | Where |
|---|---|
| Verdict: A1 walls sound; do not implement until CEO yes | §0 |
| Data classes + threat model (office, family SELECT, `assignments.manage`, co-teacher, Ask, twins, DEFINER, unpublish, dual-hat) | §1 |
| Helper lock vs `teaches_class` / syllabus SELECT; matrix; Ask cap; must-fix LPLAN-S1-01–14 | §2 |
| FERPA mapping (engineering, not a legal opinion) | §2.6 |
| Tests a future qa-loop must include | §3.1 |
| Soft FERPA / no school-official claim | Header + §2.5 L1 |

### 3.1 Tests a future qa-loop must include (do not run now)

1. Office JWT: table SELECT empty; family RPC deny; Ask `draft_lesson_plan` denied; `/activity` has no plan-share existence row.
2. Co-teacher JWT (`class_teacher_of` but not owner): cannot SELECT full body or UPDATE.
3. Owner who left the class: SELECT own rows yes; UPDATE/publish no.
4. Parent JWT: table SELECT empty; RPC returns title+summary only when published **and** shared; never `differentiation` / `teacher_notes` / `procedures`.
5. Parent 2+ children: missing `p_student_id` → empty; child A cannot fetch child B.
6. Student JWT: table SELECT empty; family RPC deny.
7. Direct UPDATE of `status` / `summary_shared_at` as `authenticated` denied; `save_lesson_plan_draft` cannot publish or share.
8. Unpublish → family RPC empty and CAL projection gone immediately.
9. `copy_lesson_plan` clone is draft with null share/publish timestamps.
10. `askToolPolicy`: unknown names denied; not on `assignments.manage`; student/parent/office cannot draft; no `publish_lesson_plan` tool.
11. NL / Edge: no class/student insert; no table UPDATE; `class_teacher_of` before vendor.
12. Family CAL union contains zero `source_kind=lesson_plan` rows. Category `plan` ≠ `lesson`.
13. Serializer/RPC: no owner id, links, `source`, standards dump, materials dump.
14. Publish does not INSERT `submissions` or write `approved_score`.
15. SQL files `doesNotMatch` `teaches_class`, `is_school_admin`, `is_staff` on this surface.
16. Client chip / landing hide changing does not change RPC row set (security is server).

### 3.2 Open questions (not blocking this review)

| # | Question | Owner |
|---|---|---|
| 1 | Whether v1 family RPC may later add `objectives` (A1 locked **omit** — title + summary only). Security agrees omit | PM / CEO |
| 2 | Co-teacher read of **published** body without `differentiation` (parked). Do not “just use `class_teacher_of`” | Product |
| 3 | Student seeing own shared summary in v1 (A1 = deny). Security agrees deny | PM / CEO |
| 4 | Eligible student 18+ | Later (L7) |

### 3.3 Decisions (this ticket)

1. A1 helper split is **mandatory**, not advisory. Plans are stricter than syllabus: owner SELECT, not class-teacher SELECT.
2. Plan Ask gets **new** `lesson_plan.manage`, not `assignments.manage`.
3. Family disclosure is an explicit share of a narrow summary, not table SELECT and not calendar occupancy.
4. Unpublish **unshares**. Copy-forward does not inherit share.
5. Hybrid SoT (do not copy plan body onto `calendar_events`) is a security win (less drift / confused deputy).
6. Soft FERPA posture unchanged until a DPA exists.
7. No implementation from this ticket.

### 3.4 Downstream

| Ticket | Needs |
|---|---|
| LPLAN-A1 (done) | Affirmed; must-fix list rides any future SQL ticket |
| Future qa-loop | §3.1 tests + LPLAN-S1-01–14 |
| Eng staffing | **CEO yes** — security does not authorize |

**RECOMMENDED NEXT ACTION:** CEO/CoS review. Hold `senior-developer`. Do not launch kelyra-qa-loop from this ticket.

### Handoff

- **OBJECTIVE:** FERPA/security review of lesson-plan architecture (LPLAN-S1).
- **FILES/AREAS:** `notes/company/lesson-plan-security.md`
- **WORK PERFORMED:** Threat model, helper lock (owner vs `class_teacher_of` vs `teaches_class`), Ask cap, must-fix list, FERPA mapping.
- **VERIFICATION:** File on disk; no SQL; no app code.
- **RESULT:** Ready for CEO/CoS — not implementation.
- **OPEN ISSUES:** §3.2
- **ESCALATION NEEDED:** No unless CEO rejects owner-only SELECT or family-RPC-not-table.
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing.

