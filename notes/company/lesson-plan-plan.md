# LPLAN-P1: Lesson-plan strategy, UI/UX, AI, implementation approach

**Date:** 2026-09-03  
**Author:** product-manager (Kelyra)  
**Card:** `t_498dc26b` · Parent: `t_31ad2b43` / `notes/company/lesson-plan-research.md` (LPLAN-R1)  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no kelyra-qa-loop, no git push.  
**Also grounded in:** `notes/company/calendar-plan.md` (CAL-P1 join, draft/publish), `notes/company/diary-ledger-stories.md` (DIARY-P1 private reflection), `notes/company/class-landing-plan.md` (link not embed), `notes/company/teacher-ux-plan.md` (desk-centric IA), Cognia ER7 / competitor cut in LPLAN-R1.

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Lesson plan** | Teacher-owned **accreditation working record** + day-of **run-of-show** (objectives, materials, procedures+timing, assessment, differentiation) | Not student-facing HTML packs (Author); not Diary prose; not Feed |
| **Calendar join** | A **published** plan occupies a dated/period **span** via link/reference on CAL-P1 | Not a duplicated event body; not auto-firehose of drafts |
| **Diary join** | Optional link from plan → private “what worked” entry (DIARY-P1) | Not embedding diary into the plan; diary stays owner-only |
| **AI draft** | Draft from unit/topic/standards → teacher edit → explicit Publish | Not auto-publish; not Ask-as-superuser; no student PII in prompts |
| **Parent share** | Optional **high-level summary** only when teacher explicitly shares | Not full procedures, differentiation notes, or internal reflection |

**CEO bar (LPLAN-R1):** Teacher writes; AI drafts only; join calendar not duplicate; office none unless required; fail-closed parents; diary separate.

---

## 1. Problem statement

Kelyra already has **assignments / lessons** (student work + due dates) and is adding **Calendar** (CAL-P1) and **Diary** (DIARY-P1). There is **no first-class accreditation lesson-plan record**: no standards-aligned working script, no materials+timing run-of-show, no draft→publish plan lifecycle separate from “assign work.”

Teachers still keep Planbook / Common Curriculum / Docs binders in parallel. Cognia ER7 (2026) expects a **documented instructional design + student-learning assessment plan** — continuous evidence, not a once-a-year binder dump. Competitors win on templates, copy-forward, AI draft under 60s, and calendar spans — always with teacher approve, never silent publish (LPLAN-R1).

Kelyra’s cut: one **teacher-owned plan** surface that **joins** Calendar and optionally Diary, stays behind hat walls, and never becomes student HTML or a parent full dump.

---

## 2. Explicit non-goals

| Non-goal | Why |
|---|---|
| Class create from plan or Ask | Teachers do not create classes; office/directory owns roster |
| Auto-publish AI drafts | Teacher Confirm / Publish only (same bar as LAND/CAL) |
| Parent / student full plan body in v1 | FERPA + fail-closed; summary share is explicit and optional |
| Diary text stored on the plan row | DIARY-P1 owner-only; accreditation uses plan + ledger, not private journal |
| Duplicate calendar event blobs | CAL-P1 join/reference by plan id + span |
| Rebuild Author packs / student HTML lessons | Separate product; plan may **link** a pack later, not own it |
| Office authoring or school-wide rewrite in v1 | Teacher writes; office view/comment only if Chuck later requires |
| `is_staff` widen / twin merge | Hard product law |
| Grade Approve or score write from plan | Desk capture → match → Approve stays TEACH-UX |
| Public unauthenticated plan URL | Signed-in only |
| Fake E2E “only you ever see this” claims | Honest RLS + visibility matrix |
| kelyra-qa-loop / SQL / git push from this card | Spec only |

## 3. Hats — user stories (v1)

### Teacher (taught class only)

- **Create** a lesson plan for a class I teach: blank, from template, copy-forward last year/unit, or AI draft from topic/unit/standards.
- **Edit** draft fields (objectives, standards, materials, procedures+timing, assessment, differentiation). Save keeps draft.
- **Publish** makes the plan the working record and eligible for calendar span + sub view. Never auto from AI.
- **Schedule on calendar (or not):** attach a start/end or period span → CAL-P1 shows a **join** when published; I can keep a plan unscheduled (library/unit bank).
- **Day-of run-of-show:** open plan on web or phone; timing + materials at a glance; no grade Approve from here.
- **Execution reflection:** after class, open DIARY (or “Reflect” deep-link) — private; optional `related_plan_id`. Plan may hold a short **public-to-me notes** field that is still teacher-only, not Diary.
- **Optional parent summary:** explicit Share summary (objectives + high-level overview only). Default off.
- **Link work:** optionally link existing published assignments / Author packs by id — no duplicate bodies.
- Cannot create classes. Cannot see other teachers’ private drafts unless co-teacher policy later (v1: owner + explicit share-to-colleague **parked**).

### Substitute

- See **published** plans + materials for classes I am covering (office assigns cover scope — mechanism may reuse existing cover/sub flags; if none, export/print PDF is v1.1).
- No edit of canonical plan in v1 (optional “sub notes” later). No grades. No parent share.

