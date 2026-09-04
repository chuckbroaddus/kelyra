# GAUTH-P1: Gauth-like capabilities inside Kelyra AI (hats, refuse cheat)

**Date:** 2026-09-03  
**Author:** product-manager (Kelyra)  
**Card:** `t_f9f96bca` · Parent research: `t_ab6fe8fd`  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/gauth-research.md` (GAUTH-R1, 2026-09-03)  
**Also grounded in:** `notes/company/photo-key-grading-plan.md` (KEYGRADE-A1), `notes/company/photo-key-grading-research.md`, `docs/mvp.md` (M2–M10, L10 out), `docs/vision.md` (teacher last click; no student chat tutor in MVP), `docs/ui-design.md` §12 Ask hard limits, live `scan_answer_key` → confirm → `create_assignment`, Capture → evaluate → Approve.

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **KEYGRADE (scripts first)** | Photo of student work + teacher key → extract marks → **deterministic score draft** → teacher Confirm → **Approve** | Not ZipGrade as a separate product; not LLM-as-grader; not auto-publish |
| **Explain (teacher)** | After key match or on freeform capture: **why this mark / what went wrong / how to re-teach** in numbered steps the teacher can edit | Not a student-facing solve dump; not a grade |
| **Practice Help (student, opt-in)** | On **assigned practice only**, when the **teacher allows**: hint → next step → check-my-work against **this set’s key or worked example** | Not open homework solver; not graded capture bypass; not Gauth clone |
| **Ask (all hats)** | Role-scoped assistant inside Kelyra | Never Approves, never invents students/classes, never unsupervised answer dump on graded work |

**CEO bar (from GAUTH-R1):** Replicate *equivalent capabilities* (fast accurate OCR + explainable solve) **inside Kelyra AI functions**. Never a ByteDance-style consumer cheat app. Never a reskin.

**Join rule with KEYGRADE:** Scoring is **scripts first** (`score-key` pure function). Generative step-by-step is **explanation / pedagogy / practice coach**, gated by hat + teacher policy — never the award step.

---

## 1. Problem statement (grounded)

Gauth wins consumer mindshare with: phone snap → OCR → step-by-step answer in seconds. Schools hate the same loop when it is **unsupervised solve of graded work** (integrity + ByteDance/FERPA posture).

Kelyra already owns the **right inversion**:

1. Teacher (or student under class link) **captures** work.  
2. Matcher files by spoken name; **never invents a student**.  
3. AI **drafts**; teacher **Approves** before anything is a grade.  
4. Short **practice** closes the gap (M7–M8), not an open tutor chat (vision L10 / mvp L10).

Gap today: when a key exists, `evaluate-homework` still leans generative for score+gaps; KEYGRADE-A1 fixes the **award** path. Teachers still lack **Gauth-quality explain** on the draft (“show the correct path for item 4”). Students still lack a **safe** self-check on practice without opening a third-party solver.

**This plan fills explain + optional practice coach. It does not open a student homework solver.**

---

## 2. Capability map — Gauth feature → Kelyra posture

| Gauth capability | Kelyra equivalent | Hat | v1? | Notes |
|---|---|---|---|---|
| Snap & Solve (open) | **Refuse** on graded / unassigned homework for students | — | — | Integrity red line |
| Photo OCR robustness | Capture + KEYGRADE extract (cheap vision); later CV preprocess | Teacher primary | Join KEYGRADE K0–K1 | Same originals-at-grade-time rule |
| Step-by-step explanation | **Teacher Explain draft** on capture / proposal; editable | Teacher | **v1** | After extract or freeform gap draft |
| Multiple methods | Optional “another way” on teacher Explain only | Teacher | Later | Cost + noise |
| Follow-up chat on problem | Ask with **capture/assignment context** (teacher); practice thread (student opt-in) | Teacher / Student | Teacher v1 · Student later | Persist nothing as grade |
| Question bank 100M+ | **Do not build.** Use teacher key + assigned items as SoT | — | — | Retrieval stays key/assignment scoped |
| Live voice tutor + whiteboard | Out | — | Later / never MVP | Adjacent product |
| Study converter → flashcards | From **approved** materials only | Teacher author → student | Later | Not from live graded stack |
| Human tutor marketplace | Out | — | Never | Not Kelyra |
| Calculator / writing tools | Out of this epic | — | — | Scope creep |
| Student self-check vs key | **Practice Help** against **this practice set** key/worked example | Student | **v1.1** if teacher policy on | Default **off** |

---

## 3. What we refuse (hard non-goals)

Copy this table into any future implementation ticket. Fail closed.

| Refuse | Why | Detection / product gate |
|---|---|---|
| **Unsupervised answer dump on graded work** | Academic integrity; vision “teacher last click” | Student Ask/Capture cannot return full solutions for class assignments with status graded / draft awaiting Approve / planned key columns the student did not author |
| **Student open solve of arbitrary homework photo** | Gauth clone; FERPA-adjacent mess; parent backlash | No student tool `solve_photo` / `snap_solve`. Student camera stays **submit work** / practice entry only |
| **LLM writes `approved_score` or auto-Approve** | Core law | Approve = teacher tap only; Ask never Approves (ui-design §12.4) |
| **Ask “grade this photo” write tool** | KEYGRADE-A1 §5.4 | Scoring = Capture/Edge; Ask may **preview explain**, not write scores |
| **Class create from Ask / Explain / Practice Help** | Teachers do not create classes (office / existing policy) | No `create_class` for teacher seat; unchanged Q7 posture |
| **Matcher invents student from OCR name on page** | Live constraint | Unassigned inbox; spoken/confirmed name only |
| **Family sees item extracts / wrong-answer dumps** | FERPA minimization | Post-Approve cell + parent_sentence only; no per-item AI dump to parent |
| **Training on student work** | Architecture / MVP | Paid adapter; no train flag |
| **ByteDance-style consumer data model** | School posture | School-controlled residency; no third-party homework helper SDK |
| **Replacing KEYGRADE script score with generative total** | Hallucination | `score-key` ignores model totals; extract schema has no `draftScore` |
| **Student Practice Help on work that is still a grade event** | Cheat | Help only on `assignments` / practice sets marked `help_allowed` **and** not the original scored capture |
| **Showing full answer key to student before submit** | Trivial cheat | Self-check reveals **per item after attempt** or **hint ladder**, never whole key upfront (see §6) |

---

## 4. Per-hat user stories

Acceptance is product-level (CEO can judge). Not engineering tickets.

### 4.1 Teacher

**US-T-1 — Keyed grade assist (KEYGRADE join)**  
As a teacher, I photograph a stack of MC/numeric quizzes with a saved key and get a **per-item extract + script score draft** so I only touch residuals and then Approve.  
**ACCEPTANCE:**

- When assignment has key: pipeline is extract → `score-key` → proposal cells; model does not invent the total.  
- No key: unchanged M6 gap draft path.  
- `student_id` may be null → Unassigned; no auto-insert.  
- Nothing family-visible until Approve.  
- Aligns KEYGRADE-A1 K0–K1; this card does not re-spec the score module.

**US-T-2 — Explain draft on captured work**  
As a teacher reviewing a capture (keyed or freeform), I can open **Explain** and see numbered steps: what the student did, correct path for missed items, and a short re-teach note I can edit before it becomes optional student-facing feedback.  
**ACCEPTANCE:**

- Entry points: proposal / student work page / Ask with capture attached (read context).  
- Output is a **draft** (`explain_draft`), not a grade, not auto-posted to student.  
- Teacher actions: **Keep private** · **Edit** · **Attach as teacher note** · **Offer as practice hint seed** (later).  
- Keyed path: explain prefers **key_items + extracted marks** over open solve; scripts remain source of right/wrong.  
- Freeform path: explain may use generative pedagogy but still does not Approve.  
- Phone: skim; web: denser edit (M10).

**US-T-3 — Ask: “why is item 4 wrong?”**  
As a teacher in Ask with class context, I attach or reference a capture and get step-by-step reasoning without leaving the desk.  
**ACCEPTANCE:**

- Ask uses existing gateway; no client keys.  
- Tools: read capture draft + key (class teacher only); **no** write score tool.  
- May suggest gap labels into chat; writing gaps still on student page.  
- Never `create_class`, never Approve, never insert student.

**US-T-4 — Policy for student Practice Help**  
As a teacher, I choose per assignment (or class default) whether students get **Hints only**, **Step-by-step after attempt**, **Check my work**, or **Off**.  
**ACCEPTANCE:**

- Default **Off** (safe).  
- Policy stored on assignment (or class setting with assignment override).  
- Graded original captures never inherit Help=On.  
- Teacher can revoke mid-flight; in-flight student sessions fail closed on next message.

### 4.2 Student

**US-S-1 — Practice Help (opt-in only)**  
As a student on an **assigned practice set** with Help enabled, I can ask for a hint, a next step, or “check my work” **for this set only**.  
**ACCEPTANCE:**

- Available only when `help_mode != off` and set is assigned to me.  
- Hint ladder: (1) conceptual nudge, (2) next step without final answer, (3) worked example for **isomorphic** item if teacher allowed, (4) full item answer only after submit or explicit “reveal after attempt” policy.  
- Check-my-work: compares my response to **practice key / worked example**, not to open web solve.  
- No camera path that solves arbitrary worksheet photos.  
- No access to other students’ work, drafts, or class keys for summative columns.  
- Session does not write grades.

**US-S-2 — Refuse cheat paths**  
As a student, if I try to photo-solve tonight’s quiz or paste a graded exit ticket into Ask, Kelyra refuses with a clear learning-safe message.  
**ACCEPTANCE:**

- Copy tone: firm, not cute: “I can’t solve graded class work. Open your practice set, or ask your teacher.”  
- No partial solution leaked “as a hint” on refused intents.  
- Server-side policy, not only prompt text.

**US-S-3 — Submit work stays submit**  
As a student, camera on homework remains **turn in**, not solve.  
**ACCEPTANCE:** Unchanged student to-do submit; no Snap & Solve chrome on student Capture.

### 4.3 Parent

**US-P-1 — Visibility without cheat tools**  
As a parent, I see approved focus skill, practice assigned/done, and published parent sentence — not a solver, not item-level AI dumps, not drafts.  
**ACCEPTANCE:**

- No parent Practice Help on the child’s graded stack.  
- Optional later: “How to help at home” **one-liner from teacher-approved explain**, never full key.  
- Ask parent role stays read-only on published child facts (ui-design §12.3).

### 4.4 Staff / superintendent

**US-O-1 — No office grade loop**  
As office staff, I do not get teacher Explain/KEYGRADE tools on classes I do not teach; I do not create a parallel Gauth admin.  
**ACCEPTANCE:**

- Explain + score extract require class-teacher (or existing teaches_class) — no `is_staff` bypass.  
- Office Ask does not gain `solve` or `grade_photo` superuser tools.  
- Class create remains office directory flows, not AI.

### 4.5 Dual-hat

**US-D-1**  
As teacher+parent, Practice Help and Explain follow **active seat**. Parent seat cannot open teacher extract JSON for any child.  
**ACCEPTANCE:** Seat switch required; no silent cross-read (same pattern as Diary plan).

---

## 5. UI/UX sketch (no code)

### 5.1 Mental model

```
Gauth (consumer):     Student ──snap──► Solver ──► full steps + answer
Kelyra (school):      Teacher ──capture──► Extract/Score draft ──► Explain draft ──► Approve
                      Student ──practice only──► Help ladder (if teacher On) ──► submit
