# FERPA Research Note (FERPA-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_e6da0815`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)  
**Legal posture:** Engineering / product research for Kelyra. **Not legal advice.** Not a claim that Kelyra is FERPA-certified or a FERPA “school official.” Verify with counsel before any school contract, public claim, or App Store disclosure.

**Related (do not rebuild):**  
- `docs/architecture.md` — soft FERPA posture (keys server-side, private buckets, Approve gate, no school-official claim without DPA)  
- `research/06-stack-ai-cost-ferpa.md` — stack + FERPA product-path framing  
- `notes/company/avg-spec-security-ferpa.md` — feature-scoped threat model (AVG)  
- `notes/research/2026-09-24-production-gtm-report.md` §7 — trial compliance checklist  
- Plan SoT: `notes/company/ferpa-compliance-plan.md`  
- Dated digest: `notes/research/2026-09-24-ferpa-compliance-report.md`

**Trial archetype:** Spring Baptist Academy (private K–12, Texas). Product already holds education-record–like data: grades, homework photos/audio, Ask drafts, Ride/LPR, messaging, calendar, diary.

---

## Executive summary

FERPA (20 U.S.C. § 1232g; 34 CFR Part 99) gives parents (and eligible students) rights over **education records** maintained by schools that receive applicable U.S. Department of Education program funds. It restricts **disclosure of personally identifiable information (PII)** from those records without consent, with enumerated exceptions — most relevant to Kelyra: the **school official / legitimate educational interest** exception for contractors under the school’s **direct control**.

**For Kelyra as SaaS:**

1. **FERPA binds the school (or LEA), not the app by default.** If the school is FERPA-covered and discloses student PII to Kelyra, the school typically relies on the school-official exception (or consent). Kelyra must contractually accept the limits that exception requires (purpose limitation, no unauthorized redisclosure, school control over use/maintenance).
2. **Many private K–12 schools are not FERPA-covered** unless they themselves receive a payment of money from a Department-administered program. Equitable services alone usually do **not** make a private school FERPA-bound. **Still treat records as confidential by contract** for Spring Baptist (and any private school).
3. **Current Kelyra posture is “soft FERPA” / privacy-by-design**, not school-official status: paid AI no-training, private Storage, RLS hat walls, Approve before publish. That is necessary but **not sufficient** for district sales or for claiming compliance.
4. **Related regimes that matter now:** COPPA (under-13 collection), Texas TEC Ch. 32 (operators / covered information — more acute for public LEAs), SDPC NDPA / TX-DPA (procurement signal), PPRA (surveys — secondary for Kelyra), SCOPE Act / SB 820 (mostly public-school or social-platform shaped; verify messaging/diary with counsel). HIPAA is usually **out of scope** for ordinary grades unless true PHI.

**Verdict for trial:** Ship Privacy Policy + Pilot MOU + paid subprocessors + honest non-claims. Do **not** market “FERPA compliant / school official” until counsel-approved DPA language exists and product/ops match it.

---

## 1. FERPA synopsis (general requirements)

### 1.1 Who FERPA applies to

FERPA applies to educational agencies and institutions to which funds have been made available under any program administered by the U.S. Secretary of Education, if the institution provides educational services/instruction or the agency directs/controls such institutions. (34 CFR § 99.1)

- Receipt of funds includes grants, cooperative agreements, contracts, subgrants, or subcontracts; or student aid that may be paid to the institution (e.g., certain postsecondary aid). (§ 99.1(c))
- An institution is **not** covered solely because students receive non-monetary benefits / equitable services when **no funds** under the program are made available to the institution. (§ 99.1(b))
- If covered, FERPA applies to the recipient **as a whole**. (§ 99.1(d))

