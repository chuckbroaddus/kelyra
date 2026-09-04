# LPLAN-Q1: Acceptance plan — lesson plans (not a Build send)

**Date:** 2026-09-04  
**Author:** qa-supervisor  
**Ticket:** t_6fa368e8  
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.  
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/lesson-plan-plan.md` (LPLAN-P1) | Hats, fields, AI draft, calendar/diary joins, v1 cut |
| `notes/company/lesson-plan-architecture.md` (LPLAN-A1) | `lesson_plans` entity, RLS/RPC, Ask cap, CAL projection |
| `notes/company/lesson-plan-security.md` (LPLAN-S1) | Must-fix LPLAN-S1-01…14 + future loop tests §3.1 |
| `notes/company/lesson-plan-research.md` (LPLAN-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing co-teacher edit, office rewrite, family calendar occupancy, diary-on-plan, Author HTML packs, or class-create.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC/JWT fixture, or scripted UI check with artifact).
2. Every **LPLAN-S1-01…LPLAN-S1-14** security must-fix is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; owner walls + twins + family RPC allow-list + no `teaches_class` still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Lesson plan is a teacher-owned **accreditation working record** + day-of **run-of-show** — not Author HTML, not Diary, not Feed, not a grade-book column. | P1 §0, A1 §0 |
| L2 | New **`lesson_plans`** entity. Do **not** overload `assignments` (those seed submissions and become grades after Approve). Optional links only. | A1 §2, S1-12 |
| L3 | Full-body SELECT = **`owner_profile_id = auth.uid()` only**. Co-teacher / office / parent / student / sub: **no** table SELECT. Stricter than syllabus. | A1 §3.1, S1-02 |
| L4 | Writes: owner **and** still **`class_teacher_of(class_id)`**. Leave class → keep own SELECT, **lose write**. Never `teaches_class` / `is_staff` / `is_school_admin`. | A1 §3, S1-01 |
| L5 | Family path = SECURITY DEFINER RPC only. v1 payload: **title + parent_summary** (+ span/published_at). Never procedures / differentiation / teacher_notes / materials dump. | A1 §3.2, S1-03 |
| L6 | **Publish ≠ share.** Share is a separate confirm. Unpublish → `draft` **and** clear `summary_shared_at`. | A1 §2.2/3.3, S1-08 |
| L7 | AI drafts only. No `publish_lesson_plan` Ask tool. Edge does **not** UPDATE `lesson_plans`. Never auto-publish or silent calendar write. | P1 §5, A1 §4, S1-11 |
| L8 | New capability **`lesson_plan.manage`** (own / teacherSeatOnly; office none). **Not** `assignments.manage`. | A1 §3.4, S1-04 |
| L9 | Parent 2+ children: family RPC **requires** focused `p_student_id`; missing → **empty**, never twin mash-up. Student JWT: **deny** RPC v1. | A1 §3.2, S1-05 |
| L10 | Calendar join = **projection** `source_kind=lesson_plan`, category **`plan`** (not `lesson` pack chip). Family CAL occupancy **no in v1**. No body copy onto `calendar_events`. | A1 §5.1, S1-10 |
| L11 | Diary stays separate. Reflection FK lives on diary later. Plan may deep-link Reflect; never store diary prose on the plan row. | P1 §6, A1 §5.2 |
| L12 | Model keys server-side only. No `EXPO_PUBLIC_*` vendor tokens. Paste-only prompt context; no roster/IEP/sibling scrape. | AGENTS + S1-13 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** core fields + draft/publish/archive; copy-forward; AI structured draft → Save draft → human Publish; span columns; teacher calendar projection contract; parent summary RPC; Ask `draft_lesson_plan` only; owner-only RLS; LPLAN-S1 must-fix.

**Out of scope (do not fail v1 for missing):** office published-plan list; co-teacher shared edit; sub cover SELECT; family calendar title chip; attachments bucket; school templates table; Cognia taught-vs-planned export; recurring unit wizard; hard district standards lock; public unauthenticated URL.

---

## 1. Owner / publish / parent summary

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (status machine, allow-list, pure policy) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on desk / family / phone |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (Desk grade loop, assignments, Author packs, Diary) |

### 1.1 Teacher hat (owner)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| T-01 | P0 | UI | Open Plans from taught-class desk | Plans segment under Teaching/Desk — not an 11th tray tab; not grade loop |
| T-02 | P0 | UI/I | Create blank plan for taught class | `status=draft`, `owner_profile_id=auth.uid()`, `class_id` bound; AI never invents class |
| T-03 | P0 | UI/I | Save draft core fields (§4 P1) | Draft only; family RPC empty; no calendar family chip |
| T-04 | P0 | UI/I | Publish | Working record; ledger action `plan`; does **not** share summary; does **not** seed submissions |
| T-05 | P0 | UI/I | Share parent summary (separate confirm) | Requires published + non-empty `parent_summary`; stamps `summary_shared_at/by` |
| T-06 | P0 | UI/I | Unpublish | → `draft`; clears `summary_shared_at`; CAL join gone; family RPC empty immediately |
| T-07 | P0 | UI/I | Archive | → `archived`; same hide as unpublish for non-owner |
| T-08 | P0 | UI/I | Copy-forward | New id, `status=draft`, `source=copy`; **clears** publish/share timestamps; target class still `class_teacher_of` |
| T-09 | P0 | I | Teacher of class A writes class B plan | **Denied** |
| T-10 | P0 | I | Owner who left the class | SELECT own rows yes; UPDATE/publish **no** |
| T-11 | P0 | I/S | Co-teacher with `class_teachers` but not owner | **No** full-body SELECT; **no** UPDATE (LPLAN-S1-02) |
| T-12 | P0 | I/S | Write path uses `teaches_class` | **Forbidden** — fail review if present (LPLAN-S1-01) |
| T-13 | P0 | U/I | Direct UPDATE `status` / `summary_shared_at` as authenticated | **Denied** — RPCs own those columns (LPLAN-S1-07) |
| T-14 | P0 | U/I | `save_lesson_plan_draft` sets published or share | **Forbidden** |
| T-15 | P1 | UI | Day-of run-of-show (web + phone) | Timing + materials + next step; no Approve grades from here |
| T-16 | P1 | UI | Standards empty on publish | Soft **warn**, not hard-block in pilot |
| T-17 | P1 | UI | Optional links to assignment / Author pack | Ids only; no body copy; missing target shows “removed” |
| T-18 | P1 | I | Optimistic `row_version` | Stale publish rejected |
| T-19 | P2 | UI | Print / export published plan | Browser print OK v1; sub packet later |

### 1.2 Student hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| S-01 | P0 | I/S | Student SELECT `lesson_plans` | **No privilege** |
| S-02 | P0 | I/S | Student call `family_lesson_plan_summary` | **Deny** v1 (product law “no plan body”) |
| S-03 | P0 | I/S | Student invoke draft/publish/Ask plan | **Denied** |
| S-04 | P0 | I | Student sees assigned work via existing surfaces | Unchanged — plan does not replace assignments |
| S-05 | P1 | UI | No plan editor chrome | Read-only elsewhere; no Save/Publish/Share |

### 1.3 Parent hat + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| P-01 | P0 | I/S | Parent SELECT `lesson_plans` table | **No privilege** — drafts/procedures never leak |
| P-02 | P0 | I | Published + shared summary; linked child enrolled | RPC returns **title + parent_summary** (+ span/published_at only) |
| P-03 | P0 | I | Published but **not** shared / empty summary | RPC **empty** |
| P-04 | P0 | I | Draft or archived plan | RPC **empty** |
| P-05 | P0 | I | 2+ linked children; missing/invalid `p_student_id` | **Empty** — never mash-up (LPLAN-S1-05) |
| P-06 | P0 | I | Child A selected; request child B | Fail closed empty/403; no blend |
| P-07 | P0 | I | Child not enrolled in `p_class_id` | Empty |
| P-08 | P0 | U/I | RPC serializer | **Never** returns procedures, differentiation, teacher_notes, materials dump, standards dump, links, source, owner id |
| P-09 | P0 | I | Unlink child | Next RPC empty for that child |
| P-10 | P1 | UI | Cache key includes class + hat + child | No stale sibling payload after switch |
| P-11 | P1 | UI | “Who can see this” copy on share | Honest: linked guardians of enrolled child — not legal E2E claim |

### 1.4 Office / substitute / other teacher

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| O-01 | P0 | I/S | Office JWT table SELECT / family RPC / Ask draft | **Zero** rows; tools denied |
| O-02 | P0 | S | Plan path uses `is_school_admin` / `teaches_class` / `is_staff` | **Forbidden** |
| O-03 | P0 | UI | Office directory | **No** plan editor in v1 |
| O-04 | P0 | I | Other teacher (not owner, not same class) | No SELECT / write |
| O-05 | P1 | — | Sub cover SELECT | **Parked** v1; owner print/export only |
| O-06 | P2 | — | Office published-plan list | Later; still must not dump differentiation without product decision |

### 1.5 Dual-hat + seat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | I/S | Teacher+parent, parent chrome | Family RPC only; cannot read other teachers’ full bodies on child’s class |
| X-02 | P0 | I/S | Same profile, teacher chrome | Own plans of taught classes via owner + `class_teacher_of`; not unlinked kids’ family mash |
| X-03 | P0 | I/S | Office chrome without teach row | No plan write / Ask (LPLAN-S1-10) |
| X-04 | P1 | UI | Seat switch reloads query | No silent cross-hat residual rows |

### 1.6 Publish / share / status rules

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| V-01 | P0 | U | Status machine | `draft` \| `published` \| `archived` only |
| V-02 | P0 | U/I | Publish does not set `summary_shared_at` | Share is separate RPC/confirm |
| V-03 | P0 | U/I | Unpublish unshares | `summary_shared_at` NULL; family gone |
| V-04 | P0 | U/I | Share no-ops if not published or summary empty | No silent stamp |
| V-05 | P0 | I | Publish ≠ assign | Zero `submissions` INSERT; zero `approved_score` write |
| V-06 | P0 | I | Plan ≠ assignment overload | No reuse of `assignments` row as plan body |
| V-07 | P0 | I | Soft links | Assignment/pack delete does **not** cascade-delete plan |
| V-08 | P0 | U | Required instructional fields on publish | Title + objectives + materials + procedures + assessment + differentiation present (standards soft-warn) |
| V-09 | P1 | U/I | `source` stamp | `blank` \| `copy` \| `ai_draft`; support metadata only |
| V-10 | P1 | I | Class delete | Plans cascade with class |
| V-11 | P2 | — | Co-own / specialist share | Out of v1 |

### 1.7 AI draft (confirm-before-publish)

CEO bar (LPLAN-R1 / P1 §5): topic/unit/standards/grade/class → structured draft fields → teacher edit → **human Publish**. Never auto-publish. Never invent class. Never Ask-as-superuser.

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AI-01 | P0 | UI/I | Teacher “Draft plan” with taught class | Matcher binds **one** class via `class_teacher_of`; returns structured JSON to editor |
| AI-02 | P0 | UI | Unassigned / ambiguous class | Picker — never invent `class_id` |
| AI-03 | P0 | UI/I | Save after AI | `save_lesson_plan_draft` with `source=ai_draft`; status stays `draft` |
| AI-04 | P0 | UI/I | Publish | Separate UI button / RPC only — model and Ask **must not** call publish |
| AI-05 | P0 | S | Ask tool set | `draft_lesson_plan` only; **no** `publish_lesson_plan` tool; unknown denied |
| AI-06 | P0 | S | Capability | New `lesson_plan.manage` teacherSeatOnly — **not** `assignments.manage` (LPLAN-S1-04) |
| AI-07 | P0 | S | Client + Edge twins | Identical maps; never trust `body.tools` / `body.role` |
| AI-08 | P0 | S | Student/parent/office JWT draft | **Denied** before vendor |
| AI-09 | P0 | S | Teacher A + class B | 403; no model call with foreign class context |
| AI-10 | P0 | S | Edge `draft-lesson-plan` | JWT + `class_teacher_of` **before** vendor; returns JSON only; **must not** UPDATE `lesson_plans` |
| AI-11 | P0 | S | No class/student insert; no grade Approve | Matcher + static + RPC (LPLAN-S1-11/12) |
| AI-12 | P0 | S | No silent span/calendar write or parent share from AI | Draft park only |
| AI-13 | P1 | S | Prompt hygiene | Paste-only topic/unit/standards/grade/optional syllabus excerpt — no roster names, grades, IEP full text, siblings, doctor notes, diary body |
| AI-14 | P1 | S | Server-side keys only | Edge / `ai:dev`; never `EXPO_PUBLIC_*`; company TTS not this path |
| AI-15 | P1 | S | Logs | request id, uid, class_id, latency, error class — **not** prompt/completion, differentiation, teacher_notes |
| AI-16 | P1 | I | Ledger / audit | No `write_ledger` until Publish; no `write_audit` drafts/share onto Office `/activity` |
| AI-17 | P2 | — | Student-facing plan AI | Never |

### 1.8 Normative Ask policy (copy into future loop)

```
lesson_plan.manage: superintendent none, administrator none, teacher own, parent none, student none
  tools: draft_lesson_plan
  teacherSeatOnly: true
  officeOnly: false
  run: class_teacher_of(class_id) or deny
  writes: none from Ask — returns JSON to editor; Save = save_lesson_plan_draft

