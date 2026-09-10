# ASK A-Filing IQG Test Plan + Cases (QE1)

**Date:** 2026-09-10  
**Author:** qa-engineer (Kelyra)  
**Card:** t_72e80fe0 · Process: notes/company/INTENT_QUALITY_GATE.md §4 Phase 4 Prove-out  
**SoT:** notes/company/ask-iqg-intent.md (REJECTED stamp + §6 gaps + §10 OBJECTIVE), ask-assignment-context-pm.md, ask-assignment-context-ui-lock.md (A-Filing pick), docs/ui-design.md §8.1 §12.6 §13.15 §29.4a, GAUTH walls.  
**Status:** Plan only. Execution = QE2 t_29176224 after ASK-I1 terminal. No kelyra-qa-loop. No git. No defects until execute.

---

## 1. Scope (from IQG §10 OBJECTIVE)

This plan + cases prove the stamped design is full-featured vs real-world intent. Covers every hat, chrome entry, full lifecycle (enter + leave), multiplicity, reverse/cancel, integrity walls, explicit non-goals.

**Must-cover categories (min IDs):**
- Hats: teacher (Confirm/Skip/Clear/Re-gen/stale), student soft chip, parent explicit, dual-hat seat, office/super no pack inject
- Chrome entry per hat
- Lifecycle + reverse
- Multiplicity (twins, two assignments, tray none, class switch)
- Integrity (Confirm≠Approve, GAUTH refuse+pack, parent never Looks like, family never SELECT teacher-only, unconfirmed=no inject)
- Non-goals guarded

**Pending PM amendments (§6.1–6.3):** Office seat, re-ground after Just chatting, class switch clear. Cases marked (pending PM lock) if still open.

**Evidence rule:** Each P0 intent row has automated/scripted path + JWT/role fixtures. Open misses → DEFECT [sev] on kelyra board.

---

## 2. Chrome Entry Matrix

| Hat | Confirm / pack author | Ground / inject path |
|-----|-----------------------|----------------------|
| Teacher | Assignment detail: publish strip + collapsed Tutor brief card | Teacher Ask: class-only (thin per §2.1) |
| Student | None | Lesson/assignment/deep-link → soft chip above MessageComposer; tray no page → no chip |
| Parent | None | /ask empty-state "Which assignment?" card |
| Office/super | None (must stay none) | /ask exists; no soft-assume / no pack inject |
| Dual-hat (teacher+parent) | Confirm only on teacher seat assignment detail | Seat switch clears assignmentId ground |
| Dual-hat (office+teacher) | Confirm only on teacher seat | Office seat: same no-pack lock as office |

---

## 3. Teacher Confirm Cases (T-CONF)

**T-CONF-01** Publish generates Draft pack (student-safe only)  
Pre: Assignment with objectives + misconceptions.  
Steps: 1. Publish assignment. 2. Inspect strip + pack fields.  
Expected: Draft pill; ≤800 tok; objectives/misconceptions/hint-depth/vocab only; keys/explain_draft/teacher-notes omitted from pack; teacher-only wall shown.  
Notes: Schema wall enforced.

**T-CONF-02** Confirm brief makes injectable (Confirmed pill)  
Pre: Draft exists.  
Steps: 1. Open ConfirmSheet on assignment detail. 2. Edit fields if needed. 3. Tap Confirm.  
Expected: Confirmed pill; pack now injectable on student/parent paths; no "Approve" language.  
Notes: Confirm ≠ Approve.

**T-CONF-03** Skip for now keeps unconfirmed (class-only Ask)  
Pre: Draft exists.  
Steps: Tap Skip for now.  
Expected: Unconfirmed; publish succeeds; student Ask = class-only (no pack); no inject.  
Notes: Publish not blocked.

**T-CONF-04** Clear brief turns off pack (ConfirmSheet)  
Pre: Confirmed pack.  
Steps: 1. Open assignment detail. 2. Clear brief.  
Expected: Pack off; class-only until new Confirm; no unpublish.  
Notes: Clear is non-destructive to assignment.

**T-CONF-05** Re-generate creates new Draft (prior Confirmed stays until new action)  
Pre: Confirmed pack.  
Steps: 1. Material update or Re-gen. 2. New draft appears.  
Expected: New Draft; old Confirmed remains injectable until Confirm/Clear on new draft.  
Notes: Re-gen does not auto-clear prior.

**T-CONF-06** Material edit marks stale (Needs review + inject stopped)  
Pre: Confirmed pack.  
Steps: Edit title/objectives.  
Expected: Needs review banner; inject STOPPED; teacher can re-Confirm or Clear.  
Notes: Stale stops student/parent inject.

**T-CONF-07** Confirm after stale re-enables inject  
Pre: Stale pack.  
Steps: Re-Confirm.  
Expected: Confirmed; inject resumes.  
Notes: Lifecycle complete.

