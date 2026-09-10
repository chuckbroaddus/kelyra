# GAUTH IQG — Real-world intent (retro, MERGED ASK+GAUTH)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_ab9d7f9f` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** GAUTH — Gauth-like Ask behavior (refuse/tutor, teacher Explain, parent co-educator, Practice Help, Help-used, MathText) on the **same Ask surface** as ASK A-Filing  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED**. Implementation already shipped (G0–G5 + LATEX/MATHUI). This card does **not** self-certify product-complete. Prove-out vs merged stamp still required. Do **not** rewrite `ask-iqg-intent.md` — join it.

**SoT read (pre-IQG pack + ASK join):**  
`gauth-research.md` (R1) · `gauth-kelyra-plan.md` (P1) · `gauth-kelyra-architecture.md` (A1) · `gauth-kelyra-security.md` (S1) · `gauth-kelyra-acceptance.md` (Q1) · `gauth-v1-request.md` · `gauth-v1.1-request.md` · `gauth-latex-*.md` · **`ask-iqg-intent.md` (dual APPROVED — absorb, do not weaken)**.

**Live ground (read-only this card):**  
`askHomeworkRefuse.ts` (+ Edge twin) · `askToolPolicy.ts` (+ twin) · `askTools.ts` · `askPrompt.ts` · `askAgent.ts` · `ask.tsx` · `ExplainDraftCard.tsx` · `explain/*` · `practice-help` Edge · `todo/[submissionId].tsx` · `helpApi.ts` / `helpUsed.ts` · `MathText*` · `matrix.ts` `explain.manage` · migrations `gauth_v1` / `gauth_v1_1` / `gauth_g5_help_used` · `gauth.security.test.ts` · `mathText.test.ts` · `helpUsed.test.ts`.

