# Ancillary / Co-Curricular School Activities Research (ANC-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_2935363b`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)  
**Legal posture:** Product + UX research for Kelyra. **Not legal advice.** Nurse/clinic and athletics medical forms may be FERPA education records and/or HIPAA-adjacent depending on who maintains them and how billing works — **verify with counsel before shipping any health pack.** Do not claim FERPA- or HIPAA-certified.

**Related (do not rebuild):**  
- `notes/company/calendar-research.md` / `calendar-plan.md` — dated events, Sport category, hat walls, RSVP deferred  
- `notes/company/class-landing-research.md` / `class-landing-plan.md` — webpage-like home, named regions, live calendar join  
- `notes/company/car-rider-research.md` / `car-rider-plan.md` — Ride patterns; transportation beyond Ride stays out  
- `notes/company/ferpa-research.md` / `ferpa-compliance-plan.md` — education records, directory info, HIPAA default-out for grades  
- `notes/company/learning-analytics-research.md` / `learning-analytics-plan.md` — hat walls, Approve-only; do not pollute gradebook Insights  
- `notes/research/2026-09-24-production-gtm-report.md` — Spring Baptist trial archetype, FACTS-adjacent buyer  
- Plan SoT: `notes/company/ancillary-activities-plan.md`  
- Dated digest: `notes/research/2026-09-24-ancillary-activities-report.md`

**Constraints for this card:** Research + recommendation only. No app code, no SQL apply, no Hermes AI staffing, no force-push.

**Stack:** Expo + Supabase. Trial archetype: Spring Baptist Academy (private Christian K–12, Texas) — FACTS/RenWeb-adjacent buyer; chapel/missions matter; athletics & arts exist; nurse is real but PHI-sensitive.

---

## Executive summary

Private K–12 schools run a **second product surface** alongside the classroom: clubs, athletics, arts productions, publications, faith gatherings, field trips, and health/clinic ops. Industry pattern is clear:

1. **SIS cores** (FACTS, PowerSchool, Blackbaud) keep thin **activity membership + calendar**, then **partner or bolt on** deep athletics forms (FinalForms, Rank One / BigTeams), fine-arts ops (CutTime; Charms sunset), messaging (Apptegy, Band, Remind), and signups (SignupGenius).  
2. **Domain specialists** own eligibility, physicals, instrument inventory, injury tracking — not the gradebook.  
3. Buyers hate **app sprawl**; they also hate **gradebook pollution**. Winning products give one **Activities/Groups substrate** and **opt-in domain packs**.

**Verdict — lock architecture (D) Hybrid for Kelyra:**

- One **Activities / Groups** primitive (typed templates: club, team, production, publication, clinic, chapel/service, enrichment).  
- Reuse **Calendar (CAL)**, messaging, diary patterns, optional **landing-like home**, Ride only where travel pickup overlaps.  
- **Thin domain packs** (Forms, Athletics eligibility, Nurse/clinic) enable only when school opts in — Spring Baptist starts calendar-backed Activities for clubs/arts + thin athletics schedule; **nurse is later gated pack**.  
- Explicitly **out / optional later:** cafeteria/lunch POS, full bus routing beyond Ride, EHR-grade nurse system day one, Full SIS athletics suite.

This keeps teacher **Capture → Needs → Approve** and gradebook Insights clean while growing into school life.

---

## A. Comprehensive inventory (ancillary / co-curricular)

Grouped for product taxonomy. Items are **candidates** for Activity templates or packs — not a commitment to ship all.

### A.1 Health / ops (clinic)

| Activity / capability | Typical owners | Sensitivity | Kelyra day-one? |
|---|---|---|---|
| School nurse / clinic visits | Nurse, office | **High** (health) | **No** — gated Nurse pack later |
| Medication administration log | Nurse | **High** | Later pack |
| Incident / injury documentation (clinic) | Nurse, AD, office | **High** | Later; light incident note may join Forms |
| Immunization / health screening tracking | Nurse, office | **High** | Later; often SIS or state portal |
| Allergy / emergency care plans | Nurse | **High** | Later |
| Return-to-class / return-to-play from clinic | Nurse ↔ coach | **High** | Eligibility/Nurse packs |

