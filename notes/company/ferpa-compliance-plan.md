# FERPA Compliance Plan (FERPA-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** P1  
**Research:** `notes/company/ferpa-research.md` (FERPA-R1)  
**Card:** `t_e6da0815`  
**Access date for cited URLs:** 2026-09-24 (America/Chicago)  
**Legal posture:** Recommended product / process / legal / ops roadmap. **Not legal advice.** Do not claim FERPA school-official or “FERPA certified” until counsel signs off and artifacts match reality. No app code from this card.

**Audience:** Chuck / CoS / legal-compliance profile (counsel escalate).  
**Trial archetype:** Spring Baptist Academy (private K–12 TX) → paid multi-school.

---

## 0. One-screen law

| Surface | Job | Not |
|---|---|---|
| **Privacy posture** | Treat student-linked data as confidential education records by **contract + product walls**, whether or not FERPA formally binds the school | Not a marketing badge; not auto school-official |
| **Trial** | Privacy Policy + ToS + Pilot MOU + paid no-training AI + private buckets + Approve / hat walls | Not NDPA-required for private academy day one |
| **Paid public LEA** | SDPC NDPA / TX-DPA (or school form) + subprocessor list + breach runbook + delete-on-request | Not “click-through teacher ToS = school DPA” |
| **AI / Storage / Ride** | Purpose-limited processing; minimize prompts; retention; parent/school notice for plates/photos | Not free consumer endpoints; not indefinite LPR stills |

---

## 1. Gap assessment vs current Kelyra

Grounded in `docs/architecture.md`, `research/06`, AVG-S1, GTM §7, and live product surfaces (grades, captures, Ask, Ride/LPR, messaging, calendar, diary). **Flag:** live column names / RLS may differ — Eng verifies before claiming closed.

### 1.1 Inventory: Shipped / Partial / Missing

| Area | Status | Gap |
|---|---|---|
| Server-side AI keys; no `EXPO_PUBLIC` secrets | **Shipped (law)** | Keep; audit new Edge functions |
| Paid AI / no training | **Partial / ops** | Confirm Gemini billing paid in prod; document xAI vs Gemini path |
| Private Storage | **Shipped** | Retention/TTL jobs incomplete for all asset types |
| Approve gate / draft ≠ publish | **Shipped (law)** | Extend discipline to calendar publish, family DTOs |
| RLS hats / twins / focused child | **Partial** | Continuous threat review per epic (AVG-S1 pattern) |
| Prompt minimization (no roster/SIS/IEP dumps) | **Partial** | Homework Ask still injects first names — acceptable if controlled; syllabus parse must not |
| Privacy Policy + ToS on `kelyra.app` | **Missing** | P0 for DNS / trial |
| Pilot MOU (Spring Baptist) | **Missing** | P0 |
| School / parental COPPA notice path | **Missing / unclear** | P0 for under-13 student accounts |
| Ride plate / photo parent notice + retention | **Missing** | P0 before Ride go-live with parents |
| Subprocessor list (public) | **Missing** | P0 trial; harden for paid |
| DPA / NDPA / TX-DPA template | **Missing** | P1 paid / multi-school |
| Breach detection → school/parent notify runbook | **Partial** | Sentry planned; legal templates missing |
| Delete / export on school request | **Partial** | Need documented ops procedure + RPC/scripts |
| Student auth (class code + pick name) | **Shipped soft** | Guessable; rate-limit/rotate; COPPA framing |
| Marketing claims hygiene | **Soft** | Enforce: no “FERPA compliant” without counsel |
| SOC2 / pen test pack | **Missing** | P2 multi-district |
| HIPAA / BAA | **N/A default** | Only if PHI product appears |

### 1.2 Top P0 gaps (compliance blockers for honest trial)

1. **No published Privacy Policy + Terms of Service** — GTM already flags as go-live blocker; App Store / parent trust require them.  
2. **No Pilot MOU / school data-processing agreement** — teacher click-through ≠ school authorization; without MOU, school-official exception cannot be established even if school is FERPA-bound.  
3. **Under-13 / COPPA consent path undocumented** — student sessions collect personal info; need school-as-agent or parental consent language + notices.  
4. **AI vendor disclosure incomplete in customer-facing docs** — parents/schools must know Gemini/xAI (and any STT) process homework images/audio under paid no-training terms; free tiers forbidden.  
5. **Ride/LPR retention + parent notice undefined** — plates/vehicle photos linked to children are high-sensitivity; need purpose, retention (e.g. 7–30 days), and who can view.  
6. **Cannot truthfully claim “FERPA school official”** — architecture already forbids this; sales/deck/App copy must stay consistent until DPA exists.  
7. **Deletion / access request ops not packaged** — FERPA/COPPA/TEC32 expect school/parent rights; need a ticketed procedure even if manual for trial.  
8. **Subprocessor DPAs not inventoried** — Supabase, Google (Gemini), Cloudflare, Resend, Sentry, EAS — acknowledge terms / DPA where offered (Pro Supabase, etc.).