**CEO locks (2026-09-10):**  
1. **MERGE** GAUTH with ASK A-Filing — one hats/lifecycle/multiplicity/non-goals story.  
2. Student Ask **tutors** homework (**never** answer/key) — not a hard refuse of the *subject*. Student **cheat-wall** stays.  
3. Parent stays **co-educator** (no student-style refuse).  
4. Do not reopen Diary Ask NL `t_cecf2af0`. Do not reopen ASK IQG locks.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: GAUTH — Ask behavior (refuse/tutor, Explain, parent co-educator, Practice Help, Help-used, MathText) MERGED with ASK A-Filing
Quality goals: student tutor-not-key + cheat-wall; parent co-educator no refuse; teacher Explain draft on-demand; Practice Help separate Edge + attempt gate; Help-used teacher transparency; MathText KaTeX; three runtimes uncollapsed; absorb ASK pack/ground/re-ground/class-switch/office-off/dual-hat locks; no Snap solve; no EXPO_PUBLIC keys; Approve wall
PM: APPROVED (pre-IQG pack + CEO sends)  date: 2026-09-03..04  profile-session: GAUTH-P1 t_f9f96bca + A1/S1/Q1 + V1 t_603e5165 + V1.1 t_e6fd0c19 + LATEX packs / product-manager + CEO
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_ab9d7f9f / qa-supervisor
Intent gaps remaining: none (realization defects — see §6; not design holes)
```

**QA Supervisor stamp meaning:** Real-world intent is fully specified across GAUTH P1/A1/S1/Q1 + V1/V1.1/LaTeX **and** absorbed ASK IQG locks — **not** happy-path only. Hats, chrome entry, full lifecycle (incl. reverse), multiplicity, and explicit non-goals cover student/teacher/parent/office/super/dual-hat. Live tree carries G0–G5 + MathText. This stamp does **not** declare GAUTH product-complete or release-ready.

---

## 0. MERGED ASK+GAUTH law (single table)

| Surface | Job | Not |
|---|---|---|
| **Ask tray (one `/ask`)** | Role-scoped assistant; TEACH-UX last tab | Second AI tab; Snap & Solve home; Help merge |
| **ASK A-Filing pack** | Once-per-assignment student-safe tutor brief after teacher Confirm | Key / worked solution / explain_draft inject; auto-live draft |
| **Student ground** | Soft chip + durable re-ground (ASK IQG-RG-*) | Hard forever assume; twin bleed |
| **Parent ground** | Explicit Which assignment? + re-ground | Soft “Looks like…”; student refuse |
| **Student Ask behavior (GAUTH)** | **Tutor** homework with pack/class context; **cheat-wall** = never final answer/key, never photo-solve graded work | Hard ban of entire homework *subject*; open Gauth clone |
| **Teacher Explain** | On-demand draft steps on taught-class capture; Keep private default | Grade; auto-run; office bulk; student SELECT |
| **Parent co-educator** | Linked-child step-by-step / Explain / photos; never Approve | Other families; twin mix; student-style refuse |
| **Practice Help (G4)** | Separate Edge; assignment `help_mode`; attempt-gated ladder | Ask tools; graded original capture; bulk key client |
| **Help-used (G5)** | Teacher-visible counts only | Keystroke log; student Snap chrome |
| **MathText** | Render `$…$` / `$$…$$` / `\(...\)` / `\[…\]` on Explain/Ask/Help | CAS; MathJax; cheat-wall change |
| **Office / super Ask** | Ops chat only | Pack inject (IQG-OFF-*); teacher Explain without teach row |
| **Award path** | KEYGRADE scripts / teacher Approve | LLM totals; Ask `approve_work` |

**Join rule:** GAUTH is Ask *behavior* on the A-Filing surface. Prove-out covers ASK+GAUTH together. Do not reopen ASK REL unless a new defect vs this merged stamp.

---

## 1. Hats — who uses GAUTH behavior (on Ask surface)

### 1.1 Student — tutor-not-key + cheat-wall

| Intent | Specified? | Law / live |
|---|---|---|
| Ask **tutors** homework with pack/class context (CEO 2026-09-10) | Yes | Not a hard ban of the *subject*; coach toward understanding |
| **Cheat-wall:** never final answer / answer key / “write this” / photo-solve graded work | Yes | G0/G3; S1-01; ASK P0-10/14; refuse-before-vendor on graded solve intents |
| No student vision on Ask; camera = turn-in / practice entry | Yes | G0; no Snap chrome |
| Soft ground + pack inject only when ASK A-Filing allows | Yes | ask-iqg §2.2; IQG-RG / IQG-CL absorbed |
| Practice Help (G4) only on assigned practice with `help_mode != off` | Yes | Separate Edge; attempt-gated ladder; never graded original capture |
| Refusal card copy firm (G3); optional nav to assigned practice only | Yes | open_screen allow-list + enrollment |
| Never SELECT teacher-only / keys / explain_draft | Yes | Family DTO omit; pack schema wall |

### 1.2 Teacher — Explain + policy

| Intent | Specified? | Law / live |
|---|---|---|
| On-demand **Explain** draft on taught-class capture (keyed + freeform) | Yes | G1; `explain.manage`; `class_teacher_of` before originals |
| Prefer key_items + extract; never substitute KEYGRADE totals | Yes | Ordering law; scripts = award SoT |
| Park draft (`explain_status`); Attach as note default **Keep private** | Yes | Confirm; copy parked draft only; not a grade |
| Ask tools: explain_capture / discard / attach — no approve_work / create_class | Yes | Denylist + matrix |
| Teacher-seat Ask: **class-only** — no student pack inject | Yes | IQG-TCH-ASK-01 (ASK) |
| Confirm brief lives on assignment detail only (ASK) | Yes | Not Explain chrome |
| Set `help_mode` on assign form (default off); graded originals never inherit On | Yes | G2 field |
| Help-used counts visible on practice row (G5) — transparency not keystroke log | Yes | G5 |

### 1.3 Parent — co-educator (CEO v1.1 override)

| Intent | Specified? | Law / live |
|---|---|---|
| Linked-child step-by-step / Explain / photos when stuck helping homework | Yes | v1.1 P; `parent_of(student_id)` wall |
| **Not** student-style graded refuse on co-educator path for *their* child | Yes | CEO override of early P1 “parent no solver” |
| Explicit **Which assignment?** ground; never “Looks like…” | Yes | ASK US-P1; IQG-RG-03 |
| Never Approve / never write approved_score / never other families | Yes | GAUTH + ASK |
| Twins: per-child only; never mix siblings | Yes | Fail closed |
| Token-only `/parent?t=` observer still no Ask/Explain/Help | Yes | S1-13 |
| Dual-hat: parent seat ≠ teacher extract for unrelated classes | Yes | Seat SoT |

### 1.4 Office / superintendent

| Intent | Specified? | Law / live |
|---|---|---|
| Ops / school Ask chat only | Yes | IQG-OFF-01…03 |
| **No** pack inject / soft chip / parent assignment card | Yes | ASK §6.1 |
| **No** teacher Explain without `class_teachers` row | Yes | O-01/O-02; not `teaches_class` widen |
| No bulk-solve / grade_photo superuser | Yes | P1 non-goal + S1 |
| Confirm brief never on office seat | Yes | IQG-OFF-04 |

### 1.5 Dual-hat

| Intent | Specified? | Law / live |
|---|---|---|
| Chrome **seat** is SoT for tools, ground, Explain | Yes | US-D1; S1-06; ignore body.role/tools |
| **Explain only on teacher seat** (taught class) | Yes | Task req; class_teacher_of |
| Parent seat: co-educator for linked children only | Yes | v1.1 |
| Office+teacher: Confirm/Explain tools only after teacher seat | Yes | IQG-OFF-05/06 |
| Seat switch clears assignment ground (ASK clear family) | Yes | IQG-OFF-06 / IQG-CL-04 |

### 1.6 Twins / binding

| Intent | Specified? | Law / live |
|---|---|---|
| Twins fail closed — no cross ground/pack/thread/Explain | Yes | ASK US-D3; GAUTH X-03/X-04 |
| Ambiguous twin → confirm UI; never auto-pick; matcher never INSERT | Yes | AGENTS + S1-07 |

---

## 2. Entry chrome (per hat)

| Hat | GAUTH behavior entry | ASK ground / pack entry | Not |
|---|---|---|---|
| **Student** | Tray `/ask` last tab (TEACH-UX); tutor replies in thread; G3 refuse card when cheat-wall trips; Practice Help **in practice player** (todo/submission), not Ask tools | Soft chip when page knows assignment; durable **Choose assignment** after clear (IQG-RG-02) | Snap & Solve tab; Help merge into Ask; vision solver |
| **Teacher** | Proposal / student work: **Explain** Secondary/Ghost near Look-again; Ask chips for explain_capture when capture-bound; assign form **Student help** chips | Confirm brief strip/card on **assignment detail only** | Second Approve; auto-run Explain; pack inject in teacher Ask (IQG-TCH-ASK-01) |
| **Parent** | `/ask` co-educator thread; Explain for **linked child** when stuck; Help path only if product surfaces practice for that child under parent seat | Empty-state **Which assignment?**; card returns after Just chatting (IQG-RG-03) | Soft “Looks like…”; Approve; other-family Explain |
| **Office / super** | `/ask` ops chat only | **None** — no pack / no soft chip / no parent card (IQG-OFF-*) | Explain without teach row; Confirm tools |
| **Dual-hat** | Seat switcher; Explain chrome only on **teacher** seat for taught class | Seat switch clears ground | Parent seat teacher extract; office seat Confirm |

**MathText (display):** Ask bubbles, ExplainDraftCard, Help prompts — join MATH IQG by reference. MATH track owns render prove-out; GAUTH prove-out only checks walls still hold with math on screen.

---

## 3. Full lifecycle (start → change → finish + reverse)

### 3.1 Student Ask (tutor + cheat-wall)

```
open /ask (tray or deep-link)
  → optional soft ground / pack inject (ASK A-Filing rules)
  → tutor turns with class/pack context (CEO tutor-not-key)
  → cheat intent (graded solve / key / photo quiz / jailbreak paraphrase)
       → refuse-before-vendor + G3 card; no partial hint leak
  → Just chatting / Not this / Choose assignment → ASK re-ground (A)
  → leave Ask / class switch / seat switch → clear ground family
  → Practice Help lives on practice player path (separate), not Ask tool loop
