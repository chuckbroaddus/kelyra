# DATE-P1 — Date-entry primitive (PM lock)

**Date:** 2026-09-10  
**Author:** product-manager (Kelyra)  
**Card:** `t_8ce3f697` · Options: `notes/company/date-input-options.md` · Research: `notes/company/date-input-research.md`  
**Status:** BINDING product law for shared date-entry. Spec only — no `src/`, SQL, Edge, qa-loop, git, ui-design patch, or DATE-I1 unblock on this card.

**CEO lock (2026-09-09) honored:** phone rolodex month·day·year; web popup calendar (Sun–Sat grid, month/year dropdowns).

---

## DESIGN STAMP

```
DESIGN STAMP
Feature: DATE shared date-entry primitive
Quality goals: date-only ISO store; CEO phone wheels + web calendar; a11y; birthday privacy year rules; due is not a grade
PM: APPROVED  date: 2026-09-10  profile-session: product-manager / t_8ce3f697
QA Supervisor: NOT YET (their card DATE-Q1 / t_cbd9f5e7)
Intent gaps remaining: none (PM side); QA Supervisor may still list intent gaps on DATE-Q1
```

**Dual stamp required before Engineering / DATE-I1.** This card stamps PM only.

---

## 0. Binding pick (summary)

| Decision | Lock |
|---|---|
| **Stance** | **Hybrid A+micro** (named) — base **Option A**; micro from B + C below |
| **Phone** | CEO wheels (month · day · year), sheet Done/Cancel/Clear |
| **Web** | CEO popup calendar + **web type-in** (B micro) |
| **Tablet** | A rule: compact = wheels sheet; wide ≥768 = calendar popover/docked |
| **Type-in** | Web-first (B); native type-in **off** by default |
| **Chips** | **Outside** primitive on AssignmentForm (A/B; not C-inside-sheet) |
| **Birthday required?** | **Optional** |
| **Due required?** | **Yes** on Save assignment (surface prop) |
| **Due min** | **Allow past** (default min null); open default = tomorrow |
| **Birthday min/max** | **today−22y … today−3y** (props; out-of-range = error, no silent clamp) |
| **Week start** | **Sunday** MVP (US K–12); `weekStartsOn` prop later |
| **Parent privacy caption** | **Show** mute caption (C micro) on birthday edit |

**Rejected pure packs:** pure B (dual commit race on phone); pure C first (shell split can follow after A ships).

---

## 1. Why Hybrid A+micro

### 1.1 Chosen base = Option A

1. **CEO wording is platform shells:** phone = wheels; web = popup calendar. A is the straight read of that lock with one `DateInput` and props for birthday vs due — least chrome drift for Eng and prove-out.
2. **One component** matches research DIR-1 §4 (shared primitive over per-screen pickers) without forcing two named shells before call sites prove prop soup.
3. **Lifecycle is draft-then-commit** (Done / day-click), Clear ≠ Cancel — clean IQG open/change/clear/cancel/already-set without B’s dual blur+picker races on phone.
4. **Due chips stay form-level** as shipped §29.4 muscle (Tomorrow / Next week / Clear) — no C sheet-interior chips for MVP.

### 1.2 Micro from B (adopted)

| Micro | Lock | Why |
|---|---|---|
| Web type-in + parse | First-class on web beside calendar | Historical birth years and power users; already close to native TextField parse today; calendar alone is weak for 2014 scroll |
| Native type-in | **Default off** | Avoid keyboard + wheels fight; wheels remain primary on phone |

### 1.3 Micro from C (adopted)

| Micro | Lock | Why |
|---|---|---|
| `formatBirthdayMd(iso)` util | Shared read helper | Parent read month/day is product law, not a second picker |
| Mute privacy caption on birthday **edit** | Teacher + parent edit surfaces | Surfaces FERPA year rule at the moment of full-date entry |
| Named shells later | **Not required for DATE-I1** | `BirthdayField` / `DueDateField` may appear as thin wrappers after A ships; engine stays one |

### 1.4 Rejected alternatives

