# Ancillary / Co-Curricular School Activities — Research Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/ancillary-activities-research.md` · `notes/company/ancillary-activities-plan.md`  
**Card:** `t_2935363b`  
**Access date for all URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above. Research + recommendation only — **no app implementation**. No Hermes AI staffing.

**Not legal advice.** Cross-link FERPA: `notes/company/ferpa-compliance-plan.md`. Nurse/clinic = counsel before enable.

---

## Recommendation (pick)

### Best approach for Spring Baptist: **(D) Hybrid**

| Approach | Verdict |
|---|---|
| (A) First-class modules per domain (Nurse app, Athletics app, …) | **No** — overwhelms core; Eng explosion |
| (B) Generic Activities/Groups only (no packs) | **Incomplete** — good substrate, weak on forms/eligibility/nurse |
| (C) Thin calendar + messaging only | **No** — coaches keep spreadsheets |
| **(D) Hybrid** = Activities/Groups core + opt-in domain packs | **Yes — lock this** |

### Locked architecture bullets

- One **Activities/Groups** substrate with typed templates (club, team, production, publication, chapel/service, enrichment, clinic-inert).  
- Reuse **CAL**, messaging, optional LAND-like Activity home, Ride only at edges.  
- Packs: **Forms → Athletics eligibility → Nurse (gated)**.  
- Spring Baptist start: clubs/arts/chapel + thin athletics schedule/roster; **nurse off**.  
- **Out:** cafeteria/lunch POS; transport beyond Ride; CutTime-class inventory; Full SIS athletics/EHR day one.

---

## Comprehensive inventory (compressed)

| Group | Examples | P0 stance |
|---|---|---|
| Health/ops | Nurse visits, meds, immunizations, clinic incidents | Later **Nurse pack** |
| Athletics | Teams, schedules, roster, eligibility, physicals, travel | Schedule+roster P0; eligibility later |
| Clubs / orgs | Chess, robotics, NHS, student council | **P0 Activities** |
| Arts / performance | Plays, musicals, choir/band concerts, fine arts shows | **P0** + RSVP |
| Publications | Newspaper, yearbook, lit mag | Light workspace P1 |
| Faith/community | Chapel, missions, Bible clubs | **P0** templates/calendar |
| Enrichment/ops | Field trips, tutoring, library, aftercare, volunteer, spirit | Trips via Forms; others optional |
| Out / optional | Cafeteria/lunch; bus routing beyond Ride | **Explicit out** |

---

## Ordered slices (implementation roadmap)

1. **Activities/Groups primitive + calendar attach + membership (clubs)**  
2. **Performance/event announcements + parent RSVP (plays/concerts)**  
3. **Athletics team schedule + roster** (no eligibility engine yet)  
4. **Publications workspace light** (deadlines + file drop)  
5. **Forms pack** (permission slips / FinalForms-lite)  
6. **Athletics eligibility + physicals tracking**  
7. **Nurse/clinic pack** (gated; counsel)

Order keeps PHI and association complexity last; delivers sponsor/coach calendar+roster value first without touching gradebook home.

---

## Industry snapshot

- **SIS native:** membership + calendar (PowerSchool Activities; FACTS portal/calendar; Blackbaud Activities + Athletics).  
- **Bolt-ons:** FinalForms / Rank One / BigTeams (athletics forms & eligibility); CutTime (fine arts; Charms sunset); Apptegy/Band/Remind (comms); SignupGenius (signups); SNAP (nurse EHR).  
- Pattern = **substrate + specialists** → matches (D).

---

## Risks

| Risk | Mitigation |
|---|---|
| **Scope creep** into Rank One / SNAP | Non-goals + slice gates |
| **PHI / nurse** | Pack off; counsel; isolated RLS |
| **Coach UX** | Slice 3 roster+schedule before eligibility chrome |
| **Core overwhelm** | Activities hub separate from Teach Insights |
| **Photo releases** | Forms before yearbook publish tools |

---

## Top open questions

1. Tray vs School submenu for Activities?  
2. Chapel as Activity type vs school calendar only?  
3. Nurse counsel this semester or park past trial?  
4. Manual rosters OK vs FACTS sync for trial?

---

## Coverage map

| Topic | Research § | Plan § |
|---|---|---|
| Inventory | Research §A | — |
| Industry landscape | Research §B | — |
| Architecture options | Research §C | Plan §0 |
| Roles | Research §D | Plan §0, N10 |
| Privacy | Research §E | Plan §1, slice 7 |
| Reuse map | Research §F | Plan §5 |
| Competitor table | Research §G | — |
| Sources | Research §H | — |
| Ordered slices | — | Plan §3 |
| UX IA | — | Plan §4 |
| Open questions | — | Plan §6 |
| Acceptance | — | Plan §7 |

---

## Pointers (SoT)

- Research: `notes/company/ancillary-activities-research.md`  
- Plan: `notes/company/ancillary-activities-plan.md`  
- Related: calendar-plan, class-landing-plan, car-rider-plan, ferpa-compliance-plan, learning-analytics-plan, `notes/research/2026-09-24-production-gtm-report.md`

---

## Phase / slice snapshot

| Slice | Ship |
|---|---|
| 1 | Activities + membership + CAL (clubs/chapel/arts types) |
| 2 | Announce + parent RSVP |
| 3 | Athletics schedule + roster |
| 4 | Publications light |
| 5 | Forms pack |
| 6 | Eligibility + physicals |
| 7 | Nurse pack (gated) |

---

*End digest ANC-R1 / ANC-P1. Card `t_2935363b`.*
