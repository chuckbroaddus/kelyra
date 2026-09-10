# ASK IQG — Real-world intent (A-Filing)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_f9416f40` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** Publish-time student-safe pedagogy pack + Ask assignment ground (**A-Filing**)  
**Status:** Design-stage IQG intent — **both DESIGN STAMP lines APPROVED** 2026-09-10 (PM `t_67da4743` + QA Sup re-stamp `t_c7c1e4e0`). **No app code** on this card. Does **not** declare ASK-I1 product-complete.

**SoT read:** ASK-R1/R2/R3 · ASK-P1 · ASK-D1 · ASK-P2 · `docs/ui-design.md` §3.6 · §4 · §8.1 · §12.6 · §13.15 · §29.4a · prior GAUTH laws.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: ASK A-Filing — pedagogy pack confirm + Ask assignment ground
Quality goals: student-safe once-at-publish pack; Confirm≠Approve; soft student / explicit parent ground; tray no hard-assume; twins fail closed; GAUTH refuse holds with pack; family never SELECT teacher-only; Help stays separate; full lifecycle confirm/skip/clear/stale/re-confirm; office/super no pack; durable re-ground (A); class switch clears ground
PM: APPROVED  date: 2026-09-10  profile-session: t_67da4743 / product-manager
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_c7c1e4e0 / qa-supervisor
Intent gaps remaining: none
```

**PM stamp meaning (2026-09-10):** Required IQG gaps §6.1–§6.3 are locked below (plus optional §6.4). Stories/AC cover hats including office/super, reverse after clear via durable re-ground **(A)**, and class-switch clear. A-Filing UI lock stays; A/B/C not reopened.

**QA Supervisor re-stamp meaning (2026-09-10 · t_c7c1e4e0):** Real-world intent is fully specified (not happy-path only). Verified against PM §6.1–§6.4 and designer D3 fold in `docs/ui-design.md` §12.6 / §12.6.8 / §13.15 / §29.4a. Former Q1 REJECT drivers closed: (1) office/super Ask = no pack inject / no soft chip / no parent card / Confirm only on teacher seat; (2) durable in-session re-ground **(A)** — student mute **Choose assignment** composer-adjacent after clear; parent **Which assignment?** card returns after Just chatting; re-pick clears prior inject; (3) class switch clears ground + drops inject. Hats, chrome entry, full lifecycle, multiplicity, reverse/cancel, and explicit non-goals are complete enough to build and prove out. **Both stamps APPROVED.** This does **not** declare ASK-I1 product-complete — QE2 prove-out vs stamp still required; open P0/P1 FIX-NOW must clear before release evidence / devops-release.

---

## 1. One-line law (from P1/P2)

| Surface | Job | Not |
|---|---|---|
| Pedagogy pack | Once-per-assignment student-safe tutor brief (objectives, misconceptions, hint depth, vocab; ≤~800 tok) | Key, worked solution, explain_draft, per-assignment solver skill |
| Teacher Confirm | Preview/edit/**Confirm brief** before inject | Auto-live draft; **Approve** noun; grade theater |
| Student ground | Soft `Looks like…` + **Not this** when page knows assignment | Hard forever assume; raw pack dump |
| Parent ground | Explicit **Which assignment?** (or Just chatting) | Soft assume; Approve; twin bleed |
| Inject | Server attaches **safe slice** only when assignment known + pack **confirmed** + seat rules | Client-trusted pack body; unconfirmed/stale inject |
| Help Edge | Separate surface forever | Merge into Ask |

---

## 2. Hats — who uses this

### 2.1 Teacher (primary pack author)

| Intent | Specified? | Where |
|---|---|---|
| Generate pack on publish / material update | Yes | P1 US-T1; §29.4a strip |
| Preview + edit student-safe fields | Yes | US-T2/T3; field editor |
| Teacher-only internal notes (never inject) | Yes | Wall **Only you** |
| **Confirm brief** → injectable | Yes | P0-02; never “Approve” |
| **Skip for now** → unconfirmed; publish stays | Yes | US-T4; class-only Ask OK |
| **Clear brief** → off without unpublish | Yes | ConfirmSheet |
| **Re-generate** → Draft; prior confirmed stays until new Confirm/Clear | Yes | US-T5 |
| **Stale** on material edit → inject stops; Needs review banner | Yes | US-T6; P0-11 |
| Entry: strip on success + durable collapsed card on assignment detail | Yes | A-Filing; phone + web |
| Teacher-seat Ask pack inject | **No — locked** | §6.4 IQG-TCH-ASK-01 class-only |

### 2.2 Student

| Intent | Specified? | Where |
|---|---|---|
| Soft ground when page/deep-link knows assignment | Yes | US-S1; chip above composer |
| Tap **Not this** → correct / Just chatting | Yes | ≤3 inline; ambiguous or >3 sheet |
| Inject only if confirmed + known id | Yes | P0-03 |
| Tray `/ask` no page assignment → no hard-assume | Yes | P0-06; optional once/session hint |
| Two equally plausible → which; never merge packs | Yes | US-S6; P1-03 |
| Graded refuse still holds with pack | Yes | P0-10; R2 + GAUTH |
| Photo quiz → refuse; not vision solver | Yes | P0-14 |
| No raw pack / teacher-only / keys in UI or family SELECT | Yes | P0-09; S4 |
| Re-ground after **Just chatting** cleared chip | **Yes — PM lock (A)** | §6.2 IQG-RG-01/02/05 |

### 2.3 Parent (co-teacher)

| Intent | Specified? | Where |
|---|---|---|
| Explicit card — never “Looks like…” | Yes | US-P1; empty-state card |
| Just chatting → free chat, no pack | Yes | A-Filing §3.3 |
| After pick → student-safe + parent seat policy | Yes | US-P2 |
| Child switch clears ground + re-prompts card | Yes | US-D2; P1-05 |
| No teacher-only SELECT / no Approve | Yes | P0-09; GAUTH |
| Re-ground after Just chatting without killing session | **Yes — PM lock (A)** | §6.2 IQG-RG-01/03/05 |

### 2.4 Dual-hat

| Intent | Specified? | Where |
|---|---|---|
| Chrome **seat** is SoT for Ask role + ground rules | Yes | US-D1; P0-08 |
| Teacher-hat ≠ parent soft/explicit mix-up | Yes | P1 dual-hat |
| Parent-hat does not get Confirm tools | Yes | Confirm on teacher assignment detail only |
| Seat switch clears assignmentId ground | Yes | P1 live-context delta |
| Teacher who is also parent on parent seat | Yes | Parent explicit rules |
| Office who is also teacher | **Yes — PM lock** | §6.1 IQG-OFF-04/05/06; Confirm on teacher seat only |

### 2.5 Office / superintendent

| Intent | Specified? | Where |
|---|---|---|
| Tray includes **Ask** (office 5-tab) | Chrome exists | ui-design §3 / §36 |
| Pedagogy pack confirm | **None — locked** | No office Tutor brief surface (§6.1) |
| Assignment ground / pack inject on office seat | **No inject — locked** | §6.1 IQG-OFF-01..06 |

### 2.6 Twins / binding

| Intent | Specified? | Where |
|---|---|---|
| Twins fail closed — no cross-child ground/pack/thread | Yes | US-D3; P0-07 |
| Ambiguous twin → no pack until child explicit | Yes | Family switcher; no invent twin picker |
| Student inject requires bound student matches enrollment | Yes | US-D4 |

---

## 3. Entry chrome (per hat)

| Hat | Confirm / author pack | Ground / inject path |
|---|---|---|
| Teacher | Assignment detail: publish **strip** + collapsed **Tutor brief** card (§29.4a). Not tray tab. Not Help. Not `/ask` body. | Teacher Ask: **no pack inject** (class-only) — §6.4 IQG-TCH-ASK-01. |
| Student | None | Lesson/assignment/practice/deep-link → soft chip above composer. Tray alone → no chip / optional hint → picker never auto-picks. After clear → durable **Choose assignment** (§6.2). |
| Parent | None | `/ask` empty-state **Which assignment?** card before pack path. After Just chatting → card/control returns (§6.2). |
| Office / superintendent | None (stays none) | `/ask` ops chat only — **no** soft-assume, **no** pack inject (§6.1). |
| Dual-hat parent | None on parent seat | Parent card; seat switch clears. |
| Dual-hat office+teacher | Confirm only when **teacher** seat on assignment detail | Office seat: IQG-OFF locks; seat switch clears ground. |

---

## 4. Full lifecycle (start → change → finish)

### 4.1 Pack lifecycle (teacher)

```
publish/update → AI draft (Draft, not injectable)
  → edit? → Confirm brief (Confirmed, injectable)
  → Skip for now (stays unconfirmed; class-only Ask)
  → Re-generate (new Draft; prior Confirmed live until Confirm/Clear)
  → material edit → Needs review (stale; inject STOPPED)
  → re-Confirm or Clear
  → Clear brief (ConfirmSheet) → off; class-only until new Confirm
