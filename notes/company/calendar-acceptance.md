# CAL-Q1: Acceptance plan — calendar (not a Build send)

**Date:** 2026-09-04  
**Author:** qa-supervisor  
**Ticket:** t_6ee5c0ae  
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.  
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/calendar-plan.md` (CAL-P1) | Hats, filters, draft/publish, stories, v1 cut |
| `notes/company/calendar-architecture.md` (CAL-A1) | Hybrid SoT, RLS helpers, AI tools, phases A–E |
| `notes/company/calendar-security.md` (CAL-S1) | Must-fix CAL-S1-01…12 + future loop tests §3.1 |
| `notes/company/calendar-research.md` (CAL-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing iCal, Google sync, Diary-on-calendar, car-rider, or twin merge.

---

## 0. Scope — what “good” means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC/JWT fixture, or scripted UI check with artifact).
2. Every **CAL-S1-01…CAL-S1-12** security must-fix is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; hat walls + twins + hidden quizzes + absence over-read still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Calendar is a dated/span surface the **active seat** may see — not Diary, not car-rider, not Desk replacement. | P1 §0, A1 §0 |
| L2 | Hybrid SoT: `assignments.due_at` stays grade-book due; **do not copy dues into events**. Project when published. | A1 §2 |
| L3 | **Assign ≠ calendar publish.** Seeding submissions must not flip `calendar_visibility`. | P1 §6, A1 §2.1, S1-02 |
| L4 | Hidden quiz/test dues: **teacher of that class only** (`class_teacher_of`). Never student/parent/office. | P1 §4, S1-02 |
| L5 | **Never** reuse `teaches_class` for family/hidden calendar reads (ORs `is_school_admin` → office firehose). | A1 §3.1, S1-01 |
| L6 | Parent 2+ children: queries **require** focused `child_student_id`; missing → **empty**, never unlabeled twin merge. | P1 §4, S1-03 |
| L7 | Dual-hat queries by **chrome seat**, not job-of-record flags. | A1 §0, S1-04 |
| L8 | Parent absence/doctor: owner parents of C + teachers of **C’s enrollments** only. Not office, not other twin, not student v1, not Diary, not `/activity` existence audit. | P1 §7.3, S1-05 |
| L9 | AI search ⊆ already-visible set. AI add = **draft-then-Save**. Matcher never inserts students/classes; never Approves grades. | P1 §9, A1 §4, S1-06/07 |
| L10 | Filter chips / client hides are **not** security. Server predicates only. | S1-10 / T11 |
| L11 | Model keys server-side only. No `EXPO_PUBLIC_*` vendor tokens. | AGENTS + S1-11 |
| L12 | Projection rows carry **no** scores, draft answers, or classmate cells. | A1 §2.4, S1-10 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** hat surfaces; category chips; published `due_at` projection + hidden teacher layer; assignment toggle + Needs To-Do publish; `calendar_events` CRUD; parent child switcher; sport opt-in **read**; AI search then AI draft-add; honest “who can see this” copy; phases A–E per A1.

**Out of scope (do not fail v1 for missing):** iCal/Google two-way; rich recurrence; sports RSVP; envelope E2E; public anonymous URL; ANPR/car-rider; year view; push suite; student sees own absence; re-hide after publish (v1.1).

---

## 1. Hats / twins / publish

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (category map, visibility helpers, pure policy) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on desk / family / office |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (Desk Today, gradebook, Diary) |

### 1.1 Teacher hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| T-01 | P0 | UI/I | Open Calendar from Desk/drawer, active class | Active class + school layer; other classes hidden unless “All my classes”; 5th ≠ 3rd |
| T-02 | P0 | UI/I | Pop quiz + `due_at`, calendar hide default | Family queries empty; teacher calendar shows with hidden badge |
| T-03 | P0 | UI/I | Needs To-Do **Publish to calendar** | One tap → enrolled students/linked parents see item; To-Do clears; audit stamp `calendar_published_at/by` |
| T-04 | P0 | I | Assign-to-roster seeds submissions | `calendar_visibility` **unchanged** (assign ≠ publish) |
| T-05 | P0 | UI | Category chips multi-select | Prefs remember per seat; empty state explains filters |
| T-06 | P1 | UI | Web week/month/day/agenda; phone agenda+day first | Matches P1 §8; Desk Today/This week **unchanged** |
| T-07 | P0 | UI/I | Class event create (manual) | Bound to taught class via `class_teacher_of`; no class-create |
| T-08 | P0 | I/UI | Parent pull-out for student Johnny | Visible only if teacher of Johnny’s enrolled classes; not school-wide |
| T-09 | P0 | I/S | Teacher of class A reads class B hidden dues | **Denied** |
| T-10 | P1 | UI | Quiz/test default hide; homework/lesson default publish | Defaults locked per A1 §2.1 |
| T-11 | P1 | I | Co-teacher with `class_teachers` row | Can read/write class calendar; without row denied |
| T-12 | P0 | I | Teacher cannot delete office school event | Write denied |

### 1.2 Student hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| S-01 | P0 | I/UI | Agenda | School + enrolled **published** work/lessons + own study; no other students; no hidden quizzes; no teacher personal |
| S-02 | P0 | I | Hidden quiz due in enrolled class | **Absent** from student RPC |
| S-03 | P0 | UI/I | Add personal study block | Owner only; category `study`; not Diary |
| S-04 | P0 | I/S | Student INSERT `visibility_scope=school` or foreign class | **Denied** |
| S-05 | P1 | UI | NL “what’s due Friday” | Hat-scoped published only |

### 1.3 Parent hat + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| P-01 | P0 | UI/I | 2+ linked children | Mandatory child switcher; calendar scoped to focused child only |
| P-02 | P0 | I | Child A selected; request child B id | Fail closed empty/403; no blend |
| P-03 | P0 | I | Missing/invalid `p_child_student_id` with 2+ links | **Empty** set — never mash-up (CAL-S1-03) |
| P-04 | P0 | UI/I | Doctor pull-out Save for Johnny | Visible to owner parents of Johnny + teachers of Johnny’s classes only |
| P-05 | P0 | I | Same pull-out vs other twin Sydnee | Sydnee agenda/search/Ask **must not** include Johnny’s absence |
| P-06 | P0 | I | Office JWT SELECT parent absence | **Zero rows** |
| P-07 | P0 | I | Student JWT SELECT own absence (v1) | **Zero rows** (A1/S1 agree No) |
| P-08 | P0 | I | Unlink child | Absence rows for that child **deleted** (not SET NULL orphan) |
| P-09 | P0 | I | Hidden quiz on child’s class | Parent never sees |
| P-10 | P1 | UI | Filters hide homework, keep school/sport | Chips only; defaults per P1 §5 |
| P-11 | P1 | UI | “Who can see this” copy on absence | Honest: teachers of this child’s classes — not legal claim |

### 1.4 Office hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| O-01 | P0 | UI/I | School event CRUD (holiday, early release) | All hats see when published; teachers cannot delete |
| O-02 | P0 | I/S | Default office calendar / `list_calendar_items` | School-scope only — **zero** homework, hidden quizzes, parent absences, teacher `self` |
| O-03 | P0 | S | Calendar read path uses `teaches_class` | **Forbidden** — fail review if present (CAL-S1-01) |
| O-04 | P1 | I | Class field trip not marked school | Class-scoped; office does not get class dump unless school-marked |
| O-05 | P1 | UI | NL “early releases this semester” | School events only; no doctor notes |

### 1.5 Dual-hat + seat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | I/S | Teacher+parent, parent chrome | `parent_students` only; cannot read other teachers’ hidden quizzes |
| X-02 | P0 | I/S | Same profile, teacher chrome | Taught classes via `class_teacher_of`; cannot family-read unlinked kids |
| X-03 | P0 | I/S | Office chrome without `class_teachers` | No hidden-due read (CAL-S1-04) |
| X-04 | P1 | UI | Seat switch reloads query | No silent cross-read residual rows |

### 1.6 Publish / projection rules

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| V-01 | P0 | U/I | `calendar_visibility=hidden` | Teacher yes; student/parent/office no |
| V-02 | P0 | U/I | `calendar_visibility=published` | Family per enrollment / parent_progress shape |
| V-03 | P0 | U | No `due_at` | Not a dated calendar item |
| V-04 | P0 | I | Assignment delete | Projection gone (no orphan event copy) |
| V-05 | P0 | U/I | Hybrid SoT | No duplicate due rows in `calendar_events` for ordinary dues |
| V-06 | P0 | I | Event `status=draft` | Creator only — not office, co-teachers, family |
| V-07 | P0 | I | Sport team membership | Opt-in only; class roster copy **must not** imply team calendar (CAL-S1-09) |
| V-08 | P0 | U/I | Serializer on assignment projection | Title + due + category + visibility only — **no** `approved_score`, `draft_score`, `answers`, classmates |
| V-09 | P1 | UI | Coming due chips (student/parent) | Published only; teacher may see hidden with badge |
| V-10 | P2 | — | Re-hide after publish | v1.1; if shipped early, family must drop row immediately |


## 2. AI search/add

### 2.1 Capability lock

| Future tool | Seat | Capability | Behavior gate |
|---|---|---|---|
| `calendar_search` | Current chrome | New **`calendar.read`** (not `assignments.manage`) | Parse range/category/class/child → filter **already-visible** rows. Never elevates. |
| `calendar_draft_event` | Seat-scoped create | New **`calendar.write`** (not `assignments.manage`) | Returns **draft** only. Persist to audience on user Save. |

Hard rules (any counterexample = fail):

1. Client `askToolPolicy` + Edge twin **identical**; unknown names denied; `filterAskToolDefs` after `getUser` + profile — never trust `body.tools` / `body.role`.
2. Keys never `EXPO_PUBLIC_*`.
3. Matcher may **guess** `student_id` against allowed roster only (parent: linked children; teacher: taught-class roster). Ambiguous (“Johnny” × twins) → confirm UI, do not pick. No match → null or refuse — **never INSERT `students`**.
4. Never `create_class`, `link_parent_student`, `approved_score`, or invent grade columns from NL (“add a test Friday”).
5. School-wide blast refused unless office creates `visibility_scope=school` — refuse with copy, not silent no-op.
6. Dual-hat: tool seat = signed-in chrome, then SQL walls.
7. Do **not** `write_audit` parent doctor notes onto Office `/activity`.
8. `source=ai_nl` is support metadata only.

### 2.2 AI test matrix

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AI-01 | P0 | S | Tools hung on `assignments.manage` | **Fail** — must be `calendar.read` / `calendar.write` |
| AI-02 | P0 | S | Student offered school/class draft | Denied; student write = `self` study only |
| AI-03 | P0 | S | Office draft `student_teachers` absence | **Denied** |
| AI-04 | P0 | S | Unknown tool name | Denied both client + Edge |
| AI-05 | P0 | I | `calendar_search` result set | Strict subset of `list_calendar_items` for same seat/filters |
| AI-06 | P0 | I | Teacher search “math quizzes next week class B” while in class A | No class B leak unless “all my classes” + membership |
| AI-07 | P0 | I | Parent search with focused child A | No child B events; no hidden quizzes; no other families |
| AI-08 | P0 | I | Office search | School events only — no homework/absence/`self` |
| AI-09 | P0 | UI/I | Parent NL doctor pull-out | Draft `category=absence`, `visibility_scope=student_teachers`, `student_id=C` after confirm; Save → audience per L8 |
| AI-10 | P0 | UI/I | Teacher NL “Field trip Friday 9–2 this class” | Draft bound to active/taught class; Save publishes class scope; no enroll |
| AI-11 | P0 | UI | NL “Johnny” with two linked children | Confirm picker; no auto-pick; no student insert |
| AI-12 | P0 | U/I | NL “add Maya” with no roster match | Refuse or null `student_id` — **zero** `students` INSERT |
| AI-13 | P0 | U/I | NL “put on everyone’s calendar” (non-office) | Refuse copy; no school blast |
| AI-14 | P0 | U/I | NL “add a test Friday” (parent) | Refuse inventing grade column; may link existing assignment only if allowed |
| AI-15 | P0 | S | Draft before Save | Not visible to audience until Save; draft = creator only |
| AI-16 | P0 | S | AI path never writes `approved_score` | Static + RPC |
| AI-17 | P1 | S | Logs / vendor | Server keys; paid no-training; logs = ids not health text bodies (CAL-S1-11) |
| AI-18 | P1 | UI | Student NL search “due Friday” | Published own items only |
| AI-19 | P2 | — | Recurring “every Tuesday practice” | Later; v1 single instance OK |

### 2.3 AI refuse catalog (copy must exist)

| Refuse trigger | Copy intent (not final strings) |
|---|---|
| School-wide blast (non-office) | Must create as office school event or refuse |
| Twin ambiguity | Which child? confirm |
| No roster match for named student | Cannot invent students |
| Grade Approve / score write | Calendar does not grade |
| Class create | Office owns directory |
| Diary auto-file | Use Diary separately |
| Notify all parents | Out of scope |


## 3. Evidence (tests, RLS, dogfood)

### 3.1 Security must-fix → evidence map

Map 1:1 to CAL-S1-01…12. Future loop fails if any **P0** missing.

| ID | Sev | CAL-S1 | Case | Evidence required later |
|---|---|---|---|---|
| SEC-01 | P0 | S1-01 | No `teaches_class` on family/hidden reads | SQL review + office JWT: zero homework/hidden |
| SEC-02 | P0 | S1-02 | Hidden dues `class_teacher_of` only; assign ≠ publish | Student/parent RPC empty for hidden quiz; submission seed unchanged |
| SEC-03 | P0 | S1-03 | Parent 2+ children missing child → empty | Parent JWT fixtures (P-03) |
| SEC-04 | P0 | S1-04 | Dual-hat by chrome seat | Teacher-parent matrix (X-01…X-03) |
| SEC-05 | P0 | S1-05 | Absence: C’s teachers only; no office; no `/activity`; delete on unlink | Unlink + office SELECT + activity scan |
| SEC-06 | P0 | S1-06 | Ask caps `calendar.read`/`calendar.write`; not `assignments.manage` | `askToolPolicy` student/parent/office/dual-hat |
| SEC-07 | P0 | S1-07 | Matcher never inserts students/classes; no grade Approve | Static + RPC (AI-12, AI-16) |
| SEC-08 | P0 | S1-08 | `list_calendar_items` DEFINER hygiene | `search_path=public`, `auth.uid()`, revoke anon, predicates inside; IDOR fixtures |
| SEC-09 | P0 | S1-09 | Draft=creator; sport opt-in never roster-copied; student no school/class write | RLS tests (V-06, V-07, S-04) |
| SEC-10 | P0 | S1-10 | Chips not security; projection no scores/drafts/classmates | Serializer fixtures + chip-change ≠ RPC set |
| SEC-11 | P1 | S1-11 | Server-side AI keys; logs = ids not bodies | Edge + `ai:dev` |
| SEC-12 | P1 | S1-12 | Co-teachers via `class_teacher_of`; office≠delete teacher personal; teachers≠delete office school | Write tests |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied/affirmed from CAL-S1 §3.1 — mandatory when Chuck says send:

1. Office JWT: `list_calendar_items` = school-scope only — zero homework, hidden quizzes, parent absences, teacher `self`.
2. Student JWT: hidden quiz absent; published enrolled homework present; cannot INSERT school/class events.
3. Parent JWT: child A cannot fetch child B; missing `p_child_student_id` with 2+ links → empty; unlink deletes absence.
4. Teacher of class A cannot read class B hidden dues or class B events.
5. Dual-hat: parent chrome ≠ teacher chrome (CAL-S1-04).
6. `calendar_search` / `calendar_draft_event` denied for unknown names; not on `assignments.manage`; student cannot draft school; office cannot draft `student_teachers` absence.
7. NL “Johnny” with two linked children → confirm, no insert.
8. DEFINER: attacker `p_child_student_id` of unlinked student → empty; `anon` cannot execute.
9. Serializer: no `approved_score`, `draft_score`, `answers`, classmate names.
10. Sport: class roster membership does not imply team calendar rows.
11. `write_audit` / `/activity` has no parent-absence existence row.
12. Client chips changing does not change RPC row set (security is server).

### 3.3 RLS / helper regression risks

| Risk | Why it bites | Guard IDs |
|---|---|---|
| Reuse `teaches_class` / `assignments_via_class` | Office homework + hidden quiz firehose | O-02, O-03, SEC-01 |
| Client-only filter security | Modified Expo / network tab wins | SEC-10, L10 |
| DEFINER confused deputy | Cross-child / cross-class IDOR | SEC-08 |
| Extend `student_gradebook` as-is | Draft answers ride the row | V-08, SEC-10 — **calendar projection only** |
| Assign path flips visibility | Pop-quiz law dies | T-04, V-01, SEC-02 |
| Twin mash on missing child | Classic FERPA over-read | P-01…P-05, SEC-03 |
| Dual-hat job-of-record bypass | Parent seat sees teacher hidden | X-01…X-03, SEC-04 |
| Absence → office activity | Existence leak of health note | P-06, SEC-05, AI refuse audit |
| Ask on `assignments.manage` | Students get calendar write; office school drafts of absences | AI-01…AI-03, SEC-06 |
| Sport auto-join from roster | Unconsented PII to parents | V-07, SEC-09 |
| Diary table reuse / Feed overload | Wrong product + confused deputy | L1, R-* |
| Desk rewrite as month grid home | TEACH-UX regression | T-06, R-01 |

### 3.4 Regression vs frozen surfaces

| ID | Sev | Type | Surface | Expected |
|---|---|---|---|---|
| R-01 | P0 | R/UI | Teacher Desk Today / This week / Needs | Unchanged primary IA; Calendar adjacent only |
| R-02 | P0 | R | Gradebook / Approve path | Calendar never writes `approved_score` |
| R-03 | P0 | R | Diary / ledger | Calendar add ≠ diary entry; no shared table |
| R-04 | P0 | R | Matcher / capture | Still never inserts students (calendar AI same law) |
| R-05 | P1 | R | Coming due chips | Student/parent = published only after feature lands |
| R-06 | P1 | R | Car-rider / ANPR | **Absent** from calendar schema and events |
| R-07 | P1 | R | Author `publish_lesson_pack` | Diff empty re: calendar fields unless explicitly staffed |

### 3.5 Process adequacy (how a future loop must run)

#### 3.5.1 Not this ticket

- Do **not** staff implementer/QA/verify children from Q1.
- Do **not** call `kelyra-qa-loop` until Chuck says **send**.
- Do **not** self-certify on green typecheck alone.

#### 3.5.2 After CEO send (recommended loop shape)

| Phase | Owner pattern | Must produce |
|---|---|---|
| A — columns + RLS + list RPC + teacher web read | kelyra-qa-loop | Migrations; `class_teacher_of` paths; O-02/T-01/T-02 fixtures |
| B — publish toggle + To-Do + family read | Same or follow-on | T-03/T-04, S-01/S-02, P-09, V-* |
| C — `calendar_events` + office + parent absence | Same | O-01, P-04…P-08, SEC-05 |
| D — filter prefs + sport opt-in read | Same | T-05, V-07 |
| E — Ask search then draft-add | Separate if needed | AI-* + SEC-06/07 |
| Security pass | Loop security stage + this matrix | CAL-S1-01…12 checked with paths |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

#### 3.5.3 Evidence package (minimum for CoS when shipping)

1. Automated tests mapped to matrix IDs (T/S/P/O/X/V/AI/SEC/R).
2. JWT fixture dumps (redacted): office empty firehose; parent twin empty; teacher A≠B; dual-hat seat split.
3. SQL review note: zero `teaches_class` on calendar family/hidden paths.
4. Statement: hybrid SoT — no due-copy into events for ordinary assignments.
5. Statement: Ask caps are `calendar.*`, not `assignments.manage`; client/Edge twins match.
6. Statement: no `/activity` parent-absence rows; unlink deletes absences.
7. Dogfood notes: teacher pop-quiz hide→publish; parent doctor pull-out; child switcher.
8. Open P1/P2 waivers explicitly named — none silent.

#### 3.5.4 Recurring defect watch (post-ship)

1. `teaches_class` / office firehose drift  
2. Assign≠publish / hidden quiz leak  
3. Twin mash / missing child union  
4. Absence over-read or activity existence leak  
5. Ask capability mis-map / matcher student insert  
6. Client chips treated as security  
7. Projection score/draft leak  

### 3.6 Dogfood scripts (manual, after send)

| Script | Hats | Pass bar |
|---|---|---|
| DF-1 Pop quiz | Teacher → Student → Parent | Hidden until Publish To-Do; then both family hats see; office never sees as homework dump |
| DF-2 Twins | Parent Saydee/Sydnee | Switcher required; doctor on Saydee never on Sydnee agenda/search |
| DF-3 Dual-hat | Teacher-parent seat flip | Teacher calendar ≠ parent child calendar; no residual rows |
| DF-4 Office school day | Office + Teacher + Parent | Holiday visible; no parent doctor in office calendar |
| DF-5 AI draft | Parent + Teacher | Draft sheet → Save; refuse school blast; twin confirm |


## 4. Acceptance

**Audience:** CEO / Chief of Staff. **This ticket is not a send.**

### 4.1 Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| Teacher stories US-T-CAL-1…8 | T-01…T-12, V-* |
| Student stories US-S-CAL-1…3 | S-01…S-05 |
| Parent / twin stories US-P-CAL-1…4 | P-01…P-11 |
| Office stories US-O-CAL-1…3 | O-01…O-05 |
| Dual-hat US-X-CAL-1 | X-01…X-04 |
| Draft/hidden vs published + To-Do | T-02…T-04, V-01…V-05 |
| AI NL search + add + refuse | AI-01…AI-19 |
| Helper lock / no `teaches_class` | O-03, SEC-01, L5 |
| Absence FERPA walls | P-04…P-08, SEC-05, L8 |
| Ask new caps | AI-01, SEC-06 |
| DEFINER / serializer | SEC-08, SEC-10, V-08 |
| CAL-S1 must-fix 01–12 | SEC-01…SEC-12 |
| CAL-S1 §3.1 tests | §3.2 checklist |
| Frozen Desk / Diary / grades | R-01…R-07 |
| v1 vs later cut | §0.2; AI-19; V-10 |

### 4.2 Explicit non-acceptance (instant fail)

Any of the following in a candidate build = **fail**, regardless of other greens:

1. Using `teaches_class` (or equivalent admin-OR) for family calendar reads or hidden dues.
2. Office homework / hidden-quiz / parent-absence / teacher-`self` row dump on default calendar.
3. Student or parent seeing `calendar_visibility=hidden` dues (pop-quiz leak).
4. Assign-to-roster or submission seed flipping calendar publish.
5. Parent multi-child unlabeled merge, or missing `child_student_id` returning a union.
6. Dual-hat query by job-of-record flags instead of chrome seat.
7. Parent absence visible to office, other twin, student (v1), school firehose, or `/activity` existence audit; unlink leaves orphan school-visible row.
8. Ask tools on `assignments.manage`; search elevating privilege; draft auto-published without Save.
9. Matcher INSERT into `students` or `classes`; NL grade Approve / invented test column.
10. Client chips as sole security; wide client SELECT then filter.
11. Calendar projection carrying scores, draft answers, or classmate cells.
12. Sport team membership auto-copied from class roster.
13. `EXPO_PUBLIC_*` model keys.
14. Diary-on-calendar, car-rider/ANPR on events, or public anonymous calendar URL in v1.
15. Implementation started without CEO written **send**.

### 4.3 Gate status

| Item | Status |
|---|---|
| Spec pack on disk (P1, A1, S1, R1) | Yes |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for calendar | **Forbidden** until CEO send |
| Self-certify by developers | **Forbidden** |
| Eng staffing | **Hold** |

### 4.4 Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not a narrative “looks good.”
2. **Hats / twins / publish** and **AI search/add** are first-class P0 evidence domains equal to RLS.
3. CAL-S1 §3.1 tests and must-fix 01–12 are incorporated by reference as mandatory future loop cases.
4. Hybrid SoT and `class_teacher_of` vs `teaches_class` split are acceptance axioms (L2, L5).
5. Plan only — no code, no loop, no SQL, no git push from this card.

### 4.5 Open issues (do not block this plan; still block ship if unresolved at send)

| # | Issue | Owner at send |
|---|---|---|
| 1 | Exact Ask capability names (`calendar.read`/`write` vs one cap) — **semantics locked** in S1 §2.3 | Architect when staffed |
| 2 | Student sees own absence in v1? A1/S1 = **No** | PM / CEO if reopen |
| 3 | Re-hide after publish = v1.1 | Product |
| 4 | Default hide quiz/test — A1 agrees with PM | Locked unless CEO rejects |
| 5 | Soft FERPA / no school-official claim until DPA | Unchanged |

### 4.6 Sources

- CAL-P1 `notes/company/calendar-plan.md` — hats, filters, publish, AI stories, v1 cut  
- CAL-A1 `notes/company/calendar-architecture.md` — hybrid SoT, helpers, phases A–E  
- CAL-S1 `notes/company/calendar-security.md` — threats, must-fix, §3.1 tests  
- CAL-R1 research (context)  
- Live ground: `docs/data-model.md`, `teaches_class` vs `class_teacher_of`, `askToolPolicy.ts`  
- Prior QA plan shape: `notes/company/avg-spec-acceptance.md`  

---

**RECOMMENDED NEXT ACTION:** CoS/CEO review of the calendar pack (plan + architecture + security + this acceptance). **Do not** implement. **Do not** run kelyra-qa-loop. Hold `senior-developer` until Chuck says send.

### Handoff

- **OBJECTIVE:** Release-level acceptance plan for calendar v1 (evidence contract if CEO later says send).  
- **CONTEXT:** CAL-P1 / A1 / S1 pack; twin walls; assign≠publish; AI draft-then-Save.  
- **WORK PERFORMED:** Wrote `notes/company/calendar-acceptance.md` (laws, hat/twin/publish matrix, AI matrix, SEC map, process, non-acceptance, gate).  
- **VERIFICATION:** File on disk; no SQL; no app code; no kelyra-qa-loop.  
- **RESULT:** Plan only — ready for CEO/CoS; not implementation.  
- **OPEN ISSUES:** §4.5  
- **ESCALATION NEEDED:** No unless CEO rejects helper split or hybrid SoT.  
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing and qa-loop.