| Pack / alt | Disposition | Reason |
|---|---|---|
| Pure A (no type-in) | **Rejected as sole path** | Web birth-year entry without type-in or strong year control is painful; CEO year dropdown helps but type-in is cheap progressive enhancement |
| Pure B | **Rejected** | Dual commit (blur parse + picker) adds race risk; phone type-in default wrong |
| Pure C first | **Rejected for v1 primitive** | Shell split is API sugar; chips-inside-sheet fights current AssignmentForm; can fast-follow |
| Keep `<input type="date">` only | **Rejected** | Fails CEO wheels + controlled web calendar |
| Third-party date-picker package as requirement | **Rejected** | Prefer platform / Expo / RN already in tree (Eng may still evaluate later without design mandate) |

### 1.5 Designer rec relationship

Designer non-binding rec (options §8) = A + micro from B/C. **PM accepts that rec as the named hybrid.** No competing option pack drawn.

---

## 2. Locked PM table (options §7)

| Decision | PM lock | Notes for later ui-design fold |
|---|---|---|
| **Stance** | **Hybrid A+micro** | One `DateInput` + platform shells; B web type-in; C md util + privacy caption; chips outside |
| **Phone** | CEO **wheels** month · day · year | Sheet: title, Cancel, three drums (locale order), Clear (if clearable), primary **Done** |
| **Web** | CEO **popup calendar** Sun–Sat + month/year dropdowns that refresh grid; **type-in** on field | Popover `role=dialog`; day-click commits; Esc/click-away without day-click = cancel |
| **Tablet** | **A rule:** compact → wheels sheet; wide (≥768) → calendar popover or docked calendar (not phone-clone-only) | Breakpoint recipe; no mandatory C dual-docked complexity |
| **Type-in** | **Web-first** (default on web, off native) | Parse locale numeric + ISO + loose `Mar 14 2017`; fail = inline error, no ISO write |
| **Chips ownership** | **Outside** `DateInput` on AssignmentForm | Tomorrow / Next week / Clear set value via form state; chips not inside wheel sheet |
| **Birthday required?** | **Optional** | Empty person Save OK; no blocking validation for missing birthday |
| **Due required?** | **Yes** on Save assignment | Empty due → field error e.g. `Add a due date`; surface prop `required` |
| **Due min** | **Allow past** (default `min` = null) | Late paperwork / backfill; surface may pass `min=today` later; smart open default = **tomorrow** |
| **Birthday min/max** | **min = today−22y**, **max = today−3y** | Configurable props; commit out-of-range = error caption, **no silent clamp** |
| **Week start** | **Sunday = 0** MVP | US K–12 default; optional `weekStartsOn` prop reserved; locale weekday **labels** still locale-aware |
| **Parent privacy caption** | **Show** mute caption on birthday edit | Teacher: parents see month/day only; Parent edit: same rule reminder; read surfaces strip year via util |
| **Store / display** | Store ISO `YYYY-MM-DD` or null; display locale-formatted | Never show raw ISO in field when locale format exists |
| **Date-only** | **Never time-of-day** | No datetime-local chrome |
| **Tokens / icons** | `useTheme()` only; existing Icon names | No new View-stroke on DATE-I1 unless icons card; calendar affordance = chevron / text if no icon |
| **IQG** | DATE-Q1 parallel (QA Supervisor owns intent file) | PM does not write intent file |

---

## 3. Binding product law

