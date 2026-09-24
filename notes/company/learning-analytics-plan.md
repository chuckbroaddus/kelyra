# Learning & Education Analytics Plan (LA-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Research:** `notes/company/learning-analytics-research.md`  
**Digest:** `notes/research/2026-09-24-learning-analytics-report.md`  
**Cards:** `t_58a377ea`  
**Stack:** Expo + Supabase Edge. No app/SQL from this card.

**Product law:** Analytics must be **actionable and hat-walled**. Teachers see own classes. Office sees school. Parents see own child only — never peer rankings. Prefer ops metrics (missing, Needs age, Ride) over vanity engagement. **Not legal advice** — follow `ferpa-compliance-plan.md`.

**Trial archetype:** Spring Baptist Academy (FACTS-adjacent private Christian K–12).

---

## 0. Decision lock (recommended)

| Decision | Lock |
|---|---|
| Essential model | **Hybrid:** teacher classroom grade/missing/completion/trend charts **first** from existing gradebook; office adoption + at-risk + grade-distribution rollups next; defer SIS-style BI / standards heatmaps / item analysis until instrumentation |
| P0 fuel | `approved_score`, due dates, categories (AVG), Needs/Approve timestamps, parent links, Ride health, AI usage (AICRED) |
| Parent surfaces | Child-only approved grades + personal missing/trend — **no** class histogram, **no** classmate comparison |
| Engagement / page views | **Out of P0** — vanity until `analytics_events` exists |
| Attendance charts | **Out** until attendance product exists (MVP deferral stands); do not fake from Ride |
| Equity / subgroup | **Out of trial** unless Chuck + counsel; if ever, n-threshold + complementary suppression |
| Teacher-vs-teacher culture | Office distributions **opt-in framing as support**; default teacher Insights = self only |
| Chart grammar | Histogram, line, stacked/grouped bar, bullet, sparkline, roster table, queue-age histogram — **no** 3D pie / vanity composites |
| Implementation | Future Eng card(s); this card = research + plan only |

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| App code / SQL migrations on this card | Research epic |
| Hermes AI staffing / worker dispatch | CoS research only |
| District data warehouse / Tableau embed in P0 | Overkill for Spring Baptist |
| Fake MAP-style growth percentiles from homework | Misleading; MAP/Star own that |
| Page-view “engagement score” for teachers or parents | Vanity; no events yet |
| Peer comparison charts for parents | FERPA / culture harm |
| Attendance % dashboards before attendance schema | Product gap |
| Standards mastery heatmaps before standards library | Deferred SBG (MVP L9) |
| Item analysis before KEYGRADE stabilize | Premature |
| Claiming “FERPA certified analytics” | Soft posture only; counsel later |
| Replacing FACTS/SIS report cards | Kelyra complements; export later |

---

## 2. Needed vs Desired

### Needed (P0) — Spring Baptist trial

| ID | Capability | Rationale |
|---|---|---|
| N1 | **Teacher Insights** surface (tab or desk section) scoped to own classes | Industry-standard classroom home for analytics |
| N2 | Missing / late / incomplete rate by assignment + by student | #1 teacher action metric (Canvas / Classroom / FACTS language) |
| N3 | Assignment completion % and on-time % | Completion ops; filters empty-submission columns carefully |
| N4 | Grade distribution histogram (approved scores only) | Spot crisis / inflation |
| N5 | Class average trend + category averages (AVG syllabus when published) | “Why this grade” at class level |
| N6 | At-risk flags (configurable: avg below threshold, missing streak, sudden drop) | Intervention roster for teacher |
| N7 | Needs / Approve queue age (P50/P90 hours; count by tab) | Kelyra-native ops KPI |
| N8 | **Office Analytics** tiles: at-risk student count, D/F or fail-rate rollup, classrooms with activity | Admin triage without teacher surveillance framing |
| N9 | Adoption KPIs: teachers active /7d, parents linked %, classes with ≥1 approved grade | Trial success signal |
| N10 | Ride dismissal health summary (reuse GTM monitoring signals) | Wedge ops |
| N11 | AI credit burn read-only (link AICRED office console) | Margin + fairness |
| N12 | Hat walls + Approve-only inputs + no parent peer charts | FERPA-minded product law |
| N13 | Aggregation threshold constant (default n≥5 suppress) for any school-level small cell | Disclosure avoidance habit |

### Desired (P1–P2)

| ID | Capability | Phase |
|---|---|---|
| D1 | Formative vs summative dual trend (category / work_kind) | P1 |
| D2 | Explicit mark codes M/I/Excused as first-class cell states | P1 |
| D3 | CSV export (teacher: class; office: school) with audit log | P1 |
| D4 | `analytics_events` instrumentation (screen, action) — adoption accuracy | P1 |
| D5 | Office grade distribution by teacher **with** culture/policy toggle | P1 |
| D6 | Parent-safe personal sparkline (own child only) | P1 |
| D7 | Standards / mastery heatmaps | P2 |
| D8 | Item analysis (KEYGRADE MC) | P2 |
| D9 | Attendance join charts | P2+ (attendance epic) |
| D10 | Equity/subgroup with counsel + n-gates | P2+ |
| D11 | BI export (Looker Studio / Power BI / Parquet) | P2 |
| D12 | MAP/Star import connectors | P2 (assessment, not native) |

---

## 3. Phased roadmap

### P0 — Teacher Classroom Insights (weeks 0–4 trial)