```

**Finish covered:** Confirm, Skip, Clear, stale stop, re-confirm. **Not** grade-blocked.

### 4.2 Student ground lifecycle

```
page knows assignment + confirmed pack → soft chip + inject
  → Not this → pick other / Just chatting → prior inject cleared
  → ambiguous two → sheet (no soft assume)
  → tray no page → no hard-assume
  → stale mid-session → drop inject; optional one mute line
  → unconfirmed → chip title OK; no missing-pack scold; no inject
  → after clear to none → durable **Choose assignment** (IQG-RG-02) → re-pick clears prior inject
  → class switch → clear ground/inject; chip update or hide (§6.3)
```

**Finish covered:** Just chatting reverse + in-session re-ground (A); class switch clear.

### 4.3 Parent ground lifecycle

```
open Ask, no ground → explicit card
  → pick title → safe inject + parent policy
  → Just chatting → no pack → card/control returns (IQG-RG-03)
  → child switch → clear + card returns
  → class switch → clear + card re-prompts (§6.3)
  → stale → drop inject quiet
```

**Finish covered:** re-ground after Just chatting (A); class switch re-prompt.

### 4.4 Reverse / cancel (must-include)

| Action | Result |
|---|---|
| Skip for now | Unconfirmed; no student inject |
| Clear brief | Pack off; class-only |
| Not this / Just chatting | Clear session ground + inject |
| Choose assignment / re-pick | Clear prior inject; new ground per pick (§6.2 A) |
| Child switch / seat switch | Clear ground |
| Class switch while Ask open | Clear ground + drop inject (§6.3) |
| Stale | Stop inject until re-confirm/clear |
| Correct away | Clear prior pack inject |

---

## 5. Multiplicity

| Case | Design |
|---|---|
| Two children (parent) | Child switcher; ground per child; switch clears + re-prompts |
| Twins | Fail closed; no shared ground/pack/thread |
| Two assignments equally plausible | Sheet / which; never merge packs |
| >3 titles on correct | Sheet |
| Tray `/ask` no page assignment | No hard-assume |
| Deep link with assignmentId | Soft ground (student) when known |
| Multiple classes | Page/class scoped lists; **class switch clears assignmentId** (§6.3 IQG-CL-*) |
| Teacher multi-class | Confirm on that assignment’s detail only |

---

## 6. Intent gaps — PM LOCKS (2026-09-10 · t_67da4743)

Former REJECT drivers. **PM locks below are binding product law** for A-Filing IQG. QA Supervisor re-stamps against these; do not reopen A/B/C.

### 6.1 P0 — Office / superintendent Ask seat — **LOCKED**

| Law ID | Lock |
|---|---|
| **IQG-OFF-01** | **Office seat** Ask: **no** pedagogy-pack inject; **no** student soft chip; **no** parent-style “Which assignment?” card required for ops chat. |
| **IQG-OFF-02** | **Superintendent seat** Ask: same as office — no pack inject, no soft chip, no parent assignment card. |
| **IQG-OFF-03** | Office/super Ask is **ops / school / class chat** only (non-assignment-tutor) unless a **later epic** explicitly adds office assignment-tutor packs. |
| **IQG-OFF-04** | **Confirm brief / Clear brief / Skip for now / Re-generate** and Tutor brief strip/card exist **only** on **teacher** assignment detail under **teacher seat**. Office seat never shows Confirm tools. |
| **IQG-OFF-05** | **Dual-hat office+teacher:** author/confirm packs only after switching to **teacher** seat on assignment detail. Office-seat Ask does **not** inherit teacher pack draft tools, Confirm CTAs, or student soft-assume. |
| **IQG-OFF-06** | Seat switch office↔teacher **clears** any prior `assignmentId` / ground (same clear family as other seat switches). |

**Designer:** none (behavior + seat law; no office-specific chrome invent).

**AC (prove-out):** OFF-01 — office Ask open with class context → zero pack inject, no soft chip, no parent card. OFF-02 — superintendent same. OFF-03 — dual-hat on office seat → no Confirm tools; switch to teacher seat → Confirm only on assignment detail.

### 6.2 P1 — Re-ground after Just chatting / cleared ground — **LOCKED = (A)**

**Pick: (A) durable in-session re-ground control** — not (B) leave/re-enter friction.

| Law ID | Lock |
|---|---|
| **IQG-RG-01** | After ground is cleared to **none** (Just chatting, Not this → none, correct-away to none), student **and** parent can re-pick an assignment **in the same Ask session** without leaving Ask or relying only on page revisit. |
| **IQG-RG-02** | **Student:** when no assignment ground is active (chip cleared; not page-soft-assuming), show a durable mute affordance **Choose assignment** (composer-adjacent band — same zone as soft chip). Opens existing picker rules: inline ≤3 titles, sheet if ambiguous or >3, plus Just chatting. |
| **IQG-RG-03** | **Parent:** after Just chatting / cleared ground, restore durable re-entry — empty-state **Which assignment?** card **returns** (or equivalent durable control that opens the same picker). Not student-only; not once/session-only tray hint. |
| **IQG-RG-04** | Tray optional once/session hint remains for first empty tray open; it does **not** replace IQG-RG-02 after an explicit clear mid-session. |
| **IQG-RG-05** | **Re-pick always clears prior inject** before any new pack inject (same as correct-away). |
| **IQG-RG-06** | Re-ground control is **not** Option B header band, **not** Option B blocking modal, **not** full Option C panel — micro fold onto **A-Filing** only. |
| **IQG-RG-07** | Rejected alternative **(B):** leave/re-enter Ask or revisit assignment page as sole re-ground — **not** product law. |

**Designer:** **YES — required micro fold.** CoS staffs `ui-ux-designer` to fold **Choose assignment** (student) + parent card-return-after-clear into `docs/ui-design.md` §12.6 (and related A-Filing ground notes). **Not** a re-option of A/B/C. PM does not draw chrome.

**AC (prove-out):** RE-01 student Just chatting → Choose assignment visible → pick new title → prior inject gone, new inject only if confirmed. RE-02 parent Just chatting → card/control returns → pick works. RE-03 re-pick clears prior inject.

### 6.3 P1 — Class switch clears assignment ground — **LOCKED**

| Law ID | Lock |
|---|---|
| **IQG-CL-01** | Changing **active class** (chrome class context / class chip) while Ask is open **clears** session `assignmentId` / assignment ground and **drops** pack inject immediately. |
| **IQG-CL-02** | **Student:** soft chip **updates** to new page-bound assignment if the new class page knows one; otherwise chip **hides** and durable **Choose assignment** (IQG-RG-02) applies if user stays in Ask with no ground. |
| **IQG-CL-03** | **Parent:** class switch clears ground; **Which assignment?** card **re-prompts** if pack path is still desired (same family as child-switch re-prompt). |
| **IQG-CL-04** | Live-context clear family (product, not eng design): correct-away, child switch, seat switch, tray-no-page, **class switch**, re-pick. |
| **IQG-CL-05** | Class switch does **not** confirm a new pack by itself and does **not** carry prior class’s assignmentId into the new class. |

**Designer:** none (behavior law).

**AC (prove-out):** MULT-01 class switch with grounded Ask → inject dropped; student chip update/hide; parent card re-prompt.

### 6.4 Optional advisories — **LOCKED** (non-blocking for prior REJECT, now closed)

| Law ID | Lock |
|---|---|
| **IQG-TCH-ASK-01** | **Teacher-seat Ask:** **no** student-safe pack inject. Teacher Ask stays **class-only** for this slice. Preview/author path is assignment-detail Confirm surface only — not “preview student tutor” inject in teacher Ask. |
| **IQG-STALE-01** | Material-edit stale-mark triggers: **title, body, objectives, key stems** (existing P0-11). **Attachment-only** change does **not** auto stale-mark. Teacher may still Re-generate / Clear / Confirm explicitly. |
| **IQG-GEN-01** | Generation once-per confirm cycle (ASK-P0-13) — eng must not re-call per Ask turn. |

---

## 7. Must-include behaviors (stamp checklist)

1. Pack student-safe only; schema wall on keys / worked solutions / explain_draft.
2. Unconfirmed = zero student/parent pack inject (class-only OK).
3. Confirm brief ≠ Approve; pills Draft / Confirmed / Needs review only.
4. Skip = class-only; Clear = off without unpublish.
5. Stale stops inject; teacher banner non-blocking for grades.
6. Student soft + Not this; parent explicit never Looks like.
7. Tray no page → no hard-assume.
8. Ambiguous assignments → which; never merge.
9. Twins fail closed; dual-hat = chrome seat.
10. Family/student never SELECT teacher-only pack fields.
11. GAUTH graded refuse + photo refuse still hold with pack present.
12. Help Edge separate.
13. Cost: once per publish/confirm cycle, not per student/turn.
14. **Office/super:** no pack inject / no soft chip / no parent card (§6.1).
15. **Re-ground (A):** durable Choose assignment (student) + parent card return; re-pick clears inject (§6.2).
16. **Class switch** clears assignment ground + inject (§6.3).
17. **Teacher Ask:** no pack inject; attachment-only does not auto-stale (§6.4).

---

## 8. Explicit non-goals (not “done”)

| Non-goal | Why |
|---|---|
| Per-assignment answer/solver skills | ASK-R1 harm |
| Help → Ask merge | Separate controls |
| Student vision tutor on quiz photos | GAUTH refuse |
| Per-student / per-turn re-assessment | Cost |
| Auto-live pack without Confirm | Teacher gate |
| Parent Approve / grade write | Never |
| Twin merge / shared Ask memory | Fail closed |
| Student raw pack inspector | Title chip only |
| Full Option B / full Option C | P2 rejected |
| Office bulk assignment tutor packs | Out unless later epic |
| Author studio skill authoring MVP | Later |
| New IconName for status | Text pills |
| Git ship / devops-release from IQG | QE prove-out first |

---

## 9. Regression walls (must still hold)

| Wall | With pack present |
|---|---|
| Student graded refuse (final answer / key / write this) | Hold |
| Student photo-of-quiz refuse before vendor | Hold |
| Family DTO omit explain_draft / keys / teacher-only notes | Hold |
| Ask write/admin tools never-send (A4) | Hold |
| Parent co-teacher ≠ Approve | Hold |
| Twins fail closed | Hold |
| Matcher never inserts student | Hold |
| Nothing is a grade until Approve | Confirm brief is **not** a grade path |
| Help Edge separate | Hold |
| Model keys server-side only | Hold |

---

## 10. Prove-out OBJECTIVE (for QA Engineer QE1)

**Staffing:** CoS creates `qa-engineer` card **QE1** always. **Plan + cases now**; **execute only after ASK-I1 terminal** (`passed` / `escalated` / `complete`). Do not declare ASK-I1 done from this card. Do not run kelyra-qa-loop here. Do not staff devops-release.

**OBJECTIVE (paste onto QE1):**

```
OBJECTIVE:
Write test plan + cases for ASK A-Filing (publish-time student-safe pedagogy pack + Ask assignment ground). Land notes/company/ask-a-filing-testplan.md (or notes/qa/). Execute after ASK-I1 t_4ccafede is terminal — not before. File defects on board kelyra with severity (P0–P3) vs stamped intent; do not bury misses only in comments.

