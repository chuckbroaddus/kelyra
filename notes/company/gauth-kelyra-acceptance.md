# GAUTH-Q1: Acceptance plan — Gauth-like Ask (not a Build send)

**Date:** 2026-09-04
**Author:** qa-supervisor
**Ticket:** t_6369ad0d
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/gauth-kelyra-plan.md` (GAUTH-P1) | Hats, refuse cheat, Explain, Practice Help, v1 cut |
| `notes/company/gauth-kelyra-architecture.md` (GAUTH-A1) | Three runtimes, tools, data sketch, ordering law |
| `notes/company/gauth-kelyra-security.md` (GAUTH-S1) | Must-fix GAUTH-S1-01…17 + future loop tests |
| `notes/company/gauth-research.md` (GAUTH-R1) | Problem framing (context only) |
| KEYGRADE-A1 (join) | Scripts award; Explain reads extract — not this epic’s score path |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing Snap & Solve tab, student `solve_photo`, LLM award totals, or Gauth SDK.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, JWT fixture, or scripted UI check with artifact).
2. Every **GAUTH-S1-01…GAUTH-S1-14** (v1) security must-fix is covered; **S1-15…17** when Practice Help (G4) ships (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; refuse-before-vendor, family draft leak, `explain.manage` matrix, and KEYGRADE ordering need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Replicate **equivalent capabilities** (OCR already on Capture; explainable steps) **inside Kelyra AI**. Never a ByteDance consumer cheat app. Never a Gauth reskin. | P1 §0, R1 CEO bar |
| L2 | **Three runtimes stay uncollapsed:** Ask gateway · Teacher Explain Edge · Practice Help Edge (v1.1). Do not fold Help into Ask tools. | A1 §2, S1 §2.4 |
| L3 | **Award = KEYGRADE scripts** (`score-key`). Generative = teacher Explain + optional student Practice Help only. Ask never writes `approved_score`. | P1 §7, A1 §0 |
| L4 | **Nothing is a grade until Approve.** Explain draft is never a grade. Ask never Approves. | AGENTS, ui-design §12.4 |
| L5 | Student/parent Ask: **no vision**; intent refuse **before** vendor call; no homework body/pixels on refuse path; no partial hint leak. | S1 T1 / S1-01 |
| L6 | New cap **`explain.manage`**: teacher `own`; parent/student/office **`none`**. **Not** `assignments.manage`. `teacherSeatOnly`; handler `class_teacher_of` before originals. | A1 §3.2, S1-02 |
| L7 | Family **never** SELECT extract / `explain_draft` / `draft_score` / originals. RLS is row-level — family RPC/view must **omit** columns. | S1 T3 / S1-04 |
| L8 | Active **seat** is the wall. Dual-hat parent seat cannot open extract JSON. Ignore `body.role` / `body.tools`. | A1 §0, S1-06 |
| L9 | Teachers do **not** create classes via Ask/Explain/Help. `create_class` stays `officeOnly`. Matcher never inserts a student. Twins confirm, never pick. | P1 §3, S1-07 |
| L10 | Practice Help only on **assigned practice** with `help_mode != off` (default **off**). Never on graded original captures. Attempt-gated reveal. No bulk key in client. | P1 §6, S1-15…17 |
| L11 | One `/ask` surface (TEACH-UX). No Snap & Solve student tab. Student camera = **submit** / practice entry, not solve. | A1 §1, P1 §5.4 |
| L12 | Model keys server-side only. No `EXPO_PUBLIC_*`. Paid no-train. No Gauth/ByteDance SDK. Explain **on demand** (not auto-run). | AGENTS + S1-08/12 |

### 0.2 In scope vs out of scope

**In scope v1 (must prove after CEO send — G0+G1+G3, optional G2 field):** server refuse + denylist; student refusal card; teacher Explain draft (proposal/student page + Ask `explain_capture` park); `explain.manage` matrix + twins; family DTO omit; KEYGRADE ordering (Explain reads extract, never substitutes); dual-hat/office walls; attach-as-note default Keep private; GAUTH-S1-01…14.

**Out of scope (do not fail v1 for missing):** Practice Help player UI (G4); help-used meta (G5); Explain→hint seed (G6); multi-method (G8); flashcards (G9); AI-use accuser (G10); voice tutor (G11); 100M bank; tutor marketplace; student Snap tab; office bulk-solve.

### 0.3 v1 cut reminder

| ID | Deliverable | This plan |
|---|---|---|
| **G0** | Ask/Edge refuse + denylist; intent gate before vendor | §1 refuse matrices + SEC-01 |
| **G1** | Teacher Explain draft + `explain_capture` | §2 Explain matrices |
| **G2** | Assign `help_mode` chips stored; default Off | Policy field; student UI may wait |
| **G3** | Student refusal card copy | §1 S-* refusal UX |
| **G4+** | Practice Help | §1/§2 later rows; S1-15…17 when shipped |

---

## 1. Hats / refuse cheat

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family- or student-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (policy maps, intent gate pure fns, DTO strip) |
| **I** | Integration / RPC / Edge with JWT fixtures |
| **UI** | Scripted or dogfood UI (Ask, proposal Explain, practice player) |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs Capture → Approve, KEYGRADE, TEACH-UX one `/ask` |

### 1.1 Teacher hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| T-01 | P0 | UI | Open proposal / student work with capture | **Explain** is Secondary/Ghost near Look-again — **not** a second Approve |
| T-02 | P0 | UI/I | On-demand Explain (keyed capture) | Draft parks `explain_draft`; prefers key_items + extract marks; scripts remain right/wrong SoT |
| T-03 | P0 | UI/I | On-demand Explain (freeform / no key) | Pedagogy draft OK; still **not** Approve; no `approved_score` write |
| T-04 | P0 | UI/I | Explain never auto-runs on every capture | Default on-demand (cost + S1-12); no silent vendor spam |
| T-05 | P0 | UI | Keep private (default) | Draft stays teacher-only; family/student see nothing new |
| T-06 | P0 | UI/I | Attach as teacher note (Confirm) | Copies **parked** draft only — not latest model bubble; still not a grade |
| T-07 | P0 | UI/I | Discard draft | Clears draft; published grade path unchanged |
| T-08 | P0 | I/S | Teacher of class A explains class B capture | **Denied** before signed URL / fetch (`class_teacher_of`) |
| T-09 | P0 | I | `student_id` null (Unassigned) | Explain allowed if capture ∈ taught class; matcher still never inserts student |
| T-10 | P0 | UI | Ask chips with capture bound | Allowed: Explain missed items · Draft re-teach · Set practice help. Forbidden: Solve for student · Approve all · Create a class |
| T-11 | P0 | I/S | Ask `explain_capture` | Parks draft only; **no** score write tool; no `approve_work` |
| T-12 | P1 | UI | Phone vs web | Phone: one Explain sheet; web: denser edit (M10) |
| T-13 | P1 | UI/I | G2 `help_mode` chips on Assign | Default **Off**; copy: does not apply to graded captures |
| T-14 | P2 | — | Seed practice hints from Explain (G6) | Later; never full summative key |

### 1.2 Student hat — refuse first

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| S-01 | P0 | I/S | Student Ask + photo of quiz / exit ticket | **No vision** — image dropped server-side; refuse card; **no** xAI call with stem/pixels |
| S-02 | P0 | I/S | Student Ask + paste graded homework text | Intent gate **before** vendor; empty model context on match **or** uncertainty |
| S-03 | P0 | I/S | Jailbreak paraphrase (“check my work” + multi-step stem) | Still refuse; no partial “hint” on refuse path |
| S-04 | P0 | U/S | Student tools | **No** `solve_photo` / `snap_solve` / `explain_capture` / `grade_photo` / `reveal_answer_key` / Ask `check_work` |
| S-05 | P0 | UI | Refusal card (G3) | Calm card: “Can’t help with that…”; Primary Open practice (if any); Secondary OK |
| S-06 | P0 | UI | Student Capture camera | Remains **turn in** — no Snap & Solve chrome / FAB |
| S-07 | P0 | I/S | Student SELECT extract / `explain_draft` / `draft_score` | **No privilege** / omitted from every student RPC |
| S-08 | P0 | I/S | Student invoke Explain Edge | **Denied** |
| S-09 | P1 | I/UI | `open_screen` to practice | Only **assigned** practice; allow-list + enrollment; never teacher proposal / keys (S1-11) |
| S-10 | P1 | UI | Global student Ask | May navigate to practice; never solves graded work |
| S-11 | P0 | I | Practice Help before G4 | If `help_mode` field exists early: default off; no Help UI required for v1 pass |
| S-12 | P0 | I/S | G4 Help on graded original capture | **Denied** server-side even if chrome lies |
| S-13 | P0 | I | G4 Help when `help_mode=off` or revoked mid-flight | Next turn refuse fail-closed |
| S-14 | P0 | I | G4 attempt gate | Full item solution only after attempt or post-submit policy |
| S-15 | P0 | I | G4 check-my-work | Compares to **this set’s** key/worked example — not open web solve |
| S-16 | P0 | U/I | G4 no bulk key in client | Client never holds full summative key “hidden” |
| S-17 | P1 | UI | G4 ladder | (1) conceptual (2) next step no final (3) isomorphic if allowed (4) full after gate |
| S-18 | P1 | I | G4 JWT | student JWT == `student_id` + enrollment every turn |

### 1.3 Parent hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| P-01 | P0 | I/S | Parent Ask + photo/paste of child’s quiz | Same as student: no vision; refuse before vendor; no solver |
| P-02 | P0 | I/S | Parent SELECT extract / `explain_draft` | **Never** |
| P-03 | P0 | I/S | Parent Practice Help on graded stack | **Denied** |
| P-04 | P0 | I/UI | Parent visibility | Approved focus / practice done / `parent_sentence` only — no item-level AI dump |
| P-05 | P0 | S | Token-only `/parent?t=` | Never calls `ask-assistant` / Explain / Help (S1-13) |
| P-06 | P1 | — | Optional home-help one-liner | Later; only from **teacher-approved** minimized note — never full key |
| P-07 | P1 | I | Parent open Ask history with extract payload | Tool results with extract/originals must not persist into reopenable parent payload |

### 1.4 Office / staff hat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| O-01 | P0 | I/S | Office JWT without `class_teachers` row | No `explain_capture`; no Explain Edge; no grade_photo superuser |
| O-02 | P0 | S | Explain uses `teaches_class` / `is_staff` / `also_administrator` widen | **Forbidden** — `class_teacher_of` only |
| O-03 | P0 | S | `create_class` still `officeOnly` | Unchanged; Explain/Help must not call it |
| O-04 | P0 | U/S | Office grants on `explain.manage` | **`none`** — do not copy `assignments.manage` (student `own` trap) |
| O-05 | P1 | UI | Office Ask | No parallel Gauth admin; directory flows stay non-AI for class create |

### 1.5 Dual-hat + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | I/S | Teacher+parent, **parent** seat | Family read only; **denied** extract / explain_draft / Explain tools |
| X-02 | P0 | I/S | Same profile, **teacher** seat | Explain only on `class_teacher_of` classes |
| X-03 | P0 | I/S | `body.role` spoof / `body.tools` inject | **Ignored** — seat from getUser + profile + which function |
| X-04 | P0 | I | Twin first-name bind on Ask/Explain | Confirm UI; never auto-pick; never matcher INSERT |
| X-05 | P1 | UI | Seat switch | Reloads; no silent cross-hat residual extract in chat |

### 1.6 Cross-hat refuse / denylist (normative)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| RF-01 | P0 | U/S | Unknown Ask tool name | **Denied** both client + Edge twins |
| RF-02 | P0 | U/S | Never register | `solve_photo`, `snap_solve`, `grade_photo`, `approve_work`, `reveal_answer_key`, student Ask `check_work` |
| RF-03 | P0 | S | Prompt-only refuse | **Fail** if refuse path still forwards homework body/pixels to vendor “to phrase refusal” |
| RF-04 | P0 | R | Capture → match → Approve | Unchanged by Explain chrome |
| RF-05 | P0 | R | KEYGRADE `score-key` | Still pure; Explain never substitutes totals |
| RF-06 | P0 | R | One `/ask` | No second AI tab / ClassTabs Ask / Snap home |

---

## 2. Explain vs snap-solve

CEO bar: Gauth-quality **explain** for teachers; student path is **refuse + optional practice coach** — never unsupervised snap-solve of graded work.

### 2.1 Ordering law (scripts first)

```
Capture
  ├─ has key? ──yes──► extract → score-key → proposal
  │                      └─ optional Explain (reads extract; no totals)
  └─ no key ──► evaluate-homework gap draft → proposal
                 └─ optional Explain (pedagogy; still not Approve)

