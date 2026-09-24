# Gradeable Work Types Plan (GWT-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_a2d9bdc1`  
**Research:** `notes/company/gradeable-work-types-research.md`  
**Dated digest:** `notes/research/2026-09-24-gradeable-work-types-report.md`  
**Stack:** Expo + Supabase. **No app/SQL from this card.**

**Depends on / keep:** AVG syllabus epic (`notes/company/avg-spec-syllabus-ia.md` et al.), `docs/data-model.md` assignment columns, `notes/authoring/kinds-metrics.md` (Author stays `kind=lesson`), `research/05-gradebooks-skill-plans-incentives.md`.

---

## 0. Product law

| Law | Meaning |
|---|---|
| **Approve gate** | Nothing is a grade until the teacher Approves (draft AI score ≠ grade). |
| **Not of record** | Kelyra is not the school SIS grade book of record in v1 (vision / MVP L2). |
| **Hybrid types** | Canonical `work_kind` vocabulary + teacher-/school-named syllabus **categories** (not a frozen enum alone, not pure free-text alone). |
| **Author labels ≠ players** | Quiz / test / midterm / final are category / work_kind labels — Author still emits `kind=lesson` only. |
| **Capture stays thin** | Phone still photographs work; type hint is metadata, not a new capture binary format. |
| **Weights belong to AVG** | This plan expands taxonomy + seeds; weighted final calc ships with ClassSyllabus (AVG), not a side engine here. |

---

## 1. Non-goals

| Non-goal | Why |
|---|---|
| App / SQL / migrations from this card | Research + plan only |
| Hermes AI staffing | Card constraint |
| Replace FACTS / PowerSchool / Skyward | Vision |
| Auto-publish AI grades | Law |
| `kind=quiz` Author player | kinds-metrics lock |
| Full SBG standards library | MVP L9 / later |
| ClassDojo behavior economy | research/05 |
| SIS/LMS category sync v1 | MVP L2/L3 |

---

## 2. Modeling decision (locked for Eng when greenlit)

### 2.1 Three facets per grade column

| Facet | Storage (sketch — Architect names) | v1 behavior |
|---|---|---|
| **`work_kind`** | Canonical key from seed vocabulary | Picker + default; filter/analytics/AI hint |
| **`category`** | Existing text → becomes key into ClassSyllabus categories when AVG ships | Keep free text + richer seeds until syllabus table exists |
| **`score_scheme`** | Extend beyond `numeric` \| `pass_fail` \| `either` | Add `complete_incomplete` in near-term; letter / rubric_level later |

**Defaulting:** `work_kind` → suggests `category` label (e.g. `exit_ticket` → “Exit tickets” or formative bucket). Teacher can refile. **No forced 1:1.**

### 2.2 Seed vocabulary (v1 ship list)

**Academic:** `homework`, `classwork`, `warmup`, `exit_ticket`, `quiz`, `test`, `exam`, `project`, `lab`, `essay`, `presentation`, `portfolio`, `practice`, `discussion`, `notebook`, `reading_log`, `memorization`, `other_academic`

**Process (often out of average):** `participation`, `effort`, `behavior`, `citizenship`, `preparedness`

**Christian / private preset extras (Spring Baptist template):** `memorization` (memory verse), `bible_quiz` (alias → quiz + Bible category), optional `chapel` (non-average)

**Admin cell states (not work kinds — track as mark codes later):** missing, incomplete, excused, absent, late, extra_credit, retake

### 2.3 Score schemes

| Scheme | v1 trial | Later |
|---|---|---|
| `numeric` | **Yes** | |
| `pass_fail` | **Yes** (live) | |
| `either` | **Yes** (live) | |
| `complete_incomplete` | **Needed soon** | |
| `letter` / ESNU | Desired | Elementary |
| `rubric_level` | Desired | With rubrics epic |
| `narrative` column | Desired | Report comments |

### 2.4 Capture / AI grading map

| Can draft via capture + AI (Approve required) | Manual-only (or later assist) |
|---|---|
| homework, classwork, warmup, exit_ticket, quiz (paper), test (paper), essay, lab write-up, worksheet, practice | participation, effort, behavior, citizenship, live oral/PE demo, concert judge |

