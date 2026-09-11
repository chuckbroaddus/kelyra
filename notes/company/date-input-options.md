# DATE-D1 — Date-entry primitive (options)

**Date:** 2026-09-10  
**Author:** ui-ux-designer (Kelyra)  
**Card:** `t_b98912a6` · Parent track `[DATE]` · Research SoT: `notes/company/date-input-research.md`  
**Status:** Options only — **PM chooses**. Do **not** patch `docs/ui-design.md` on this card. No `src/`, SQL, qa-loop, git. Do **not** unblock DATE-I1. Designer does **not** stamp IQG.

---

## 0. Job of this chrome

| Surface | Job | Not |
|---|---|---|
| **Shared date field** | Enter / change / clear a **date-only** value (store ISO `YYYY-MM-DD`) | Time-of-day; range; school calendar product (CAL track) |
| **Birthday entry** | Optional person date; teacher full; parent display month/day | Student entry; invent student; FERPA leak of year to wrong hat |
| **Due-date entry** | Assignment / practice due on assign form | Grade until Approve; auto-publish |

**CEO lock (2026-09-09) — honored in every pack unless a pack declines with reason:**
- **Phone:** rolodex / drum wheels — month · day · year (iOS-like).
- **Web (as appropriate):** popup calendar — month view, Sun–Sat grid, header month + year dropdowns that refresh the grid.

**Research cite only:** DIR-1 §§1–5. **Chrome SoT (read, no patch):** `docs/ui-design.md` §4 tokens, §23.2 Birthday control (today), §29.4 due chips. **IQG lens:** hats, dual-hat, entry, lifecycle, multiplicity, reverse/cancel — complete enough for later PM + QA Supervisor stamps. This card does not write the intent file.

---

## 1. Shared locks (all options)

### 1.1 Product (do not reopen)

| Lock | Value |
|---|---|
| Date-only | Never time-of-day on this primitive. Store calendar date, not clock. |
| Store | Always ISO `YYYY-MM-DD` string (or null). Display is locale-formatted. |
| Matcher | Never inserts a student. Date entry does not create people. |
| Grade | Due date is filing meta, not a grade. Nothing is a grade until teacher Approves. |
| Birthday privacy | Teacher: full date when editing. Parent view of own children: **month/day only** on read surfaces. Student `/todo`: no birthday. |
| Hats that enter | Teacher (student Details birthday; assignment due). Parent (linked-child Details edit only — existing §31 law). Student: none. Signed-out: none. Office/super: no new date chrome this slice unless already on a teacher-class path. |
| Dual-hat | Chrome seat is SoT (teacher-who-is-parent uses Parent seat for child birthday edit; Teach seat for class due). |
| Tokens | `useTheme()` only. Field on `elevated`/`card`, text `ink`/`mute`, focus `brand`, error `danger`/`dangerSoft`, hairlines `line`. No hardcoded hex. |
| Icons | Prefer existing `Icon` names. Do **not** invent View-stroke glyphs. Calendar affordance only if already in pipeline; else mute chevron / field affordance text. New recipe → `npm run icons` later, not this card. |
| Packages | Prefer platform / Expo / RN primitives already in tree. Do not invent a third-party date-picker dependency in design as a requirement (PM/Eng may still choose later). |

### 1.2 Research answers as design choices (DIR-1 §5 — answered inside packs, not re-researched)

| Question | Design choice shared by all packs (packs may vary presentation) |
|---|---|
| Birthday vs due | Same engine; different **presets**: birthday optional + historical min/max + year may hide on parent **read**; due often required-on-assign + future-leaning + chips. |
| Default min/max | Birthday: approx school-age window (e.g. today−22y … today−3y) configurable per surface props. Due: default min = today (or yesterday for late capture) max = open or school-year end prop. Invalid out-of-range = error, not silent clamp on commit. |
| Locale | **Display** via device/`Intl` (and later school override if product adds it). **Storage** always ISO. Wheels column order follows locale (M-D-Y vs D-M-Y). Calendar weekday header locale-aware; CEO grid still Sun–Sat start unless locale forces Mon-first — packs state their rule. |
| Keyboard fallback | Web: typed parse allowed beside calendar. Native: wheels primary; optional parse field only where pack says. |
| Tokens | No new color tokens. May reuse field height 48, sheet geometry, focus ring already in ui-design. |
| A11y | VoiceOver/TalkBack adjustable wheels; web dialog + grid keyboard (arrows, Enter, Esc, Tab); live region on month change; 44×44 min targets. |
| Tablet | Not phone-clone only. Each pack picks wheels vs docked calendar vs hybrid. |
| Empty/error | Empty = placeholder / `Add {label}` pattern on Details; error = inline mute/`danger` caption under field, not Alert theater. |
| Near-term surfaces | Birthday + assignment due only this primitive. Enrollments/events = non-goal (CAL / later). |
| Date-only confirm | Yes across all fields in scope. |