Ask (teacher) ── explain_capture (read + park draft) ── no Approve tool
Ask (student/parent) ── refuse graded solve (before vendor)
Practice Help (v1.1) ── never approved_score
```

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| OR-01 | P0 | I/U | Keyed path | `score-key` produces right/wrong; Explain **reads** marks; model total ignored if present |
| OR-02 | P0 | I | Explain called as substitute for score-key | **Forbidden** — fail review |
| OR-03 | P0 | I | Freeform path | Gap draft + optional Explain; Approve still teacher-only |
| OR-04 | P0 | I | Ask path writes `approved_score` / `draft_score` | **Forbidden** |
| OR-05 | P0 | R | KEYGRADE K0/K1 join | Explain consumes extract when present; freeform Explain may ship without full KEYGRADE but keyed Explain prefers script truth |

### 2.2 Teacher Explain surface + tools

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| EX-01 | P0 | U/S | Capability matrix | `explain.manage`: superintendent none, administrator none, teacher **own**, parent none, student none |
| EX-02 | P0 | U/S | Tools (when registered after send) | `explain_capture`, `discard_explain_draft`, `attach_explain_as_note` — all `teacherSeatOnly` |
| EX-03 | P0 | U/S | Not under `assignments.manage` | Copying student `own` from assignments = **instant fail** (AVG-S1 / GAUTH-S1 T2) |
| EX-04 | P0 | I/S | Handler wall | JWT + `class_teacher_of(class_id)` + capture∈class **before** signed URL / `fetch` |
| EX-05 | P0 | I/S | `isAllowedAskImageUrl` | Only project Storage host or controlled `data:`; no arbitrary URL (SSRF/IDOR) |
| EX-06 | P0 | I | Draft schema | `explain_draft` jsonb `{schema_version, steps[], reteach, source, capture_id}`; `explain_status` none\|draft\|noted — never `approved` as grade |
| EX-07 | P0 | I/S | Family RPC omit | `parent_progress`, gradebook, landing live blocks omit `explain_draft`, extract, `draft_score`, originals |
| EX-08 | P0 | UI/I | Attach-as-note | Default Keep private; Confirm required; copies parked draft; student-visible only as optional post-turn-in pedagogy — never pre-submit key |
| EX-09 | P0 | I | `ask_messages` | Owner RLS; store `asset_id` not `data:` bytes; never copy explain/extract into `audit_events` or family DTOs |
| EX-10 | P1 | S | Prompts | First names / opaque ids; no IEP; no full roster; no sibling blend; no full page bodies in logs |
| EX-11 | P1 | S | `askActorSystemLine` | Non-overridable hat line; OCR text cannot jailbreak Approve/score tools |
| EX-12 | P1 | UI | Entry points | Proposal / student work page / Ask with capture attached (read context) |

### 2.3 Normative Ask policy (copy into future loop)

```
explain.manage: superintendent none, administrator none, teacher own, parent none, student none
  tools: explain_capture, discard_explain_draft, attach_explain_as_note
  teacherSeatOnly: true
  officeOnly: false
  run: class_teacher_of(class_id) AND capture∈class or deny
  before_media: authz wall, then isAllowedAskImageUrl
  writes: explain_draft / explain_status only — never approved_score

