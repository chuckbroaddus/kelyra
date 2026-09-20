# CAL-R5 — Calendar PM lock (CEO 12-item polish)

**Date:** 2026-09-20  
**Author:** product-manager (Kelyra)  
**Card:** `t_dc5b2ed6`  
**IQG parent (sticky unassigned — do not implement; do not unblock; do not staff Eng):** `t_ef9d63b1`  
**CEO lock (2026-09-20):** 12 concrete chrome/behavior fixes on live Calendar (mobile + web). Numbered list is law — do not thin.  
**Designer pack:** `notes/company/calendar-r5-ux-options.md` — **not present at lock time**; lock from CEO list only (no invented chrome packs).  
**Prior law (still bind except R5 supersessions):** `calendar-r4-pm-lock.md` (L-C + C-B) · `calendar-chrome-row-pm-lock.md` (CR-CalTabs)  
**Status:** BINDING docs-only PM lock + **PM IQG design stamp APPROVED**. Dual stamp **MET** with QAS `t_605c88c4`. Spec only — **no** app code, SQL, Edge, qa-loop, git, competing UI pack, or Eng staffing. Chuck did **not** say send.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KELYRA Calendar CAL-R5 (CEO 2026-09-20 12-item polish)
Quality goals: First-tap header title Diary↔Calendar (mobile+web, every hat with both); Year single chevron year row; Month chevron Month, Year; Week 3/5/7 weekday labels + MM/DD/YYYY range; DROP gear JUMP + academic chip row + helper footer; Clear Filters = deselect all; Calendars Done pops to Settings only; Day List continuous multi-day scroll without date chevron; kill header→tabs gap; hats/twins/Hidden/sports HOLD; Calendar≠Diary; no new product / 6th tray / event CRUD change
PM: APPROVED  date: 2026-09-20  profile-session: product-manager / t_dc5b2ed6 · notes/company/calendar-r5-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-20  profile-session: qa-supervisor / t_605c88c4 · notes/company/calendar-r5-intent.md
Intent gaps remaining: none
```

**Dual stamp:** **MET** (PM + QAS APPROVED 2026-09-20). Eng stays dark until Chuck **send** on parent `t_ef9d63b1`. This card does **not** staff Eng.

**PM stamp meaning:** Stories + AC + CAL-R5-01…12 cover CEO list, hats, multiplicity, reverse, non-goals, quality goals. No invented chrome. No designer competing pack. No `src/`. No send implication.

---

## 0. Scope and priors

### 0.1 What R5 is

Polish/fix pack on the **live** Calendar surface after R4 L-C+C-B and CR-CalTabs. Not a new Calendar product, not Diary, not tray reopen.

### 0.2 What still binds (fail closed)

- R4: phone Year-first, tap-zoom, continuous scroll within levels, hierarchical back honesty, Compact/List + Single/List modes, lean composer, hats/twins/CH-A, Hidden DP-A, assign≠publish, sports opt-in, AI draft-then-Save, ≤4 tints, Desk≠Year, Diary≠Calendar, no Inbox/Reminders.
- CR-CalTabs: one-row PersonTabs Y/M/W/D + **+ · search · gear**; CM-Linear Calendar-only; `<<`/`>>`; gear owns modes/Show/Calendars/Clear; no canvas Show stack; no Ghost Up; no Hidden blurb; no §32.2 flip; no tray CT-A Eng on this card.

### 0.3 Designer density choice (Day List)

Designer pack absent. **PM locks density A** (sole R5 Day List fold — not a competing product pack):

| ID | Fold | Lock |
|---|---|---|
| **A (LOCKED)** | Continuous multi-day **activity list**; **in-list** date section headers; **no** `<< date >>` chevron toolbar on Day List | CEO item 11 |
| B | (not offered — no pack) | — |

A details: vertical swipe scrolls across days; each day with content gets a section header (sticky optional); empty days may show a one-line muted header so orientation stays honest; Single Day mode keeps its own timeline chrome (R5 only strips the List-mode date chevron row).

---

## 1. CEO numbered locks → product laws (CAL-R5-01…12)

Do **not** thin. One law per CEO item.

| Law ID | CEO # | Lock |
|---|---|---|
| **CAL-R5-01** | 1 | **Header title first-tap.** Navigating **Diary → Calendar** or **Calendar → Diary** updates the header/wordmark title to the **destination on the first tap**, mobile **and** web. No lag requiring a second tap. Applies on every hat/seat that has **both** Diary and Calendar chrome (teacher tray Diary + Calendar entry; dual-hat by seat; parent/office hamburger Diary where present + Calendar entry). Student: if no Diary chrome, N/A for Diary path; Calendar title still correct on first open. |
| **CAL-R5-02** | 2 | **Year: single year chrome.** Year view keeps the chevron year row (`<<` **YYYY** `>>` or equivalent). **Remove** the extra bold year row under that chevron row. One year label only. |
| **CAL-R5-03** | 3 | **Month chevron format = Month, Year.** Month view chevron/center label is **Month, Year** (e.g. **September 2026**). **Drop the day** from this row (not September 20, 2026). Storage remains ISO. |
| **CAL-R5-04** | 4 | **Week 3/5/7 weekday labels.** On Week (and multiday stepper when 3/5/7): **3** → columns **TUE WED THU**; **5** → **MON TUE WED THU FRI**; **7** stays full week as today (correct). Labels must match visible columns. |
| **CAL-R5-05** | 5 | **Week range = MM/DD/YYYY – MM/DD/YYYY.** Week (and multiday range) chevron/center day-range uses numeric **MM/DD/YYYY – MM/DD/YYYY**, not “Month Day, Year – Month Day, Year”. |
| **CAL-R5-06** | 6 | **Gear JUMP section DROP.** Settings/gear sheet: remove the whole **JUMP** section (Agenda and Days jumps). Do not replace with a new JUMP invent on this card. (Agenda/Days as data modes may still exist elsewhere only if already reachable without JUMP; R5 does **not** re-add JUMP chrome.) |
| **CAL-R5-07** | 7 | **Academic preset chip row DROP.** Settings/gear: remove the chip row **All Academic / School only / My Sports / Reset**. LF-A **filter job** may remain via remaining Show/filter chips CEO did **not** name for drop; this **row** is gone. |
| **CAL-R5-08** | 8 | **Clear Filters = deselect all.** Clear Filters deselects **every** selected filter chip (none selected after). Must **not** select several chips (current bug). Empty-state Clear recovery same semantics. |
| **CAL-R5-09** | 9 | **Calendars Done = pop to Settings.** Path Settings → Calendars → **Done** returns to the **Settings/gear sheet** (one sheet pop). Does **not** dismiss Settings entirely. A subsequent **Done/Close on Settings** closes Settings. |
| **CAL-R5-10** | 10 | **Gear helper footer copy DROP.** Remove Settings footer copy starting “Day List stays here in the customizer. Tab row is Year….” (and any equivalent helper paragraph). |
| **CAL-R5-11** | 11 | **Day List continuous; no date chevron.** Day view + Settings→Day→**List**: remove `<< Month Day, Year >>` (or equivalent) chevron date row. Show a **continuous scrollable list of activities across days** (swipe up/down). Density **A** (§0.3). Single Day timeline mode not deleted. |
| **CAL-R5-12** | 12 | **Header→tabs gap DROP.** Remove excess blank space between the app header and the Year/Month/Week/Day tab row so tabs sit tight under header chrome (diagnose padding vs leftover ghost row in Eng; product target = **no large empty band**). |

### 1.1 Supersessions vs CR-CalTabs / R4 (authorized)

| Prior | R5 change |
|---|---|
| CAL-51 gear JUMP Agenda/Days “if needed” | **JUMP section DROP** (CAL-R5-06). Do not keep JUMP block. |
| CAL-54 / CR display “Month Name DD, YYYY” on anchors | **Month view chevron** specifically → **Month, Year** (CAL-R5-03). Week range → **MM/DD/YYYY** (CAL-R5-05). Year → single year row (CAL-R5-02). Day List loses date chevron (CAL-R5-11). Other single-day anchors may keep human dates where CEO did not rename. |
| CAL-45 / canvas academic presets under gear | Academic **All Academic / School only / My Sports / Reset row** DROP (CAL-R5-07). Remaining lawful filters still Clear-all (CAL-R5-08). |
| CAL-41 Agenda/Days ≤2 taps via gear JUMP | JUMP path **removed**. Do **not** invent replacement JUMP chrome on R5. Week 3/5/7 remains on-grid (CAL-R5-04). |
| Nested sheets Done | **Calendars Done ≠ Settings Done** (CAL-R5-09). |

### 1.2 Wire nouns (R5)

Calendar · Diary · Year · Month · Week · Day · List · Single Day · `<<` `>>` · September 2026 · MM/DD/YYYY · TUE WED THU · MON…FRI · Clear Filters · Calendars · Done · Settings/gear. JUMP **absent**. Academic preset row **absent**. Helper footer **absent**.

---

## 2. Locked decision table

| # | Decision | PM lock |
|---|---|---|
| 1 | Title first-tap Diary↔Calendar | **Fix** mobile+web; all dual-chrome hats |
| 2 | Year duplicate year | **DROP** extra bold year under chevron |
| 3 | Month format | **Month, Year** |
| 4 | Week 3/5/7 labels | **3=TUE–THU; 5=MON–FRI; 7=full** |
| 5 | Week range | **MM/DD/YYYY – MM/DD/YYYY** |
| 6 | JUMP section | **DROP whole** |
| 7 | Academic chip row | **DROP whole** |
| 8 | Clear Filters | **Deselect all** (bug fix) |
| 9 | Calendars Done | **Pop to Settings** only |
| 10 | Helper footer | **DROP** |
| 11 | Day List | **Continuous multi-day; no date chevron; density A** |
| 12 | Header–tabs gap | **DROP excess blank** |
| 13 | Day List density | **A locked** (no B without pack) |
| 14 | Event CRUD | **HOLD** — no R5 change |
| 15 | Diary product | **HOLD separate** |
| 16 | Tray / 6th key | **No invent** |
| 17 | Eng / send | **Dark** until dual stamp + Chuck send |

---

## 3. Stories + acceptance criteria

R4 + CR-CalTabs stories remain base law unless replaced below.

### 3.1 Header title (CAL-R5-01)

**US-R5-01 — First-tap title Diary → Calendar**  
As a user with both Diary and Calendar chrome, when I open Calendar from Diary (tray, drawer, or web nav), the header title reads **Calendar** on the **first** tap/navigation.  
**AC:**  
1. Phone: title matches Calendar immediately after navigation completes (no second tap).  
2. Web ≥720 and narrow web: same.  
3. No flash stuck on **Diary** after route is Calendar.  
4. Back/stack quirks must not leave wrong title on settled Calendar.  
5. a11y title/heading agrees with visible title.

**US-R5-02 — First-tap title Calendar → Diary**  
As the same user, opening Diary from Calendar shows **Diary** (or lawful Journal product title) on the **first** tap.  
**AC:** Mirror of US-R5-01 with destination Diary; no stuck **Calendar** title.

**US-R5-03 — Title bug on every dual-chrome hat**  
As **teacher**, **parent**, **office/superintendent**, and **dual-hat by seat**, title first-tap holds wherever that seat exposes both surfaces.  
**AC:**  
1. **Teacher:** tray Diary ↔ Calendar entry (drawer/hamburger/Calendar path) — both directions.  
2. **Parent:** hamburger Diary (if present) ↔ Calendar entry — both directions; child focus CH-A still required before Calendar data.  
3. **Student:** no student Diary (law HOLD) — Calendar open still titles Calendar first tap; no false Diary title.  
4. **Office / superintendent:** hamburger Diary (if present) ↔ Calendar — both directions; school-visible scope only.  
5. **Teacher+parent dual-hat:** active **seat** chrome only; switch seat then Diary↔Calendar still first-tap correct; no cross-seat title bleed.  
6. **Office+teacher dual-hat:** same by active seat.  
7. Sign-out / re-auth does not reintroduce lag after next open.

### 3.2 Year / Month / Week chrome (CAL-R5-02…05)

**US-R5-04 — Year single year row (CAL-R5-02)**  
As a user on Year, I see one year control row with chevrons — not a second bold year under it.  
**AC:**  
1. Chevron year row present (`<<` year `>>` or CR equivalent).  
2. Extra bold year row under it **absent**.  
3. Today jump still works.  
4. Continuous Year scroll HOLD R4.  
5. Phone + web.

**US-R5-05 — Month label Month, Year (CAL-R5-03)**  
As a user on Month, the chevron center shows **Month, Year** only.  
**AC:**  
1. Example spirit: **September 2026**.  
2. Day-of-month **not** in this chevron label.  
3. ISO storage unchanged.  
4. Month Compact + List modes still available via gear.  
5. Phone + web.

**US-R5-06 — Week 3/5/7 column labels (CAL-R5-04)**  
As a user on Week/multiday, 3- and 5-day spans show the correct weekday names.  
**AC:**  
1. Count **3** → visible headers **TUE WED THU** (order matches columns).  
2. Count **5** → **MON TUE WED THU FRI**.  
3. Count **7** → full week labels as live correct behavior.  
4. Switching 3↔5↔7 relabels immediately; RM stepper works.  
5. Does not invent free-form N outside 3/5/7.

**US-R5-07 — Week range MM/DD/YYYY (CAL-R5-05)**  
As a user on Week, the range label is numeric US date form.  
**AC:**  
1. Format **MM/DD/YYYY – MM/DD/YYYY** (en-dash or hyphen OK if consistent).  
2. Not “September 15, 2026 – September 21, 2026” style on this row.  
3. `<<`/`>>` still shift the range.  
4. Multiday range uses same numeric pattern when shown.  
5. Phone + web.

### 3.3 Gear / Settings sheet (CAL-R5-06…10)

**US-R5-08 — JUMP section gone (CAL-R5-06)**  
As a user opening gear/Settings on Calendar, I do not see a JUMP block for Agenda/Days.  
**AC:**  
1. Section titled JUMP (or Agenda/Days jump list) **absent**.  
2. No replacement JUMP invent in R5.  
3. Month Compact/List, Day Single/List still in gear.  
4. Calendars entry still in gear.  
5. Clear Filters still in gear (or empty recovery).

**US-R5-09 — Academic chip row gone (CAL-R5-07)**  
As a user in gear, All Academic / School only / My Sports / Reset row is gone.  
**AC:**  
1. That preset **row** absent.  
2. Remaining filter chips CEO did not drop still work if present.  
3. Sports **opt-in law** HOLD (Unsubscribe ≠ Delete) even without that Reset row — lawful path remains elsewhere if already shipped.  
4. No privilege escalation via missing presets.  
5. Student still never sees Hidden quizzes.

**US-R5-10 — Clear Filters deselects all (CAL-R5-08)**  
As a user with one or more filters selected, Clear Filters leaves **none** selected.  
**AC:**  
1. After Clear, every filter chip is deselected (not a multi-select preset).  
2. Does **not** auto-select several chips.  
3. Canvas/events reflect unfiltered lawful set for seat.  
4. Empty-state Clear matches same semantics.  
5. Repeat Clear on already-clear is honest no-op.  
6. Parent child focus and Hidden laws still apply after clear.

**US-R5-11 — Calendars Done pops to Settings (CAL-R5-09)**  
As a user, Settings → Calendars → Done returns to Settings sheet.  
**AC:**  
1. Done on Calendars sheet reveals gear/Settings still open.  
2. Settings does **not** auto-dismiss on Calendars Done.  
3. Done/Close on Settings then dismisses Settings to Calendar canvas.  
4. Nested back/gesture matches one-level pop (no double-dismiss).  
5. Seat scope preserved across pop.  
6. Phone + web sheet stacks.

**US-R5-12 — Helper footer copy gone (CAL-R5-10)**  
As a user in gear, no footer essay about Day List / tab row.  
**AC:**  
1. Copy starting “Day List stays here in the customizer…” **absent**.  
2. No equivalent paragraph reintroduced under another label.  
3. Controls remain labeled without that essay.

### 3.4 Day List + chrome gap (CAL-R5-11…12)

**US-R5-13 — Day List continuous without date chevron (CAL-R5-11)**  
As a user on Day → List, I scroll a continuous multi-day activity list with no date chevron toolbar.  
**AC:**  
1. `<< Month Day, Year >>` (or CR date chevron) **absent** in List mode.  
2. Vertical scroll moves across days of activities (density A).  
3. In-list date section headers present for orientation.  
4. Empty days: muted one-line header allowed; no fake events.  
5. Swipe/scroll phone + web wheel/trackpad.  
6. Gear → Day → List still selects List mode.  
7. Single Day mode still available and keeps timeline (chevron rules for Single Day: not required to strip unless same bug paints on Single — CEO targets List).  
8. Leaving List back to Single restores Single chrome (see reverse).  
9. Hat filters/Hidden/child focus still gate rows.

**US-R5-14 — Header-to-tabs gap gone (CAL-R5-12)**  
As a user on Calendar, Y/M/W/D tabs sit tight under the header without a large empty band.  
**AC:**  
1. No excess blank region between header bottom and tab row top (visual dogfood ~390 and ≥720).  
2. Not solved by hiding the tab row.  
3. PersonTabs CR-CalTabs row still present and tappable.  
4. Safe-area/notch respected without reintroducing large spacer.  
5. Diary screens not required to match this Calendar-only tight gap unless shared chrome bug.

### 3.5 Hats · multiplicity (explicit)

**US-R5-15 — Hats matrix**  
As each primary hat, R5 chrome obeys seat scope.  
**AC:**  

| Hat | Must |
|---|---|
| Teacher | All 12 locks on Calendar; Diary↔Calendar title; Hidden badge HOLD; create + lean HOLD |
| Parent | Title if both entries; child focus; no twin merge; no Hidden quizzes; filters remaining lawful only |
| Student | Calendar title first open; no Diary path; no Hidden; no academic-teacher-only leaks |
| Office / superintendent | School-visible Calendar; title if Diary entry exists; no teacher personal / parent doctor notes |
| Teacher+parent | Seat rebuild; title + filters + events follow **active** seat |
| Office+teacher | Same; Teach-only affordances only on teacher seat |

**US-R5-16 — Multiplicity**  
**AC:**  
1. Week **3/5/7** all three counts labeled per CAL-R5-04.  
2. Day List continuous across **many** days (not single-day list only).  
3. After academic-row DROP, **remaining** filter chips still Clear-all and seat-lawful.  
4. Parent 2+ children: switch child rebuilds List/Week/Year marks.  
5. Multi-calendar under Calendars sheet still pops Done → Settings (CAL-R5-09).

---

## 4. Lifecycle + reverse

### 4.1 Full lifecycle (happy-path-only = IQG reject)

| Phase | Behavior |
|---|---|
| Enter Calendar | Title = Calendar first paint; tabs tight under header |
| Enter Diary from Calendar | Title = Diary first paint |
| Year | Single chevron year row; scroll continuum |
| Month | Label Month, Year; Compact/List via gear |
| Week | 3/5/7 labels; range MM/DD/YYYY |
| Day Single | Timeline HOLD |
| Day List | Continuous multi-day list; no date chevron |
| Gear open | No JUMP; no academic preset row; no helper footer |
| Filter | Toggle remaining chips; Clear = none |
| Calendars | Open from gear → Done → back to gear → Done → canvas |
| Leave Calendar | Platform/chrome exit; no title lag on next destination |

### 4.2 Reverse / cancel

| Action | Reverse |
|---|---|
| Open Settings/gear | Dismiss/Done on **Settings** closes sheet to canvas |
| Open Calendars from Settings | **Calendars Done** → Settings (still open); **not** canvas |
| Settings Done after Calendars | Closes Settings (second Done) |
| Clear Filters | All chips off; user may re-select individually |
| Clear then re-open gear | Still all off until user selects |
| Day List mode | Gear → Day → **Single Day** (or mode control) returns Single chrome |
| Leave Day List by tab | Month/Week/Year tabs leave List; mode pref may persist per R4 |
| Diary ↔ Calendar | Title tracks destination each first navigation |
| 3-day week | Switch to 5 or 7 relabels columns |
| Filtered empty | Clear recovery deselects all (same as Clear Filters) |

---

## 5. Explicit non-goals

| Non-goal | Note |
|---|---|
| **Not a new Calendar product** | Polish on live R4 + CR-CalTabs surface |
| **Not Diary** | Diary IA/composer/presence out of scope except title first-tap pairing |
| **Not 6th tray / tray CT-A** | No tray invent; no hamburger war |
| **Not event CRUD change** | Lean composer, edit/delete, assign≠publish HOLD — no field expansion |
| **Not Reminders / Inbox / Desk=Year** | Still banned |
| **Not Stacked/Details month** | Still Drop v1 |
| **Not JUMP replacement chrome** | DROP only; no new Agenda/Days invent |
| **Not §32.2 PersonTabs global flip** | Calendar opt-in HOLD |
| **Not Eng / qa-loop / git / SQL on this card** | Docs + stamp only |
| **Not Chuck send** | Dual stamp then stop for send |

---

## 6. Quality goals

1. **First-tap honesty** — header title never lies after Diary↔Calendar navigation (mobile+web).  
2. **Chevron label honesty** — Year/Month/Week labels match CEO formats; no duplicate year.  
3. **Week span honesty** — 3/5/7 labels match columns; range is scannable MM/DD/YYYY.  
4. **Settings sheet honesty** — JUMP/academic row/helper gone; Clear means none; nested Done is one level.  
5. **Day List continuity** — multi-day activities without chevron pager chrome.  
6. **Density** — kill wasted header→tabs gap without killing tabs.  
7. **Seat safety** — hats/twins/Hidden/sports/filters≠ACL HOLD.  
8. **Product separation** — Calendar ≠ Diary; no tray sixth.  
9. **Closer feel, not clone** — school laws win on conflict.  
10. **Ship discipline** — no Eng until dual stamp + Chuck send.

---

## 7. IQG coverage checklist (PM)

| IQG question | Covered |
|---|---|
| Hats | US-R5-03, US-R5-15 |
| Entry | Title + Calendar chrome; dual-hat by seat |
| Full lifecycle | §4.1 |
| Multiplicity | US-R5-16 (3/5/7, many-day List, remaining filters) |
| Reverse | §4.2 (Settings vs Calendars Done; Clear; List→Single) |
| Non-goals | §5 |
| Quality goals | §6 + stamp block |

---

## 8. Stamp comment for CoS (copy onto parent `t_ef9d63b1`)

```
PM DESIGN STAMP — CAL-R5 (CEO 12-item polish)
PM: APPROVED 2026-09-20 · product-manager · t_dc5b2ed6
Artifact: notes/company/calendar-r5-pm-lock.md
Laws: CAL-R5-01…12 (1:1 with CEO list; not thinned)
Day List density: A (continuous multi-day + in-list date headers; no chevron) — designer pack absent at lock
Dual stamp: MET with QA Supervisor t_605c88c4 · notes/company/calendar-r5-intent.md (2026-09-20)
Eng: DARK until Chuck send (Chuck has not said send)
```

---

## 9. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | PM lock + DESIGN STAMP Calendar R5 |
| RESULT | `notes/company/calendar-r5-pm-lock.md` with laws, stories/AC, stamp **PM APPROVED** |
| VERIFICATION | CAL-R5-01…12 map CEO 1…12; hats/multiplicity/reverse/non-goals present; no src/git/SQL/Eng |
| OPEN ISSUES | Designer pack may land later — if it only clarifies density and conflicts with A, CoS restaffs PM choose; do not block stamp on missing pack per card |
| ESCALATION | No |
| NEXT | QAS intent + stamp on parent; CoS pastes PM stamp comment; **stop for Chuck send**; no Eng |

---

*End of CAL-R5 PM lock.*
