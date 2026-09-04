# GAUTH-A1: Architecture — Gauth-like Ask

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** GAUTH-A1 `t_89321cde` · Plan: `notes/company/gauth-kelyra-plan.md` (GAUTH-P1) · Research: `notes/company/gauth-research.md` (GAUTH-R1)
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `docs/ui-design.md` §12 Ask hard limits; `docs/data-model.md` (`ask_threads` / `ask_messages`); `src/lib/ai/askToolPolicy.ts` + Edge twin; `askPrompt.ts`; `scan_answer_key` → confirm → `create_assignment`; Capture → `evaluate-homework` → Approve; KEYGRADE-A1 (`notes/company/photo-key-grading-plan.md`); `class_teacher_of` vs `teaches_class`.

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Law

| Surface | Job | What it is not |
|---|---|---|
| **Ask** (`/ask`, one surface) | Role-scoped assistant. Teacher: explain + policy chips. Student: refuse graded solve; navigate to practice. Parent: published facts only. | Not Gauth. Not a second AI tab. Never Approves. Never `create_class` on teacher seat. |
| **Teacher Explain** | Numbered why-wrong / correct path / re-teach **draft** on a capture | Not a grade. Not auto-posted. Not `score-key`. |
| **KEYGRADE (join)** | Extract marks + **script** score draft | Not this epic. Explain **reads** extract; never substitutes. |
| **Practice Help** | Assignment-scoped hint ladder / check-my-work when teacher On | Not Snap & Solve. Not global student Ask. Not on graded captures. |

**CEO bar (GAUTH-R1 / P1):** Equivalent *capabilities* (fast OCR already on Capture; explainable steps) **inside Kelyra AI**. Never a ByteDance consumer cheat app. Never a reskin.

**Join KEYGRADE:** Award = `score-key` (TS). Generative = Explain / Practice Help only. Ask never writes `approved_score`.

**Hats:** Active seat is the wall. Dual-hat teacher+parent cannot read extract JSON from parent seat. Twins: name ambiguity → confirm; never pick; matcher never INSERT `students`.

## 1. Non-goals

| Non-goal | Why |
|---|---|
| Student Snap & Solve / `solve_photo` tool | Integrity red line. Camera on student = submit / practice entry. |
| Unsupervised full solutions on graded / awaiting-Approve work | Vision teacher-last-click. Server refuse, not prompt-only. |
| LLM totals or Ask Approve | Core law. ui-design §12.4. |
| Ask write-score / `grade_photo` tool | KEYGRADE-A1 §5.4. Scoring stays Capture/Edge. |
| Teacher `create_class` from Ask / Explain / Help | Q7 / officeOnly. Unchanged. |
| Matcher invents a student from OCR on the page | Unassigned inbox. Spoken/confirmed name only. |
| 100M question bank / crawl | Retrieval = this assignment’s key + items. |
| Voice tutor + whiteboard (G11) | Reopens L10. Out unless CEO says otherwise. |
| Human tutor marketplace | Not Kelyra. |
| Family SELECT of extract / `explain_draft` / `draft_score` | FERPA. Post-Approve cell + `parent_sentence` only. |
| Parent Practice Help on the child’s graded stack | Cheat + dump. |
| Office `is_staff` / `teaches_class` bypass for Explain | Use `class_teacher_of`. Office Ask gets no solve/grade_photo. |
| Training on student pages | Paid adapter; no train flag. |
| New Ask surface / ClassTabs Ask / header Ask | TEACH-UX-A1: one `/ask`; bind `classId`. |
| Replacing KEYGRADE with generative award | Hallucination. |
| Full answer key to student before attempt/submit | Trivial cheat. |
| Persist Ask chat as a grade | `ask_messages` owner-only; never a submission cell. |
| Client model keys / `EXPO_PUBLIC_*` | Edge / `ai:dev` only. |
| kelyra-qa-loop / SQL / git push from this card | Spec only. |

## 2. Capability map (Gauth → Kelyra)

Invert the consumer loop. Do not add a product.

```
Gauth:   Student ──snap──► cloud OCR + bank/GPT ──► full steps + answer
Kelyra:  Teacher ──Capture──► extract / score-key ──► Explain draft ──► Approve
         Student ──practice only──► Help ladder (if On) ──► submit
         Student Ask ──graded solve intent──► refuse (server)
```

| Gauth | Kelyra | Hat | When | Architecture note |
|---|---|---|---|---|
| Snap & Solve (open) | **Refuse** | Student | v1 (G0) | No tool. Intent gate on Ask + no camera solve chrome. |
| Photo OCR | Capture + KEYGRADE extract | Teacher | Join K0–K1 | Same originals-at-grade-time; not a second OCR stack. |
| Step-by-step | **Explain draft** | Teacher | v1 (G1) | Edge `explain-capture`; Ask tool reads only. |
| Multiple methods | Optional “another way” | Teacher | Later (G8) | Cost. |
| Follow-up chat | Ask with capture bound | Teacher | v1 read; G7 thread | Persist nothing as grade. |
| 100M bank | **Do not build** | — | Never | Key + assigned items are SoT. |
| Voice + whiteboard | Out | — | Never unless CEO | L10. |
| Study converter | Approved materials only | Teacher → student | Later (G9) | Not live graded stack. |
| Human tutors | Out | — | Never | |
| Calculator / writing | Out of this epic | — | — | |
| Self-check vs key | **Practice Help** | Student | v1.1 (G4) | In-player Edge, not Ask tools. Default Off. |

