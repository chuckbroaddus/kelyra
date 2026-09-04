# Lesson Plan Research Note (LPLAN-R1 / Refresh of DR-10)

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to PM child  
**Citations:** Cognia Essential Requirements for Initial Accreditation (2026 PDF), edusfere.com 2026 accreditation guide, radius.ac top lesson planning software 2025, Common Curriculum site, Planbook blog, hicarl.ai (CARL), monsha.ai, lessn.ai, easyclass.ai, t0ggles.com, PowerSchool curriculum docs, Chalk/Planboard references, TEA-related district examples via general K-12 searches.

## Executive Summary

This refresh of deep-research-10 focuses on accreditation-oriented lesson plans (working scripts + required records for compliance/continuous improvement), distinct from interactive student-facing HTML packs. Research draws from 2026 sources on Cognia/TEA/WASC expectations, competitor tools (Planbook, Common Curriculum/Chalk, Canvas, Google Classroom, PowerSchool), and emerging AI-assisted authoring (CARL, Monsha, Lessn, EasyClass, t0ggles).

**Key answers to CEO questions (detailed below):**
1. Required fields/artifacts: Core are objectives/standards alignment, materials/resources, procedures/activities (with timing), assessment/monitoring plan, differentiation/accommodations, reflection/notes. Accreditation emphasizes documented instructional design + student learning assessment plan (Cognia ER7); evidence of sustained alignment and continuous improvement cycles, not just binders.
2. Speed in successful apps: Templates (daily/weekly/unit), last-year copy/reuse ("bump" or copy forward), AI draft from syllabus/unit/topic + standards/calendar context, drag-drop calendar integration, real-time collab, standards mapping/tracking. Examples: Common Curriculum drag-drop + standards map + reuse; Planbook color-coded templates + curriculum lookup + prior-year notes; AI tools generate full plans + worksheets in <60s from topic/standards.
3. Calendar span: Yes — published plans occupy calendar spans (period/day/week) in most tools (Planboard calendar view, Common Curriculum calendar, Canvas global calendar, Google Classroom due-date driven). Join (link/reference) preferred over duplicate for canonical plan; supports recurring, color-coded layers. Draft vs published states common (unpublished not visible until actioned).
4. Execution diary / what-worked: Distinct private surface recommended (see DIARY-R1). Join vs duplicate: Diary is owner-only reflection (encrypted, STT, notes on "what worked"); plans are the public/working record. Private diary not evaluable for accreditation; ledger/audit separate for compliance. Accreditation needs evidence of taught vs planned, but reflection stays teacher-private.
5. Day-of use (run-of-show) vs parent-visible: Fail-closed — full internal plans (detailed procedures, differentiation notes, internal reflections) teacher-only or office-review only. Parent summary: high-level objectives + overview only if explicitly shared/published; no full plan exposure. Day-of is teacher run-of-show (detailed timing, materials, checks); parent gets simplified view or none.
6. Additional: High state/district variance (TEA/TEKS more prescriptive for public/charter vs Cognia general performance standards). Specials (art/music/PE) have more flexible timing/structure vs core subjects. Substitutes: need access to published plans + materials lists (many tools support sub views or print/export). Office/admin: view/comment/feedback in v1 only if research-backed (Common Curriculum admin dashboard for accountability); teacher writes, office reviews. No student/parent authoring in v1.

**v1 Recommendation (MVP cut):** 
- Teacher-authored lesson plans with required fields: objectives/standards, materials, activities/procedures + timing, assessment, differentiation, reflection/notes.
- Fast authoring: templates, copy-from-last-year, AI draft ("write from this syllabus unit" or topic + standards) — teacher edits/approves, never auto-publish.
- Calendar integration: plans link to/occupy spans in teacher calendar (day/week view); draft state hides until published.
- Diary/reflection: separate private diary (per DIARY-R1), not mixed into plan.
- Visibility: taught-class teacher primary writer; fail-closed for parents (summary only if defined share); office none in v1 unless accreditation requires (review/comment only).
- AI scope: draft generation, standards tagging, timing suggestions, materials lists — teacher-controlled, no superuser ask.
- Needed vs desired: Core = standards-aligned plan + calendar link + private reflection. Desired later = advanced AI remixing, full parent summaries, sub-optimized exports, office analytics.

**Gaps:** Sparse public data on exact TEA vs district lesson plan mandates (TEA focuses on TEKS alignment + documented curriculum); limited 2026 evidence on parent exposure risks or substitute plan efficacy; exact join semantics for calendar vs plan duplication in accreditation audits; real adoption rates of AI tools in accredited districts (early stage per sources).

## 1. Competitors & District LMS

### Planbook
- Strong on templates, color-coding, curriculum guidelines lookup per grade/subject, prior-year copy + notes for improvement, drag-drop, file attachments, sharing with colleagues/admins.
- Calendar views implied in planning flow; easy reuse year-over-year.
- Focus on teacher efficiency + organization; supports standards adherence without heavy admin overhead.
- (Sources: blog.planbook.com teacher tips 2016-2025 updates, radius.ac 2025 review)

### Common Curriculum (Chalk/Planboard integration)
- Collaborative unit/lesson planning, standards mapping/tracking as you plan, drag-drop rearrange + "bump" lessons, reuse/copy across years/classes, real-time collab, differentiation notes, calendar view.
- Admin dashboard for viewing/following up on all plans, custom school templates, school archive.
- Backward planning from goals/assessments; standards coverage visible.
- Pricing: free basic, low-cost Pro; used by 300k+ teachers.
- Strong on accreditation accountability (admin access without teacher creating classes).
- (commoncurriculum.com, radius.ac)