1. Read-only Insights from existing assignments + submissions + Needs timestamps.  
2. Charts: missing/late, completion/on-time, grade histogram, average trend, at-risk list, Needs age.  
3. Teacher-only RLS / hat.  
4. No new event pipeline required.  
5. Copy: “Based on approved grades” — never draft AI scores.

### P1 — Office Analytics (weeks 4–8)

1. School rollups: at-risk count, fail-rate, adoption, Ride health, AI budget pointer.  
2. Optional grade-distribution-by-class with “support view” framing.  
3. Parent-safe child sparkline (approved only).  
4. Schema sketch for `analytics_events` (log only; charts may still use SoT tables).  
5. CSV export + simple audit.

### P2 — Advanced

1. Standards heatmaps (after standards tags).  
2. Item analysis (after KEYGRADE response warehouse).  
3. Attendance when product exists.  
4. BI export / optional Power BI pattern (FACTS-like).  
5. Equity cuts only with counsel + thresholds.

---

## 4. Schema / instrumentation sketch (plan only — no SQL apply)

### 4.1 Prefer compute-on-read for P0

- Inputs: `assignments`, `submissions` (`approved_score`, `approved_at`, status), syllabus categories, Needs/inbox timestamps, `parent_students`, Ride health views, `ai_usage_events` (from AICRED plan).  
- Pure TS aggregators (AVG pattern: `syllabusAverage.ts` style) behind Edge or client-safe RPCs.  
- **No** materialized warehouse in P0.

### 4.2 Future tables (P1 card)

| Table | Purpose |
|---|---|
| `analytics_events` | Append-only: `school_id`, `actor_id`, `hat`, `event_name`, `entity_type`, `entity_id`, `meta jsonb`, `created_at` |
| `analytics_snapshots` (optional) | Nightly school tiles for office (at-risk count, adoption) — avoid hot scans |
| `analytics_exports` | Audit: who exported what, when, row counts |

Event names (examples): `insights.view`, `needs.open`, `grade.approve`, `ride.match`, `parent.link.accept`.  
**Do not** log homework image bytes or raw LPR plates into analytics_events.

### 4.3 Threshold config

- `schools.analytics_min_n` default **5** (Chuck may set 10).  
- At-risk defaults: avg < **70**, missing streak ≥ **3**, drop ≥ **15** points in **14** days — office-configurable later.

### 4.4 RLS sketch

- Teacher: SELECT aggregates for `class_id` they teach.  
- Office: school_id match.  
- Parent: SECURITY DEFINER child-only DTO (AVG family path).  
- Service role: event insert from Edge.

---

## 5. UX surfaces

| Surface | Audience | Contents |
|---|---|---|
| **Teacher → Insights** | Teach hat | Missing, completion, histogram, trends, at-risk, Needs age; deep-link to Needs / student |
| **Office → Analytics** | Office / superintendent | Tiles + tables; Ride; AI budget link; adoption |
| **Parent → Progress** | Parent hat | Own child approved grades + missing + personal sparkline only |
| **Student** | Student hat | Own to-do / scores already; no new peer charts |

**Chrome law:** Do not invent a fifth tray slot; Insights is a Teach desk section/tab. Office Analytics under office home/settings. No parent “class insights.”

---

## 6. Open questions for Chuck

1. At-risk defaults: keep **70 / 3 missing / 15pt-14d** or Spring Baptist–specific?  
2. Office **by-teacher** grade distributions in P1, or teacher-self only until culture buy-in?  
3. Aggregation **n=5 vs n=10** for school tiles?  
4. Parent personal sparkline in P1 or wait?  
5. Should Needs queue age be visible to **office** (ops) or teacher-only (culture)?  
6. Tie AI burn chart into Office Analytics now, or only AICRED console?  
7. Any FACTS export expectation for Spring Baptist report-card season?

---

## 7. Acceptance criteria (future implement card)

1. Teacher Insights shows missing %, on-time %, grade histogram, average trend for **own** class only.  
2. Draft / unapproved AI scores **never** appear in Insights or parent charts.  
3. At-risk list matches configured thresholds; tapping opens student / Needs.  
4. Needs age P50/P90 visible to teacher; empty inbox shows zeros not errors.  
5. Office tiles: at-risk count, adoption %, Ride health summary, AI budget remaining (or link).  
6. Parent cannot see classmates or class distribution.  
7. Any aggregated school cell with n < `analytics_min_n` is suppressed or rolled up.  
8. No page-view engagement chart shipped in P0.  
9. No SQL from the research card; implement card owns migrations.  
10. FERPA copy in UI: “Approved grades only” / “Your child only” where relevant — not a compliance badge.

---

## 8. Work breakdown (future Eng — not this card)

| Workstream | Owner hint | Depends |
|---|---|---|
| Aggregator library (TS) | Eng | AVG averages, submissions fetch |
| Teacher Insights UI | Eng + Designer | Chrome tab placement |
| Office Analytics UI | Eng | Hats / office routes |
| Needs age metrics | Eng | Inbox timestamps SoT |
| Ride tile | Eng | Existing Ride health |
| AI burn tile | Eng | AICRED N1–N9 |
| Events table migration | Eng | P1 |
| Export + audit | Eng | P1 |
| QA / DITL | QAS | Teacher + office + parent hats |

---

## 9. Cross-links

- Research: `notes/company/learning-analytics-research.md`  
- Digest: `notes/research/2026-09-24-learning-analytics-report.md`  
- FERPA: `notes/company/ferpa-compliance-plan.md`  
- AVG: `notes/company/avg-spec-architecture.md`  
- AI credits: `notes/company/ai-credits-billing-plan.md`  
- GTM / Ride: `notes/research/2026-09-24-production-gtm-report.md`