**Three runtimes (do not collapse):**

1. **Ask gateway** (`ask-assistant`) — hats, tool allow-list, refuse copy. One `/ask`.
2. **Explain Edge** — teacher JWT + `class_teacher_of` **before** signing originals. Writes `explain_draft` only.
3. **Practice Help Edge** (v1.1) — student JWT + enrollment + `help_mode != off` every turn. Never writes scores.

**Data sketch (not a migration).** Prefer additive columns; no new product tables in v1.

| Field | Home | Notes |
|---|---|---|
| `explain_draft` jsonb | Capture / proposal row (implementer: `captures` or existing draft blob) | `{schema_version:1, steps[], reteach, source: keyed\|freeform, capture_id}`. Teacher-only. Family never SELECT the table (or column omitted from any family RPC). NULL until on-demand Explain. |
| `explain_status` | same | `none` \| `draft` \| `noted` (attached as teacher note). Never `approved` as a grade. |
| `help_mode` | `assignments` | `off` \| `hints` \| `steps_after_try` \| `check_work`. Default **`off`**. Graded original captures **must not** inherit On. |
| Help-used meta | practice submission later | Count of hints per item. No keystroke log. v1.1 (G5). |

YAGNI: no `gauth_sessions` table. Practice Help sessions are ephemeral Edge turns keyed by `assignment_id` + `student_id`. Ask history stays `ask_threads` / `ask_messages`.

**Ordering law:**

```
Capture
  ├─ has key? ──yes──► extract → score-key → proposal
  │                      └─ optional Explain (reads extract; no totals)
  └─ no key ──► evaluate-homework gap draft → proposal
                 └─ optional Explain (pedagogy; still not Approve)

Ask (teacher) ── explain_capture (read + park draft) ── no Approve tool
Ask (student) ── no solve tools; refuse graded; may open_screen to practice
Practice Help ── never approved_score
```

## 3. Authz / tool policy

**SoT:** identical maps in `src/lib/ai/askToolPolicy.ts` and `supabase/functions/_shared/askToolPolicy.ts`. Unknown names **denied**. Twin test already exists — keep it.

Do **not** register tools until Chuck says send.

### 3.1 Live walls (unchanged)

| Tool / act | Live gate | This epic |
|---|---|---|
| `create_class` | `officeOnly: true` | Teacher Explain/Help **must not** call it. |
| `add_student` / `link_parent_student` | officeOnly | Unchanged. Matcher never inserts. |
| Approve | Not an Ask tool | Never add `approve_work`. |
| `scan_answer_key` / `create_assignment` | `assignments.manage` | Teacher may still scan keys. Student never. |
| `scan_class_syllabus` | `teacherSeatOnly` + `class_teacher_of` | Pattern to copy for Explain. |
| Family syllabus / average | `familyRead` | No extract, no explain_draft. |

### 3.2 New Ask tools (G1 — teacher only)

| Tool | Policy | Writes | Handler wall |
|---|---|---|---|
| `explain_capture` | `teacherSeatOnly`, capability **`explain.manage`** (new; **not** `assignments.manage`), need `own` | Parks `explain_draft` only | JWT + `class_teacher_of(class_id)` **before** fetching originals. Capture must belong to that class. `student_id` may be null (Unassigned). |
| `discard_explain_draft` | same | Clears draft | same |
| `attach_explain_as_note` | same | Copies edited draft → existing teacher-note field | Confirm in UI; still not a grade |

Office JWT **denied** unless they also have a `class_teachers` row (SQL SoT). Do **not** set `officeOnly`. Do **not** reuse `teaches_class` (office OR). `also_administrator` does not widen.

**Never register:** `solve_photo`, `snap_solve`, `grade_photo`, `approve_work`, `reveal_answer_key`, student `check_work` as Ask tools.

### 3.3 Student Ask (G0) — refuse is server-side

Prompt text is **not** the control plane.

1. **No new student tools** for solve/explain/key.
2. **Intent gate** on `ask-assistant` when `role=student` (and parent): if the turn is “solve this homework / quiz / exit ticket” (photo or paste), return the refusal card **without** calling a generative solve. Do not leak a partial “hint.”
3. Existing student visibility stays ui-design §12.3: own practice + approved focus. **No drafts, no scores, no other students, no keys.**
4. Allowed: `open_screen` to an assigned practice set when one exists. That is navigation, not Help.
5. Student camera path unchanged: **turn in**, not solve. No Snap chrome.

Refusal copy (product, G3):