student/parent Ask:
  no vision attachments (drop server-side)
  intent refuse BEFORE vendor on graded-solve intents (fail closed on uncertainty)
  no solve/explain/grade/reveal tools
  open_screen: assigned practice allow-list only

never register: solve_photo, snap_solve, grade_photo, approve_work, reveal_answer_key,
  student check_work-as-Ask-tool
```

Do **not** register tools until CEO says send.

### 2.4 Snap-solve refusal (product inversion)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SS-01 | P0 | UI | No student Snap & Solve home tab | Product never grows this chrome |
| SS-02 | P0 | S | No third-party homework helper SDK | No ByteDance/Gauth SDK embed |
| SS-03 | P0 | I | Generative student Ask with zero tools still solves | **Fail** — T1 must-fix (refuse before vendor) |
| SS-04 | P0 | I | Practice Help collapsed into Ask tools | **Fail** — separate Edge only (G4) |
| SS-05 | P0 | I | `help_mode` On inherited by graded original capture | **Forbidden** |
| SS-06 | P1 | U | G2 chips only | Off \| Hints \| Steps after try \| Check work — default Off |
| SS-07 | P1 | I | Teacher revoke Help mid-flight | Next student message sees off → refuse |
| SS-08 | P2 | — | Help-used meta (G5) | Teacher-visible counts later; no keystroke capture |

### 2.5 Mental model (acceptance wording)

| Consumer Gauth | Kelyra acceptance meaning |
|---|---|
| Student snap → full steps + answer | **Refuse** on graded/unassigned homework for students/parents |
| Step-by-step explanation | **Teacher Explain draft** — editable, Keep private default |
| Self-check | **Practice Help** on assigned practice only, teacher policy, attempt-gated |
| Question bank / live tutor / marketplace | **Out** — never fail v1 for absence; fail if built as cheat path |

---

## 3. Evidence (tests, RLS, dogfood)

### 3.1 GAUTH-S1 must-fix → acceptance map

Future loop fails if any **P0** row lacks evidence. Map 1:1 to GAUTH-S1 §2.1–2.2.

| ID | Sev | Type | Case | Evidence later |
|---|---|---|---|---|
| SEC-01 | P0 | S/I | S1-01 student/parent no vision; refuse before vendor | Fixture: image dropped; refuse path does **not** call xAI with stem; no partial hint |
| SEC-02 | P0 | U/S | S1-02 `explain.manage` teacher own; others none | Policy tests: student, parent, office, teacher-also-admin, teacher-parent — **not** under `assignments.manage` |
| SEC-03 | P0 | U/S | S1-03 twin maps + unknown denied + never-register list | Client + Edge identical; `solve_photo` etc. false for all seats |
| SEC-04 | P0 | I | S1-04 family omits explain/extract/draft_score/originals | Grants + RPC field allowlist; no family SELECT of teacher blob row/column |
| SEC-05 | P0 | I/S | S1-05 `class_teacher_of` before signed URL | Teacher A + class B capture → 403; Unassigned OK on taught class; `isAllowedAskImageUrl` |
| SEC-06 | P0 | I/S | S1-06 ignore body.role/tools; dual-hat parent denied extract | Parent seat fixture; no `teaches_class` write wall |
| SEC-07 | P0 | S/R | S1-07 create_class officeOnly; no approve_work; matcher no INSERT; twins confirm | Static + RPC regression |
| SEC-08 | P0 | S | S1-08 keys server-side; verify_jwt; no EXPO_PUBLIC; no train; no Gauth SDK | Config + Edge review |
| SEC-09 | P0 | UI/I | S1-09 attach default Keep private; parked draft only; Confirm; not a grade | UI + RPC |
| SEC-10 | P0 | I | S1-10 ask_messages owner RLS; no data: bytes; no family/audit dump of explain | Serializer + storage fixtures |
| SEC-11 | P1 | I/S | S1-11 open_screen allow-list + enrollment | Student cannot open teacher proposal / keys |
| SEC-12 | P1 | S | S1-12 Explain on demand; prompt hygiene; no full page in logs | Prompt fixture + Edge |
| SEC-13 | P1 | S | S1-13 token-only /parent never Ask/Explain/Help | Route + API review |
| SEC-14 | P1 | S | S1-14 askActorSystemLine non-overridable; OCR cannot jailbreak Approve tools | Unit + integration |
| SEC-15 | P0 | I | S1-15 (G4) separate Help Edge; student JWT; enrollment; help_mode re-read | Only when G4 ships |
| SEC-16 | P0 | I | S1-16 (G4) Help denied on graded captures; default off; no bulk key | Only when G4 ships |
| SEC-17 | P0 | I | S1-17 (G4) attempt gate; parent deny; teacher does not run Help as child | Only when G4 ships |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied/expanded from GAUTH-S1 §2.3 — required evidence set when CEO says send:

1. Student JWT: image attachment dropped; graded-solve intent → refuse card; **no** vendor call with homework body; no `explain_capture` / `solve_photo`.
2. Parent JWT: same refuse; no extract; token-only `/parent` cannot Ask.
3. Teacher of class A cannot explain class B capture (before signed URL).
4. Office JWT without `class_teachers` denied Explain; `explain.manage` is **none** for office/student/parent.
5. Family payload omits `explain_draft`, extract JSON, `draft_score`, originals paths.
6. Explain cannot write `approved_score`; no `approve_work` tool.
7. `create_class` still officeOnly; matcher never INSERT student; twin name does not auto-bind.
8. Client + Edge `askToolPolicy` twins; unknown tool denied.
9. Attach-as-note copies parked draft only; default Keep private.
10. Dual-hat parent seat denied extract; teacher seat OK on taught class only.
11. KEYGRADE: score-key still pure; Explain reads extract when present.
12. Capture → Approve desk path unchanged; one `/ask` only.
13. (G4) Help Edge: enrollment + help_mode re-read; graded capture denied; attempt gate; revoke mid-flight.
14. (G4) No Help as Ask tools; no bulk key in client.

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| Ask refuse / vision drop | Edge integration with mock vendor counter (assert zero completion on refuse) |
| Ask policy | Unit tests on client + Edge twin maps (`explain.manage` matrix) |
| Explain Edge | JWT fixture matrix + signed-URL timing (authz before fetch) |
| Family DTO / RLS | Field-allowlist tests; grants review |
| KEYGRADE join | Unit: Explain input prefers extract; score-key pure |
| Attach / notes | UI + RPC: parked draft copy; status noted ≠ approved grade |
| Practice Help (G4) | Separate Edge fixtures; attempt gate unit |
| Desk regression | R: capture → match → Approve unchanged |
| TEACH-UX | R: still one `/ask`; chip ≠ SQL authz |

### 3.4 Dogfood script (after CEO send — not this ticket)

1. Teacher opens keyed proposal → Explain on demand → draft steps → Keep private → family device sees no dump.
2. Teacher Attach as note with Confirm → student sees only intended note (if any), not full extract JSON.
3. Teacher Ask chip “Explain missed items” with capture bound → parks draft; cannot Approve from Ask.
4. Student pastes tonight’s quiz into Ask → refusal card; no solution text; Open practice if assigned.
5. Student attaches photo to Ask → server drops image; same refusal.
6. Parent seat dual-hat → cannot open extract; teacher seat on same account can on taught class.
7. Office seat → no Explain tools.
8. (G4) Practice with Help=Hints → ladder; switch assignment to graded capture → Help denied; teacher sets Off mid-flight → next hint refuses.
9. Attempt KEYGRADE path: script score still drives right/wrong; Explain does not change total.
10. Confirm no Snap FAB on student home; Capture still submit.

### 3.5 Regression guards (non-acceptance if broken)

| ID | Sev | Guard |
|---|---|---|
| R-01 | P0 | Desk grade loop (capture → match → Approve) unchanged |
| R-02 | P0 | Nothing becomes a grade from Explain / Ask / Help |
| R-03 | P0 | Matcher still never inserts a student |
| R-04 | P0 | `create_class` remains officeOnly; no Ask class-create |
| R-05 | P0 | KEYGRADE `score-key` remains award path; no LLM totals as grades |
| R-06 | P0 | No `EXPO_PUBLIC_*` model keys; no third-party cheat SDK |
| R-07 | P0 | One `/ask` — no ClassTabs/header Snap solve surface |
| R-08 | P1 | `assignments.manage` student `own` not reused for explain |
| R-09 | P1 | S1 thumbs / originals private rules unchanged for list UIs |
| R-10 | P1 | Ask history 90-day purge / owner RLS preserved |

### 3.6 Future loop process (when Chuck says send)

#### 3.6.1 Recommended sequencing

| Phase | Owner pattern | Must produce |
|---|---|---|
| P0 Policy (G0+G3) | kelyra-qa-loop or small policy patch | SEC-01/03/07/08; S-01…S-06; RF-*; refusal card |
| P1 Explain (G1) | kelyra-qa-loop | T-*; EX-*; OR-*; SEC-02/04/05/06/09/10 |
| P2 help_mode field (G2) | small | Default off; Assign chips; no student UI required |
| P3 Practice Help (G4) | kelyra-qa-loop | S-12…S-18; SS-04…07; SEC-15…17 |
| Security pass | Loop security + this matrix | All P0 SEC rows named |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

Suggested CEO order (PM): KEYGRADE K0/K1 → G0 refuse → G1 Explain → G2/G4 Help. G0 may ship first if Explain waits.

#### 3.6.2 Evidence package (minimum for CoS when shipping)

1. Automated tests mapped to matrix IDs (T/S/P/O/X/RF/OR/EX/SS/SEC/R).
2. JWT fixtures: teacher, other teacher, student, parent twin, office, dual-hat both seats, anon.
3. Vendor-call counter proof on student/parent refuse path (zero completion with stem).
4. Diff statement: no score write from Ask; no assignments.manage copy; no Snap tab; policy twins.
5. Dogfood notes DF-1…DF-10 (as applicable to cut).
6. Open P1/P2 waivers explicitly named — none silent.
7. Screenshots optional **in addition to** JWT/vendor evidence — never instead of.

#### 3.6.3 Recurring defect watch (post-ship)

1. Prompt-only refuse that still sends homework to the model  
2. `explain.manage` copied from `assignments.manage` (student own)  
3. Family `SELECT *` / RPC adding `explain_draft` “for later”  
4. Signed URL minted before `class_teacher_of`  
5. Dual-hat OR (`class_teacher_of OR parent_of`)  
6. Help registered as Ask tools / graded capture inherits On  
7. Attach-as-note auto or model-bubble copy  
8. Explain used as score-key substitute  
9. Second Ask / Snap student surface creep  
10. `body.role` trusted again  

---

## 4. Acceptance

**Audience:** CEO / Chief of Staff. **This ticket is not a send.**

### 4.1 This ticket (GAUTH-Q1)

| Criterion | Status |
|---|---|
| `notes/company/gauth-kelyra-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in GAUTH-P1 / A1 / S1 (no invented product law) | **Met** |
| P0 matrix covers hats, refuse cheat, Explain vs snap-solve, KEYGRADE order, GAUTH-S1-01…14 | **Met** |
| G4 Practice Help rows present but scoped as v1.1 (S1-15…17) | **Met** |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| Future loop process + evidence package | **Met** (§3.6) |
| No app code, SQL, migrations, Edge, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

