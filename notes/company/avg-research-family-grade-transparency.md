# AVG-R3: Family/Parent/Student Grade Transparency Research

**Date:** 2026-09-02
**Researcher:** customer-success (Kelyra)
**Scope:** K-12 LMS parent/student views of category weights, running averages, "why this grade". Artifact only — no code changes.
**Sources:** Official docs, community guides, product overviews for Canvas, PowerSchool, Skyward HAC/Family Access, Google Classroom.

## Key Context (from task)
- CEO requirement: Syllabus setup (weights/categories) must be viewable/understandable by parents and students, not only teachers.
- HAC is the official gradebook for SchoolMarm.
- Kelyra: Grades are **not** grades until teacher Approves.
- FERPA: Parents see only linked children.
- App split: Phone = capture; Web = review/assign/grade.

## Product Breakdown

### Canvas (Instructure)
- **Parent/Observer Role (Canvas Parent app + web):**
  - View "Subject Grades" or course Grades tab.
  - **Category Weights:** Visible via Assignment Groups. Shows % weight per group (e.g., Tests 40%, Homework 30%). Group totals calculated and displayed as %.
  - **Running Averages:** Overall subject grade (percentage or points; can be restricted by teacher). Per-group percentages. Individual assignment scores/points.
  - **"Why this grade":** Assignment details include score, total points, comments, rubrics (if used), due dates, status (missing/late). Can filter by grading period. View Assignment Group Totals arrow.
  - **Missing Work:** Status icons, overdue indicators. Late policy can auto-zero missing (teacher-configured).
  - **Mobile/Accessibility:** Dedicated Canvas Parent app; real-time feedback visibility in 2025 updates. Chronological or group-sorted lists.
  - **Teacher-only:** Total grade restriction toggle, unposted/draft grades, SpeedGrader internals, assignment group weight editor, late policy setup, rubric editing, manual zeroing of missing work.
  - **Language for non-teachers:** "Assignment groups", "group totals", "scoring details", "rubrics". Clear visual % per category.

### PowerSchool (PowerTeacher Pro + Parent Portal)
- **Parent View:**
  - Categories (e.g., Homework, Quizzes, Tests, Participation) with explicit **weights** (e.g., Tests 50%).
  - **Category averages** and overall running average (weighted calculation shown or implied).
  - Assignments listed under categories with scores, points possible, due dates.
  - Missing work clearly flagged; impacts running total.
  - Term weighting support (for multi-term courses).
  - Some portals expose what-if calculators for parents/students.
  - **"Why this grade":** Detailed per-assignment breakdown + category contribution to total.
  - **Mobile:** Responsive parent portal; app-like experience.
- **Teacher-only:** Category creation/weight editing, drop-lowest rules, term weighting config, grade scale setup, ungraded assignment management.
- **Language:** "Categories", "category weights", "weighted average", "term weights". Matches syllabus language directly.

### Skyward (HAC / Family Access / Qmlativ)
- **Parent/Student Portal (Family Access):**
  - Up-to-date grades, upcoming assignments, missing work, progress toward graduation.
  - Assignments and current grades visible per class.
  - Missing assignments highlighted with impact on grade.
  - Calendar/schedule integration for context.
  - **Weights/Categories:** Assignments grouped; running averages and category contributions implied via detailed grade views (less explicit public docs on % weights vs. Canvas/PowerSchool, but grades reflect weighted setup).
  - **"Why this grade":** Per-assignment scores, comments (if any), missing flags, historical trends.
  - **Mobile/Accessibility:** Web portal optimized for families; video toolkits for parents on checking grades/missing work.
  - **Teacher-only:** Gradebook setup (categories, weights, calculations), approval workflows, internal notes.
- **Language:** "Grades", "missing assignments", "progress". Focus on actionable "what's due / what's missing".

### Google Classroom
- **Guardian View (email summaries + limited preview):**
  - **No direct grades or overall averages** in standard summaries.
  - Email digests: Missing work, Upcoming work (today/tomorrow or week), Class activities (announcements/assignments).
  - Edu Plus SKU: Guardian preview links to Classwork page (assignments list + attachments) — **but no grades, no submissions, no other students' work**.
  - Students see their own grades only after teacher returns work.
  - **Grade Categories:** Teacher-only feature for setup (e.g., "Must Do", "Aspire To Do"); appears on student Classwork but not exposed to guardians as weights.
  - **"Why this grade":** Minimal — limited to what student shares or teacher emails. No category weights or running totals for guardians.
  - **Mobile:** Email + Classroom app (students); guardians mostly email-driven.
- **Teacher-only:** All gradebook (overall grades, categories/weights, return grades, drafts), guardian invite management.
- **Language:** "Missing work", "upcoming assignments", "class activities". Grades are student/teacher conversation only.

## Parent/Student Information Architecture Recommendations
- **Transparency wins:** Expose syllabus weights + category running averages early. Show "how we got here" with per-assignment contribution.
- **Non-teacher language:** Use "Categories" or "Assignment Types" (not "Assignment Groups"). Show weights as % (e.g., "Tests: 40% of grade"). Display "Your current category average: 87%".
- **Mobile-first (phone capture context):** Simple list views with status badges (Missing, Late, Graded). Tap for "Why": breakdown of points + comments.
- **Web review:** Full table + charts of category contributions. What-if sliders where appropriate (post-approval).
- **FERPA/Linked children:** Always scope to one student; clear multi-child switching.
- **Post-Approval only:** Kelyra running averages and "final" indicators appear only after teacher Approve. Pre-approve = "Draft / Pending review".
- **Missing work impact:** Always show how missing affects category and overall (even if zero not yet applied).

## Public-to-Class vs Teacher-Only Fields
**Public (parents/students see):**
- Category / Assignment Type names and weights (%)
- Running category averages (post-approval)
- Individual assignment: name, due date, points earned/possible, status (missing/late/graded), teacher comments, rubric criteria (if applicable)
- Overall running average (post-approval)
- Grading period filters
- Missing work list + impact
- Syllabus / grade setup description (read-only)

**Teacher-only (never exposed to parents/students):**
- Draft / unapproved grades or AI scores
- Weight/category editor
- Late policy / auto-zero rules configuration
- Makeup / extension policy editor
- Student-specific internal notes or flags
- Unposted / hidden grades toggle
- Raw calculation overrides or exceptions
- Other students' data (FERPA)
- Approval workflow controls

## Next Steps / Product Implications for Kelyra
- Syllabus weights must be first-class, readable UI for families (mirrors Canvas/PowerSchool strengths).
- "Why this grade" panel: category contribution + assignment list + comments.
- Clear separation: Pre-approve (teacher draft) vs Post-approve (family visible).
- Recommend family-view spec ticket (as per task).

**RECOMMENDED NEXT ACTION (per task):** Comment ticket for product family-view spec.