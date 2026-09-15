# DEFECT disposition — Inbox WorkRow nested button (web)

**Cards / source:** IQG-BATCH prove-out attach; live unnamed capture `1228977f…`
**Date:** 2026-09-14
**Profile:** product-manager
**Feature:** BATCH-v1 (IQG-BATCH)
**PM task:** t_4474b2c2

---

## Summary table

| # | Finding | Severity | Disposition | Eng now? |
|---|---|---|---|---|
| 1 | WorkRow card Pressable wraps pill Pressables → nested `<button>` on web | **P1** | **FIX-NOW** | **Yes** (CoS staffs Eng) |

CEO escalate: No (not production/legal/spend P0 override). No app code from this PM card.

---

## Binding disposition stamp

```
DISPOSITION STAMP
DEFECT: WorkRow nested <button> on web (Inbox attach / B-NA-A-01)
SEVERITY: P1 (confirmed)
DISPOSITION: FIX-NOW
PM: APPROVED  date: 2026-09-14  profile: product-manager  task: t_4474b2c2
CEO escalate: no
Engineering: YES — CoS staffs senior-developer / kelyra-qa-loop (not this card)
```

---

## Finding 1 — nested button (WorkRow web)

| Field | Value |
|---|---|
| **SEVERITY** | **P1** (confirmed; primary teacher lifecycle on web Inbox) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | Yes vs BATCH-v1 NA path — attach unnamed packet from Inbox must work on web |
| **CEO escalate?** | No |
| **Engineering?** | **Yes now** — CoS staffs Eng + qa-loop; **not** from this PM card |

### Repro / code fact

1. `WorkRow.tsx` ~287: when `cardPressable` (onPress and/or swipe actions), outer `Pressable` uses `accessibilityRole="button"`.
2. `WorkRowBody` pills (~373): each pill is also `Pressable` + `accessibilityRole="button"`.
3. RN Web maps those to DOM `<button>`. HTML forbids button-in-button → React `validateDOMNesting` / broken click targeting.
4. Inbox unassigned rows (`inbox.tsx`) always pass **both** `onPress` → `setPicking` **and** pills `Assign name` / `Delete`, plus swipe leading/trailing. Every Needs Attention unnamed row is nested on web.
5. Live prove-out context: BATCH dual stamp BATCH-v1; capture `1228977f-7098-4dd3-9375-06c5d9f1bb21` (unnamed, `student_id` null, `input_source=batch`); matrix row **B-NA-A-01** still EXEC/UNPROVEN. CEO hit nested-button while attempting Inbox attach.

### Why P1 FIX-NOW (not SCHEDULE / not WONTFIX / not P0)

1. **IQG Phase 6:** P0/P1 → FIX-NOW unless written exception. No exception here.
2. **Primary hat + lifecycle:** teacher web reviews, assigns, grades. Unnamed batch packets attach **only** via Inbox (no Assign on Split Review per B-NA-A-01). Nested buttons sit on that exact chrome.
3. **Blocks prove-out EXEC.** If SCHEDULE, CEO/QE cannot honestly finish B-NA-A-01 on web; BATCH release stays open on attach.
4. **Not P0:** no wrong-child write, no grade leak, no data loss. Row `onPress` also opens Who-is-this for unassigned — possible partial workaround on some browsers — but pill/Delete/a11y still broken and console-illegal. Do not rely on workaround to SCHEDULE.
5. **Not WONTFIX:** invalid DOM is a real product bug, not intentional chrome.
6. **Not P2/P3 polish:** attach is stamped primary path for unnamed packets after Confirm.

### Why not PM implement

Constraints: no Eng from PM card; no git. Disposition only. CoS owns staffing.

---

## Eng guidance (for CoS → implement card; do not code here)

Goal: zero nested interactive buttons on web when WorkRow has pills and/or card press.

Preferred directions (pick one clean approach in qa-loop; do not ship dual protocols):

1. **Split hit targets:** card shell is non-button `View` (or Pressable **without** `accessibilityRole="button"` / role that does not emit `<button>`). Put row navigation on a dedicated press target that does **not** wrap pills. Pills stay real buttons.
2. **Or** keep card Pressable but render pills **outside** the card Pressable sibling (layout still looks like one row).
3. **Or** on web only, demote outer wrapper role so DOM is not nested buttons; keep a11y labels coherent (row name + separate pill names). Prefer cross-platform structure fix over web-only hack if cost is similar.
4. Swipe action tiles already sit **outside** the card Animated.View — leave that model; do not nest tiles under card Pressable.
5. Preserve behaviors: tap-open closes swipe without navigating; unassigned row opens picker; Assign name pill opens picker; Delete confirms; Review navigates when assigned.
6. Regression surfaces: Inbox Needs Attention (unassigned + assigned), class shelves using WorkRow + pills, StudentWorkList / AssignmentWorkList if pills+onPress.
7. Verify on **web**: no `validateDOMNesting` button-in-button; Assign name opens FormSheet; Delete still works; keyboard/a11y roles sane.
8. Tests: structural unit test that card press wrapper and pill pressables are not ancestor-descendant in the tree when both present (source or lightweight render test). Existing swipe tests must stay green.

Out of scope this defect: redesign of Inbox copy; batch matcher changes; inventing students.

---

## CoS next actions

1. Accept disposition as **binding**: **P1 / FIX-NOW**.
2. **ARM GRANT + staff Engineering** (senior-developer / `kelyra-qa-loop`) as child of this defect / BATCH parent. Link live capture + B-NA-A-01.
3. Do **not** park prove-out NA-A while this is open if web attach is the EXEC path — fix first, then QE re-exec B-NA-A-01.
4. Do **not** ask CEO to “just tap the row” as the stamped path; pills are the labeled attach chrome.
5. After loop terminal → QAS/QE prove nested-button gone on web Inbox attach for unnamed batch capture.
6. No PM app code; no git from this card.

---

## Binding refs

- Handoff: `notes/company/batch-ingest-pm-workrow-handoff.md`
- Code: `src/components/ui/WorkRow.tsx` (card Pressable ~287; pills ~373); `src/app/inbox.tsx` unassigned pills/onPress
- Prove-out: `notes/company/batch-ingest-testplan.md` B-NA-A-01; `batch-ingest-iqg-release.md` UNPROVEN NA-A
- Live: capture `1228977f-7098-4dd3-9375-06c5d9f1bb21` on batch `6f05a42e-…`
- IQG Phase 6: P1 → FIX-NOW; CoS staffs Eng

---

## Handoff

- **RESULT:** Nested WorkRow button on web → **P1 / FIX-NOW**. Binding. No Eng from PM. No git.
- **FILES:** `notes/company/batch-ingest-workrow-nested-button-disposition.md`
- **ESCALATION:** No (CoS staffs Eng per FIX-NOW).
- **NEXT:** CoS — ARM + staff senior-developer / kelyra-qa-loop to un-nest WorkRow press targets; then QE B-NA-A-01 web attach.