| Law ID | Lock |
|---|---|
| **DATE-01** | One shared **`DateInput`** (or equivalent engine) for all date-only entry in scope. Per-screen one-off pickers = rejected. |
| **DATE-02** | **Phone:** drum wheels month · day · year (locale column order). Commit = **Done**. Cancel / scrim = discard draft. |
| **DATE-03** | **Web:** anchored popup calendar, month grid, **Sun–Sat** columns (MVP), header month + year controls that refresh grid. Day-click commits + closes. Esc / click-away without select = cancel. |
| **DATE-04** | **Web type-in** allowed (parse on blur/Enter). **Native type-in default off.** |
| **DATE-05** | Value store = ISO `YYYY-MM-DD` string or `null`. Display = device/`Intl` locale. No school-locale override chrome this slice. |
| **DATE-06** | **Birthday** optional; age window default today−22y…today−3y; clearable; teacher full date; parent **read** month/day only; parent **edit** full ISO while editing then read strips year. |
| **DATE-07** | **Due** required on Save assignment; clearable; chips Tomorrow / Next week / Clear live on **AssignmentForm outside** the primitive; due is **filing meta, not a grade**. |
| **DATE-08** | **Hats that enter:** teacher (student Details birthday; assignment due); parent (linked-child Details edit only, existing §31.6 law). **Student: none. Signed-out: none.** Office/super: no new date chrome this slice unless already on a teacher-class path. |
| **DATE-09** | **Dual-hat:** chrome **seat is SoT**. Teach seat → class due / roster birthday. Parent seat → linked-child birthday edit. No merged chrome. |
| **DATE-10** | Matcher never inserts a student. Date entry does not create people. |
| **DATE-11** | Clear ≠ Cancel. Clear writes null (if clearable). Cancel restores prior committed value. |
| **DATE-12** | Out-of-range / unparsable = inline error under field (`danger` text); keep editor open / do not write bad ISO. |
| **DATE-13** | A11y: VoiceOver/TalkBack adjustable wheels; web dialog + grid keyboard (arrows, Enter, Esc, Tab); live region on month change; ≥44×44 targets; focus returns to field on close. |
| **DATE-14** | Multiplicity = **per-instance** state only (see §5). Single modal host: opening one picker closes another. |
| **DATE-15** | Teachers cannot create classes — unrelated; no class-create date chrome. |

---

## 4. User stories + acceptance

### 4.1 Hats matrix (who enters)

| Hat | Birthday entry | Due entry | Notes |
|---|---|---|---|
| **Teacher** | Yes — student person page → Details → Edit → Birthday row | Yes — AssignmentForm Due row + chips | Full date always |
| **Parent** | Yes — linked-child Details edit only (§31.6) | **No** | Edit = full ISO; **read** = month/day only |
| **Student** | **None** | **None** | `/todo` never shows birthday editor |
| **Signed-out** | **None** | **None** | No date chrome |
| **Office / super** | No **new** chrome this slice | No new | Unless already on a teacher-class path with existing edit |
| **Dual-hat teacher+parent** | Parent **seat** for child birthday; Teach seat for roster birthday of class students | Teach seat only | Seat SoT (DATE-09) |

### 4.2 Stories

**US-T-BDAY — Teacher sets / changes student birthday**  
As a **teacher**, I open a student’s Details Edit sheet and set or change Birthday so the roster holds an accurate optional birth date.  
**AC:**
1. Empty state shows mute placeholder / `Add birthday` pattern; no ISO stored.
2. Open picker: phone wheels sheet or web calendar (+ type-in); draft snapshot of current value or smart default ~today−10y centered.
3. Commit (Done / day-click / successful web parse) writes ISO `YYYY-MM-DD` to the form; Save person persists; Cancel on sheet discards draft only.
4. Already-set: field shows locale full date; reopen centers that date.
5. Clear (if present) → null; person Save still succeeds (optional).
6. Out-of-range vs today−22y…today−3y → inline error; no silent clamp; no bad ISO.
7. Mute privacy caption visible on edit: parents see month/day only (exact microcopy designer later).
8. Teacher **read** surfaces may show full date (existing visibility §23.4).

**US-T-DUE — Teacher sets assignment due date**  
As a **teacher**, I set a due date on the assign form so the assignment has filing meta for when work is due.  
**AC:**
1. Due field uses shared `DateInput` with due presets (open default **tomorrow** when empty).
2. Chips **Tomorrow / Next week / Clear** sit **outside** the primitive and write the same field value.
3. Save assignment with empty due → validation error on field (`Add a due date` or designer-equivalent); does not save.
4. Clear → null + chips deselect; required validation applies on Save.
5. Past dates **allowed** (late paperwork); no default min block.
6. Due is **not** a grade; Approve path unchanged — nothing is a grade until teacher Approves.
7. Cancel picker restores prior due; does not clear chips unless value actually cleared.

