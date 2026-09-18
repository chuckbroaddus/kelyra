# DIARY-D1 — Journal day-browse UX option packs

**Date:** 2026-09-17  
**Author:** ui-ux-designer (Kelyra)  
**Card:** `t_220ada09` · Designer only  
**Status:** Options for PM. **Do not pick here. Do not stamp. Do not Eng.**

**Inputs (read-only, binding not lock):**  
`notes/company/diary-day-browse-research.md` (`t_574b8816`),  
`src/app/diary.tsx`, `src/app/calendar.tsx`, `src/components/calendar/*` (look reference only),  
`docs/ui-design.md`, teacher chrome laws, CEO 2026-09-17 (same *kinds* of day-pick / multi-day scroll as Calendar; products stay separate).  
**Delta companion:** `notes/company/diary-day-browse-delta.md`  
**Mockups:** `notes/company/diary-day-browse-mockups/`

**DATE-P1** = composer date entry only — out of scope for this browse chrome.

---

## 0. Job of the screen / chrome (shared)

| Surface | Job | Not |
|---|---|---|
| **Diary** (`/diary`) | Owner private Journal + immutable Ledger; entry from hamburger (not tray sixth) | Calendar; Needs; student To-do |
| **Journal segment** | Write / read / photo / STT private entries by `entry_date` | Shared school events; layers; publish |
| **Journal day-browse chrome** | Pick a day and scroll entries across days with Calendar-*like* navigation kinds | Calendar functions (events, layers, dues, sports, CalendarsSheet, EventComposer) |
| **Ledger segment** | List + range + family chips of action log | Day grids / steppers (all packs default Keep) |
| **Parent child chips** | Scope Journal to one linked child (fail-closed if 2+ and none focused) | Twin merge; other children's existence dots |
| **Teacher soft student pointer** | Private search filter on Journal | ACL; grade; Calendar student layers |

**Survive in every option**

- Diary ≠ Calendar products/routes. No Calendar events on Diary; no Diary body on Calendar.  
- Journal-only day-browse; Ledger keeps list + range (research default).  
- Student seat: no Diary.  
- Twins / multi-child: fail-closed empty until a child chip is focused.  
- Presence indicators: **owner-only** entry dots/counts — never role tints / other people's events.  
- Composer stays Diary-internal (`createDiaryEntry` etc.). DATE-P1 stays composer.  
- No 6th tray; teacher tray laws untouched.  
- No invented View-stroke glyphs (placeholder labels OK in mockups).  
- No app code / SQL / qa-loop / git from this card.

---

## 1. Shared non-goals (all packs)

- Merge Diary + Calendar routes, IA, or composers.  
- Import live Calendar event/layer/composer/CalendarsSheet/hidden-dues/sports into Diary.  
- Rainbow role-tint dots or multi-layer seeds on Journal days.  
- Student Diary; Office-visible journal body.  
- Day-browse chrome on Ledger as default (any Ledger visual day chrome = isolated rejected-risk note only).  
- Ask NL (`t_cecf2af0`).  
- FullCalendar / Wix / Reminders product.  
- IQG stamp; PM lock; Eng implementation.  
- “PM should pick A” as a decision — recommendation label only below.

---

## 2. Pack index

| Pack | Stance | Day pick | Multi-day scroll | View chips | Calendar look reuse | Eng size |
|---|---|---|---|---|---|---|
| **DB-A** | **Lean day-pager** | Horizontal week strip + ◀ ▶ + Today | Continuous agenda scroll across consecutive days | None (always day-led) | Low — strip + headers only | S |
| **DB-B** | **Month + day agenda** | Month grid (presence dots) → selected day list | Month jump + optional adjacent-day strip under grid | None (or Today only) | Medium — MonthGrid *kind* forked | M |
| **DB-C** | **Calendar-parity browse** | Day · Days · Month modes | Multi-day columns / stepper *kind* + agenda | Day / Days / Month (Journal-local) | High — forked visuals, still no Calendar functions | L |

**Rejected-risk aside (not a pack):** Ledger day-grid — research says Journal-only; if PM ever reopens, isolate as RR-L and keep out of default ship.

---

## 3. Before vs after (shared baseline)

### Before (live Journal)

| Piece | Live |
|---|---|
| Segment | PersonTabs Journal · Ledger |
| Date filter | From / To **YYYY-MM-DD TextFields** + Apply |
| Sort | Newest / Oldest chips |
| List | Flat-ish list grouped by `entry_date` SectionHeader |
| Day pick chrome | None |
| Multi-day scroll chrome | None (scroll is just the filtered list) |
| Presence on days | None |
| Parent 2+ children | Child chips; fail-closed empty |
| Teacher pointer | Class / student chips (soft) |
| Composer | FormSheet in Diary |

