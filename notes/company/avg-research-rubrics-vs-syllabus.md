# AVG-R2 Research: Rubrics vs Syllabus vs Assignment Categories

**Task:** t_8f4c1f60  
**Date:** 2026-09-02  
**Profile:** research-feedback  
**Status:** Artifact only — no app code changes.

## Executive Summary

Kelyra photo/Ask parsing must distinguish three distinct artifacts:

- **ClassSyllabus** (course-level contract: outcomes, policies, category weights, calendar)
- **AssignmentRubric** (per-assignment scoring guide)
- **Category** (weighted buckets inside the syllabus, e.g., “Tests 40%”, “Projects 30%”)

v1 recommendation: Parse syllabus/policy/grading sections into ClassSyllabus + Categories. Defer rubric parsing to a later epic or treat as assignment-specific metadata only. This avoids conflating course-wide rules with task-specific criteria.

## Core Definitions (with Sources)

### Course Syllabus
A structured document that serves as the course roadmap, expectations guide, grading reference, and communication contract. It includes:
- Learning outcomes / standards
- Required materials
- Assignments list and calendar
- Grading system (weights, scales, policies for late work, extra credit, academic integrity)
- Instructor info, attendance, institutional policies

**Sources:**
- https://research.com/student-guides/college-process-guides/what-is-a-syllabus-and-why-does-it-matter
- AACPS Grading Policy (https://aacpsschools.org/aacpsboardpolicies/wp-content/uploads/2023/11/FINAL-II-RA-Grading-2023-v4.pdf): Requires syllabi to detail content, skills, standards, grading processes, weighting of assignments/assessments/homework, consequences for late work, progress reporting.

### Grading Policy / Category Weights
The portion of the syllabus that defines how the final grade is calculated. Typically expressed as weighted categories (e.g., Homework 10%, Quizzes 20%, Tests 40%, Projects 30%). These are course-level rules that apply across all assignments of a given type. Extra-credit rules, late penalties, and grading scales live here.

**Key distinction:** Category weights belong to the ClassSyllabus, not to any single assignment or rubric.

### Rubric Types

#### Analytic Rubric
A grid with criteria (rows) and performance levels (columns). Each criterion is scored separately. Provides detailed, targeted feedback but is time-consuming to create and students often skip reading the full table.

**Example structure (from DePaul):**
Criteria | Needs Improvement (1) | Developing (2) | Sufficient (3) | Above Average (4)
---|---|---|---|---
Clarity | ... | ... | ... | ...

**Sources:**
- https://www.cultofpedagogy.com/holistic-analytic-single-point-rubrics/
- https://resources.depaul.edu/teaching-commons/teaching-guides/feedback-grading/rubrics/Pages/types-of-rubrics.aspx

#### Holistic Rubric
Single scale with one overall descriptor per performance level. Fast to use (one score for the whole artifact) but provides poor targeted feedback. Common in standardized testing (e.g., SAT essay 0-6).

#### Single-Point Rubric
Lists only the criteria for proficiency (the “meets expectations” column). Teacher adds handwritten or digital comments for “below” and “above.” More readable for students; encourages specific feedback. Favored by many practitioners for classroom use.

#### Checklist
Binary (yes/no or present/absent) list of discrete elements. Fast but loses nuance in the middle of performance ranges. Can be derived from other rubric types.

#### Standards-Aligned Rubric
Any of the above types whose criteria are derived by “unpacking” specific standards (Common Core, NGSS, TEKS, state standards). Criteria map directly to standard components rather than generic traits.

**Sources:**
- https://www.gradingpal.com/blog/how-to-align-rubrics-to-standards-a-practical-guide-for-common-core-ngss-teks-and-state
- https://catlintucker.com/2021/09/standards-aligned-rubrics/

## Object Model Recommendation

```markdown
ClassSyllabus
- course_id, term, teacher_id
- learning_outcomes[] (standards)
- grading_scale (e.g., 90-100 A)
- category_weights[]: [{name: "Tests", weight: 0.40}, {name: "Projects", weight: 0.30}, ...]
- policies: {late_work, extra_credit, academic_integrity, ...}
- calendar: [events]

Category (child of ClassSyllabus)
- name, weight, description
- assignment_type_hint (optional)

AssignmentRubric (child of Assignment or standalone)
- assignment_id (nullable for template)
- type: "analytic" | "holistic" | "single-point" | "checklist" | "standards-aligned"
- criteria[]: [{name, description, levels or single_point_desc}]
- standards_alignment[] (optional)
- notes: "Teacher comments / evidence"
```

**What belongs on ONE assignment vs. the class syllabus?**
- Syllabus: overall weights, policies, outcomes for the whole course.
- Rubric: specific scoring criteria, performance descriptors, and standards for *this* task only. A rubric may reference a Category (e.g., “this project counts toward the Projects bucket”) but does not define the weight.

## Failure Modes of AI Parse (OCR + LLM)

Common pitfalls when photographing and parsing these documents:

1. **Weight vs. Score Confusion** — LLM extracts “Tests 40%” from syllabus but applies it as a per-assignment score instead of a category weight.
2. **Missing Extra-Credit / Late Policies** — Syllabus sections on extra credit or penalties are often in fine print or separate tables; OCR drops them or misattributes to individual assignments.
3. **Scale Mismatch (IB 1–7 vs. % vs. Points)** — Rubric uses 1–7 scale or points; parser assumes 4-point or percentage, producing invalid grades.
4. **Holistic vs. Analytic Misclassification** — Single overall score in holistic rubric parsed as multiple criteria.
5. **Standards vs. Criteria Blur** — Standards language (“Analyze and interpret data...”) copied verbatim into rubric criteria without unpacking into observable traits.
6. **Multi-Page / Table Structure Loss** — OCR on multi-column or multi-page syllabi/rubrics loses row/column relationships; weights get attached to wrong categories.
7. **Extra-Credit / Bonus Items** — Often listed separately; parser either ignores or double-counts.
8. **Student-Specific Annotations** — Handwritten teacher notes on a rubric get treated as part of the master criteria.

These modes are especially risky when the same photo contains both syllabus pages and a rubric page.

## v1 Parse-Target Recommendation

**Primary target for photo/Ask in AVG epic:** ClassSyllabus + Categories (grading policy section).

**Rationale:**
- Directly supports class setup and roster management.
- Lower risk of conflating course rules with per-assignment scoring.
- Rubrics are assignment-specific and often created or refined after the class exists.
- Single-point or analytic rubrics are better captured later when a teacher is already inside an assignment context.

**Deferred / Secondary:**
- Full rubric parsing (especially analytic or standards-aligned) should be a later feature or handled as “assignment scoring template” import.
- If a rubric photo is supplied early, store it as unstructured attachment + extracted criteria list attached to a future assignment, rather than forcing it into ClassSyllabus.

This separation keeps the object model clean and matches the stated goal: “parse syllabus/policy into class setup; parse rubric into assignment scoring later or not in this epic.”

## Citations

- Cult of Pedagogy (Jennifer Gonzalez): Holistic / Analytic / Single-Point definitions and examples. https://www.cultofpedagogy.com/holistic-analytic-single-point-rubrics/
- DePaul Teaching Commons: Types of Rubrics (analytic, holistic, checklist, developmental). https://resources.depaul.edu/teaching-commons/teaching-guides/feedback-grading/rubrics/Pages/types-of-rubrics.aspx
- Research.com: Syllabus purpose and contents. https://research.com/student-guides/college-process-guides/what-is-a-syllabus-and-why-does-it-matter
- GradingPal / Catlin Tucker: Standards alignment process. https://www.gradingpal.com/blog/how-to-align-rubrics-to-standards-a-practical-guide-for-common-core-ngss-teks-and-state and https://catlintucker.com/2021/09/standards-aligned-rubrics/
- AACPS Board Policy: Real-world syllabus and weighting requirements. https://aacpsschools.org/aacpsboardpolicies/wp-content/uploads/2023/11/FINAL-II-RA-Grading-2023-v4.pdf

---

**Next step per ticket:** Comment ticket. Wait for product IA.