# CAL-R5 UX pack — CEO 12 chrome locks

**Date:** 2026-09-20  
**Card:** `t_04ef2c47` · Designer only  
**IQG parent (do not link):** `t_ef9d63b1`  
**Status:** Docs only. **No pick lock.** **No Eng. No `src/`.** PM chooses; QAS stamps intent.

**CEO lock pack (2026-09-20):** 12 numbered chrome/behavior fixes on live Calendar post R4 L-C+C-B + CR-CalTabs. Not a new product. Do not reopen L-C / C-B / CE-A / Desk / Diary. **Calendar ≠ Diary.**

**Live SoT (read only):** `src/app/calendar.tsx`, `ViewCustomizeSheet.tsx`, `CalendarsSheet.tsx`, `YearGrid.tsx`, `MultiDayStepper.tsx`, `AgendaList.tsx`, `TeacherWeekGrid.tsx`, `src/lib/chrome/titles.ts`, `usePushedTitle`, tray `trayTabs.ts`, `docs/ui-design.md`.

**Prior law HOLD except R5 deltas:** R4 L-C+C-B · CR-CalTabs one-row PersonTabs Y/M/W/D + +·search·gear · hats/twins · LF-A job · sports opt-in · lean composer · Hidden data · Desk≠Year · no tray reopen · build-icons.

**HOLD (out of R5):** hats · twins · LF-A remaining **Show** chips CEO did not drop (Academic / School / Sport / Personal) · Calendars sheet itself (item 9 keeps it) · Agenda capability code path may remain off-row without JUMP chrome.

---

## How to read

CEO already locked outcomes. This pack maps **current → proposed** per item with KEEP/ADD/CHANGE/DROP. No competing product packs. **Exception:** Item 11 Day List fold density — at most **A (recommended)** / **B (alternate)**; PM chooses.

Companion: `notes/company/calendar-r5-delta-vs-current.md`.

---

## Shared non-goals

- No app code / git / SQL / qa-loop from this card  
- No IQG stamp (PM/QAS)  
- No reopen Diary day-browse · Desk · tray CT-A · §32.2 flip  
- No Stacked/Details · Reminders · Inbox · rainbow  
- No invent View-stroke glyphs outside `build-icons`  
- Do not delete Calendars sheet or LF-A filter **job**

---

## Job of the screen / chrome (unchanged product job)

**Calendar** = seat-scoped school/class/personal/sport schedule surface: Year→Month→Day hierarchy, Week columns, gear modes/filters/calendars.  
**Not** Diary (private journal). Header title and tray noun must agree on first navigation tap.

---

## Item map (index)

| # | CEO lock (short) | Verb |
|---|------------------|------|
| 1 | Header title lag Diary↔Calendar first tap | **CHANGE** |
| 2 | Year: drop bold year under `<< 2026 >>` | **DROP** |
| 3 | Month chevron: Month, Year (no day) | **CHANGE** |
| 4 | Week 3/5/7 window semantics | **CHANGE** |
| 5 | Week range label MM/DD/YYYY – MM/DD/YYYY | **CHANGE** |
| 6 | Gear JUMP (Agenda/Days) section | **DROP** |
| 7 | Gear preset row All academic / School only / My sports / Reset | **DROP** |
| 8 | Clear Filters = none selected | **CHANGE** |
| 9 | Calendars Done → Settings; Settings Done closes | **CHANGE** |
| 10 | Gear footer helper copy | **DROP** |
| 11 | Day List continuous multi-day; no date chevron | **CHANGE** (+ density A/B) |
| 12 | Excess blank above Y/M/W/D tabs | **CHANGE** |

---

## Item 1 — Header title lag (Diary ↔ Calendar first tap)

**Job:** On first tap of tray/drawer/destination that opens Calendar or Diary, header wordmark must match the destination immediately (phone + web). No second tap.

### Current chrome