### 4.2 Explicit non-acceptance (instant fail)

Any of the following in a candidate build = **fail**, regardless of other greens:

1. Student or parent Ask still sends homework photo/paste to the model on a “refuse” path (prompt-only control plane).
2. Student/parent vision left enabled on Ask; partial hint leaked on refuse.
3. `explain.manage` missing or copied from `assignments.manage` (student/parent/office non-`none`).
4. Family can SELECT extract / `explain_draft` / `draft_score` / originals (column leak or fat RPC).
5. Signed URL or image fetch before `class_teacher_of` + capture∈class.
6. Ask/Explain writes `approved_score` or registers `approve_work` / `grade_photo` / `solve_photo`.
7. `create_class` reachable from Explain/Help/Ask on teacher seat; matcher inserts a student.
8. Dual-hat parent seat reads extract; `body.role` / `body.tools` trusted.
9. Practice Help as Ask tools; Help On on graded original captures; bulk key in client; no attempt gate.
10. Attach-as-note auto-publishes full solutions or copies model bubble instead of parked draft.
11. Explain substitutes for `score-key` / LLM totals become grades.
12. Student Snap & Solve tab / Gauth SDK / second Ask surface.
13. `EXPO_PUBLIC_*` model keys or train-on-student-work flag.
14. Implementation started without CEO written **send**.
15. Developers self-certify without this plan + loop evidence.