```

**Finish covered:** tutor session; refuse path; Just chatting reverse; leave Ask; class/seat clear. **Not** “finish = got the answer.”

### 3.2 Teacher Explain

```
open proposal/student work (taught class) OR Ask with capture bound
  → on-demand Explain (never auto on every capture)
  → draft parks explain_draft / explain_status=draft
  → edit? → Keep private (default) | Attach as teacher note (Confirm) | Discard
  → attach copies parked draft only → status noted (still not a grade)
  → award path remains KEYGRADE + teacher Approve elsewhere
```

**Finish covered:** park, discard, keep private, attach-as-note. **Not** Approve.

### 3.3 Parent co-educator

```
parent seat → open Ask
  → Which assignment? (or Just chatting)
  → pick linked child + assignment → co-educator help / Explain if wall allows
  → Just chatting → card returns (IQG-RG-03)
  → child switch / class switch / leave Ask → clear + re-prompt rules
  → unlink / other family → deny
```

### 3.4 Practice Help (G4) + Help-used (G5)

```
student opens assigned practice with help_mode != off
  → in-player Help (separate Edge)
  → each turn: JWT==student_id; enrollment; re-read help_mode; practice-only; attempt gate
  → ladder: conceptual → next step (no final) → isomorphic? → full item after gate
  → help_mode off / revoke mid-flight → next turn refuse fail-closed
  → teacher sees Help-used counts on practice row (no keystroke log)
  → never writes approved_score; never bulk key client
