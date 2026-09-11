# KEYGRADE IQG Intent (QA Supervisor)

**Date:** 2026-09-10  
**Author:** grok-bot-consultant (QA Supervisor hat)  
**Card:** `t_91db8376` [KEYGRADE-IQG2] Restamp after CEO locks + phone Approve packs  
**Prior stamp card:** `t_5fa12875` — **REJECTED** (chrome gaps: office/super unnamed; parent PARTIAL; phone Approve unlocked)  
**Process:** `notes/company/INTENT_QUALITY_GATE.md`  
**Parent epic:** `t_15ae546e` [KEYGRADE] — sticky unassigned needs_input (**do not unblock**, do not implement)  
**Prior pack:** R2 `keygrade-research-os.md` · A1 `photo-key-grading-plan.md` · S1 `photo-key-grading-security.md` · Q1 `photo-key-grading-acceptance.md` (pre-IQG) · Designer `keygrade-phone-approve-options.md` · PM `keygrade-pm.md`  
**Status:** Design-stage IQG intent restamp. **Both DESIGN STAMP lines APPROVED** 2026-09-10 (Pack B + CEO locks). Research/docs only. **No Engineering. No app code.**

**SoT read:** INTENT_QUALITY_GATE.md · DITL_OS.md · ditl-testplans.md · ditl-plans DITL-T-01 / T-02 / S-01 / DH-01 / P-02 · ditl-seed-school.md · gauth-kelyra-acceptance.md · docs/mvp.md · A1 Capture → desk → Approve · designer Pack B.

---

## CEO LOCKS (binding law)