SoT: notes/company/ask-iqg-intent.md (IQG stamp + gaps), ask-assignment-context-pm.md, ask-assignment-context-ui-lock.md (A-Filing), docs/ui-design.md §8.1 · §12.6 · §13.15 · §29.4a, GAUTH acceptance/security walls.

SCOPE — must cover:
1. HATS: teacher (strip+card Confirm/Skip/Clear/Re-generate/stale), student (soft chip), parent (explicit card), dual-hat teacher+parent (seat SoT), dual-hat office+teacher (Confirm only on teacher seat), office/superintendent Ask (expect: no pack inject / no soft ground per PM amend §6.1 — file DEFECT if eng invents office pack path).
2. CHROME ENTRY: teacher assignment detail only for Confirm; student chip above MessageComposer (not header band); parent empty card in thread; tray Ask last tab; no Help merge; no new IconName requirement.
3. LIFECYCLE: draft→Confirm inject; Skip=class-only; Clear→ConfirmSheet off; Re-generate keeps prior confirmed until new Confirm/Clear; material edit→Needs review + inject stopped; re-Confirm; mid-session stale drops inject (optional one mute student line); student Not this / Just chatting clears inject; parent child switch re-prompts; seat switch clears ground.
4. MULTIPLICITY: two children; twins fail closed; two equally plausible assignments (sheet, never merge); tray /ask with no page assignment (no hard-assume); class switch clears assignment ground; deep-link with assignmentId soft-grounds student only when appropriate.
5. INTEGRITY: Confirm ≠ Approve (copy+pills); GAUTH refuse still holds with pack present (graded + photo quiz); parent never “Looks like”; family/student never SELECT teacher-only pack fields / explain_draft / keys; server-side safe slice only; unconfirmed=no inject; generation not per Ask turn.
6. NON-GOALS guarded: no solver UI; no Help→Ask merge; no parent Approve; no twin picker invention; no student missing-pack scold; no B modal gate / header ground.

