# GAUTH v1.1 — implement (CEO send 2026-09-04)

CEO Chuck: finish the rest of the GAUTH track until daily caps. SuperGrok daily remaining is 0%. This card burns **grok-bot** only (`kelyra-bot-build-loop`).

v1 already live (G0+G1+G3+G2 field): PR #4, SQL `gauth_v1`, Edge `ask-assistant` + `explain-capture`. Do not regress those.

Parked epic `t_6c629bf8` / research `t_367f3c0a` stay parked — **do not parent this worker onto them**.

Paper (follow; apply CEO override below):
- `notes/company/gauth-kelyra-plan.md` §6 G4, §8 v1.1 G4–G6
- `notes/company/gauth-kelyra-architecture.md` §3.5 Practice Help (three runtimes stay uncollapsed)
- `notes/company/gauth-kelyra-security.md` S1-15…17
- `notes/company/gauth-v1-request.md` (v1 contract)

## CEO override (parent co-teacher)

Parents of **linked children** get **full GAUTH help** (Explain / step-by-step / check-my-work) when the parent is stuck helping homework. This **overrides** v1 “parent: no solver / no extract / no Explain.”

- Parent **seat** only. Dual-hat teacher+parent: parent seat gets this; teacher seat unchanged.
- **Linked children only.** Twins: per-child, never mix siblings.
- Student **seat** still G0/G3 refuse-cheat. No student Snap & Solve tab. Student camera = submit.
- Ask never Approves, never writes `approved_score`, never `create_class`. Matcher never inserts a student.
- Office without `class_teachers` row still no teacher Explain on others’ classes.
- Other families: none.

## In scope (must)

### P — Parent co-teacher Explain + Ask

- Parent JWT may run Explain / read extract / Ask step-by-step **only** for a student they are linked to (`parent_students` / existing family graph — fail closed).
- Reuse Explain Edge if possible; wall is `parent_of(student_id)` **or** `class_teacher_of` (teacher path unchanged).
- Family DTOs that leak to *other* parents stay omit; this parent may see Explain for *their* child.
- Token-only `/parent` observer still no Ask (GAUTH-S1-13) unless this is a real parent login.

### G4 — Student Practice Help (separate Edge, not Ask tools)

- Honor `assignments.help_mode` (`off` default). In-player Hints / Steps after try / Check work.
- Every turn: JWT student == `student_id`; enrollment; re-read `help_mode` (revoke fail-closed); practice set only (not graded original capture); attempt-gated reveal; no bulk key in client.
- Ladder: (1) conceptual (2) next step no final (3) isomorphic if allowed (4) full item after gate.
- Check-my-work vs **this set’s** key/worked example.
- Never writes `approved_score`.

### G5 — if it fits without blowing the card

Teacher-visible “Help used” count on the practice row. No keystroke log. Skip rather than stall G4/P.

## Out of scope

G6 seed hints from Explain; G7–G11; student Snap tab; 100M bank; LLM award totals; git commit/push from worker (PR expected). G4 student Help does **not** unlock student graded-solve Ask.

## Tests

- Student still refuse-before-vendor on graded solve.
- Parent of linked child can Explain/Help that child; unlink / other family denied.
- Twins not mixed.
- Dual-hat parent seat ≠ teacher extract for unrelated classes.
- help_mode off → no Help; revoke mid-flight → next turn refuse.
- Attempt gate; no bulk key; no approved_score write.
- No `ask_user_question`.

## Constraints

ENGINE grok-bot / WORKFLOW kelyra-bot-build-loop / POOL grok-bot. No Mac grok / kelyra-qa-loop. Preserve dirty tree. No EXPO_PUBLIC_*.

## Acceptance

Parent co-teacher help for linked children + G4 player/Edge. Student cheat walls intact. bot-build passed or escalated with named P0/P1. PR URL in close summary.
