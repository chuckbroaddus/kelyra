# Gradeable Work Types — Research + Plan Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/gradeable-work-types-research.md` · `notes/company/gradeable-work-types-plan.md`  
**Card:** `t_a2d9bdc1`  
**Access date for cited public URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full taxonomy and sources live in the SoT pair above.

---

## Top recommendations

1. **Hybrid model (not fixed enum, not pure free-text):** canonical `work_kind` vocabulary for AI/filters/presets **plus** teacher-/school-named syllabus **categories** for grade math (AVG).
2. **v1 Spring Baptist = Phase A labels:** expand work_kind seeds + picker + capture type hint + Christian extras (`memorization` / Bible-friendly); add `complete_incomplete` score scheme; keep Approve gate.
3. **Do not ship weighted finals in this card’s Eng follow-on** — that is AVG ClassSyllabus; be honest in trial that averages stay simple until AVG.
4. **Copy SIS/LMS pattern:** categories first, assignments belong to one category, optional category weights, per-column include-in-final (PowerSchool, Canvas groups, Google Classroom, Skyward, FACTS).
5. **Skip for v1:** SIS of record, auto-publish AI grades, quiz Author player, SBG library, Dojo-style behavior points, office-locked catalogs (unless Chuck picks locked).
6. **Default participation / behavior / citizenship out of academic average** (`include_in_average=false`); policy can re-enable later.
7. **AI can draft** photo homework / quizzes / essays / labs; **manual** for live participation, PE demos, conduct — still Approve for anything that becomes a grade.

---

## Research (full SoT)

# Gradeable Work Types Research (GWT-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_a2d9bdc1`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)

**Related (do not rebuild):**  
- `research/05-gradebooks-skill-plans-incentives.md` — AI scoring, standards trends, ILP rarity  
- `notes/company/avg-research-syllabus-conventions.md` (AVG-R1) — district weights, floors, drop/replace  
- `notes/company/avg-research-rubrics-vs-syllabus.md` (AVG-R2) — syllabus ≠ rubric ≠ category  
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1) — ClassSyllabus + SyllabusCategory sketch  
- `notes/authoring/kinds-metrics.md` — Author emits `kind=lesson`; quiz/test are category labels  
- `docs/mvp.md` / `docs/data-model.md` / `docs/vision.md` — simple grade book; Approve gate  
- Plan SoT: `notes/company/gradeable-work-types-plan.md`

**Constraints for this card:** Research + recommendation only. No app code, no SQL apply, no Hermes AI staffing, no force-push.

---

## Executive summary

Teachers grade far more than “homework / quiz / test.” A practical taxonomy for Kelyra spans **academic artifacts**, **process/soft measures**, **specials & elementary checklists**, **non-assignment marks**, and **calculation mechanics** (weights, drop-lowest, retakes, incomplete). Every major SIS/LMS (PowerSchool, Skyward, Canvas, Google Classroom, FACTS/RenWeb) converges on the same shape: **teacher- or school-defined categories + assignment columns that belong to one category + optional category weighting** — not a fixed global enum of work kinds.

**Verdict — hybrid model (recommended):**

1. **Canonical work-kind vocabulary** (enum-like keys for AI capture hints, filters, calendar chips, Author labels) — seedable, not locked.  
2. **Class syllabus categories** (teacher-/school-named buckets with weights) — AVG-P1 already sketched; this is the grade-math surface.  
3. **Map work-kind → default category** at create time; teacher can refile.  
4. **Score schemes** per column: numeric / pass-fail / letter / rubric-level / complete-incomplete / narrative-only.  
5. **v1 Spring Baptist trial:** expand category seed + score schemes + capture type hint; keep simple grade book law (Approve before grade); defer full weighted engine / SBG / behavior as GPA until AVG syllabus ships.  
6. **Do not** become district SIS of record; do not auto-publish AI scores.

---

## 1. Problem framing for Kelyra