**T-CONF-08** Generation fail / over-cap shows error (no partial pack)  
Pre: Publish with too-large content.  
Steps: Trigger gen.  
Expected: Error; no pack created; Draft not left in bad state.  
Notes: Fail closed.

---

## 4. Student Ground Cases (S-GND)

**S-GND-01** Soft chip appears when page knows assignment + confirmed pack  
Pre: Confirmed pack on assignment; student on lesson/assignment page.  
Steps: Open page with assignmentId.  
Expected: Soft "Looks like FoM 1.2" chip above MessageComposer (sticky); no hard assume.  
Notes: Chip only when confirmed + known.

**S-GND-02** Not this (≤3 titles) shows inline list + Just chatting  
Pre: Chip shown.  
Steps: Tap Not this.  
Expected: Compact inline list of plausible titles + Just chatting option; no merge.  
Notes: ≤3 inline.

**S-GND-03** Ambiguous (>3 or two equal) opens sheet picker  
Pre: Ground needed, >3 titles.  
Steps: Trigger ground.  
Expected: Sheet with titles + Just chatting; never auto-pick or merge packs.  
Notes: No soft assume.

**S-GND-04** Tray /ask with no page assignment → no hard-assume  
Pre: Open /ask tray alone.  
Steps: No deep-link assignment.  
Expected: No chip; optional one mute session hint; picker never auto-picks.  
Notes: Tray no page = no assume.

**S-GND-05** Unconfirmed pack shows chip title only (quiet, no inject, no scold)  
Pre: Unconfirmed pack.  
Steps: Student on assignment page.  
Expected: Chip title visible if known; no missing-pack scold; no inject.  
Notes: Unconfirmed = no inject.

**S-GND-06** Stale mid-session drops inject (optional mute line)  
Pre: Confirmed pack, session open.  
Steps: Material edit by teacher.  
Expected: Inject drops; optional one mute "pack updated" line.  
Notes: Quiet drop.

**S-GND-07** Just chatting clears prior ground + inject  
Pre: Grounded on assignment.  
Steps: Tap Just chatting.  
Expected: Chip cleared; inject cleared; session continues class-only.  
Notes: Clear ground.

**S-GND-08** Photo quiz + graded refuse still hold with pack present  
Pre: Graded assignment + photo quiz.  
Steps: Student attempts.  
Expected: GAUTH refuse (graded + photo) holds; pack does not override.  
Notes: GAUTH walls intact.

---

## 5. Parent Ground Cases (P-GND)

**P-GND-01** Explicit "Which assignment?" card on /ask open (no Looks like)  
Pre: Parent opens Ask, no ground.  
Steps: Open /ask.  
Expected: Empty-state card "Which assignment?" before any pack path; never soft "Looks like".  
Notes: Explicit only.

**P-GND-02** Pick title → safe slice + parent seat policy  
Pre: Card shown.  
Steps: Pick assignment title.  
Expected: Safe pack injected; parent policy (no teacher-only); child switch clears.  
Notes: Explicit pick.

**P-GND-03** Just chatting → no pack, free chat  
Pre: Grounded.  
Steps: Choose Just chatting.  
Expected: No pack; session free chat; no inject.  
Notes: No pack path.

**P-GND-04** Child switch clears ground + re-prompts card  
Pre: Grounded on child A.  
Steps: Switch child.  
Expected: Ground cleared; card re-prompts for new child.  
Notes: Per-child ground.

**P-GND-05** No teacher-only SELECT / no Approve path  
Pre: Parent seat.  
Steps: Attempt SELECT or Approve.  
Expected: Refused; GAUTH wall; family DTO omits teacher fields.  
Notes: GAUTH + family wall.

**P-GND-06** Stale drops inject quiet (no scold)  
Pre: Pack grounded.  
Steps: Teacher material edit.  
Expected: Inject drops quietly.  
Notes: Quiet.

---

## 6. Dual-Hat / Office / Twins / Multiplicity Cases (D-HAT / OFF / TW / MULT)...

## 6. Dual-Hat / Office / Twins / Multiplicity Cases (D-HAT / OFF / TW / MULT)

**D-HAT-01** Teacher↔parent seat switch clears assignment ground  
Pre: Dual-hat on teacher seat, grounded.  
Steps: Switch to parent seat.  
Expected: Ground cleared; parent explicit card re-prompts.  
Notes: Seat = SoT.

**D-HAT-02** Office+teacher: Confirm only on teacher seat  
Pre: Dual-hat office+teacher.  
Steps: On office seat → assignment detail.  
Expected: No Confirm tools; switch to teacher seat to see Confirm.  
Notes: Office seat never inherits teacher pack tools.