> **Can’t help with that**
> Graded class work stays between you and your teacher.
> If you have practice assigned, open it for hints.

### 3.4 Parent / office / dual-hat

| Seat | Explain | Practice Help | Ask solve |
|---|---|---|---|
| Teacher (`class_teacher_of`) | Yes, draft | Sets `help_mode` | No student dump |
| Student | No | If enrolled + mode ≠ off | Refuse graded |
| Parent | No | No | No solver; published sentence only |
| Office without teach row | No | No | No grade_photo / explain |
| Dual-hat | Follow **active seat** | Follow seat | Parent seat cannot open extract JSON |

Twins: Ask/Explain must not bind `student_id` from a first name that hits two roster rows. Confirm UI. Same as CAL matcher law.

### 3.5 Practice Help (G4) — not Ask

Separate Edge. Every turn:

- JWT student == `student_id`
- Enrollment on `assignment_id`
- `help_mode` re-read (revoke fail-closed)
- Assignment is practice (not the original scored capture)
- Attempt-gated reveal: full item solution only after attempt **or** post-submit policy
- Ladder: (1) conceptual, (2) next step no final, (3) isomorphic example if allowed, (4) full item after gate
- Check-my-work compares to **this set’s** key/worked example, not open web
- No bulk key in the client

Teacher revoke mid-flight: next message sees `off` → refuse.

### 3.6 Prompts / PII / models

- Keys server-side. grok-4.6 for Ask; cheap vision stays on extract (KEYGRADE). Explain may use grok-4.6 **on demand** (default not auto-run — cost).
- Prompts: first names / opaque ids. No IEP, no full roster dumps, no sibling blend.
- No full page bodies in function logs.
- Originals: same private asset rules as review (S1 thumbs on lists).
- `askActorSystemLine` stays the non-overridable hat line.

### 3.7 Tests (when gated loop runs)

Hat walls; policy twins; unknown tool denied; student `explain_capture` / `solve_photo` false; office without `class_teachers` denied; `create_class` still officeOnly; Explain cannot write `approved_score`; family RPC omits `explain_draft`; help_mode default off; Help on graded capture denied; attempt gate; dual-hat parent seat denied extract; twin name does not auto-bind.

## 4. v1 vs later

Suggested CEO sequence (PM): KEYGRADE K0/K1 → **G0 refuse** → **G1 teacher Explain** → G2/G4 Practice Help. G0 can ship first if Explain waits.

| ID | v1 | Depends |
|---|---|---|
| **G0** | Ask/Edge refuse + denylist (no student solve tools; no grade write tools). Intent gate. | Live Ask policy |
| **G1** | Teacher Explain draft on proposal/student page + Ask `explain_capture` read/park | Capture draft; KEYGRADE extract preferred when key |
| **G2** | Assign `help_mode` chips stored; default Off; student UI may wait | Additive assignment field |
| **G3** | Student refusal card copy | G0 |

v1 may ship **G0+G1+G3** without Practice Help UI.

| ID | v1.1 |
|---|---|
| **G4** | In-player Help honoring G2 (not Ask tools) |
| **G5** | Help-used meta on practice row |
| **G6** | Explain → seed practice hints without summative key |

| ID | Later / never |
|---|---|
| **G7** | Teacher follow-up thread on one capture |
| **G8** | Multi-method explanations |
| **G9** | Flashcards from **approved** materials |
| **G10** | AI-use suspicion signals — careful; no false accuser |
| **G11** | Voice tutor | **Out unless CEO reopens L10** |
| — | Student Snap tab, 100M bank, tutor marketplace, office bulk-solve, train on pages | **Never** |

**UI (no code):** Explain is Secondary/Ghost near Look-again — not a second Approve. Phone: one Explain sheet. Ask chips when capture bound: `Explain missed items on this capture` · `Draft re-teach note` · `Set practice help: hints only`. Forbidden chips: `Solve this worksheet for the student` · `Approve all drafts` · `Create a class`.

**Open (CEO, non-blocking):** default Help Off vs Hints; Explain on-demand vs auto-run (architect: **on demand**); approved Explain as `parent_sentence` seed or teacher-only; G11 out; ship G0 as hardening-only.

**Compatibility:** Phone captures; web reviews. Matcher never inserts. Nothing is a grade until Approve. Teachers do not create classes via AI. Ask never Approves / never auto-deletes. Practice Help is **narrow, assignment-scoped, teacher-gated** — not L10 reopened as Gauth.

## 5. Acceptance

This file is for CEO/CoS review. **No SQL, no app code, no kelyra-qa-loop, no git push.**

| Check | Met |
|---|---|
| Gauth capabilities mapped into Ask + Capture/Explain + later Help | Yes |
| Hats + twins + refuse cheat | Yes |
| Ask never Approves; teachers never `create_class` here | Yes |
| KEYGRADE scripts remain award; generative is explain/help | Yes |
| Tool policy twins named; unknown denied | Yes |
| Implementation | **NO until Chuck says send** |

Do **not** staff `senior-developer` until Chuck says send.