---

## 3. Needed vs Desired

### Needed P0 (taxonomy coverage for Spring Baptist trial)

| ID | Item | Rationale |
|---|---|---|
| G0-1 | Ship expanded `work_kind` seed + teacher picker | CEO exhaustive taxonomy ask |
| G0-2 | Map work_kind → default category string on create | Teachers support “anything” without blank labels |
| G0-3 | Capture / Needs optional **type hint** (homework vs exit ticket vs quiz…) | Correct column labeling from phone |
| G0-4 | Keep Approve gate; AI draft only | Law |
| G0-5 | Christian preset pack (memorization / Bible-friendly labels) | Private school trial |
| G0-6 | Document gaps: no weighted syllabus until AVG | Honest trial scope |
| G0-7 | Do not invent quiz Author player | kinds-metrics |

### Needed P0-adjacent (small Eng, high trust)

| ID | Item |
|---|---|
| G0-8 | `complete_incomplete` score scheme |
| G0-9 | `include_in_average` default **false** for participation/behavior/citizenship seeds |

### Desired P1–P2

| ID | Item | Pri |
|---|---|---|
| G1-1 | ClassSyllabus weighted categories (AVG-P1) | P1 |
| G1-2 | Drop-lowest / retake-cap / late policy | P1 |
| G1-3 | Mark codes M/I/Exc/Abs | P1 |
| G1-4 | Letter + ESNU scales | P1 |
| G1-5 | Rubric_level scoring | P2 |
| G1-6 | SBG attempts + trends | P2 |
| G1-7 | Conduct mark separate from academic average | P1 |
| G1-8 | Specials / K checklist templates | P2 |
| G1-9 | Office-locked school category catalog | P2 |
| G1-10 | SIS/LMS category sync | P2+ |

---

## 4. Gaps vs live product (action list)

| Gap | Action owner when greenlit |
|---|---|
| Thin category examples in `docs/data-model.md` | Eng + docs after seed ships |
| No `work_kind` column | Architect sketch → migration (not this card) |
| No ClassSyllabus table | AVG epic |
| Capture kind only homework \| voice_note | Type hint metadata vs new capture kinds — prefer metadata |
| Score schemes missing complete/incomplete | Small schema + UI |
| AVG HOLD for weights | Do not fake averages |

---

## 5. Hats — stories

**Teacher:** Pick work kind when creating a column or filing a capture; rename category; choose whether it counts; Approve AI draft.  
**Student / Parent:** See published labels + approved scores only — never drafts; no need to understand `work_kind` keys.  
**Office:** Optional later — seed / lock school catalog; not v1 editor.  
**Author:** Unchanged — lesson packs; category label on assign only.

---

## 6. Phased delivery (recommendation)

| Phase | Scope | Depends |
|---|---|---|
| **A — Labels (this epic’s Eng follow-on)** | work_kind seed, picker, defaults, capture type hint, Christian preset, complete/incomplete | Chuck greenlight |
| **B — Syllabus math** | ClassSyllabus + weights + drop/retake | AVG epic |
| **C — Marks & elementary** | Mark codes, ESNU/letter, checklists | Trial feedback |
| **D — SBG / sync** | Standards attempts, LMS/SIS | Post-MVP |

---

## 7. Open questions (block Eng until answered)

1. Spring Baptist: teacher-editable categories vs office-locked list?  
2. Participation/behavior inside academic average — never / optional / school policy?  
3. Trial priority: Phase A labels only, or pull AVG weights forward?  
4. Kindergarten on roster — checklist/ESNU in Phase A or defer?  
5. Memory verse: first-class `memorization` vs generic homework + tag?

---

## 8. Acceptance for *this* research card

- [x] `notes/company/gradeable-work-types-research.md` — taxonomy + SIS patterns + hybrid recommendation  
- [x] `notes/company/gradeable-work-types-plan.md` — this file  
- [x] `notes/research/2026-09-24-gradeable-work-types-report.md` — Chuck digest  
- [ ] Card `t_a2d9bdc1` completed with summary (ops)  
- No app code, no SQL, no Hermes staffing, no force-push
