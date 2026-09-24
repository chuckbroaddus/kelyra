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