### 1.3 P1 gaps (paid launch / first public LEA)

- SDPC NDPA v2.2 + TX exhibit readiness (or short-form DPA)  
- Public subprocessor list + change-notice process  
- Security questionnaire pack (access controls, encryption, logging, backups, MFA for admin)  
- Formal retention schedule by data class  
- Breach notification templates (school + parent) timed to TX public-district expectations even if private school isn’t under § 11.175  
- Family/syllabus serializers audited against AVG-S1 must-fix list before AVG family ship  
- Join-code hardening (rotate, rate-limit, audit)

### 1.4 P2 gaps (multi-school / districts)

- Pen test / SOC2 path decision  
- State matrix beyond TX (CA SOPIPA-like, NY 2-d, etc.)  
- Automated data-subject / school deletion tooling  
- Optional on-device OCR / PII redaction before vendor vision  
- Directory-info vs education-record product taxonomy in admin UI

---

## 2. Needed changes by workstream

### 2.1 Legal / contracting (Chuck + counsel)

| ID | Pri | Deliverable | Notes |
|---|---|---|---|
| L0-1 | **P0** | Privacy Policy (plain English + data categories + AI + Ride + retention + contact) | Host on `kelyra.app` before DNS unpark |
| L0-2 | **P0** | Terms of Service (school/teacher seats; acceptable use; no ads on student data) | B2B invoice sales outside IAP still need ToS |
| L0-3 | **P0** | Spring Baptist **Pilot MOU**: roles, purpose limitation, subprocessors, retention, screenshot/case-study rights, no “FERPA certified” claim, termination/deletion | School signature |
| L0-4 | **P0** | COPPA school-agent / parental consent language for under-13 | Align with student auth UX |
| L1-1 | **P1** | Short-form DPA **or** SDPC NDPA + TX exhibit template | For public LEA / multi-school |
| L1-2 | **P1** | Subprocessor schedule Exhibit | Living list |
| L1-3 | **P1** | Counsel memo: Spring Baptist FERPA-funds status; SCOPE Act messaging/diary; TEC 32 operator exposure | Paid counsel |
| L2-1 | **P2** | Multi-state exhibits; cyber + E&O insurance | GTM already flags insurance |

### 2.2 Product / engineering (future cards — **not this card**)

| ID | Pri | Change | Notes |
|---|---|---|---|
| E0-1 | **P0** | Settings / about links to Privacy Policy + support email | Store compliance |
| E0-2 | **P0** | Confirm paid Gemini (and any xAI prod) keys; block free-tier paths in prod | Architecture risk #6 |
| E0-3 | **P0** | Ride: retention policy enforcement for LPR crops / stills; admin delete | Align MOU |
| E0-4 | **P0** | Document + test fail-closed family/parent DTOs (no drafts, no classmates, twins) | AVG-S1 / calendar laws |
| E1-1 | **P1** | School export / delete request tooling (scripted OK for v1) | Ops + Eng |
| E1-2 | **P1** | Join_code rotate + rate-limit + audit log | Soft student auth |
| E1-3 | **P1** | Asset TTL jobs (captures, syllabus drafts, Ask attachments) | AVG 30-day idle pattern |
| E1-4 | **P1** | Admin MFA for office/superuser seats | Questionnaire |
| E2-1 | **P2** | PII detector / redaction before vision | Later |
| E2-2 | **P2** | Automated NDPA-aligned data maps | Later |

**Constraint:** No SQL / no `kelyra-qa-loop` from `t_e6da0815`. Spawn Eng cards after Chuck accepts this plan.

### 2.3 Process / ops

| ID | Pri | Change |
|---|---|---|
| O0-1 | **P0** | Subprocessor inventory spreadsheet + annual review |
| O0-2 | **P0** | Incident runbook: detect → contain → notify Chuck → notify school → parent if required |
| O0-3 | **P0** | Access request / deletion request intake (email → tracked ticket) |
| O1-1 | **P1** | Vendor security questionnaire answers (reuse for RFPs) |
| O1-2 | **P1** | Quarterly access review (who has prod Supabase / Edge secrets) |
| O2-1 | **P2** | Tabletop breach exercise |

