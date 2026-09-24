# Class landing — Research + Recommended Features Digest (R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/class-landing-research.md` · `notes/company/class-landing-plan.md`  
**Also keep (unchanged architecture/security/acceptance unless noted):** sibling `*-architecture.md` / `*-security.md` / `*-acceptance.md`

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above.

---

## Top 5 P0 recommendations

1. **L0-1/2** — Webpage-like class home with named regions (`welcome`, `daily_focus`, `verse`, `header_title`).
2. **L0-3/4/5/6** — Live joined blocks: announcements, published dues, calendar slice, files (no duplicated SoT).
3. **L0-7** — Link to published lesson-plan focus (not full procedures embed).
4. **L0-8** — Signed-in only; hat RLS; twins never mixed; 5th ≠ 3rd.
5. **L0-9/10** — AI NL edit of named regions only (Bible verse example) with preview + confirm; no free HTML v1.

---

## Research (full SoT)

# Class Landing Research Note (LAND-R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (supersedes LAND-R1 / 2026-09-03)  
**Cards:** Epic `t_5a34b1ca`  
**Access date for URLs:** 2026-09-24 (America/Chicago)

**Related:** Calendar · Lesson plans · (not Diary rebuild)  
**CEO AI example:** “Update the Bible Verse for the Fundamentals of Math landing page to Genesis 1:1 (KJV).”

---

## Executive summary

Kelyra needs a **webpage-like class home** (Canvas Front Page / course home pattern) — not only app menus/tabs. Ideal landing = **named teacher-authored regions** (welcome, daily focus, Bible verse/quote) + **live joined blocks** (announcements, due work, calendar slice, files, optional lesson focus link). Access = **signed-in only** for taught-class audiences. AI edits **named fields only** with preview + confirm. Hats: teacher edits; students/parents see own class only; **twins never mixed**; 5th ≠ 3rd.

**v1 cut:** Structured landing (not free HTML); live joins; named regions including `verse`; signed-in WebView/web route; AI NL to named regions; join calendar/plans by reference.

---

## 1. Competitor / pattern analysis