### Chalk / Planboard (PowerSchool)
- Calendar-centric lesson scheduling, color-coded, merged views, filters.
- Templates, curriculum alignment, sub-friendly exports.
- PowerSchool Curriculum & Instruction: lesson templates, submission/review workflow, coach/principal view/comment/feedback.
- 145M+ lessons planned cited.
- (powerschool.com, radius.ac)

### Canvas LMS modules
- Course-level planning with modules, assignments, due dates driving calendar.
- Global calendar aggregating courses; filterable.
- Standards alignment via outcomes; evidence tracking for accreditation.
- Teacher plans visible to enrolled; limited parent/guardian views unless shared.
- Strong on assessment/monitoring integration.

### Google Classroom + Calendar
- Per-class calendars driven by due dates/posted items; drafts/scheduled hidden until published.
- Personal events private to student Google Calendar; guardians see nothing unless explicitly shared.
- Simple, no native deep lesson plan fields or standards mapping; relies on attachments/docs.
- Fail-closed by default for parents.

### Others (PowerSchool Presence, SportsYou for non-academic)
- Merged calendars, publish workflows, role-based visibility.
- SportsYou: opt-in team calendars for families (not academic plans).

Honest cut: Most tools prioritize pacing/calendar over deep accreditation "evidence binder" — they enable continuous records via plans + standards tracking, but accreditation bodies (Cognia) accept the documented program + assessment plan as evidence. No tool is a "public firehose"; visibility is role/hat-gated.

## 2. Required Fields / Artifacts (Accreditation Lens)

From Cognia ER7 (2026): Documented educational program (curriculum/instructional design) + plan for assessing/monitoring student learning.

Common fields across tools + accreditation needs (2026 sources):
- Objectives / learning goals / standards alignment (TEKS/CCSS/NGSS mapping mandatory for evidence).
- Materials / resources / tech.
- Procedures / activities / instructional sequence (with timing/duration).
- Assessment (formative/summative, checks for understanding, rubrics).
- Differentiation / accommodations / scaffolds (ELL, IEP, tiered).
- Timing / pacing / sequence across days/weeks.
- Reflection / notes / what worked (for continuous improvement cycles; often private or post-lesson).
- Evidence artifacts: standards coverage reports, taught vs planned logs (for Cognia continuous model).

Needed (v1): objectives/standards, materials, activities+timing, assessment, differentiation. 
Desired later: full reflection integration, automated evidence export, sub plans auto-generated.

## 3. AI-Assisted Authoring

2026 tools (CARL, Monsha, Lessn, EasyClass, t0ggles, Radius):
- Draft full lesson from topic/syllabus unit + grade + standards (under 60s in many).
- Auto standards tag/alignment (50+ state standards, TEKS, Common Core).
- Timing suggestions, materials lists, activities, differentiation paths, assessments, worksheets/handouts generated from the plan.
- Teacher edits/remixes; "write from this syllabus unit" supported via upload or context.
- Not auto-publish: always teacher review/approve.
- Extras: facilitator guides, image gen with guardrails, export to Docs/Slides/PDF/LMS, remixing shared library (credit preserved).
- Calendar tie-in: some (t0ggles, Common Curriculum) parse NL into dated tasks/lessons.
- Scope limit: No student data in prompts; teacher-controlled; no "Ask as superuser".

Matches requirements exactly; avoids over-scope.

## 4. Calendar / Diary / Parent Joins

- **Calendar span:** Plans occupy spans (period/day/week) via link/join in calendar views (not duplicate content). Recurring, color/layer filters common. Draft state (internal only) vs published (calendar-visible) — matches t_908912d4 join semantics.
- **Diary / execution notes:** Separate private diary (per DIARY-R1) for "what worked", reflections, run-of-show anecdotes. Not duplicated into plan; accreditation uses plan + ledger/evidence, not private diary. Private = owner-only, not evaluable.
- **Parent-visible:** Fail-closed. Full plans (detailed procedures, internal notes) teacher-only. Parent summary = objectives + high-level overview only on explicit publish/share. No full internal plan exposure (avoids FERPA/compliance issues).
- Join vs duplicate: Prefer join/reference for canonical plan (avoids sync issues in audits); calendar events reference the plan ID.

## 5. Hats & Variance

- Taught-class teacher: primary writer/owner.
- Office/admin: none in v1 (or review/comment only if accreditation mandates evidence review — Common Curriculum model); teacher does not create classes.
- Students/parents: only if defined share (summary); fail-closed default.
- Substitutes: access to published plans + materials (export/print views).
- State/district: TEA/TEKS districts more prescriptive on documented alignment + pacing; Cognia/WASC focus on sustained evidence + improvement. Specials (electives) allow flexible timing vs core (math/ELA fixed blocks). Variance high — research shows district policy often exceeds state minimum.

## 6. Needed vs Desired Capability Cut

**Needed (v1 for accreditation support + teacher speed):**
- Core fields + standards mapping.
- Templates + last-year copy + AI draft (syllabus/unit).
- Calendar span link (draft/published).
- Private diary separate.
- Fail-closed parent summary.
- Teacher writes; no office creation.

**Desired (later):**
- Advanced AI (remix, full materials gen, NL calendar add).
- Office analytics/dashboard for compliance.
- Sub-optimized exports.
- Parent share workflows.
- Full evidence export for Cognia reviews.

## RECOMMENDED NEXT ACTION

Note complete. CoS can ARM-grant product-manager child for plan authoring. No code/SQl changes. Handoff ready — PM can write spec without re-research.