CASES (minimum IDs — expand in testplan):
- T-CONF-01..08 teacher strip/card/Confirm/Skip/Clear/Re-gen/stale/over-cap/gen-fail
- S-GND-01..08 student soft/Not this/Just chatting/tray none/ambiguous/unconfirmed quiet/stale mute/photo refuse
- P-GND-01..06 parent explicit/Just chatting/child switch/no Looks like/safe slice only
- D-HAT-01..04 teacher↔parent seat; office↔teacher seat; ground clear on seat switch
- TW-01..02 twins no cross ground/pack
- OFF-01 office/super Ask no pack inject (after PM §6.1)
- REG-01..05 GAUTH refuse+pack; family SELECT wall; Help separate; Confirm≠Approve; Skip=class-only
- MULT-01 class switch clears ground
- RE-01 re-ground after Just chatting per PM §6.2 (pass = matches locked rule)

EVIDENCE: automated and/or scripted UI + JWT/role fixtures where RLS/Edge. Each P0 intent row → evidence path. Open P0/P1 misses → DEFECT [sev] cards parented to ASK feature.

CONSTRAINTS: No eng implement on QE1; no git ship; no devops-release; do not stop/poll ASK-I1; if ASK-I1 not terminal, finish plan/cases and block execution waiting on dependency.

