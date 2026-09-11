# KEYGRADE Phone Approve Option Packs (Designer)

**Date:** 2026-09-10
**Author:** grok-bot-consultant (ui-ux-designer hat)
**Card:** `t_91db8376` [KEYGRADE-IQG2] Restamp after CEO locks + phone Approve packs
**Objective:** 2–3 option packs for teacher phone per-item confirm + Approve on keyed captures. Extend Capture / inbox / proposal desk. No ZipGrade, no second gradebook.
**Status:** Designer packs complete. PM chose **Pack B**. Dual DESIGN STAMP APPROVED in intent/pm (same pack). Docs only — no app code.

---

## CEO Locks (binding law — quoted for all packs)

1. **Office + superintendent KEYGRADE OUT of v1.** No KEYGRADE confirm/Approve chrome for office or superintendent.
2. **Superintendent multiplicity matrix: N/A** (follows #1).
3. **Parent keyed score same as today (M11).** No new `/parent/grades` KEYGRADE product; post-Approve cell visibility only as today.
4. **Phone must Approve in v1.** Teacher can confirm per-item extract and tap Approve on the phone.

All packs honor these locks. Designer does not choose the product lock — PM does.

---

## Packs Overview

| Pack | Name | One-line |
|---|---|---|
| **A** | Minimal phone chrome (inbox action sheet) | Action sheet on keyed capture row → confirm → batch Approve |
| **B** | Contextual inline confirm (capture review) | Inline confirm in Capture review carousel + Approve on same screen |
| **C** | Dedicated Approve wall (proposal desk extension) | New phone Approve tab / wall with list + batch |

Each pack details: chrome location, per-item override, twins confirm, Unassigned handling, Approve wall, web-only surfaces.

**PM Choice (locked in `keygrade-pm.md`):** **Pack B — Contextual inline confirm (capture review).**

**Designer recommendation (non-binding):** Pack B — balances phone UX density, reuses capture chrome, satisfies CEO phone Approve with minimal new surface.

---

## Pack A: Minimal phone chrome (inbox action sheet)

- **Location in teacher chrome:** Capture review / Needs inbox. Action sheet on long-press or swipe on keyed capture row.
- **Per-item override:** Tap item → inline numeric/MC picker + "Confirm extract" toggle. Twins: auto-detect duplicate pages, "2x" badge, one-tap confirm both.
- **Unassigned handling:** Stays in Unassigned until filed; phone Approve available after file + confirm.
- **Approve wall:** Phone "Approve All" batch (after per-item confirm). Web retains full key authoring + multi-class publish.
- **What stays web-only:** Key authoring (AssignmentForm), office/super (CEO #1 OUT), parent drill-down (M11 unchanged).
- **Teacher chrome simplification:** Thin chrome; signed-in phone landscape OK; no signed-out splash; no office elements.

---

## Pack B: Contextual inline confirm (capture review) — **CHOSEN**

- **Location in teacher chrome:** Directly in **Capture review carousel** (post-shutter, `/capture` review). Swipe/tap expands item row for confirm. Same flow can finish with Approve without leaving phone.
- **Per-item override:** Contextual bottom sheet for MC/numeric + twins flag. One-tap **"Confirm & next"**.
- **Unassigned handling:** Unassigned remains first-class (matcher never INSERT). File from Unassigned/inbox; confirm then Approve on phone. Auto-move to inbox-ready on confirm; **Approve on phone publishes** `approved_score`.
- **Approve wall:** Integrated **"Approve this capture"** on review screen (single-capture). Web remains available for bulk / multi-class review (not required for v1 phone path).
- **What stays web-only:** Key authoring (AssignmentForm), office/super KEYGRADE (OUT), parent KEYGRADE product (M11 only), complex district overrides.
- **Teacher chrome simplification:** Minimal new UI; reuses existing capture chrome. Landscape OK. Teach seat only — Parent seat cannot Approve.
- **Lifecycle touch:** plan key (web) → capture (phone) → extract → **confirm (phone Pack B)** → **Approve (phone Pack B)** → published. Web Approve still valid alternate, not exclusive.

---

## Pack C: Dedicated Approve wall (proposal desk extension)

- **Location in teacher chrome:** New **"Approve"** tab / wall extending proposal desk (phone tab bar).
- **Per-item override:** List view with bulk select + per-item edit. Twins grouped.
- **Unassigned handling:** Unassigned visible in wall; confirm moves to "Ready to Approve".
- **Approve wall:** Full phone wall with search/filter by class/date. Batch Approve.
- **What stays web-only:** Key authoring, office/super (OUT), parent (M11), complex overrides.
- **Teacher chrome simplification:** Dedicated but simplified; no office elements. Heavier new surface than B.

---

## Explicit non-goals (all packs)

- ZipGrade / second gradebook
- Office or superintendent KEYGRADE confirm/Approve chrome
- Parent score entry or new parent KEYGRADE gradebook
- Matcher student INSERT
- Ask `grade_photo` / Ask Approve
- Auto-publish without teacher Approve
- Student camera as primary KEYGRADE path (v1)

---

## Handoff

- PM: choose one pack by name → `keygrade-pm.md` (done: **Pack B**).
- QAS: restamp `keygrade-intent.md` + dual DESIGN STAMP + DITL IMPACT (done on same card).
- CoS: do **not** unblock `t_15ae546e`; do **not** staff Engineering from this card.

*End designer packs — t_91db8376.*
