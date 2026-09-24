# AI Credits / Billing — Research Digest

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/ai-credits-billing-research.md` · `notes/company/ai-credits-billing-plan.md`  
**Card:** `t_7b962b91`  
**Access date for all URLs:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above. Research + recommendation only — **no app implementation**. No Hermes AI staffing.

**Not legal/tax advice.**

---

## Recommendation (pick)

### Best model for school B2B: **Hybrid**

| Model | Verdict |
|---|---|
| **AI feature tiers alone** (Starter/Pro/Unlimited) | **No** — confuses Ride/Classroom/Bundle; “Unlimited” burns Gemini |
| **Flat fee + throttle only** | **Trial OK / enforcement layer** — too punitive alone; leaves overage revenue on table |
| **Hybrid** = flat school license + pooled credits + soft throttle + overage/top-up | **Yes — choose this** |

### Recommendation bullets

- Sell **school site licenses** (GTM: Ride **$1,800/yr**, Classroom **$3,500/yr**, Bundle **$4,500/yr**) via **Stripe invoice + ACH**, outside App Store.  
- Include a **pooled school AI credit budget**; meter at **Edge** (tokens → weighted credits).  
- **Soft alerts** at 50/80/100%; soft degrade before hard-stop; hard-stop only for unpaid/abuse/empty trial.  
- Monetize excess with **prepaid top-ups** and/or **Stripe metered overage** — not raw token pass-through.  
- **Buyer = school**; teachers never need a personal card to grade homework.  
- Keep **paid Gemini** (Flash-Lite default) with project spend caps + Prepay auto-reload so vendor 402 does not strand classrooms.  
- Do **not** ship Metronome for trial; first-party ledger first; Stripe mirrors cash.

---

## Why hybrid (one page)

Edtech peers package AI as **institution or seat products with fair-use**, not token invoices:

- **MagicSchool:** Free / Plus (~$8.33/user/mo annual) / Enterprise custom — Plus markets unlimited gens; Enterprise adds oversight ([magicschool.ai/pricing](https://www.magicschool.ai/pricing)).  
- **Khanmigo / district AI:** per-student annual add-ons in secondary 2026 summaries — still school-buyer.  
- **Copilot Edu:** expensive per-seat productivity AI — wrong analogy for vision gradebook.

Stripe supports the hybrid cash path: licensed subscriptions + **Billing Meters** / **Credit Grants**, with Metronome recommended for heavy prepaid/real-time later ([usage-based](https://docs.stripe.com/billing/subscriptions/usage-based); [credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits); [prorations](https://docs.stripe.com/billing/subscriptions/prorations); [ACH invoices](https://docs.stripe.com/invoicing/ach-direct-debit)).

Gemini side: paid tiers, Prepay/Postpay (Prepay emphasis from ~2026-03-23), spend caps, Flash-Lite **$0.30 / $2.50 per 1M in/out** ([billing](https://ai.google.dev/gemini-api/docs/billing); [pricing](https://ai.google.dev/gemini-api/docs/pricing)).

GTM already sketched soft AI caps + overage; this card **locks hybrid** and specifies metering/UX/Stripe.

---

## Coverage map

| Topic | Research § | Plan § |
|---|---|---|
| Tiers vs flat+throttle vs hybrid | Research §3 | Plan §0 |
| Metering | Research §4 | Plan §4.1–4.2 |
| Stripe billing | Research §5 | Plan §4.3, §5 |
| Upgrades | Research §5.3 | Plan §5 |
| Monitoring | Research §6, §8 | Plan §6 |
| UX | Research §7 | Plan §4.4–4.5 |
| Work breakdown | — | Plan §3–4 |
| Open questions | Research §9 | Plan §8 |

---

## Phase snapshot

| Phase | Ship |
|---|---|
| **A Trial** | Edge usage log, manual grant, Chuck Gemini alerts, soft banners |
| **B Paid #1** | Stripe annual modules + ACH, mint credits on `invoice.paid`, office console, top-up or overage |
| **C Multi-school** | Meter/Metronome decision, self-serve top-up, margin digest |

---

## Open questions for Chuck

1. Year-1: **auto overage invoice** vs **prepaid packs only**?  
2. Credits from day one vs temporary “vision jobs” unit?  
3. Mid-year Bundle upgrade: **prorate now** vs **next term**?  
4. Classroom vs Bundle: same AI pool or Bundle richer?  
5. Teacher personal top-ups ever, or always school-pooled?  
6. CPA: TX SaaS tax? Counsel: IAP still clear for web school licenses?

---

## Key citations

| Topic | URL |
|---|---|
| Stripe usage-based / Metronome | https://docs.stripe.com/billing/subscriptions/usage-based |
| Stripe billing credits | https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits |
| Stripe prorations | https://docs.stripe.com/billing/subscriptions/prorations |
| Stripe ACH invoicing | https://docs.stripe.com/invoicing/ach-direct-debit |
| Gemini billing | https://ai.google.dev/gemini-api/docs/billing |
| Gemini pricing | https://ai.google.dev/gemini-api/docs/pricing |
| MagicSchool pricing | https://www.magicschool.ai/pricing |
| Kelyra GTM (modules + soft AI cap) | `notes/research/2026-09-24-production-gtm-report.md` |

---

## Paths written

- `notes/company/ai-credits-billing-research.md`  
- `notes/company/ai-credits-billing-plan.md`  
- `notes/research/2026-09-24-ai-credits-billing-report.md`