### After (CEO direction — all packs)

| Piece | Direction |
|---|---|
| Date navigation | **Visual day pick** + ability to **scroll entries across days** |
| Look | May **resemble** Calendar browse kinds (grid / strip / stepper / day column *as list of entries*) |
| Function | Journal entries only; products stay separate |
| Text From/To | Change or demote (see packs) — not the primary phone path |

---

## 4. DB-A — Lean day-pager

### Stance

Journal stays a **dated notebook**. Navigation is a **thin day strip** (week of day-numbers) plus prev/next day and Today — the smallest Calendar-*kind* chrome that still lets someone pick a day and read across days without a month product or view chip stack.

### Job of this chrome

Get the owner onto **one focused day** fast, then **scroll the multi-day entry stream** (focused day pinned or sticky header) without teaching Calendar's view model.

### Before → after

| | Before | After (DB-A) |
|---|---|---|
| Primary date UI | From/To text | **Week strip** (7 day cells) + ◀ day ▶ + **Today** |
| Focused day | Implicit (whole range) | Explicit **focused day**; strip selection moves focus |
| List | Grouped by `entry_date` in range | Default: **window around focus** (e.g. focus ± N days or “from focus backward” for Newest) with sticky day SectionHeaders while scrolling |
| Empty day | Silent skip in list | **Empty day card** under strip: “No entries yet” + **New entry** (opens Diary composer with DATE-P1 prefilled to focus) |
| From/To text | Primary | **Change → advanced / web-only collapse** (optional) or Drop from primary phone chrome |
| Sort Newest/Oldest | Chips | **Keep** (applies to multi-day stream order) |
| Month grid | None | Still none |
| View chips | None | Still none |
| Presence | None | Optional **single neutral dot** under strip cells with ≥1 own entry (owner-only) |
| Ledger | List + range | **Keep** |
| Composer | Diary | **Keep** |

### Phone vs web

| | Phone | Web (≥720) |
|---|---|---|
| Strip | Full width under Journal tabs / child chips | Same strip; wider day hit targets |
| Multi-day scroll | Single column stream | Same; maxWidth ~720 content column |
| Advanced range | Behind “Date range” disclosure if kept | May show From/To inline collapsed by default |

### Hat chrome

| Hat | Entry | Day-browse notes |
|---|---|---|
| Teacher | Hamburger Diary (tray laws untouched) | Soft student pointer **below** day strip (orthogonal); never mixes into presence dots |
| Staff / office seat | Hamburger Diary | Same chrome; no tray sixth |
| Parent | Hamburger Diary | **Child chips above** day strip; browse scoped to focused child; 2-child mock required |
| Student | None | Keep closed |

Twin chips vs date chrome: **child chips win vertical priority** (identity first, then day). Do not collapse child into day cells.

### Reuse vs fork

- **Look-only kinds:** week strip cells, today emphasis, sticky day headers, prev/next — *resemble* Calendar day chrome.  
- **Fork:** do **not** import `DayColumn` timeline (hour gutter is Calendar event time, not Journal). Journal day body = **entry cards**, not timed blocks.  
- **Out:** roleTint, CalendarsSheet, MultiDayStepper counts-as-event-columns, EventComposer.

### Presence indicators

- At most one **neutral** ink/mute **dot** (or small count “2”) on strip cells with owner entries for the focused scope (self, or focused child for parent).  
- Never role colors, never other users' event seeds.

### Constraints honored

Research Journal-only; owner-only; products separate; teacher tray unchanged; DATE-P1 composer-only; no new glyphs required.

### Explicit non-goals (DB-A)

- Month/year jump UI.  
- Days/Week/Month view chips.  
- Timed timeline day column.  
- Ledger visual day strip.

### Tradeoffs

- **Strong:** Lowest Eng; lowest “is this Calendar?” confusion; fits phone under twin chips + teacher pointer.  
- **Weak:** Weak month-scale jump; less “same kinds” as Calendar MonthGrid/Days than CEO might picture.  
- **Law risk:** Low.

### Recommendation only (not a lock)

**Recommendation only:** Prefer if CoS/PM want smallest ship and clear product separation over Calendar visual parity.

---

## 5. DB-B — Month + day agenda

### Stance

Journal day-browse **looks like Calendar month pick + day list**: a **month grid** with owner-only presence dots, tap a day, read that day's entries (and scroll neighboring days in an agenda stream). This is the middle “same kinds of elements” pack without full view-chip parity.

### Job of this chrome

**Jump by month**, **see which days have writing**, land a day, scroll multi-day agenda of entries — private notebook with calendar-muscle memory for *dates*, not *events*.

### Before → after