### 1.3 Shared primitive vs per-screen

Research recommends **one** `DateInput` (or equivalent). Each pack states how it honors that:

| Pack | Shared? |
|---|---|
| A | One `DateInput` + platform presentation |
| B | One `DateInput` + always display-field chrome; picker is a mode |
| C | Shared **engine** + thin named shells (`BirthdayField`, `DueDateField`) — still one interaction core |

### 1.4 Before (shipped today)

- Birthday: web `<input type="date">`; native `TextField` + parse (`docs/ui-design.md` §23.2). No wheels, no shared calendar popover.
- Due: free field + chips Tomorrow / Next week / Clear (§29.4).
- No shared a11y contract; no explicit cancel/open lifecycle; multiplicity is “whatever the form does.”

### 1.5 CEO lock compliance note

All three packs implement phone wheels + web popup calendar. Differences are **stance** (when the picker opens, how tablet behaves, how birthday/due shells differ, keyboard strength) — not pixel tweaks of the same sheet.

---

## 2. Option A — One DateInput, platform shells (CEO-straight)

**Stance:** One shared `DateInput` component. Presentation is **platform-native muscle memory**: phone always opens **drum wheels** (month · day · year); web always opens **popup calendar** (Sun–Sat grid, month + year header dropdowns that refresh the grid). Tablet follows phone if narrow, web-style docked/popover if wide. Birthday vs due differ only by **props** (min/max, required, clearable, chips slot, read-format), not by separate components.

### 2.1 When A applies

| Surface | Phone | Tablet | Web desk |
|---|---|---|---|
| Open control | Tappable value row / field → bottom sheet with 3 wheels | Same sheet if compact; if wide (≥768) optional **inline wheels** in form column | Tappable field → anchored popover calendar |
| Commit | Sheet primary **Done** (or tap outside = cancel — see lifecycle) | Same | Day click commits + closes; Esc cancels |
| Due chips | Stay **outside** the primitive: Tomorrow / Next week / Clear set value via props | Same | Same |

### 2.2 Interaction (ASCII)

**Phone sheet (wheels)**

```
┌─────────────────────────────┐
│ Birthday              Cancel│
│     Mar  ·  14  ·  2017     │  ← three drums, locale order
│     ───     ──     ────     │
│ [        Done         ]     │  brand primary
└─────────────────────────────┘
```

**Web popover**

```
┌ Field: Sep 10, 2026  ▾ ┐  →  ┌ Sep ▾  2026 ▾  ‹ › ┐
                               │ Su Mo Tu We Th Fr Sa │
                               │        1  2  3  4  5 │
                               │ ...  10 (selected)   │
                               └──────────────────────┘
```

### 2.3 Lifecycle (open / change / clear / cancel / already-set)

| State | Behavior |
|---|---|
| **Empty** | Placeholder `Add birthday` / `Due date` in `mute`. No ISO stored. |
| **Open** | Snapshot draft = current value (or smart default: birthday ≈ today−10y; due = tomorrow). Wheels/calendar show draft. |
| **Change** | Draft updates live; parent form value **not** committed until Done (phone) or day-click (web). |
| **Already-set** | Field shows locale display; reopen shows same date selected/centered on wheels. |
| **Cancel** | Phone: **Cancel** or scrim dismiss → discard draft, keep prior committed. Web: Esc / click-away without day-click → discard. |
| **Clear** | Explicit **Clear** control: birthday optional → null; due → null + chips deselect. Not the same as Cancel. Clear may live as ghost in sheet footer **and** as external chip on due form. |
| **Disabled** | Field `mute`, no open, `accessibilityState.disabled`. |
| **Error** | After attempt to commit out-of-range or unparsable: keep sheet open (phone) or reopen hint; caption under field e.g. `Pick a date between …`. |

