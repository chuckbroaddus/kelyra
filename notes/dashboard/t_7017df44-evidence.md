# t_7017df44 evidence — MathText surface integration

## Outcome
kelyra-qa-loop **complete / passed** (0 P0/P1). Run: `wf_01a070dca30475328528d674b909a79f`.

## Status
Integrated rewritten MathText into Ask, Explain, Help, and notes. Removed Explain numbered-row layout fork; practice prompts and MessagePayloadView bodies now use MathText.

## Changes
- `src/components/ui/ExplainDraftCard.tsx` — steps joined as `1. …\n2. …` single MathText; drop stepRow/stepBody flex fork; reteach label + MathText.
- `src/app/todo/[submissionId].tsx` — Help: `practiceItem.prompt` via MathText (helpText already MathText).
- `src/app/class/[id]/student/[studentId].tsx` — notes: practice prompts via MathText; `teacher_note` already MathText.
- `src/components/ui/MessageAttach.tsx` — MessagePayloadView body → MathText (Ask payload path + shared attach bodies).
- `src/components/ui/mathText.test.ts` — surface asserts (no Explain fork; prompts + payload body).
- Ask `src/app/ask.tsx` — already MathText bubbles; unchanged this run.

## XSS unchanged
`trust:false`, throwOnError false, caps; KaTeX-only HTML; native about:blank + data:woff2 from parent t_d90da5fe.

## Verify (host)
- `npm run typecheck` exit 0
- `node --experimental-strip-types --test src/components/ui/mathText.test.ts` → 26/26 pass
- Loop: 0 blocking P0/P1; Security phase clean

## Artifacts
- notes/dashboard/t_7017df44-qa-request.txt
- notes/dashboard/t_7017df44-qa-loop.log
- state: wf_01a070dca30475328528d674b909a79f

## Constraints
No SQL. No commit/push. Not a release certification — child `t_ae65a5f9` (qa-engineer) reviews evidence.
