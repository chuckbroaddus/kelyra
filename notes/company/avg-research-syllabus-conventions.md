# K-12 Syllabus & Category-Weight Conventions Research (AVG-R1)
**Date:** 2026-09-02  
**Researcher:** research-feedback (artifact only)  
**Sources cited:** District handbooks (SCS, Springfield PS, Bryan ISD, Forney ISD, SISD, PWCS), SIS docs (Skyward, PowerSchool/PowerTeacher Pro), quickgrad.es guide, AP/IB overviews. No invented "typical" values.

## Distinction: Course Syllabus vs Assignment Rubric
- **Syllabus** (class/course level): Defines how the *final grade* is computed — categories/types, their % weights toward term/final, marking periods (quarters/semesters), special rules (makeup, late, drop/replace, floors, rounding). Set by teacher/dept at class setup; visible to students/parents via syllabus or portal. Lives in gradebook config.
- **Rubric** (per-assignment): Scoring guide for *one artifact* (criteria, levels, points). Independent of syllabus weights. Kelyra Author emits lesson HTML; rubrics are separate from category weights.

Current Kelyra (per data-model.md + kinds-metrics.md): per-assignment `category`/`term`/`weight_band`/`weight_percent`/`include_in_average`. No class-level syllabus table yet. AVG HOLD pending this research + CoS/CEO gate.

## Observed Conventions from Real Districts & SIS
### Category Weights & Types (examples, not exhaustive)
- **Common split**: Formative (HW, quizzes, classwork, participation, labs) 20-40% vs Summative (tests, projects, exams, portfolios) 60-80%. Many equitable policies cap formative ≤30%.
  - SCS (Shelby County): Elementary — HW 5%, Participation 5%, Classwork 40%, Projects 5%, Assessments 45%. Min grades per category/quarter.
  - Springfield PS (equitable): Formative 0-30%, Summative 70-100%; eliminate participation categories; course-alikes standardize %.
  - Bryan ISD: Daily grades (formative) vs Major (summative); redo opportunities for <75 on daily.
  - SISD / Forney ISD / others: Formative 30-40%, Major/Summative 60-70%; AP/Dual Credit may differ (follow college or district AP rules).
- Limits: No single category >40% in many policies. Min/max # of grades per category per term (e.g., 4-12 HW, 2-3 tests).
- Categories often admin-defined in SIS (teacher cannot invent arbitrary ones).

### Terms / Marking Periods
- Quarters (9 weeks typical), semesters (2 per year), full year.
- Final grade calc: Often weighted quarters + exam (e.g., Q1 40% + Q2 40% + Exam 20%). Or continuous semester gradebook.
- Skyward: Supports Grade Weighting (terms/exams), Category Weighting per grading period, Decaying Average, Cumulative.
- PowerSchool/PowerTeacher Pro: Category Weighting (per term/class), Total Points, copy settings across terms/classes. Traditional Grade Calculations config.

### Special Grade Rules (frequent in handbooks)
- **Drop/replace lowest**: Common for tests/quizzes (e.g., makeup replaces lowest test score). Sometimes per-category.
- **Makeup/Redo/Retake**: Allowed within window (progress report or 9-week deadline); often capped (max 70-85% or "highest earned"). Grade Intervention/Repair for failing periods. Credit Recovery for HS.
- **Late work**: Deadlines enforced; penalties capped (e.g., letter-grade max drop, or min 50%). Not accepted after 2 weeks in some. No blanket penalties in equitable policies.
- **Extra credit**: Strongly discouraged or eliminated in modern equitable guidelines.
- **Incompletes**: Time-bound (e.g., 6 weeks) or becomes F.
- **Rounding/Floors**: Nearest whole %; 50% floor (equitable, avoids 0 bias); some auto 69→70. Truncate vs round rules vary.
- **Standards-based**: Emerging (4-point mastery rubrics, Power Law); vs traditional 100-pt %.
- **GPA weighting**: Separate from classroom % — AP/IB/Honors often +0.5 to +1.0 on 4.0/5.0 scale (district policy). Classroom grades usually unweighted %.

### SIS Gradebook Modes (PowerSchool, Skyward, Canvas)
- **Category Weighting**: Primary for syllabus-style (fixed % per type, independent of points).
- **Total Points**: Proportional to assignment value.
- **Other**: Grade Weighting (across terms), Subjective (teacher override), Not Graded.
- Teachers set per class/term; often copy from prior. Class description must document the system for parents.
- Canvas: Assignment Groups + weights; integrates to SIS.

### FERPA / Access
- Students/parents entitled to see *their own* grades, progress, how final computed (via parent portals in SIS, report cards, syllabus). 
- Teacher-only: Internal draft calculations, notes, some behavioral flags. Full transparency expected on syllabus rules. No evidence of "teacher-only weights" — weights are published.

## v1 Recommendation Mapping (Kelyra AVG)
| Convention                  | Must-have in v1                  | Later (v2+)                     | Out of scope |
|-----------------------------|----------------------------------|---------------------------------|--------------|
| Class syllabus table (categories, weights, terms) | Yes — class setup UI + storage | Advanced term weighting, multi-year | - |
| Category averages → weighted final | Yes (core of syllabus) | - | - |
| include_in_average per assignment | Already live; keep teacher-controlled | - | Never default quiz=true |
| Drop/replace lowest per category | Configurable rule (e.g., replace 1 lowest test) | Multi-rule | - |
| Makeup/redo with cap % | Per-category policy + window | - | - |
| Late penalty caps / deadlines | Basic policy flags | - | - |
| 50% floor, rounding modes | Configurable (district default) | - | - |
| Formative/Summative split enforcement | Via category groups | - | - |
| Standards-based / mastery calc | - | Yes | Full Power Law |
| AP/IB/Dual Credit overrides | Per-class flag (follow external) | GPA weighting integration | College transcript sync |
| FERPA portal visibility | Read-only parent view of syllabus + grades | - | - |

## Explicit Configuration Knobs Kelyra Must Support (class syllabus)
- List of categories/types (admin-seeded or teacher-defined within policy; e.g., Homework, Quiz, Test, Project, Lab, Participation).
- Weight % per category (sum 100%; enforce ≤40% per in some policies).
- Term/period definition (quarter, semester; start/end dates or # of terms).
- Per-category rules: drop_lowest_n, replace_lowest_with_makeup (cap %), include_in_average default.
- Global class rules: late_penalty_mode (none/capped/letter), makeup_window_days, redo_max_pct, min_floor (50), rounding (nearest, truncate), extra_credit_allowed (bool).
- Marking period weighting for final (e.g., quarters + exam %).
- AP/Advanced flag (separate weighting or external policy note).
- Visibility: syllabus published to parents/students (FERPA).

**Sources (excerpted):**  
- https://scsk12.org/ci/files/2022/GRADING-FAQs.pdf (SCS categories/weights)  
- https://oregon.gov/ode/educator-resources/Documents/Springfield_Public_Schools_Equitable_Grading_Guidelines.pdf (formative/summative, equitable rules)  
- https://quickgrad.es/guides/how-schools-calculate-grades (total pts vs weighted, terms)  
- Bryan ISD, Forney ISD, SISD, PWCS handbooks (redo, late, floors)  
- Skyward/PowerSchool teacher docs (calculation types, category weighting)  
- AP/IB GPA weighting overviews.

**Next per task:** Comment ticket with this file path. No implementation. No edits to src/ or Author. Ready for CoS/CEO review gate.