### 2.4 Birthday vs due (A choices)

| | Birthday | Due date |
|---|---|---|
| Required | Optional | Surface prop (assign form may require before Save assignment) |
| Default open | ~10 years ago centered | Tomorrow or today |
| Min/max | Age window props | min today (configurable); max open |
| Clear | Yes | Yes (+ existing Clear chip) |
| Chips | None | Tomorrow / Next week remain form-level |
| Parent **read** | Month/day only (`Mar 14`) — not this picker | N/A (parent doesn’t set class due) |
| Parent **edit** (linked child) | Full wheels/calendar while editing; save still stores full ISO; **read** surfaces strip year | — |
| Teacher read/edit | Full date | Full date |

### 2.5 Locale (A)

- Display: `Intl.DateTimeFormat` device locale (no school override chrome this slice).
- Wheels order: locale (`en-US` M-D-Y; `en-GB` D-M-Y).
- Web calendar: **CEO Sun–Sat** column order in US default; if locale weekStart=1, pack still **recommends Sun–Sat for US K–12 default** with optional `weekStartsOn` prop for later — document as prop, default 0 (Sunday) for MVP US schools.
- Storage: ISO only. Never show raw ISO in the field when a locale format exists.

### 2.6 A11y (A)

| Platform | Contract |
|---|---|
| iOS VoiceOver | Wheels `adjustable`; announce `{label}, {formatted date}`; Done/Cancel named. |
| Android TalkBack | Same adjustable semantics on each column. |
| Web keyboard | Tab to field → Enter/Space opens dialog (`role="dialog"` + label). Grid: arrows move day, Enter selects, PageUp/Down month, Esc closes. Month/year `<select>` or listbox in header. |
| Live region | `aria-live="polite"` on month title change. |
| Focus | Return focus to field on close. No focus trap beyond dialog pattern. |
| Reduce motion | Instant sheet; no wheel fling animation beyond OS default. |

### 2.7 Multiplicity

- Two children on one parent: each child Details hosts its **own** `DateInput` instance; no shared global date state.
- Two due fields (assignment + practice): two instances; chips target the focused field’s id via form state.
- Twin students: separate roster rows — never one birthday for two people.

### 2.8 Chrome entry (hats)

| Hat | Entry |
|---|---|
| Teacher | Student page → Details → Edit sheet → Birthday row. Assignment form → Due row. |
| Parent | Parent child Details edit (existing linked-child edit only). No due entry. |
| Student | None. |
| Dual-hat teacher+parent | Seat switch: Teach for due; Parent for child birthday. |

### 2.9 Shared primitive (A)

**Honors research one DateInput.** API sketch (design-level, not impl):

```
DateInput
  label, value: ISO|null, onChange
  min?, max?, required?, clearable?
  mode?: 'birthday' | 'due' | 'generic'   // presets only
  disabled?, errorText?
```

Platform file split (`DateInput.tsx` / `DateInput.web.tsx`) is an Eng detail; design requires equivalent behavior.

### 2.10 Non-goals specific to A

- No always-visible inline calendar on phone (that is density B/C tablet).
- No forced type-in on phone (optional Eng a11y escape only).
- No range picker, no time, no school calendar layers.

### 2.11 After (A)

Teachers and parents get OS-familiar pickers; due chips keep working; ISO store + locale display; clear cancel lifecycle defined.

### 2.12 A risks

| Risk | Mitigation |
|---|---|
| Distant birthday years painful on calendar if someone uses web only | Year dropdown required (CEO); wheels on phone primary for birth years |
| Cancel vs Clear confusion | Separate labels; Clear is explicit destructive-of-value, Cancel restores |
| Tablet awkward wheels | Wide breakpoint may dock calendar instead of wheels (stated above) |

---

## 3. Option B — Display field + deferred picker sheet/popover

**Stance:** One shared `DateInput`, but chrome always looks like a **normal form field** (height 48, `elevated`, label above). The value is always a **formatted string display** (and on web, an editable type-in). Opening the picker is secondary: phone still uses **wheels in a sheet**; web still uses **popup calendar** (CEO lock). Difference from A: **keyboard/type-parse is first-class**, commit model is field-centric (blur/parse), and the picker is a power assist — not the only path on web.