```

### 3.5 ASK pack lifecycle (absorbed, not rewritten)

Teacher Confirm brief / Skip / Clear / stale / re-Confirm — full law in `ask-iqg-intent.md` §4. GAUTH must not break pack inject walls or Confirm≠Approve.

### 3.6 Reverse / cancel (must-include)

| Action | Result |
|---|---|
| Just chatting / Not this → none | Clear ground + inject; durable re-ground control returns (ASK A) |
| Leave Ask | Session chrome exit; re-entry follows tray/page ground rules |
| Help stop / close player | Leave Help Edge path; Ask unchanged |
| Discard explain draft | Clear park; no family leak |
| Keep private (default attach path) | No student-visible note |
| help_mode off / revoke | Next Help turn refuse |
| Class / seat / child switch | Clear assignment ground + drop inject (ASK); dual-hat tools follow new seat |
| Stale pack | Stop inject until re-Confirm/Clear |
| Student cheat-wall trip | Refuse card; no vendor homework body/pixels |

---

## 4. Multiplicity

| Case | Design |
|---|---|
| Two children (parent) | Child switcher; ground + Explain per linked child; switch clears + re-prompts |
| Twins | Fail closed; no shared ground/pack/thread/Explain dump |
| Multiple assignments equally plausible | Sheet / which; never merge packs (ASK); never merge Help keys |
| Tray `/ask` no page assignment | No hard-assume (ASK P0-06) |
| Multiple classes | Class switch clears assignmentId + inject (IQG-CL-*); Explain only on taught class of active seat |
| Teacher multi-class | Explain bound to capture’s class + class_teacher_of |
| Parent multi-school links | parent_of wall per student_id; no cross-family |
| Web vs native | Same behavior law; MathText render differences owned by MATH IQG (reference only — do not steal MATH stamp) |
| Three runtimes | Ask gateway · Explain Edge · Practice Help Edge stay **uncollapsed** |
| Dual device / reopen Ask | Owner history only; extract/originals must not reopen on parent payload |

---

## 5. Security walls (must-hold with pack present)

| ID | Rule |
|---|---|
| S1-01 / RF | Student graded solve + photo quiz: refuse-before-vendor; no partial hint; no homework body/pixels on refuse path |
| Denylist | Never register solve_photo / snap_solve / grade_photo / approve_work / reveal_answer_key / student check_work as Ask tools |
| explain.manage | teacher own; parent path only via parent_of linked child (v1.1); student/office none unless teach row |
| class_teacher_of | Before signed URL / originals; not teaches_class / is_staff widen |
| Family DTO | Omit explain_draft / extract / draft_score / originals (column omit, not only RLS) |
| Seat wall | Ignore body.role / body.tools; dual-hat follows active seat |
| Help Edge | Separate; student JWT; re-read help_mode; practice-only; attempt gate; no bulk key |
| Award | KEYGRADE scripts + teacher Approve; Ask never approved_score |
| Keys | Server-side only; no EXPO_PUBLIC_* model keys; no Gauth SDK |
| open_screen | Assigned practice allow-list + enrollment; not teacher proposal / keys |
| ASK locks | IQG-OFF-*, IQG-RG-*, IQG-CL-*, IQG-TCH-ASK-01 hold; Confirm ≠ Approve |
| Matcher | Never inserts student; twins confirm never pick |
| MathText | Display-only; does not weaken cheat-wall (MATH IQG) |

---

## 6. Explicit non-goals (not “done”)

| Non-goal | Why |
|---|---|
| Student Snap & Solve tab / Gauth reskin / ByteDance SDK | CEO bar — school product, not cheat app |
| Fold Help into Ask tools | Three runtimes uncollapsed |
| LLM award totals / Ask approve_work | KEYGRADE + teacher Approve only |
| Office bulk-solve / grade_photo superuser | Hat escape |
| Auto-run Explain on every capture | Cost + S1-12 |
| Multi-method / voice tutor / whiteboard / tutor marketplace (G8–G11) | Later / never MVP |
| 100M problem bank | Out |
| Seed full summative key into Help from Explain (G6 full) | Integrity |
| Per-student keystroke Help surveillance | G5 = counts only |
| Parent Approve / grade write | Never |
| Twin merge / shared Ask memory | Fail closed |
| Reopen Diary Ask NL `t_cecf2af0` | CEO park |
| Rewrite ask-iqg-intent.md / weaken IQG-OFF/RG/CL/TCH-ASK | CEO MERGE join only |
| Steal MATH IQG stamp / KaTeX prove-out | MATH owns display |
| Git ship / devops-release from this card | Prove-out first |

---

## 7. Must-include checklist (stamp)

1. Student Ask **tutors** with pack/class context; cheat-wall never final answer/key/photo-solve graded work.  
2. Teacher on-demand Explain on taught class; Keep private default; not a grade.  
3. Parent co-educator for **linked children** only; never Approve; never other families.  
4. Office/super: ops Ask only; no pack inject; no Explain without teach row.  
5. Dual-hat: Explain only on **teacher** seat; seat SoT; seat switch clears ground.  
6. Practice Help separate Edge; help_mode default off; attempt gate; no bulk key.  
7. Help-used teacher counts only (G5).  
8. Three runtimes uncollapsed; denylist holds; twin policy maps.  
9. ASK A-Filing absorbed: pack confirm, re-ground (A), class-switch clear, IQG-OFF, IQG-TCH-ASK-01.  
10. Reverse: Just chatting, leave Ask, Help stop, discard draft, revoke help_mode.  
11. Multiplicity: twins, multi-assignment, multi-child, multi-class.  
12. MathText may render; does not change cheat-wall (MATH owns render prove-out).  
13. No EXPO_PUBLIC keys; matcher never inserts student; nothing is a grade until Approve.

---

## 8. Live ground vs packs (read-only summary)

| Pack / ship | Verdict (this stamp) |
|---|---|
| G0 refuse + denylist + twin policy maps | Shipped V1 `t_603e5165` |
| G1 Explain + explain.manage + family omit | Shipped V1 |
| G3 refusal card | Shipped V1 |
| G2 help_mode field default off | Shipped V1 |
| Parent co-educator + G4 Practice Help | Shipped V1.1 `t_e6fd0c19` |
| Parent no-refuse path follow-ups | Parent card `t_38204161` cluster |
| G5 Help-used | Shipped `t_09d99eab` |
| LATEX/MATHUI MathText | Shipped; MATH IQG `t_b92ffdd0` owns display stamp |
| ASK A-Filing + RELEASE | Stamped + release evidence in ask-iqg-intent.md — **do not reopen** unless new defect vs merged stamp |

Unit/static evidence exists (`gauth.security.test.ts`, `helpUsed.test.ts`, ask policy twins). **Not** a substitute for merged ASK+GAUTH QE dogfood.

---

## 9. Intent gaps + realization defects

**Intent gaps remaining:** **none.** GAUTH P1/A1/S1/Q1 + V1/V1.1/G5/LaTeX packs **merged** with ASK IQG locks fully specify real-world intent (hats, chrome, lifecycle incl. reverse, multiplicity, security, non-goals) — not happy-path only. No PM/designer restaff required to invent GAUTH chrome. Do not reopen ASK stamp or Diary `t_cecf2af0`.

**Realization defects for CoS (this card):** **none new** filed from design-stage review. Shipped track is large; QE merged prove-out may still find live misses.

If QE finds miss vs this merged stamp → file on board `kelyra`:

```
Title: DEFECT [P0|P1|P2|P3]: <one-line miss>
SEVERITY: P0|P1|P2|P3
PARENT: t_4595b4ec (or GAUTH/ASK feature parent CoS names)
REPRO: …
HAT / ROLE: …
EXPECTED (stamped design): notes/company/gauth-iqg-intent.md + ask-iqg-intent.md
ACTUAL: …
EVIDENCE: …
DISPOSITION: (PM fills)
```

Suggested severity anchors: P0 = graded answer leak / wrong-child Explain / Approve via Ask; P1 = missing primary-hat lifecycle (no refuse, no parent co-educator wall, Help collapsed into Ask, dual-hat Explain on wrong seat); P2 = multiplicity/secondary; P3 = polish.

---

## 10. Prove-out OBJECTIVE (for QA Engineer)

**Staffing:** CoS creates `qa-engineer` card from this OBJECTIVE. Plan + cases now; execute against live G0–G5 + ASK A-Filing. Do **not** declare GAUTH product-complete from this stamp card. Do not run kelyra-qa-loop here. Do not staff devops-release. Do not steal MATH render cases (join MATH testplan by reference). Do not rewrite ask-iqg-intent.md.

**OBJECTIVE (copy-paste onto qa-engineer card):**

```
OBJECTIVE:
Write test plan + cases and execute prove-out for MERGED ASK+GAUTH product law (A-Filing pack/ground + Gauth-like Ask behavior). Land notes/company/gauth-iqg-testplan.md (or notes/qa/). File defects on board kelyra with severity (P0–P3) vs stamped intent; do not bury misses only in comments. Do not implement. Do not kelyra-qa-loop. Do not git. Do not SQL.

