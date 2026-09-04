# LAND-Q1: Acceptance plan — class landing (not a Build send)

**Date:** 2026-09-04
**Author:** qa-supervisor
**Ticket:** t_bbed11bf
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/class-landing-plan.md` (LAND-P1) | Hats, named regions, live joins, AI confirm, v1 cut |
| `notes/company/class-landing-architecture.md` (LAND-A1) | `class_landing` row, RLS/RPC, Ask tools, live-block queries |
| `notes/company/class-landing-security.md` (LAND-S1) | Must-fix L-S1-01…15 + future loop tests §2.6 |
| `notes/company/class-landing-research.md` (LAND-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing free HTML, public class URL, twin merge, grades-on-landing, or class-create.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC/JWT fixture, or scripted UI check with artifact).
2. Every **L-S1-01…L-S1-15** security must-fix is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; hat walls + twins + draft leak + unpublished quiz still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Class landing is one **webpage-like home** per taught class: live joins + named regions — not Feed-as-home, not Desk grade loop, not free HTML, not public site. | P1 §0, A1 §0 |
| L2 | **One `class_landing` row** for authored regions only. Live blocks = **queries**, never stored copies of dues / posts / calendar / LPLAN. | A1 §2 |
| L3 | Signed-in only. **No** public / pre-auth / CDN class URL. `anon` deny. kelyra.app DNS stays held. | P1 §6, S1-10 |
| L4 | Named regions are **plain text**. AI parks draft → teacher Confirm → publish. **No** auto-publish. | P1 §5, S1-09 |
| L5 | Writes + teacher draft SELECT use **`class_teacher_of`**, never `teaches_class` / `is_staff` / `is_school_admin`. | A1 §3, S1-03 |
| L6 | Family **never** `SELECT class_landing` (draft leak). Published via SECURITY DEFINER RPC/view that omits every `*_draft`. | A1 §3, S1-02 |
| L7 | Parent 2+ children: `landing_published` **requires** focused `p_child_student_id`; missing/unlinked → **empty**, never twin mash-up. | A1 §3, S1-08 |
| L8 | Family due block **omitted** until CAL-P1 `calendar_visibility` is real. **No scores** on landing. | A1 §2.2, S1-06 |
| L9 | New Ask capability **`landing.manage`** (teacher `own`; parent/student/office **`none`**). **Not** `assignments.manage`. | A1 §4, S1-01 |
| L10 | Render regions as **text nodes** (never `dangerouslySetInnerHTML` / unescaped WebView HTML). | S1-05 |
| L11 | Teachers do **not** create classes; landing never inserts classes/students. Matcher never inserts a student. | P1 §2, S1-11 |
| L12 | Model keys server-side only. No `EXPO_PUBLIC_*` vendor tokens. Prompts: no roster/grades/siblings/unpublished work. | AGENTS + S1-12 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** signed-in web Home + phone WebView; four named regions (welcome, daily_focus, verse, header_title) with draft/publish; live joins for due/posts/calendar-slice/files when sources exist; teacher NL → preview → Confirm; hat walls; twin empty mash-up; family due fail-closed; XSS text render; L-S1 must-fix.

**Out of scope (do not fail v1 for missing):** free-form HTML region; public open-house URL; hero image / storage; office region defaults; iCal/Sites import; student-facing landing AI; landing as grade loop; new `IconName` if Home reuses chrome; LPLAN embed (link-only when present).

---

## 1. Hats / twins / named regions

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (region allow-list, DTO strip, pure policy) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on desk / family / phone WebView |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (Desk grade loop, Feed, calendar) |

### 1.1 Teacher hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| T-01 | P0 | UI | Open Class Home from taught-class desk | Webpage-like landing; not a tenth PersonTab dump; not grade loop |
| T-02 | P0 | UI/I | Missing `class_landing` row | Legal: empty regions; live queries still run; lazy INSERT on first save |
| T-03 | P0 | UI/I | Edit `welcome` draft → Save | Draft only; family still sees prior published (or empty) |
| T-04 | P0 | UI/I | Publish one region (`verse`) | Only that `*_published` updates; other regions unchanged; `row_version` bumps |
| T-05 | P0 | UI/I | Empty `header_title_published` | UI falls back to `classes.name` |
| T-06 | P0 | UI/I | Empty `verse` (school-optional) | Allowed; no forced default verse |
| T-07 | P0 | UI/I | Live due on teacher landing | May show unpublished/hidden items **labeled**; no scores |
| T-08 | P0 | I | Teacher of class A opens class B landing write | **Denied** (`class_teacher_of`) |
| T-09 | P0 | I | Co-teacher with `class_teachers` row | Can draft/publish; without row denied |
| T-10 | P0 | I/S | Write path uses `teaches_class` | **Forbidden** — fail review if present (L-S1-03) |
| T-11 | P1 | UI | Above-the-fold layout (web) | Title, welcome, verse, due-this-week (teacher), next calendar items |
| T-12 | P1 | UI | Phone WebView | Same document, one column; large tap targets; confirm is a sheet |
| T-13 | P1 | UI | Route is one Home | Not an 11th tab; desk chrome unchanged for capture → Approve |
| T-14 | P2 | UI | Lesson focus link | Shown only if published LPLAN exists; omit if absent (landing does not wait on LPLAN) |

### 1.2 Student hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| S-01 | P0 | I/UI | Enrolled class landing | Published regions + family-filtered live blocks only |
| S-02 | P0 | I/S | Not enrolled in `class_id` | Empty/403; no draft fields |
| S-03 | P0 | I/S | Student SELECT `class_landing` table | **No privilege** — drafts never leak |
| S-04 | P0 | I | Hidden / unpublished assignment due | **Absent** from student landing (fail-closed due block if no CAL flag) |
| S-05 | P0 | I/UI | Payload | No `*_draft`, no scores, no roster, no classmates |
| S-06 | P0 | I/S | Student invoke draft/publish/Ask landing | **Denied** |
| S-07 | P1 | UI | Cannot edit regions | Read-only chrome; no Save/Publish controls |
| S-08 | P1 | I | Unenroll mid-session | Next load empty for that class |

### 1.3 Parent hat + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| P-01 | P0 | UI/I | 2+ linked children | Mandatory focused child; landing scoped to that child only |
| P-02 | P0 | I | Child A selected; request child B id | Fail closed empty/403; no blend (L-S1-08) |
| P-03 | P0 | I | Missing/invalid `p_child_student_id` with 2+ links | **Empty** set — never mash-up Saydee/Sydnee |
| P-04 | P0 | I | Child not enrolled in `p_class_id` | Empty |
| P-05 | P0 | I/S | Parent SELECT `class_landing` table | **No privilege** |
| P-06 | P0 | I | Hidden quiz on child’s class | Parent never sees title on landing |
| P-07 | P0 | I/UI | Family DTO | Published texts only; live blocks already filtered; no drafts |
| P-08 | P0 | I | Unlink child | Next landing load empty for that child |
| P-09 | P1 | UI | Cache key includes `class_id` + hat + `child_id` | No stale sibling payload after switch |
| P-10 | P1 | UI | Summary surface | Announcements / due (when allowed) / calendar slice + published verse/welcome — not school-wide firehose |

### 1.4 Office hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| O-01 | P0 | I/S | Office JWT without `class_teachers` row | No table write; no draft SELECT; no Ask landing tools |
| O-02 | P0 | S | Landing write uses `is_school_admin` / `teaches_class` | **Forbidden** |
| O-03 | P0 | UI | Office directory / admin class card | **No** landing editor in v1 |
| O-04 | P1 | S | Keep live `teacherSeatOnly` | Do not weaken so office JWT is offered landing Ask tools |
| O-05 | P2 | — | School-wide region defaults | Later; not v1 |

### 1.5 Dual-hat + seat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | I/S | Teacher+parent, parent chrome | Family RPC only; cannot read other teachers’ drafts on child’s class |
| X-02 | P0 | I/S | Same profile, teacher chrome | Taught classes via `class_teacher_of` only |
| X-03 | P0 | I/S | Office chrome without teach row | No landing write (L-S1-13) |
| X-04 | P1 | UI | Seat switch reloads query | No silent cross-hat residual rows |

### 1.6 Named regions / live blocks / publish rules

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| V-01 | P0 | U | Region allow-list | Only `welcome` \| `daily_focus` \| `verse` \| `header_title`; unknown id → deny |
| V-02 | P0 | U/I | Draft vs published columns | Typed text columns, not JSON; family DTO strips all `*_draft` |
| V-03 | P0 | I | Live blocks not on row | No copy of `due_at` / post body / calendar event onto `class_landing` |
| V-04 | P0 | I | Family due before CAL publish flag | **Entire family due block omitted** — not “all rows with due_at” |
| V-05 | P0 | I | Announcements | `posts` with `class_id = this class` + existing `can_see_post`; no school-wide `class_id` null |
| V-06 | P0 | I | Fat `landing_published` definer | Must re-apply source predicates; two DTOs (teacher vs family); no shared JSON + client hide (L-S1-04) |
| V-07 | P0 | I/UI | Serializer | **No** `approved_score`, `draft_score`, roster, classmate cells |
| V-08 | P0 | I | Files block | Teacher-published class resources only; never submissions/captures/keys; omit if no catalog (L-S1-07) |
| V-09 | P0 | I | Landing path INSERT/UPDATE assignments/posts/calendar | **Forbidden** |
| V-10 | P0 | U/I | Per-region publish | Confirm copies one parked draft → published; other regions stay |
| V-11 | P1 | I | Optimistic `row_version` | Stale publish rejected |
| V-12 | P1 | I | Class delete | `class_landing` cascades |
| V-13 | P1 | UI | Calendar slice | Join CAL-P1 when present; else due-query is the slice for teacher only until family flag |
| V-14 | P2 | — | Free HTML region | Out of v1; if early, sanitizer + Confirm required |


## 2. AI confirm-before-publish

CEO bar (LAND-R1 / P1 §5): NL names **class + region + new text** (e.g. “Update the Bible Verse for Fundamentals of Math to Genesis 1:1 (KJV)”) → matcher binds one taught class → draft on that region → preview → Confirm. Never auto-publish. Never invent a class. Never Ask-as-superuser.

### 2.1 Flow matrix

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AI-01 | P0 | UI/I | Teacher NL with class + region + text | Matcher binds **one** class via `class_teacher_of`; parks `*_draft` only |
| AI-02 | P0 | UI | Unassigned / ambiguous class | Confirm picker — never invent class |
| AI-03 | P0 | UI | Preview before/after | Shows **that region only**; other regions untouched in UI |
| AI-04 | P0 | UI/I | Confirm | `publish_class_landing_region` copies **parked draft** → published; audit stamp |
| AI-05 | P0 | UI/I | Reject / discard | Draft discarded; published intact |
| AI-06 | P0 | UI/I | Human edit after draft | Normal draft save; Publish still required for family visibility |
| AI-07 | P0 | I/S | Draft tool writes `*_published` | **Forbidden** (L-S1-09) |
| AI-08 | P0 | I/S | Ask publish (if exposed) args | `class_id` + region id + `row_version` **only** — **ignore** model-supplied body string; copy parked draft |
| AI-09 | P0 | S | Prefer UI RPC for publish | Security preference: omit Ask publish in v1 OR enforce no-body-arg rule |
| AI-10 | P0 | S | Capability | New `landing.manage` — teacher `own`; parent/student/office **`none`**; **not** `assignments.manage` (L-S1-01) |
| AI-11 | P0 | S | Client + Edge twins | Identical maps in `askToolPolicy.ts` both sides; unknown names denied |
| AI-12 | P0 | S | `teacherSeatOnly: true` | Office JWT not offered tools; do not weaken for dual-hat office |
| AI-13 | P0 | S | Student/parent JWT draft/publish | **Denied** before vendor |
| AI-14 | P0 | S | Teacher A + class B `class_id` | 403; no model call with foreign class context |
| AI-15 | P0 | U | Region id allow-list | Unknown id → deny; no free-form column write |
| AI-16 | P0 | S | AI never writes live-block tables | No INSERT/UPDATE `assignments` / `posts` / calendar / files / syllabus / roster |
| AI-17 | P0 | S | No class/student insert | Landing tools never call `create_class` / enroll / matcher student insert |
| AI-18 | P1 | S | Prompt contents | Class name + region id + current draft/published of **that region only** — no roster, grades, siblings, unpublished assignments, SIS/IEP (L-S1-12) |
| AI-19 | P1 | S | Do not copy homework first-name injection | Landing tools must not reuse homework Ask name injection pattern |
| AI-20 | P1 | S | Server-side keys only | Edge / `ai:dev`; never `EXPO_PUBLIC_*` |
| AI-21 | P1 | I | Audit | `write_audit('publish_class_landing_region', …)` with region id; snippets optional; **no** full body dump; **no** diary body |
| AI-22 | P1 | U | Tools registered | `draft_class_landing_region`, `discard_class_landing_region_draft`; publish UI-primary |
| AI-23 | P2 | — | Student-facing landing AI | Never |

### 2.2 Normative Ask policy (copy into future loop)

```
landing.manage: superintendent none, administrator none, teacher own, parent none, student none
  tools: draft_class_landing_region, discard_class_landing_region_draft
  teacherSeatOnly: true
  officeOnly: false
  run: class_teacher_of(class_id) or deny
  writes: matching *_draft only

