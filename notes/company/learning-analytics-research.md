# Learning & Education Analytics Research (LA-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_58a377ea`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)  
**Legal posture:** Product + UX research for Kelyra. **Not legal advice.** Analytics surfaces that expose student PII must follow role hats and FERPA-minded disclosure avoidance — see `notes/company/ferpa-research.md` / `ferpa-compliance-plan.md`. Not a claim that Kelyra is FERPA-certified.

**Related (do not rebuild):**  
- `notes/company/avg-research-family-grade-transparency.md` · `avg-spec-architecture.md` — weighted categories, Approve gate, family DTOs  
- `notes/company/gradeable-work-types-research.md` — work kinds, missing codes, SBG deferred  
- `notes/company/ferpa-research.md` / `ferpa-compliance-plan.md` — hats, aggregation, Ride notice  
- `notes/company/ai-credits-billing-research.md` / `ai-credits-billing-plan.md` — AI credit burn as admin KPI  
- `notes/research/2026-09-24-production-gtm-report.md` — Ride wedge, Spring Baptist trial  
- Plan SoT: `notes/company/learning-analytics-plan.md`  
- Dated digest: `notes/research/2026-09-24-learning-analytics-report.md`

**Constraints for this card:** Research + recommendation only. No app code, no SQL apply, no Hermes AI staffing, no force-push.

**Stack:** Expo + Supabase. Trial archetype: Spring Baptist Academy (private Christian K–12, Texas) — FACTS/RenWeb-adjacent buyer, not a large public LEA BI shop.

---

## Executive summary

Industry learning analytics for **teachers** converge on a small actionable set: **grade distribution, missing/late/incomplete rates, assignment completion & on-time %, class average over time / category averages, and at-risk flags** (failing or sudden drop). LMS leaders (Canvas New Analytics, Google Classroom Insights) also ship participation/page-view proxies — useful as *secondary* signals, easy to become vanity metrics.

**Admins** in SIS/BI stacks (PowerSchool Unified Insights, Infinite Campus Analytics, FACTS Dashboard Builder, Panorama, Schoolytics) emphasize **course pass / D–F rates, grade distributions by class/teacher, at-risk roster counts, assessment growth (MAP/Star), attendance, and product adoption**. Equity/subgroup cuts exist in district products but require **role gates + n-thresholds**; Kelyra should treat them as P2+ with FERPA-minded defaults.

**Verdict — recommend hybrid essential set for Kelyra / Spring Baptist P0:**

1. **Teachers first:** charts computable from **existing gradebook** (approved scores, due dates, categories, Needs/Approve queue age) — no new page-view pipeline.  
2. **Office next:** school rollups of at-risk + grade distributions + **adoption** (teachers active, parents linked) + **Ride / dismissal ops** + **AI credit burn** (tie to AICRED).  
3. **Defer:** standards mastery heatmaps, item analysis, attendance-as-grade, heavy Tableau/Power BI export, peer-comparison-to-parents, vanity “engagement” charts.  
4. Prefer **actionable ops** (missing work, Needs age, Ride health) over LMS page-view theater.

This matches what private-school buyers already understand from FACTS gradebook + report cards, without requiring district data-warehouse maturity.

---

## 1. Industry landscape (teachers vs admins)