---

## 3. Related regimes — Kelyra action map

| Regime | Trial (private TX) | Paid public LEA | Product action |
|---|---|---|---|
| **FERPA** | Verify funds; contract as if sensitive | School-official via DPA/NDPA | RLS, Approve, purpose limits, no false claims |
| **COPPA** | School-agent or parental consent | Same + notices | Under-13 auth, deletion rights |
| **PPRA** | Low unless surveys | Avoid protected-topic surveys without consent flows | Don’t add SEL psychometrics casually |
| **TEC Ch. 32** | Contractual hygiene | Operator duties + possible state DPA / unique ID | No ads/sale; security; delete |
| **TEC § 11.175 / SB 820** | Not typically binding on private school | District needs breach reporting | Help customers: logging, notify templates |
| **SCOPE Act HB 18** | Counsel on messaging/diary | Article 3 school software consent | Minimize social-ish defaults |
| **SDPC NDPA / TX-DPA** | Optional | Strongly expected | Prepare to sign |
| **HIPAA** | Out of scope | Out unless PHI | Don’t store clinic PHI |
| **Other state laws** | Watch | Matrix later | NDPA + exhibits |

---

## 4. Compliance roadmap

### Phase A — Trial (Spring Baptist) — **now → go-live**

1. Write/publish Privacy Policy + ToS.  
2. Sign Pilot MOU.  
3. Confirm paid AI + Supabase Pro always-on.  
4. Ride parent notice + retention decision (document numbers).  
5. Subprocessor list (internal → publish abbreviated).  
6. Incident + deletion intake email.  
7. Keep marketing: “privacy-by-design / designed for schools” — **not** “FERPA certified.”

### Phase B — Paid launch (1–few schools)

1. Short DPA or NDPA.  
2. Cyber + E&O insurance.  
3. Export/delete playbook tested once.  
4. Security questionnaire pack.  
5. Retention jobs live for high-PII assets.

### Phase C — Multi-school / TX public LEA

1. TX-NDPA / SDPC membership workflow.  
2. State matrix + counsel.  
3. Hardened student auth; optional SSO later.  
4. Pen test / SOC2 decision.  
5. Vendor risk reviews for every new AI/subprocessor.

---

## 5. Open questions for Chuck / counsel

1. Does Spring Baptist (or any trial school) receive U.S. Department of Education program **funds paid to the school** such that FERPA applies?  
2. Who is the contracting party — school entity vs individual teacher — for the pilot? (Affects school-official story.)  
3. Preferred instrument for trial: Pilot MOU only, or also short DPA?  
4. Ride LPR retention: 7 / 14 / 30 days? Who may view stills (office only vs teachers)?  
5. Student under-13 path: school consent as agent vs require parent magic-link before student session?  
6. Will messaging/diary be framed as school-maintained education records or personal journals? (SCOPE + FERPA optics.)  
7. Are we willing to sign SDPC NDPA unmodified (Exhibit E) or expect Exhibit H changes?  
8. App Store age rating / COPPA questionnaire answers — who owns copy?  
9. Budget for outside education-privacy counsel (fixed memo vs ongoing)?  
10. Any intent to process health/clinic data that would pull HIPAA?

---

## 6. Acceptance criteria for this plan (card)

- [x] Research SoT written (`ferpa-research.md`)  
- [x] Gaps + roadmap + related regs written (this file)  
- [x] Dated digest for Chuck (`notes/research/2026-09-24-ferpa-compliance-report.md`)  
- [ ] Chuck review / counsel escalate as needed  
- [ ] Follow-on Eng/legal cards created **after** Chuck accepts (not auto from this card)

---

## 7. Downstream recommendations (after Chuck yes)

| Next card (suggested) | Owner |
|---|---|
| Draft Privacy Policy + ToS skeleton | legal-compliance + Chuck |
| Pilot MOU skeleton for Spring Baptist | legal-compliance + Chuck |
| Ride retention + parent notice product lock | PM + security |
| Subprocessor inventory | devops-release + CoS |
| NDPA readiness spike | legal-compliance |

**RECOMMENDED NEXT ACTION:** Chuck answers §5 Q1–Q6; legal-compliance drafts Privacy Policy + Pilot MOU; do not staff Eng FERPA implementation until those exist.