**Primary sources:** [studentprivacy.ed.gov/ferpa](https://studentprivacy.ed.gov/ferpa); eCFR 34 CFR Part 99. Accessed 2026-09-24 (America/Chicago).

### 1.2 Core definitions

| Term | Meaning (plain language) | Why it matters for Kelyra |
|---|---|---|
| **Education record** | Records directly related to a student **and** maintained by the school or a party acting for it | Grades, homework captures, teacher notes tied to a student, attendance-adjacent Ride checkout tied to a named student, diary entries maintained as school records — likely in scope when the school maintains them via Kelyra |
| **PII** | Information that alone or with other reasonably available info can identify a student | Legal name, student ID, photos of work with names, plates linked to a child, voice, biometrics, etc. |
| **Directory information** | Limited categories a school may designate (name, grade level, etc.) if it follows notice/opt-out rules | **Not** a free pass for grades, homework images, or Ride plates |
| **Parent / eligible student** | Parents of minor students; rights transfer to student at 18 or postsecondary enrollment (with nuances) | Parent invite / family view must map to linked child only |
| **Disclosure** | Permitting access to or the release of PII from education records | Uploading to AI vendors, Storage, email, LPR processors, analytics = disclosures that need an exception or consent |

Sources: 34 CFR §§ 99.3, 99.30–99.31. Accessed 2026-09-24.

### 1.3 Parent / eligible-student rights (high level)

Typically:

1. **Inspect and review** education records  
2. **Request amendment** of inaccurate/misleading records  
3. **Consent to disclosures** of PII (unless an exception applies)  
4. **File a complaint** with the U.S. Department of Education  

Schools must provide annual notification of rights. Vendors should make school compliance *possible* (export, access, deletion on school request) even when the vendor is not the “school.”

Source: [Protecting Student Privacy — FERPA](https://studentprivacy.ed.gov/ferpa). Accessed 2026-09-24.

### 1.4 Consent vs exceptions

**Default:** Prior written consent before disclosing PII from education records (34 CFR § 99.30).

**Most relevant exception for edtech:** **School official with legitimate educational interest** (34 CFR § 99.31(a)(1)), including contractors/consultants when:

1. They perform an institutional service/function the school would otherwise use employees for;  
2. They are under the school’s **direct control** regarding use and maintenance of education records;  
3. They are subject to § 99.33(a) use/redisclosure limits (purpose-limited; no unauthorized redisclosure);  
4. They meet criteria in the school’s **annual FERPA notice** for school officials / legitimate educational interest.

ED guidance: a written contract is **not federally mandatory** for the exception, but schools typically establish direct control via contract or ToS. PII under the exception may be used **only** for the authorized educational purpose — not sold, not reused for advertising/profiling outside the authorized purpose.

Sources:  
- [Vendor FAQ (PTAC / studentprivacy.ed.gov PDF)](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf)  
- [School official community-org FAQ](https://studentprivacy.ed.gov/faq/when-does-school-official-exception-allow-school-or-lea-non-consensually-disclose-education)  
- eCFR [34 CFR Part 99 Subpart D](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D)  
Accessed 2026-09-24.

Other exceptions exist (studies, transfer, health/safety, directory information under conditions, authorized representatives, etc.) — Kelyra should **not** rely on them as a general SaaS business model without counsel.

### 1.5 De-identification

FERPA permits release of information after removal of all PII if the school reasonably determines a student is not identifiable (34 CFR § 99.31(b)). “Strip names then send the photo to a free consumer chatbot” is **not** de-identification if handwriting, faces, or context still identify the child. Kelyra’s architecture correctly treats vision calls as potential PII processing.

### 1.6 Security / “best practices” tied to FERPA

FERPA itself is primarily an access/disclosure statute; it does not prescribe a NIST checklist. In practice, ED/PTAC and procurement expect:

- Reasonable methods so officials only access records with legitimate educational interest (technological or administrative controls) — aligns with Kelyra **RLS / hat walls**  
- Contracts that define permitted use, subprocessors, retention, breach notice, deletion, audit rights  
- No marketing/sale of student data; no unauthorized redisclosure  
- Logging without dumping education-record contents into vendor logs  

Source: PTAC online educational services guidance (cited in `research/06` [S19]); Vendor FAQ above. Accessed 2026-09-24.

---

## 2. Applicability matrix (school type × Kelyra role)

| School type | Is school typically FERPA-bound? | How school may share PII with Kelyra | What Kelyra must still do | Marketing claim OK? |
|---|---|---|---|---|
| **Public K–12 LEA / public school** | Usually **yes** (receives ED program funds) | School-official exception + DPA/NDPA **or** parental consent | School-official contractual terms; purpose limits; delete on request; subprocessor control; security questionnaire readiness | Only after signed DPA + counsel-approved copy |
| **Private school that receives ED program funds paid to the school** | **Yes** (verify facts) | Same as public for FERPA mechanics | Same | Same |
| **Private school whose students only get equitable services; school itself gets no ED funds** | Usually **no** under § 99.1(b) | Contractual confidentiality / state law / school policy — **not** FERPA school-official by default | Still: Privacy Policy, MOU/DPA-lite, COPPA path, paid AI, RLS, retention | Do **not** say “FERPA school official”; may say “designed to support school privacy obligations” only if accurate |
| **Homeschool / parent-direct B2C** | FERPA typically N/A (no school agency) | Parent consent / COPPA | COPPA + state minor privacy; different product path | Do not use school-official language |

**Private-school nuance (authoritative guidance):** Private schools whose students/teachers receive equitable services are **not** subject to FERPA solely for that reason; they are subject only if they otherwise receive funds from a Department-administered program. ([ED equitable-services guidance Q&A on FERPA](https://www.ed.gov/media/document/title-ix-part-e-uniform-provisions-subpart-1-private-schools-equitable-services-eligible-private-school-students-teachers-and-other-educational-personnel-march); 34 CFR § 99.1(b)). Accessed 2026-09-24.

**Spring Baptist (trial):** Assume **“verify funds status with the school.”** Default product/legal posture = **contractual privacy as if records were sensitive education records**, without claiming federal school-official status until counsel + school confirm.

---

## 3. What Kelyra already does well (grounded)

From `docs/architecture.md`, `docs/mvp.md`, `research/06`, AVG security note, GTM §7:

| Control | Status | Notes |
|---|---|---|
| Model keys server-side (Edge / `ai:dev`) | **In place (law)** | Never `EXPO_PUBLIC_*` |
| Paid AI tier / no training on prompts | **Required posture** | Free consumer endpoints forbidden |
| Private Storage buckets | **In place** | Photos/audio not public |
| Approve gate (nothing is a grade until Approve) | **Product law** | Drafts stay teacher-only |
| Matcher never inserts students | **Product law** | Limits accidental roster growth |
| RLS / hat walls / twin focused-child | **Law + partial ship** | Filters ≠ security; fail-closed |
| Prompt minimization (prefer first names / opaque codes; no SIS/IEP dumps) | **Documented intent** | Enforce per feature |
| Honest non-claim of school-official without DPA | **Documented** | Keep |

---

## 4. Related regulations & guidelines (synopsis)

### 4.1 COPPA (15 U.S.C. §§ 6501–6506; 16 CFR Part 312)

- Applies to **operators** of websites/apps that collect personal information from children **under 13**, or have actual knowledge they do.  
- Schools are generally not “operators,” but school-directed services often rely on **school consent as parent’s agent** when collection is **solely for educational use/benefit of the school**, with **no other commercial purpose** (e.g., behavioral advertising).  
- Operator must still provide required notices and honor parental access/deletion rights upon request.  

Sources: [FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions); [FTC school blog](https://www.ftc.gov/business-guidance/blog/2015/01/testing-testing-review-session-coppa-schools). Accessed 2026-09-24.

**Kelyra implication:** Student class-code + pick-name sessions for under-13s; parent invites; photos/voice — need a clear school-agent or parental-consent path in Privacy Policy + pilot MOU. Store age ratings / disclosures for App Store.

### 4.2 PPRA (20 U.S.C. § 1232h; 34 CFR Part 98)

- Applies to SEAs/LEAs / ED-fund recipients regarding **surveys, analyses, evaluations** on protected topics; also certain marketing and physical exams.  
- Rights transfer at 18 / emancipation.  

Source: [studentprivacy.ed.gov PPRA](https://studentprivacy.ed.gov/topic/protection-pupil-rights-amendment-ppra). Accessed 2026-09-24.

**Kelyra implication:** Secondary unless Ask/diary/surveys collect protected-topic attitudes. Do not build SEL psychometrics without counsel. Ordinary grades/homework are not PPRA “surveys.”

### 4.3 Texas — TEC Chapter 32 Subchapter D (HB 2087 lineage)

- Defines **operator** and **covered information** for school-purpose online services.  
- Restricts use of covered information (no targeted advertising / sale / certain profiling); requires reasonable security; supports access; deletion timelines when district-controlled; LEAs may require a **state-required student data sharing agreement** / unique identifier masking for certain agency-approved operators.  

Sources: [TEC Ch. 32](https://statutes.capitol.texas.gov/Docs/ED/htm/ED.32.htm); [HB 2087 enrolled](https://capitol.texas.gov/tlodocs/85R/billtext/pdf/HB02087F.pdf). Accessed 2026-09-24.

**Kelyra implication:** Highest stakes when selling to **TX public LEAs**. Private schools may still demand similar contractual terms. Align product: no ads on student data; delete-on-request; security practices.

### 4.4 Texas SB 820 / TEC § 11.175 (district cybersecurity)

- Requires **school districts** (and, as amended practice, open-enrollment charters in reporting provisions) to adopt cybersecurity policy, designate coordinator, report breaches, notify parents of affected students.  
- **Private schools are generally not covered** by § 11.175.  

Sources: [SB 820 enrolled](https://capitol.texas.gov/tlodocs/86R/billtext/html/SB00820F.HTM); FindLaw [§ 11.175](https://codes.findlaw.com/tx/education-code/educ-sect-11-175/). Accessed 2026-09-24.

**Kelyra implication:** Adopt breach-ready ops anyway (Sentry, runbooks, parent/school notice templates) so public LEA customers can meet their duties.

### 4.5 Texas SCOPE Act (HB 18)

- **Article 2** targets certain **social** digital services (profiles + user-generated content feeds) used by minors — education-focused services may be outside the core social definition; litigation/injunction status has been fluid — **verify with counsel**.  
- **Article 3** imposes device/software standards on **public districts and open-enrollment charters** (parental consent for software use, minimize collection, etc.).  

Sources: [TX OAG SCOPE page](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/securing-children-online-through-parental-empowerment); secondary compliance profiles. Accessed 2026-09-24.

**Kelyra implication:** Messaging + diary social-ish features need a counsel pass before multi-school TX public launch. Private academy trial: lower Article 3 risk; still document purpose limits.

### 4.6 SDPC NDPA / TX-DPA / TxSPA

- **SDPC National Data Privacy Agreement (NDPA)** — common school–vendor DPA; v2.2 published Nov 19, 2025 (A4L). Used widely to reduce one-off negotiation.  
- **Texas Student Privacy Alliance (TxSPA) / TX-NDPA** — TX exhibit language covering TEC Ch. 32, FERPA school-official designation, breach, destruction.  

Sources: [A4L National DPA](https://privacy.a4l.org/national-dpa/); [TETL TxSPA](https://www.tetl.org/cpages/texas-student-data-privacy-alliance). Accessed 2026-09-24.

**Kelyra implication:** Multi-school / district GTM should plan to sign NDPA + TX exhibit (or school’s short form). Trial private school may accept Pilot MOU + Privacy Policy first.

### 4.7 Other state student-privacy laws (vendor reality)

Many states have operator statutes similar to SOPIPA / TEC 32 (CA, NY Ed Law 2-d, CO, CT, etc.). Pattern: no targeted ads on student data, purpose limitation, security, parental rights via school, deletion. **Do not claim multi-state compliance** without a counsel matrix; use NDPA + state exhibits as the scalable instrument.

### 4.8 HIPAA

Ordinary K–12 grades, homework, car-line plates are **not** HIPAA PHI. HIPAA matters only if Kelyra stores/transmits PHI for a covered entity (e.g., school nurse clinic records). **Default: out of scope.** Supabase HIPAA add-on / BAA is overkill for Spring Baptist grades (aligns with GTM).

### 4.9 FTC / COPPA enforcement patterns (edtech)

Enforcement themes: incomplete notice, collection beyond disclosed purpose, retention longer than necessary, school consent used while also monetizing for non-educational commercial purposes. Product copy and subprocessors must match practices.

---

## 5. Data classes in Kelyra × sensitivity

| Data class | Likely education-record / covered info? | Surfaces | Notes |
|---|---|---|---|
| Roster names, enrollments | Yes | Auth, classes, matcher | Minimize in AI prompts |
| Homework photos / audio | Yes (high) | Capture, Storage, Edge vision/STT | Private buckets; retention |
| `model_draft` / Ask drafts / OCR notes | Teacher work product; may contain PII | Teacher-only until Approve | Never family |
| Approved grades / averages | Yes | Gradebook, family view | Approve gate; own-child only |
| Syllabus photos | High if faces/rosters | AVG path | Delete-on-confirm default (AVG-S1) |
| Ride plates / vehicle photos / LPR crops | Sensitive personal + student linkage | Ride | Parent notice; short retention |
| Messaging / diary | Often yes if school-maintained | Messaging, diary | SCOPE/counsel flag |
| Calendar events | Mixed (policy vs personal) | Calendar | Hat walls; twins |
| Parent contact / invites | Personal info | Auth, email | COPPA/notice |
| Staff walk photos | Staff PII | Ride | Separate from student records |
| Telemetry / Sentry | May incidentally include PII | Ops | Scrub; DPA |

---

## 6. Sources (access 2026-09-24 America/Chicago)

1. U.S. ED Protecting Student Privacy — FERPA hub — https://studentprivacy.ed.gov/ferpa  
2. eCFR 34 CFR Part 99 Subpart D — https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D  
3. PTAC / ED Vendor FAQ PDF — https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf  
4. School official exception FAQ — https://studentprivacy.ed.gov/faq/when-does-school-official-exception-allow-school-or-lea-non-consensually-disclose-education  
5. 34 CFR § 99.30 (Cornell mirror) — https://www.law.cornell.edu/cfr/text/34/99.30  
6. ED equitable services / private school FERPA Q&A — https://www.ed.gov/media/document/title-ix-part-e-uniform-provisions-subpart-1-private-schools-equitable-services-eligible-private-school-students-teachers-and-other-educational-personnel-march  
7. FTC COPPA FAQs — https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions  
8. FTC COPPA & schools blog — https://www.ftc.gov/business-guidance/blog/2015/01/testing-testing-review-session-coppa-schools  
9. PPRA hub — https://studentprivacy.ed.gov/topic/protection-pupil-rights-amendment-ppra  
10. Texas Education Code Ch. 32 — https://statutes.capitol.texas.gov/Docs/ED/htm/ED.32.htm  
11. HB 2087 enrolled — https://capitol.texas.gov/tlodocs/85R/billtext/pdf/HB02087F.pdf  
12. SB 820 / TEC § 11.175 — https://capitol.texas.gov/tlodocs/86R/billtext/html/SB00820F.HTM  
13. TX OAG SCOPE Act — https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/securing-children-online-through-parental-empowerment  
14. A4L SDPC National DPA — https://privacy.a4l.org/national-dpa/  
15. TETL Texas Student Privacy Alliance — https://www.tetl.org/cpages/texas-student-data-privacy-alliance  
16. Local SoT: `docs/architecture.md`, `research/06-stack-ai-cost-ferpa.md`, `notes/company/avg-spec-security-ferpa.md`, `notes/research/2026-09-24-production-gtm-report.md`

---

## 7. Coverage & uncertainty

- Whether **Spring Baptist** receives ED funds that trigger FERPA — **unknown; ask the school**.  
- Exact live Supabase RLS coverage for every new surface (Ride, diary, messaging) — verify before claiming “fail-closed everywhere.”  
- SCOPE Act Article 2 applicability to Kelyra messaging — **counsel**.  
- Gemini / Supabase / Cloudflare / Resend / Sentry contractual terms must be re-read at signing time (terms change).  
- No ED document certifies any named 2026 AI vendor as automatically FERPA school-official.  
- This note is **not** a DPA and **not** a Privacy Policy.

### Claims dropped / not asserted

- “Kelyra is FERPA compliant.”  
- “Private schools never need privacy contracts.”  
- “HIPAA applies to gradebooks.”  
- “TEC § 11.175 binds private academies.”