| Surface | Behavior |
|---------|----------|
| `calendar.tsx` | `usePushedTitle('Calendar')` — effect after mount |
| `diary.tsx` | `usePushedTitle('Diary')` — effect after mount |
| `titles.ts` | `/diary` → `named \|\| 'Diary'`; **`/calendar` missing** → falls through to `named \|\| 'Kelyra'` |
| `usePushedTitle` | Sets title keyed by pathname; cleanup nulls only if path still matches; **paint can precede effect** |
| Tray | `trayTabs.ts` labels Calendar / Diary update with route; header is separate SoT |
| Web | Same SPA path + pushedTitle race |

**Bug class:** title SoT split (static route table incomplete + effect-timed pushed title). First frame after nav can show prior destination wordmark (Diary on Calendar, Calendar on Diary) until a re-render/second interaction.

### Proposed chrome

| Area | Law |
|------|-----|
| **Static titles** | **ADD** `/calendar` (and `/calendar/*` if any) → **Calendar** in `headerTitleFor` without needing pushedTitle |
| **Diary** | **KEEP** static `/diary` → Diary; pushedTitle optional for person-named only (not required for base noun) |
| **Sync timing** | **CHANGE** so route commit sets header noun **before/at** first paint (static path wins; do not wait for screen effect) |
| **PushedTitle** | **KEEP** path-gated API; Calendar/Diary base nouns should **not depend** on it |
| **Seats / tray** | Teacher · parent · office · dual-hat: same first-tap rule wherever Calendar/Diary entry exists (tray, hamburger, deep link) |
| **Web vs phone** | **Same law** both |

**Verb:** **CHANGE** (titles SoT + timing). **ADD** calendar static route.  
**Non-goals:** redesign AppHeader; rename products; merge Diary/Calendar.

---

## Item 2 — Year view: remove extra bold year under chevron row

**Job:** Year chrome shows one year control only.

### Current

- Toolbar: `<<` · **{year}** · `>>` (`calendar.tsx` year toolbar)  
- `YearGrid` also renders bold `styles.yearTitle` `{year}` (fontSize 28) under the toolbar  

### Proposed

| Area | Law |
|------|-----|
| Chevron row | **KEEP** `<< year >>` (year digit tappable = Today jump HOLD R4) |
| Bold in-grid year | **DROP** `YearGrid` `yearTitle` row |
| a11y | YearGrid keeps `accessibilityLabel={`Year ${year}`}` on wrap |

**Verb:** **DROP** duplicate year title.  
**Web = phone.**

---

## Item 3 — Month chevron label: Month, Year (drop day)

**Job:** Month anchor reads month+year only.

### Current

- Month toolbar center uses `formatCalendarDisplayDate(monthAnchor)` → **Month Name DD, YYYY** (e.g. September 20, 2026)  
- `monthContaining().label` already is **Month Year** (unused in toolbar)

### Proposed

| Area | Law |
|------|-----|
| Month toolbar label | **CHANGE** → **Month, Year** (e.g. September 2026) — no day numeral |
| Storage | **KEEP** ISO anchors |
| Day / other views | Item 5 owns week range; Day Single still may show full date (item 11 drops Day **List** chevron entirely) |
| CR-CalTabs CAL-54 | **Supersede display only for Month level** — Month Name DD, YYYY no longer required on Month chevron |

**Verb:** **CHANGE** Month display helper (or use existing `monthRange.label`).  
**Web = phone.**

---

## Item 4 — Week 3 / 5 / 7 chip windows

**Job:** Multi-day stepper windows match CEO day sets; 7 stays correct.

### Current

- `MultiDayStepper` chips 3 · 5 · 7  
- `multidayRangeContaining`: **3/5 start at anchor going forward** (Wed → Wed–Fri / Wed–Sun); **7** = Sunday-start full week  
- Week tab forces 7 columns; 3/5 switch to `multiday` view  

### Proposed (locked)

| Chip | Visible days (example if today = Wednesday) | Rule |
|------|-----------------------------------------------|------|
| **3** | **TUE WED THU** | **Centered on today** (yesterday · today · tomorrow). Not forward-only from today. |
| **5** | **MON TUE WED THU FRI** | **Weekday work-week** of the week containing today/anchor (Mon–Fri). Not five days forward from today. |
| **7** | **KEEP** current full week (Sun–Sat as live) | CEO: “7 stays as today (correct).” |

