# KEYGRADE IQG PM Stories + Quality Goals

**Date:** 2026-09-10  
**Author:** grok-bot-consultant (Product Manager hat)  
**Card:** `t_91db8376` [KEYGRADE-IQG2] Restamp after CEO locks + phone Approve packs  
**Prior stamp card:** `t_5fa12875` (REJECTED — chrome gaps)  
**Parent epic:** `t_15ae546e` [KEYGRADE] — sticky; **do not unblock**; Eng dark  
**Intent SoT:** `notes/company/keygrade-intent.md` (same pack)  
**Designer packs:** `notes/company/keygrade-phone-approve-options.md`  
**Status:** PM lock. **Chosen pack: Pack B (contextual inline confirm).** Dual DESIGN STAMP **APPROVED** 2026-09-10. Docs/mockups only — **no app code, no Eng staff.**

---

## CEO LOCKS (binding law)

1. **Office + superintendent KEYGRADE OUT of v1.** No KEYGRADE confirm/Approve chrome for office or superintendent. Explicit non-goals.
2. **Superintendent multiplicity matrix: N/A** (follows #1).
3. **Parent keyed score same as today (M11).** No new `/parent/grades` KEYGRADE product.
4. **Phone must Approve in v1.** Teacher can confirm per-item extract and tap Approve on the phone (Pack B).

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KEYGRADE photo + answer-key grading (v1 MC+numeric; phone Approve Pack B)
Quality goals: CEO locks binding (office/super OUT; parent M11; phone Approve v1); PM chooses Pack B; dual stamp; DITL IMPACT on T-01; no invented chrome
PM: APPROVED  date: 2026-09-10  profile-session: grok-bot
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: grok-bot
Intent gaps remaining: none
```

**PM stamp meaning:** CEO four locks written as law. Chosen pack: **Pack B (contextual inline confirm)**. Phone Approve in v1 per CEO #4. Office/super KEYGRADE explicit non-goals. Parent M11 unchanged. Prior REJECT gaps closed by locks + named pack. **APPROVED.**

---

## 1. Chosen product + pack

**A1 pipeline** — Capture (phone) → confirm → Approve. Extend existing key path (`assignments.key_*`, `analyze-answer-key`, `match-key`, `evaluate-homework` / extract + `score-key`).

**Phone UX pack (locked):** **Pack B — Contextual inline confirm (capture review)** from `keygrade-phone-approve-options.md`.

- Confirm + Approve live in Capture review carousel on phone.
- Web Approve remains a valid alternate; not exclusive.
- Key authoring stays web (AssignmentForm).

**Not chosen:** Pack A, Pack C, ZipGrade-class product, laptop OpenCV CLI, Document AI/Textract, Ask `grade_photo`, auto-publish.

---

## 2. Stories per hat (CEO locks applied)

| Hat | Story | Acceptance seed | Stampable? |
|---|---|---|---|
| **Teacher** | Plan key (web) → capture stack (phone) → Pack B confirm extract → **Approve on phone** publishes cell; web Approve OK alternate | AssignmentForm key SoT; `/capture` review Pack B; Unassigned; gradebook/student page web Approve; no matcher INSERT | **Yes** |
| **Student** | View own post-Approve keyed cell only | Existing Grades book; no extract/draft | **Yes** (reuse live Grades) |
| **Parent** | View child post-Approve keyed score **same as today (M11)** | Invite-link / Home progress as today; **no** new parent KEYGRADE gradebook | **Yes** — CEO lock #3 = explicit same-as-today |
| **Office** | **OUT of KEYGRADE v1** | No KEYGRADE confirm/Approve chrome | **Yes** — CEO lock #1 non-goal |
| **Superintendent** | **OUT of KEYGRADE v1**; multiplicity N/A | No district KEYGRADE chrome | **Yes** — CEO locks #1–#2 |
| **Dual-hat T+P** | Teach seat: Pack B confirm+Approve on own classes. Parent seat: published only (M11); never Approve | DITL-DH-01 seat switch | **Yes** |

---

## 3. Acceptance criteria

Must hold for Eng send after this APPROVED stamp:

1. Nothing is a grade until teacher **Approve**.  
2. Matcher never inserts a student; Unassigned first-class.  
3. Teachers do not create classes (Ask/office rules unchanged).  
4. Award = `score-key` scripts; Explain/Help never substitute totals (GAUTH L3).  
5. **Phone must Approve in v1 (Pack B):** teacher confirms per-item extract and taps Approve on phone Capture review. Web Approve remains valid alternate.  
6. Lists thumbs only; originals at grade-time on teacher grade surfaces.  
7. FERPA walls: no family SELECT of extract / `draft_score` / key JSON.  
8. v1 item types: MC + numeric only; short/show-work = `needsTeacher`.  
9. Every **in-scope** hat has evidence-backed chrome entry (no invent). Office/super = explicit OUT (not invent). Parent = M11 same-as-today.  
10. Lifecycle: plan key → capture → extract → **confirm (phone Pack B)** → **Approve (phone Pack B)** → published; unassign / override / cancel draft pre-Approve.  
11. Multiplicity: twins, two classes, multi-page, two keys, two devices. Superintendent matrix **N/A**.  
12. Teach seat only may Approve; Parent seat cannot Approve keyed drafts.

---

## 4. Quality goals

- Dual stamp required before Eng / bot-build / qa-loop.  
- No fake APPROVED — this restamp closes prior REJECT with CEO locks + named Pack B.  
- Q1 (`photo-key-grading-acceptance.md`) remains pre-IQG acceptance plan — not this stamp.  
- DITL IMPACT owned in intent file; CoS files `DITL-UPDATE:` only when verdict ≠ NONE (this card: **do not file** — CoS owns filing off intent verdict).  
- **Do not unblock** parent epic `t_15ae546e`. **Do not staff Engineering** from this card.

---

## 5. v1 cut vs non-goals

**In v1:** keyed MC+numeric; teacher Capture → Pack B confirm → **phone Approve**; web Approve alternate; scripts award; thumbs/originals split; Unassigned; twin confirm.

**Out of v1:** office/superintendent KEYGRADE chrome; superintendent multiplicity; new parent KEYGRADE gradebook (keep M11); full auto short/show-work; hardware/OpenCV CLI; parent score entry; student keys; ZipGrade product; Ask `grade_photo`; family draft leak; Pack A / Pack C.

---

## 6. PM disposition

| Decision | Value |
|---|---|
| Stamp | **APPROVED** (aligned with QAS) |
| Chosen pack | **Pack B (contextual inline confirm)** |
| Eng | **Do not staff** (docs restamp only; parent epic stays sticky) |
| Parent epic `t_15ae546e` | Leave sticky needs_input — **do not unblock** |
| Next | CoS may file `DITL-UPDATE:` from intent IMPACT when ready; Eng only after Chuck unblocks epic |

---

## 7. Pointer to Q1

Q1 `photo-key-grading-acceptance.md` is **pre-IQG** and is **not** an IQG DESIGN STAMP. Live stamp lives in `keygrade-intent.md` / `keygrade-pm.md`. Do not replace Q1.

---

## References

- `notes/company/keygrade-intent.md`  
- `notes/company/keygrade-phone-approve-options.md`  
- `notes/company/photo-key-grading-plan.md` (A1)  
- `notes/company/INTENT_QUALITY_GATE.md`  
- `notes/company/keygrade-research-os.md` (R2)  
- `notes/company/DITL_OS.md`  

*End PM — t_91db8376 Pack B APPROVED.*