SoT:
- notes/company/gauth-iqg-intent.md (this MERGED stamp — hats/lifecycle/multiplicity/walls)
- notes/company/ask-iqg-intent.md (ABSORB locks IQG-OFF / IQG-RG / IQG-CL / IQG-TCH-ASK-01 — do not weaken)
- notes/company/gauth-kelyra-acceptance.md + gauth-kelyra-security.md + gauth-v1-request.md + gauth-v1.1-request.md
- MATH display: notes/company/math-iqg-intent.md by reference only (walls-with-math; not KaTeX glyph matrix)

SCOPE — must cover ASK+GAUTH together:
1. HATS
   - Student: tutor-not-key with pack/class context; cheat-wall refuse-before-vendor on graded solve/key/photo quiz; no Snap tab; soft ground + Choose assignment re-ground
   - Teacher: on-demand Explain on taught class; Keep private default; attach Confirm; help_mode chips; Help-used counts; teacher Ask class-only (no pack inject)
   - Parent: co-educator for linked child only; explicit Which assignment?; never Approve; never Looks like; other family denied
   - Office/super: ops Ask only; no pack inject/soft chip/parent card; no Explain without class_teachers row
   - Dual-hat: seat SoT; Explain ONLY on teacher seat; parent seat co-educator walls; office+teacher Confirm/Explain only on teacher seat; seat switch clears ground
