# AI Credits / Billing Research (AICRED-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Cards:** `t_7b962b91`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)  
**Legal / tax posture:** Product + billing architecture research. **Not legal advice. Not tax advice.** Confirm Apple IAP / anti-steering for any *consumer* in-app parent purchase with counsel; confirm Texas SaaS tax with a CPA.

**Related (do not rebuild):**  
- `notes/research/2026-09-24-production-gtm-report.md` — Ride $1,800 / Classroom $3,500 / Bundle $4,500; soft AI cap + overage sketch  
- `research/06-stack-ai-cost-ferpa.md` — Gemini Flash-Lite cost envelope; paid-tier no-training  
- `notes/company/ferpa-research.md` / `ferpa-compliance-plan.md` — paid AI disclosure + subprocessors  
- Plan SoT: `notes/company/ai-credits-billing-plan.md`  
- Dated digest: `notes/research/2026-09-24-ai-credits-billing-report.md`

**Constraints for this card:** Research + recommendation only. No app code, no SQL apply, no Hermes AI staffing, no force-push.

---

## Executive summary

Kelyra’s buyer for AI cost is the **school** (office / head of school), not the individual teacher shopping App Store IAP. AI load is concentrated in **teacher/office** workloads (vision grade, Ask drafts, Author-adjacent generation). Parents/students are light or zero AI today.

**Verdict — recommend hybrid (not pure tiers, not pure flat+throttle):**

1. **Sell a flat annual school site license** (Ride / Classroom / Bundle from GTM) via **Stripe Invoicing + ACH** outside the App Store.  
2. **Include a pooled school AI budget** expressed as **Kelyra credits** (or “AI jobs”) — soft cap with admin alerts.  
3. **Meter usage at the Edge** (tokens + job type + school_id + user_id) for cost control and attribution.  
4. **Bill overage** as Stripe **metered** line items (or prepaid **billing credit grants** / top-up packs) — not a surprise “unlimited AI” that burns Gemini.  
5. **Throttle / degrade gracefully** only after soft-cap warnings; hard-stop only for unpaid / abuse / trial exhaustion.

**Why not pure AI SKU tiers alone?** Schools buy predictability (PO / annual invoice). MagicSchool-style Free/Plus/Enterprise and Khanmigo-style per-student district quotes are *seat or school* packages with fair-use inside — not raw token pass-through to the academic buyer.  
**Why not flat fee + throttle only?** Protects Gemini spend but leaves money on the table when a power school exceeds the included envelope, and hides the true cost of vision homework volume.  
**Hybrid** matches GTM’s already-stated “included soft cap + overage,” Stripe’s meters/credits primitives, and Gemini’s prepaid/postpay reality on the vendor side.

---

## 1. Problem framing for Kelyra

| Actor | Buys? | Consumes AI? | Billing implication |
|---|---|---|---|
| School office / head | **Yes** (site license) | Light (ops Ask) | Invoice/ACH annual; AI budget owner |
| Teachers | Rarely (individual Plus elsewhere) | **Heavy** (vision, Ask, plans) | Must not require teacher card for core AI |
| Parents | Consumer later | Light | Do **not** put school AI overage on parent IAP |
| Students | No | Off / gated | No student AI default spend |

**Cost drivers (from GTM + stack research):** vision jobs (homework photos), Ask multimodal, TTS/author packs secondary. GTM sketch: ~800–4,000 vision jobs/mo scenarios; included soft cap e.g. **5k vision jobs/yr** with **$10 / 1k jobs** overage — refine units to **credits** so text Ask and vision share one pool with different weights.