### 3.1 When B applies

| Surface | Phone | Tablet | Web desk |
|---|---|---|---|
| Resting chrome | `TextField`-like row: label + formatted value or placeholder | Same | Same + caret for type-in |
| Open picker | Trailing mute control or tap value → sheet wheels | Sheet if compact; **side-by-side** field + mini calendar if wide | Focus/click calendar affordance → popover; typing always allowed |
| Commit | **Done** on sheet **or** successful parse on blur | Same | Blur parse **or** day-click; last write wins with draft guard |

### 3.2 Interaction (ASCII)

```
Phone form row
┌──────────────────────────────┐
│ Due date                     │
│ Fri, Sep 18, 2026        [📅]│  ← affordance opens wheels sheet
│ Tomorrow · Next week · Clear │  ← chips still outside
└──────────────────────────────┘

Web
┌ Due date ───────────────────┐
│ 09/18/2026              [▾] │  ← type MM/DD/YYYY or locale; ▾ opens grid
└─────────────────────────────┘
```

(Affordance glyph: existing icon only if present; else text `Pick` / chevron — no new View-stroke on this card.)

### 3.3 Lifecycle (B)

| State | Behavior |
|---|---|
| **Empty** | Placeholder shows expected format hint quietly: `Mar 14, 2017` or locale short — not ISO. |
| **Open picker** | Same draft snapshot as A. |
| **Type-in (web + optional native)** | On blur/Enter: parse locale + ISO + `Mar 14 2017` patterns (shipped native parse today). Success → ISO onChange. Fail → error caption, keep typed text, do not write ISO. |
| **Change via picker** | Day-click / Done writes ISO and replaces display string. |
| **Already-set** | Display locale string; underlying value ISO. |
| **Cancel picker** | Discard draft; typed text in field **unchanged** if user had been typing. |
| **Clear** | Ghost Clear / chip / sheet Clear → null value + empty display. |
| **Disabled** | No type, no open. |
| **Error** | Inline under field; `danger` text only for invalid/out-of-range — not for empty optional birthday. Required empty on save = form-level, same as other TextFields. |

### 3.4 Birthday vs due (B choices)

| | Birthday | Due |
|---|---|---|
| Type-in | Encouraged on web (historical years fast) | Encouraged; chips still faster for near dates |
| Phone | Wheels primary; type-in **off** by default (avoid dual keyboard+sheet fight) | Wheels primary; chips primary shortcut |
| Parent read | Month/day strip year | — |
| Parent edit | Full ISO save; type-in allowed on web | — |
| Format hint | Longer form ok | Prefer short weekday+date for due display (`Fri, Sep 18`) |

### 3.5 Locale (B)

- Stronger than A on **input** parsing: accept device locale numeric order.
- Ambiguous `01/02/2026`: parse with device locale; on failure ask via error `Use Sep 18, 2026` example — no modal.
- Storage ISO. Display never forces ISO unless Eng debug.

### 3.6 A11y (B)

| Extra vs A | |
|---|---|
| Web | Field is real textbox (`aria-autocomplete` none) + button `Open calendar` (`aria-haspopup="dialog"`). |
| Screen reader | Announce both value and “edit text” / “date picker button”. |
| Keyboard | Type full date without opening grid; grid still fully keyboard operable when open. |
| Phone | Wheels sheet identical a11y to A; no competing TextInput unless `allowTypeInNative` prop (default false). |

### 3.7 Multiplicity / hats / entry

Same as A (per-instance state; teacher/parent entry; student none; dual-hat by seat).  
**Extra:** two due fields — type-in focus determines which field receives chip presses (chips bind to `activeDateFieldId` in form).

### 3.8 Shared primitive (B)

Still **one** `DateInput`. Adds:

```
allowTypeIn?: boolean        // default true web, false native
parseOnBlur?: boolean
showPickerAffordance?: boolean
```

### 3.9 Non-goals specific to B

- Not a plain `<input type="date">` only (CEO calendar + wheels still required).
- Not free-text notes field without parse.
- Not range or time.

### 3.10 After (B)

