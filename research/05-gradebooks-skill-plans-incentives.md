# Grade books, skill tracking, learning-focus plans, and incentives (2026)

**Status:** Partial  
**Date:** 2026-08-12  
**Query:** Modern digital grade books and assessment systems that integrate AI analysis of student work. How they support skill-based tracking, trends over time, and generation of individual learning-focus plans. Effective, low-effort incentive strategies for students and parents.

## Executive takeaway

K–12 platforms in 2026 fold AI into scoring written work, tracking standards over time, and turning results into next steps—but few actually **auto-write a personal learning-focus plan**. Teachers can score free-response work with AI rubrics, watch mastery chronologically, and use class heatmaps or gap lists to group students and draft practice. The most automatic individual plan in this set is Khan Academy’s Readiness Check; most grade-book AIs stop at diagnostics, grouping, or teacher-edited drafts. The lowest-effort incentives with the strongest evidence are **short, frequent parent messages** about missing work, attendance, and what to improve.

## AI analysis of student work

Several grade books and add-ons now score or comment on student work against a rubric or a teacher-set focus, then leave the teacher in control of the grade students see. PowerSchool Assessment (Performance Matters) builds PowerBuddy into item writing and assessment creation and uses AI rubric scoring to grade essay-type and free-response questions at scale. [S1] Formative’s Luna reviews one selected free-response at a time—including images of handwritten work—suggests criterion levels with a short explanation, and lets the teacher adjust, override, or regrade; it does not auto-score the whole class. [S2]

CoGrader scores a full class set criterion by criterion (essays, DBQs, CER, constructed response, short answer), drafts per-student feedback, flags likely AI-written work with evidence, and only after teacher approval can push scores and comments into Google Classroom, Canvas, or Schoology—or export a gradebook CSV. [S4] Class Companion likewise offers instant scoring and customizable feedback, plus dashboards on strengths, growth, engagement, and integrity (copying, pasting, leaving the tab, typing anomalies, similar responses), with roster and grade sync to those same three LMS platforms on school and district plans. [S6] Gemini in Google Classroom can draft feedback from the student’s writing, grade level, and a teacher-specified focus area, but only on Education Plus or the Teaching & Learning Add-on, and teachers are told to check the draft. [S5]

Otus Insights sits inside the gradebook rather than on a single assignment: launched from Standards or Assessments view, it analyzes current assessment and standards data and can return summaries, student groups, CSV tables, and drafts of parent emails, meeting agendas, or next-step plans. It is limited to participating districts. [S3]

## Skill-based tracking and trends over time

Standards-linked grade books keep every attempt and show whether the latest work moved the student up or down. Otus records an attempt whenever a standard is tagged to a question or rubric descriptor, then opens each student–standard cell as a chronological table and line graph, earliest to latest. [S7] Seesaw’s school/district Standards View summarizes posts tagged to standards with a date-range filter, a post count, and the color of each student’s most recent mastery. [S8] Google Classroom lets teachers tag classwork with official standards or Google learning skills (up to 10 goals) and then shows goal scores—earned points over possible points on tagged graded work or a linked rubric criterion—with up/down arrows for how the most recently graded item changed each student’s score. [S9]

Gradient (GradeCam) adds a STANDARDS Longitudinal report of average performance per standard across assignments, plus school/district Drill Into for comparing formatives on the same skill or looking at standards over time. [S10] Khan Academy’s class Skills report shows per-skill Mastery levels; the Individual Student Report Activity Log lists each activity’s date, Mastery level, items correct, and time spent, filterable by date range and activity type. [S11] Class Companion’s school/district Premium Insights break performance down by rubric and standard so teachers can watch a skill after reteaching and between assignment attempts. [S12]

## Individual learning-focus plans

Auto-generated personal plans are the exception. Khan Academy turns a short, untimed prerequisite math Readiness Check (~36 items; it does not affect mastery, Gems, or streak) into personalized Readiness exercises and a dashboard Readiness Mission that continues until every listed skill is Proficient. [S13] The teacher report names, per skill, which students need more practice and at what mastery level, plus class-wide review trends; those results are not written into the Activity or Skills reports. [S14]

