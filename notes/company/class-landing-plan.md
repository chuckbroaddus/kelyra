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