Forms feel like other Kelyra `TextField`s; power users type; touch users still get wheels/calendar.

### 3.11 B risks

| Risk | Mitigation |
|---|---|
| Parse ambiguity | Locale rules + explicit error example |
| Dual commit paths race | Single draft token; picker open disables blur commit until close |
| Phone keyboard + sheet clutter | Type-in default off on native |

---

## 4. Option C — Named shells over shared engine (Birthday / Due)

**Stance:** Keep one **interaction engine** (phone wheels · web calendar · ISO store · a11y · lifecycle), but ship two **named shells** teachers recognize in copy and defaults: `BirthdayField` and `DueDateField`. Shells own empty copy, presets, chips composition, year visibility helpers, and validation tone. This is the “shared core, surface-honest chrome” pack — not two unrelated pickers.

### 4.1 When C applies

| Shell | Phone | Tablet | Web |
|---|---|---|---|
| `BirthdayField` | Wheels sheet; default center ~age 10; age-window min/max | Wheels or **year-first** docked calendar (year dropdown emphasized) | Popup calendar; year dropdown primary control |
| `DueDateField` | Wheels sheet **or** jump-to-month for near dates; chips **inside** shell footer | Docked month grid + chips row | Popup calendar + chips row under field |
| Generic later | `DateInput` engine exposed only if a third surface appears | — | — |

**CEO lock:** still wheels on phone and popup calendar on web inside the engine. C does **not** decline CEO lock.

### 4.2 Interaction difference vs A/B

```
DueDateField (phone sheet)
┌─────────────────────────────┐
│ Due                   Cancel│
│   Sep · 18 · 2026           │  wheels
│ Tomorrow · Next week        │  chips INSIDE sheet (C only)
│ Clear date                  │  ghost
│ [ Done ]                    │
└─────────────────────────────┘

BirthdayField (web)
┌ Birthday ───────────────────┐
│ Mar 14, 2017            [▾] │
│ Only you see the year on    │  caption teacher; parent edit caption:
│ parent home shows month/day │  `Parents see month and day only.`
└─────────────────────────────┘
```

### 4.3 Lifecycle (C)

Same state machine as A for open/change/cancel/already-set/disabled.  
**C deltas:**

| | BirthdayField | DueDateField |
|---|---|---|
| Clear | Soft ghost `Clear birthday` in sheet; optional field never blocks Save person | `Clear date` + deselect chips; if assign form requires due, Save assignment validates |
| Cancel | Always safe | Always safe |
| Required empty | Person save OK | Assignment save shows field error `Add a due date` (if PM marks required) |
| Smart default on first open | today − 10 years | tomorrow |
| Out-of-range | `That birthday is outside the allowed ages.` | `Due date can’t be before today.` (copy by prop) |

### 4.4 Birthday vs due (C is explicit)

| Topic | BirthdayField design choice | DueDateField design choice |
|---|---|---|
| Historical vs near | Optimize for far years (year control prominent) | Optimize for ±60 days (month grid + chips) |
| Chips | None | Tomorrow / Next week **owned by shell** (still Clear) — form does not reimplement chips |
| Privacy caption | Teacher edit: optional mute caption about parent month/day | None |
| Parent edit | Shell available; after save, parent **read** components call `formatBirthdayMd(iso)` helper (shared util, not a second picker) | Not offered |
| Student | Hidden | Hidden |
| Min/max defaults | Age window | min=today, max=null or +1 school year prop |

### 4.5 Locale (C)

- Shared engine formats/parses.
- `formatBirthdayMd` always month+day regardless of locale order for **parent read** (privacy product rule > verbose locale year).
- Due display includes weekday when locale supports (`Fri, Sep 18`).

### 4.6 A11y (C)

Engine matches A. Shells set accessible names:

| Shell | `accessibilityLabel` examples |
|---|---|
| Birthday | `Birthday, Mar 14, 2017` / `Birthday, not set` |
| Due | `Due date, Friday, Sep 18, 2026` / `Due date, not set` |

Chips inside due sheet are individual buttons with names `Tomorrow`, `Next week`.

### 4.7 Multiplicity

- `BirthdayField` per child record — two children = two shells on two screens (or two rows if a future multi-edit; not required now).
- Two dues on one form: two `DueDateField`s; each owns chips; no cross-talk.
- Opening one sheet closes the other (single modal host).