Elsewhere the AI names gaps and groups students; the teacher still writes the plan. Class Companion Premium Insights convert scored work into named skill gaps (for example thesis clarity or grammar), rubric and standard breakdowns, reteaching recommendations, and auto-grouped intervention or enrichment sets; teachers then set goals and assign extra practice on the weak criterion. [S15] Its separately labeled “Custom Individual Learning Plans” are teacher-created accommodations—reading level, translation, text-to-speech, speech-to-text, extended time—not a skill sequence generated from scores. [S16] CoGrader attaches per-student criterion scores and Glow/Grow comments, then immediately builds a class skill heatmap (common growth areas, reteach vs. enrich headcounts, average by criterion) so the teacher can pick a focus skill and form flexible groups. [S17] Gradient and Kami Coach stop at ranked standards reports or misconception diagnostics from tagged or uploaded work; neither documents auto-writing an individual learning-focus plan. [S18]

## Low-effort incentives for students and parents

The highest-leverage, lowest-effort tactics are brief, frequent, actionable parent contacts—not new student reward systems. Improvement-framed notes (what to fix, including make-up work) beat praise-only messages, and attendance and course-credit moved more readily than test scores.

| Approach | What families received | Main measured effects | Cost |
|---|---|---|---|
| Weekly automated parent texts | Missed assignments, class absences, low grades | Course failures −27%; class attendance +12% [S19] | $63 variable cost for >32,000 texts |
| Weekly one-sentence teacher-to-parent messages | Individualized; notes naming what to improve (incl. make-up work) largest | Share not earning credit 15.8% → 9.3% (41% reduction) [S20] | — |
| Regular parent texts (England secondary) | Upcoming tests, whether homework was on time, what students were learning | ≈1 extra month of maths progress; absenteeism −≈½ day [S21] | ≈£6 per pupil per year |
| Weekly TIPS interactive homework | Student-led family discussion, interview, or experiment plus a parent signature | 72–91% of activities returned; 55–83% signed; two-year students higher Year-2 standardized scores (β = .11 one-year, β = .20 two-year; d = .49 vs. control) [S22] | — |
| Adaptive parent texts (all four versions) | Attendance-focused; benefit- and consequence-framed basic messages equally effective | Chronic absence −2 to −7 percentage points; no reading or math gains after one year [S23] | — |

The U.S. weekly alerts also raised retention but not state test scores, in a 22-school trial of 1,137 consenting families. One-sentence messages were tested with 435 summer credit-recovery students and worked mainly by preventing dropouts. English texts (~30 per parent; 15,697 students) made parents more likely to ask about revising for tests. TIPS, in three two-year teacher-randomized studies (575 students; elementary math, middle language arts, middle science), raised family involvement without extra homework time; students were not randomly assigned to classrooms. In the 26,000-student, 108-school attendance trial, reductions were larger for students with a prior high-absence history, and staff-written texts outperformed more automated intensified messages for the persistently absent.

## Implications for Kelyra

1. **Teacher-in-the-loop scoring is the norm.** Draft criterion scores + comments; teacher approves before anything hits the grade book or LMS. Luna is one-at-a-time; CoGrader is class-set. Do not auto-publish AI grades.
2. **The grade book cell is not enough.** Keep every tagged attempt. Otus’s student–standard chronological table + line graph is the pattern to copy. Seesaw’s last-color and Classroom’s last-item arrows are weaker than a real trend.
3. **Auto-writing a personal plan is still rare — and a wedge.** Khan Readiness Check → Mission until Proficient is the only closed loop here. Everyone else names gaps and groups; the teacher still writes the plan. Class Companion’s “ILP” is accommodations, not a skill sequence.
4. **Heatmap then assign.** CoGrader/Class Companion: named gaps → reteach vs enrich counts → teacher picks a focus skill and assigns extra practice. That is the minimum viable “plan.”
5. **Skip ClassDojo-style points as the incentive thesis.** Evidence favors short, frequent, improvement-framed parent messages (missing work, attendance, what to fix). Course credit and attendance move; state tests usually do not.
6. **One-sentence “what to improve” texts beat praise-only.** Staff-written beats extra automation for persistently absent students. Cost can be pennies per family.

## Sources