Peers: SNAP Health Center (school EHR). SIS medical tabs exist in FACTS/PowerSchool but depth varies; many schools still use paper + specialist EHR.

### A.2 Athletics

| Activity / capability | Typical owners | Sensitivity | Kelyra day-one? |
|---|---|---|---|
| Teams / levels (V, JV, MS) | AD, coach | Medium | **Yes** — Activity type `team` |
| Practice & game schedules | Coach, AD | Low–Med | **Yes** — CAL attach |
| Roster / cuts / tryouts | Coach, AD | Medium | Roster P0; tryouts P1 |
| Eligibility (grades, attendance, age) | AD, office | Med–High | **Later** Athletics pack |
| Physicals / consents / waivers | AD, parents, nurse | **High** | Forms → Eligibility packs |
| Light scorekeeping / results | Coach, AD | Low | Optional P2; not core |
| Travel / away venues / bus lists | Coach, office | Medium | Calendar + thin travel note; Ride only if dismissal overlap |
| Athletic trainer injury notes | Trainer, AD | **High** | Out / integrate later (Rank One class) |
| Camps / fees | AD, boosters | Medium | Payments out of P0 |

Peers: FinalForms (forms/eligibility), Rank One (rosters/schedules/forms/injury), BigTeams (schedules + Eligibility Central for associations).

### A.3 Clubs & student organizations

| Activity | Examples | Owners | Day-one? |
|---|---|---|---|
| Interest clubs | Chess, robotics, coding, book club | Sponsor teacher | **Yes** |
| Honor societies | NHS, NJHS, subject honoraries | Sponsor | **Yes** |
| Student government | Student council / ASB | Sponsor, officers | **Yes** |
| Academic competition | UIL academics, debate, quiz bowl | Coach/sponsor | **Yes** (team-like) |
| Service clubs | Key Club, community service | Sponsor | **Yes** + hours later |

### A.4 Arts & performance

| Activity | Examples | Owners | Day-one? |
|---|---|---|---|
| Theater | Plays, musicals | Director | **Yes** — type `production` |
| Music ensembles | Choir, band, orchestra concerts | Director | **Yes** |
| Fine arts shows | Art gallery night, photography | Teacher | **Yes** |
| Competition seasons | Marching, One-Act Play, TAPPS fine arts | Director | Schedule P0; inventory bolt-on later |
| Rehearsal calendars + call times | — | Director | CAL attach |
| Ticket / program / cast list | — | Director | Announcements + files P1 |

Peers: CutTime (fine arts ops, inventory, forms, payments); Charms Office acquired by CutTime and **ceased operations Sep 2024** — do not recommend Charms as active peer.

### A.5 Publications

| Activity | Owners | Needs | Day-one? |
|---|---|---|---|
| Newspaper / news site | Editor advisor | Deadlines, file drop, roles | Light workspace P1 |
| Yearbook | Advisor | Photo releases, deadlines, staff roles | Light + **photo release** Forms |
| Literary magazine | Advisor | Submission deadlines | Light workspace |

### A.6 Faith / community (Christian school — Spring Baptist)

| Activity | Owners | Day-one? |
|---|---|---|
| Chapel / worship assemblies | Office, chaplain, teachers | **Yes** — school calendar + Activity optional |
| Missions / service trips | Sponsor, office | Activity + Forms (permission) |
| Bible clubs / FCA-like | Sponsor | **Yes** club template |
| Prayer / mentoring groups | Sponsor | Club; privacy care |

### A.7 Enrichment / ops

| Activity | Owners | Day-one? |
|---|---|---|
| Field trips | Teacher, office | Calendar + Forms (permission slips) |
| Tutoring / intervention groups | Teacher, interventionist | Activity or class-adjacent; avoid gradebook confusion |
| Library / media center | Librarian | Optional thin Activity; catalog out |
| Aftercare / extended day | Office | Optional; may stay SIS |
| Volunteering / parent helpers | Office, boosters | Signup pattern (SignupGenius-like) P1 |
| Fundraising / spirit / pep | Boosters, ASB, coaches | Announcements + calendar; payments later |

