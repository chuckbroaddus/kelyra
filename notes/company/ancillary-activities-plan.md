# Ancillary / Co-Curricular School Activities Plan (ANC-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Research:** `notes/company/ancillary-activities-research.md`  
**Digest:** `notes/research/2026-09-24-ancillary-activities-report.md`  
**Cards:** `t_2935363b`  
**Stack:** Expo + Supabase Edge. No app/SQL from this card.

**Product law:** Grow into school life through one **Activities/Groups** substrate and **opt-in domain packs**. Never overwhelm Capture → Needs → Approve, gradebook, or Teach Insights. Nurse/clinic is gated. **Not legal advice** — follow `ferpa-compliance-plan.md`; verify health packs with counsel.

**Trial archetype:** Spring Baptist Academy (FACTS-adjacent private Christian K–12, Texas).

---

## 0. Decision lock (recommended)

| Decision | Lock |
|---|---|
| Architecture | **(D) Hybrid** — Activities/Groups core + thin domain packs (Forms, Athletics eligibility, Nurse) |
| Rejected | (A) per-domain apps; (C) calendar+comms only as sole strategy |
| Substrate | Typed Activities: `club`, `team`, `production`, `publication`, `chapel_service`, `enrichment`, `clinic` (inert until pack) |
| Spring Baptist P0 | Calendar-backed Activities for clubs/arts/chapel + thin athletics **schedule+roster**; nurse **off** |
| IA | **School → Activities** (and “My Activities”); **not** inside teacher gradebook / Insights home |
| Calendar | Attach Activity events to CAL; reuse hat walls / Sport category foreshadow (CAL P1-4) |
| Messaging | Audience = activity membership + parents of members |
| Landing pattern | Optional Activity home (LAND-like named regions); no grades block |
| Forms | Separate **Forms pack** before eligibility/nurse depth |
| Eligibility | Thin clearance tracking after Forms; no full UIL/TAPPS engine P0 |
| Nurse / clinic | **Gated pack**; counsel before enable; not EHR day one |
| Cafeteria / lunch | **Out** |
| Transport beyond Ride | **Out** |
| Implementation | Future Eng card(s); this card = research + plan only |

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| App code / SQL migrations on this card | Research epic |
| Hermes AI staffing / worker dispatch | CoS research only |
| Full SIS athletics suite day one (Rank One clone) | Scope creep; Spring Baptist doesn’t need it to start |
| EHR-grade nurse system / SNAP clone day one | PHI + counsel; pack later |
| Cafeteria / lunch POS | Owned by SIS/POS vendors |
| Bus routing / fleet beyond Ride | Ride = car-line only |
| Instrument / uniform inventory (CutTime moat) | Out |
| MagicSchool-style teacher AI as Activities OS | Irrelevant |
| Claiming HIPAA/FERPA compliance badges | Soft posture only |
| Putting Activities inside Teach gradebook Insights | Core UX protection |
| Overloading `classes` table for clubs/teams | Separate Activity objects |
| Public anonymous Activity URLs with roster PII v1 | FERPA-minded; signed-in |

---

## 2. Needed vs Desired

### Needed (P0) — Spring Baptist trial path

| ID | Capability | Rationale |
|---|---|---|
| N1 | **Activities/Groups primitive** (create, archive, type template) | Substrate for all co-curricular |
| N2 | **Membership** (student member, sponsor/coach/director hats) | Roster without spreadsheet |
| N3 | **Calendar attach** — practices, games, concerts, chapel, meetings | Reuse CAL; one family calendar |
| N4 | Club + chapel_service + production templates enabled | Christian school + arts reality |
| N5 | Team template with schedule + roster (**no** eligibility engine) | Athletics thin start |
| N6 | Announcements / messaging to members + parents of members | Replace Band/Remind sprawl lightly |
| N7 | Parent visibility for child’s memberships (twin-safe) | Family portal expectation |
| N8 | IA: School Activities hub + My Activities; **not** gradebook home | Avoid overwhelm |
| N9 | Performance/event announce + **parent RSVP** (plays/concerts) | Arts + chapel parents |
| N10 | Hat walls + audit on roster changes | FERPA-minded |

### Desired (P1–P2)