| Area | Law |
|------|-----|
| Stepper chrome | **KEEP** 3/5/7 chips + Days label |
| Range math | **CHANGE** 3 = center-3; 5 = Mon–Fri; 7 = HOLD week |
| Prev/Next | Step by window (3 days / 1 work-week / 1 calendar week) consistently |
| Today jump | Window re-anchors so **today remains visible** in 3 and 5 |
| Pinch | **KEEP** enhancing only; same counts |

**Verb:** **CHANGE** multiday window semantics.  
**Web = phone.**

---

## Item 5 — Week day-range chevron: MM/DD/YYYY – MM/DD/YYYY

**Job:** Compact numeric range on Week/multiday toolbar.

### Current

- `formatCalendarDisplayDate` on both ends → e.g. September 14, 2026 – September 20, 2026  

### Proposed

| Area | Law |
|------|-----|
| Week + multiday range label | **CHANGE** → **`M/D/YYYY – M/D/YYYY`** (locale-appropriate numeric; US default **M/D/YYYY**, zero-pad optional — prefer **no** leading zero to match CEO “MM/DD/YYYY” spirit as numeric short form) |
| a11y | Spoken full dates OK (`accessibilityLabel`) |
| Month (item 3) | Separate — not this format |
| Day Single toolbar | Unchanged by this item (item 11 removes list chevron) |

**Verb:** **CHANGE** week/multiday display formatter.  
**Web = phone.**

---

## Item 6 — Settings JUMP section (Agenda + Days)

**Job:** Gear sheet no longer offers JUMP chips.

### Current

- `ViewCustomizeSheet` section **Jump** with Agenda + Days chips; closes sheet and `selectView('agenda'|'multiday')`  

### Proposed

| Area | Law |
|------|-----|
| JUMP section | **DROP** entire section (label + chips + handlers from sheet UI) |
| Agenda code path | **HOLD** capability off-row if still reachable elsewhere; **not** required chrome in R5 — CEO removed JUMP |
| Days / multiday | Reach via Week + 3/5 stepper (**KEEP**), not gear JUMP |
| CAL-41 “≤2 taps Agenda” | **Superseded for gear JUMP chrome** — do not restore Agenda chip on tab row |

**Verb:** **DROP** JUMP UI.  
**Web = phone.**

---

## Item 7 — Settings preset chip row (All academic / School only / My sports / Reset)

**Job:** Remove preset shortcut row from gear.

### Current

- Second Show-adjacent `ChipRow` of `FILTER_PRESETS`: All academic · School only · My sports · Reset  

### Proposed

| Area | Law |
|------|-----|
| Preset row | **DROP** from gear UI |
| Show category chips | **KEEP** Academic · School · Sport · Personal (LF-A remaining chips CEO did not drop) |
| Preset helpers in code | May remain internal; **no** user-facing preset chips in R5 gear |
| My sports path | User enables Sport chip + Calendars team layers — not preset row |

**Verb:** **DROP** preset row.  
**Web = phone.**

---

## Item 8 — Clear Filters = none selected

**Job:** Clear Filters deselects every selected Show chip (and does not re-select a default multi-set).

### Current

- Gear **Clear filters** and canvas empty-state Clear call `onPreset('reset')`  
- `applyPreset('reset')` → `defaultCategoryChipIds()` = **`['academic','school','personal']`** — **selects several**  
- CEO: “today it selects several”

### Proposed

| Area | Law |
|------|-----|
| Clear Filters action | **CHANGE** → set Show **category chips to none selected** (`[]`) |
| Layers / Calendars enabled set | **CHANGE companion:** restore **default enabled layers** (sport/team still default off) so Clear means “no category narrow + default calendars,” not a random empty security hole |
| Empty meaning | `categoriesForChips([])` today returns `[]` — Eng must treat Clear as **no category filter applied** (show all categories allowed by seat) **or** explicit “none selected = unfiltered categories.” **Design lock:** **none selected = unfiltered categories** (not “match zero categories”). Visual chips all off. |
| areFiltersNarrowed | **CHANGE** so chips-all-off is the Clear baseline (not “narrowed”); defaults trio is no longer Clear target |
| Preset Reset chip | **DROP** with item 7 — Clear is the only bulk clear |
| Empty-state Clear on canvas | **KEEP** recovery affordance; same semantics as gear Clear |