2. CHROME ENTRY: tray /ask; Explain near Look-again (not second Approve); Practice Help in-player not Ask tools; Confirm brief on assignment detail only; no Help→Ask merge
3. LIFECYCLE + REVERSE: tutor session; refuse card; Just chatting / leave Ask / Help stop; discard draft; Keep private; help_mode revoke fail-closed; pack Confirm/Skip/Clear/stale (ASK); re-ground (A); class switch clear
4. MULTIPLICITY: two children; twins fail closed; two assignments never merge; multi-class switch clears ground; three runtimes uncollapsed; web vs native behavior parity (math render → MATH plan)
5. INTEGRITY / SECURITY: denylist; explain.manage + class_teacher_of + parent_of; family DTO omit explain_draft/extract; no approved_score from Ask/Help; attempt-gated Help; no bulk key; no EXPO_PUBLIC keys; matcher never inserts; Confirm≠Approve; pack present still holds graded+photo refuse
6. NON-GOALS guarded: no Snap solve; no office bulk-solve; no LLM award; no Diary NL reopen; no MATH stamp theft

CASES (minimum IDs — expand in testplan):
- S-TUT-01..04 student tutor with/without pack; no final answer
- S-RF-01..06 graded solve / photo / jailbreak / partial-hint / vision drop / refuse card
- T-EX-01..08 Explain on-demand keyed+freeform; auto-run absent; Keep private; attach; discard; Unassigned capture; Ask chips; phone sheet
- P-CO-01..06 parent linked Explain/help; unlink deny; other family deny; Which assignment; Just chatting return; no Approve
- H-PL-01..07 Help help_mode on/off/revoke; practice-only; graded capture deny; attempt gate; no bulk key; Help-used counts; not Ask tools
- D-HAT-01..05 teacher↔parent seat; office↔teacher; Explain only teacher seat; ground clear on seat switch
- OFF-01..03 office/super no pack/no Explain without teach row
- TW-01..02 twins no cross Explain/ground/pack
- ASK-RG-01..03 / ASK-CL-01 / ASK-TCH-01 re-ground, class switch, teacher Ask no pack (regression vs ASK RELEASE)
- REG-01..06 denylist twins; family omit; approved_score wall; KEYGRADE ordering; open_screen allow-list; MathText on bubble still refuse path plain where required

