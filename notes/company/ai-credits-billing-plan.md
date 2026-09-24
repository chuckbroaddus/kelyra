# AI Credits / Billing Plan (AICRED-P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1  
**Research:** `notes/company/ai-credits-billing-research.md`  
**Digest:** `notes/research/2026-09-24-ai-credits-billing-report.md`  
**Cards:** `t_7b962b91`  
**Stack:** Expo + Supabase Edge + Stripe (web). No app/SQL from this card.

**Product law:** School buys. Teachers consume. AI is a **pooled school budget** inside Classroom/Bundle — not a fourth SKU ladder at launch.

---

## 0. Decision lock (recommended)

| Decision | Lock |
|---|---|
| Commercial model | **Hybrid:** flat annual school license + pooled AI credits + soft throttle + overage/top-up |
| Module prices (from GTM) | Ride $1,800/yr · Classroom $3,500/yr · Bundle $4,500/yr (≤250 students); refine AI piece only |
| Included AI | Soft pool (credits); start from GTM **~5k vision-job-equivalents/yr** mapped into credit schedule |
| Overage | Stripe metered invoice **or** prepaid top-up packs (Chuck picks Year-1 default in Q1 below) |
| Billing rail | Stripe Invoicing + ACH/bank transfer; sell **outside** App Store |
| Meter SoT | First-party Supabase ledger; Stripe mirrors for cash |
| Trial | Spring Baptist: free license + generous pool; Chuck gets Gemini $ alerts |

---

## 1. Explicit non-goals

| Non-goal | Why |
|---|---|
| App code / SQL apply on this card | Research epic |
| Raw token pass-through pricing to schools | Budget hostility |
| Teacher-paid IAP for core grading AI | Breaks school wedge |
| “Unlimited AI” marketing | Gemini liability |
| Metronome required for trial | Overkill; evaluate P2 |
| Parent consumer AI packs in v1 | IAP / counsel later |
| Rewriting full GTM pricing report | Refine AI only |

---

## 2. Needed vs Desired

### Needed (P0)

| ID | Capability | Rationale |
|---|---|---|
| N1 | `ai_usage_events` append-only log from Edge (tokens, job_type, school_id, user_id, model, request_id) | Metering SoT |
| N2 | `ai_credit_ledger` + school pool balance (included grant per term) | Product-facing budget |
| N3 | Credit schedule v1 (job weights) | Hide tokens from teachers |
| N4 | Soft alerts 50/80/100% → office email + admin banner | Avoid surprise hard-stop |
| N5 | Soft degrade at 100% (optional Flash-Lite-only / queue) | Continuity |
| N6 | Hard stop rules (unpaid / abuse / trial empty) with clear UX | Protect Gemini + margin |
| N7 | Stripe Products: Ride / Classroom / Bundle licensed annual | Cash for modules |
| N8 | Stripe invoice + ACH path for schools | PO / AP friendly |
| N9 | Office **AI Budget** console (read-only first) | Who spends |
| N10 | Chuck Gemini spend alerts + AI Studio project cap | Vendor 402 prevention |
| N11 | Paid Gemini only for student-adjacent workloads | FERPA soft / no free-tier training |

### Desired (P1–P2)

| ID | Capability | Phase |
|---|---|---|
| D1 | Overage meter → Stripe Billing Meter events | P1 |
| D2 | Prepaid top-up Checkout + Credit Grant / ledger mint | P1 |
| D3 | Teacher-level daily sub-caps configurable by office | P1 |
| D4 | Margin dashboard (Gemini $ vs credited $) | P1 |
| D5 | Customer Portal for card-paying small schools | P1 |
| D6 | Metronome evaluation | P2 |
| D7 | Parent consumer packs | P2+ counsel |
| D8 | Per-student price floor auto-calc on roster size | P2 |

---

## 3. Phased roadmap

### Phase A — Trial (Spring Baptist) — weeks 0–4