**US-P-BDAY — Parent edits linked-child birthday**  
As a **parent**, I edit a linked child’s details and set birthday (full date while editing).  
**AC:**
1. Entry only on linked-child Details edit (existing law); cannot edit other families’ children.
2. Same `DateInput` primitive (wheels / calendar / web type-in) as teacher path.
3. Save stores full ISO; **read** home / summary uses `formatBirthdayMd` → month/day only (e.g. `Mar 14`).
4. Privacy caption on edit reminds month/day-only on parent-visible read surfaces.
5. Optional: clear / empty Save OK.
6. No due-date entry for parent.

**US-S-NONE — Student has no date entry**  
As a **student**, I never see birthday or due editors.  
**AC:** `/todo` and student surfaces have no `DateInput` for birthday; no student due editor.

**US-X-NONE — Signed-out has no date entry**  
**AC:** Auth walls; no date chrome on marketing / sign-in beyond any non-product fields (none in scope).

**US-DH — Dual-hat seat**  
As a **teacher who is also a parent**, I use **Teach** seat for class due and class-roster birthday, and **Parent** seat for my own linked-child birthday.  
**AC:**
1. Teach seat: AssignmentForm due + student Details birthday for class students.
2. Parent seat: linked-child birthday only; no class due form on parent chrome.
3. No single screen that merges both without seat switch (DATE-09).
4. My children deep-link (if present) does not invent a third date chrome path — same parent edit law when on parent family pages.

### 4.3 API / props sketch (design-level, not eng)

```
DateInput
  label, value: ISO|null, onChange(ISO|null)
  min?, max?, required?, clearable?
  mode?: 'birthday' | 'due' | 'generic'   // presets only
  allowTypeIn?: boolean   // default true web, false native
  disabled?, errorText?
  weekStartsOn?: 0|1      // default 0 Sunday MVP
```

Helpers (shared): `toISODate`, `parseLooseDate`, `formatBirthdayMd`.

---

## 5. Lifecycle, multiplicity, reverse

### 5.1 Lifecycle state machine

| State | Behavior |
|---|---|
| **Empty** | Placeholder / `Add {label}` in `mute`. Value `null`. |
| **Open** | Snapshot **draft** = current committed value, else smart default (birthday ≈ today−10y; due = tomorrow). Wheels/calendar show draft. |
| **Change** | Draft updates live. Parent form **committed** value does not change until Done (phone), day-click (web calendar), or successful web parse commit. |
| **Already-set** | Field shows locale display of ISO; reopen selects/centers that date. |
| **Cancel** | Phone Cancel or scrim; web Esc / click-away without day-click → discard draft; prior committed unchanged. Typed web text reverts to last good display if draft abandoned. |
| **Clear** | Explicit Clear (sheet ghost and/or due Clear chip) → `null` + empty display; chips deselect on due. **Not** Cancel. |
| **Disabled** | Field `mute`; no open; `accessibilityState.disabled`. |
| **Error** | Out-of-range or unparsable: inline `danger` caption; do not write ISO; phone sheet may stay open. Empty optional birthday is **not** an error. Required empty due errors on **form Save**, same family as other required TextFields. |
| **Commit** | Writes ISO or null via onChange; closes picker; focus returns to field. |

### 5.2 Multiplicity

| Case | Law |
|---|---|
| Two linked children | Each child Details hosts its **own** `DateInput` instance; no shared global date state. Twin students = two roster rows, never one birthday for two people. |
| Two dues on one form (assignment + practice) | Two instances; chips bind to the active/focused field id via form state — no cross-write. |
| Two pickers | Single modal host: opening B closes A; no stacked sheets. |

### 5.3 Reverse / cancel paths

| Action | Result |
|---|---|
| Cancel in-flight edit | Prior ISO restored (or still null). |
| Clear after set | Returns to empty; optional birthday Save OK; due Clear then Save fails required check. |
| Reopen after commit | Shows committed value, not abandoned draft. |
| Seat switch mid-edit | Standard form discard / navigate confirm already owned by shell — date primitive does not invent a second dirty modal; draft discarded if sheet closed without Done. |

---

## 6. Explicit non-goals