publish_lesson_plan: UI RPC only — not an Ask tool
share_lesson_plan_summary / unshare: UI RPC only — separate confirm
```

Do **not** register tools until CEO says send.


## 2. Calendar join / diary not on plan

Do not rebuild CAL or DIARY. Plans are the **canonical body**. Others **reference**.

### 2.1 Calendar projection (CAL-P1 join)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| C-01 | P0 | U/I | Join key | `source_kind='lesson_plan'`, `source_id=plan.id`, span from plan columns, category **`plan`** |
| C-02 | P0 | I | No dual-write body | **No** INSERT of plan title/procedures onto `calendar_events` as a copied event body |
| C-03 | P0 | U | Category split | Category **`plan`** ≠ CAL `lesson` chip (`assignments.kind=lesson` / Author packs) |
| C-04 | P0 | I | Draft, no span | Library only; no family/office calendar row |
| C-05 | P0 | I | Draft + span | **Owner teacher** calendar only (hidden from family) |
| C-06 | P0 | I | Published + span | Teacher calendar yes; **family calendar occupancy no in v1** (LPLAN-S1-10 / T13) |
| C-07 | P0 | I | Published, no span | Library; calendar silent |
| C-08 | P0 | I | Unpublish / archive | Join **gone immediately** for non-owner; family still empty |
| C-09 | P0 | I | Office calendar union | **Zero** `source_kind=lesson_plan` rows (no homework/plan firehose) |
| C-10 | P0 | I | Student/parent CAL union | **Zero** plan projections in v1 |
| C-11 | P0 | I | Assignment `due_at` | Stays on assignments; plan **link** does not move `due_at` |
| C-12 | P0 | I | Pop quiz hide | Still CAL-P1 `calendar_visibility` — plans do not force firehose |
| C-13 | P1 | UI | Teacher chip default | `plan` chip default-on for teacher; default-**off** for family until later share-title decision |
| C-14 | P1 | U | Projection serializer | Title + span + category + visibility only — **no** procedures, differentiation, scores |
| C-15 | P2 | — | Family calendar title chip | Later product disclosure — do not “just default-on” |

### 2.2 Diary join (DIARY-P1 / A1)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| D-01 | P0 | U/I | No diary body on plan row | No STT, media, or journal prose columns on `lesson_plans` |
| D-02 | P0 | U | `teacher_notes` | Optional teacher-only field — **not** Diary; never in family RPC |
| D-03 | P0 | I | Publish / teach plan | Does **not** auto-insert Diary or student Log |
| D-04 | P0 | I | Diary SELECT | Owner-only; `related_plan_id` is **not** an ACL grant to co-teachers or office |
| D-05 | P1 | UI | “Reflect in Diary” | Deep-link with `planId` query param; FK persists when both products ship (`diary_entries.related_plan_id` ON DELETE SET NULL) |
| D-06 | P1 | I | 1:N diary rows per plan | Allowed; do not FK the other way |
| D-07 | P1 | R | Accreditation evidence | Published plans (+ later coverage) — **not** private diary contents |
| D-08 | P2 | — | DIARY-A1 v1 omit of FK | LPLAN may ship without Diary tables; deep-link only until both exist |

### 2.3 Landing join (LAND-P1)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| LND-01 | P0 | UI/I | Teacher landing “lesson focus” | **Link** to today’s published plan (span overlaps local today) — not embed of procedures |
| LND-02 | P0 | UI/I | Drafts on landing | **Hidden** |
| LND-03 | P0 | UI/I | Family landing | **No** editor deep-link; may show same narrow summary RPC payload or omit; `daily_focus` remains separate named region |
| LND-04 | P0 | I | Unpublished / archived | No landing chip |
| LND-05 | P1 | — | Sequencing | LPLAN can ship without LAND/CAL tables; projections no-op until consumers exist |

### 2.4 Three-product wall (do not collapse)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| W-01 | P0 | U/R | `lesson_plans` vs `assignments` | Separate tables; publish plan ≠ seed submissions |
| W-02 | P0 | U/R | `lesson_plans` vs `lesson_packs` / Author | Link `deck_id`+version only; never store pack HTML; `publish_lesson_pack` frozen |
| W-03 | P0 | R | Desk capture → match → Approve | Unchanged; plan path never Approves grades |
| W-04 | P0 | R | Matcher | Still never inserts students; plan AI same law |
| W-05 | P1 | R | TEACH-UX tray | No new primary tab sprawl; Plans under Teaching/Desk cluster |


## 3. Evidence (tests, RLS, dogfood)

### 3.1 LPLAN-S1 must-fix → acceptance map

Future loop fails if any **P0** row lacks evidence. Map 1:1 to LPLAN-S1 §2.4.

| ID | Sev | Type | Case | Evidence later |
|---|---|---|---|---|
| SEC-01 | P0 | S | LPLAN-S1-01 never `teaches_class` / `is_school_admin` / `is_staff` | SQL `doesNotMatch` + office JWT: zero plan rows |
| SEC-02 | P0 | I | LPLAN-S1-02 full SELECT = owner only | Co-teacher JWT fixture: no full body / no UPDATE |
| SEC-03 | P0 | I | LPLAN-S1-03 no family/student table SELECT; RPC allow-list | Parent SELECT empty; serializer fixtures title+summary only |
| SEC-04 | P0 | S | LPLAN-S1-04 new `lesson_plan.manage` teacherSeatOnly | `askToolPolicy` student/parent/office/dual-hat; not on `assignments.manage` |
| SEC-05 | P0 | I | LPLAN-S1-05 twin empty; student/office deny RPC | Parent 2+ links fixtures; student/office JWT deny |
| SEC-06 | P0 | I/S | LPLAN-S1-06 DEFINER hygiene | `search_path=public`, `auth.uid()`, revoke anon, predicates inside; IDOR fixtures |
| SEC-07 | P0 | I | LPLAN-S1-07 RPCs own status/share columns | Direct UPDATE denied; draft save cannot publish/share |
| SEC-08 | P0 | I | LPLAN-S1-08 unpublish → draft + unshare | Family RPC empty; CAL projection gone immediately |
| SEC-09 | P0 | I | LPLAN-S1-09 copy-forward clears publish/share | Clone fixture: draft, null timestamps, taught class |
| SEC-10 | P0 | I/S | LPLAN-S1-10 dual-hat chrome; family CAL no plan projection | Dual-hat matrix + family CAL union zero `lesson_plan` |
| SEC-11 | P0 | S | LPLAN-S1-11 matcher never inserts; Edge no table UPDATE; AI never auto-publish | Static + Edge |
| SEC-12 | P0 | I | LPLAN-S1-12 publish ≠ submissions / Approve | Zero `submissions` insert; zero `approved_score` |
| SEC-13 | P1 | S | LPLAN-S1-13 server-side AI keys; logs = ids not bodies/IEP | Edge + `ai:dev` |
| SEC-14 | P1 | I/S | LPLAN-S1-14 no `write_audit` drafts/share to `/activity` | Office activity empty; ledger on Publish owner-scoped only |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied/affirmed from LPLAN-S1 §3.1 — mandatory when Chuck says send:

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

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| RLS / RPC | JWT fixture matrix (owner, co-teacher, other teacher, left-class owner, student, parent twin A/B, office, anon, dual-hat) |
| Ask policy | Unit tests on client + Edge twin maps (`lesson_plan.manage` matrix) |
| Serializer / DTO | Field-allowlist tests: family RPC vs owner full row |
| Calendar projection | Integration: family/office unions zero `lesson_plan`; teacher draft+span owner-only |
| Diary / landing | R: no diary body on plan; landing link-not-embed; family no editor deep-link |
| Desk regression | R: capture → match → Approve unchanged; no grade controls on plan |
| Assignments / Author | R: no overload; soft links; `publish_lesson_pack` frozen |
| AI / Edge | Static: no table UPDATE; no auto-publish; paste-only prompts |

### 3.4 RLS / helper regression risks

| Risk | Why it bites | Guard IDs |
|---|---|---|
| Reuse `teaches_class` / `assignments_via_class` | Office firehose of IEP/ELL notes | O-01, O-02, SEC-01, L4 |
| Syllabus-style `class_teacher_of` SELECT | Co-teacher reads differentiation | T-11, SEC-02, L3 |
| Family table SELECT “just for summary” | Row-level RLS leaks procedures/IEP | P-01, P-08, SEC-03, L5 |
| Ask on `assignments.manage` | Students get plan AI; office school drafts | AI-06, SEC-04, L8 |
| DEFINER confused deputy | Cross-child / cross-class IDOR | SEC-06, P-05 |
| Status/share client UPDATE | Bypass publish/share walls | T-13, T-14, SEC-07 |
| Unpublish leaves share/CAL | Family still sees summary or occupancy | T-06, C-08, SEC-08, L6 |
| Copy-forward inherits share | Family sees draft clone | T-08, SEC-09 |
| Dual-hat job-of-record bypass | Parent seat sees full bodies | X-01…X-03, SEC-10 |
| Family CAL plan projection | Occupancy / “what we did” leak | C-06, C-10, SEC-10, L10 |
| Client chips as security | Modified Expo / network tab wins | SEC-10, L10 |
| AI Edge writes table / auto-publish | Silent publish or share | AI-04, AI-10, SEC-11, L7 |
| Publish seeds submissions | Plan becomes grade column | V-05, W-01, SEC-12 |
| Diary body on plan / FK as ACL | Private journal leak | D-01…D-04, L11 |
| `/activity` share existence | Office learns a share happened | AI-16, SEC-14 |
| Category `lesson` reuse | Pack chip confused with plan | C-03, W-02 |

### 3.5 Regression vs frozen surfaces

| ID | Sev | Type | Surface | Expected |
|---|---|---|---|---|
| R-01 | P0 | R/UI | Teacher Desk grade loop | Capture → match → Approve unchanged |
| R-02 | P0 | R | Gradebook / `approved_score` | Plan path never writes scores |
| R-03 | P0 | R | `assignments` / submissions | Publish plan does not seed submissions |
| R-04 | P0 | R | Author `lesson_packs` / `publish_lesson_pack` | Diff empty re: pack HTML; links only |
| R-05 | P0 | R | Diary / ledger | No diary prose on plan; ledger on Publish owner-scoped; no Office Activity firehose |
| R-06 | P0 | R | Matcher / capture | Still never inserts students (plan AI same law) |
| R-07 | P0 | R | CAL hybrid SoT | No plan body copy into `calendar_events` |
| R-08 | P1 | R | Class landing | Link-only lesson focus; no procedures embed |
| R-09 | P1 | R | TEACH-UX tray count | No new primary tab |
| R-10 | P1 | R | No `EXPO_PUBLIC_*` model keys | Static scan |

### 3.6 Process adequacy (how a future loop must run)

#### 3.6.1 Not this ticket

- Do **not** staff implementer/QA/verify children from Q1.
- Do **not** call `kelyra-qa-loop` until Chuck says **send**.
- Do **not** self-certify on green typecheck alone.

#### 3.6.2 After CEO send (recommended loop shape)

| Phase | Owner pattern | Must produce |
|---|---|---|
| A — `lesson_plans` + owner RLS + draft save RPC + teacher web list/edit | kelyra-qa-loop | Migrations; owner SELECT; T-01…T-03, T-09…T-14, SEC-01/02/07 |
| B — publish / unpublish / archive + ledger | Same or follow-on | T-04…T-07, V-*, SEC-08/12/14 |
| C — parent summary share + family RPC | Same | T-05, P-*, SEC-03/05/06 |
| D — copy-forward + span columns + teacher CAL projection contract | Same | T-08, C-*, SEC-09/10 |
| E — Ask `draft_lesson_plan` + Edge draft (no table write) | Separate if needed | AI-* + SEC-04/11/13 |
| Security pass | Loop security stage + this matrix | LPLAN-S1-01…14 checked with paths |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

#### 3.6.3 Evidence package (minimum for CoS when shipping)

1. Automated tests mapped to matrix IDs (T/S/P/O/X/V/AI/C/D/LND/W/SEC/R).
2. JWT fixture dumps (redacted): office empty; co-teacher deny body; parent twin empty; owner left-class write deny; dual-hat seat split.
3. SQL review note: zero `teaches_class` / `is_staff` / `is_school_admin` on plan paths; owner-only SELECT.
4. Statement: family RPC allow-list title+summary only; no table SELECT.
5. Statement: Ask cap is `lesson_plan.manage`, not `assignments.manage`; client/Edge twins match; no publish tool.
6. Statement: unpublish unshares; family CAL has zero plan projections; category `plan` ≠ `lesson`.
7. Statement: publish does not seed submissions or Approve grades; no diary body on plan.
8. Dogfood notes: draft→publish→share→unshare; AI draft→edit→Publish; twin switcher; teacher CAL chip.
9. Open P1/P2 waivers explicitly named — none silent.

#### 3.6.4 Recurring defect watch (post-ship)

1. `teaches_class` / office firehose drift  
2. Co-teacher SELECT via syllabus copy-paste  
3. Family table SELECT or fat RPC over-read  
4. Twin mash / missing child union  
5. Ask capability mis-map / matcher student insert / AI auto-publish  
6. Unpublish leave-share or CAL drift  
7. Copy-forward inherits publish/share  
8. Client chips treated as security  
9. Plan overloaded onto assignments or Author packs  
10. Diary prose or `/activity` existence leak  

### 3.7 Dogfood scripts (manual, after send)

| Script | Hats | Pass bar |
|---|---|---|
| DF-1 Draft→Publish→Share | Teacher → Parent | Family sees title+summary only after share; never procedures/IEP notes |
| DF-2 Unpublish | Teacher → Parent | Family RPC empty immediately; teacher still owns draft |
| DF-3 Twins | Parent Saydee/Sydnee | Switcher required; shared summary for Saydee’s class never on Sydnee context |
| DF-4 Co-teacher wall | Owner + co-teacher | Co-teacher cannot open full body or edit |
| DF-5 AI draft | Teacher | JSON parks in editor; Save keeps draft; Publish is separate human control; no class invent |
| DF-6 CAL join | Teacher + Parent | Teacher sees `plan` chip when published+span; parent calendar has zero plan rows v1 |
| DF-7 Office | Office seat | No editor, no Ask tools, no table rows, no `/activity` share existence |
| DF-8 Three-product | Teacher | Plan link to assignment does not move due; Author pack HTML not stored; Desk Approve unchanged |


## 4. Acceptance

**Audience:** CEO / Chief of Staff. **This ticket is not a send.**

### 4.1 This ticket (LPLAN-Q1)

| Criterion | Status |
|---|---|
| `notes/company/lesson-plan-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in LPLAN-P1 / A1 / S1 (no invented product law) | **Met** |
| P0 matrix covers owner walls, publish≠share, parent summary RPC, AI draft-only, CAL/diary joins, LPLAN-S1-01…14 | **Met** |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| No app code, SQL, migrations, Edge, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