1. **Office + superintendent KEYGRADE OUT of v1.** No KEYGRADE confirm/Approve chrome for office or superintendent.  
2. **Superintendent multiplicity matrix: N/A** (follows #1).  
3. **Parent keyed score same as today (M11).** No new `/parent/grades` KEYGRADE product.  
4. **Phone must Approve in v1.** Teacher confirms per-item extract and taps Approve on phone (**Pack B**).

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

**QA Supervisor stamp meaning:** CEO four locks written as law. Phone Approve added to lifecycle (start/change/finish on phone per CEO #4 + Pack B). Teach seat can Approve on phone; Parent seat cannot. Office/super KEYGRADE out of v1. Parent same as today (M11). Prior REJECT gaps closed by locks + named Pack B. **APPROVED.** Dual DESIGN STAMP complete.

---

## 0. One-line law

| Surface | Job | Not |
|---|---|---|
| **Assign (web)** | Teacher plans assignment + attaches key (`key_kind` photo / items / both) | ZipGrade product; student-authored keys; Ask create class |
| **Capture + Pack B confirm/Approve (phone)** | Teacher shutter + spoken-name match; Unassigned first-class; **per-item confirm + Approve on Capture review** | Matcher INSERT student; on-device OMR; Parent-seat Approve; office/super Approve |
| **Edge** | `match-key` · extract · `score-key` TS scripts → `model_draft` / `draft_score` only | Auto-publish; Ask `grade_photo`; Explain substituting totals |
| **Desk confirm / Approve (web)** | Alternate confirm/override/Approve path (bulk / multi-class); still nothing is a grade until Approve | Family SELECT of extract/draft; un-Approve in v1; exclusive-web-only Approve (phone required in v1) |
| **Family / student** | Post-Approve cell only (parent = M11 same-as-today) | Item marks, originals on list rows, draft leak, new parent KEYGRADE book |

---

## 1. Hats (roles that must use KEYGRADE)

### 1.1 Student

| Intent | Must | Chrome evidence | Gap? |
|---|---|---|---|
| See published keyed grade after Approve | Yes | Existing student Grades / book cell (post-`approved_score` only) | No — reuse live Grades |
| Capture own paper as primary KEYGRADE path | **No (v1)** | A1/mvp: **teacher** phone captures student work | Do not invent student Snap&Solve / grade_photo |
| See extract / draft_score / key_items | **No** | S1 / A1 family wall | — |

### 1.2 Teacher

| Intent | Must | Chrome evidence | Gap? |
|---|---|---|---|
| Plan key on assignment | Yes | Assign web / AssignmentForm; `key_items` / `key_asset_id` / analyze-answer-key | — |
| Capture stack on phone | Yes | Tray **Capture** `/capture`; Unassigned; Needs `/inbox` (DITL-T-01) | — |
| Confirm + **Approve on phone (Pack B)** | Yes (CEO #4) | Capture review carousel: per-item confirm bottom sheet + **Approve this capture** | Closed by Pack B |
| Confirm + Approve on web (alternate) | Yes | Proposal / student page; Grade book `/class/{id}/gradebook` (DITL-T-02) | — |
| Dual-hat teacher+parent | Yes | Seat switch Teach ↔ Parent (DITL-DH-01); no draft leak to Parent seat; Parent cannot Approve | — |

### 1.3 Parent

| Intent | Must | Chrome evidence | Gap? |
|---|---|---|---|
| See child’s **approved** keyed score **same as today (M11)** | Yes | mvp M11 invite-link progress / Home — **no new parent KEYGRADE gradebook** | **Closed** — CEO lock #3 |
| Enter / edit scores | **No** | Explicit non-goal | — |
| See extract / drafts / originals | **No** | FERPA / S1 | — |

### 1.4 Office

| Intent | Must | Chrome evidence | Gap? |
|---|---|---|---|
| KEYGRADE confirm / Approve chrome | **No (v1 OUT)** | CEO lock #1 — explicit non-goal | **Closed** — OUT |
| Ask scoring / grade_photo | **No** | A1 Office/Ask scoring row; GAUTH never `approved_score` | — |
| Create classes | Office-only existing; **not** via Ask | GAUTH L9 / product law | Out of KEYGRADE stamp scope |

### 1.5 Superintendent

| Intent | Must | Chrome evidence | Gap? |
|---|---|---|---|
| District / multi-school KEYGRADE visibility | **No (v1 OUT)** | CEO lock #1 — explicit non-goal | **Closed** — OUT |
| Multiplicity (many schools/classes) | **N/A** | CEO lock #2 | **Closed** — N/A |

### 1.6 Dual-hat (required examples)

| Persona | Law | Fail if |
|---|---|---|
| Teacher who is also parent | Teach seat: Capture → Pack B confirm → **phone Approve** on **own classes** only. Parent seat: child post-Approve only (M11). Atomic seat switch (DITL-DH-01). | Parent seat sees `draft_score` / extract; Parent Approves; Teach tray shows Ride; blended gradebooks |
| Office who is also parent | Parent seat → linked child only; office altitude adds **no** KEYGRADE chrome (OUT) | Admin firehose of drafts |
| Twins / two Mateos | Confirm UI; never auto-pick; matcher never INSERT | Silent file to wrong twin |

---

## 2. Chrome entry (no invent)

| Hat | Entry (evidence-backed) | Forbidden / invent-not |
|---|---|---|
| Teacher | `/capture` (+ Pack B review confirm/Approve); `/inbox`; student page `/class/{id}/student/{sid}`; gradebook `/class/{id}/gradebook`; AssignmentForm key fields | New ZipGrade tab; Ask Approve-all; office KEYGRADE desk |
| Student | Existing Grades book → own cell (post-Approve) | Student camera as KEYGRADE solve; `grade_photo` |
| Parent | **M11 same-as-today** (invite progress / Home) — no new KEYGRADE book | New parent score entry; invent full parent KEYGRADE gradebook |
| Office | **OUT of KEYGRADE v1** | Invented office KEYGRADE desk |
| Superintendent | **OUT of KEYGRADE v1** | Invented district KEYGRADE browser |
| Dual-hat | Entry follows **active seat** after switch; KEYGRADE drafts + Approve stay Teach-only | Stale Parent sheet after switch showing drafts; Parent Approve |

**Designer option packs:** Packs A/B/C filed in `keygrade-phone-approve-options.md`. **PM chose Pack B.** Extend A1 Capture → Pack B confirm/Approve. Do not invent office/super chrome.

---

## 3. Full lifecycle

| Step | Law |
|---|---|
| **Plan key** | Teacher saves planned assignment with typed `key_items` and/or accepted key photo (`key_kind` photo/items/both) on **web**. |
| **Capture** | Teacher phone photo (+ spoken name). `captures.student_id` may be null → Unassigned. Matcher **never** inserts student. |
| **Extract** | When assignment has key: Edge extract JSON + `score-key` TS → `model_draft` / `draft_score` only. Method `key_score` when keyed. |
| **Confirm (Pack B)** | Teacher reviews items on **phone Capture review** (contextual bottom sheet); override MC/numeric; twins confirm; one-tap Confirm & next. Web confirm remains alternate. |
| **Approve (Pack B + CEO #4)** | Explicit **Approve on phone** publishes `approved_score`. Web Approve remains valid alternate. Nothing is a grade until this click. Teach seat only. |
| **Published** | Family/student see post-Approve cell only (parent = M11). Lists continue thumbs-only; originals at grade-time on teacher surfaces. |
| **Unassign** | Capture may return to Unassigned / refile before Approve. |
| **Override** | Pre-Approve cell edits; post-Approve path = existing product re-grade rules (do not invent un-Approve). |
| **Cancel draft** | Discard draft / delete capture per existing rules; no publish. |
| **Already-in-flow** | Capture in desk with key match suggested; teacher can change assignment picker. |

**Product lock (was A1 open #1):** Confirm UX density = **Pack B** (phone Capture review inline). Phone Approve **required in v1** (CEO #4). Web-first-only is **not** sufficient.

---

## 4. Multiplicity

| Case | Law | Gap? |
|---|---|---|
| Twins / two same first names | Confirm; never auto-pick; never INSERT | Covered |
| Two classes | Active class isolation on capture; independent gradebooks | Covered |
| Multi-page | Batch upload; thumbs on lists; originals at grade-time | Covered |
| Two keys / versions | Assignment key SoT; teacher-selected version | Covered |
| Two devices | Phone capture + Pack B Approve; web Approve alternate | Covered |
| Superintendent many schools | **N/A** (CEO #2) | **Closed** |

---

## 5. Reverse / cancel / already-in-flow

- Unassign / refile capture before Approve.
- Override extract cells before Approve (Pack B bottom sheet or web).
- Cancel/discard draft; delete capture (existing unref; do not delete live key `assets` still on assignment).
- Change suggested assignment / name chip when shown.
- Navigate away before Approve = no publish.
- **v1 non-goal:** dedicated un-Approve; parent reverse of published keyed score.

---

## 6. Explicit non-goals (v1)

- Auto student insert / matcher invent roster row  
- Full auto short / show-work grading (remain `needsTeacher`)  
- Hardware scanner / laptop OpenCV CLI / on-device OMR  
- Parent-facing score entry or item marks  
- **New parent KEYGRADE gradebook** (keep M11 same-as-today)  
- Student creation of keys  
- Second grade book / ZipGrade product  
- Ask `grade_photo` / Ask Approve / Ask writes `approved_score`  
- Family SELECT of extract / `draft_score` / `key_items` / originals on list rows  
- Explain/Help substituting script totals (GAUTH L3)  
- Teachers create classes via Ask (officeOnly)  
- **Office KEYGRADE confirm/Approve chrome (CEO #1 OUT)**  
- **Superintendent KEYGRADE chrome + multiplicity matrix (CEO #1–#2 OUT / N/A)**  
- Pack A / Pack C (not chosen)  

---

## 7. Gaps vs prior REJECT (closed this restamp)

| Prior blocker (`t_5fa12875`) | Disposition |
|---|---|
| Office + superintendent KEYGRADE entry unnamed | **CEO #1 OUT** — explicit non-goals |
| Superintendent multiplicity matrix missing | **CEO #2 N/A** |
| Parent keyed-score chrome PARTIAL | **CEO #3** — same as today (M11); no new product |
| Confirm UX density phone vs web unlocked | **Pack B** + **CEO #4** phone Approve required |

**Must-include before APPROVED:** satisfied. No remaining intent gaps.

---

## DITL IMPACT

```
DITL IMPACT
Change: KEYGRADE IQG restamp APPROVED — Pack B phone per-item confirm + Approve on Capture review; CEO locks (office/super OUT; parent M11; phone Approve v1)
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01 (primary); DITL-T-02 (secondary note); DITL-DH-01 (Teach-seat phone Approve / Parent never Approve)
Cases touched: (follow plans — expect T-01 / related case rewrites after plan update; not rewritten on this card)
New DITL needed: no
Seed/artifacts: none required at design stamp; revisit if Pack B needs keyed-capture fixture beyond F-DRAFTS
Notes: DITL-T-01 today states teacher does NOT Approve on phone and lists Approve as non-goal (web = T-02). CEO #4 + Pack B overturn that — T-01 story/beats/lifecycle/non-goals must gain Pack B confirm + phone Approve for keyed captures while keeping Unassigned/matcher laws. T-02 remains web Approve/bulk path but must not claim phone Approve is forbidden. DH-01 dual-hat: Teach seat may phone-Approve; Parent seat must not. Do NOT file DITL-UPDATE from this consultant card (per t_91db8376); CoS owns filing sticky DITL-UPDATE: when ready. Do not rewrite plans/cases here. Do not unblock t_15ae546e. Do not staff Eng.
```

Do not file `DITL-UPDATE` from this card. Do not rewrite DITL plans/cases here.

---

## References

- `notes/company/keygrade-pm.md`  
- `notes/company/keygrade-phone-approve-options.md`  
- `notes/company/keygrade-research-os.md` (R2)  
- `notes/company/photo-key-grading-plan.md` (A1)  
- `notes/company/photo-key-grading-security.md` (S1)  
- `notes/company/photo-key-grading-acceptance.md` (Q1 pre-IQG)  
- `notes/company/INTENT_QUALITY_GATE.md` · `DITL_OS.md` · `ditl-testplans.md` · `ditl-plans/DITL-T-01.md`  
- `notes/company/gauth-kelyra-acceptance.md`  

*End intent — t_91db8376 Pack B dual DESIGN STAMP APPROVED; DITL IMPACT UPDATE_PLANS (T-01).*
