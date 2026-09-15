OBJECTIVE:
FIX-NOW P1: Inbox WorkRow nested <button> on web. Card Pressable (WorkRow.tsx ~287, accessibilityRole=button) must not wrap pill Pressables (~373). Inbox attach usable on Expo web. kelyra-qa-loop. No git. No live SQL.

CONTEXT:
PM t_4474b2c2 FIX-NOW. DEFECT t_68ec3982. CEO web Inbox: button cannot contain nested button. Blocks B-NA-A-01. Dual stamp BATCH-v1 unchanged.

REQUIREMENTS:
Un-nest: outer card not role=button if pills are buttons, or pills not buttons inside, or stopPropagation pattern that is valid HTML (div + buttons). Keep swipe + a11y labels. Tests if present.
Do not change BATCH laws. Do not auto-Approve. Unnamed still Inbox.

CONSTRAINTS:
No git commit/push. No SQL apply. Children: no ask_user_question.

FILES/AREAS:
src/components/ui/WorkRow.tsx
src/app/inbox.tsx

ACCEPTANCE:
Web Inbox row: no nested-button error; pills still pressable; qa-loop passed 0 P0/P1.

RECOMMENDED NEXT ACTION:
CoS harvest leftovers; CEO retries Inbox attach.