### 4.3 Gate status

| Item | Status |
|---|---|
| Spec pack on disk (P1, A1, S1, R1) | Yes |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for Gauth-like Ask | **Forbidden** until CEO send |
| Self-certify by developers | **Forbidden** |
| Eng staffing | **Hold** — prefer G0 refuse first, then G1 Explain after send |

### 4.4 Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| CEO bar / no cheat app | L1, SS-*, RF-*, §4.2 |
| Three runtimes | L2, SS-04, SEC-15 |
| KEYGRADE scripts award | L3, OR-*, R-05 |
| Approve wall | L4, T-01, EX-*, R-02 |
| Refuse before vendor | L5, S-01…S-05, SEC-01, RF-03 |
| `explain.manage` not assignments.manage | L6, EX-01…03, SEC-02, O-04 |
| Family never SELECT draft | L7, S-07, P-02, EX-07, SEC-04 |
| Seat wall / dual-hat / twins | L8, X-*, SEC-06, O-* |
| No class-create / matcher insert | L9, O-03, RF-04, R-03/04, SEC-07 |
| Practice Help integrity | L10, S-11…S-18, SS-05…07, SEC-15…17 |
| One Ask / no Snap tab | L11, S-06, RF-06, R-07, SS-01 |
| Keys / no SDK / on-demand | L12, SEC-08/12, T-04 |
| G0/G1/G3 v1 cut | §0.3, §3.6.1 |
| GAUTH-S1 must-fix | SEC-01…17 |
| Teacher Explain UX | T-01…T-14, EX-08/12 |
| Parent published-only | P-01…P-07 |