| | Before | After (DB-B) |
|---|---|---|
| Primary date UI | From/To text | **Month grid** (label + weekday row + cells) + month ◀ ▶ + **Today** |
| Day pick | Type ISO | Tap cell → **selected day**; list shows that day (embedded agenda) |
| Multi-day scroll | Range list only | **Agenda stream** under grid: selected day first, then adjacent days with entries (or continuous ± window); sticky SectionHeaders |
| Empty day | Skip | Selected empty day: empty state + **New entry** (composer date = selected) |
| Presence | None | **Neutral dots / small counts** on cells (owner-only; parent = focused child only) |
| From/To text | Primary | **Drop** from primary; optional power “Custom range” remains demoted |
| Sort | Newest/Oldest | **Keep** for agenda order within/across days |
| View chips | None | None required (optional single “List” toggle to hide grid = density escape hatch, not Calendar Agenda/Day/Week set) |
| Ledger | List + range | **Keep** |
| Composer | Diary | **Keep** |

### Phone vs web

| | Phone | Web |
|---|---|---|
| Layout | Grid on top, selected-day + multi-day list below (Calendar MonthGrid hybrid *kind*) | **Split:** left/sticky month (~280px) + right entry stream (web comfort) |
| Month title | Compact “September 2026” | Same + keyboard month jump optional later (not required) |
| Twin chips | Above grid | Above split pane |

### Hat chrome

Same entry rules as DB-A. Teacher soft pointer sits **under** month chrome or in a filter disclosure so grid stays scannable. Parent child chips always above grid.

### Reuse vs fork

- **Look-only:** Month grid structure like `MonthGrid` (weeks, today ring/pill, selected wash) — **forked Diary primitive**, not shared Calendar module that still carries tint index / AgendaList of `CalendarItem`.  
- **Agenda kind:** day-grouped **entry** rows (title, snippet, photo thumb, tags) — not event category + Hidden badge.  
- **Out:** `roleTintColor`, `buildDayRoleTintIndex`, year mini-months (unless later pack), TeacherWeekGrid, EventComposer, CalendarsSheet.

### Presence indicators

- Dot = “I have ≥1 journal entry that day” in scope.  
- Optional count badge ≤9 / “9+” if density wanted (PM).  
- Empty cell = no mark (not a grey “blocked” state).

### Constraints honored

Same product bars; dots never leak other people; fail-closed multi-child; Journal-only.

### Explicit non-goals (DB-B)

- Full view chip set (Day/Days/Week/Year).  
- Multi-day *event* columns / pinch.  
- Importing Calendar `MonthGrid.tsx` as-is.  
- Ledger month grid.

### Tradeoffs

- **Strong:** Best match to CEO “kinds of elements” for day pick + scroll without swallowing Calendar IA; month jump solves From/To pain.  
- **Weak:** More vertical chrome on phone with twin + pointer + FERPA note; Eng medium; must discipline fork so events never appear.  
- **Law risk:** Medium only if Eng reuses Calendar item pipeline by mistake (design: fork visuals, separate data).

### Recommendation only (not a lock)

**Recommendation only:** **DB-B** is the recommended pack for CEO direction balance — Calendar-*like* month pick + multi-day entry agenda, products still separate. Not a lock.

---

## 6. DB-C — Calendar-parity browse chrome

### Stance

Journal gets a **local view chip row** of the same *kinds* as Calendar browse modes that make sense for a notebook: **Day · Days · Month** (Agenda optional as “List”). Multi-day uses a **stepper / column strip** *kind* so scrolling across days feels like Calendar Days — still filled with **entries**, never events.

### Job of this chrome

Maximum **muscle-memory transfer** from Calendar navigation into Diary Journal for power users who live in both products, while hard-lining function separation in copy and empty states (“Your entries” not “Nothing coming up on the calendar”).

### Before → after

| | Before | After (DB-C) |
|---|---|---|
| Primary date UI | From/To text | **View chips** + mode body |
| Day mode | n/a | Single focused day **entry stack** (card list, not hour timeline) + day ◀ ▶ + Today |
| Days mode | n/a | **3/5/7 day strip** (MultiDayStepper *kind*) + horizontal or multi-column entry stacks per day; swipe/scroll across days |
| Month mode | n/a | Month grid + selected-day list (DB-B body inside Month chip) |
| List / Agenda mode | Default list | Optional **List** chip = multi-day entry agenda without grid (demote From/To) |
| Presence | None | Neutral dots on month + day headers with counts |
| From/To | Primary | **Drop** primary; range becomes an effect of mode window |
| Sort | Chips | Keep; may hide in Day mode (single day) |
| Ledger | Keep list | **Keep** |
| Composer | Diary | **Keep**; empty day CTA opens composer |

### Phone vs web