**Audience:** CEO / Chief of Staff. **Not** an implementation ticket. Do **not** staff `senior-developer` or launch `kelyra-qa-loop` until Chuck writes **send**.

### 4.2 Non-acceptance (ship blockers even after a green unit suite)

A future build is **not** accepted if any of the following is true:

1. Full-body SELECT uses `class_teacher_of` / `teaches_class` / `is_staff` / `is_school_admin` instead of **owner-only**.
2. Family or student can `SELECT lesson_plans`, or any family RPC returns procedures, differentiation, teacher_notes, materials dump, standards dump, links, source, or owner id.
3. Ask tools ship under `assignments.manage`, or `publish_lesson_plan` is registered as an Ask tool, or student/parent/office get plan AI.
4. AI auto-publishes, Edge UPDATEs `lesson_plans`, or matcher invents classes/students / Approves grades.
5. Publish seeds `submissions` or writes `approved_score`, or plans overload `assignments` / store Author HTML.
6. Parent twin views mash-up, or missing `p_student_id` with 2+ links returns a union.
7. Unpublish leaves `summary_shared_at` set, or family CAL/landing still shows plan occupancy/summary.
8. Copy-forward inherits publish/share timestamps.
9. Family calendar union includes `source_kind=lesson_plan` in v1, or category reuses pack `lesson`.
10. Diary prose lives on the plan row, or `related_plan_id` grants co-teacher/office ACL.
11. Client chips / landing hides are treated as the security wall.
12. `EXPO_PUBLIC_*` model keys, or `write_audit` plan share/draft onto Office `/activity`.
13. Developers self-certify without CEO send + this plan + loop evidence.
14. Implementation started without CEO written **send**.