### 4.8 Hats / dual-hat / chrome entry

| Hat | BirthdayField | DueDateField |
|---|---|---|
| Teacher | Student Edit sheet | AssignmentForm |
| Parent | Linked-child edit only | No |
| Student | No | No |
| Office/super | No new entry this slice | No |
| Dual-hat | Parent seat → birthday; Teach seat → due | — |

### 4.9 Shared primitive (C)

**Honors research “one primitive” at engine layer; splits product chrome:**

```
engine: DatePickerEngine (wheels | calendar | parse helpers | a11y)
shells: BirthdayField, DueDateField
util:   formatBirthdayMd, toISODate, parseLooseDate
```

Per-screen one-off pickers = **rejected**. New surface must use engine or a new named shell via design review.

### 4.10 Tablet rule (C distinctive)

| Width | Birthday | Due |
|---|---|---|
| Compact | Wheels sheet | Wheels sheet + chips |
| Wide tablet / desk | **Docked** calendar in form (not only popover) for due; birthday may stay popover (less frequent) | Docked month grid |

### 4.11 Non-goals specific to C

- Not two independent implementations (forked a11y forbidden).
- Not CAL school calendar product.
- Not parent due-date editing.
- Not time-of-day.

### 4.12 After (C)

Call sites read intent (`BirthdayField`) instead of prop soup; chips don’t drift between assignment screens.

### 4.13 C risks

| Risk | Mitigation |
|---|---|
| Shell sprawl | Only two shells until a third real surface; engine stays single |
| Chips duplicated outside shell | Due chips live only in DueDateField |
| Docked tablet calendar feels “web-only” | Still tokenized; same grid as popover |

---

## 5. Cross-pack IQG completeness matrix

QA Supervisor later stamps intent against these. Designer does not stamp.

| IQG lens | Covered in A/B/C? | Notes for PM + QA Sup |
|---|---|---|
| **Hats** | Yes | Teacher birthday+due; parent birthday edit + md read; student none; signed-out none; office/super no new chrome this slice |
| **Dual-hat** | Yes | Seat SoT: Teach vs Parent; no merged chrome |
| **Chrome entry** | Yes | Student Edit sheet; AssignmentForm; parent linked-child edit — no hidden dead-end |
| **Lifecycle open** | Yes | Sheet/popover open with draft snapshot |
| **Lifecycle change** | Yes | Draft then commit (A/C) or parse/picker (B) |
| **Lifecycle clear** | Yes | Explicit Clear ≠ Cancel |
| **Lifecycle cancel** | Yes | Scrim/Esc/Cancel restores prior |
| **Lifecycle already-set** | Yes | Reopen centers existing ISO |
| **Multiplicity** | Yes | Per-instance fields; two children; two dues; single modal host |
| **Reverse** | Yes | Clear returns to empty; Cancel aborts in-flight edit |
| **Empty** | Yes | Placeholder / Add label |
| **Error** | Yes | Inline out-of-range / parse |
| **Disabled** | Yes | No open |
| **Non-goals explicit** | Yes | §6 — time, range, CAL, class-create, etc. |
| **Privacy** | Yes | Parent read md; full ISO store; student no birthday |
| **Not a grade** | Yes | Due is filing only |

**Gaps intentionally left for PM (not designer invention):**

1. Exact age min/max numbers for birthday (suggest today−22y…today−3y).
2. Whether assignment due is **required** on Save assignment.
3. Whether due min is today vs allow past for late paperwork.
4. School locale override chrome (out; device locale MVP).
5. Whether web week starts Sunday always for US MVP (recommended yes).

---

## 6. Explicit non-goals (global + per pack)

### 6.1 Global (all packs)

- Time-of-day, datetime-local, time zones as user chrome (store date-only; school-local date semantics are data-layer, not picker UI).
- Date **range** picker (start–end).
- School calendar product, layered calendars, sports/personal calendars — **CAL track**, not this primitive.
- Class-create chrome (teachers cannot create classes — unrelated).
- Student-facing birthday or due editors.
- Parent editing class assignment dues.
- Matcher/auto-insert of students from a date.
- New npm date-picker package as a design requirement.
- New View-stroke icons on this card.
- Patching `docs/ui-design.md` before PM lock.
- Implementing `src/`, SQL, Edge, qa-loop, git, unblocking DATE-I1.
- Writing IQG intent file or DESIGN STAMP (PM + QA Supervisor).