| | Phone | Web |
|---|---|---|
| Default mode | **Day** or **List** (PM later — not locked here) | **Days** or **Month** side-by-side comfort |
| Chip row | Horizontal scroll under Journal tabs | Full chip row + Today |
| Days columns | Swipe pager of day stacks | 3–5 columns visible |
| Chrome pressure | Highest — chips + child + pointer | Split pane Month | stream OK |

### Hat chrome

Identical product bars. **Twin chips vs date chrome:** child chips remain above view chips; never fold children into view segmented control. Teacher pointer stays filter chrome, not a Calendar “layer.”

### Reuse vs fork

- **Look-only high:** view chips layout like Calendar `Agenda/Day/Week/Days/Month`; stepper like `MultiDayStepper`; month like `MonthGrid`.  
- **Hard fork / adapters only:** zero `CalendarItem`, zero role tint seeds, zero Hidden dues, zero sports opt-in, zero Calendars sheet.  
- **Day body:** entry cards — **explicit non-goal** of hour-gutter `DayColumn` timeline (Journal entries are not timed school blocks by default; if entry has time metadata later, still not Calendar events).

### Presence indicators

Same owner-only neutral marks; Days mode may show a count in each day header (“2 entries”). Never multi-tint stacks.

### Constraints honored

Products separate; Journal-only; owner-only; no tray sixth; DATE-P1 out of browse.

### Explicit non-goals (DB-C)

- Week *teacher grid* of class periods.  
- Year view (can defer; not required to claim parity kinds).  
- Event composer / layers / category chips.  
- Shared component module that still knows CalendarItem (prefer Diary-named primitives).  
- Ledger parity browse.

### Tradeoffs

- **Strong:** Closest to CEO wording “same kinds of elements”; multi-day scroll is first-class.  
- **Weak:** Highest Eng + a11y; phone chrome stack with parent twins; highest misread risk (“Diary became Calendar”).  
- **Law risk:** Medium–High chrome-confusion; mitigate with Journal copy, entry-only rows, no tint rainbow, separate route.

### Recommendation only (not a lock)

**Recommendation only:** Only if Chuck prioritizes near-Calendar navigation density in Diary and accepts larger scope + IQG chrome-entry scrutiny.

---

## 7. Cross-pack comparison (tradeoffs, not a pick)

| Dimension | DB-A Lean pager | DB-B Month + agenda | DB-C Parity browse |
|---|---|---|---|
| Day pick | Week strip | Month grid | Chips + mode bodies |
| Multi-day scroll | Continuous agenda stream | Agenda under/ beside month | Days stepper/columns + agenda |
| Calendar resemblance | Low–med | Medium–high | High |
| Function bleed risk | Low | Med (Eng discipline) | Med–High (perception) |
| Phone + 2 child chips | Fits best | Tight but workable | Tightest |
| Teacher pointer coexistence | Easy | Disclosure helps | Easy to clutter |
| Text From/To | Demote | Drop primary | Drop primary |
| Ledger | Keep list | Keep list | Keep list |
| Presence dots | Optional strip | Required on month | On month + day headers |
| Eng size | S | M | L |
| Empty day CTA | Yes | Yes | Yes (all modes) |

---

## 8. Orthogonal atoms (any pack after pick)

| Atom | Choices (PM later) | Notes |
|---|---|---|
| **PR-*** Presence | Dot only · count · both | Owner-only always |
| **RG-*** Range leftover | Drop · disclosure · web-only | Don’t fight visual focus |
| **SR-*** Sort home | Keep chips · menu · mode-dependent | Newest default stays research-safe |
| **EM-*** Empty | Copy only · + New entry primary | Composer still Diary |
| **FW-*** Fork weight | Visual copy · thin shared date math only | Never shared event model |
| **RR-L** Ledger day chrome | Rejected default | Only if PM reopens research |

---

## 9. Recommendation summary (label only — not a lock)

| Rank (advisory) | Pack | Why (advisory) |
|---|---|---|
| 1 | **DB-B** | Month pick + multi-day entry agenda matches CEO “kinds” without full Calendar shell |
| 2 | **DB-A** | Safest small ship if parity pressure is secondary |
| 3 | **DB-C** | Max navigation parity; highest cost and misread risk |

Designer does **not** choose. PM selects; QA Supervisor IQG; CoS shows Chuck mockups; Eng only after dual stamp.

---

## 10. Handoff

| Deliverable | Path |
|---|---|
| Options | `notes/company/diary-day-browse-ux-options.md` (this file) |
| Delta | `notes/company/diary-day-browse-delta.md` |
| Mockups | `notes/company/diary-day-browse-mockups/` |
| Research (input) | `notes/company/diary-day-browse-research.md` |

**RECOMMENDED NEXT ACTION:** Stop. CoS staffs **product-manager** ∥ **qa-supervisor** (not parented onto IQG parent `t_ea554343`). No Eng until dual stamp.