### Canvas course home
- Home options: Syllabus, Pages Front Page, Modules, Activity Stream. Best practice: custom Front Page or Syllabus with **above-the-fold** essentials (welcome, Start Here, recent announcements, clear links); reduce unused nav clutter.  
- Sources: [UMass Canvas Homepages](https://www.umass.edu/ideas/digest/canvas-homepages-create-environment-learning-day-one); [TAMU course building best practices](https://lms.tamu.edu/course-management/course-building-best-practices.html); [UIC Getting Started](https://learning.uic.edu/news-stories/getting-started-in-canvas-at-uic/). Accessed 2026-09-24 (America/Chicago).

**Copy:** Webpage-like home; announcements + due work above fold; modules/files as links.  
**Skip:** Forcing Syllabus-as-home; public anonymous course sites as default.

### Google Classroom Stream
- Stream-centric; Classwork tab; calendar dues; guardians get **email summaries**, not full stream/calendar by default. Drafts/scheduled hidden.  
- Source: [Classroom calendar](https://support.google.com/edu/classroom/answer/6272985). Accessed 2026-09-24 (America/Chicago).

**Copy:** Simplicity; draft hide.  
**Skip:** Stream-only as the only “home” metaphor if CEO wants webpage-like landing; guardian-blind as only parent story.

### Schoology course homepage
- Materials/folders + homepage tools/communication; calendar separate but linked.  
- Sources: [Homepage tools](https://uc.powerschool-docs.com/en/schoology/latest/homepage-tools-and-communication); [Materials](https://uc.powerschool-docs.com/en/schoology/latest/course-materials-and-folders). Accessed 2026-09-24 (America/Chicago).

**Copy:** Materials list + homepage widgets.  
**Skip:** Full LMS CMS in v1.

### Teacher Google Sites
- Custom public/private pages; high maintenance; weak live assignment join.  
**Copy:** Named content regions idea.  
**Skip:** Free HTML CMS + public marketing site as taught-class default.

### Honest cut
Dominant LMS homes prioritize **orientation + recent + dues**. Custom Sites supplement. **No strong K–12 evidence** that anonymous public class pages should be the default for rostered classes (FERPA). Signed-in hub wins for v1.

---

## 2. Ideal elements (needed vs clutter)

### Needed above the fold (v1)
1. Class display title / header  
2. Welcome / teacher note (named)  
3. Daily / lesson focus (named)  
4. Bible verse / quote (named — CEO example)  
5. Announcements (recent, live)  
6. Assignments due today / this week (live, **published only**)  
7. Calendar slice (upcoming, **joined**)  
8. Key files / resources (live list)  
9. Optional link to current published lesson plan summary/span  

### Clutter to avoid
Full announcement history, full syllabus dump, grades/scores, email/phone blocks, unrelated grade noise, heavy hero image CMS, deep nav forks, embedding full lesson plan procedures, twin/sibling content.

Design principle (Canvas best-practice corpus): important content above the fold; fewer paths.

---

## 3. Automation model

| Kind | Examples | Edit model |
|---|---|---|
| **Live joins** | Dues, announcements, calendar slice, files, plan link | Auto from SoT; respect publish + hat RLS |
| **Named regions** | `welcome`, `daily_focus`, `verse`, `header_title` | Teacher text; AI targets these ids |
| **Templates** | Layout skeleton per school | Office later; teacher applies |

States: draft → preview → publish for authored regions. Live blocks follow source publish rules (hidden quiz never appears).

---

## 4. Access

| Option | v1? | Why |
|---|---|---|
| In-app WebView / native screen | **Yes** | Phone capture context |
| Signed-in web route | **Yes** | Webpage-like on desktop |
| Public anonymous URL | **No** | No strong K–12 taught-class evidence; FERPA |
| Guardian magic link without seat | **No** | Use parent seat + roster link |

---

## 5. Hat / visibility matrix

| Hat | See | Edit |
|---|---|---|
| Teacher (taught) | Full + drafts | Yes |
| Student (enrolled) | Published regions + live published blocks | No |
| Parent (child C in class) | Published + live for **C’s** class only | No |
| Other class / other grade | **No** | No |
| Twin sibling class | **No** on this route | No |
| Office | No editor v1 | No class-create |

Fail-closed. Filters on landing do not replace RLS.

---

## 6. AI edit model (CEO example)

Prompt: *Update the Bible Verse for Fundamentals of Math landing to Genesis 1:1 (KJV).*

Flow:
1. Resolve class by taught-class name under teacher seat (disambiguate if needed).  
2. Target named region `verse` only.  
3. Show preview card: old → new.  
4. Teacher Confirm → publish (or save draft).  
5. Audit: who/when/field.

**Forbidden:** free HTML rewrite; other classes; student PII in prompt; auto-publish without confirm; Ask-as-superuser; editing live blocks that aren’t named regions (dues come from assignments).

---

## 7. Join calendar & lesson plans (no duplication)

| Source | Landing behavior |
|---|---|
| Calendar | Upcoming slice query — **join** |
| Lesson plan | Link to published plan / daily focus blurb from **parent_summary or daily_focus region** — not full procedures |
| Assignments | Due list from published assignments |
| Diary | **Not** on landing |

---

## 8. Mobile vs web UX

| | Mobile | Web |
|---|---|---|
| Layout | Single column stack; sticky header title | Wider; optional 2-col (focus + dues) |
| Edit | Sheet per named region | Inline + AI box |
| Live blocks | Compact cards | Tables/lists denser |
| AI | Ask → preview sheet | Ask → inline preview |

---

## 9. Needed vs Desired

| Needed P0 | Desired P1–P2 |
|---|---|
| Named regions incl. verse | Free HTML region |
| Live dues/announcements/calendar/files | Public marketing page |
| Signed-in access | Theme marketplace |
| AI NL named-field + confirm | Student widgets |
| Hat walls + twin wall | Office schoolwide template push |
| Join plans/calendar | Embedded grades |

---

## 10. Unverified flags

- Exact 2026 adoption stats for Canvas Front Page vs Stream — not invented.  
- Whether any large Christian school system publishes rostered class homes anonymously as policy — **no primary found**; stay signed-in.  
- Performance of WebView vs native for rich landing — eng measure later.

---

## 11. Open questions for Chuck

1. Is `verse` always present (Christian school default) or school toggle?  
2. Parent landing = same page or summary mode? (Plan recommends same regions, published-only.)  
3. Announcements SoT = Feed class-scoped or separate?  
4. Web route path convention (`/class/:id/home`)?  
5. Sequence vs Calendar/LPLAN builds?

**RECOMMENDED NEXT ACTION:** Review `class-landing-plan.md`; keep architecture/security/acceptance.


---

## Plan / recommended features (full SoT)

# Class Landing Plan (LAND-P2 / R2)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R2 (upgrades LAND-P1 2026-09-03)  
**Research:** `notes/company/class-landing-research.md`  
**Keep:** `class-landing-architecture.md`, `class-landing-security.md`, `class-landing-acceptance.md`.  
**Stack:** Expo + Supabase + Edge AI. No app/SQL from this card.

---

## 0. Product law

| Surface | Job | Not |
|---|---|---|
| **Class landing** | Webpage-like home for one taught class: live joins + named teacher fields | Not app menu alone; not public marketing site; not free HTML v1; not Feed-as-only-home |
| **Named regions** | Teacher fields AI can draft into (`verse`, `welcome`, `daily_focus`, …) | Not Ask-as-superuser |
| **Live blocks** | Dues, announcements, calendar slice, files — joined | Not copies of calendar/plans |
| **AI edit** | NL → named region → preview → confirm → publish | Not auto-publish; not silent HTML |

CEO bar: webpage-like home; Bible verse NL example; signed-in; hat walls; twins never mixed; link calendar/plans.

---

## 1. Non-goals

| Non-goal | Why |
|---|---|
| Anonymous public class URL v1 | FERPA; research |
| Free-form HTML / Sites clone v1 | XSS + AI-unsafe |
| Duplicate calendar/plan bodies | Join only |
| Class create | Office directory |
| Widen `is_staff` | Hat walls |
| Twin merge | Hard law |
| Auto-publish AI | Confirm |
| Grades on landing | Gradebook elsewhere |
| Diary on landing | Separate epic |
| App/SQL from this card | Epic scope |

---

## 2. Needed vs Desired

### Needed P0

| ID | Feature | Rationale |
|---|---|---|
| L0-1 | Landing screen (mobile + web) per class | CEO webpage-like |
| L0-2 | Named regions: `header_title`, `welcome`, `daily_focus`, `verse` | AI targets + Christian school |
| L0-3 | Live: announcements (recent) | Orientation |
| L0-4 | Live: assignments due today/week (published only) | Core |
| L0-5 | Live: calendar upcoming slice (join) | Cross-link CAL |
| L0-6 | Live: key files list | Resources |
| L0-7 | Optional link to published lesson plan / focus | Cross-link LPLAN |
| L0-8 | Signed-in only; hat RLS; twin wall | FERPA |
| L0-9 | AI NL named-field edit + confirm (Bible verse example) | CEO |
| L0-10 | Teacher draft/publish for named regions | No auto-publish |

### Desired P1–P2

| ID | Feature | Pri |
|---|---|---|
| L1-1 | School template defaults | P1 |
| L1-2 | Parent summary layout variant | P1 |
| L1-3 | Pin files / reorder blocks | P1 |
| L1-4 | Free HTML advanced region | P2 |
| L1-5 | Public open-house page (no roster PII) | P2 if evidence |
| L1-6 | Student shout-outs widget | P2 |

---

## 3. Hats — stories

**Teacher:** Open landing from class desk; edit named regions; Ask verse update → preview → Confirm; see live blocks; drafts of own work not shown to families.  
**Student:** Read published landing for enrolled class only.  
**Parent:** Read published landing for focused child’s class; never sibling’s page on same route.  
**Office:** No editor v1; no class-create.

---

## 4. Block inventory

### Live (join)

| Block | Source | Publish rule |
|---|---|---|
| Due work | assignments + due_at | calendar-published / student-visible only |
| Announcements | class-scoped announcements/feed | class-visible |
| Calendar slice | list_calendar_items join | hat-visible published |
| Files | class files readable by hat | no invented ACLs |
| Plan link | lesson_plans published | hidden if draft |

### Authored (named)

| id | Label | v1 |
|---|---|---|
| header_title | Display title | on (default class name) |
| welcome | Welcome / teacher note | on |
| daily_focus | Daily focus | on |
| verse | Bible verse / quote | on (may be empty) |

---

## 5. UI/UX

### Web
- Page layout: header → verse/welcome/focus band → two columns (announcements + dues) → calendar strip → files.  
- Edit pencil per region; AI box “Update …” scoped to this class.  
- Student View preview.

### Mobile
- Single column same order; region edit via sheet; Ask from chrome.  
- Calendar strip tappable → Calendar filtered to class.

### States
- Empty regions: hide or placeholder for teacher only.  
- Empty dues: honest empty.  
- Wrong hat: fail closed empty / deny.

---

## 6. AI safety

1. Resolve class under **taught** seat only.  
2. Touch only allow-listed region ids.  
3. Preview + Confirm.  
4. No HTML. No other class. No grades. No roster dump in prompt.  
5. Audit log field-level.  
6. Bible verse example is a **field write**, not theology engine — store text teacher confirmed.

---

## 7. Implementation approach (pointer)

Per `class-landing-architecture.md` / `class-landing-security.md`:

1. `class_landings` (or equivalent) one row per class: jsonb/columns for named regions + publish timestamps.  
2. RLS: teacher write if `class_teacher_of`; student/parent read published if enrollment / child enrollment.  
3. Live blocks = existing queries with same publish predicates as Calendar — **no denormalized copies**.  
4. Ask tool `landing_update_region` with confirm payload; new permission — not superuser.  
5. Expo: `class/[id]/home` web + mobile screen/WebView.  
6. Phases: schema+read → teacher edit regions → live blocks → AI confirm → parent/student polish → templates.

**Gate:** Chuck send before Eng. Acceptance remains PLAN ONLY.

---

## 8. Cross-links

- Research R2; architecture/security/acceptance keep  
- Calendar slice ↔ `calendar-plan.md`  
- Plan focus ↔ `lesson-plan-plan.md`  
- Diary: none  

---

## 9. Open questions for Chuck

1. `verse` always on for Spring Baptist archetype?  
2. Announcements SoT?  
3. Parent same page vs summary?  
4. Build order vs CAL/LPLAN?  
5. Any must-have block missing (practice tests link, etc.)?

**RECOMMENDED NEXT ACTION:** Chuck review; Eng only after explicit send.