**Verb:** **CHANGE** Clear semantics.  
**Web = phone.**  
**Non-goal:** do not remove Show chips; do not make filters security.

---

## Item 9 — Calendars Done pops one sheet only

**Job:** Settings → Calendars is a stack. Calendars **Done** returns to Settings. Settings **Done** closes Settings.

### Current

- Gear `onOpenCalendars` → `setCalendarsOpen(true)` **and** `onClose()` (closes Settings)  
- `CalendarsSheet` Done / scrim → `setCalendarsOpen(false)` only — user lands on canvas, not Settings  

### Proposed

| Area | Law |
|------|-----|
| Open Calendars | **CHANGE** — open Calendars **without** dismissing Settings (stack / overlay on gear) |
| Calendars Done | **CHANGE** — close Calendars only; **Settings remains open** |
| Calendars scrim | Same as Done (pop one) — does not dismiss Settings |
| Settings Done | **KEEP** closes Settings (and any child if still open) |
| Calendars sheet body | **KEEP** (HOLD) — layers, unsubscribe≠delete, search ≥8 |

**Verb:** **CHANGE** sheet stack. **KEEP** Calendars sheet.  
**Web = phone** (web card + phone sheet both one-pop).

---

## Item 10 — Settings footer helper copy

**Job:** Remove instructional blurb under gear controls.

### Current

- Hint text: “Day List stays here in the customizer. Tab row is Year · Month · Week · Day. Use Year → Month → Day tap-zoom for hierarchy.”

### Proposed

| Area | Law |
|------|-----|
| Footer helper | **DROP** entire hint block |
| Done button | **KEEP** |

**Verb:** **DROP** copy.  
**Web = phone.**

---

## Item 11 — Day List = continuous multi-day activity list (no date chevron)

**Job:** Day view + Settings→Day→List shows a continuous scrollable multi-day activity stream. No `<< Month Day, Year >>` chevron row in List mode.

### Current

- Day mode **List** mounts `AgendaList` with **`days={[dayRange.day]}`** — single day only  
- Day toolbar `<< formatCalendarDisplayDate(day) >>` still shows in **both** Single and List  
- AgendaList skips empty days; sticky-ish section headings per day with events  

### Proposed — locked structure

| Area | Law |
|------|-----|
| Date chevron row | **DROP** when `dayMode === 'list'` (no `<< date >>` above list) |
| Day Single | **KEEP** chevron + DayColumn (item 11 does not remove Single chrome) |
| List body | **CHANGE** → **continuous multi-day** activity list; swipe/scroll up-down moves through days |
| Date headers | **ADD** in-list day headers (sticky preferred) when day changes — not a separate chevron row |
| Empty days | See density A/B below |
| Gear Day · List | **KEEP** entry to mode |
| Filters / hats | **KEEP** seat scope |

### Density options (PM chooses; A = designer recommendation only)

#### A — Continuous skip-empty (Recommended)

**Stance:** Stream of days that have ≥1 visible activity; thin “no events” only when user lands on a fully empty focused window.

| Field | Value |
|-------|-------|
| Fold | Rolling window from anchor (recommend **±14 days** from today/anchor, extend on overscroll if cheap) |
| Empty days | **Skip** in stream (no full blank sections) |
| Headers | In-list date headers on days that appear |
| Swipe | Vertical scroll only; no horizontal day pager required |
| Today | Optional subtle “Today” marker on header |
| Strong at | Dense school glance; matches CEO “list of activities across days” |
| Weak at | Harder to notice empty days exist |

#### B — Continuous with empty stubs (Alternate)

**Stance:** Same multi-day continuum but **include empty-day headers** (one-line “No events”) so calendar time is visible.

| Field | Value |
|-------|-------|
| Fold | Same rolling window |
| Empty days | **Show** compact empty stub under date header |
| Headers | Every day in window |
| Strong at | Time orientation |
| Weak at | More scroll chrome; noisier |