- [S1] Assessment | PowerSchool — https://www.powerschool.com/products/classroom/assessment/
- [S2] Free Response Question | Formative Help Center — https://help.formative.com/en/articles/3397054-free-response-question
- [S3] Otus Insights: Gradebook AI Assistant | Otus Help Center — https://help.otus.com/en/articles/10150250-otus-insights-gradebook-ai-assistant
- [S4] AI Grading Tool for Teachers | CoGrader — https://cograder.com/ai-grading/
- [S5] Learn about Gemini in Google Classroom — https://support.google.com/edu/classroom/answer/15410566?hl=en
- [S6] AI Tutor and Feedback | Class Companion — https://classcompanion.com/
- [S7] Navigate the Standards View of the Gradebook | Otus Help Center — https://help.otus.com/en/articles/1143474-navigate-the-standards-view-of-the-gradebook
- [S8] Using the Standards View in the Gradebook – Seesaw Help Center — https://help.seesaw.me/hc/en-us/articles/360060064332-Using-the-Standards-View-in-the-Gradebook
- [S9] Use Learning Goals in Classroom – Classroom Help — https://support.google.com/edu/classroom/answer/17074065?hl=en
- [S10] [S18] Standards Reports – Gradient Help Center — https://support.gradecam.com/hc/en-us/articles/14011993436827-Standards-Reports
- [S11] How do I use Reports to view Activity, Skills, and Assignment score reports? – Khan Academy — https://support.khanacademy.org/hc/en-us/articles/360031052391-How-do-I-use-Reports-to-view-Activity-Skills-and-Assignment-score-reports
- [S12] Class Companion Plans — https://classcompanion.com/plans
- [S13] What is the Readiness Check? – Khan Academy Help Center — https://support.khanacademy.org/hc/en-us/articles/47686822980365-What-is-the-Readiness-Check
- [S14] How do I view my students' Readiness Check results? – Khan Academy — https://support.khanacademy.org/hc/en-us/articles/47777677758861-How-do-I-view-my-students-Readiness-Check-results
- [S15] Class Companion Premium Insights guide — https://classcompanion.com/blog/the-ultimate-guide-to-unlocking-actionable-student-data-with-class-companion-premium-insights
- [S16] Tutorials – Class Companion — https://classcompanion.com/tutorials
- [S17] CoGrader homepage — https://cograder.com/
- [S19] Bergman & Chan, Leveraging Parents through Low-Cost Technology (2020) — https://static1.squarespace.com/static/60d0c05ace34212ef5a1131b/t/640570ea6622fd4805ea4a91/1678078189109/Bergman_Chan_Leveraging-Parents-through-Low-Cost-Technology_2020.pdf
- [S20] Kraft & Rogers, The Underutilized Potential of Teacher-to-Parent Communication (2015) — https://static1.squarespace.com/static/6297c2b5c8bc35721cc7a65c/t/685d1b50a1fe313d1d091445/1750932305165/Kraft+Rogers+2015+The+underutilized+potential+of+teacher-to-parent+communication+EER.pdf
- [S21] Texting Parents – Education Endowment Foundation — https://d2tic4wvo1iusb.cloudfront.net/production/documents/projects/Texting_Parents.pdf
- [S22] Van Voorhis, Costs and Benefits of Family Involvement in Homework (2011) — https://www.davidsongifted.org/gifted-blog/costs-and-benefits-of-family-involvement-in-homework/
- [S23] IES, Impact Evaluation of Parent Messaging Strategies on Student Attendance — https://ies.ed.gov/use-work/evaluations/impact-evaluation-parent-messaging-strategies-student-attendance

## Coverage and uncertainty

- Writable’s first-party AI pages did not load; Writable is omitted.
- Inspected Schoology/PowerBuddy Learning pages describe content generation and a student tutor, not AI analysis of submitted student work.
- No inspected primary page showed Infinite Campus, Seesaw, NWEA MAP, i-Ready, or Renaissance Star offering generative AI analysis of student artifacts.
- Vendor scoring accuracy, bias, and teacher-accept rates were not independently tested.
- Canvas IgniteAI SpeedGrader was not confirmed as a lasting K-12 gradebook feature after the U.S. no-cost window through June 30, 2026.
- Otus Insights and several LMS-sync features are plan- or district-gated.
- No inspected page showed MagicSchool, Brisk, Diffit, SchoolAI, or CoGrader providing a skill/standards progress-over-time visualization.
- Seesaw is most-recent mastery color, not a multi-point trend graph. Classroom arrows are last-item only.
- Class Companion “ILP” is accommodations, not a score-generated skill sequence.
- CoGrader’s auto small-group + two lesson plans is a community Gem, not a default individual plan.
- Gradient and Kami Coach do not auto-write or assign a stored per-student learning-focus plan.
- Khan does not publish the Readiness Check item-selection algorithm or the exact miss → Mission mapping.
- Kraft & Dougherty (2013) phone-call finding was not independently inspected; it is time-intensive, not low-effort.
- Parent texting improved course completion and attendance more reliably than standardized test scores.
- TIPS is higher-effort (PD + weekly assignment design) than automated texts.

### Claims dropped at verification

- Bergman & Chan’s 12-point rise in parents contacting the school is a full-sample result, not concentrated among lower-performing and high-school students as claimed.
