# Class Landing Page Research Note (LAND-R1 / Refresh of DR-11)

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to PM child  
**Citations:** Canvas LMS best practices (TAMU 2025, UIC 2026, kalamitykat.com 2026-08-28 post), Schoology vs Google Classroom comparisons (PowerSchool 2021/updated, Jotform 2025), Google Classroom usage (support.google.com 2026), edtech stats (HolonIQ/UNESCO 2026), general K-12 LMS design 2025-2026 sources via searches on course home vs stream, FERPA compliance in LMS portals.

## Executive Summary

This refresh of deep-research-11 focuses on class/course landing pages (webpage-like home vs app menu/stream) for K-12 taught classes. Research draws from 2026 Canvas/Schoology/Google Classroom/teacher Sites usage patterns, design principles, and CEO-specified AI NL edit example ("Update the Bible Verse for the Fundamentals of Math landing page to Genesis 1:1 (KJV)").

**Key answers to CEO questions (detailed below):**
1. Elements that belong: Core = announcements (time-sensitive), assignments due (today/this week), lesson topic/current focus, teacher note/welcome, calendar slice (upcoming), files/resources. Verse/quote or inspirational as optional named field (per CEO example). Clutter risks: full syllabus, all past announcements, unrelated grade-level noise, email links, static images. Above-the-fold priority per 2026 teacher design posts; reduce nav paths.
2. Automation: Live Kelyra data blocks (assignments due, calendar events, announcements from app) vs teacher-authored named fields (verse, custom note, welcome text) vs templates (syllabus header, standard layout). Draft vs published states; no auto-publish.
3. Access: Signed-in web route or in-app WebView preferred for v1 (FERPA-safe). Public URL only if strong evidence (none found for K-12 taught classes; most competitors require login/guardianship). No anonymous public class site in v1.
4. Visibility: Student (enrolled class only), parent/guardian (linked via school roster, never twins mixed, other grades/classes hidden), teacher (full edit). Role/hat-gated; fail-closed defaults. Twins (same-name students) never co-mingled per prior calendar/diary research.
5. AI: Structured NL updates to **named fields/regions only** (e.g., "Bible Verse", "Welcome Note", "Daily Focus") — teacher confirms before publish. Free HTML authoring later or never in v1. Fail-closed; no "Ask as superuser"; teacher-controlled prompts only; no student data leakage.
6. Join vs duplicate: Calendar join (reference/link) preferred over duplicate (per CAL-R1 and LPLAN-R1); lesson plans link to landing via published spans. No duplication of events or plans.
7. Competitors: Canvas (Syllabus/Front Page/Home with modules/announcements above fold, activity stream optional), Google Classroom (Stream primary — posts/assignments, calendar driven by due dates), Schoology (more LMS-rich home with messaging/grades), teacher Google Sites (custom but maintenance-heavy, less used for core classes). Real usage: Stream/home in Classroom/Canvas dominant; custom Sites for supplemental teacher pages.

**v1 Recommendation (MVP cut):**
- Webpage-like landing (not pure app menu) with named editable regions for AI NL updates (verse/quote, welcome/teacher note, daily focus).
- Live blocks: announcements, assignments due, calendar slice (joined, not duplicated), files list.
- Signed-in only (WebView or web route); parent view linked but filtered; no public anonymous.
- Templates for layout; teacher authors named fields only; Kelyra data auto-populates live blocks.
- AI: NL to named fields only, confirm-before-publish, fail-closed. Structured, not free HTML.
- Visibility matrix: student full class view; parent/guardian roster-linked summary; teacher edit; twins/other-grades hidden.
- Join calendar/lesson plans (reference); no duplication.
- Needed vs clutter: Core 6-8 elements above fold; hide nav clutter.
- Gaps noted for later: advanced parent summaries, public marketing sites (if evidence emerges), full HTML authoring.

**Gaps:** Limited 2026 public data on exact parent guardian linking FERPA edge cases for custom landing pages; adoption rates of AI NL field edits in production LMS (early); exact "named region" semantics vs HTML in real teacher workflows; strong evidence for/against anonymous public class sites in K-12 (mostly internal only).

## 1. Competitors & Real Usage (2026 Lens)

### Canvas LMS Course Home
- Homepage options: Syllabus (auto-generated from assignments, chronological), Pages Front Page (custom welcome with images/links/grades), Modules, Course Activity Stream (recent posts/announcements/assignments).
- Best practices (TAMU 2025, UIC 2026, kalamitykat 2026): Set Syllabus or custom Front Page as home for orientation; show recent announcements on home; place important info (assignments, daily plan, syllabus) above the fold; reduce navigation paths/clutter (turn off unused tabs like Files/Modules if not primary); generic naming; module overview pages.
- Above-the-fold emphasis: assignments, syllabus link, daily headlines. Email/location often removed as redundant.
- (Sources: lms.tamu.edu 2025, answers.uillinois.edu 2026, kalamitykat.com 2026-08-28)

