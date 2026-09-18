# DIARY DAY-BROWSE — PM lock / spec (Journal Calendar-like chrome)

**Date:** 2026-09-17  
**Author:** product-manager (Kelyra)  
**Card:** `t_f766ae6a`  
**IQG parent (tracker only — do not `--parent`):** `t_ea554343`  
**Research:** `notes/company/diary-day-browse-research.md` (`t_574b8816`)  
**Options pack:** `notes/company/diary-day-browse-ux-options.md` · delta `diary-day-browse-delta.md` · mockups `notes/company/diary-day-browse-mockups/` (`db-a.html` · `db-b.html` · `db-c.html`) — designer `t_220ada09`  
**QAS intent (parallel):** card `t_d717511a` · expect `notes/company/diary-day-browse-intent.md` (land with QAS stamp)  
**Chrome entry (already stamped, not reopened):** Settings + Diary tray ST-A · `notes/company/settings-tabs-diary-tray-spec.md` (`t_78e0c247` / GAP-S1)  
**Live baseline:** `src/app/diary.tsx` (Journal From/To text + Apply + SectionHeader groups)  
**Status:** BINDING product law for **Journal day-browse chrome** only. Spec only — **no** app code, SQL, Edge, qa-loop, git, or Eng staffing on this card.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Diary Journal day-browse (Calendar-like chrome, separate product)
Quality goals: Owner-only private Journal day pick + multi-day entry scroll via DB-B month grid + agenda; products Diary≠Calendar (no events/layers/composer/CalendarsSheet on Diary; no Diary body on Calendar); Ledger stays list+range (no day-grid); student none; no 6th tray; presence = owner dots/counts never role tints; twins fail-closed; teacher soft pointer orthogonal; DATE-P1 composer-only; fork visuals not CalendarItem pipeline; FERPA note survives
PM: APPROVED  date: 2026-09-17  profile-session: product-manager / t_f766ae6a · notes/company/diary-day-browse-spec.md
QA Supervisor: PENDING  date: —  profile-session: t_d717511a / qa-supervisor · notes/company/diary-day-browse-intent.md (parallel; not required on disk at PM stamp time)
Intent gaps remaining: none known on PM side vs research + DB-B pack + mockup states; QAS may list additional — if QAS REJECTS, this PM stamp yields to restamp after gap close (do not Eng on single stamp)
```

**Dual stamp:** **NOT MET** until QAS also APPROVED on intent. Eng stays dark. CoS staffs Eng only after both APPROVED on parent `t_ea554343` (and/or linked stamp notes). This lock card does **not** staff Eng.

**PM stamp meaning:** Stories + AC cover hats, chrome entry, full lifecycle (pick/change/scroll/empty/today/cancel), multiplicity (twins fail-closed; teacher pointer orthogonal), reverse, non-goals, quality goals, chosen pack + atoms only from designer packs. Does **not** invent chrome. Does **not** design a competing pack. Does **not** implement `src/`.

---

## 0. Binding chrome pick (from options pack only)

Source: `notes/company/diary-day-browse-ux-options.md` + delta + `db-b.html` only. **No invented chrome / glyphs / competing packs.**

| Area | Locked ID | Why | Rejected |
|---|---|---|---|
| **Primary pack** | **DB-B** — Month + day agenda | CEO wants Calendar-*kinds* for **day pick** and **scroll across days**. Month grid + presence + selected-day agenda delivers month-scale jump and multi-day entry stream without shipping Calendar’s full view-chip shell. Best quality/Eng balance vs product-separation risk. | **DB-A** (week strip only — under-delivers month jump / “kinds” CEO named); **DB-C** (Day·Days·Month chips + stepper columns — highest misread “Diary became Calendar” + phone chrome stack with twins/pointer) |
| **Presence** | **PR-BOTH** | Mockup/pack: single neutral **dot** when count=1; small **count** when count>1 (cap “9+” if Eng needs density). Owner-only (self or focused child). | PR-dot-only (loses density on busy days); PR-count-only (noisier empty-ish cells); roleTint / multi-tint |
| **Range leftover** | **RG-DROP** | Drop primary Journal From/To TextFields + Apply-as-primary. Optional power **Custom range** disclosure (collapsed; web may surface later) must not fight selected-day focus. | Keeping text dates as primary phone path |
| **Sort** | **SR-KEEP** | Keep **Newest** / **Oldest** chips on agenda stream (default Newest). | Hiding sort forever; inventing Calendar-style Agenda chip set |
| **Empty day** | **EM-PRIMARY** | Selected empty day: copy + primary **New entry** (opens Diary composer; `entry_date` = selected day via DATE-P1 field, not a second date UI). | Copy-only empty with no CTA |
| **Fork weight** | **FW-FORK** | Diary-local month primitive + entry agenda. Thin shared **date math** OK (`shiftDay`, ISO helpers). **Never** import CalendarItem / roleTint / EventComposer / CalendarsSheet modules as Journal data path. | Shared event UI module; hour-gutter DayColumn timeline |
| **Ledger day chrome** | **RR-L reject** | Ledger keeps list + range + family chips. No month grid/strip on Ledger. | RR-L Ledger day-browse |
| **View chips** | **None** | No Day/Days/Month/Week/Year Journal chip row (that is DB-C). Optional later density hatch to hide grid is **out** of v1 lock unless QAS forces — default always shows month chrome on Journal. | DB-C chip parity |
| **Adjacent-day strip under grid** | **Optional later** | Not required for v1 ship; multi-day job is **agenda stream** under/beside month. | Requiring MultiDayStepper columns |

### 0.1 Selected chrome feel (DB-B)

| Surface | Law |
|---|---|
| **Journal primary date UI** | **Month grid**: month title + ◀ month ▶ + **Today** + weekday row + day cells |
| **Selection** | Tap cell → **selected day** (wash/highlight); list/agenda anchors on that day |
| **Today emphasis** | Today cell uses distinct ring/pill (look-only Calendar kind) — not an event |
| **Agenda** | Under grid (phone) or **split** left sticky month ~280px + right entry stream (web ≥ comfort width, mockup ~640+) |
| **Multi-day scroll** | Continuous **entry agenda** with sticky `entry_date` SectionHeaders; selected day first in stream window, adjacent days with entries included in scroll window (Newest: selected then nearby by sort; empty selected day still shows empty card at anchor) |
| **Presence** | Neutral ink/mute marks only (PR-BOTH); never role colors; never other users’ events |
| **Rows** | Journal entry cards (title, snippet, photo thumb, tags) — **not** timed hour blocks, not Hidden dues, not sports layers |
| **Text From/To** | **Not** primary; RG-DROP |
| **Apply** | Day/month changes **auto-apply** focus; no mandatory Apply for primary browse |
| **Composer** | Stays Diary FormSheet (`createDiaryEntry` / edit/delete); empty-day CTA prefills selected `entry_date` |
| **DATE-P1** | Composer date field only — out of browse chrome |
| **Ledger** | Unchanged list + range + families (+ teacher class/student filters as live) |
| **Search / tag / sort** | Keep on Journal |
| **Icons** | Existing recipes only; no invented View-stroke; month chrome may use text ◀ ▶ / Today label without new glyph recipes on this card |

### 0.2 Wire copy (locked nouns / empty)

| Element | Copy |
|---|---|
| Screen / segment | **Diary** · **Journal** · **Ledger** |
| Month control | Month name + year (e.g. **September 2026**); **Today** |
| Empty selected day | **No entries yet on this day.** |
| Empty-day CTA | **New entry** |
| Fail-closed twins | Keep spirit of live: **Pick a child to open that journal. Twin streams never mix.** (exact string may match live) |
| Presence honesty (optional mute line near chrome) | **Your journal only. Presence marks never show other people.** (align FERPA / privacy honesty) |
| FERPA note | Keep `DIARY_FERPA_NOTE` on screen |
| Soft pointer label | Keep spirit: **Student pointer (private search only)** — not a Calendar “layer” |
| Non-copy | Never “Nothing coming up on the calendar”; never “Events”; never role-tint legend |

---

## 1. Why this lock

1. **CEO 2026-09-17:** Diary uses the same *kinds* of elements as Calendar to **pick days** and **scroll entries across days**; look may resemble Calendar; **products stay separate**.  
2. **Research:** Browse kinds (MonthGrid, agenda grouping, presence, Today) transfer; event/layer/composer functions stay out; Journal-only day-browse; Ledger list+range.  
3. **DB-B** is the middle pack that actually ships month pick + multi-day entry agenda without DB-C’s Calendar shell or DB-A’s weak month jump.  
4. **DB-A rejected:** CEO named Calendar-like day select + multi-day scroll; week strip alone is a thinner notebook pager and under-matches “kinds.”  
5. **DB-C rejected for v1:** Max parity raises misread risk and Eng/a11y cost; phone + parent twins + teacher pointer becomes chrome-hostile; IQG chrome-entry scrutiny higher without proven need.  
6. **Survive laws:** Owner-only RLS/FERPA; twin fail-closed; student no Diary (DIARY L7 / ST-A GAP-S1); no 6th tray; Calendar ≠ Diary; matcher/Approve untouched; Ask NL stays `t_cecf2af0`.

---

## 2. Binding product law (DB-BROWSE)

| Law ID | Lock |
|---|---|
| **DB-PROD-01** | Diary and Calendar remain **separate products/routes/IA**. No merge. |
| **DB-PROD-02** | **No Calendar events** on Diary Journal (create/edit/delete, EventComposer, layers, dues, sports, Hidden, AI `calendar_draft_event`). |
| **DB-PROD-03** | **No Diary body** on Calendar (no journal entries rendered as Calendar items). |
| **DB-PROD-04** | Day-browse chrome ships on **Journal segment only**. |
| **DB-LEDGER-01** | Ledger keeps **list + range + family chips** (and live teacher filters). **No** month grid/strip/stepper on Ledger (RR-L reject). |
| **DB-SEAT-01** | Student seat: **no** Diary, **no** day-browse (closed / empty gate as live). |
| **DB-SEAT-02** | Teacher / staff / parent (with `canOpenDiary`) get Journal day-browse after seat resolve via `diarySeatForChrome`. |
| **DB-SEAT-03** | Dual-hat: chrome follows **active seat** only (Teach vs Parent). Parent seat never inherits teacher soft pointer as ACL; Teach seat never mixes parent twin journals. |
| **DB-ENTRY-01** | Chrome **entry** to `/diary` is **not** redesigned here — follows ST-A: teacher **tray Diary**; parent/office **hamburger Diary**; student **no** hamburger Diary / no Open Diary CTA; no sixth tray key beyond stamped 4. |
| **DB-PACK-01** | Primary pack = **DB-B** only. |
| **DB-NAV-01** | Primary Journal date navigation = **month grid + selected day + Today + month ◀ ▶**. |
| **DB-NAV-02** | Multi-day consumption = **entry agenda stream** with sticky day headers (not hour timeline). |
| **DB-NAV-03** | Changing month or selected day **auto-applies** focus (no Apply required for primary path). |
| **DB-NAV-04** | **Today** jumps selected day (and visible month if needed) to **today** in the owner’s local date sense used by live Diary dates. |
| **DB-RANGE-01** | Primary From/To text + Apply **dropped** from Journal primary chrome (**RG-DROP**). |
| **DB-SORT-01** | Newest/Oldest chips **kept** (**SR-KEEP**); default Newest. |
| **DB-PRES-01** | Presence marks = **owner-only** entry existence/counts in scope (**PR-BOTH**). |
| **DB-PRES-02** | **Never** roleTint, multi-tint seeds, other people’s marks, or Calendar layer colors. |
| **DB-PRES-03** | Parent scope: marks reflect **focused child only**; never the other twin. |
| **DB-EMPTY-01** | Selected day with zero entries shows empty state + **New entry** (**EM-PRIMARY**). |
| **DB-COMP-01** | Composer remains Diary-internal; empty CTA / New entry prefills `entry_date` = selected day. |
| **DB-COMP-02** | DATE-P1 remains composer date UX only — browse does not fork a second free-text date field as primary. |
| **DB-TWIN-01** | Parent with **2+** children: child chips **above** month chrome; **fail-closed** empty until a child is focused; streams never mix. |
| **DB-POINT-01** | Teacher/staff soft student pointer remains **orthogonal** private search filter — below or in disclosure under month chrome; **not** a Calendar layer; **not** painted into presence dots. |
| **DB-FORK-01** | Implement as **Diary-named** primitives / adapters (**FW-FORK**). Do not pipe `CalendarItem` into Journal. |
| **DB-FORK-02** | **No** hour-gutter timed `DayColumn` as Journal body. |
| **DB-CHIP-01** | **No** Journal view chips Day/Days/Week/Month/Year in this lock (DB-C out). |
| **DB-TRAY-01** | No new tray slot; no restore Class; no Capture tray. |
| **DB-ASK-01** | Ask NL diary capture stays parked `t_cecf2af0` — out of scope. |
| **DB-GLYPH-01** | No invented View-stroke icons on this card. |

### 2.1 Authorized change vs live Journal

| Prior (live) | Now (DB-B) |
|---|---|
| From / To YYYY-MM-DD TextFields primary | **Month grid** primary; text range demoted/dropped from primary (**RG-DROP**) |
| Apply filters required for dates | **Auto-apply** on day/month/Today |
| No focused/selected day | **Selected day** + Today |
| Flat range list only | **Agenda stream** anchored on selected day + multi-day headers |
| No presence | **PR-BOTH** owner-only marks on month cells |
| Empty days skipped silently in list | **Empty day card** when selected day has zero entries |
| Ledger list+range | **Unchanged** |
| Composer Diary | **Unchanged** (+ prefill selected day from CTA) |
| Parent chips / fail-closed | **Keep**; chips above month |
| Teacher soft pointer | **Keep**; orthogonal under/disclosure |
| Student closed | **Keep** |

---

## 3. Hats (binding)

| Hat | Day-browse | Entry to Diary | Notes |
|---|---|---|---|
| **Teacher** | Yes (own journal) | Tray **Diary** (ST-A) + deep `/diary` | Soft student pointer orthogonal; presence = teacher’s own entries only |
| **Teacher + parent dual-hat (Teach seat)** | Yes as teacher | Same Teach chrome | No parent twin chips on Teach journal |
| **Teacher + parent dual-hat (Parent seat)** | Yes as parent | Hamburger Diary (ST-A) | Child chips + fail-closed; no Teach pointer |
| **Parent (non-teacher)** | Yes | Hamburger Diary | Multi-child chips; presence scoped to focus |
| **Staff / office seat** | Yes (own journal) | Hamburger Diary; **no** Diary tray | Same Journal chrome; no office-visible *other people’s* journals |
| **Student** | **No** | No hamburger Diary; no Open Diary CTA; no tray | DIARY L7 / ST-A GAP-S1 |
| **Superintendent (non-diary seats)** | No unless profile opens as staff/teacher path | Follow seat gates | No special super journal browser |
| **Signed-out / foreign school** | No | Auth gates | — |

---

## 4. Chrome entry (binding — not redesigned)

```
Teacher tray Diary (ST-A) ─┐
Parent hamburger Diary ────┼→ /diary → PersonTabs Journal | Ledger
Office hamburger Diary ────┘         → if Journal: DB-B month + agenda
Student ──✗── no Diary entry
```

- This card does **not** change tray order, labels, or hamburger ownership beyond requiring day-browse to appear **after** lawful entry on Journal.  
- Switching Journal ↔ Ledger: day-browse chrome **hides** on Ledger; Ledger filters remain text range etc.  
- Leaving Diary / switching seat: no illegal residual chrome on the wrong seat.

---

## 5. Lifecycle (binding)

```
Open Diary (lawful hat) → Journal segment
  → [Parent 2+: child chips; fail-closed until focus]
  → Month grid for visible month (default: month containing today)
  → Selected day defaults to today (or last focused day in-session if product keeps ephemeral focus — default today on cold enter)
  → Presence marks load for owner scope only
  → Agenda shows selected day (entries or empty+New entry) and allows scroll across adjacent days’ entries
  → Tap other day cell → change selected day; agenda re-anchors; auto-apply
  → Month ◀ ▶ → change visible month; selection rules: keep day-of-month when valid else nearest valid / last day; presence refreshes
  → Today → selected day = today; ensure month shows today
  → Newest/Oldest → reorder agenda stream only
  → Search / tag / soft pointer → filter entries inside stream; do not invent Calendar layers
  → New entry / empty CTA → Diary composer; entry_date prefilled to selected day; save → entry appears under that day; presence updates
  → Edit/delete entry → existing Diary laws; presence/counts refresh
  → Optional Custom range (if shipped demoted) → temporary range overlay must be cancelable back to day-focus mode
  → Switch to Ledger → list+range only (no month grid)
  → Reverse: clear search/tag/pointer; Today reset; cancel composer without save; re-focus child
