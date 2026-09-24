# FERPA — Compliance Research Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/ferpa-research.md` · `notes/company/ferpa-compliance-plan.md`  
**Card:** `t_e6da0815`  
**Access date for all URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above.

**Legal posture:** Not legal advice. Not a claim that Kelyra is FERPA-certified or a FERPA school official.

---

## Top P0 gaps

1. **P0-1** — Publish **Privacy Policy + Terms of Service** on `kelyra.app` (blocks honest trial / store / DNS unpark).  
2. **P0-2** — Sign **Pilot MOU** with Spring Baptist (purpose limits, subprocessors, retention, deletion, no false FERPA claims). Teacher click-through ≠ school DPA.  
3. **P0-3** — Document **COPPA / under-13** path (school-as-agent vs parental consent) for student sessions.  
4. **P0-4** — Customer-facing **AI disclosure** (paid Gemini/xAI process homework images/audio; no free-tier training endpoints).  
5. **P0-5** — **Ride/LPR** parent notice + retention (plates/stills linked to children).  
6. **P0-6** — Keep **non-claim**: do not market “FERPA compliant / school official” until counsel-approved DPA + matching ops.  
7. **P0-7** — **Access/deletion intake** + breach notify runbook (even if manual for trial).  
8. **P0-8** — **Subprocessor inventory** (Supabase, Gemini, Cloudflare, Resend, Sentry, EAS) with DPAs/terms acknowledged.

---

## Research (synopsis)

### FERPA in one page

FERPA (20 U.S.C. § 1232g; 34 CFR Part 99) applies to schools/agencies that receive applicable **U.S. Department of Education program funds**. It protects **education records** and restricts disclosure of **PII** without consent, with exceptions — especially **school official / legitimate educational interest** for contractors under the school’s **direct control** who use data only for the authorized educational purpose and do not redisclose. ([studentprivacy.ed.gov/ferpa](https://studentprivacy.ed.gov/ferpa); [eCFR Part 99 Subpart D](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D); [Vendor FAQ](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf)).

**Private schools:** Usually **not** FERPA-bound solely because students receive equitable services; they are bound only if the school itself receives qualifying funds. ([§ 99.1(b)](https://studentprivacy.ed.gov/ferpa); ED equitable-services FERPA Q&A). **Still contract for confidentiality.**

### Applicability matrix (vendor view)

| School | FERPA on school? | Kelyra implication |
|---|---|---|
| Public LEA | Usually yes | NDPA/DPA + school-official terms before claim |
| Private + ED funds to school | Yes (verify) | Same |
| Private, no ED funds to school (common) | Usually no | MOU + Privacy Policy; no school-official claim |
| Parent B2C | N/A | COPPA / state minor privacy |

### What Kelyra already has (soft FERPA)

From `docs/architecture.md` / `research/06` / AVG-S1:

- Keys server-side; private buckets; Approve gate; paid AI no-training intent; prompt minimization; RLS hat walls; **explicit non-claim** of school-official without DPA.

Necessary. **Not sufficient** for district sales or compliance marketing.

### Related regs

| Regime | Why it matters |
|---|---|
| **COPPA** | Under-13 collection; school may consent as agent only for educational use, no other commercial purpose ([FTC FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)) |
| **PPRA** | Surveys on protected topics — secondary unless Ask/diary becomes survey-like ([PPRA hub](https://studentprivacy.ed.gov/topic/protection-pupil-rights-amendment-ppra)) |
| **TEC Ch. 32** | TX operator / covered information rules — acute for public LEAs ([TEC 32](https://statutes.capitol.texas.gov/Docs/ED/htm/ED.32.htm)) |
| **SB 820 / § 11.175** | District cybersecurity coordinator/breach — private schools generally out; still adopt hygiene ([SB 820](https://capitol.texas.gov/tlodocs/86R/billtext/html/SB00820F.HTM)) |
| **SCOPE Act HB 18** | Social digital services + public-school software standards — counsel on messaging/diary ([TX OAG](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/securing-children-online-through-parental-empowerment)) |
| **SDPC NDPA / TX-DPA** | Procurement standard; v2.2 Nov 2025 ([A4L](https://privacy.a4l.org/national-dpa/); [TxSPA](https://www.tetl.org/cpages/texas-student-data-privacy-alliance)) |
| **HIPAA** | Usually **out** for grades/Ride unless PHI |

---

## Plan (roadmap)

### Phase A — Trial
Privacy Policy + ToS → Pilot MOU → paid AI + Pro Supabase → Ride notice/retention → subprocessor list → incident/deletion intake → honest marketing.

### Phase B — Paid
Short DPA or NDPA → insurance → tested export/delete → questionnaire pack → retention jobs.

### Phase C — Multi-school / TX public
TX-NDPA workflow → state matrix → harder student auth → pen test/SOC2 decision.

### Counsel questions (top)
1. Is Spring Baptist FERPA-bound (ED funds to the school)?  
2. Contracting party: school vs teacher?  
3. MOU-only vs short DPA for trial?  
4. Ride retention window?  
5. Under-13: school agent vs parent-first?  
6. Messaging/diary = school records or personal?  

---

## Recommended Chuck actions (this week)

1. Answer counsel Q1–Q6 (even tentatively).  
2. Authorize `legal-compliance` to draft Privacy Policy + Pilot MOU skeletons (outside counsel if needed).  
3. Do **not** unpark DNS / claim FERPA school-official until Policy + MOU exist.  
4. Keep Eng dark on “FERPA certification” work — privacy product walls continue per epic security reviews (AVG-S1 pattern).

---

## Files written

| Path | Role |
|---|---|
| `notes/company/ferpa-research.md` | Full research SoT |
| `notes/company/ferpa-compliance-plan.md` | Gaps, roadmap, related-regs actions |
| `notes/research/2026-09-24-ferpa-compliance-report.md` | This digest |

**Method:** Read-only review of architecture + prior FERPA research + AVG security note + GTM §7; primary sources accessed 2026-09-24. No app code. No Hermes AI staffing. No SQL / qa-loop.