| ID | Capability | Phase |
|---|---|---|
| D1 | Publications workspace light (deadlines + file drop + editor roles) | P1 |
| D2 | **Forms pack** (permission slips, photo releases, FinalForms-lite packets) | P1 |
| D3 | Tryouts / pending → accepted membership | P1 |
| D4 | Volunteer signup sheets (SignupGenius-lite) | P1 |
| D5 | Activity landing home (LAND pattern) | P1 |
| D6 | Athletics eligibility + physicals tracking (thin) | P2 |
| D7 | Light results / scorekeeping | P2 |
| D8 | **Nurse/clinic pack** (gated; counsel) | P2+ |
| D9 | Travel manifests / away lists | P2 |
| D10 | Payments / fees for activities | P2+ (billing epic) |
| D11 | SIS sync of activity membership (FACTS) | P2 |
| D12 | Officer roles (ASB) | P2 |

---

## 3. Ordered slice roadmap (sequence)

Chuck asked for a **numbered implementation order**. Sequence below is Eng-ready and **protects core classroom UX** by shipping shared substrate before PHI-heavy packs.

| # | Slice | Ships | Why this order | Avoids overwhelm by |
|---|---|---|---|---|
| **1** | **Activities/Groups primitive + calendar attach + membership (clubs)** | N1–N4, N6–N8, N10 | Highest volume of school life; zero PHI; validates IA | Keeping Teach desk untouched; one new hub only |
| **2** | **Performance/event announcements + parent RSVP** | N9 | Plays/concerts/chapel need family action next | Reusing CAL events + messaging; no new grade surfaces |
| **3** | **Athletics team schedule + roster** | N5 | AD/coach parity with clubs; still no medical | Same Activity UX as clubs; Sport calendar category |
| **4** | **Publications workspace light** | D1 | Yearbook/newspaper deadlines without inventory systems | File drop + milestones only |
| **5** | **Forms pack** (permission slips / FinalForms-lite) | D2, D3–D4 partial | Unblocks trips + photo releases before medical depth | One forms engine shared by all Activity types |
| **6** | **Athletics eligibility + physicals tracking** | D6 | Needs Forms + Approve-only grade read | Thin clearance flags — not association software |
| **7** | **Nurse/clinic pack** | D8 | Highest sensitivity last | School opt-in gate + counsel checklist |

**Why not nurse earlier?** Industry puts nurse in EHR/SIS medical modules; joint FERPA–HIPAA guidance makes this counsel-gated. Shipping clinic before Activities would stall Spring Baptist clubs/arts value.

**Why athletics schedule before eligibility?** FinalForms/Rank One win on forms depth; families first ask “when/where is the game?” Spreadsheet death is roster+schedule.

**Faith note:** Chapel uses slice 1–2 (Activity or school calendar + RSVP optional); no separate “Faith app.”

---

## 4. UX / information architecture

| Surface | Audience | Contents |
|---|---|---|
| **School → Activities** | Office, sponsors, coaches, directors | Directory of Activities; create; enable packs |
| **My Activities** | Student / parent / staff with memberships | Child- or self-scoped list; twin-safe for parents |
| **Activity home** | Members + parents | Roster (role-gated), upcoming CAL slice, announcements, files; optional LAND-like welcome/verse |
| **Calendar** | Existing CAL users | Activity events appear with category filters (Sport, School, etc.) |
| **Teach desk / Insights / gradebook** | Teachers | **Unchanged** — no Activities widgets required on P0 |
| **Office** | Office / AD | Pack toggles; school-wide Activity admin |
| **Nurse console** | Nurse hat only when pack on | Isolated; not linked from gradebook |

**Chrome law:** Prefer a section under School / more menu over a fifth tray icon unless Chuck prioritizes tray. Do **not** invent Activities as a Classroom “Topic.”

**Coach UX bar:** Create team → add roster → add practice/game on calendar → message parents — under 5 minutes.

---

## 5. Schema sketch (plan only — no SQL apply)

### 5.1 Core (slices 1–3)

| Table / concept | Purpose |
|---|---|
| `activities` | `school_id`, `type`, `name`, `status`, `settings jsonb`, season dates |
| `activity_memberships` | `activity_id`, `user_id` or `student_id`, `role` (member/sponsor/coach/director/editor/officer), `status` (invited/active/cut/alumni) |
| `activity_event_links` | Optional if events store `activity_id` on `calendar_events` instead |
| Calendar events | Existing CAL rows + `activity_id` + visibility |

