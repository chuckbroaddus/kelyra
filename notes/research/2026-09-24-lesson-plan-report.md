# Lesson plans (accreditation) — Research + Recommended Features Digest (R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/lesson-plan-research.md` · `notes/company/lesson-plan-plan.md`  
**Also keep (unchanged architecture/security/acceptance unless noted):** sibling `*-architecture.md` / `*-security.md` / `*-acceptance.md`

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above.

---

## Top 5 P0 recommendations

1. **N1/N2** — First-class `lesson_plans` record with Cognia/ACSI-aligned core fields + draft→publish→archive (separate from Author `publish_lesson_pack` HTML packs).
2. **N3/N4** — Templates + copy-forward + AI draft with **confirm-before-publish**.
3. **N5** — Calendar span **join** for published plans (reference, no body duplication).
4. **N6/N7** — Diary link only (private); day-of run-of-show UI for teachers.
5. **N8/N9** — Parent **summary** optional fail-closed; taught-class teacher author only.

---

## Research (full SoT)

# Lesson Plan Research Note (LPLAN-R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (supersedes LPLAN-R1 / 2026-09-03)  
**Cards:** Epic `t_4d69845a`  
**Access date for URLs:** 2026-09-24 (America/Chicago)

**Related:** Calendar `calendar-research.md` · Class landing `class-landing-research.md` · Diary epic (join only; do not rebuild)  
**Not this product:** Author studio / `publish_lesson_pack` HTML lesson packs — separate path; plans may **link** a pack id, never store pack HTML.

---

## Executive summary

Accreditation lesson plans are **teacher-owned working records + day-of run-of-show + evidence of instructional design**, not student-facing HTML packs and not Diary prose.

For Spring Baptist–like private Christian schools, **Cognia** Essential Requirement 7 (2026) and **ACSI Inspire** Standards 7–8 set the bar: documented curriculum/instructional design + assessment/monitoring plan; biblical worldview integration where ACSI applies. Texas **private** schools are **not** TEA public-school curriculum-mandate clones — variance is high; Cognia/ACSI evidence culture matters more than TEKS binders.

**Answers to CEO questions (short):**  
1. **Calendar span?** Yes — **join** a published plan to a dated/period span on Calendar; do not duplicate body.  
2. **Execution diary?** Separate Diary epic; optional `related_plan_id` link; diary stays owner-only (not accreditation evidence).  
3. **Day-of teacher use?** Run-of-show mode (timing, materials, checks) on phone/web; not grade Approve.  
4. **Parents?** Fail-closed; optional **summary** share only (objectives/overview) — never full procedures/differentiation/internal notes.

**v1 cut:** Core fields + templates + copy-forward + AI draft (confirm-before-publish) + calendar join + diary link + fail-closed parent summary + taught-class teacher author only.

---

## 1. Accreditation & private-school context