1. Edge: log usage events (even if UI hidden).  
2. Manual included grant in ledger (ops SQL or admin script — **later card**).  
3. Soft alerts to Chuck + office email.  
4. Gemini Prepay/auto-reload + project spend cap.  
5. No overage charging; if pool burns, Chuck decides top-up gratis or soft degrade.

### Phase B — Paid school #1 — weeks 4–10

1. Stripe Customers + annual Bundle/Ride invoice + ACH.  
2. Included credits minted on invoice paid webhook.  
3. Office AI Budget console (read).  
4. Top-up pack SKU (prepaid) **or** monthly overage invoice — per Chuck Q1.  
5. Hard-stop UX copy.

### Phase C — Multi-school — after 3 paid

1. Billing Meter or Metronome decision.  
2. Self-serve top-up.  
3. Finance weekly digest automation.  
4. Credit schedule v2 from real histograms.

---

## 4. Work breakdown (plan only — no impl)

### 4.1 Schema (future migration card)

- `ai_usage_events` (id, school_id, user_id, job_type, model, in_tok, out_tok, credits, provider_req_id, created_at, meta jsonb)  
- `ai_credit_accounts` (school_id, period_start, period_end, included_credits, bonus_credits)  
- `ai_credit_ledger` (id, school_id, delta, reason, stripe_invoice_id null, usage_event_id null, created_at)  
- `ai_credit_schedules` (version, weights jsonb, effective_at)  
- RLS: office read school; service role write from Edge; teachers read own usage summary only if product wants

### 4.2 Edge metering

- Single helper after every Gemini/xAI call: record tokens + compute credits.  
- Idempotent on `provider_req_id`.  
- Fail **open for logging** (don’t drop grades if insert fails — queue retry); fail **closed for hard-cap** when account says block.

### 4.3 Stripe webhooks (future)

| Event | Action |
|---|---|
| `invoice.paid` (licensed) | Mint included credits for period |
| `invoice.paid` (top-up) | Mint pack credits |
| `customer.subscription.updated` | Module change; optional proration policy |
| `invoice.payment_failed` | Notify Chuck; grace then hard-stop AI |

### 4.4 Admin UI

- Route under office settings: **AI budget**  
- Charts: remaining, burn rate, top teachers  
- Buttons: Request top-up (mailto/Chuck) → later Checkout  

### 4.5 Teacher UX

- No chrome until 80%.  
- 80–99%: dismissible banner.  
- Hard-stop: modal “School AI budget paused — contact office.”

---

## 5. Upgrade matrix

| Change | Mechanism | Proration default (proposal) |
|---|---|---|
| Ride → Bundle mid-year | New invoice / subscription update | **Always invoice** prorated remainder **or** bill full Bundle next anniversary — Chuck chooses |
| Bundle → add credits | Top-up invoice | Immediate |
| Downgrade Bundle → Ride | End of term only | No mid-year Ride removal |
| Seat growth >250 | Roster true-up invoice (+$6/student Ride per GTM) | Quarterly true-up |

---

## 6. Monitoring checklist

- [ ] Gemini project spend cap set  
- [ ] Auto-reload + monthly auto-charge limit  
- [ ] Edge usage event volume dashboard  
- [ ] Alert: school >80% credits  
- [ ] Alert: single user >25% of school pool / day  
- [ ] Alert: Gemini $ > trial thresholds  
- [ ] Weekly digest line: AI $ + credits remaining  

---

## 7. Acceptance for future impl cards (not this card)

1. Every AI Edge success writes one usage event.  
2. Office can see pool remaining without seeing other schools.  
3. Paid invoice mints included credits.  
4. Soft banner fires at configured thresholds.  
5. Hard-stop blocks new AI with explicit error code `ai_budget_exhausted`.  
6. No App Store IAP for school license.  

---

## 8. Chuck decisions needed before impl

1. Year-1 overage: **auto metered invoice** vs **prepaid packs only**.  
2. Mid-year module proration: **yes** vs **next term**.  
3. Included pool size for Classroom vs Bundle (same or Bundle richer?).  
4. Teacher sub-caps on/off for trial.