EVIDENCE: automated (gauth.security / policy / helpUsed) + scripted UI + JWT/role fixtures. Each P0 intent row → evidence path. Open P0/P1 → DEFECT [sev] cards parented to GAUTH/ASK feature.

CONSTRAINTS: No eng implement on QE card; no git ship; no devops-release; do not reopen t_cecf2af0; do not rewrite ask-iqg-intent.md; MATH glyph cases stay on MATH QE if staffed separately.

RECOMMENDED NEXT ACTION after QE: QA Supervisor release evidence vs merged stamp → only then CoS staffs devops-release if RELEASE APPROVED and open P0/P1 FIX-NOW clear.
```

---

## 11. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_4595b4ec` (continuation of `t_ab9d7f9f`) / qa-supervisor |
| **PM stamp** | **APPROVED** (pre-IQG pack + CEO sends) · GAUTH-P1 + V1/V1.1/LaTeX product law |
| **ASK join** | Dual APPROVED + RELEASE in `ask-iqg-intent.md` — absorbed, not rewritten |
| **Intent gaps remaining** | **none** |
| **Realization DEFECT titles this card** | **none** |
| **Engineering** | Already shipped G0–G5 + MathText. New eng only for PM FIX-NOW from prove-out. Do not self-certify product-complete. |
| **QA Engineer** | CoS staffs from §10 OBJECTIVE (merged ASK+GAUTH). QA Sup does not staff. |
| **MATH** | Display stamp separate (`math-iqg-intent.md`); do not steal |
| **devops-release** | Gate closed until merged prove-out + QA Sup release evidence |
| **Parent card `t_ab9d7f9f`** | Leave blocked/gave_up — this card is the continuation |
| **RESULT** | DESIGN STAMP QA Sup APPROVED; `gauth-iqg-intent.md` complete (no PLACEHOLDER); prove-out OBJECTIVE ready for CoS → qa-engineer |

### RECOMMENDED NEXT ACTION (CoS)

1. Staff `qa-engineer` with §10 OBJECTIVE (ARM as needed).  
2. Do not staff eng unless QE files P0/P1 and PM says FIX-NOW.  
3. After QE terminal → staff QA Sup release evidence card.  
4. Leave `t_ab9d7f9f` as-is; do not reopen Diary `t_cecf2af0`.  
5. Do not weaken ASK IQG-OFF / RG / CL / TCH-ASK locks.

---

*End GAUTH IQG intent — MERGED ASK+GAUTH · QA Supervisor DESIGN STAMP APPROVED 2026-09-10 · card t_4595b4ec.*
