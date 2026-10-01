# t_50924a06 Pack B Approve on homework draft — engineering proof

Finding: t_019ab036 / DITL-DH-01-UI-02
Stamp: notes/company/pack-b-approve-on-draft-intent.md

## Code fix

- Capture save always persists `method: key_score` + items when the assignment has a key (`buildKeyedHomeworkPersistDraft`), even if live extract failed.
- Ask AI opens Pack B from blank key rows when extract fails.
- Student focus review hydrates Pack B from draft items or assignment key; Teach-only via `canApproveKeygrade`.
- Proposal save mirrors the same keyed persist path.

## Unit

```
node --experimental-strip-types --test \
  src/lib/keygrade/draftItems.test.ts \
  src/lib/keygrade/approveGate.test.ts \
  src/lib/capture/captureScreen.test.ts \
  src/lib/practice/reviewDecision.test.ts
```

30 passed (2026-10-01).

## UI chrome (375px)

Static label/layout proof of the controls AC-PACKB requires (not a live signed-in drive — Gemini/dev quota constraint noted on card; CoS live prove-out after merge):

- `01-teach-packb-accept-375.png` — Keyed review · Pack B + Accept recommendation visible
- `02-parent-no-approve-375.png` — Parent seat has no Approve / Pack B / Jordan Lee

## Migration

None.
