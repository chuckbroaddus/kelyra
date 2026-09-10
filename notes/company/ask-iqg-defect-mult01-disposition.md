# DEFECT disposition — MULT-01 class switch clear

**Card:** t_28889f75  
**Date:** 2026-09-10  
**Profile:** product-manager  
**Feature:** ASK A-Filing (pedagogy pack + assignment ground)

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P1** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | No — violates locked IQG §6.3 |
| **CEO escalate?** | No (not P0 prod/legal/spend) |

---

## Why FIX-NOW

1. **Stamped law missed.** IQG §6.3 is **LOCKED** (PM stamp 2026-09-10, card t_67da4743): IQG-CL-01..05 require active-class change while Ask is open to clear session `assignmentId` / ground and drop pack inject immediately. MULT-01 is the prove-out AC for that lock.
2. **Integrity / wrong-class leak.** Prior class assignment ground persisting after class switch can inject the wrong pack (or keep a chip/card for an assignment that is not in the new class). Same clear family as child-switch (already wired in `setAskParentChildId`) and seat-switch — class switch is explicitly listed in IQG-CL-04 live-context clear family.
3. **Primary hat + multiplicity.** Teacher dual-hat and multi-class teachers are primary A-Filing actors; P1 guide = “stamped behavior missing for a primary hat or lifecycle.” Multiplicity of classes is an IQG Phase-1 dimension, not polish.
4. **Small, known wiring gap.** `clearAskAssignmentGround()` already exists (`assignmentGround.ts:41`) and is used from Ask chrome for correct-away / clear paths. `setActiveClassId` (`AuthProvider.tsx:117`) only mutates `teacher.active_class_id`. No `useEffect` on `activeClassId` / classId in `AskAssignmentGround.tsx`. This is a miss, not a design reopen.
5. **Release gate.** QE2 (`ask-iqg-execution.md`) blocks devops-release while this P1 is open. No other P0/P1 from that run.

**Not WONTFIX / DEFER / SCHEDULE:** Would ship stamped intent incomplete (happy-path ground without class-switch finish). No workaround that preserves integrity without clearing ground.

---

## Severity confirm

| Guide | Fit |
|---|---|
| P0 | No — not data loss / wrong grade / cannot complete live school flow alone |
| **P1** | **Yes** — stamped clear on class switch missing; primary multi-class / dual-hat lifecycle |
| P2 | Too low — not “workaround exists” for wrong-class pack risk |

Severity **stays P1**.

---

## Accepted expected behavior (no design change)

From `notes/company/ask-iqg-intent.md` §6.3 + `docs/ui-design.md` §12.6.8:

- Changing **active class** (hamburger / chrome class switcher → `setActiveClassId`) while Ask is open **clears** session assignment ground and **drops** pack inject immediately.
- Does **not** confirm a new pack; does **not** carry prior class `assignmentId`.
- **Student:** chip updates to new page-bound assignment if present; else hide + durable **Choose assignment** if still in Ask with no ground (IQG-RG-02).
- **Parent:** clear + **Which assignment?** card re-prompts when pack path still desired (same family as child-switch).
- **Teacher-seat Ask:** remains class-only / no student pack inject (IQG-TCH-ASK-01); clear still required so stale ground cannot linger if seat flips or dual-hat uses parent path later.
- Class switch is **not** “Just chatting” (do not set `chattingOnly`); use **clear** (`clearAskAssignmentGround`), matching child-switch semantics.

---

## Implementation contract (for CoS → Engineering)

PM does **not** implement. CoS staffs Engineering child of this defect (and link feature parent if needed). Scope:

1. **On active class id change** (any caller of `setActiveClassId` / equivalent chrome class context change), clear Ask session ground via existing `clearAskAssignmentGround()` (not `setAskJustChatting`).
2. Prefer a **single choke point** (e.g. inside `setActiveClassId` and any non-auth class-context path that can change active class without it) so hamburger + class route mounts cannot drift.
3. **Ask chrome react:** `AskAssignmentGroundChrome` must refresh chip/card when classId / ground clears (mirror parent child-switch `useEffect` pattern on `classId`).
4. **Inject:** live Ask context must drop pack for prior assignmentId on clear (existing ground→inject path; verify no stale inject after switch).
5. **Page candidate:** prior class `setAskPageGround` must not soft-ground the new class; page screens already reset on mount — verify no cross-class pageCandidate leak if user switches class without visiting a new assignment page.
6. **Tests (bundle P2):** unit coverage for “class switch / activeClassId change clears session ground”; extend `assignmentGround.test.ts` (and component/integration if cheap). Closes the related P2 “no MULT-01 test” from QE2.
7. **Non-goals:** no A/B/C reopen; no teacher pack inject; no new chrome beyond existing clear/chip/card laws; no office/super pack.

**AC to re-prove (MULT-01):**

- Pre: Ask open with assignment ground set.
- Action: change active class via chrome.
- Assert: session ground null; inject dropped; student chip hide/update; parent card re-prompt; no prior class assignmentId in live context.

---

## Related P2

QE2 filed **DEFECT [P2]** missing automated MULT-01 coverage. **Disposition ride-along:** fix **with** this FIX-NOW (do not open a separate release gate). Eng includes test in same child card.

---

## Recommended next action (CoS)

1. Accept PM disposition **FIX-NOW / P1**.
2. ARM GRANT + staff Engineering (kelyra-qa-loop) child of `t_28889f75` with the contract above.
3. After loop terminal: QA Engineer re-run MULT-01 (+ unit evidence); QA Supervisor release evidence only when this P1 is closed.
4. Do **not** staff devops-release for A-Filing prove-out while this FIX-NOW is open.

---

## Handoff fields

- **OBJECTIVE:** Disposition MULT-01 P1 class-switch ground clear.
- **RESULT:** SEVERITY P1 confirmed; DISPOSITION **FIX-NOW**.
- **FILES:** `notes/company/ask-iqg-defect-mult01-disposition.md`
- **ESCALATION NEEDED:** CoS staff Eng only (no CEO).
- **RECOMMENDED NEXT ACTION:** CoS → Engineering FIX-NOW child; re-prove MULT-01.