| Product | Teacher emphasis | Admin / office emphasis | Notes / honesty |
|---|---|---|---|
| **PowerSchool Analytics / Assessment (Unified Insights)** | Classroom grade trends, failing counts, period A–F distributions | Core-subject D&F %, grade distribution over time, GPA bands, teacher analysis by period/subject, assessment dashboards | Primary docs describe A–F mark distributions and D&F monitors — classic SIS BI, not LMS clickstream ([Teacher Analysis](https://uc.powerschool-docs.com/unified-insights/latest/teacher-analysis); [Achievement](https://uc.powerschool-docs.com/unified-insights/latest/achievement); [Core Subjects](https://uc.powerschool-docs.com/unified-insights/latest/core-subjects-summary)) |
| **Infinite Campus** | Classroom grade / attendance overlays (role-scoped) | Campus Analytics Suite / Insights Dashboard — customizable school templates | Premium suite; marketing + KB emphasize configurable admin insights ([Insights Dashboard](https://kb.infinitecampus.com/help/insights-dashboard)) |
| **Canvas New Analytics / Course Analytics** | Course grade distribution, participation, submissions, **Missing / Late / Excused** CSV reports, on-time %, last page view / last participation | Account Admin Analytics (institution) — adoption & course activity at scale | Teacher reports are the gold standard for LMS missing-work ops ([Course Analytics](https://community.instructure.com/en/kb/articles/662739-what-is-course-analytics); [Reports](https://community.instructure.com/en/kb/articles/660639-how-do-i-view-and-download-reports-in-course-analytics)). Data refresh ~24h — not real-time grading |
| **Schoology Analytics** | Course activity + assessment results | Often paired with **Performance Matters** for standards / baseball-card style assessment reporting | PowerSchool-owned stack; assessment analytics richer than daily gradebook ops ([Schoology × PM](https://uc.powerschool-docs.com/en/schoology/latest/schoology-assessment-results-in-performance-matters-analytics)) |
| **Google Classroom Insights** | Assignment completion %, average grade, active students %, insight chips (missing streak, grade jump, late rate) | Education leaders (Plus) — school/class analytics; Looker Studio / BigQuery patterns for custom BI | Plus / Upgrade entitlement; **Classroom-only data** (excludes SIS grades) ([Teacher analytics](https://support.google.com/edu/classroom/answer/14221316); [2025 Insights update](https://workspaceupdates.googleblog.com/2025/06/new-class-analytics-and-insights-in-google-classroom.html)). Missing grade state is first-class in gradebook ([2024 missing state](https://workspaceupdates.googleblog.com/2024/07/adding-missing-grade-state-to-gradebook-google-classroom.html)) |
| **Clever Portal analytics** | Light — SSO app usage for teachers | Edtech adoption: which apps used, roster sync health, participation | **Adoption / SSO analytics**, not academic mastery ([Clever Analytics](https://www.clever.com/products/clever-analytics)) |
| **Renaissance (Star / F&P)** | Screening / progress-monitor reports, instructional groups | School growth / proficiency rollups | Assessment product — not a daily gradebook. Useful as **P2 import**, not P0 native charts |
| **NWEA MAP Growth** | Achievement Status & Growth, Class Profile, RIT / percentiles, Conditional Growth Percentile (CGP), % meeting projection | School/district growth reports, median CGP, % meeting normative growth | Gold standard **interim assessment** reports — not LMS engagement ([Teacher report guide](https://connection.nwea.org/s/article/How-to-guide-for-accessing-teacher-reports); [ASG description](https://teach.mapnwea.org/impl/maphelp/Content/Data/SampleReports/AchievementStatus_Growth.htm)). Vendor norms — do not invent fake “growth” in Kelyra from homework scores alone |
| **Illuminate / Performance Matters** | Item / standards views for teachers | District assessment warehouses, scoreboards | District Assessment Management — overkill for Spring Baptist trial |
| **Schoolytics** | Teacher dashboards over Classroom/SIS connectors | School data platform / custom dashboards | Connector product; marketing claims breadth — treat as **pattern peer**, not SoT ([schoolytics.com](https://www.schoolytics.com/)) |
| **Panorama Student Success** | Early-warning / MTSS student cards (grades + attendance + behavior + SEL surveys when integrated) | Schoolwide intervention caseloads | Strong **at-risk roster** UX pattern; needs multi-source data Kelyra mostly lacks today ([Panorama Student Success](https://www.panoramaed.com/products/student-success)) |
| **BrightBytes / Clarity (historical)** | Role dashboards for teachers | District data strategy / warehouse + predictive dashboards | Historical Clarity brand = “own your data warehouse” pitch; useful caution against building a warehouse before classrooms have grades ([BrightBytes platform](https://www.brightbytes.net/brightbytes-platform-big-data-in-k12-education)) |
| **Tableau / Power BI (ed patterns)** | Rare for classroom teachers | Office / district BI: star schemas, scheduled refresh, role RLS, export | FACTS Dashboard Builder explicitly uses **Power BI** visualizations inside SIS ([Dashboard Builder](https://factsmgt.com/blog/coming-soon-sis-dashboard-builder-a-new-way-to-see-and-understand-your-data/)). Pattern for Kelyra **P2 export**, not P0 in-app BI |
| **FACTS / RenWeb** | Gradebook, standards-aligned options, missing/attendance codes, family portal grades | Report cards, transcripts, attendance, behavior; **Dashboard Builder** for enrollment / academic / ops; Data Insights for leadership aggregates | **Closest private Christian-school archetype** to Spring Baptist. Emphasizes report-card truth + family portal over Canvas-style page views ([FACTS SIS](https://factsmgt.com/features/student-information-system/); Dashboard Builder blog above) |

**Takeaway:** Teachers live on **missing + grades + completion**. Admins live on **pass rates, distributions, at-risk counts, adoption, attendance**. Assessment vendors (MAP/Star) own **growth** — Kelyra should not fake it from photo homework.

---

## 2. Essential TEACHER classroom metrics

Ranked by industry popularity × actionability for Kelyra (1 = ship first).

| Rank | Metric | Why essential | Chart | Kelyra readiness |
|---|---|---|---|---|
| 1 | **Missing / late / incomplete rates** | Universal LMS/SIS language; parents understand; drives intervention | Stacked bar by assignment or student list + % | **High** — due_at + approved_score presence; strengthen mark codes (M/I) per gradeable-work research |
| 2 | **Assignment completion & on-time %** | Canvas + Classroom headline metrics | Bullet / bar vs 100%; sparkline over weeks | **High** — submissions status + due timestamps |
| 3 | **Grade distribution / histogram** | PowerSchool + Canvas default view; spot grade inflation or crisis | Histogram (bins A–F or % bands) | **High** — `approved_score` after Approve only |
| 4 | **Class average over time / category averages** | Syllabus transparency; AVG weighted categories | Line trend; grouped bars by category | **High** once AVG syllabus published; compute-on-read already designed |
| 5 | **At-risk / intervention flags** | Failing, sudden drop, missing streak — Classroom insight chips pattern | Roster badges + count tile | **Medium** — define thresholds (e.g. avg <70, ≥3 missing, drop ≥15 pts / 14d) |
| 6 | **Grading turnaround / Needs queue age** | Unique Kelyra ops advantage (Capture → Needs → Approve) | Age histogram; P50/P90 hours in Needs | **High** — inbox / KEYGRADE / DITL timestamps; competitors rarely show this |
| 7 | **Formative vs summative trend** | Category-based (homework vs tests) | Dual line or small multiples | **Medium** — needs reliable category labels / work_kind |
| 8 | **Standards / mastery heatmaps** | SBG / Otus / PM pattern | Heatmap student × standard | **Low** — standards library deferred (MVP L9); skill_gaps are teacher-named |
| 9 | **Item analysis** (difficulty / discrimination) | Quiz/KEYGRADE power user | Table + distractor bars | **Low–Med** — KEYGRADE MC path could enable later; not Spring Baptist P0 |
| 10 | **Engagement proxies** (page views, time-on-task) | Canvas / Classroom active-% | Line of activity | **Low** — **no instrumentation**; treat as vanity until events exist; never show peers to parents |

**Teacher non-negotiable for P0:** ranks 1–6. Defer 8–10.

---

## 3. Essential ADMIN school metrics

| Rank | Metric | Why essential | Chart | Notes |
|---|---|---|---|---|
| 1 | **At-risk roster counts** | Office triage; Panorama pattern | Count tiles + exportable roster | Role: office/superintendent only |
| 2 | **Course pass rates / DFW-style** | PowerSchool D&F monitors | Bullet vs goal; by course | Private K–12: “D/F or below 70%” may fit better than college DFW |
| 3 | **Grade distributions by class / teacher** | Admin visibility | Stacked bar / small multiples | **Culture care:** frame as support, not surveillance; optional teacher self-only first |
| 4 | **Product adoption** | Clever-like signal for trial success | Teachers active /7d; parents linked %; classrooms with ≥1 approved grade | **Kelyra-native**; proves Bundle value |
| 5 | **Ride / dismissal ops KPIs** | GTM wedge | On-time dismissal window health, match rate, failure alerts | Ops, not academics — still “school analytics” |
| 6 | **AI credit burn** | Margin + fairness | Remaining pool, burn rate, top consumers | Tie to `ai-credits-billing-plan.md` |
| 7 | **Attendance** | Universal admin chart | Daily % trend | **Gap:** MVP explicitly deferred attendance (`docs/mvp.md`); do not invent from Ride alone |
| 8 | **Equity / subgroup cuts** | District accountability norm | Aggregated bars only | **ONLY** with role gates + **n-thresholds** + complementary suppression; flag FERPA; **P2+** for private academy |

---

## 4. Chart types: standard vs noise

**Ship (standard):** histogram; line trend; stacked / grouped bar; heatmap (later standards); bullet/goal; sparkline; cohort / roster table; age histogram (queue).

**Avoid (noise):** 3D pie; vanity “engagement score” composites; animated bubble charts; peer-percentile shown to parents; teacher leaderboards of grading speed without context; fake growth percentiles from homework.

**Rule:** every chart must answer “what do I do Monday?” — message parents, open Needs, schedule intervention, top-up AI, or fix Ride.

---

## 5. Privacy / FERPA (role hats)

**Not legal advice.** Cross-link: `notes/company/ferpa-compliance-plan.md`, `ferpa-research.md`, `avg-spec-security-ferpa.md`.

| Role hat | May see | Must not see |
|---|---|---|
| **Teacher** | Own classes only: distributions, missing, averages, Needs age | Other teachers’ classrooms (unless office grants); parent peer ranks |
| **Office / superintendent** | School rollups, at-risk rosters, adoption, Ride, AI budget | Cross-school (multi-tenant); unapproved drafts as “grades” |
| **Parent / student** | Own child only: approved grades, missing for that child, personal trend | Classmates, class histogram, teacher comparisons, school D/F rates with small cells |

**Controls:**

1. **Approve gate** — analytics use `approved_score` / published family DTOs only (AVG law).  
2. **Aggregation n-thresholds** — suppress cells with n < school policy (common practice 5–10; no federal fixed n — [Student Privacy FAQs](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf); [IES disclosure methods](https://ies.ed.gov/use-work/resource-library/report/technicalmethodological-report/statistical-methods-protecting-personally-identifiable-information-aggregate-reporting)).  
3. **No peer comparison to parents.**  
4. **Export controls** — CSV with audit; office-only for school exports; no public Looker without RLS.  
5. **Equity cuts** — default off for trial; counsel before any subgroup dashboard.

Private schools may not be FERPA-bound; **still treat as confidential by contract** (FERPA-R1 verdict).

---

## 6. Kelyra data readiness

### Already exists (P0 fuel)

| Domain | Evidence in product / notes | Analytics use |
|---|---|---|
| Grades / scores | `submissions.approved_score`, Approve gate | Histograms, averages, at-risk |
| Weighted categories | AVG syllabus architecture | Category averages, formative/summative split |
| Assignments + due dates | `assignments`, categories, include_in_average | Missing / on-time / completion |
| Needs / Approve / KEYGRADE | Inbox tabs, DITL / KEYGRADE jobs | Queue age, grading turnaround |
| Ride | `ride-lpr`, dismissal monitoring in GTM | Ops KPIs |
| Calendar / diary / activity | Live surfaces (FERPA inventory) | Light parent-safe activity later — not P0 charts |
| Ask / AI jobs | Edge AI + AICRED metering plan | AI credit burn admin chart |
| Parent links | `parent_students` / admin link RPCs | Adoption % |

### Needs new events / schema (defer charts that depend on these)

| Gap | Needed for | Phase |
|---|---|---|
| Page views / screen time / time-on-task | LMS engagement proxies | P2 instrumentation |
| Attendance periods / codes | Attendance % admin chart | Separate attendance epic |
| Standards tags / library | Mastery heatmaps | P2+ SBG |
| Item-level KEYGRADE responses warehouse | Item analysis | P2 after KEYGRADE stabilize |
| Explicit missing/incomplete/excused mark vocabulary | Cleaner missing rates | P0/P1 small (gradeable-work) |
| `analytics_events` append-only (optional) | Adoption + Needs age without scanning hot tables | P1 sketch in plan |

---

## 7. Competitor feature table

| Product | Teacher metrics | Admin metrics | Chart types |
|---|---|---|---|
| Canvas New Analytics | Grades, participation, missing/late/excused reports, on-time % | Account analytics | Distribution, activity lines, CSV tables |
| Google Classroom Insights | Completion, avg grade, active %, insight chips | Leader analytics (Plus) | Bars, insight cards; Looker for custom |
| PowerSchool UI | Classroom grades / failing | D&F, A–F by teacher/subject, GPA, assessments | Stacked A–F, time series, monitors |
| Infinite Campus | Role classroom views | Insights Dashboard templates | Configurable BI widgets |
| Schoology + PM | Course + assessment | Standards scoreboards | Assessment-centric |
| Clever | — | App adoption / portal | Adoption reports |
| Renaissance Star | Screening / progress | School proficiency | Assessment reports |
| NWEA MAP | ASG, Class Profile, CGP | Growth summaries | Quadrant, growth tables |
| Illuminate / PM | Item/standards | District warehouses | Scoreboard / baseball card |
| Schoolytics | Classroom connectors | School dashboards | Custom BI |
| Panorama | Student success cards | MTSS caseloads | Roster + early warning |
| BrightBytes Clarity | Role dashboards | Warehouse strategy | Predictive / district |
| Tableau / Power BI | Rare | District/office BI | Full viz grammar |
| FACTS / RenWeb | Gradebook + family grades | Report cards, attendance, Dashboard Builder | Power BI embeds, PDF/Excel export |

---

## 8. Recommendation (lock candidate)

**Hybrid essential set** (unless Chuck overrides):

- **P0 Teachers:** missing/late rates; completion & on-time %; grade histogram; class/category average trends; at-risk flags; Needs queue age.  
- **P0/P1 Office:** at-risk counts; pass/D–F rollups; grade distribution by class (culture-safe); adoption; Ride KPIs; AI credit burn.  
- **P2+:** standards heatmaps, item analysis, attendance (when product has it), equity subgroups with n-gates, BI export.  
- **Explicitly de-prioritize:** vanity engagement page views before instrumentation; peer comparison to parents; teacher surveillance culture charts without office policy.

---

## 9. Sources

| Topic | URL | Accessed |
|---|---|---|
| Canvas Course Analytics | https://community.instructure.com/en/kb/articles/662739-what-is-course-analytics | 2026-09-24 CT |
| Canvas Analytics reports | https://community.instructure.com/en/kb/articles/660639-how-do-i-view-and-download-reports-in-course-analytics | 2026-09-24 CT |
| Google Classroom teacher analytics | https://support.google.com/edu/classroom/answer/14221316 | 2026-09-24 CT |
| Google Classroom Insights update (2025-06) | https://workspaceupdates.googleblog.com/2025/06/new-class-analytics-and-insights-in-google-classroom.html | 2026-09-24 CT |
| Google Classroom missing grade state | https://workspaceupdates.googleblog.com/2024/07/adding-missing-grade-state-to-gradebook-google-classroom.html | 2026-09-24 CT |
| PowerSchool Teacher Analysis | https://uc.powerschool-docs.com/unified-insights/latest/teacher-analysis | 2026-09-24 CT |
| PowerSchool Achievement | https://uc.powerschool-docs.com/unified-insights/latest/achievement | 2026-09-24 CT |
| PowerSchool Core Subjects / D&F | https://uc.powerschool-docs.com/unified-insights/latest/core-subjects-summary | 2026-09-24 CT |
| Infinite Campus Insights | https://kb.infinitecampus.com/help/insights-dashboard | 2026-09-24 CT |
| Clever Analytics | https://www.clever.com/products/clever-analytics | 2026-09-24 CT |
| NWEA teacher reports guide | https://connection.nwea.org/s/article/How-to-guide-for-accessing-teacher-reports | 2026-09-24 CT |
| NWEA ASG report | https://teach.mapnwea.org/impl/maphelp/Content/Data/SampleReports/AchievementStatus_Growth.htm | 2026-09-24 CT |
| Schoology × Performance Matters | https://uc.powerschool-docs.com/en/schoology/latest/schoology-assessment-results-in-performance-matters-analytics | 2026-09-24 CT |
| FACTS SIS | https://factsmgt.com/features/student-information-system/ | 2026-09-24 CT |
| FACTS Dashboard Builder | https://factsmgt.com/blog/coming-soon-sis-dashboard-builder-a-new-way-to-see-and-understand-your-data/ | 2026-09-24 CT |
| Panorama Student Success | https://www.panoramaed.com/products/student-success | 2026-09-24 CT |
| Schoolytics | https://www.schoolytics.com/ | 2026-09-24 CT |
| BrightBytes platform | https://www.brightbytes.net/brightbytes-platform-big-data-in-k12-education | 2026-09-24 CT |
| Student Privacy disclosure avoidance FAQ | https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf | 2026-09-24 CT |
| IES PII aggregate reporting | https://ies.ed.gov/use-work/resource-library/report/technicalmethodological-report/statistical-methods-protecting-personally-identifiable-information-aggregate-reporting | 2026-09-24 CT |

**Vendor-marketing flag:** Schoolytics, BrightBytes, Panorama, and FACTS product pages mix capability with sales language — prefer primary help docs (Canvas, Google, PowerSchool Unified Insights, NWEA) for metric definitions.