### 4.3 Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| Teacher create/edit/publish/share/archive | T-01…T-19, V-* |
| Student no plan body | S-01…S-05 |
| Parent summary + twin wall | P-01…P-11 |
| Office / co-teacher / sub deny | O-01…O-06, T-11 |
| Dual-hat chrome seat | X-01…X-04 |
| AI draft only + Ask cap | AI-01…AI-17, §1.8 |
| Calendar projection join | C-01…C-15 |
| Diary separate | D-01…D-08 |
| Landing link-not-embed | LND-01…LND-05 |
| Three-product wall | W-01…W-05 |
| LPLAN-S1 must-fix 01–14 | SEC-01…SEC-14 |
| LPLAN-S1 §3.1 tests | §3.2 checklist |
| Frozen Desk / grades / Author / Diary / CAL | R-01…R-10 |
| v1 vs later cut | §0.2; O-05/06; C-15; AI-17 |

### 4.4 Gate status

| Item | Status |
|---|---|
| Spec pack on disk (P1, A1, S1, R1) | Yes |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for lesson plans | **Forbidden** until CEO send |
| Self-certify by developers | **Forbidden** |
| Eng staffing | **Hold** |

### 4.5 Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not a narrative “looks good.”
2. **Owner-only SELECT** (stricter than syllabus) and **publish ≠ share** are acceptance axioms equal to RLS.
3. LPLAN-S1 §3.1 tests and must-fix 01–14 are incorporated by reference as mandatory future loop cases.
4. Calendar join is projection-only with category **`plan`**; family occupancy **no in v1**.
5. Diary stays off the plan row; family disclosure is narrow RPC only.
6. Plan only — no code, no loop, no SQL, no git push from this card.