```

### 5.2 Teacher — proposal / work review (web denser)

```
┌─────────────────────────────────────────────────────────────┐
│ Maya · Exit ticket · Key · 12 items          [Approve] [···]│
├───────────────────┬─────────────────────────────────────────┤
│  [original photo] │  Score draft (script)  10/12            │
│                   │  Item 4  expected  C  extracted  A  ✗   │
│                   │  Item 7  needs you (short)              │
│                   │                                         │
│                   │  [ Explain ]  [ Look again ]            │
│                   │                                         │
│                   │  Explain draft (editable)               │
│                   │  1. …                                   │
│                   │  2. …                                   │
│                   │  Re-teach: …                            │
│                   │  ○ Keep private  ○ Note on record       │
└───────────────────┴─────────────────────────────────────────┘
```

- **Explain** is Secondary/Ghost near Look-again — not a second Approve.  
- Phone proposal: one **Explain** sheet (scroll), edit optional later (S7 territory).

### 5.3 Teacher — Ask chips (additions)

Existing chips stay. Add when capture/assignment context present:

- `Explain missed items on this capture`  
- `Draft re-teach note for Maya’s regrouping gap`  
- `Set practice help: hints only for tonight’s set`

Still forbidden chips / tools: `Solve this worksheet for the student`, `Approve all drafts`, `Create a class`.

### 5.4 Student — practice player Help (v1.1)

```
Practice · Regrouping (5 items)          Help: Hints
─────────────────────────────────────────
Q3  34 + 28 = ?