RECOMMENDED NEXT ACTION after QE1 plan: wait ASK-I1 terminal → execute prove-out → QA Supervisor release evidence → only then devops-release.
```

---

## 11. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_c7c1e4e0` / qa-supervisor (re-stamp after PM §6 + D3 fold) |
| **PM stamp** | **APPROVED** 2026-09-10 · `t_67da4743` / product-manager |
| **Designer** | **DONE** · `t_3389dae1` D3 micro-fold §6.2 **(A)** into ui-design §12.6 / §12.6.8 / §13.15 / §29.4a |
| **DESIGN STAMP (both)** | **APPROVED** — engineering gate open for stamped scope; prove-out still required |
| **Engineering** | ASK-I1 may complete against stamp. New eng only for PM FIX-NOW defects from prove-out. Do not self-certify product-complete. |
| **QE1 / QE2** | Plan: `notes/company/ask-iqg-testplan.md`. Execute: QE2 `t_29176224` (already staffed) — do not wait/poll from this card; do not duplicate. |
| **devops-release** | **Gate open** after RELEASE APPROVED (`t_c9419741`) — CoS staffs; QA Sup does not |
| **RESULT** | Both DESIGN STAMP lines APPROVED 2026-09-10. Intent gaps remaining: **none**. **RELEASE APPROVED** 2026-09-10. |