### Office / superintendent

- **v1 default: none** as author. No class-create. No bulk rewrite.
- **Parked / later if accreditation requires:** read-only school list of **published** plans + comment/feedback (Common Curriculum admin pattern). Still no diary access.

### Parent / guardian

- **Fail-closed.** No full plan. No procedures, differentiation, or teacher notes.
- Only if teacher **shared summary** for that class **and** linked child is enrolled: objectives + overview.
- Twin wall: per-child context only (Saydee ≠ Sydnee).

### Student

- **v1: no plan body.** Sees assigned work and calendar items via existing surfaces. Optional later: student-facing “today’s focus” blurb via class landing join — not this card’s full plan.

### Co-teacher / specialist

- Parked: same-class co-own or comment. v1 single owner teacher of record.

---

## 4. Required fields (v1)

| Field | Required? | Notes |
|---|---|---|
| Title | Yes | Human label (“Linear equations day 2”) |
| Class id | Yes | Taught class only; never invented by AI |
| Status | Yes | `draft` \| `published` \| `archived` |
| Objectives / learning goals | Yes | Plain text |
| Standards alignment | Yes (soft) | Codes + labels (TEKS/CCSS/etc.); empty allowed with warning, not hard-block in pilot |
| Materials / resources | Yes | List; attachments later |
| Procedures / activities + timing | Yes | Ordered steps with duration hints |
| Assessment / checks for understanding | Yes | Formative/summative plan — not a grade score |
| Differentiation / accommodations | Yes | ELL/IEP/tier notes — **teacher-only** visibility |
| Span (start/end or period) | Optional | When set + published → calendar join |
| Teacher notes (on-plan) | Optional | Still teacher-only; not Diary |
| Parent summary | Optional | Only surface parents may ever see; empty = no share |
| Links | Optional | Assignment ids, Author pack ids, file ids — references only |
| Reflection | **Not on plan** | DIARY-P1 private journal; optional related_plan_id |

**Needed vs desired:** Core five instructional fields + draft/publish + calendar join = **needed**. Full evidence export packs, auto sub PDF, office analytics, advanced remix AI = **later**.

## 5. AI (draft + teacher confirm)

**Scope (v1):**
1. Teacher invokes “Draft plan” with **topic / unit / standards / grade / class** (and optional syllabus excerpt the teacher pastes — no silent roster scrape).
2. Model returns structured draft into the fields in §4 (not free HTML).
3. UI shows editable draft. Teacher edits freely.
4. **Publish is a separate human action.** AI never sets `published`.
5. Optional assists: standards tag suggestions, timing split suggestions, materials list expansion — still draft-only until Save/Publish.
6. NL from Ask: “Draft a 45-min plan on fractions for Fundamentals of Math TEKS 3.3” → same draft flow + confirm class binding. Unassigned class → picker. Never invent class.

**Hard refuses:**
- Auto-publish or silent calendar schedule
- Class create, student create, grade Approve
- Twin merge / other-class write
- Prompts that include roster names, grades, IEP full text, sibling names, doctor notes
- Parent/student invoking plan AI
- “Ask as superuser”

**Audit:** draft saves tagged `source=ai_draft` (or similar metadata) for support — not Office Activity spam. Publish logs who/when.

**Models:** server-side keys only (Edge / Grok CLI OAuth in dev). No `EXPO_PUBLIC_*` model tokens.

---

## 6. Calendar + diary joins (do not rebuild those products)

### Calendar (CAL-P1)

| Rule | Detail |
|---|---|
| Join, don’t copy | Calendar row (or projection) holds `lesson_plan_id` + span; plan body stays on plan table |
| Draft plans | **No** student/parent calendar visibility |
| Published + span set | Teacher calendar shows item; category e.g. `lesson` layer |
| Published, no span | Plan exists in library; calendar silent |
| Unpublish / archive | Calendar join hides for non-teachers (teacher may still see archived) |
| Assignment due dates | Remain assignment projections; plan may **link** assignments, not replace `due_at` |
| Pop quiz | Still CAL-P1 hidden-until-publish; plan does not force calendar firehose |

Landing (LAND-P1) may show a **link** to today’s published plan — not an embed of full procedures.

### Diary (DIARY-P1)

| Rule | Detail |
|---|---|
| Separate store | Reflection / “what worked” lives in Diary, owner-only |
| Optional link | Diary entry may set `related_plan_id`; plan UI offers “Reflect in Diary” deep link |
| No auto-file | Teaching a plan does not auto-write Diary or student Log |
| Accreditation | Evidence = published plans + (later) coverage reports — **not** private diary contents |
| Ledger | Assign/publish plan actions may appear on **My Ledger** as owner actions; not Office Activity dump |

---

## 7. Visibility matrix + RLS posture (fail closed)