```

**Reverse / cancel (must not dead-end):**

| Action | Result |
|---|---|
| Change selected day | Prior day not “stuck”; agenda follows |
| Month navigate away and back | Presence/selection coherent; no event bleed |
| Today | Returns to today even after deep month jump |
| Dismiss composer | No phantom entry; selected day unchanged |
| Clear search/tag/pointer | Restores unfiltered owner/child stream for selected window |
| Parent switch child chip | Hard scope switch; other child’s marks/entries gone immediately (fail-closed if none selected) |
| Optional custom range dismiss | Returns to DB-B day-focus primary |
| Leave Journal → Ledger → Journal | Day-browse returns; Ledger never keeps a month grid |
| Seat switch Teach ↔ Parent | Atomic seat chrome; no mixed journals |

---

## 6. Multiplicity (binding)

| Case | Law |
|---|---|
| **0 children linked (parent)** | Existing empty/link behavior; no fabricated child scope |
| **1 child** | No chip row required; journal scoped to that child as live |
| **2+ children (twins)** | Chips **above** month; **must** focus one; fail-closed empty copy; **never** merge streams; presence only for focused child |
| **Teacher many classes** | Soft pointer class/student chips filter private search only; month presence still **teacher-owned entries**, not “class calendar” |
| **Teacher + pointer on** | Dots still owner entries that match pointer filter if filter active — never other teachers’ private journals |
| **Phone vs web** | Phone: stacked month then agenda; Web: split month \| stream |
| **Multi-device** | No special merge; server owner scope only |

---

## 7. User stories + acceptance criteria

### US-DB-01 — Pack lock DB-B month + agenda

**As a** Diary owner (teacher/staff/parent)  
**I want** a month grid to pick days and an entry agenda under/beside it  
**So that** I browse my private journal by date the way I already understand calendars — without using Calendar the product.

**AC**

1. Journal shows **DB-B** month chrome: title, month ◀ ▶, **Today**, weekday row, day cells.  
2. No DB-A-only week strip as the sole primary picker.  
3. No DB-C view chip row (Day/Days/Month…).  
4. Agenda/list uses **journal entry cards**, not Calendar events.  
5. Mockup states covered in spirit: day pick, empty day, multi-day scroll, parent 2-child (`db-b.html`).

### US-DB-02 — Pick / change day

**As a** owner  
**I want** to tap a day and move selection  
**So that** I land on that day’s entries immediately.

**AC**

1. Tap cell selects that day (visible selected wash).  
2. Agenda anchors on selected day without pressing Apply.  
3. Changing selection updates list/empty state.  
4. Invalid/out-of-month mute padding cells do not select as “real” focus days for another month without navigating month (padding behavior may navigate or ignore — must not write entries to wrong month silently).

### US-DB-03 — Multi-day scroll

**As a** owner  
**I want** to scroll entries across consecutive days  
**So that** I can read neighboring journal days without retyping date ranges.

**AC**

1. Agenda supports scrolling a **window of days** around selection (selected day included).  
2. Sticky or repeated **SectionHeader** by `entry_date`.  
3. Sort Newest/Oldest applies to stream order (**SR-KEEP**).  
4. No MultiDayStepper event columns; no hour gutter timeline.

### US-DB-04 — Empty day + New entry

**As a** owner on a quiet day  
**I want** a clear empty state and one-tap compose for that date  
**So that** empty is not a dead end.

**AC**

1. Selected day with 0 entries: **No entries yet on this day.** (or equivalent locked copy).  
2. Primary **New entry** CTA (**EM-PRIMARY**).  
3. CTA opens Diary composer with `entry_date` = selected day.  
4. Save places entry on that day; presence mark appears/updates.  
5. Cancel composer leaves day empty; no partial public leak.

### US-DB-05 — Today jump

**As a** owner deep in another month  
**I want** **Today**  
**So that** I return to the current day in one control.

**AC**

1. Today control visible with month chrome.  
2. Activating sets selected day to today and shows today’s month.  
3. Agenda re-anchors to today (entries or empty CTA).  
4. Works on phone and web layouts.

### US-DB-06 — Month navigate

**As a** owner  
**I want** month ◀ ▶  
**So that** I jump by month without ISO text fields.

**AC**

1. Prev/next month changes grid label and cells.  
2. Presence marks reload for visible month in owner scope.  
3. Selection remains coherent (valid day-of-month or defined clamp).  
4. No Calendar events appear while paging months.

### US-DB-07 — Presence owner-only (PR-BOTH)

**As a** owner  
**I want** quiet marks on days I wrote  
**So that** I see where my writing is — without leaking anyone else.

**AC**

1. Days with ≥1 in-scope entry show neutral **dot** (count=1) or **count** (count>1) per **PR-BOTH**.  
2. No roleTint / rainbow / multi-layer seeds.  
3. Parent: marks only for **focused** child.  
4. Teacher pointer never paints other students as “calendar attendees.”  
5. Empty cells have no mark (not blocked/grey-out meaning).  
6. Marks never appear on Calendar from Diary data via this feature.

### US-DB-08 — Drop primary text range (RG-DROP)

**As a** owner on phone  
**I want** visual day pick first  
**So that** I am not forced through YYYY-MM-DD From/To + Apply as the main path.

**AC**

1. Primary Journal chrome does **not** require From/To text fields.  
2. Apply is not required for day/month/Today.  
3. If Custom range disclosure ships, it is demoted, cancelable, and does not replace DB-B as default.  
4. Ledger may keep its own From/To (unchanged).

### US-DB-09 — Parent twins fail-closed

**As a** parent of two children  
**I want** explicit child focus before any journal stream or presence  
**So that** twin diaries never mix (FERPA / family safety).

**AC**

1. Child chips render **above** month grid.  
2. With 2+ children and no focus: fail-closed empty; **no** mixed entries; **no** presence dots for “both.”  
3. Focusing Maya shows only Maya entries/marks; Jordan chip switch replaces scope immediately.  
4. Teacher soft pointer chrome is absent on parent seat.

### US-DB-10 — Teacher soft pointer orthogonal

**As a** teacher  
**I want** optional private student pointer search without turning Diary into class Calendar layers  
**So that** I can filter my own notes about a student without ACL theater.

**AC**

1. Pointer chips remain available to teacher/staff seats as live soft filter.  
2. Placement below month chrome or in disclosure — not inside view-chip row (none shipped) and not as CalendarsSheet layers.  
3. Presence definition stays owner journal entries (filtered view may hide rows; must not show other owners).  
4. Pointer is not grades, not roster ACL change, not matcher.

### US-DB-11 — Hats / student none / office

**As a** product owner  
**I want** correct seats only  
**So that** students never gain Diary day-browse and office never sees others’ journals.

**AC**

1. Student: no Diary entry paths; closed screen copy remains honest.  
2. Teacher tray path and parent/office hamburger paths still reach `/diary` per ST-A.  
3. Staff seat gets own journal browse only.  
4. Dual-hat seat switch does not flash the wrong journal scope.

### US-DB-12 — Ledger unchanged

**As a** teacher using Ledger  
**I want** the activity log to stay list + range  
**So that** immutable school actions are not redesigned as a personal month journal.

**AC**

1. Ledger segment has **no** DB-B month grid/strip.  
2. Ledger From/To + families (+ class/student filters) remain.  
3. Switching segments does not leave Ledger with Journal month chrome.

### US-DB-13 — Products separate / reverse non-goals

**As a** CEO / school  
**I want** hard walls between Diary and Calendar  
**So that** browsing chrome never becomes a product merge.

**AC**

1. No EventComposer, CalendarsSheet, category event layers, Hidden dues, sports opt-in on Diary.  
2. No journal body on Calendar screens from this feature.  
3. No shared route merge.  
4. No 6th tray.  
5. No FullCalendar/Wix/Reminders product.  
6. Ask NL stays out (`t_cecf2af0`).  
7. Copy talks **entries**, not **events**.

### US-DB-14 — Phone vs web layout

**As a** owner on either device  
**I want** usable density  
**So that** month pick still works under twin chips on phone and uses width on web.

**AC**

1. Phone: month grid stacked above agenda (mockup).  
2. Web: split month \| stream when width allows (mockup).  
3. Child chips and FERPA note remain readable; month remains scannable.  
4. Hit targets usable for day cells and Today.

### US-DB-15 — Search / tag survive

**As a** owner  
**I want** search and tag filters with the new chrome  
**So that** day-browse does not delete existing findability.

**AC**

1. Search field remains on Diary.  
2. Journal tag filter remains.  
3. Filters compose with selected-day/agenda window without reintroducing primary From/To.  
4. Clearing filters restores browse window contents.

### US-DB-16 — Cold enter defaults

**As a** owner opening Journal  
**I want** a sensible default day  
**So that** I am not dropped into an empty unbounded past without orientation.

**AC**

1. Cold enter: visible month includes **today**; selected day defaults to **today**.  
2. Presence for that month loads for scope.  
3. If today has entries, they show; else empty+New entry.  
4. Sort default Newest.

---

## 8. Explicit non-goals (this lock)

1. Merging Diary + Calendar routes, IA, composers, or data models.  
2. Calendar events/layers/dues/sports/Hidden/CalendarsSheet/EventComposer on Diary.  
3. Diary journal body on Calendar.  
4. DB-A as primary pack; DB-C view-chip parity pack.  
5. Ledger month grid / day-browse (RR-L).  
6. Student Diary / day-browse.  
7. Office-visible **other users’** journal bodies.  
8. Role-tint / multi-tint presence.  
9. Hour-timeline DayColumn for journal entries.  
10. Year grid / TeacherWeekGrid of class periods.  
11. Sixth tray slot; Capture tray; Class tray restore.  
12. Reopening ST-A tray/hamburger ownership (except consuming it as entry law).  
13. Ask NL diary capture (`t_cecf2af0`).  
14. DATE-P1 redesign (composer field stays).  
15. Inventing View-stroke glyphs / running `npm run icons` on this card.  
16. Matcher insert law or Approve law changes.  
17. Eng / app code / SQL / qa-loop / git on this card.  
18. Staffing Engineering or ditl-scribe from PM (CoS after dual stamp + QAS DITL IMPACT).

---

## 9. Quality goals (stamp summary)

| Goal | Measure |
|---|---|
| Owner-only journal | RLS + UI scope; presence never others |
| Calendar-like **kinds**, not Calendar product | Month grid + agenda + Today; zero event functions |
| Multi-day read | Scroll agenda across days with headers |
| Empty/today/cancel complete | Empty CTA; Today; composer cancel; filter clear |
| Twins safe | Fail-closed; chips above; no mix |
| Pointer orthogonal | Soft filter ≠ layers ≠ dots legend |
| Ledger honest | List+range only |
| Student none | DIARY L7 holds |
| Tray density | No 6th key |
| Fork discipline | No CalendarItem pipeline in Journal |

---

## 10. Coverage map (IQG)

| IQG dimension | Covered by |
|---|---|
| Hats | §3 · US-DB-09 · US-DB-10 · US-DB-11 |
| Chrome entry | §4 · DB-ENTRY-01 · ST-A reference |
| Full lifecycle | §5 · US-DB-02..06 · US-DB-04 · US-DB-16 |
| Multiplicity | §6 · US-DB-09 · US-DB-10 · US-DB-14 |
| Reverse / cancel | §5 reverse table · US-DB-13 |
| Non-goals | §8 · US-DB-12 · US-DB-13 |
| Quality goals | §9 · DESIGN STAMP |

Happy-path-only = **REJECT** for QAS. This spec is written to the full intent surface.

---

## 11. Handoff

| Deliverable | Path / id |
|---|---|
| PM spec (this file) | `notes/company/diary-day-browse-spec.md` |
| Pack lock | **DB-B** + **PR-BOTH** · **RG-DROP** · **SR-KEEP** · **EM-PRIMARY** · **FW-FORK** · **RR-L reject** |
| Research | `diary-day-browse-research.md` |
| Options / delta / mockups | `diary-day-browse-ux-options.md` · `diary-day-browse-delta.md` · `diary-day-browse-mockups/db-b.html` |
| IQG parent | `t_ea554343` (comment stamp; do not parent workers) |
| QAS parallel | `t_d717511a` |
| Eng | **Hold** until dual APPROVED |

**RECOMMENDED NEXT ACTION:** Stop. Align with QAS on `t_d717511a`. If QAS REJECTS, patch this spec (or escalate CoS to restaff designer — do not invent chrome). CoS holds Engineering until both stamp lines APPROVED on parent `t_ea554343`.