| Reality | Product implication |
|---|---|
| Capture → Needs → Approve / KEYGRADE already files **homework photos** and **practice** into `assignments` | Need richer **labels** so teachers can support “anything they might want” without inventing a second gradebook |
| Live `assignments.category` defaults `homework`; free text includes quiz, test, midterm, final, project, presentation, participation, behavior, other (`docs/data-model.md`) | Seed list is thin vs classroom reality; no class-level weight contract yet |
| MVP M9: “No weights, no categories, no CSV yet” (`docs/mvp.md`) | Research must separate **taxonomy coverage** from **weighted average engine** |
| Vision: not official school of record; no SIS passback in v1 | Flexibility for private/Christian trial (Spring Baptist / FACTS-like expectations) without PowerSchool parity |
| Author: quiz/test are **category labels**, not players (`kinds-metrics.md`) | Work-type research must not spawn `kind=quiz` HTML runtimes |

**CEO ask (2026-09-24):** exhaustive practical taxonomy; SIS/LMS patterns; modeling recommendation; needed vs desired for Spring Baptist v1 vs later; gaps vs current product; open questions.

---

## 2. Exhaustive taxonomy (practical)

Organized as **facets** a teacher may combine on one grade-book column. One assignment row is usually **one primary work kind** + **one syllabus category** + **one score scheme** + **term** + **include_in_average**.

### 2.1 Academic artifacts (product of student work)

| Work kind (canonical key) | Typical labels teachers use | Notes |
|---|---|---|
| `homework` | Homework, HW, home practice | Classic nightly; often low weight / formative |
| `classwork` | Classwork, seatwork, in-class | Same day; may be completion-based |
| `warmup` | Warm-up, bell ringer, do-now | High frequency, low stakes |
| `exit_ticket` | Exit ticket, exit slip | Capture-friendly; short formative |
| `quiz` | Quiz, check, pop quiz | Short assessment; may be hidden until publish (calendar law) |
| `test` | Test, chapter test, unit test | Summative mid-length |
| `exam` | Exam, midterm, final, semester exam | High weight; often own category |
| `project` | Project, PBL, performance task | Multi-day; often rubric |
| `lab` | Lab, lab report, science investigation | Specials + secondary science |
| `essay` | Essay, paper, DBQ, CER, constructed response | AI rubric drafts (research/05) |
| `presentation` | Presentation, speech, oral | Partial AI; often rubric + live observe |
| `portfolio` | Portfolio, writing folder, binder check | Cumulative; may be checklist |
| `discussion` | Discussion, Socratic, seminar | Participation-adjacent; Canvas treats Discussions as graded items |
| `practice` | Assigned practice, intervention set | Kelyra closed loop — keep distinct from original capture |
| `worksheet` | Worksheet, packet | Often homework/classwork alias |
| `notebook` | Notebook check, interactive NB | Completeness + quality mix |
| `reading_log` | Reading log, minutes | Elementary + ELA |
| `memorization` | Memory verse, poem, fact fluency | **Christian / classical school** common (FACTS examples) |
| `performance` | Concert, game film, demo | Fine arts / PE / athletics academic credit |
| `other_academic` | Catch-all | Teacher-named |

### 2.2 Process / soft / non-content measures

| Work kind | Typical labels | Gradebook caution |
|---|---|---|
| `participation` | Participation, engagement | Equitable policies often ban or shrink (AVG-R1 Springfield) |
| `effort` | Effort, work habits | Often separate from academic average |
| `behavior` | Behavior, conduct | Frequently **not** in academic average; office discipline separate |
| `citizenship` | Citizenship, stewardship | Private/Christian report cards |
| `collaboration` | Group work / teamwork | Rubric criterion more often than category |
| `preparedness` | Materials, homework turned in | Overlaps attendance/missing |
| `organization` | Binder, locker, desk | Elementary checklist |

### 2.3 Attendance-linked & administrative marks (often not “assignments”)

| Kind | How schools handle | Kelyra note |
|---|---|---|
| `attendance_grade` | Some still grade attendance | Prefer out of academic average; Ride/attendance elsewhere |
| `missing` / `incomplete` / `excused` / `absent` | Score codes, not work types | FACTS grading codes pattern; cell state not category |
| `late` | Policy flag + optional penalty | Syllabus rule, not a work kind |
| `extra_credit` | Separate category or 0-max assignment | Equitable guidelines discourage; support as optional category weight 0 or excluded |
| `retake` / `correction` | Replaces or averages prior | Policy on category (AVG-P1), not a permanent work kind — may be second submission / linked column |
| `drop_lowest` | Category rule | Calc engine, not taxonomy row |

