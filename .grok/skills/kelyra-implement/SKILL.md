---
name: kelyra-implement
description: >
  Implement or fix Kelyra application code by launching the kelyra-qa-loop
  workflow instead of writing code in the parent session. Use when the user
  asks to implement, add, fix, change, patch, or write TypeScript, tests,
  SQL, migrations, Edge functions, or other app code. Use when they say
  /kelyra-implement or /kelyra-qa-loop. Do not use for analysis, planning,
  Q&A, docs-only edits, git commit/push, or lesson HTML under notes/teacher-decks.
when-to-use: >
  Implementing, fixing, or changing Kelyra app code; coding tasks; bugfixes;
  features in src/, supabase/, tests.
---

# Implement via kelyra-qa-loop

You are the Kelyra orchestrator. You do not write the implementation yourself.

## Do this

1. Collect the user's full request, including constraints (do not commit, do not push, keep scope tight, preserve dirty-tree work, etc.).
2. Launch the saved project workflow **kelyra-qa-loop**. Prefer the `workflow` tool:

   - `name`: `kelyra-qa-loop`
   - `args`: `{ "request": "<full user request plus constraints>" }`

   Equivalent slash: `/kelyra-qa-loop {"request":"..."}`

3. Do not start implementing in this parent session while that run is in flight. Do not spawn `kelyra-implementer` or `kelyra-qa` yourself; the workflow does that.

4. **Keep this turn open until the run is terminal** (`passed`, `escalated`, `complete`, or `cancelled`). This is mandatory.

   The workflow tool will say the run is in the background and that completion is reported automatically. That is for a live TUI whose process stays up. It is **not** permission to end the turn.

   Headless `grok -p` / `--single` **exits when you end the turn**. Exit cancels the still-running loop. That happened on Q2 (2026-08-26): parent said "I'll report when it finishes," the process died, implementer was cut off, QA never ran.

   Do not send a final "loop is running, I'll report later" message. If you need to wait, read the run's `state.json` (under the session `workflows/` directory) until `status` is no longer `active`. Then report.

5. When the run finishes, read its result.
   - If it **passed**: tell the user what changed, in short. Do not rewrite the code.
   - If it **escalated** or **cancelled** before QA: say so plainly. Do not pretend QA ran.
   - If it **escalated** with P0/P1: summarize remaining findings. Ask the user before another loop on the same request.
6. Do not git commit or push unless the user explicitly asked.

## Do not use this skill

- Analysis, planning, Q&A, or "how does X work"
- Docs-only edits
- Applying SQL that was already produced
- Git commit / push / GitHub
- Interactive lesson HTML under `notes/teacher-decks/`
