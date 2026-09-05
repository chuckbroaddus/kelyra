# GAUTH v1 — implement (CEO send 2026-09-04)

CEO Chuck (Hermes CoS): complete the GAUTH track. SuperGrok daily remaining is 0% (`temporary_override max_total_pct=70`, live 74%). This card is **Grok Bot bot-build**, not Mac `grok` / `kelyra-qa-loop`.

Paper trail (read, do not reinvent):

- `notes/company/gauth-kelyra-plan.md` (GAUTH-P1) — product law, refuse table, v1 = G0+G1+G3, optional G2
- `notes/company/gauth-kelyra-architecture.md` (GAUTH-A1) — three runtimes, tools, data sketch, ordering law
- `notes/company/gauth-kelyra-security.md` (GAUTH-S1) — must-fix GAUTH-S1-01…14 (v1); 15–17 only if G4 ships
- `notes/company/gauth-kelyra-acceptance.md` (GAUTH-Q1) — P0 matrix
- `notes/company/gauth-research.md` (context only)

Epic `t_367f3c0a` stays parked. Do not parent this worker onto it.

## Product law (fail closed)

Replicate *equivalent capabilities* (OCR already on Capture; explainable steps) **inside Kelyra AI**. Never a ByteDance consumer cheat app. Never a Gauth reskin. Never a student Snap & Solve tab.

Three runtimes stay uncollapsed: Ask gateway · Teacher Explain Edge · Practice Help Edge (v1.1, **out of this card**).

Award = KEYGRADE scripts (`score-key`) when a key exists. Generative = teacher Explain only in v1. Ask never writes `approved_score`. Nothing is a grade until Approve. Matcher never inserts a student. Teachers do not create classes. `create_class` stays `officeOnly`. No `approve_work` tool. No `EXPO_PUBLIC_*`. No Gauth SDK. Explain **on demand**, not auto-run.

## In scope (must) — G0 + G1 + G3 + G2 field

### G0 — Ask/Edge refuse + denylist

- Student/parent Ask: **no vision**; intent refuse **before** vendor call; no homework body/pixels on refuse path; no partial hint leak (GAUTH-S1-01).
- Never register: `solve_photo`, `snap_solve`, `grade_photo`, `approve_work`, `reveal_answer_key`, student `check_work` as Ask tools.
- Identical maps in `src/lib/ai/askToolPolicy.ts` and `supabase/functions/_shared/askToolPolicy.ts`. Unknown names denied. Ignore `body.role` / `body.tools`.
- Student camera stays **turn in**, not solve. No Snap chrome.

### G3 — Student refusal card

Copy (product):

> **Can't help with that**
> Graded class work stays between you and your teacher.
> If you have practice assigned, open it for hints.

Firm, not cute. Optional `open_screen` to an assigned practice set only (navigation, not Help).

### G1 — Teacher Explain draft

- New cap **`explain.manage`**: teacher `own`; parent/student/office **`none`**. **Not** `assignments.manage`. `teacherSeatOnly`. Handler `class_teacher_of(class_id)` **before** signed URL / fetch originals. Capture must belong to that class. `student_id` may be null (Unassigned). Office JWT denied unless they also have a `class_teachers` row. Do not reuse `teaches_class` (office OR). Dual-hat follows **active seat**.
- Ask tools (teacher only): `explain_capture` (park draft), `discard_explain_draft`, `attach_explain_as_note` (Confirm; default **Keep private**; copy parked draft only; not a grade).
- Edge `explain-capture` (or equivalent): teacher JWT; writes `explain_draft` / `explain_status` only (`none` | `draft` | `noted`). Never `approved` as a grade. Keys server-side; `verify_jwt=true`.
- UI: proposal / student work page + Ask read-path. Phone skim; web denser edit. Teacher: Keep private · Edit · Attach as teacher note.
- Keyed path: explain prefers **key_items + extracted marks** over open solve; scripts remain source of right/wrong. Freeform: pedagogy draft, still not Approve. Do **not** block Explain on full KEYGRADE if extract is missing — freeform still ships.
- Family RPC/view **omits** `explain_draft`, extract, `draft_score`, originals (column omit, not only RLS). Twins: confirm, never pick.

### G2 — `help_mode` field only (no student Help UI)

- Additive `assignments.help_mode`: `off` | `hints` | `steps_after_try` | `check_work`. Default **`off`**.
- Assign form chips stored. Graded original captures must not inherit On.
- **Do not** ship Practice Help player (G4), Help Edge, or S1-15…17 in this card.

## Out of scope

G4–G11, 100M bank, tutor marketplace, student Snap tab, office bulk-solve, LLM award totals, training on student pages, git commit/push from the worker (Grok Bot may open a GitHub PR; Hermes owns merge/SQL apply).

## Tests (must have evidence)

Cover GAUTH-S1-01…14 and GAUTH-Q1 P0 rows that apply to G0/G1/G3/G2. Twin policy maps. Student refuse-before-vendor (no model call). `explain.manage` not `assignments.manage`. Family DTO omit. Dual-hat parent seat denied extract. Office without teach row denied Explain. Attach default Keep private. No `ask_user_question`.

## Constraints

- ENGINE: grok-bot. WORKFLOW: kelyra-bot-build-loop. POOL: grok-bot.
- Do **not** use grok-build / Mac grok / kelyra-qa-loop / author-qa-loop.
- No `ask_user_question`.
- Preserve the dirty tree (TEACH-UX, AVG, splash, etc.). No git reset. No commit/push unless the bot-build close summary is a GitHub PR (expected).
- Model keys server-side only.

## Acceptance

G0+G1+G3 landed; G2 field default off; no G4 UI; loop/bot-build terminal passed or escalated with named P0/P1 only. PR URL in close summary if remote work.

## Suggested FILES/AREAS

`src/lib/ai/askToolPolicy.ts`, `supabase/functions/_shared/askToolPolicy.ts`, `src/lib/ai/askTools.ts`, `src/lib/ai/askPrompt.ts`, `src/lib/school/matrix.ts`, `supabase/functions/ask-assistant/index.ts`, `scripts/ai-dev-server.mjs`, new Edge `explain-capture` (or named equivalent), capture/proposal UI, family DTOs, additive migration for `explain_draft` / `explain_status` / `assignments.help_mode`.
