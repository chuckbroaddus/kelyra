# Kelyra agent notes

Product and architecture live in `docs/`. Do not invent features past the tightened MVP.

- Vision: `docs/vision.md`
- MVP + flows: `docs/mvp.md`
- Data model: `docs/data-model.md`
- Stack: `docs/architecture.md`

Rules:

- Phone captures; web reviews, assigns, and grades.
- Model keys stay server-side. Local development uses Grok CLI OAuth (`npm run ai:dev` + `~/.grok/auth.json`). Production Edge Functions use `XAI_API_KEY`. Never `EXPO_PUBLIC_*` tokens.
- A capture may have `student_id` null. The matcher never inserts a student.
- Nothing is a grade until the teacher Approves.
- **Icons:** never invent View-stroke glyphs for chrome. Add or change a recipe in `scripts/build-icons.mjs`, run `npm run icons` (writes `assets/icons/*.png` + `src/components/ui/iconAssets.ts`). Each PNG is cropped to ink, then uniformly scaled so the longest axis fills the same square. `Icon` / `Icon.web` render those assets with tint. New names go on `IconName` too. Full-color brand marks live in `assets/brand/` and render without tint (`KelyraMark`). Do not run them through the white-ink pipeline. School logos go through `cutout-logo` then a local circular punch (`punchSchoolLogo` on web). Grok says whether the mark is a disk; we flood the plate from the edges and clip to the inscribed circle (r ≤ 0.5) so square-photo corners cannot stay. Re-upload the logo after changing the cutter.

## Coding tasks: kelyra-qa-loop

The parent session is the orchestrator. It does not write application code itself.

For any request that implements, fixes, adds, or changes application code (TypeScript under `src/`, tests, Supabase SQL/migrations, Edge functions, or related app config), do **not** implement inline and do **not** spawn a one-off implementer. Launch the saved workflow:

`/kelyra-qa-loop {"request":"<the full user request, including constraints>"}`

or the `workflow` tool with `name` `kelyra-qa-loop` and `args.request` set to that same text.

Do not end your turn until that run is terminal (`passed`, `escalated`, `complete`, or `cancelled`).

The workflow tool will say the run is in the background and that completion is reported automatically. Ignore that as a reason to stop. Headless `grok -p` exits on end-of-turn and **cancels** the running loop (Q2, 2026-08-26). Do not say "I'll report when it finishes" and end the turn. If you must wait, read the run `state.json` until `status` is not `active`.

Then:

- `passed`: report the summary. Do not re-implement.
- `escalated`: this is your job. Summarize the remaining P0/P1 findings and ask the user before doing more. Do not launch a second kelyra-qa-loop on the same request unless the user says to.
- `cancelled` before QA: say the loop was killed. Do not claim QA passed.

Do **not** use kelyra-qa-loop for analysis, planning, Q&A, docs-only edits, git commit/push, applying SQL that was already produced, or files under `notes/teacher-decks/` (those belong to the lesson authoring agents).

Loop children (implementer, QA, verify, security) must never call `ask_user_question`, including dummy Continue / tool-existence probes. There is no UI to click; it hangs the loop. If something cannot be inspected, report it and finish.

Do not git commit or push unless the user explicitly asks.