### Google Classroom Stream
- Primary view: Stream (posts, announcements, assignments due, discussions). Calendar driven by due dates/posts; personal student calendars private.
- Usage: Dominant for K-12 due to simplicity and Google ecosystem integration. Usage reports show high daily active (10M+ Android 2024, sustained 2026). Guardians see limited unless explicitly shared.
- Less deep "home" customization than Canvas; stream is the landing.
- (support.google.com/edu/classroom 2026 reports; electroiq stats)

### Schoology Learning
- More full LMS: customizable course home with messaging, alerts, grades, assessments, collaborative tools. Integrates Google Drive deeply (auto-copy Docs).
- Vs Google Classroom: Schoology richer for engagement/data-driven decisions, templates, web hosting options; Classroom wins on ease/minimalism.
- Used where districts want scalable LMS beyond file-sharing.
- (PowerSchool blog, Jotform 2025 comparison)

### Teacher Google Sites / Custom Pages
- Used for supplemental teacher landing pages (class info, resources) alongside Classroom/Schoology.
- Pros: full custom HTML-ish design, public if desired.
- Cons: maintenance burden, no deep LMS integration (assignments/grades/calendar live), version drift. Less common as primary "class home" for core taught classes; more for static info sites.
- Real usage: hybrid (Classroom stream + Sites for extras); pure Sites rare for daily student workflow.

Honest cut: Stream/home in dominant tools (Classroom/Canvas) prioritizes recent activity + due dates over static custom pages. Custom Sites supplement but not replace. No competitor makes anonymous public the default for taught classes (FERPA/privacy).

## 2. Elements: Needed vs Clutter

From design posts + LMS patterns (2026):
- **Core (v1 needed, above fold):** 
  - Announcements (time-sensitive, recent only).
  - Assignments due (today/this week, live from data).
  - Lesson topic / current focus / daily plan link.
  - Teacher note / welcome (named field, AI-updatable).
  - Calendar slice (upcoming events, joined from CAL-R1).
  - Files / resources list (key handouts).
  - Verse/quote or inspirational (named field per CEO example; optional but supported).
- **Clutter to avoid:** Full past announcements history, full syllabus dump, unrelated grade noise, email addresses (redundant), static inspiring images (use sparingly or link out), deep nav options.
- Teacher design principle (kalamitykat 2026): "Place important... above the fold"; "Reduce the number of navigational paths"; minimize clicks.

## 3. Automation: Live Kelyra Data vs Teacher-Authored vs Templates

- **Live from Kelyra data (auto, no teacher edit needed for content):** Assignments due, announcements, calendar slice (joined), files (if uploaded via app).
- **Teacher-authored named fields (AI NL target):** Bible Verse, Welcome Note, Daily Focus, Teacher Note. Structured fields only.
- **Templates:** Standard layout/skeleton (header, sections, footer); syllabus header if integrated; reusable class theme.
- States: Draft (teacher edits) → Confirm (AI change) → Published. No auto-publish. Fail-closed.
- Later: Full teacher HTML authoring as power feature.

## 4. Access, Visibility, FERPA

- **Access routes (v1):** In-app WebView (phone captures context) or signed-in web route (browser after login). Public URL: no evidence supports as v1 default; FERPA requires controlled access for student data/records. Guardians via roster link only.
- **Visibility matrix (fail-closed):**
  - Student: enrolled class only; full view of live + named fields.
  - Parent/Guardian: roster-linked view (summary of announcements/assignments/calendar); never see twins or other grades/classes (per prior research on hats/visibility).
  - Teacher: full edit + preview.
  - No mixing across classes/grades.
- FERPA: All competitor LMS enforce login/guardian portals; public pages avoid PII/grades. Kelyra follows: no anonymous public taught-class site unless future evidence (e.g., marketing open houses) is strong. Twins/other-grades hidden by design.

## 5. AI Edit Model

- **Structured NL to named fields only:** Prompt targets specific region ("Update the Bible Verse... to Genesis 1:1 (KJV)"); system applies, shows preview, teacher confirms before publish. Taught-class scoped.
- **Fail-closed:** No free-form HTML in v1; no superuser "ask anything"; no student data in prompts; teacher review mandatory.
- **Not Ask-as-superuser:** Explicitly scoped to the class landing's named editable regions.
- **Confirmation flow:** AI proposes → teacher approves/rejects/edits → publish. Audit log.
- Later: Free HTML region as advanced option, still with confirm.

## 6. Join vs Duplicate (Calendar t_908912d4 + Lesson Plans t_4d69845a)

- Per CAL-R1 and LPLAN-R1: Join (reference/link/occupy span) preferred over duplicate for canonical data.
- Landing page: calendar slice joins the master calendar (no copy of events); lesson plan references (link to published plan) rather than embedding duplicate content.
- Benefits: single source of truth, avoids drift, supports accreditation evidence without duplication.
- Draft/published states hide unpublished items.

## 7. Open Issues / Gaps for PM

- Exact implementation of "named regions" in data model (fields vs lightweight HTML blocks).
- Parent guardian linking mechanics (roster sync details).
- Evidence threshold for considering public anonymous landing later.
- Mobile WebView performance vs native web for rich landing.
- Integration depth with existing syllabus/avg data (cross-ref AVG research).

**RECOMMENDED NEXT ACTION:** Note complete. CoS to ARM-grant product-manager child for plan writing. No code changes.