### A.8 Explicitly optional / out of core Ancillary epic

| Domain | Stance |
|---|---|
| **Cafeteria / lunch POS, menus, balances** | **Out** — SIS/POS (FACTS lunch, Titan, etc.); do not rebuild |
| **Transportation beyond Ride** | **Out** — bus routing, fleet GPS, route optimization; Ride owns car-line dismissal only |
| Full booster eCommerce / ticket marketplaces | Out of P0; CutTime/Rank One class |
| Instrument / uniform inventory systems | Out; CutTime owns |
| State association eligibility engines (UIL/TAPPS deep) | Out of native; thin tracking or integrate later |

---

## B. Industry landscape — native vs bolt-on

| Product | What it owns natively | What schools bolt on | Honesty for Kelyra |
|---|---|---|---|
| **FACTS / RenWeb** | SIS: roster, grades, family portal, calendars, forms/docs, medical fields, payments for extras | Reach (student life / SISO / extracurricular coordination — [FACTS×Reach PR](https://factsmgt.com/press-releases/facts-partners-with-reach-to-enhance-student-life-management-through-seamless-integration/)); Rank One / FinalForms for athletics eligibility; separate athletics calendars common | Closest Spring Baptist archetype: **thin activity + calendar + docs**, not deep AD suite |
| **PowerSchool SIS** | Extracurricular **Activities Setup** — named activities, school/district scope, enroll on student record, year-end clear ([Activities Setup](https://ps.powerschool-docs.com/pssis-admin/latest/activities-setup)) | FinalForms, Rank One, BigTeams, CutTime, Apptegy | Activities = **membership flags**, not rich co-curricular UX |
| **Blackbaud Education Management** | First-class **Extracurricular**: Activities (clubs/arts-like) + **Athletics** (sports, levels, teams, schedules, publish) ([Extracurricular](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/k12/full-help/content/lms.html); [Sports and Teams](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/k12/full-help/content/bb-core-sports-teams.html)) | Forms/eligibility specialists still common | Strongest **native** Activities+Athletics split — pattern peer for Hybrid |
| **FinalForms** | Athlete registration, sport/season form packets, eligibility/clearance dashboards, expiration alerts, return-to-play, coach-simplified views ([Athletic Management](https://www.finalforms.com/solutions/athletic-management-software/)) | SIS for grades; schedulers for games | **Forms + eligibility pack** archetype — do not rebuild day one |
| **Rank One** | Rosters, schedules, dynamic forms, compliance, messaging, injury/treatment, camps/payments, mobile ([rankone.com](https://rankone.com/)) | SIS identity | All-in-one AD/Fine Arts director suite — competitor to deep packs |
| **BigTeams** | Team schedules, coordination; **Eligibility Central** for associations ([Eligibility Central](https://www.bigteams.com/products/bigteams-eligibility-central/)) | Forms depth often elsewhere | Schedule-first athletics peer |
| **CutTime** | Fine arts: members, calendar, comms, financials, fundraising, **inventory**, eSign forms ([gocuttime.com](https://gocuttime.com/)) | SIS | Band/choir/theater ops — inventory is their moat |
| **Charms Office** | Legacy fine arts | — | **Acquired by CutTime; ceased Sep 2024** — cite only as history |
| **Apptegy / Thrillshare** | District brand site/app, alerts, newsletters, **Group Connect** rooms for teams/clubs ([Group Connect](https://www.apptegy.com/group-connect/)) | SIS, athletics forms | Comms layer — not eligibility |
| **Band** (app) | Team/group messaging, calendars, media, lightweight coordination | Schools use alongside SIS | Parent UX pattern; privacy/moderation care |
| **Remind** | Class/group SMS/push messaging | Everything else | Messaging only |
| **SignupGenius** | Volunteer / event signup sheets | School calendar | RSVP/volunteer pattern for field trips & spirit |
| **Canvas Groups** | Course-adjacent collaboration groups | Not school athletics | LMS groups ≠ school Activities |
| **Google Classroom** | Topics, coursework; no school athletics OS | Everything co-curricular external | Do not model Activities as Classroom Topics |
| **MagicSchool-ish AI teacher tools** | Lesson AI for teachers | — | **Not relevant** to ancillary activities OS |
| **SNAP Health Center** | School nurse EHR: visits, meds, immunizations, care plans ([SNAP](https://www.psnihealth.com/solutions/snap-health-center-for-nursing)) | SIS demographics | Nurse pack peer — **do not become EHR P0** |

**Takeaway:** Native SIS = membership + calendar. Depth = bolt-ons. Kelyra should **not** ship seven first-class apps; should **not** stop at calendar-only if Spring Baptist coaches need rosters.

---

## C. Architecture options for Kelyra

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| **(A) First-class modules per domain** | Nurse app, Athletics app, Clubs app, Yearbook app… | Deep UX per persona | Explodes IA; overwhelms core; 7× Eng cost; gradebook dilution | **Reject** for near-term |
| **(B) Generic Activities/Groups + typed templates** | One object model; templates for club/team/production/publication/clinic | Clean UX; shared membership/calendar/messaging | Domain depth (eligibility, meds) thin unless extended | Strong substrate — incomplete alone |
| **(C) Thin calendar + messaging only** | Events + chat; no roster primitive | Fastest; reuses CAL | Coaches recreate spreadsheets; no forms/eligibility path; weak vs Blackbaud Activities | **Reject** as sole strategy |
| **(D) Hybrid: Activities/Groups core + thin domain packs** | (B) substrate + opt-in packs: Forms, Athletics eligibility, Nurse/clinic | Core UX stays clean; packs gated; Spring Baptist path clear; matches industry native+bolt-on | Pack roadmap discipline required | **LOCK — choose this** |

### Locked recommendation: **(D) Hybrid**

1. **Activities/Groups substrate** — one list in school IA (not inside teacher gradebook home).  
2. **Typed templates** — `club`, `team`, `production`, `publication`, `chapel_service`, `enrichment`, `clinic` (clinic template inert until pack).  
3. **Calendar attach** — every Activity can publish events into CAL with existing hat walls; Sport category already foreshadowed in calendar plan (P1-4 thin team roster).  
4. **Domain packs (opt-in):**  
   - **Forms pack** — permission slips, photo releases, FinalForms-lite packets.  
   - **Athletics eligibility pack** — physicals status, clearance flags (not full association engine).  
   - **Nurse/clinic pack** — gated; counsel + possible BAA/HIPAA analysis before enable.  
5. **Spring Baptist start:** clubs + arts productions + chapel on Activities+CAL; athletics = schedule+roster only; nurse off.

Research does **not** contradict (D): Blackbaud’s Activities vs Athletics split and FACTS’ partner model both validate substrate + depth packs.

---

## D. Role model (permission hats)

Extend existing teacher / student / parent / office seats with **Activity-scoped hats** (permission on membership, not new global `is_staff` widen).

| Hat | Scope | Can typically | Cannot |
|---|---|---|---|
| **Sponsor** | Club / org | Roster, announcements, calendar, files | Grades; nurse PHI |
| **Coach** | Team | Roster, schedule, messages to members/parents | Edit eligibility rules without AD; clinic charting |
| **Director** | Production / ensemble | Cast/crew roster, rehearsals, show events, programs | School-wide directory edits |
| **Editor / Advisor** | Publication | Staff roster, deadlines, file drop | Publish yearbook photos without release tracking (when Forms live) |
| **Nurse** | Clinic pack only | Visit/med logs per policy | Visible in gradebook; parent peer lists |
| **Office / AD** | School | Create Activities, assign sponsors, enable packs, school calendar | Impersonate parent forms without audit |
| **Student member** | Own memberships | See schedule, announcements, own forms status | Other students’ medical; edit roster |
| **Parent of member** | Linked child memberships | Child schedule, RSVP, forms for child | Other athletes’ records; unlabeled twin merge |
| **Officer** (optional P2) | ASB / NHS | Limited announce | Roster admin |

**Permission law:** Activity hats are **grants on an Activity id**, composable with school hats. Coach of Basketball ≠ teacher of Algebra for gradebook Insights. Nurse hat never appears on Teach desk.

---

## E. Privacy (FERPA / HIPAA-adjacent) — not legal advice

Cross-link: `notes/company/ferpa-research.md`, `ferpa-compliance-plan.md`. Private schools may not be FERPA-bound; **treat records as confidential by contract**.

| Data class | Typical framing | Product implication |
|---|---|---|
| Activity membership, schedules, public scores | Often **directory-like** or low sensitivity if school policy allows | Default Activity calendar visible per school policy; opt-out respect |
| Grades used for **athletic eligibility** | **Education records** | Eligibility pack reads Approve-only grades via office/AD hat — never coach free-for-all exports without audit |
| Athletics physicals, injury, return-to-play | Sensitive; often education records when school-maintained | Forms + Eligibility packs; minimize retention; role gates |
| Yearbook / play **photos** | Consent / **photo release** + directory rules | Forms pack release flag before publication workspace publish |
| Nurse clinic visits, meds, immunizations | Often **FERPA education records** when maintained by school; HIPAA may apply only in narrower covered-entity scenarios | **Nurse pack gated**; **verify with counsel**; see [Joint FERPA–HIPAA guidance (ED/HHS)](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/2019%20HIPAA%20FERPA%20Joint%20Guidance%20508.pdf) |
| Ride plates | Existing Ride notice | Do not merge clinic PHI into Ride |

**Flags for counsel (explicit):**

1. Whether Spring Baptist’s nurse records in a future Kelyra pack trigger HIPAA covered-entity / BAA needs.  
2. Directory information policy for sports rosters & program credits.  
3. Photo release retention for yearbook/plays.  
4. Coach access to eligibility grade snapshots.

**Do not ship UI copy claiming “HIPAA compliant” or “FERPA certified.”**

---

## F. Reuse map — existing primitives vs new objects

| Existing primitive | Maps to Activity how | Gap / new object |
|---|---|---|
| **Classes** | Pattern peer for “home + roster + landing” — **not** the same table | `activities` + `activity_memberships` (do not overload `classes`) |
| **Calendar (CAL)** | Practices, games, concerts, chapel, trip dates | `activity_id` on events; Sport category already planned |
| **Class landing (LAND)** | Optional **Activity home** (welcome, verse, files, upcoming) | Activity-scoped named regions; no grades block |
| **Diary** | Reflection / practice journal optional later | Keep separate; don’t mix clinic notes |
| **Messaging** | Sponsor/coach → members + parents of members | Audience = membership graph |
| **Ride** | Away-game pickup edge cases only | No bus routing; explicit out |
| **Ask** | NL draft announcements / event text for sponsor | Confirm-before-send; no auto PHI |
| **Author / lesson plans** | Weak map — productions may link rehearsal plans lightly | Not required P0 |
| **AVG / gradebook / Insights** | Eligibility may **read** approved grades later | **Never** put Activities inside Teach Insights home |
| **Forms** (new pack) | Permission slips, physicals, photo releases | `form_templates`, `form_submissions`, clearance status |
| **Tryouts** (new light) | Open → accepted membership | `membership.status` enum |
| **Performances** | Calendar events + RSVP | RSVP object (CAL P2 foreshadow) |
| **Publication deadlines** | Dated milestones + file drop | `activity_milestones` + storage folder |

---

## G. Competitor / feature table (compressed)

| Capability | FACTS | PowerSchool | Blackbaud | FinalForms | Rank One | CutTime | Apptegy | Kelyra (D) target |
|---|---|---|---|---|---|---|---|---|
| Activity membership | Thin / portal | Activities Setup | Activities module | Athlete-focused | Strong | Members | Groups/rooms | **Substrate P0** |
| Team schedules | Calendar / partner | Limited native | Athletics schedules | Weak | Strong | Strong (arts) | Events | **CAL attach P0** |
| Forms / physicals | Docs / partners | Partners | Partial | **Core** | Strong | eSign | Weak | **Forms pack P1** |
| Eligibility engine | Partner | Partner | Partial | **Core** | Strong | N/A | No | **Thin pack P2** |
| Fine arts inventory | No | No | No | Equip add-ons | Partial | **Core** | No | **Out** |
| Nurse EHR | Medical fields | Medical | Partial | No | Injury AD | No | No | **Gated late pack** |
| Family messaging | Family app | Various | Yes | Yes | Yes | Yes | **Core** | Reuse messaging |
| Volunteer signup | Weak | Weak | Weak | Weak | Weak | Partial | Weak | SignupGenius-like P1 |
| Gradebook integration | Native SIS | Native | Native | SIS sync | SIS sync | No | Classroom sync | Read-only eligibility later |

---

## H. Sources (accessed 2026-09-24 CT)

1. FACTS × Reach partnership — https://factsmgt.com/press-releases/facts-partners-with-reach-to-enhance-student-life-management-through-seamless-integration/  
2. FACTS SIS overview — https://factsmgt.com/features/student-information-system/  
3. FACTS Engagement / Family App — https://factsmgt.com/intelligence/engagement/  
4. PowerSchool Activities Setup — https://ps.powerschool-docs.com/pssis-admin/latest/activities-setup  
5. Blackbaud Extracurricular — https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/k12/full-help/content/lms.html  
6. Blackbaud Sports and Teams — https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/k12/full-help/content/bb-core-sports-teams.html  
7. Blackbaud Manage Teams Schedule — https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/teachers/content/lms-manage-team-schedule.html  
8. FinalForms Athletic Management — https://www.finalforms.com/solutions/athletic-management-software/  
9. Rank One — https://rankone.com/  
10. BigTeams Eligibility Central — https://www.bigteams.com/products/bigteams-eligibility-central/  
11. CutTime — https://gocuttime.com/  
12. CutTime features / Charms history — https://gocuttime.com/features  
13. Apptegy Group Connect — https://www.apptegy.com/group-connect/  
14. Apptegy / Thrillshare — https://thrillshare.com/  
15. SNAP Health Center — https://www.psnihealth.com/solutions/snap-health-center-for-nursing  
16. Joint Guidance FERPA & HIPAA (studentprivacy.ed.gov) — https://studentprivacy.ed.gov/sites/default/files/resource_document/file/2019%20HIPAA%20FERPA%20Joint%20Guidance%20508.pdf  
17. REMS copy of joint guidance — https://rems.ed.gov/docs/2019%20HIPAA%20FERPA%20Joint%20Guidance.pdf  
18. School example: Rank One + FACTS student ID workflow — https://www.northlandchristian.org/athletics/facilities  

Internal SoT skimmed for reuse: calendar-*, class-landing-*, car-rider-*, ferpa-*, learning-analytics-*, production-gtm report.

---

## I. Spring Baptist implications

- Christian K–12: **chapel + missions + Bible clubs** are first-class Activity templates, not afterthoughts.  
- FACTS-adjacent: parents already expect **one portal** for calendar + forms; Kelyra wins by reducing Band/Remind/SignupGenius sprawl **without** becoming Rank One.  
- Likely P0 pain: club sponsors and arts directors need **roster + schedule + announce**; AD needs **team schedule** before eligibility software.  
- Nurse exists but **must not block** Activities launch.

---

## J. Risks

| Risk | Mitigation |
|---|---|
| Scope creep into Full SIS athletics / EHR | Explicit non-goals; ordered slices; pack gates |
| PHI in wrong surfaces | Nurse pack off by default; counsel; no clinic in messaging search |
| Coach UX abandoned (spreadsheets remain) | Slice 3 roster+schedule before fancy eligibility |
| Gradebook / Teach home pollution | Activities live under school/office + “My Activities” — never Insights |
| Photo/yearbook consent misses | Forms pack before public publish tools |
| Twin / sibling mix on parent sport views | Reuse CAL twin wall |

---

*End ANC-R1 research. Plan SoT: `ancillary-activities-plan.md`.*