landing.publish: same matrix; UI RPC primary
  Ask: omit in v1 OR args = class_id + region id + row_version only (copy parked draft)
```

Do **not** register tools until CEO says send.


## 3. Evidence (tests, RLS, dogfood)

### 3.1 L-S1 must-fix → acceptance map

Future loop fails if any **P0** row lacks evidence. Map 1:1 to LAND-S1 §2.4.

| ID | Sev | Type | Case | Evidence later |
|---|---|---|---|---|
| SEC-01 | P0 | S | L-S1-01 new `landing.manage` | Policy tests: student, parent, office, teacher-also-admin, teacher-parent — **none** offered draft under `assignments.manage` |
| SEC-02 | P0 | I | L-S1-02 family never SELECT table | Grants/policies: no student/parent table priv; RPC omits every `*_draft` |
| SEC-03 | P0 | I/S | L-S1-03 `class_teacher_of` writes | SQL review + office JWT denied on INSERT/UPDATE/DELETE |
| SEC-04 | P0 | I | L-S1-04 no fat-RPC bypass | Hidden quiz absent from family; school-wide posts absent; two DTOs |
| SEC-05 | P0 | UI/S | L-S1-05 text-node render | XSS fixture: region text `<script>…` renders as text, not script (web + WebView) |
| SEC-06 | P0 | I | L-S1-06 family due omitted | Fixture while `calendar_visibility` absent; **no scores** |
| SEC-07 | P0 | I | L-S1-07 files ≠ student work | Fixture omits submission/capture/key paths; omit block if no resource catalog |
| SEC-08 | P0 | I | L-S1-08 twin empty mash-up | Parent 2+ links + missing/unlinked child id → empty; child must be enrolled |
| SEC-09 | P0 | I/S | L-S1-09 draft-only AI + parked publish | Draft tool no UPDATE published; publish copies parked draft not model text |
| SEC-10 | P0 | S | L-S1-10 no public URL | Route + GRANT: `anon` 401 on table and RPCs; no JWT in query; no v1 storage |
| SEC-11 | P0 | S | L-S1-11 no class/student create | Static + RPC: landing never inserts classes/students |
| SEC-12 | P1 | S | L-S1-12 prompt hygiene | Prompt fixture + Edge: no roster/grades/siblings/unpublished; server keys |
| SEC-13 | P1 | I/S | L-S1-13 dual-hat isolation | Parent-hat no foreign drafts; teacher-hat no unlinked family kids |
| SEC-14 | P1 | S | L-S1-14 definer hygiene | `search_path=public`, revoke anon/public, `auth.uid()` not null, `row_version` |
| SEC-15 | P1 | S | L-S1-15 no parent_open stuffing | SQL + parent API review: do not stack `get_parent_card` / directory dumps |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied from LAND-S1 §2.6 — required evidence set when CEO says send:

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

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| RLS / RPC | JWT fixture matrix (teacher, co-teacher, other teacher, student, parent twin A/B, office, anon, dual-hat) |
| Ask policy | Unit tests on client + Edge twin maps (`landing.manage` matrix) |
| Serializer / DTO | Snapshot or field-allowlist tests: family vs teacher shapes |
| XSS / WebView | Scripted UI or component test with malicious plain-text payload |
| Live joins | Integration: unpublished assignment absent; `can_see_post` preserved |
| Desk regression | R: capture → match → Approve path unchanged; no grade controls on landing |
| Feed / posts | R: landing does not loosen `can_see_post` or invent school-wide feed |
| Calendar | R: no due rows copied into `class_landing`; join-only when CAL present |

### 3.4 Dogfood script (after CEO send — not this ticket)

1. Teacher opens Home on taught class; edits welcome draft; family (other device) still sees old/empty.
2. Confirm publish welcome; family refresh shows new text only.
3. NL verse update → preview → Confirm; only verse changes.
4. Parent with twins: switch child; landings never blend.
5. Pop quiz unpublished: family Home shows no title; teacher sees labeled.
6. Paste `<b>hi</b><script>alert(1)</script>` into welcome; family sees literal characters.
7. Office seat: no editor, no Ask tools.
8. Sign out: landing route 401 / redirect — no public document.

### 3.5 Regression guards (non-acceptance if broken)

| ID | Sev | Guard |
|---|---|---|
| R-01 | P0 | Desk grade loop (capture → match → Approve) unchanged by landing chrome |
| R-02 | P0 | Nothing becomes a grade from landing path |
| R-03 | P0 | Matcher still never inserts a student |
| R-04 | P0 | `posts` / assignment RLS not loosened for landing convenience |
| R-05 | P0 | No `EXPO_PUBLIC_*` model keys introduced |
| R-06 | P1 | No new public storage bucket for hero/files in v1 |
| R-07 | P1 | Calendar hybrid SoT preserved — landing does not invent event copies |


## 4. Acceptance

### 4.1 This ticket (LAND-Q1)

| Criterion | Status |
|---|---|
| `notes/company/class-landing-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in LAND-P1 / A1 / S1 (no invented product law) | **Met** |
| P0 matrix covers hats, twins, named regions, live joins, AI confirm, L-S1-01…15 | **Met** |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| No app code, SQL, migrations, Edge, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