[ Work area ]

[ Hint ]  [ Check my work ]     (only if policy allows)
─────────────────────────────────────────
Hint 1/3: “Line up the ones place first.”
```

- No floating “Snap solve” FAB.  
- Help panel is in-player, not global Ask solving.  
- Global student Ask: may navigate (“open your regrouping practice”) but refuses graded solve (US-S-2).

### 5.5 Policy control (Assign form)

Answer key chips today: None · Photo · Typed items.  
Add **Student help** chips (default Off):

| Chip | Behavior |
|---|---|
| **Off** | No Help controls on player |
| **Hints** | Ladder steps 1–2 only |
| **Steps after try** | After first attempt on item, allow next-step; final answer post-submit or per-item reveal |
| **Check work** | Compare attempt ↔ practice key; show correct path for wrongs after attempt |

Copy under chips: “Does not apply to graded captures. Students never see the full key up front.”

### 5.6 Refusal UI (student)

Single calm card, not a scold wall of text:

> **Can’t help with that**  
> Graded class work stays between you and your teacher.  
> If you have practice assigned, open it for hints.

Primary: `Open practice` (if any). Secondary: `OK`.

---

## 6. Practice Help design rules (integrity)

1. **Scope lock:** `assignment_id` + `student_id` + `help_mode` checked server-side every turn.  
2. **Attempt-gated reveal:** Full worked solution for an item only after student submitted an attempt for that item **or** teacher chose post-submit review mode.  
3. **Isomorphic examples > identical answers** when generating “another problem like this.”  
4. **No key bulk download** in student client.  
5. **Logging:** teacher-visible “Help used: 3 hints on Q2” on practice row (v1.1+) — transparency, not surveillance creep; no keystroke capture.  
6. **Parent:** no solver; optional count “used hints” later if teacher publishes.

---

## 7. Join with KEYGRADE (scripts first vs generative)

| Concern | Owner | Generative allowed? |
|---|---|---|
| Right/wrong MC/numeric | `score-key` TS | **No** |
| Extract marks from photo | Cheap vision | Marks only, no total |
| Short / show-work residual | Teacher or teacher-triggered residual | Draft only |
| **Why wrong / how to fix** | Explain draft | **Yes**, teacher-gated |
| Student practice coach | Practice Help | **Yes**, policy-gated, not for award |
| Freeform M6 gaps | evaluate-homework today | Yes, still Approve-gated |

**Ordering law:** Never call Explain as a substitute for `score-key`. Explain **reads** score/extract output when present.

```
Capture
  ├─ has key? ──yes──► extract → score-key → proposal
  │                      └─ optional Explain (teacher)
  └─ no key ──► gap draft (M6) → proposal
                 └─ optional Explain (teacher)