### 1.1 Cognia (2026 Essential Requirements)
Essential Requirement 7: institution maintains a **documented educational program, including curriculum or instructional design**, guiding teaching and learning, **supported by a plan for assessing and monitoring student learning**. Evaluated yes/no with evidence at Entry.  
Source: [Essential Requirements for Initial Accreditation (PDF, Cognia 2026)](https://www.cognia.org/wp-content/uploads/2026/03/Essential-Requirements-for-Initial-Accreditation.pdf). Accessed 2026-09-24 (America/Chicago).

Performance Standards (continuing) emphasize aligned curriculum/instruction, monitoring/adjusting instruction, program evaluation — evidence should show **analysis and improvement**, not binder dumps (Cognia evidence guidance pattern).  
Source: [Cognia Performance Standards overview](https://www.cognia.org/k12-postsecondary-standards/). Accessed 2026-09-24 (America/Chicago).

### 1.2 ACSI Inspire (Christian schools)
Standard 7 Instructional Program: biblically based instructional program; varied strategies; Bible as core.  
Standard 8 Curriculum Planning: comprehensive curriculum documentation; alignment of standards, objectives, activities, assessments; collaborative regular update.  
Sources: ACSI Inspire standards materials (e.g. [ACSI standards checklist PDF](https://www.acsi.org/docs/default-source/website-publishing/school-services/accreditation/accreditation-revision---inspire/acsi-inspire-standards-checklist-3-14-22.pdf?sfvrsn=e01648d0_8); REACH/Inspire manuals). Accessed 2026-09-24 (America/Chicago). **Flag:** confirm Spring Baptist’s exact agency (Cognia and/or ACSI) with Chuck — do not assume.

### 1.3 Texas private variance
TEA heavily shapes **public** TEKS alignment/documentation. Private schools accredited via Cognia/ACSI/other associations set their own documented programs. Kelyra should support **standards fields that accept TEKS or school-selected / biblical-integration tags** without hard-coding “TEA lesson plan form.” **Unverified:** Spring Baptist’s current binder template — ask Chuck.

---

## 2. Competitor patterns (copy vs skip)

| Product | Strength | Copy | Skip |
|---|---|---|---|
| **Planbook** | Schedules (weekly/cycle/alt), standards frameworks, bump/copy year, attachments, school year calendars | Templates, bump/copy-forward, standards pickers, school calendar overlay | Full gradebook/attendance clone inside plans |
| **Common Planner** (Common Curriculum lineage) | Units + lessons, standards track, drag/bump, admin dashboard, school templates, AI assist | Admin view of **published** plans later; school templates; calendars in planbook | Forcing office authoring in v1 |
| **Chalk / Planboard / PowerSchool C&I** | Calendar-centric planning, submission/review | Calendar span join; optional coach comment later | Heavy district workflow in v1 |
| **Canvas Modules** | Student-facing sequence + dues | Link assignments from plan | Treating modules as accreditation plan record |
| **Google Classroom** | Draft/scheduled hide | Publish gate | Thin plans = Docs attachments only |
| **AI tools** (Monsha, Lessn, etc.) | Draft <60s from topic/standards | AI draft + teacher edit | Auto-publish; student PII in prompts |

Sources: [Planbook](https://www.planbook.com/); [Common Planner](https://www.commonplanner.com/); Planbook vs Common Planner comparisons (secondary). Accessed 2026-09-24 (America/Chicago). User-count marketing claims (e.g. “300k teachers”) treated as **vendor marketing — unverified**.

---

## 3. Plan vs Author lesson packs (explicit)

| | Accreditation **lesson plan** | Author **lesson pack** (`publish_lesson_pack`) |
|---|---|---|
| Audience | Teacher (+ optional office review; optional parent summary) | Students (interactive HTML) |
| Job | Record + run-of-show + accreditation evidence | Practice / instruction player |
| Storage | `lesson_plans` (proposed entity — architecture SoT) | `lesson_packs` live catalog |
| Calendar | Span **join** when published | Appears via assignment due when published |
| Join | Plan may **link** `deck_id`+version | Pack never embeds plan prose |

**Law:** Do not conflate. Do not store pack HTML on the plan row. Do not freeze or rewrite `publish_lesson_pack` in this epic.

---

## 4. Required fields / artifacts

| Field | Needed v1 | Accreditation why |
|---|---|---|
| Title + class_id | Yes | Anchors to taught class only |
| Objectives / learning goals | Yes | Cognia ER7 instructional design |
| Standards / biblical integration tags | Yes (flexible vocab) | Cognia/ACSI alignment evidence |
| Materials / resources | Yes | Day-of + sub |
| Procedures / activities + timing | Yes | Run-of-show |
| Assessment / checks for understanding | Yes | ER7 monitoring plan |
| Differentiation / accommodations | Yes | Whole-child / IEP-aware practice |
| Status draft\|published\|archived | Yes | Publish gate |
| Span start/end or period | Optional but joinable | Calendar |
| Reflection / what worked | Short teacher-only notes optional; **Diary** for deep reflection | Continuous improvement without leaking diary |
| Evidence export | Desired later | Cognia review packets |

---

## 5. CEO questions — full answers

### (1) Calendar span?
**Yes, by join.** Published plan references a span on Calendar (period/day/multi-day). Draft plans do **not** appear on student/parent calendars. Canonical body stays on `lesson_plans`; calendar row stores `source=lesson_plan` + id. Matches CAL hybrid SoT (no duplicated essay on the event).

### (2) Execution diary join?
**Join, do not merge.** Diary epic remains private STT/notes (“what worked”). Optional `related_plan_id`. Accreditation evidence = plan + (later) ledger/taught markers — **not** private diary contents. Never show diary to parents/office/AI firehose.

### (3) Day-of teacher use?
**Run-of-show surface:** open published plan → timing strip, materials checklist, activity steps, quick checks. Phone-first during class; web for prep. No grade Approve from plan. Sub view = published + materials (export/print P1).

### (4) What goes to parents?
**Fail-closed.** Default: nothing. Optional teacher **Share summary**: title, objectives, high-level overview, dates — **not** full procedures, differentiation notes, assessments keys, or diary. Twin wall: summary only for enrolled child.

---

## 6. Additional product questions (invented)

1. Unit bank vs single-day plans — both? (Recommend: unit container P1; day plans v1.)  
2. Co-teacher edit? (Park v1; single owner.)  
3. Office comment on published plans for Cognia? (P1 if Chuck requires.)  
4. Specials (PE/Art/Music) lighter template? (Yes — template pack.)  
5. Bible integration required field for ACSI schools vs optional toggle per school? (**Ask Chuck.**)  
6. AI may read syllabus/unit text — never roster PII. Confirm.  
7. Substitute access mechanism (cover flag vs PDF export)?  
8. Standards vocabulary source (TEKS pack vs school custom vs biblical tags)?  
9. Link to class landing “daily focus” — blurb from plan summary only?  
10. Archival retention for accreditation cycles (years)?  

---

## 7. Hats & visibility

| Hat | v1 |
|---|---|
| Teacher (taught class) | Create/edit/publish; AI draft; calendar join; optional parent summary; diary link |
| Substitute | Read published + materials (when cover scope exists) |
| Office | **None** author; optional later read/comment on published |
| Parent | Summary only if shared; twin-safe |
| Student | No plan body v1 (work via assignments/landing) |

---

## 8. AI features & safety

- Draft from topic / unit / standards / syllabus excerpt → teacher edits → explicit Publish.  
- Suggest timing, materials list, standards tags, differentiation ideas.  
- **Confirm-before-publish.** No auto-publish. No superuser Ask. No student names/grades in prompts.  
- NL “schedule this plan Thursday period 2” → calendar **draft join** → confirm.

---

## 9. Mobile vs web

| | Mobile | Web |
|---|---|---|
| Authoring | Short edits; dictate notes; day-of run-of-show | Full form; unit layout; AI draft review |
| Calendar join | Pick span sheet | Drag/span on week |
| Sub/print | Share sheet / PDF later | Print-friendly |

---

## 10. Needed vs Desired

| Needed P0 | Desired P1–P2 |
|---|---|
| Core fields + draft/publish | Office dashboard |
| Templates + copy-forward | Full evidence export pack |
| AI draft + confirm | Co-teacher collab |
| Calendar span join | Auto sub packet |
| Diary link (not embed) | Parent rich newsletter from plans |
| Fail-closed parent summary | Biblical-integration rubric library |

---

## 11. Unverified flags

- Spring Baptist’s exact accreditor + current lesson plan template — **ask Chuck**.  
- Vendor user-count claims — marketing.  
- Whether Cognia reviewers accept digital plan systems without PDF binders — generally yes if documented + assessable; **confirm with school’s Cognia liaison**.  
- TEA private-school myths — avoid inventing statutory duties.

---

## 12. Open questions for Chuck

1. Cognia, ACSI, both, or other for Spring Baptist archetype?  
2. Bible integration field required or school toggle?  
3. Office read/comment in v1 or park?  
4. Confirm Author packs stay separate with link-only.  
5. Priority vs Calendar P0 NL — sequence?

**RECOMMENDED NEXT ACTION:** Review with `lesson-plan-plan.md`; keep architecture/security/acceptance; Eng only on later send.


---

## Plan / recommended features (full SoT)

# Lesson Plan Plan (LPLAN-P2 / R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (upgrades LPLAN-P1 2026-09-03)  
**Research:** `notes/company/lesson-plan-research.md`  
**Keep:** `lesson-plan-architecture.md`, `lesson-plan-security.md`, `lesson-plan-acceptance.md` (still fit — update cross-links only).  
**Stack:** Expo + Supabase + Edge AI. No app/SQL from this card.

---

## 0. Product law

| Surface | Job | Not |
|---|---|---|
| **Lesson plan** | Teacher-owned accreditation working record + day-of run-of-show | Not Author HTML packs; not Diary; not Feed; not gradebook |
| **Calendar join** | Published plan occupies a dated/period **span by reference** | Not duplicated event body; drafts invisible to families |
| **Diary join** | Optional link to private “what worked” | Not embedding diary; diary not accreditation evidence |
| **AI draft** | Draft from topic/unit/standards → edit → explicit Publish | Not auto-publish; not Ask-as-superuser; no roster PII in prompts |
| **Parent share** | Optional high-level summary only | Not full procedures / differentiation / keys |

Teachers write for **taught classes only**. Teachers do not create classes.

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| Class create from plan/Ask | Office owns directory |
| Auto-publish AI | Confirm / Publish only |
| Parent/student full body v1 | FERPA fail-closed |
| Diary text on plan row | Diary epic |
| Duplicate calendar blobs | CAL join |
| Rebuild Author / `publish_lesson_pack` | Separate; link only |
| Office authoring v1 | Teacher writes |
| Widen `is_staff` / twin merge | Hard law |
| Grade Approve from plan | Desk loop stays |
| Public unauthenticated plan URL | Signed-in only |
| SQL/app from this card | Research epic |

---

## 2. Needed vs Desired

### Needed (P0)

| ID | Capability | Rationale |
|---|---|---|
| N1 | Entity with core fields (title, class, objectives, standards/integration tags, materials, procedures+timing, assessment, differentiation, status) | Cognia ER7 / ACSI Std 8 |
| N2 | draft → published → archived | Publish gate |
| N3 | Templates + copy-forward / bump | Planbook / Common Planner speed |
| N4 | AI draft + teacher confirm before publish | CEO easy-create |
| N5 | Calendar span join when published | CEO Q1 |
| N6 | Diary optional link | CEO Q2; not merge |
| N7 | Day-of run-of-show UI | CEO Q3 |
| N8 | Parent summary share optional, default off | CEO Q4 |
| N9 | Taught-class teacher author only; RLS fail-closed | Hats |
| N10 | Explicit separation from Author packs (link optional) | Anti-conflation |

### Desired (P1–P2)

| ID | Capability | Pri |
|---|---|---|
| D1 | Office read/comment on published | P1 if accreditation needs |
| D2 | Sub cover scope + print/PDF packet | P1 |
| D3 | Unit containers + standards coverage report | P1 |
| D4 | Evidence export for Cognia visit | P2 |
| D5 | Co-teacher edit | P2 |
| D6 | Landing “daily focus” pull from shared summary | P1 join |
| D7 | School-wide template library | P1 |
| D8 | Biblical-integration helper library | P1 if ACSI |

---

## 3. Hats — stories (v1)

**Teacher:** Create (blank/template/copy/AI); edit draft; Publish; attach calendar span or leave in library; day-of run-of-show; Reflect → Diary link; optional Share summary; optional link assignment/pack by id.  
**Substitute:** Read published + materials when cover scope exists (else PDF P1).  
**Office:** No author v1; parked read/comment.  
**Parent:** Fail-closed; summary only if shared + child enrolled; twin wall.  
**Student:** No plan body v1.

---

## 4. Field set (v1)

| Field | Req | Notes |
|---|---|---|
| title | Y | |
| class_id | Y | Taught only; AI never invents |
| status | Y | draft \| published \| archived |
| objectives | Y | |
| standards_tags | Y | Flexible (TEKS / school / biblical) |
| materials | Y | |
| procedures_timed | Y | Steps + minutes |
| assessment_plan | Y | Formative/summative / CFU |
| differentiation | Y | |
| span_start / span_end / period | N | Required only for calendar join |
| teacher_notes | N | Teacher-only short notes (≠ Diary) |
| parent_summary | N | Used only when Share |
| linked_assignment_ids | N | References |
| linked_pack_ref | N | deck_id+version; no HTML |
| related_diary_id | N | Soft link |

---

## 5. UI/UX

### Web (prep)
- Plan library by class/unit; editor form with sections; AI draft panel → diff → Apply to draft; Publish bar; “Add to calendar” span picker; Share summary modal.

### Mobile (day-of)
- Today’s plans list; Run-of-show: big timing, materials check, step cards; overflow → full editor; Reflect opens Diary.

### Parent
- If shared: card on class landing / messages — objectives + overview only.

---

## 6. AI usage

| Move | Allowed | Forbidden |
|---|---|---|
| Draft plan from topic/unit/standards/syllabus text | Y | Auto-publish |
| Suggest timing / materials / tags | Y | Roster PII in prompt |
| NL “schedule on Thursday P2” | Draft calendar join | Silent schedule |
| Rewrite parent_summary | Y with confirm | Invent full plan share |

Confirm-before-publish everywhere. No superuser Ask.

---

## 7. Implementation approach (pointer only)

Per `lesson-plan-architecture.md` / `lesson-plan-security.md`:

1. New `lesson_plans` (+ optional links table) — **not** overload `assignments` or `lesson_packs`.  
2. RLS: owner teacher via `class_teacher_of` (not office `teaches_class` bypass for family reads).  
3. Calendar: on publish+span, upsert calendar projection row with `source_type=lesson_plan` — body stays on plan.  
4. Diary: nullable FK / soft id; no diary RLS widen.  
5. Ask tools: `lesson_plan_draft` / `lesson_plan_schedule` under new caps — not `assignments.manage`.  
6. Author packs: store link fields only; never call `publish_lesson_pack` from plan publish.  
7. Expo screens: library, editor, run-of-show; Edge AI for draft.  
8. Phases: fields+CRUD+templates → AI draft → calendar join → parent summary → diary link → (later) office/sub/export.

**Gate:** Chuck send required before Eng. Acceptance plan already written — still PLAN ONLY.

---

## 8. Cross-links

- Research R2, architecture, security, acceptance (keep)  
- `calendar-plan.md` P1-2 join  
- `class-landing-plan.md` daily focus from summary  
- Diary epic: link only  

---

## 9. Open questions for Chuck

1. Accreditor (Cognia / ACSI / both)?  
2. Bible integration required field?  
3. Office read in v1?  
4. Confirm packs stay separate.  
5. Build sequence vs Calendar NL P0?

**RECOMMENDED NEXT ACTION:** Chuck review; staff Eng only after send on a future build epic.