| Viewer | Draft plan | Published full plan | Parent summary (if shared) | Diary reflection |
|---|---|---|---|---|
| Owner teacher (taught class) | Yes | Yes | Yes (edit) | Own diary only |
| Other teacher (not owner) | No | No (v1) | No | No |
| Substitute (cover scope) | No | Yes (read) | No | No |
| Office | No | No v1 (later read-only if required) | No | No |
| Student | No | No | No | No |
| Parent (linked child in class) | No | No | **Yes only if shared** | No |
| Other class / other grade | No | No | No | No |
| Twins | — | — | Per-child only | Per seat |
| Anonymous | No | No | No | No |

**RLS principles (no SQL here):**
- Write: `taught_by` / membership for that `class_id` + owner teacher.
- Read full body: owner (+ later sub cover list).
- Parent summary: separate column or row flag `summary_shared_at`; guardians only via linked child enrollment.
- No `is_staff` shortcut into teacher drafts or diary.
- Teachers never create classes from this surface.

## 8. Implementation approach (no SQL in this ticket)

### 8.1 Data model vs Author packs

| Concern | Approach |
|---|---|
| Canonical store | New **lesson_plans** (name TBD) rows scoped by `class_id` + `owner_profile_id` — **not** overloaded `assignments` |
| Author / student HTML packs | Separate product (`kelyra-author`). Plan holds optional **link** to pack id; never stores pack HTML |
| Assignments | Optional many-to-many or link array by assignment id; due dates stay on assignments |
| Calendar | Foreign key / join id on calendar projection; body not copied (CAL-P1) |
| Diary | Optional `related_plan_id` on diary entries only |
| Templates | School or personal template rows (or JSON starter); copy-on-write into new draft |
| Copy-forward | Clone prior plan → new draft; clear publish timestamps; re-bind class/year |

### 8.2 UI/UX — desktop vs mobile

**Web (primary authoring):**
- Entry from class desk: **Plans** (or under Teaching cluster per TEACH-UX — not an 11th noisy tab; prefer one Teaching home with Plans segment).
- List: drafts / this week published / library; filters by unit/span.
- Editor: two-pane or long form — left fields (§4), right live preview run-of-show.
- States: Draft chip · Publish · Unpublish · Archive · Share parent summary (separate confirm).
- AI: “Draft with AI” panel → fills fields → teacher edits → Publish still manual.
- Calendar: “Add span” date/period picker; shows join status (linked / not on calendar).

**Phone (day-of + light edit):**
- Run-of-show view first (timing, materials, next step).
- Edit core fields OK; heavy AI draft prefers web but allowed with sheet confirm.
- Reflect → opens Diary, not an inline journal on the plan.
- No public URL; signed-in shell only.

**Print / sub (v1.1 preferred):** PDF/export of published plan + materials; v1 can be browser print of run-of-show.

### 8.3 Lifecycle

```
blank | template | copy-forward | AI draft
        → Save (draft)
        → optional span attach (still draft = teacher-only calendar)
        → Publish (working record + calendar join if span)
        → optional Share parent summary
        → Reflect (Diary link)
        → Archive
```

### 8.4 v1 vs later

| v1 | Later |
|---|---|
| Core fields + draft/publish | Office compliance dashboard |
| Templates + copy-forward + AI structured draft | Advanced remix library with credit |
| Calendar join when span set | Recurring multi-week unit wizard |
| Fail-closed parents; optional summary field | Rich parent newsletter from plans |
| Diary deep-link only | Taught-vs-planned evidence export for Cognia |
| Sub read of published (if cover exists) | Sub-optimized one-tap packet |
| Single owner teacher | Co-teacher edit + specialist share |
| Standards soft-required | Hard district template lock + coverage % |

### 8.5 Team questions — resolved or parked

| Question | Decision |
|---|---|
| Plan vs assignment | **Separate** entity; assignments link optional |
| Calendar duplicate body? | **No** — join only |
| Diary on plan row? | **No** — DIARY-P1 |
| Office author v1? | **No** |
| Parent full plan? | **No** — summary only if shared |
| Student sees full plan v1? | **No** |
| AI auto-publish? | **Never** |
| Class create? | **Never** |
| Co-teacher shared edit | **Parked** |
| Exact TEA district field mandates | **Parked** — soft standards + school templates later |
| Sub cover data source | **Parked** — depends on roster/cover flags; export fallback |
| Route name / TEACH-UX slot | **Parked** for UX pass — must not explode tray tabs |

---

## 9. Acceptance for this card

- This file (`notes/company/lesson-plan-plan.md`) is complete for **CEO/CoS review**.
- Covers: needed vs desired, hat stories, UI/UX + AI confirm, calendar/diary joins, parent-share rules, visibility matrix, implementation approach, v1 vs later, resolved/parked questions.
- **No** application code, **no** SQL, **no** git push, **no** kelyra-qa-loop from this card.
- **Next:** Chuck reviews. **Do not** staff `senior-developer` until he says send.

---

## 10. Open issues (not blockers for this spec)

- TEACH-UX placement: Plans segment vs drawer item (avoid tab sprawl).
- Whether parent summary is a column on the plan or a separate `plan_shares` row (impl choice).
- Standards catalog source (manual codes vs imported TEKS set) — pilot can be free-text + tags.
- Specials (PE/art) flexible timing templates — same schema, different default template.
- Whether unpublish removes calendar join immediately (recommend **yes**).
