# GWT-BUILD devops handoff — t_71353345

**Branch (worktree, uncommitted):** `feature/gwt-work-kinds-t_71353345`
**Worktree:** `/Users/chuckbroaddus/projects/kelyra/.worktrees/t_71353345`
**Migration (do not Eng-apply):** `supabase/migrations/20261004120000_gwt_work_kinds_score_schemes.sql`

## What shipped in tree

- Canonical `work_kind` vocabulary + picker (incl. memory verse, Bible quiz, pop quiz)
- Score schemes: complete/incomplete, ESNU, checklist (+ numeric/P-F/either)
- Capture type hint (Needs / proposal Kind of work); Approve gate unchanged
- Syllabus category default mark scheme + include-in-average off for participation/behavior/effort
- Family/teacher averages map complete/ESNU/checklist correctly; P/F still out
- Pop quiz calendar: default hidden, teacher toggle per item

## Verify

- `node --experimental-strip-types --test src/lib/grade/workKinds.test.ts src/lib/grade/marks.test.ts` → 17 pass
- `npm run typecheck` → clean

## DevOps

1. Commit + push branch from worktree (Eng did not ship git).
2. Open PR → rapid auto-merge when green.
3. Apply migration **by filename** after merge (not `db push`).