### RELEASE STAMP (2026-09-10 · t_c9419741)

```
RELEASE STAMP
Feature: ASK A-Filing — pedagogy pack confirm + Ask assignment ground
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_c9419741 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met (hats/chrome/lifecycle/MULT-01/integrity)
P2/P3 leftovers: sticky only — non-blocking
Evidence: notes/company/ask-iqg-release.md
```

**Release meaning:** QE2 prove-out executed; sole P1 MULT-01 FIX-NOW closed via E1 loop `wf_01a08c517bcc7c528ce7a22f83e06270` + QE3 **PASS**. Independent unit/static recheck 21/21. No open P0/P1 FIX-NOW on board `kelyra`. P2/P3 ASK-I1 and E1 leftovers remain sticky and do **not** block release. This is release evidence only — not a second implementer loop; not git ship.

### RECOMMENDED NEXT ACTION (CoS)

1. ~~QE2 execute~~ done (`t_29176224`).
2. ~~MULT-01 FIX-NOW~~ done (PM `t_28889f75` → E1 `t_f1b829b0` → QE3 `t_e0fe83cd` PASS).
3. **Staff `devops-release`:** commit/push A-Filing + MULT-01 (no force-push; no secrets). QA Sup does not staff DevOps.
4. Leave sticky P2/P3 ASK-I1 / E1 leftovers for later harvest; do not reopen A-Filing stamp.
5. Do not treat this RELEASE as authority to invent new scope beyond stamped A-Filing.

---

*End ASK IQG intent — A-Filing · DESIGN STAMP + RELEASE APPROVED 2026-09-10.*