### 2.4 Formative vs summative (meta-facet, not exclusive kind)

| Band | Examples | Typical weight role |
|---|---|---|
| **Formative** | warm-up, exit ticket, homework, classwork, quiz (sometimes) | 0–40% in equitable policies |
| **Summative** | test, exam, project, major essay, portfolio defense | 60–100% |
| **Ungraded formative** | practice drafts, diagnostics | `include_in_average=false` |

Kelyra already has `weight_band` = `none` \| `daily` \| `major` \| `custom` — useful **hint**, not a substitute for syllabus category weights (AVG-P1).

### 2.5 Score schemes (how the cell is recorded)

| Scheme | Use | Averages? |
|---|---|---|
| `numeric` (points or 0–100 %) | Default secondary | Yes |
| `letter` | A–F / ESNU | Map via scale for average, or display-only |
| `pass_fail` | Labs safety, some quizzes | Live `score_scheme`; never average as % without map |
| `complete_incomplete` | Warm-ups, reading logs | Completion % or exclude |
| `rubric_level` | 1–4 / Emerging–Mastered | Standards-based path; average later |
| `checklist` | Kindergarten skills, IEP progress (careful FERPA) | Often narrative + marks |
| `narrative` | Report-card comments, Glow/Grow | Not a number; teacher_note / parent_sentence |
| `either` | Live Kelyra: numeric or pass_fail | Keep |

### 2.6 Specials, elementary, secondary, private/Christian nuances

| Context | Common gradeables | Modeling note |
|---|---|---|
| **Elementary** | Checklists, ESNU, reading levels, behavior/citizenship separate | Favor complete/incomplete + narrative; light weights |
| **Kindergarten** | Developmental checklists, not % averages | Do not force 100-pt average |
| **Specials (PE / music / art / library)** | Performance, participation, skill demo, concert | Often fewer categories; performance + participation |
| **Secondary** | Weighted categories, exams, labs, essays | Full syllabus weights |
| **AP / Dual / IB** | External policy; may differ weights | Per-class flag (AVG-R1); not GPA engine in v1 |
| **Private / Christian (FACTS)** | Memory verse, chapel participation, stewardship, Bible quiz | Seed Christian-school presets; teacher-named categories |
| **Standards-based (SBG)** | Standards as “columns,” attempts over time (Otus pattern in research/05) | Later; keep attempts + trend, not only last color |

### 2.7 Non-assignment “grades” teachers still want on a report

- Term comment / narrative report-card blurb  
- Conduct / citizenship mark separate from academic average  
- Effort mark  
- Standards mastery summary (later)  
- Attendance summary (join Ride / office — not invent gradebook attendance)  
- Mid-quarter progress flag  

These are **report artifacts**, not always `assignments` rows. Model as syllabus-adjacent fields or term marks later — do not overload every comment into a weighted category.

---

## 3. SIS / LMS patterns (what to copy vs keep flexible)

### 3.1 Pattern catalog

| Pattern | Who | Copy? | Keep flexible? |
|---|---|---|---|
| **A. Categories first, then assignments** | PowerSchool, Skyward, FACTS, Canvas groups | **Yes** — cannot create scored columns without a bucket | Allow school seed + teacher rename |
| **B. Category weighting (weights sum ~100%)** | PowerSchool Category Weighting; Classroom Weighted; Canvas Assignment Groups; Skyward percent-to-categories; FACTS Percent | **Yes for AVG** — not required for GWT taxonomy alone | Allow Total Points mode later |
| **C. Total points** | PowerSchool default; Classroom; Canvas unweighted | Later option | v1 can stay “simple cells” until syllabus |
| **D. Term / reporting-period weighting** | PowerSchool Term Weighting | Later (quarters → semester) | |
| **E. Drop highest/lowest in group** | Canvas assignment group rules | Desired with AVG | |
| **F. Count in final override per assignment** | PowerSchool “Count in Traditional Final Grade” | Maps to `include_in_average` | Keep teacher override |
| **G. Extra points / extra credit** | PowerSchool Extra Points; Skyward 0-max or No Count | Optional | Do not encourage as default policy |
| **H. Standards on assignment** | PowerSchool standards count; Skyward standards GB; Otus attempts | Later SBG | Capture skill_gaps already exist |
| **I. Score codes (M, I, Excused, Absent)** | FACTS grading codes; most SIS | Needed for missing workflow | Cell state ≠ work kind |
| **J. Admin-locked vs teacher-editable categories** | Skyward often admin; PowerSchool district may lock; Classroom teacher-owned | Private school: teacher/office seed | Spring Baptist: start teacher-editable |

