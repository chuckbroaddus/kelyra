# DATE IQG — Real-world intent (date-entry primitive)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_cbd9f5e7` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** DATE — shared date-entry primitive (birthday + assignment/practice due)  
**Status:** Design-stage IQG intent. **QA Supervisor DESIGN STAMP: APPROVED** (against PM Hybrid A+micro lock). No pack invent on this card (lock already chose). No app code. Dual stamp met → CoS **may** GRANT DATE-I1; this card does **not** itself unblock I1.

**SoT read:**  
`notes/company/INTENT_QUALITY_GATE.md` · `notes/company/date-input-research.md` (DIR-1) · `notes/company/date-input-options.md` (A/B/C, designer rec non-binding) · CEO 2026-09-09 chrome lock (phone rolodex month·day·year; web popup calendar Sun–Sat + month/year dropdowns).  
**PM lock:** `notes/company/date-input-pm-lock.md` — **PRESENT** (DATE-P1 `t_8ce3f697`). Binding pick: **Hybrid A+micro**.

**Parent tracker:** `[IQG-DATE]` `t_7df2223b` (sticky). **DATE-I1** `t_7ecf9b69` — dual DESIGN STAMP **met** (PM + QA Sup APPROVED); CoS may GRANT. This card does not complete the parent or unblock I1 itself.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: DATE shared date-entry primitive
Quality goals: date-only ISO store; locale display; CEO phone wheels + web calendar; Hybrid A+micro (web type-in; chips outside; privacy caption; formatBirthdayMd); hats+dual-hat seat walls; full open/change/clear/cancel/already-set lifecycle; multiplicity per-instance; birthday privacy (parent md read; student none); due ≠ grade; Clear ≠ Cancel; explicit non-goals (time/range/CAL/class-create)
PM: APPROVED  date: 2026-09-10  profile-session: product-manager / t_8ce3f697 · lock Hybrid A+micro · notes/company/date-input-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_cbd9f5e7 / qa-supervisor
Intent gaps remaining: none (design-stage). Designer ui-design fold is post-dual-stamp later card — not an intent gap. Prove-out after DATE-I1.
```

**QA Supervisor stamp meaning:** Real-world intent is fully specified (hats, dual-hat, chrome entry, full lifecycle, multiplicity, reverse/cancel, privacy, non-goals) and **matches** PM lock Hybrid A+micro (DATE-01…15, US-T-BDAY/T-DUE/P-BDAY/S-NONE/X-NONE/DH). Not happy-path only. This card did **not** invent the pack. Does **not** patch `docs/ui-design.md`, implement, or GRANT DATE-I1 (CoS may GRANT I1 now that dual APPROVED). Product-complete only after implement + prove-out §10.

**Binding pick (quoted, not chosen here):** Hybrid A+micro — base Option A; web type-in from B; `formatBirthdayMd` + mute privacy caption from C; chips **outside** on AssignmentForm; birthday optional; due **required** on Save; due min allow past; birthday window today−22y…today−3y; weekStartsOn Sunday MVP; native type-in default off.

---

## 1. One-line law

| Surface | Job | Not |
|---|---|---|
| **Shared date field** | Enter / change / clear a **date-only** value; store ISO `YYYY-MM-DD` or null; display locale-formatted | Time-of-day; datetime-local; user-facing timezone chrome |
| **Birthday entry** | Optional person date on student Details (teacher full; parent linked-child edit full while editing) | Student entry; invent/matcher-insert student; FERPA year leak on parent **read** |
| **Birthday read** | Parent own-child surfaces show **month/day only**; teacher may show full; student never | Year on parent Home/summary; student `/todo` birthday |
| **Due-date entry** | Assignment / practice due on teacher assign form (filing meta) | A grade; auto-publish; parent/student due editors |
| **Due chips** | Tomorrow / Next week / Clear as **shortcuts that set the same ISO value** the primitive owns | Separate date truth; chips that bypass cancel/clear rules |
| **Picker chrome** | Phone: rolodex wheels month·day·year. Web: popup calendar month grid Sun–Sat + month/year dropdowns that refresh grid (CEO 2026-09-09) | Per-screen one-off pickers with no shared lifecycle/a11y |

**Pack lock:** PM chose **Hybrid A+micro** (`date-input-pm-lock.md`). Intent below is the IQG real-world law; locked numbers/stance are quoted from that file. Options A/B/C remain historical option packs only.

---

## 2. Hats — who uses this

### 2.1 Teacher (primary editor)

| Intent | Must | Notes |
|---|---|---|
| Edit student **birthday** on student Details / Edit sheet | Yes | Full date display + full picker; optional field |
| Set **assignment due** on assign form | Yes | Full date; chips allowed as form-level or shell-owned (PM pick) |
| Set **practice** due when that form exists | Yes if surface ships | Same primitive instance rules; second field ≠ shared state |
| Read birthday full on teacher roster/details | Yes | Year allowed for teacher |
| Create class from date chrome | **No** | Explicit non-goal |
| Office-wide date policy from Teach seat | **No** | — |

### 2.2 Parent

| Intent | Must | Notes |
|---|---|---|
| **Read** own linked child birthday as month/day only | Yes | e.g. `Mar 14` — never year on read surfaces |
| **Edit** linked-child birthday only where existing parent edit law allows (§31-class product law) | Yes | While editing: full wheels/calendar; **save** still full ISO; **read** surfaces strip year after |
| Edit class assignment / practice **due** | **No** | Teacher filing only |
| See sibling birthdays mashed | **No** | Per-child instance; twins fail closed |
| Entry without Parent seat when dual-hat | **No** | Seat SoT — see §3 |

### 2.3 Student

| Intent | Must | Notes |
|---|---|---|
| Birthday entry or read on `/todo` / student grades | **None** | Dark — no birthday chrome |
| Due date editor | **None** | May **read** assignment due if product already shows it as label — not this primitive’s edit job |
| Signed-in student opens shared DateInput | **No** | |

### 2.4 Office / superintendent

| Intent | Must | Notes |
|---|---|---|
| New school-wide date chrome this slice | **No** | Explicit non-goal |
| Use date chrome only if already on a **teacher-class path** they legitimately teach | Soft | No new admin birthday/due surfaces in DATE v1 |
| FERPA / year access via office firehose | **No** | Do not invent office birthday browse |

### 2.5 Signed-out

| Intent | Must | Notes |
|---|---|---|
| Any date field / picker | **None** | Auth wall; no public birthday/due |

---

## 3. Dual-hat (must not happy-path skip)

| Persona | Law | Fail if |
|---|---|---|
| **Teacher who is also a parent** | Chrome **seat** is SoT. **Teach seat:** class due + teacher student Details birthday for **taught** roster. **Parent seat:** linked-child birthday edit/read only; **no** class due editor; parent **read** still month/day only | Teach seat shows parent-only child birthday year on wrong roster; Parent seat opens Assignment due; silent merge of seats |
| **Office who is also a parent** | Parent seat → child birthday rules only. Office altitude does **not** add school-wide date browse or birthday firehose | Office Activity / admin class card grows new DATE chrome |
| **Office who is also a teacher** | Taught-class path only for due/birthday edit; no superintendent override picker | `is_school_admin` unlocks all birthdays |
| **Wrong chrome for birthday vs due** | Birthday lives on **person Details** flows; due lives on **assign form**. Never one control that confuses “child birthday” with “homework due” | Single global date modal without context label |

**IQG anti-pattern (REJECT if missing after lock):** dual-hat user only tested as pure teacher setting one due date.

---

## 4. Chrome entry (every hat that edits)

| Hat | Birthday entry | Due entry | Forbidden dead-ends |
|---|---|---|---|
| Teacher | Student page → Details → Edit → Birthday row opens primitive | Assignment (and practice if present) form → Due row opens primitive | Hidden only in buried settings; no entry on student seat |
| Parent | Parent linked-child Details **edit** (existing law) → Birthday row | **None** | Parent tray “due editor”; editing without Parent seat when dual-hat |
| Student | **None** | **None** | Any DateInput on `/todo` |
| Office/super | **None new** this slice | **None new** | Admin “school birthdays” browser |
| Signed-out | **None** | **None** | Public forms |
| Dual-hat | Entry follows **active seat** after seat switch; list/form reloads for that seat | Same | Stale Teach due sheet still open after switch to Parent |

**Labels:** Field/`accessibilityLabel` must name the job (`Birthday` vs `Due date`) so VoiceOver never announces a generic “date” without context when two fields exist.

---

## 5. Full lifecycle (open / change / clear / cancel / already-set)

Pack-agnostic state machine. Commit timing may differ (Done vs day-click vs blur-parse) per pack — **semantics of Cancel vs Clear must not**.

| State | Law |
|---|---|
| **Empty** | No ISO stored (`null`). Placeholder / `Add {label}` in mute. Optional birthday never blocks person save solely for empty (unless PM later marks required — default optional). |
| **Open** | Snapshot **draft** = current committed value, or smart default (birthday ~ historical center; due ~ near future). Wheels/calendar show draft. Prior committed value untouched until commit. |
| **Change** | Draft updates live. Parent form committed ISO updates only on **commit** path defined by pack (phone Done / web day-click / successful parse). |
| **Already-set** | Field shows **locale** display (not raw ISO). Reopen centers/selects the same ISO on wheels/grid. |
| **Cancel** | Phone Cancel or scrim-without-commit; web Esc / click-away without day-click (and pack-equivalent). **Discard draft**; restore prior committed ISO (or empty). **Not** the same as Clear. |
| **Clear** | Explicit Clear control (sheet ghost and/or due Clear chip). Sets committed value to **null**; chips deselect; display empty. Requires intentional Clear — not Esc. |
| **Disabled** | Mute field; cannot open; `accessibilityState.disabled` (or web equivalent). |
| **Error** | Out-of-range or unparsable: **no silent clamp on commit**. Inline caption under field (`danger` / mute per tokens); keep editor open or show error without writing bad ISO. Empty optional ≠ error. |
| **Required empty on form save** | Form-level validation (e.g. due required on Save assignment if PM says yes) — same pattern as other TextFields; not Alert theater. |

### 5.1 Platform chrome (CEO lock — all packs)

| Platform | Required chrome |
|---|---|
| **Phone (RN)** | Rolodex / drum **wheels**: month · day · year (locale column order). Sheet with named Cancel + primary Done (or pack-equivalent commit). |
| **Web** | Popup **calendar**: month view; **Sun–Sat** grid default for US MVP unless PM locks otherwise; header **month** and **year** dropdowns that **refresh the grid**; keyboard: arrows/Enter/Esc/Tab; focus returns to field on close. |
| **Tablet** | Pack may choose wheels vs docked calendar vs hybrid — must remain tokenized `useTheme()` and same lifecycle. |
| **Tokens** | `useTheme()` only. No hardcoded hex. Icons: existing `Icon` names only; no invented View-stroke on DATE design. |
| **A11y** | Wheels adjustable + announcements; web dialog + grid keyboard; live region on month change; ≥44×44 targets; reduce-motion: no extra fling theater. |

### 5.2 Birthday vs due presets (shared engine, different props)

| | Birthday | Due |
|---|---|---|
| Required default | **Optional** (PM) | **Yes** on Save assignment (PM) |
| Open default | ~today−10y center | **Tomorrow** (PM) |
| Min/max | **today−22y … today−3y** (PM); out-of-range error, no silent clamp | **Allow past** (default min null); max open |
| Clear | Yes | Yes (+ form Clear chip) |
| Chips | None | Tomorrow / Next week / Clear — **outside** primitive on AssignmentForm (PM) |
| Type-in | Web-first; native **off** default (PM) | Same |
| Privacy caption | **Show** mute on birthday edit (PM C micro) | None |
| Parent read format | Month/day only via `formatBirthdayMd` | N/A |
| Teacher display | Full locale date | Full locale date (weekday ok) |

---

## 6. Multiplicity + reverse

### 6.1 Multiplicity

| Case | Law |
|---|---|
| **Two children (parent)** | Each child Details hosts its **own** date field instance. No global “household birthday.” Twins: separate rows; never one value for two people. |
| **Two assignments / assignment + practice** | Two field instances; independent ISO state. Chips target the **focused** / owning field only (no cross-write). |
| **Two sheets/modals** | Single modal host: opening one closes the other (or equivalent non-stacking rule). |
| **Two classes** | Due on assign form is per assignment being edited — not a class-global sticky date unless product already defines that (out of DATE primitive). |
| **Reopen after navigate** | Committed ISO is source of truth; draft never leaks across students/assignments. |

### 6.2 Reverse / cancel / already-in-flow

| Action | Law |
|---|---|
| Cancel mid-edit | Restore prior committed; no partial ISO write |
| Clear after set | Return to empty null; reversible only by picking a new date (no trash stack) |
| Close form without Save person/assignment | Pack/form rules: field draft must not outlive form cancel inconsistently — form Cancel discards uncommitted person/assignment including date draft |
| Disabled mid-flight | Cannot open; if became disabled while open, close without commit |
| Seat switch mid-open | Close picker; discard draft; do not write under wrong seat |

---

## 7. Store, privacy, due≠grade, locale

| Law | Detail |
|---|---|
| **Date-only** | Never time-of-day on this primitive. No clock UI. |
| **Store** | Always ISO `YYYY-MM-DD` string or `null`. Never store locale display string as SoT. |
| **Display** | Device/`Intl` locale formatting. Do not show raw ISO in the field when a locale format exists. |
| **Locale order** | Wheels column order follows locale (M-D-Y vs D-M-Y). Storage still ISO. |
| **Week start** | CEO grid Sun–Sat for US MVP default; PM may lock `weekStartsOn` prop — document, do not silently Mon-first without lock. |
| **School locale override chrome** | **Out** of this slice (device locale MVP). |
| **Birthday privacy** | Teacher full. Parent **read** = month/day only (`formatBirthdayMd` or equivalent). Student **none**. Full ISO may remain in DB; UI strip is product law. |
| **Matcher** | Date entry never inserts a student. |
| **Due ≠ grade** | Due is filing meta only. Nothing is a grade until teacher **Approves**. Chips/due UI must not imply scored work. |
| **Timezone** | User chrome is calendar date; school-local date semantics are data-layer concerns — picker must not invent UTC-drift “fixes” as visible time zones. |

---

## 8. Explicit non-goals

- Time-of-day, `datetime-local`, user timezone picker, range (start–end) picker.
- School calendar product / layered CAL track (class/sport/personal calendars).
- Class-create chrome; teachers cannot create classes from DATE.
- Student-facing birthday or due **editors**.
- Parent editing class assignment dues.
- Office/superintendent school-wide birthday or due policy UI this slice.
- Matcher/auto-insert of students from a date.
- New npm date-picker package as a **design requirement** (Eng may still choose later under PM/Arch).
- New View-stroke icons on design cards; inventing chrome outside `useTheme()`.
- Patching `docs/ui-design.md` before PM lock (Designer fold is a **later** card after lock).
- Implementing `src/`, SQL, Edge, qa-loop, git, unblocking DATE-I1 from this card.
- Picking option A/B/C on this QA Supervisor card.
- Enrollment start/end, parent DOB, event dates beyond birthday + assignment/practice due.

---

## 9. Intent gaps remaining (owners)

**Checked against** `date-input-pm-lock.md` Hybrid A+micro (DATE-P1 DONE). Prior pending gaps closed:

| # | Was | Resolution |
|---|---|---|
| G1 | Pack stance | **Closed** — Hybrid A+micro |
| G2 | Due required? | **Closed** — Yes on Save assignment |
| G3 | Due min | **Closed** — allow past (min null default) |
| G4 | Birthday min/max | **Closed** — today−22y…today−3y |
| G5 | Week start | **Closed** — Sunday MVP |
| G6 | Type-in | **Closed** — web-first; native off |
| G7 | Chips ownership | **Closed** — outside AssignmentForm |
| G8 | Privacy caption | **Closed** — show mute on birthday edit |
| G9 | Tablet recipe | **Closed** in lock (A rule compact/wide) — Designer fold later |
| G10 | ui-design fold | **Not an intent gap** — later designer card after dual stamp (PM §7) |
| G11 | Parent linked-child edit | **Closed** — lock DATE-08 / US-P-BDAY cites §31.6 |

**Intent gaps remaining: none** (design-stage).  
**Not defects / not gaps:** Designer microcopy + `docs/ui-design.md` fold; Eng implement DATE-I1; prove-out execution.

**Stamp cross-check (no REJECT triggers found):** hats + dual-hat seat SoT; Clear≠Cancel; CEO wheels+calendar; birthday privacy year rules; due≠grade; student/signed-out none; multiplicity per-instance; non-goals explicit; not happy-path only.

---

## 10. Prove-out OBJECTIVE (for CoS → later `qa-engineer`)

> **Staffing note:** CoS creates the qa-engineer card. Draft plan **after** dual DESIGN STAMP APPROVED; **execute** after DATE-I1 (or eng implement) is terminal. This OBJECTIVE is the stamp yardstick — not a testplan file yet.

**OBJECTIVE — DATE prove-out vs stamped intent**

Prove the shared date-entry primitive is **full-featured**, not happy-path only:

1. **Hats:** Teacher birthday+due entry works; parent month/day **read** and linked-child birthday **edit** (if stamped); student has **no** birthday/due editor; signed-out none; office/super **no new** DATE chrome.
2. **Dual-hat:** Teacher+parent seat switch — Teach seat due/roster birthday only; Parent seat child birthday only; no wrong-seat due; no year on parent read after save.
3. **Chrome entry:** Documented paths open the primitive; no dead-end; labels distinguish Birthday vs Due.
4. **Lifecycle:** Empty → open → change → commit; **Cancel** restores prior; **Clear** nulls; already-set reopens centered; disabled cannot open; out-of-range errors without silent clamp.
5. **Multiplicity:** Two children independent birthdays; two due fields independent; chips do not cross-write; single modal host.
6. **CEO chrome:** Phone wheels month·day·year; web popup calendar Sun–Sat (or PM-locked week start) + month/year dropdowns refresh grid.
7. **Birthday year rules:** Teacher full; parent read md-only; student none; DB may keep ISO.
8. **Due chips vs primitive:** Chips set same ISO; Clear chip ≡ Clear law; chips never become a second SoT.
9. **Cancel vs Clear:** Automated or dogfood cases prove Esc/Cancel ≠ Clear.
10. **Locale store vs display:** Store ISO only; field shows locale; wheels order locale-safe; no raw ISO as primary label.
11. **Due ≠ grade:** Setting/clearing due does not create/approve a grade.
12. **Non-goals guard:** No time UI; no range; no CAL; no class-create; no student editor; no parent due editor.
13. **A11y smoke:** VoiceOver/TalkBack wheels or web keyboard grid + focus return (representative cases).
14. **Regression:** Existing assign chips + student Details save paths still work; matcher still never inserts students.

**Deliverable path (QE):** `notes/company/date-iqg-testplan.md` (or `notes/qa/`) with cases + execution evidence. Defects → board `kelyra` with severity per IQG. QA Supervisor release evidence only after prove-out.

**Next QA Engineer card title (suggested for CoS):**  
`[IQG-DATE-QE1] Test plan + cases — DATE primitive (post dual stamp; execute post DATE-I1)`

---

## 11. Structured handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | DATE design-stage IQG intent + stamp |
| **CONTEXT** | IQG standing; CEO wheels+calendar; research+options; PM lock Hybrid A+micro APPROVED |
| **REQUIREMENTS** | Hats, dual-hat, entry, lifecycle, multiplicity, reverse, privacy, due≠grade, ISO, prove-out OBJECTIVE, stamp vs lock |
| **CONSTRAINTS** | No pack invent; no src/SQL/git/ui-design patch; do not unblock DATE-I1 from this card |
| **FILES/AREAS** | Created/updated `notes/company/date-iqg-intent.md`; read `date-input-pm-lock.md` |
| **WORK PERFORMED** | Full real-world intent; restamp **APPROVED** vs Hybrid A+micro; gaps closed; prove-out OBJECTIVE |
| **VERIFICATION** | Lock on disk; stamp dual APPROVED; intent aligns DATE-01…15 + stories; no src edits |
| **RESULT** | QA Supervisor **APPROVED** · dual design stamp met |
| **OPEN ISSUES** | None design-stage; CoS may GRANT DATE-I1; designer fold later; QE after I1 |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | CoS may **GRANT DATE-I1** `t_7ecf9b69` (dual APPROVED). Staff designer ui-design fold when ready. After I1 terminal, staff `[IQG-DATE-QE1]` prove-out from §10. Never devops-release from this card. |

---

## 12. RELEASE STAMP (QA Supervisor)

```
RELEASE STAMP
Feature: DATE shared date-entry primitive
QA Supervisor: RELEASE APPROVED  date: 2026-09-10  profile-session: t_baed17a6 / qa-supervisor
Intent gaps remaining: none
Open P0/P1: none
```

**Against:** dual DESIGN STAMP (PM Hybrid A+micro `t_8ce3f697` + QA Sup `t_cbd9f5e7`) · DATE-I1 `t_7ecf9b69` terminal `wf_01a08d812bbc70b2bf8d2e4f173810fb` 0 P0/P1 · QE1 plan `date-iqg-testplan.md` · QE2 execute `date-iqg-proveout.md` `t_40034351`.

**Independent recheck (this card, inspection + unit — not second implement):**

| Stamp dim | Met? | Spot-check |
|---|---|---|
| Hats T bday+due / P md-read+edit / S none / signed-out+office none new | Yes | `student/[studentId].tsx:1278` mode=birthday; `AssignmentForm.tsx:321` mode=due required; `parent.tsx:346` `birthday_md` + `:402` edit; no DateInput under student todo; SQL `to_char(..., 'Mon FMDD')` year strip |
| Dual-hat seat walls | Yes | Due only AssignmentForm (teach path); parent bday only parent FormSheet; chrome seat SoT elsewhere — no merged due+bday chrome |
| Lifecycle Cancel≠Clear; empty/open/commit; disabled; OOR no clamp | Yes | `draft.ts` cancelDateDraft vs clearDateDraft; `DateInput.tsx` Esc/scrim cancel, Clear control; `birthdayForSave`/`rangeError` no silent clamp; `iso.test.ts` **12/12 pass** |
| Multiplicity + single host | Yes | `host.ts` claim closes prior; per-instance DateInput; chips bind form dueDate only |
| CEO chrome wheels + web calendar Sun + month/year | Yes | `dateWheels.tsx` locale order M·D·Y; `dateCalendar.tsx` weekStartsOn=0 default + month/year menus refresh grid |
| Privacy caption + parent md + teacher full details | Yes | DateInput mute caption “Parents see month and day only.”; parent read `birthday_md`; teacher Details `formatLocaleDate` full |
| Chips outside; due required Save; due≠grade | Yes | Tomorrow/Next week/Clear outside primitive `AssignmentForm.tsx:333-358`; Save blocks empty due `:544-546`; due is filing meta only |
| Non-goals | Yes | No time/range/CAL/class-create/student editor/parent due editor found on DATE surfaces |
| QE1 false missing-files | N/A | Superseded by QE2 ls + path:line; files present (DateInput 13896 B etc.) |

**Sticky leftovers (not FIX-NOW / not release blockers):** P2 `t_80e8d6fb` Ask `update_student` range guard · P2 `t_6e54a359` web calendar a11y keyboard/focus · P2 `t_5a975f9a` Details rename-before-bday-validate · P3 `t_2340bf0e` scrim rgba · P3 `t_f51c6182` host unmount release · P3 `t_7e546fa4` too-young unit · P3 `t_f2fcb0ff` optional SQL bounds · P3 `t_6eba3c85` anchored vs centered popover. None elevate to open P0/P1 vs stamp; keep parked.

**Evidence honesty:** Prove-out is code inspection + unit (allowed). Not live device dogfood screenshots. Primary stamp laws verified path:line + 12/12 iso/draft/host tests. Incomplete P2 a11y/Ask-path polish does not REJECT.

**RECOMMENDED NEXT ACTION:** CoS may staff `devops-release` **only if CEO says ship**. Do **not** unblock DATE leftover P2/P3 from this card. Do not staff Eng FIX-NOW unless CEO/PM elevates a leftover.

---

## 13. DITL IMPACT — leftover close-out (post-I1 P2/P3)

**Card:** `t_0d30dce6` · **Loop:** `t_0158eebf` / `wf_01a08ddc266c72428e4c5211d600cf78` passed · **Handoff:** `notes/company/date-i1-leftover-handoff.md` · **SoT:** `notes/company/DITL_OS.md`

```
DITL IMPACT
Change: DATE leftover close-out (I1 P2/P3 user-visible) — Ask update_student birthday range guard; web calendar a11y (dialog, arrows, Esc, focus return); Details/parent name-only save when birthday unchanged; overlay token scrim; host unmount release; desktop web field-anchored popover. SQL birthday bounds file produced but not live (DITL_OS skip).
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: No new hat, day shape, chrome entry, or dual-path activity. DITL O-02 / O-07 / T-05 still correctly treat birthday as bio metadata (UI Details + Ask update_student) with in-range fixture 2017-04-12; expected durable ISO + teardown unchanged. Leftovers refine DATE primitive guards/a11y/layout already owned by DATE IQG prove-out (date-iqg-testplan.md / date-iqg-proveout.md), not obsolete DITL day stories. Name-only save and OOR Ask guard do not invalidate existing case expected outcomes. No DITL-UPDATE card.
```

**RECOMMENDED NEXT ACTION:** NONE → no CoS `DITL-UPDATE:` card.

---