**Audience:** CEO / Chief of Staff. **Not** an implementation ticket. Do **not** staff `senior-developer` or launch `kelyra-qa-loop` until Chuck writes **send**.

### 4.2 Non-acceptance (ship blockers even after a green unit suite)

A future build is **not** accepted if any of the following is true:

1. Family can `SELECT class_landing` or any RPC returns `*_draft`.
2. Writes or draft reads use `teaches_class` / `is_school_admin` instead of `class_teacher_of`.
3. Ask tools ship under `assignments.manage` or offer student/parent/office `own`/`school`.
4. Family due list shows unpublished/hidden quiz titles before CAL publish flag.
5. Landing payload includes scores, roster, classmate cells, or school-wide posts.
6. Parent twin views mash-up or omit required `p_child_student_id` with 2+ links.
7. Region text is interpolated as HTML / unescaped WebView markup.
8. AI auto-publishes or publish trusts model-supplied body text.
9. Public / pre-auth / anon class URL or JWT-in-query WebView.
10. Landing creates classes or students, or becomes the grade Approve path.
11. Files block exposes submissions, captures, or answer keys.
12. Developers self-certify without CEO send + this plan + loop evidence.

### 4.3 Open issues (not blockers for this acceptance plan)

| # | Question | Owner |
|---|---|---|
| 1 | Exact route `/class/:id/home` vs Class desk “Home” label (no 11th tab) | PM / CEO |
| 2 | Omit Ask publish entirely in v1 vs allow with no body arg | Architect / PM / Security preference: omit |
| 3 | Whether a class-resource file catalog exists to join; else files block stays omitted | Architect |
| 4 | `verse` empty allowed | Product — no security issue |
| 5 | A1 still needs Security’s five gap patches (XSS render, fat-RPC, files scope, Ask publish args, Edge matrix `none`) before build | Architect (LAND-S1 §0) |

### 4.4 Downstream

| Ticket / actor | Needs |
|---|---|
| CEO / CoS | Review this plan + P1/A1/S1 pack; **Chuck still must write send** |
| Architect | Fold L-S1 gaps into A1 before any SQL |
| Future `kelyra-qa-loop` | Execute §1–§3 matrices — **do not run now** |
| `senior-developer` | **Do not staff** until send |

### 4.5 Verdict

**Acceptance plan complete.** Ready for CEO/CoS review as the contract for a future authorized build loop.

**Not a send. Not a release. Not QA certification.**

**RECOMMENDED NEXT ACTION:** CoS surfaces this file with the LAND pack to Chuck. Hold eng. Do not launch kelyra-qa-loop from this ticket.