### 6.2 Per pack extras

| Pack | Extra non-goals |
|---|---|
| A | First-class type-in as primary path; chips inside wheel sheet |
| B | Phone type-in by default; abandoning wheels/calendar |
| C | Fully separate birthday vs due implementations; third shell without design card |

---

## 7. PM handoff table

| Decision | What PM picks | What designer folds into `docs/ui-design.md` **after** PM lock (later card) |
|---|---|---|
| **Stance** | A · B · C (or hybrid micro-adoptions) | Replace §23.2 Birthday control row; add DateInput (or shells) primitive section; patch §29.4 due field to reference primitive |
| **Phone** | Confirm CEO wheels (all packs already) | Spec sheet anatomy, Done/Cancel/Clear |
| **Web** | Confirm CEO calendar grid + month/year dropdowns | Spec popover, keyboard, focus return |
| **Tablet** | A narrow=wheels / B side-by-side / C docked due | Breakpoint recipe |
| **Type-in** | Off (A) · Web-first (B) · Engine helper only (C) | Parse rules + error copy |
| **Chips ownership** | Outside field (A/B) · Inside Due shell (C) | AssignmentForm recipe |
| **Birthday required?** | Optional (recommended) | Details validation |
| **Due required?** | Yes/No on Save assignment | AssignmentForm validation |
| **Due min** | Today vs allow past | min prop default |
| **Birthday min/max** | Numeric ages | props defaults |
| **Week start** | Sunday MVP (recommended) | calendar header |
| **Parent caption** | Show privacy mute (C) or silent (A/B) | copy under Birthday |
| **IQG** | Staff DATE-Q1 with this file + PM stories | Designer does not stamp |

**Do not staff Engineering / DATE-I1 until:** PM APPROVED + QA Supervisor APPROVED on design stamp.

---

## 8. Recommended (non-binding)

**Recommendation only — PM chooses.**

**Recommend Option A (One DateInput, platform shells)** as the default pick, with these **micro-adoptions**:

1. From **B:** web type-in parse as progressive enhancement (not phone).
2. From **C:** `formatBirthdayMd` util + optional mute privacy caption on teacher birthday edit; keep chips **outside** on AssignmentForm (current §29.4 muscle) rather than inside the sheet.
3. Tablet: follow A (wheels compact / calendar popover or docked when wide) — do not require C’s dual docked complexity for MVP.

**Why A:** closest to CEO lock wording, one component for Eng, least chrome drift, clear cancel/clear lifecycle, enough IQG surface for stamps.  
**Why not pure B:** dual commit paths add form risk for little gain on phone.  
**Why not pure C first:** shell split is good API sugar but can wait until call sites prove prop soup; can be a fast follow after A ships.

---

## 9. Structured handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | DATE-D1 designer option packs for shared date-entry primitive |
| **CONTEXT** | CEO 2026-09-09 wheels + web calendar lock; research `date-input-research.md`; IQG standing OS; DATE-P1/I1 parked |
| **REQUIREMENTS** | 2–3 packs; lifecycle; hats; multiplicity; birthday vs due; locale; a11y; non-goals; PM table; no winner lock |
| **CONSTRAINTS** | Options only; no src; no ui-design patch; no git; no DATE-I1 unblock; date-only |
| **FILES/AREAS** | Created `notes/company/date-input-options.md`. Read research, IQG, ui-design §23.2/§29.4/§4 |
| **WORK PERFORMED** | Three stances A/B/C + IQG matrix + PM handoff + non-binding rec A+micro |
| **VERIFICATION** | File exists; no src/ or ui-design.md edits this card |
| **RESULT** | Options ready for PM choose + QA Supervisor intent |
| **OPEN ISSUES** | PM must set required/min-max/weekStart numbers; CoS staffs DATE-P1 + DATE-Q1 together |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | CoS: staff product-manager DATE-P1 **and** qa-supervisor DATE-Q1 same cluster. Keep DATE-I1 parked until dual APPROVED stamps. |