**Explicit non-goals (both):** restore JUMP Agenda as List; month chevron on List; Diary journal stream; horizontal-only day swipe as sole navigation.

**Verb:** **CHANGE** List body + **DROP** List chevron. Density **A recommended / B alternate**.  
**Web = phone** (web may use taller viewport; same IA).

---

## Item 12 — Excess blank between header and Y/M/W/D tabs

**Job:** Tighten space from AppHeader bottom → PersonTabs Year/Month/Week/Day row.

### Diagnosis (current)

| Suspect | Evidence |
|---------|----------|
| **Screen top pad** | `Screen` `paddingTop: pad + contextReserve` — Calendar is not `pageChromeHosted`; full page pad sits above first child (tabs) |
| **Not leftover Ghost Up** | Ghost Up / headerTrio already dropped in CR-CalTabs; no second toolbar above tabs in `calendar.tsx` |
| **PersonTabs solo** | `marginBottom: 8` + row `paddingVertical: 6` — below tabs, not above |
| **Parent child block** | Only when parent seat — extra block above tabs if present (lawful) |
| **Blank gap CEO sees** | Dominant = **Screen content paddingTop** (token pad) under fixed header, possibly stacked with chrome `contextReserve` if non-zero — reads as empty band before tabs |

**Conclusion:** Gap is **padding / content inset**, not a leftover interactive chrome row. No hidden Up row to delete.

### Proposed tight target

| Area | Law |
|------|-----|
| Calendar route top inset | **CHANGE** — minimize empty band under AppHeader so tabs sit **tight** (target **0–4px** beyond whatever safe content alignment sister destinations use; prefer match Desk/Diary first content rhythm) |
| Mechanism (Eng choice) | `pageChromeHosted`-style top collapse **or** Calendar-specific reduced `paddingTop` **or** pin PersonTabs in `collapse` slot — design cares about **result**, not API |
| Do not | Clip safe area; overlap header controls; pull tabs under wordmark |
| Web vs phone | Both tighten; web ≥720 same one-row CR-CalTabs law |

**Verb:** **CHANGE** top spacing.  
**Web + phone.**

---

## Settings sheet IA after items 6–10 (summary)

Post-R5 gear inventory (top → bottom):

1. **Views** title  
2. **Month** — Compact | List  
3. **Day** — Single Day | List  
4. **Show** — category chips only (no preset row)  
5. **Calendars** chip → stacked sheet (Done pops one)  
6. **Clear filters** — chips none selected + default layers  
7. **Done** — closes Settings  
8. **DROP:** JUMP · preset row · footer helper blurb  

---

## Keep / Add / Change / Drop rollup

| Verb | Items |
|------|-------|
| **KEEP** | CR-CalTabs row; `<<` `>>`; Year chevron year; Day Single chrome; Show chips; Calendars sheet; 7-day week; hats/twins/LF-A job; Desk≠Cal; Diary≠Cal |
| **ADD** | Static `/calendar` title; in-list Day List date headers; (A/B) multi-day List continuum |
| **CHANGE** | Title first-tap sync; Month label; 3/5 windows; week range format; Clear=none; Calendars stack; Day List body; top pad tight |
| **DROP** | YearGrid bold year; JUMP; presets row; gear helper copy; Day List chevron row |

---

## Recommendation (not a lock)

Ship all 12 CEO locks as specified. For item 11 density, designer **recommends A (skip-empty continuous)**. PM may pick B if empty-day orientation is required for school staff.

---

## Explicit pack non-goals

- Eng implementation / stamp / Chuck send  
- Reopening R4 layout packs or CR pack choice  
- Tray CT-A redesign  
- Merging Diary title stack with Calendar product  
- Removing Calendars or Show chips wholesale  

---

## Handoff

| Field | Value |
|-------|-------|
| **OBJECTIVE** | R5 UX map of CEO 12 locks |
| **FILES** | `notes/company/calendar-r5-ux-options.md` · `notes/company/calendar-r5-delta-vs-current.md` |
| **NEXT** | PM lock + QAS intent on parent `t_ef9d63b1`; Eng dark until dual stamp + Chuck send |
| **ESCALATION** | None — CEO locks complete; density A/B only open PM choice |