### 5.2 Later packs

| Table / concept | Pack | Purpose |
|---|---|---|
| `activity_milestones` | Publications | Deadlines |
| `activity_files` | Shared | File drop metadata → Storage |
| `form_templates` / `form_packets` | Forms | Sport-season or trip packets |
| `form_submissions` | Forms | Parent/student signed payloads; status |
| `clearance_requirements` / `clearance_status` | Athletics eligibility | Physical expiry, form complete flags |
| `clinic_visits` / `med_admin_logs` | Nurse | **Pack-gated**; separate RLS; counsel |

### 5.3 RLS sketch

- Membership read: member, parent-of-member (focused child), sponsor/coach/director, office.  
- Medical/clinic: nurse + designated office only.  
- Eligibility grade snapshot: AD/office; coaches see **boolean cleared** not full transcript unless policy says otherwise.  
- Service role: Ask draft helpers; never silent publish.

**Do not** log clinic notes into `analytics_events` or public Activity search.

---

## 6. Open questions for Chuck

1. Confirm **(D) Hybrid** lock vs desire for deeper native athletics sooner?  
2. Tray icon for Activities vs School submenu only for Spring Baptist?  
3. Should **chapel** be a first-class Activity type or only school calendar events?  
4. Photo release: school-wide annual form vs per-publication?  
5. Coach eligibility: show **Cleared/Not cleared** only, or limited grade check detail?  
6. Nurse pack: pursue counsel this semester or explicitly park past trial?  
7. FACTS membership sync appetite for trial, or manual rosters OK?  
8. RSVP depth for slice 2: yes/no/maybe vs headcount only?  
9. Publications: newspaper + yearbook both in slice 4, or yearbook only?  
10. Any Spring Baptist activities that must be day-one beyond clubs/arts/athletics schedule (e.g., aftercare)?

---

## 7. Acceptance criteria (future implement cards)

1. Office can create an Activity with type template; archive without deleting membership history.  
2. Sponsor/coach can manage roster; student and parent-of-member see only appropriate Activity homes (twin-safe).  
3. Activity events appear on CAL with hat walls; draft≠publish respected.  
4. Teach gradebook / Insights screens gain **no** required Activities chrome in slices 1–3.  
5. Parent can RSVP to a production/concert event tied to an Activity (slice 2).  
6. Team schedule + roster works without any eligibility or physical fields (slice 3).  
7. Publications workspace supports deadline list + file drop (slice 4).  
8. Forms pack collects a permission slip and photo release with status visible to sponsor (slice 5).  
9. Eligibility pack shows clearance status; does not claim association compliance (slice 6).  
10. Nurse pack cannot be enabled without school admin toggle; UI states counsel/privacy review — **no compliance badge** (slice 7).  
11. Cafeteria and bus-routing features are absent (explicit non-goals).  
12. No SQL/app from research card; implement cards own migrations.

---

## 8. Work breakdown (future Eng — not this card)

| Workstream | Owner hint | Depends |
|---|---|---|
| `activities` + memberships schema/RLS | Eng | Schools, users, students |
| Activities hub + My Activities UI | Eng + Designer | Chrome IA decision |
| Calendar `activity_id` join | Eng | CAL SoT |
| Messaging audiences from membership | Eng | Messaging |
| RSVP on events | Eng | CAL P2 foreshadow |
| Publications milestones + Storage | Eng | Slice 4 |
| Forms engine | Eng | Slice 5 |
| Clearance flags + Approve-only grade read | Eng | AVG Approve; Forms |
| Nurse pack isolation | Eng + counsel | Slice 7 gate |
| QA / DITL multi-hat | QAS | All hats including coach/parent athlete |

---

## 9. Cross-links

- Research: `notes/company/ancillary-activities-research.md`  
- Digest: `notes/research/2026-09-24-ancillary-activities-report.md`  
- Calendar: `notes/company/calendar-plan.md`  
- Class landing: `notes/company/class-landing-plan.md`  
- Ride: `notes/company/car-rider-plan.md`  
- FERPA: `notes/company/ferpa-compliance-plan.md`  
- Analytics (do not pollute): `notes/company/learning-analytics-plan.md`  
- GTM / Spring Baptist: `notes/research/2026-09-24-production-gtm-report.md`