| Non-goal | Why called out |
|---|---|
| **Time-of-day / datetime-local / TZ chrome** | Date-only primitive; school-local date semantics are data-layer, not picker UI |
| **Date range picker** (start–end) | Out of scope |
| **CAL product** — school/class/sport/personal layered calendars | Separate CAL track; not this primitive |
| **Class-create chrome** | Teachers cannot create classes; unrelated |
| **Student-facing birthday or due editors** | Student hat = none |
| **Parent editing class assignment dues** | Parent hat = birthday only |
| **Matcher / auto-insert students from a date** | Matcher never inserts a student |
| **New npm date-picker package as design requirement** | Prefer in-tree platform primitives |
| **New View-stroke icons on this card / DATE-I1 mandate** | Icons pipeline separate if needed |
| **Patching `docs/ui-design.md` on this card** | Later designer card **after dual stamp** |
| **`src/`, SQL, Edge, qa-loop, git, devops-release** | Not this card |
| **Unblocking / staffing DATE-I1** | Parked until PM + QA Supervisor both APPROVED |
| **Writing QA Supervisor intent file** | DATE-Q1 owns `*-intent.md` |
| **School locale override chrome** | Device locale MVP only |
| **Named `BirthdayField` / `DueDateField` shells as DATE-I1 requirement** | Optional fast-follow; engine = one `DateInput` |
| **Chips inside wheel sheet** | Stay on AssignmentForm (outside) |
| **Native type-in by default** | Off unless a11y escape prop later |
| **Office/super new date surfaces** | No new chrome this slice |

---

## 7. Designer note (later card — not this card)

**Do not do on DATE-P1 or DATE-I1 without a designer card.**

After **both** DESIGN STAMP lines are APPROVED (PM this file + QA Supervisor DATE-Q1):

1. CoS staffs `ui-ux-designer` to fold this lock into `docs/ui-design.md`:
   - Replace §23.2 Birthday control row with shared `DateInput` recipe (Hybrid A+micro).
   - Add primitive section (phone wheels sheet anatomy, web popover + type-in, tablet breakpoint, a11y, Clear≠Cancel).
   - Patch §29.4 due field + chips to reference the primitive (chips remain outside).
   - Privacy caption + `formatBirthdayMd` callout on parent read vs edit.
2. Exact microcopy, spacing, and sheet geometry are designer-owned within this law.
3. **PM does not sketch a competing pack or patch ui-design on this card.**

---

## 8. Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | PM lock shared date-entry primitive; stamp PM APPROVED |
| **CONTEXT** | CEO wheels + web calendar; DIR-1 research; DATE-D1 options A/B/C; IQG dual stamp; DATE-Q1 parallel; DATE-I1 parked |
| **REQUIREMENTS** | Stance + §7 table + stories/AC + lifecycle/multiplicity + non-goals + DESIGN STAMP |
| **CONSTRAINTS** | Choose only; no mockup packs; no research; no src/SQL/git/ui-design/DATE-I1 |
| **FILES/AREAS** | Created `notes/company/date-input-pm-lock.md`. Read options, research, IQG, ui-design §23.2/§29.4/§31.6 |
| **WORK PERFORMED** | Locked **Hybrid A+micro**; full PM table; laws DATE-01…15; stories US-T-BDAY/T-DUE/P-BDAY/S-NONE/X-NONE/DH; lifecycle; non-goals; PM stamp APPROVED |
| **VERIFICATION** | File exists with pick, stories, AC, non-goals, PM stamp; no src/ or ui-design.md edits |
| **RESULT** | **PM: APPROVED** 2026-09-10. QA Supervisor: NOT YET (DATE-Q1). DATE-I1 stays parked |
| **OPEN ISSUES** | Wait DATE-Q1 QA Supervisor stamp; if REJECTED, name gaps back to PM/designer — do not staff Eng |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | CoS: wait QA Supervisor APPROVED on DATE-Q1 `t_cbd9f5e7`. Only then may GRANT DATE-I1 `t_7ecf9b69` and later staff designer ui-design fold. If QA REJECTED: route gaps; do not staff Eng |

---

*End DATE-P1 PM lock — Hybrid A+micro · PM DESIGN STAMP APPROVED 2026-09-10 · card `t_8ce3f697`.*