Practice (student)
  └─ help_mode ──► hint ladder / check-my-work
       (never writes approved_score)
```

---

## 8. v1 vs later

### v1 (needed for CEO “Gauth-like inside Kelyra” without cheat)

| ID | Deliverable | Depends |
|---|---|---|
| **G0** | Product law + refuse list implemented as **Ask/Edge policy text + tool denylist** (student solve intents; no grade write tools) | Live Ask policy |
| **G1** | Teacher **Explain draft** on proposal/student page (and Ask read-path) for keyed + freeform captures | Capture draft exists; KEYGRADE extract optional but preferred when key |
| **G2** | Assign form **Student help** chips stored; default Off; no student UI yet if chips only | Assign schema additive field |
| **G3** | Honest empty states / refusal copy student Ask | G0 |

v1 may ship **G0+G1+G3** even if G2 waits with Practice Help UI.

### v1.1 (should-have)

| ID | Deliverable |
|---|---|
| **G4** | Student Practice Help player UI (Hints / Check work) honor G2 policy |
| **G5** | Teacher “Help used” meta on practice row |
| **G6** | Explain → optional “seed practice hints” without exposing full summative key |

### Later (desired, not this epic)

| ID | Deliverable |
|---|---|
| **G7** | Conversational follow-up thread on a single capture (teacher) |
| **G8** | Multi-method explanations |
| **G9** | Flashcards from **approved** lesson materials only |
| **G10** | AI-use suspicion signals for teachers (integrity assist) — careful UX, no false accuser |
| **G11** | Voice tutor / whiteboard | **Out unless CEO reopens L10** |

### Explicitly never (this product)

- Student Snap & Solve home tab  
- 100M question bank crawl  
- Human tutor marketplace  
- Auto-publish explain to parents as full solutions  
- Office bulk-solve  
- Training on student pages  

---

## 9. Phased plan (staffing later — do not start loops)

Do **not** launch `kelyra-qa-loop` from this list until Chuck says send.

| Phase | Work | Staff | Notes |
|---|---|---|---|
| **P0 Policy** | Codify refuse list in Ask tool policy + prompts; student intent refuse; no new score write tools | small loop / policy patch | Safe even if Explain UI waits |
| **P1 Explain UI** | Teacher Explain draft surface + Edge draft endpoint; edit; keep private vs note | `kelyra-qa-loop` after yes | Join KEYGRADE confirm page |
| **P2 Help policy field** | Assign chips + RLS read for student later | small | Default off |
| **P3 Practice Help** | Student player + server ladder + attempt gate | `kelyra-qa-loop` | After P2; integrity tests mandatory |
| **P4 Transparency** | Help-used meta; optional parent one-liner from approved explain | later | |
| **Join KEYGRADE** | K0–K1 score path parallel tracks; Explain consumes extract | architect plan already | Do not block Explain forever on full KEYGRADE if freeform explain ships first — but keyed explain should prefer script truth |

**Suggested CEO sequencing:** KEYGRADE K0/K1 (correct grades) → G0 refuse policy → G1 teacher Explain → G2/G4 Practice Help.  
Integrity refuse (G0) can ship first if Explain is delayed.

---

## 10. Security / FERPA / integrity checklist

| Rule | v1 requirement |
|---|---|
| Model keys server-side | Explain + Help via Edge / `ai:dev` only |
| JWT role checks | Teacher Explain: class teacher. Student Help: self + assignment enrollment + help_mode |
| No `is_staff` bypass | Office cannot explain/grade other teachers’ captures via Ask |
| Draft isolation | `explain_draft`, extract JSON, `draft_score` never student/parent SELECT |
| Approve wall | Unchanged |
| PII in prompts | First names / opaque ids; no IEP; no full roster dumps |
| Logging | No full student page bodies in plain function logs |
| Integrity | Attempt-gated reveal; refuse graded solve; default Help off |
| Storage | Originals private; lists thumbs (S1); Explain uses same asset rules as review |

---

## 11. Success metrics (product, not vanity)

| Signal | Good | Bad |
|---|---|---|
| Teacher time on keyed stack | Faster confirm + fewer “what was right?” side channels | Teachers paste papers into ChatGPT outside Kelyra |
| Student third-party solver use | Down on nights with Help=On practice | Up because Help is Off and Ask refuses without practice alternative |
| Integrity incidents | No “Kelyra gave me the quiz answers” reports | Any path that dumps summative keys pre-submit |
| Approve discipline | Explain never correlates with skipped Approve | Draft explain auto-shown as grade |

---

## 12. Open questions for CEO (non-blocking to accept this direction)

1. **Default Help mode** class-wide: Off (recommended) vs Hints?  
2. **Explain auto-run** on every capture vs **on demand** only (recommended on demand for cost)?  
3. Should teacher-approved Explain ever become the **parent_sentence** seed, or stay teacher-only?  
4. Is **G11 voice tutor** permanently out, or a 2027 wedge? (PM recommends out — keeps L10.)  
5. Ship **G0 refuse policy** immediately as a hardening patch separate from Explain UI?

---

## 13. Compatibility with live product laws

- Phone captures; web reviews / assigns / grades.  
- Matcher never inserts a student.  
- Nothing is a grade until Approve.  
- Teachers do not create classes via AI.  
- Ask never Approves / never auto-deletes.  
- KEYGRADE: scripts award; AI extracts or explains.  
- MVP out: student chat tutor as open product — Practice Help is **narrow, assignment-scoped, teacher-gated**, not L10 reopened as Gauth.

---

## 14. Recommended next action

**CEO / CoS review** this plan + GAUTH-R1 + KEYGRADE-A1 together.

| Decision | Next |
|---|---|
| **Direction yes** | CoS notes sequencing (KEYGRADE vs G0/G1). ARM-grant implementation only when Chuck says send. Prefer single focused tickets, not a mega-loop. |
| **Explain only first** | Ticket: Teacher Explain draft (G1) + Ask refuse (G0). Defer Practice Help. |
| **Hardening only** | Ticket: G0 student/teacher Ask refuse + denylist. No UI chrome. |
| **No** | Archive plan; keep research. Do not staff senior-developer. |

**Do not** staff `senior-developer` / `kelyra-qa-loop` from this card.  
**Do not** git push until Chuck asks.

---

## 15. Handoff summary

| Field | Content |
|---|---|
| **OBJECTIVE** | Ideate Gauth-like OCR+explain inside Kelyra without cheat app |
| **ARTIFACT** | `notes/company/gauth-kelyra-plan.md` |
| **DECISIONS (PM)** | Scripts score (KEYGRADE); generative = teacher Explain + optional student Practice Help; default Help off; refuse open student solve; no class-create; Approve wall holds |
| **NON-GOALS** | Gauth clone, question bank, voice marketplace tutor, LLM totals as grades |
| **v1** | G0 refuse policy, G1 teacher Explain, G3 refusal UX; G2 policy field ready |
| **Later** | G4–G6 Practice Help + transparency; G7+ conversational / flashcards |
| **ESCALATION** | None for PM; CEO product call on §12 questions |
| **RECOMMENDED NEXT** | CEO/CoS review; no implementation staff until Chuck says send |