### 4.6 Open issues (do not block this plan; still block ship if unresolved at send)

| # | Issue | Owner at send |
|---|---|---|
| 1 | TEACH-UX placement: Plans segment vs drawer (no tab sprawl) | PM / CEO |
| 2 | Parent summary column vs `plan_shares` row — A1 locked column + RPC | Architect when staffed |
| 3 | Whether family RPC may later add `objectives` (A1 locked **omit**) | PM / CEO if reopen |
| 4 | Co-teacher read of published body without differentiation (parked) | Product |
| 5 | Student seeing own shared summary in v1 (A1 = deny) | PM / CEO if reopen |
| 6 | Sub cover data source / export fallback | Product / roster |
| 7 | Soft FERPA / no school-official claim until DPA | Unchanged |

### 4.7 Sources

- LPLAN-P1 `notes/company/lesson-plan-plan.md` — hats, fields, AI, joins, v1 cut  
- LPLAN-A1 `notes/company/lesson-plan-architecture.md` — entity, RLS/RPC, projection keys  
- LPLAN-S1 `notes/company/lesson-plan-security.md` — threats, must-fix, §3.1 tests  
- LPLAN-R1 research (context)  
- Live ground: `docs/data-model.md`, `class_teacher_of` vs `teaches_class`, `askToolPolicy.ts`  
- Prior QA plan shape: `notes/company/calendar-acceptance.md`, `notes/company/class-landing-acceptance.md`  

### 4.8 Verdict

**Acceptance plan complete.** Ready for CEO/CoS review as the contract for a future authorized build loop.

**Not a send. Not a release. Not QA certification.**

**RECOMMENDED NEXT ACTION:** CoS surfaces this file with the LPLAN pack to Chuck. Hold eng. Do not launch kelyra-qa-loop from this ticket.

### Handoff

- **OBJECTIVE:** Release-level acceptance plan for lesson plans v1 (evidence contract if CEO later says send).  
- **CONTEXT:** LPLAN-P1 / A1 / S1 pack; owner-only walls; publish≠share; AI draft-only; CAL projection; diary separate.  
- **WORK PERFORMED:** Wrote `notes/company/lesson-plan-acceptance.md` (laws, owner/publish/parent/AI matrices, CAL/diary joins, SEC map, process, non-acceptance, gate).  
- **VERIFICATION:** File on disk; no SQL; no app code; no kelyra-qa-loop.  
- **RESULT:** Plan only — ready for CEO/CoS; not implementation.  
- **OPEN ISSUES:** §4.6  
- **ESCALATION NEEDED:** No unless CEO rejects owner-only SELECT or family-RPC-not-table.  
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing and qa-loop.