**Vendor side:** Keep **paid Gemini** (`gemini-3.5-flash-lite` primary per live Edge preference) so content is not used to improve Google products; enable spend caps / auto-reload on the Google billing account. ([Gemini billing](https://ai.google.dev/gemini-api/docs/billing); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). Accessed 2026-09-24 CT.

---

## 2. Industry patterns (edtech + SaaS AI)

### 2.1 Pattern catalog

| Pattern | How it works | School fit | Kelyra note |
|---|---|---|---|
| **A. Per-seat AI add-on** | Teacher pays $X/mo for unlimited gens | Weak for whole-school Ride wedge | MagicSchool Plus ~$8.33/user/mo annual ([magicschool.ai/pricing](https://www.magicschool.ai/pricing)) |
| **B. School / district site license** | Flat or per-student quote; AI “included” | **Strong** — PO friendly | MagicSchool Enterprise custom; Khanmigo district ~$10–$15/student/yr cited in secondary sources |
| **C. Soft cap + overage** | Included usage; bill excess | Strong if overage is rare and clear | Matches GTM sketch |
| **D. Prepaid credit packs** | Buy N credits; burn down | Strong for top-ups mid-year | Stripe Credit Grants / Metronome |
| **E. Pure usage-based (pass-through)** | Token $ → customer $ | Weak for K–12 budget cycle | Avoid as primary SKU |
| **F. Flat SaaS + fair-use throttle** | One fee; rate-limit heavy users | Strong for trial / early | Alone insufficient for power schools |
| **G. Hybrid (B+C+D)** | Site license + pooled budget + overage/top-up | **Best for Kelyra B2B** | Recommended |

### 2.2 Competitor signals (public pages; not quotes)

| Vendor | Public model | AI packaging | Source |
|---|---|---|---|
| **MagicSchool** | Free / Plus ($12.99/mo or $99.96/yr) / Enterprise (custom) | Plus markets “unlimited generations”; Enterprise = oversight + DPA | [magicschool.ai/pricing](https://www.magicschool.ai/pricing) |
| **Khanmigo** | Consumer ~$4/mo; district per-student | District AI tutoring add-on; token allocations often contractual | Secondary: EdisonOS / NationGraph 2026 summaries; verify with Khan before quoting |
| **ChatGPT for Teachers** | Free through Jun 2028 (verified US K–12) | Not a school site-license model; adjacent free competitor | OpenAI teacher terms |
| **Microsoft Copilot Edu** | Copilot add-on ~$30/user/mo on A3/A5 | Seat-based productivity AI — **not** classroom vision grade | Education licensing summaries |
| **PikMyKid** (Ride analog) | School license / quote | No AI credits; proves school-site PO works for dismissal | GTM competitor table |

**Takeaway:** Successful school AI tools sell **institution packages** with **usage governance**, not raw tokens. “Unlimited” on Plus is a marketing fair-use claim; Enterprise still needs dashboards and controls.

---

## 3. Model comparison for Kelyra school B2B

### 3.1 Option 1 — AI feature tiers only

**Shape:** Starter / Pro / Unlimited AI SKUs (separate from Ride/Classroom).

| Pros | Cons |
|---|---|
| Clear upsell ladder | Confuses GTM modular story (Ride vs Classroom vs Bundle) |
| Familiar SaaS | Schools dislike three AI tiers *plus* module SKUs |
| | “Unlimited” is a Gemini liability |

**Verdict:** Reject as primary. Keep **module SKUs** (Ride / Classroom / Bundle); AI is a **budget inside** Classroom/Bundle, not a fourth product line at launch.

### 3.2 Option 2 — Flat monthly + throttle

**Shape:** Bundle fee includes “AI”; hard RPM / daily caps; no overage invoice.

| Pros | Cons |
|---|---|
| Simple invoice | Blocks teachers mid-dismissal week when vision volume spikes |
| Protects margin if caps tight | No path to monetize heavy AI schools |
| Good for Spring Baptist trial | Feels punitive without admin visibility |

**Verdict:** Acceptable for **trial** and as the **enforcement layer** after soft cap — not the paid-product monologue.

### 3.3 Option 3 — Hybrid (recommended)

**Shape:**

```
Annual school license (Stripe invoice/ACH)
  └─ Includes pooled AI credits for the school
       ├─ Soft alerts at 50% / 80% / 100%
       ├─ Soft mode: slower / Flash-Lite only / queue non-urgent Ask
       └─ Overage: metered invoice OR prepaid top-up pack
```

| Pros | Cons |
|---|---|
| Matches school PO psychology | Needs metering + admin UX |
| Protects Gemini spend | Overage messaging must be plain English |
| Aligns with GTM numbers | Stripe meters vs Metronome decision |
| Upgrades = module or credit pack, not “AI tier rename” | Credit weighting needs calibration |

**Verdict: pick hybrid.**

### 3.4 Recommendation bullets (CEO-ready)

1. **Hybrid:** flat school license + pooled credits + soft throttle + overage/top-up.  
2. **Buyer = school**; teachers never need a personal card for core AI.  
3. **Do not** sell raw Gemini tokens to schools.  
4. **Do not** App Store IAP the school license; Stripe invoice/ACH on web.  
5. **Express limits in Kelyra credits**, not “1M tokens,” with published job weights.  
6. **Trial (Spring Baptist):** generous included pool + hard monthly Gemini spend alert to Chuck; no student-facing overage.  
7. **Upgrade path:** Bundle upgrade (Ride↔Classroom) and **AI credit top-up** — not a third AI SKU ladder at launch.

---

## 4. Metering design (product + Edge)

### 4.1 What to meter

| Dimension | Why |
|---|---|
| `school_id` | Pooled budget owner |
| `user_id` + role hat | Abuse / coaching (“Ms. X used 40%”) |
| `job_type` | vision_grade, ask, lesson_draft, tts, … |
| `model` | Flash-Lite vs Pro spillover |
| `input_tokens` / `output_tokens` / `thinking_tokens` | True Gemini cost |
| `credit_units` | Product-facing burn (weighted) |
| `request_id` / idempotency key | Dedup retries |
| `provider_cost_usd_est` | Internal margin dashboard |

### 4.2 Credit weighting (illustrative — calibrate after 2 weeks of trial logs)

| Job | Suggested credits | Rationale |
|---|---|---|
| Ask text (short) | 1 | Cheap |
| Ask + image | 5 | Multimodal |
| Vision grade page | 8–12 | Dominant cost |
| Lesson plan AI draft | 10 | Longer context |
| TTS 30s | 3 | Audio out |

Publish weights in admin help; change only with versioned `credit_schedule_id`.

### 4.3 Soft vs hard caps

| Level | Behavior |
|---|---|
| **Soft 50/80%** | Email office + in-app banner; continue full service |
| **Soft 100%** | Banner + optional degrade (Flash-Lite only, defer batch Author) |
| **Hard** | Block **new** AI jobs when (a) unpaid overage past grace, (b) abuse tripwire, (c) trial pool exhausted with no top-up — never mid-flight HTTP without clear UX |
| **Vendor hard** | Google Prepay $0 → HTTP 402; Kelyra must fail closed with “AI temporarily unavailable” not a blank error |

### 4.4 Abuse controls

- Per-user daily credit ceiling inside school pool  
- Burst RPM per school  
- Reject prompts with roster dumps when policy says minimize PII (FERPA soft posture)  
- Alert on single-user >X% of school pool in 24h  

---

## 5. Stripe billing architecture

### 5.1 Products / Prices (proposal)

| Stripe Product | Price type | Maps to |
|---|---|---|
| Kelyra Ride | Licensed, annual (or monthly) | Module |
| Kelyra Classroom | Licensed, annual | Module |
| Kelyra Bundle | Licensed, annual | Module |
| AI Overage (credits) | **Metered** recurring | Usage beyond included |
| AI Top-up Pack | One-time / credit grant | Prepaid mid-year |

Prefer **`collection_method=send_invoice`** + ACH / bank transfer for schools ([Stripe ACH invoices](https://docs.stripe.com/invoicing/ach-direct-debit); [bank transfer](https://docs.stripe.com/invoicing/bank-transfer)). Cards optional for small monthly. Accessed 2026-09-24 CT.

### 5.2 Meters vs Metronome vs first-party ledger

Stripe now positions **Metronome** as primary for new usage-based + prepaid credits + real-time visibility; **Billing Meters** remain supported but reconcile mainly at invoice time ([usage-based overview](https://docs.stripe.com/billing/subscriptions/usage-based); [billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)).

**Kelyra recommendation:**

1. **P0:** First-party **`ai_usage_events` + `ai_credit_ledger`** in Supabase (source of truth for UX + FERPA-friendly retention).  
2. **P0:** Stripe **licensed** subscription for modules.  
3. **P1:** Report aggregated overage to Stripe **Billing Meter** *or* issue **Credit Grants** when school pre-buys packs.  
4. **P2:** Evaluate Metronome if multi-school volume + enterprise commits appear.

Do **not** wait on Metronome to ship trial metering.

### 5.3 Upgrades / downgrades / proration

- Module upgrade (Classroom → Bundle): Stripe subscription update with `proration_behavior=always_invoice` or school-year **no mid-year prorate** (contract choice) ([prorations](https://docs.stripe.com/billing/subscriptions/prorations)).  
- Credit top-up: immediate PaymentIntent / invoice; grant credits with `expires_at` (e.g. end of school year + 30d).  
- Downgrade: end of term only for annual school licenses (avoid mid-year Ride removal chaos).

### 5.4 Parent / App Store caveat

School site licenses sold on web via Stripe should stay **outside** IAP. Any future **parent consumer** AI pack inside iOS/Android must revisit Apple/Google rules with counsel (GTM already flags this).

### 5.5 Tax note (TX)

Flag for CPA: Texas treatment of SaaS / digital services for private school buyers. Do not assert taxability in product copy until advised.

---

## 6. Gemini / vendor cost control (Kelyra’s own bill)

| Control | Action |
|---|---|
| Paid tier | Link billing; avoid free-tier training terms for student work |
| Model | Default Flash-Lite / Flash-Lite-class; escalate only with feature flag |
| Spend caps | AI Studio project spend cap + billing-account tier caps ([billing](https://ai.google.dev/gemini-api/docs/billing)) |
| Prepay (from ~2026-03-23) | Auto-reload + monthly auto-charge limit so Edge does not 402 mid-day |
| Batch / Flex | Use for non-interactive Author jobs when latency allows (≈50% list) |
| Alerts | Slack/email Chuck at $50 / $150 / $400 Gemini month (trial) |

Flash-Lite list (paid, 2026-09-24): **$0.30 / 1M input**, **$2.50 / 1M output** ([pricing](https://ai.google.dev/gemini-api/docs/pricing)).

---

## 7. Product UX

### 7.1 Who sees what

| Role | UX |
|---|---|
| **Office admin** | AI Budget console: pool remaining, by-teacher chart, top-up CTA, invoice history |
| **Teacher** | Quiet meter (“AI OK”); at 80% school-wide: “School AI budget is getting low — office has been notified”; at hard stop: clear block + link to office |
| **Parent / student** | No AI budget chrome |

### 7.2 Upgrade flows

1. **Module:** Sales-led or self-serve Stripe Customer Portal for eligible card customers; schools on `send_invoice` → CoS/Chuck issues new invoice.  
2. **Credits:** “Buy 5,000 credits” button → Checkout or invoice → ledger grant.  
3. **Never:** force teacher to upgrade personal Plus to grade homework.

### 7.3 Near-limit copy principles

- Blame the **budget**, not the teacher.  
- Offer **office contact** and **estimate days remaining**.  
- Do not show raw token counts to teachers.

---

## 8. Monitoring & ops

| Signal | Owner |
|---|---|
| Edge error rate + p95 AI latency | Eng / CoS |
| Credits remaining % by school | Finance digest |
| Gemini $ vs credited $ (margin) | Chuck weekly in trial |
| Top users by credits | Office coaching |
| 402 / spend-cap hits | Pager → Chuck |

Wire into GTM’s proposed weekly trial metrics digest (Ride + AI $).

---

## 9. Open questions for Chuck

1. Prefer **overage auto-invoice** vs **prepaid top-up only** for Year 1?  
2. Included pool: stick with GTM **5k vision-jobs/yr** or switch to **credit units** from day one?  
3. Annual contracts: **prorate mid-year Bundle upgrades** or bill next term?  
4. Should Classroom-only schools get a **smaller** AI pool than Bundle?  
5. Allow **teacher personal top-up** later, or always school-pooled?  
6. CPA: TX SaaS tax on school invoices?  
7. Counsel: confirm web Stripe school licenses remain outside IAP under current Apple US rules.

---

## 10. Sources

| ID | Source | URL | Accessed |
|---|---|---|---|
| S1 | Stripe usage-based billing overview | https://docs.stripe.com/billing/subscriptions/usage-based | 2026-09-24 CT |
| S2 | Stripe billing credits | https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits | 2026-09-24 CT |
| S3 | Stripe prorations | https://docs.stripe.com/billing/subscriptions/prorations | 2026-09-24 CT |
| S4 | Stripe ACH / bank transfer invoicing | https://docs.stripe.com/invoicing/ach-direct-debit · https://docs.stripe.com/invoicing/bank-transfer | 2026-09-24 CT |
| S5 | Gemini API billing | https://ai.google.dev/gemini-api/docs/billing | 2026-09-24 CT |
| S6 | Gemini API pricing | https://ai.google.dev/gemini-api/docs/pricing | 2026-09-24 CT |
| S7 | MagicSchool pricing | https://www.magicschool.ai/pricing | 2026-09-24 CT |
| S8 | Kelyra GTM report (Ride/Bundle/AI soft cap) | `notes/research/2026-09-24-production-gtm-report.md` | 2026-09-24 CT |
| S9 | Stack AI cost research | `research/06-stack-ai-cost-ferpa.md` | 2026-09-24 CT |
| S10 | NationGraph / EdisonOS edtech AI pricing summaries (secondary) | nationgraph.com · edisonos.com | 2026-09-24 CT |
