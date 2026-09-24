# Gradeable Work Types Plan (GWT-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Research:** `notes/company/gradeable-work-types-research.md`  
**Digest:** `notes/research/2026-09-24-gradeable-work-types-report.md`  
**Cards:** `t_a2d9bdc1`  
**Stack:** Expo + Supabase. No app/SQL from this card.

**Product law:** Labels and facets first. Weighted averages stay AVG-P1. Capture → Needs → Approve remains the gate. Do not become SIS of record.

---

## 0. Decision lock (recommended)

| Decision | Lock |
|---|---|
| Modeling | **Hybrid:** seedable canonical **work-kind** vocabulary + class **syllabus categories** (weights) + map kind→default category + per-column **score schemes** |
| Not | Fixed global enum of every teacher label; pure free-text with no seeds |
| v1 Spring Baptist | Expand category/work-kind seeds + score schemes + capture type hint; keep simple grade book (Approve before grade) |
| Defer | Full weighted ClassSyllabus engine, SBG/mastery heatmaps, behavior-as-GPA, drop-lowest rules |
| AI | Draft scores only behind Approve; never auto-publish |
| Scope | Classroom gradebook flexibility — not district SIS / transcript SoT |

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| App code / SQL on this card | Research epic |
| Replacing AVG-P1 ClassSyllabus tables | This feeds AVG; does not own grade math |
| PowerSchool / FACTS parity | Private-school trial needs flexibility, not SIS lock-in |
| `kind=quiz` Author runtimes | Author quiz/test stay category labels (`kinds-metrics.md`) |
| Auto-publishing AI grades | Product + FERPA posture |
| Attendance-as-grade engine in v1 | Cell codes later; attendance product gap separate |

---

## 2. Needed vs Desired

### Needed (P0) — taxonomy + labeling for trial

| ID | Capability | Rationale |
|---|---|---|
| N1 | Seed list of canonical work-kinds (homework, classwork, warmup, exit_ticket, quiz, test, exam, project, lab, essay, presentation, portfolio, practice, worksheet, notebook, reading_log, memorization, performance, participation, effort, behavior, citizenship, other_*) | Teachers can label “anything” without empty free-text chaos |
| N2 | Class-level **syllabus category** names (teacher- or school-seeded) with optional weights field (even if engine not live) | Matches PowerSchool / Canvas / FACTS pattern; unlocks AVG later |
| N3 | Default map work-kind → category at create; teacher can refile | Fast capture UX |
| N4 | Score schemes per column: numeric, pass-fail, letter, rubric-level, complete/incomplete, narrative-only | Elementary + specials + Christian school marks |
| N5 | Capture / KEYGRADE **type hint** from work-kind (vision prompt + UI chip) | Better AI drafts without new kinds |
| N6 | Missing / incomplete / excused **cell codes** vocabulary (doc + UX copy) | Teacher trust; FACTS-like codes |
| N7 | Christian / classical seeds (e.g. memorization / memory verse) as presets, not hard-coded theology | Spring Baptist / FACTS-like |
| N8 | Keep Approve gate; AI scores never auto-post | Existing product law |

### Desired (P1)

| ID | Capability | Rationale |
|---|---|---|
| D1 | Full **ClassSyllabus** weighted engine (AVG-P1) | Real averages teachers expect |
| D2 | Drop-lowest / replace / retake policy on category | Canvas-like; AVG-R1 |
| D3 | Rubric templates linked to work-kind | Essay/project/presentation |
| D4 | Formative vs summative facet (filter + report) | Separate from category weights |
| D5 | Parent-safe views of category averages (no peer compare) | FERPA-aware transparency |

### Desired (P2)

| ID | Capability | Rationale |
|---|---|---|
| E1 | Standards / SBG columns + mastery | Secondary / district later |
| E2 | Behavior / citizenship as separate report marks (not in academic GPA by default) | Policy choice for Chuck |
| E3 | Kindergarten checklist / ESNU scales | Early elementary |
| E4 | SIS export mapping (FACTS / PowerSchool category codes) | Multi-school |
| E5 | Author pack presets that stamp work-kind + default category | Author ↔ gradebook join |

---

## 3. Phased roadmap

| Phase | Ship | Depends |
|---|---|---|
| **P0** | Seeds + score schemes + capture hints + cell codes (docs/UX) | None |
| **P1** | AVG ClassSyllabus weights + drop/replace | AVG-P1 implement |
| **P2** | SBG / checklist / SIS maps / Author stamps | Multi-school + counsel |

---

## 4. Schema sketch (plan only — no SQL apply)

Conceptual (Architect owns real migrations later):

- `work_kind` — text/enum seed on `assignments` (expand beyond `homework`)
- `syllabus_categories` — per class: name, weight_pct, sort, include_in_average
- `assignments.category_id` → syllabus category (plus denormalized label OK)
- `assignments.score_scheme` — enum
- `grade_cells` / existing grades: support code enum `M|I|EXC|ABS|…` alongside numeric
- Optional `formative_summative` facet

Do **not** invent migrations on this card.

---

## 5. UX surfaces

| Surface | Change |
|---|---|
| Create / edit assignment | Work-kind picker (searchable seeds) + category + score scheme |
| Capture → Needs | Type hint from work-kind; teacher can change before Approve |
| Gradebook column header | Kind chip + category |
| Office | Optional school-seeded category templates for Spring Baptist |
| Parent | Category averages only after Publish/Approve rules; no peer histogram |

---

## 6. Open questions for Chuck

1. For Spring Baptist, prefer **FACTS-like teacher-built categories** or a **school-seeded locked list** office controls?  
2. Should **participation / citizenship / behavior** ever sit inside academic average, or always separate marks?  
3. Is **memory verse / Bible quiz** a first-class preset for Christian templates, or generic “memorization”?  
4. Trial priority: **richer labels only** first, or accelerate **AVG weighted syllabus** before Spring Baptist?  
5. Kindergarten / early elementary on the trial roster — need checklist/ESNU in v1 or numeric-only OK?  
6. Should pop quizzes default to **calendar-hidden** until Publish (existing calendar law) regardless of work_kind?

---

## 7. Acceptance for a future implement card

- [ ] Seed work-kinds live in create-assignment UI  
- [ ] Score scheme selectable; complete/incomplete works end-to-end  
- [ ] Capture hint uses work-kind  
- [ ] Missing/incomplete codes enterable  
- [ ] No weighted math until AVG-P1 ships (or explicitly scoped)  
- [ ] QA: synthetic fixtures from `notes/qa-fixtures/corpus-v2/` labeled with kinds  
- [ ] verify-before-done + no auto-publish AI grades  

---

## 8. Pointers

- Research: `notes/company/gradeable-work-types-research.md`  
- Digest: `notes/research/2026-09-24-gradeable-work-types-report.md`  
- AVG: `notes/company/avg-spec-syllabus-ia.md`  