**D-HAT-03** Office seat Ask: no pack inject / no soft ground (per §6.1)  
Pre: Office/super Ask open.  
Steps: Any assignment context.  
Expected: No pack inject; no soft chip; class/school Ask only.  
Notes: (pending PM lock §6.1) — file DEFECT if eng adds office pack path.

**D-HAT-04** Seat switch during Ask clears ground + drops inject  
Pre: Grounded on one seat.  
Steps: Switch seat.  
Expected: assignmentId cleared; inject dropped.  
Notes: Live-context delta.

**TW-01** Twins fail closed — no cross-child ground/pack/thread  
Pre: Parent of twins.  
Steps: Ground on twin A.  
Expected: Twin B never sees ground/pack; no shared thread.  
Notes: Fail closed.

**TW-02** Ambiguous twin → explicit child picker, no invention  
Pre: Ambiguous twin context.  
Steps: Trigger ground.  
Expected: Child switcher prompt; no auto twin picker invented.  
Notes: No invent.

**MULT-01** Class switch clears assignment ground (per §6.3)  
Pre: Ask open with assignment ground.  
Steps: Change active class in chrome.  
Expected: assignmentId cleared; chip/card re-prompt or hide; inject dropped.  
Notes: (pending PM lock §6.3)

**OFF-01** Office/super Ask no pack inject after PM amend  
Pre: Office seat.  
Steps: Any Ask use.  
Expected: No pack; no soft ground.  
Notes: (pending PM §6.1)

---

## 7. Integrity / REG / RE Cases (REG / RE)

**REG-01** GAUTH graded refuse + pack present still refuses final answer  
Pre: Graded assignment + confirmed pack.  
Steps: Student asks for answer.  
Expected: Refuse holds; pack does not leak key.  
Notes: GAUTH wall.

**REG-02** Family/student never SELECT teacher-only pack fields  
Pre: Any family view.  
Steps: Attempt SELECT explain_draft / keys.  
Expected: Omitted from DTO; wall enforced.  
Notes: Family wall.

**REG-03** Help Edge remains separate (no merge into Ask)  
Pre: Teacher uses Help.  
Steps: Compare surfaces.  
Expected: Help ladder unchanged; Ask never collapses Help.  
Notes: Non-goal.

**REG-04** Confirm ≠ Approve (pills + copy)  
Pre: Any Confirm flow.  
Steps: Inspect language.  
Expected: "Confirm brief" / "Draft" / "Confirmed" / "Needs review"; never "Approve".  
Notes: Integrity.

**REG-05** Skip = class-only (no pack)  
Pre: Skipped pack.  
Steps: Student Ask.  
Expected: Class-only chat; no pack inject.  
Notes: Skip behavior.

**RE-01** Re-ground after Just chatting (per PM §6.2)  
Pre: Ground cleared via Just chatting.  
Steps: Re-open picker.  
Expected: Matches locked rule (durable control or leave/re-enter); prior inject cleared before new.  
Notes: (pending PM lock §6.2) — pass = matches locked rule.

---

## 8. Non-Goals Guarded (no defects if absent)

- Per-assignment answer/solver skills (ASK-R1 harm)
- Help → Ask merge (separate controls)
- Student vision tutor on quiz photos (GAUTH refuse)
- Per-student / per-turn re-assessment (cost)
- Auto-live pack without Confirm (teacher gate)
- Parent Approve / grade write (never)
- Twin merge / shared Ask memory (fail closed)
- Student raw pack inspector (title chip only)
- Full Option B / full Option C (P2 rejected)
- Office bulk assignment tutor packs (out unless later epic)
- Author studio skill authoring MVP (later)
- New IconName for status (text pills only)
- Git ship / devops-release from IQG (QE prove-out first)

## 9. Regression Walls (still hold with pack present)

(See ask-iqg-intent.md §9: graded refuse, photo refuse, family DTO omit, Ask write/admin never-send, parent co-teacher ≠ Approve, twins fail closed, matcher never inserts, nothing grade until Approve, Help separate, model keys server-side.)

---

**Test plan complete.** All min case IDs covered (T-CONF-01..08, S-GND-01..08, P-GND-01..06, D-HAT-01..04, TW-01..02, OFF-01, REG-01..05, MULT-01, RE-01). Pending PM locks noted. Ready for QE2 execution after ASK-I1 terminal.

- Per-assignment solver skills
- Help → Ask merge
- Student vision on quiz photos
- Auto-live pack without Confirm
- Parent Approve path
- Twin merge / shared memory
- Student raw pack inspector
- Full Option B/C chrome
- Office bulk packs
- New IconName (text pills only)

## 8. Regression Walls (still hold with pack)

(See intent §9)

---

**Plan skeleton complete. Will grow via small patches to reach full min cases T-CONF-01..08 etc. Then complete card on last patch turn.**

(End skeleton — 78 lines)