### 4.5 Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not “Explain looks Gauth-y.”
2. **Refuse-before-vendor** and **family draft omit** are P0 equal to Explain UI polish.
3. **`explain.manage` ≠ `assignments.manage`** is a hard copy-paste fail (AVG lesson).
4. G4 Practice Help is specified for integrity but **not required** to pass a G0+G1+G3 cut.
5. GAUTH-S1 must-fix are incorporated by reference as mandatory future loop cases.
6. Plan only — no code, no loop, no SQL, no git push from this card.

### 4.6 Open issues (do not block this plan; still block ship if unresolved at send)

| # | Issue | Owner at send |
|---|---|---|
| 1 | Default Help mode class-wide: Off (recommended) vs Hints | PM / CEO |
| 2 | Explain auto-run vs on-demand (architect/security: **on demand**) | PM / CEO — plan assumes on demand |
| 3 | Teacher-approved Explain as `parent_sentence` seed vs teacher-only | PM / CEO |
| 4 | G11 voice tutor permanently out? (PM: out — keeps L10) | CEO |
| 5 | Ship G0 refuse as hardening-only before Explain UI? | CEO / CoS sequencing |
| 6 | A1 must absorb S1 gaps (no vision; matrix none; column omit; body.role; attach default) before build | Architect (GAUTH-S1 §0) |

