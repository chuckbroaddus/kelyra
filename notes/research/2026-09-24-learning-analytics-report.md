# Learning & Education Analytics — Research Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/learning-analytics-research.md` · `notes/company/learning-analytics-plan.md`  
**Card:** `t_58a377ea`  
**Access date for all URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above. Research + recommendation only — **no app implementation**. No Hermes AI staffing.

**Not legal advice.** Cross-link FERPA: `notes/company/ferpa-compliance-plan.md`.

---

## Recommendation (pick)

### Best approach for Spring Baptist: **Hybrid essential set**

| Approach | Verdict |
|---|---|
| Full SIS BI / Tableau warehouse day one | **No** — overkill; BrightBytes-class distraction |
| LMS vanity engagement (page views) first | **No** — no instrumentation; weak Monday action |
| Assessment growth (MAP/Star-style) native | **No** — those vendors own norms; import later |
| **Hybrid** = teacher gradebook charts from existing data → office adoption/at-risk/Ride/AI → advanced later | **Yes — choose this** |

### Locked recommendation bullets

- **Teachers (P0):** missing/late rates; completion & on-time %; grade histogram; class/category average trends; at-risk flags; **Needs queue age**.  
- **Admins (P0/P1):** at-risk counts; pass/D–F rollups; grade distributions by class (culture-safe); **adoption**; **Ride** ops; **AI credit burn**.  
- **Defer:** standards heatmaps, item analysis, attendance charts, equity subgroups, BI export, page-view engagement.  
- Prefer **actionable ops** over vanity. Approve-only scores. Parent = own child only.

---

## Recommended essential metric / chart set

### Teachers

- Missing / late / incomplete — stacked bar + student list  
- Completion % & on-time % — bullet / bar  
- Grade distribution — histogram  
- Class average over time + category averages — line / grouped bar  
- At-risk roster — badges + table  
- Needs / Approve queue age — age histogram + P50/P90  

### Admins / office

- At-risk student count — tile + roster  
- Course fail / D–F rate — bullet vs goal  
- Grade distribution by class — stacked bar (support framing)  
- Adoption — teachers active, parents linked, classes grading  
- Ride dismissal health — status + match/fail summary  
- AI credit burn — remaining + burn (AICRED)  

### Charts to refuse

- 3D pie; vanity engagement composites; peer ranks for parents; fake growth percentiles from homework.

---

## Top 5 implementation priorities

1. **Teacher Insights** from existing gradebook (missing, completion, histogram, trends).  
2. **At-risk flags** with simple thresholds + deep-link to Needs/student.  
3. **Needs queue age** (Kelyra-native differentiator).  
4. **Office Analytics** tiles: at-risk + adoption + Ride + AI burn.  
5. **Hat walls / Approve-only / n-threshold** before any export or subgroup idea.

---

## Coverage map

| Topic | Research § | Plan § |
|---|---|---|
| Industry landscape | Research §1 | — |
| Teacher metrics | Research §2 | Plan §2 N1–N7 |
| Admin metrics | Research §3 | Plan §2 N8–N11 |
| Chart grammar | Research §4 | Plan §0 |
| FERPA / hats | Research §5 | Plan §0, N12–N13 |
| Data readiness | Research §6 | Plan §4 |
| Competitor table | Research §7 | — |
| Phased roadmap | Research §8 | Plan §3 |
| Open questions | — | Plan §6 |
| Acceptance | — | Plan §7 |

---

## Phase snapshot

| Phase | Ship |
|---|---|
| **P0 Teacher Insights** | Missing, completion, histogram, trends, at-risk, Needs age — own class |
| **P1 Office Analytics** | School tiles, adoption, Ride, AI burn, optional by-class distribution, parent sparkline, events sketch, CSV |
| **P2 Advanced** | Standards heatmaps, item analysis, attendance, equity+n-gates, BI export |

---

## Risks

| Risk | Mitigation |
|---|---|
| **FERPA / disclosure** | Role hats; Approve-only; n-thresholds; no parent peer charts; link FERPA plan — **not legal advice** |
| **Teacher surveillance culture** | Self-first Insights; office by-teacher charts optional + support framing |
| **Vanity metrics** | No page-view charts in P0; every chart needs a Monday action |
| **Fake growth** | Do not invent MAP-like percentiles from homework |
| **Attendance gap** | Explicit non-goal until attendance product exists |

---

## Open questions for Chuck

1. At-risk thresholds (70 / 3 missing / 15pt-14d)?  
2. Office by-teacher distributions in P1?  
3. Aggregation n=5 vs 10?  
4. Parent sparkline timing?  
5. Needs age visible to office?  

---

## Key citations (primary)

| Topic | URL |
|---|---|
| Canvas Course Analytics | https://community.instructure.com/en/kb/articles/662739-what-is-course-analytics |
| Google Classroom analytics | https://support.google.com/edu/classroom/answer/14221316 |
| PowerSchool Teacher Analysis | https://uc.powerschool-docs.com/unified-insights/latest/teacher-analysis |
| PowerSchool D&F / core subjects | https://uc.powerschool-docs.com/unified-insights/latest/core-subjects-summary |
| NWEA teacher reports | https://connection.nwea.org/s/article/How-to-guide-for-accessing-teacher-reports |
| FACTS Dashboard Builder | https://factsmgt.com/blog/coming-soon-sis-dashboard-builder-a-new-way-to-see-and-understand-your-data/ |
| Student Privacy disclosure avoidance | https://studentprivacy.ed.gov/sites/default/files/resource_document/file/FAQs_disclosure_avoidance_0.pdf |
| IES aggregate PII methods | https://ies.ed.gov/use-work/resource-library/report/technicalmethodological-report/statistical-methods-protecting-personally-identifiable-information-aggregate-reporting |

*(Full source table in research.md. Fix if IES slug typo — canonical path in research §9.)*

---

## Paths written

- `notes/company/learning-analytics-research.md`  
- `notes/company/learning-analytics-plan.md`  
- `notes/research/2026-09-24-learning-analytics-report.md`
