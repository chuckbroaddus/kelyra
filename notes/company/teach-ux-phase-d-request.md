# TEACH-UX Phase D — web labels + capture copy + regression (CEO send 2026-09-04)

CEO authorized TEACH-UX through the daily cap. **This loop is Phase D only.** A+B+C already in this dirty tree — **preserve them**. No SQL. No ClassTabs recut. No seat table.

Grounding:
- `notes/company/teacher-ux-plan.md` §7 Phase D
- `notes/company/teacher-ux-acceptance.md` TR-09, CAP-04, STU-02, OFF-08, R-*
- ui-design: header camera **proposes**; tray Capture **files**

## Goal

Web ≥720 shows the same five destinations with labels. Capture copy: header proposes, tray files. Student + Office golden paths unchanged.

## Required work

### D1 — Web top bar labels
Visible labels **Desk · Capture · Needs · Class · Ask** at ≥720. Same five keys as phone tray. No sixth. No Profile-in-tray. Keep `today` glyph; a11y/tooltip Desk if not already.

### D2 — Header camera vs tray Capture
Tooltips/copy: header camera **proposes**; tray Capture **files**. Do not remove either.

### D3 — Teacher switch-class
`/?switch=1` or drawer only; no office classes tab on teacher seat. Phase A gates stay.

### D4 — Regression
Student tray and Office tray / OFFICE_CLASS_TABS golden paths unchanged. Phase A dual-hat seat still works. Phase B CLASS_TABS ≤7; Class href ≠ gradebook-first. Phase C Needs label + Ask class chip stay.

### D5 — Copy leftovers that are this phase
`src/lib/ai/askPrompt.ts` FALLBACK still says “Open Inbox…” — rename to **Needs**. Do not implement parked P2s (Needs count on dual-hat; /inbox vs badge mismatch; Week/Heatmap secondary chrome).

Do **not** patch `docs/ui-design.md` in this loop (TEACH-UX-DOC is a later PM card).

## Tests
- Web ≥720 teacher tray/top bar labels Desk · Capture · Needs · Class · Ask
- Header camera propose-only copy present
- Student + Office trays unchanged (key lists)
- Phase A/B/C tests still green
- Ask fallback copy uses Needs not Inbox
- Matcher never inserts; canCreateClass untouched; no EXPO_PUBLIC_*; no sixth tab; no SQL

## Constraints
- Preserve dirty tree (A+B+C+AVG). No git reset/commit/push.
- No SQL, no migrations, no Edge, no new IconName unless unavoidable.
- Children never call `ask_user_question`.
- Do not burn parked P2 product changes except the P3 Inbox→Needs copy.

## Acceptance
D1–D4 + Ask Needs copy. A+B+C intact. Terminal passed or escalated with named P0/P1 only.