### 3.2 Vendor signals (public docs; accessed 2026-09-24 CT)

| Vendor | Categories | Calc modes | Source |
|---|---|---|---|
| **PowerSchool / PowerTeacher Pro** | Homework/tests-style categories; category must exist before assignment | Total points, term weighting, standards weighting, category weighting, mixed | [Grade Calculation Types](https://ps.powerschool-docs.com/powerteacher-pro/latest/grade-calculation-types); [Working with Assignments](https://ps.powerschool-docs.com/powerteacher-pro/latest/working-with-assignments) |
| **Canvas** | Assignment Groups (teacher-named); Discussions/Quizzes are still “assignments” | Weight final grade based on groups; drop lowest/highest | [Yale Canvas weighted groups](https://help.canvas.yale.edu/a/914596-creating-weighted-assignments-groups); [CU Boulder Assignment Groups](https://oit.colorado.edu/services/teaching-learning-applications/canvas/help/instructor-support/assignment-groups) |
| **Google Classroom** | Grade categories (Homework, Essays, Quizzes, Tests…) | No overall / Total points / Weighted by category (weights sum 100%) | [Set up grading](https://support.google.com/edu/classroom/answer/9184995); [Add grade category](https://support.google.com/edu/classroom/answer/9194393) |
| **Skyward** | Categories often admin-defined; color-coded | Total points vs percents assigned to categories; weight multiplier per assignment | District guides e.g. [Dover SD Skyward guide](https://www.doversd.org/downloads/documents_and_forms/staff_-_skyward/skyward_gradebook_teacher_guide.pdf); [SchoolDay Skyward Gradebook Guide](https://help.schoolday.com/hubfs/Knowledge%20Base/Schemes%20%26%20Diagrams/Skyward_Gradebook_Guide.pdf) |
| **FACTS / RenWeb** | Categories required before assignments; weights; term checkboxes; color | Points vs Percent; ParentsWeb shows categories | [Create Assignment Categories in FACTS SIS (PDF)](https://catholicschoolsbq.org/wp-content/uploads/2025/09/Create-Assignment-Categories-in-FACTS-SIS.pdf); RenWeb University / school training manuals |

**Takeaway to copy:** flexible named categories + optional weights + per-column include flag.  
**Takeaway to skip for v1:** mixed double-count formulas, full standards-weighting into traditional grade, district-locked category catalogs, SIS grade passback.

### 3.3 Alignment with research/05

- Teacher-in-the-loop AI scoring (CoGrader, Formative Luna, Gemini Classroom) attaches to **artifacts** (essay, free response) — work kinds that are photographable or typed.  
- Standards trend graphs (Otus) need **attempts over time**, not only category averages.  
- Participation/behavior are weak incentive levers vs parent messaging — do not center product thesis on behavior points (Dojo-style).

---

## 4. Gaps vs current Kelyra product

| Area | Live / documented today | Gap |
|---|---|---|
| Capture kinds | `homework` \| `voice_note` | No first-class exit_ticket / quiz / lab capture typing — only assignment category after Approve |
| Assignment category | Free text; default `homework`; short seed list in data-model | Not exhaustive; no school presets; no Christian seeds |
| Syllabus / weights | `weight_band`, `weight_percent`, `include_in_average`, `term` — **no** `class_syllabi` | AVG HOLD; weighted final not first-class |
| Score schemes | `numeric` \| `pass_fail` \| `either` | Missing complete/incomplete, letter, rubric_level, narrative-only column |
| Practice loop | Distinct practice assignment from capture | Keep; ensure category defaults (e.g. formative / practice) |
| Author | `kind=lesson` only; category labels quiz/test | Correct — do not invent quiz player |
| Grade book scope | Simple teacher grid; not of record | Still true; taxonomy must not imply SIS replacement |
| Behavior / citizenship | Listed in category examples | No separate conduct report mark |
| Missing/incomplete codes | Not a first-class cell vocabulary in docs skimmed | Needed for teacher trust |
| Specials / K checklists | Not modeled | Later templates |
| SBG / standards library | Explicitly out of MVP (L9) | Later; skill_gaps are teacher-named |

---

## 5. Modeling recommendation (Kelyra)

### 5.1 Hybrid (not pure enum, not pure free-text)

```
School (optional seed catalog)
  └── ClassSyllabus (AVG)
        └── SyllabusCategory { key, name, weight_pct, rules… }
              └── Assignment { work_kind, category_key, score_scheme, term, include_in_average, … }
                    └── Submission { approved_score | mark_code | narrative }
```

| Layer | What it is | Why |
|---|---|---|
| **`work_kind`** | Canonical vocabulary (enum-like string keys from §2) | AI capture hint, filters, calendar chips, Author label mapping, analytics |
| **`category_key`** | Points at syllabus category (teacher-named) | Grade math — Homework 10% / Tests 40% |
| **`score_scheme`** | How the cell is entered | Numeric vs checklist vs narrative |
| **`mark_code`** (later) | M / I / Exc / Abs / Late | Cell state independent of kind |

**Defaulting rule:** creating an assignment with `work_kind=quiz` suggests category “Quizzes” if present, else creates/asks. Teacher always wins.

**Do not** force 1:1 work_kind ↔ category. Teachers often put quizzes and tests in one “Assessments” bucket, or split “Major” / “Daily.”

### 5.2 Fixed enum vs teacher-defined vs hybrid

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Fixed global enum only | Simple AI | Teachers invent names; Christian schools blocked | Reject |
| Pure free-text only | Flexible | No filters, bad AI, broken weights | Reject as sole model |
| **Hybrid** | Presets + rename + custom | Slight complexity | **Recommend** |

### 5.3 What capture / AI can grade vs manual-only

| Work kinds | AI draft score/gaps? | Manual-only? |
|---|---|---|
| Photographed homework, worksheets, exit tickets, quizzes (paper), essays, labs (written) | **Yes** — existing analyze path; teacher Approves | |
| Digital lesson / practice sets | **Yes** — metrics → draft; Approve | |
| Live presentations, PE skill demo, oral | Partial (rubric assist later) | Observation scores often manual |
| Participation, behavior, citizenship, effort | No reliable AI | **Manual** (and often out of average) |
| Memorization (verse) | Possible with audio later | v1 manual or typed check |
| Narrative comments | AI draft one-liner already (parent_sentence) | Teacher edits |

**Law unchanged:** nothing is a grade until Approve (`docs/data-model.md`, vision).

### 5.4 Relationship to AVG syllabus epic

This GWT card **feeds** AVG: expands the **seed list** of category/work kinds and clarifies facets. It does **not** replace AVG-P1 ClassSyllabus tables. Weighted calculation remains AVG’s job.

---

## 6. Needed vs desired (Spring Baptist v1 vs later)

### Needed for trial / near-term (taxonomy + labeling — not full SIS)

1. Expand **canonical `work_kind` seed** + UI picker (homework, classwork, warm-up, exit ticket, quiz, test, exam, project, lab, essay, presentation, practice, participation, other + Christian extras: memorization / Bible).  
2. Map work_kind → **default category label** on create; allow override.  
3. Extend **score_scheme** toward complete/incomplete (+ keep numeric / pass_fail).  
4. Capture flow: optional **type hint** (exit ticket vs homework) so Needs inbox and grade column are labeled correctly — still one photo → Approve.  
5. Preserve **Approve gate**; AI drafts only.  
6. Document that **weights** remain simple / AVG HOLD unless syllabus ships before trial — do not pretend weighted finals exist.

### Desired later

1. Full **ClassSyllabus** weighted engine (AVG-P1).  
2. Drop-lowest / retake-cap / late policy knobs.  
3. Mark codes (missing/incomplete/excused).  
4. Letter scales + ESNU elementary presets.  
5. Rubric_level / analytic rubrics per assignment.  
6. Standards-based attempts + trends (research/05 Otus pattern).  
7. Conduct/citizenship **separate** from academic average.  
8. Specials & kindergarten checklist templates.  
9. School-admin locked category catalogs (Skyward-like) if multi-teacher office demands.  
10. SIS/LMS category sync / passback (explicitly later / out of MVP).

### Out of scope

- Replacing FACTS/PowerSchool as official grade book of record  
- Auto-publishing AI grades  
- ClassDojo-style behavior point economy as core thesis  
- Full state standards library (MVP L9)

---

## 7. Open questions for Chuck

1. For Spring Baptist, prefer **FACTS-like teacher-built categories** or a **school-seeded locked list** office controls?  
2. Should **participation / citizenship / behavior** ever sit inside academic average, or always separate marks?  
3. Is **memory verse / Bible quiz** a first-class preset for Christian templates, or generic “memorization”?  
4. Trial priority: **richer labels only** first, or accelerate **AVG weighted syllabus** before Spring Baptist?  
5. Kindergarten / early elementary on the trial roster — need checklist/ESNU in v1 or numeric-only OK?  
6. Should pop quizzes default to **calendar-hidden** until Publish (existing calendar law) regardless of work_kind?

---

## Sources

- [S1] PowerSchool — Grade Calculation Types — https://ps.powerschool-docs.com/powerteacher-pro/latest/grade-calculation-types  
- [S2] PowerSchool — Working with Assignments — https://ps.powerschool-docs.com/powerteacher-pro/latest/working-with-assignments  
- [S3] Google Classroom — Set up grading — https://support.google.com/edu/classroom/answer/9184995  
- [S4] Google Classroom — Add a grade category — https://support.google.com/edu/classroom/answer/9194393  
- [S5] Canvas @ Yale — Creating Weighted Groups — https://help.canvas.yale.edu/a/914596-creating-weighted-assignments-groups  
- [S6] CU Boulder — Assignment Groups — https://oit.colorado.edu/services/teaching-learning-applications/canvas/help/instructor-support/assignment-groups  
- [S7] FACTS — Create Assignment Categories (Catholic Schools BQ PDF) — https://catholicschoolsbq.org/wp-content/uploads/2025/09/Create-Assignment-Categories-in-FACTS-SIS.pdf  
- [S8] Skyward secondary guides (district) — e.g. https://www.doversd.org/downloads/documents_and_forms/staff_-_skyward/skyward_gradebook_teacher_guide.pdf  
- [S9] Kelyra `research/05-gradebooks-skill-plans-incentives.md` (2026-08-12; skimmed 2026-09-24)  
- [S10] Kelyra AVG-R1 / AVG-R2 / AVG-P1 company notes (2026-09-02)  
- [S11] Kelyra `docs/mvp.md`, `docs/data-model.md`, `docs/vision.md`, `notes/authoring/kinds-metrics.md`

All URLs accessed **2026-09-24 CT**.

---

## Plan (full SoT)

# Gradeable Work Types Plan (GWT-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_a2d9bdc1`  
**Research:** `notes/company/gradeable-work-types-research.md`  
**Stack:** Expo + Supabase. **No app/SQL from this card.**

### Product law (short)

Approve gate · not of record · hybrid work_kind + categories · Author stays `kind=lesson` · capture stays thin · weights belong to AVG.

### Phased delivery

| Phase | Scope |
|---|---|
| **A — Labels** | work_kind seed, picker, defaults, capture type hint, Christian preset, complete/incomplete |
| **B — Syllabus math** | ClassSyllabus + weights + drop/retake (AVG) |
| **C — Marks & elementary** | Mark codes, ESNU/letter, checklists |
| **D — SBG / sync** | Standards attempts, LMS/SIS |

### Needed P0

G0-1 work_kind seed + picker · G0-2 default category map · G0-3 capture type hint · G0-4 Approve gate · G0-5 Christian preset · G0-6 honest AVG HOLD · G0-7 no quiz player · G0-8 complete/incomplete · G0-9 participation/behavior default out of average.

---

## Coverage and uncertainty

- Did not independently log into PowerSchool/FACTS tenants; patterns from public docs + school PDFs.  
- Skyward admin-lock vs teacher-edit varies by district configuration.  
- Spring Baptist exact handbook not in-repo; Christian seeds are informed estimates from FACTS training examples.  
- Live DB may differ from `docs/data-model.md` — Architect verifies before Eng; this card invents no migrations.