### 4.7 Sources

- GAUTH-P1 `notes/company/gauth-kelyra-plan.md`
- GAUTH-A1 `notes/company/gauth-kelyra-architecture.md`
- GAUTH-S1 `notes/company/gauth-kelyra-security.md`
- GAUTH-R1 research (context)
- KEYGRADE-A1 join (scripts award)
- Live ground: `askToolPolicy.ts` (+ Edge twin), `ask-assistant`, ui-design §12, AGENTS.md
- Prior QA plan shape: `notes/company/class-landing-acceptance.md`, `teacher-ux-acceptance.md`

---

**RECOMMENDED NEXT ACTION:** CoS/CEO review of the Gauth pack (plan + architecture + security + this acceptance). **Do not** implement. **Do not** run kelyra-qa-loop. Hold `senior-developer` until Chuck says send. If approved, prefer **G0 refuse hardening** then **G1 teacher Explain**.

### Handoff

- **OBJECTIVE:** Release-level acceptance plan for Gauth-like Ask v1 (evidence contract if CEO later says send).
- **CONTEXT:** GAUTH-P1/A1/S1; refuse cheat; teacher Explain; KEYGRADE scripts first; Practice Help later.
- **WORK PERFORMED:** Wrote `notes/company/gauth-kelyra-acceptance.md` (laws L1–L12, hat/refuse matrices, Explain vs snap-solve, S1-01…17 evidence map, process, non-acceptance, gate).
- **VERIFICATION:** File on disk; no SQL; no app code; no kelyra-qa-loop.
- **RESULT:** Plan only — ready for CEO/CoS; not implementation.
- **OPEN ISSUES:** §4.6
- **ESCALATION NEEDED:** No unless CEO rejects refuse-before-vendor or demands student Snap solve.
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing and qa-loop.
