# DIARY DAY-BROWSE — IQG real-world intent

**Date:** 2026-09-17  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_d717511a` · Process: `notes/company/INTENT_QUALITY_GATE.md` · DITL: `notes/company/DITL_OS.md`  
**IQG parent tracker (do not parent-link workers):** `t_ea554343`  
**Parallel PM:** expected `notes/company/diary-day-browse-spec.md` (or pm-lock) — **absent at QAS stamp time**  
**Research (complete):** `notes/company/diary-day-browse-research.md` (`t_574b8816`)  
**Designer packs (complete, unlocked):** `notes/company/diary-day-browse-ux-options.md` · delta `diary-day-browse-delta.md` · mockups `notes/company/diary-day-browse-mockups/` (DB-A lean pager · DB-B month+agenda · DB-C parity chips) (`t_220ada09`)  
**Chrome entry SoT (BINDING, separate epic):** SETTINGS + DIARY TRAY dual stamp **MET** — `settings-tabs-diary-tray-spec.md` + `settings-tabs-diary-tray-intent.md` (ST-A · TC-A · KL-A). Teacher day path = **tray Diary**; parent/office = **hamburger Diary**; student = **zero** Diary.  
**Survive product law:** DIARY IQG `diary-iqg-intent.md` (model C owner-only; seat-scoped; twins fail-closed; L7 no student Diary; Ask NL parked `t_cecf2af0`) · Calendar ≠ Diary (CAL-R2/R3 holds)  
**Product surface:** `/diary` **Journal** segment day-pick + multi-day entry scroll chrome (Calendar-*like* **kinds**, separate product)  
**Status:** Design-stage IQG intent. **QA Supervisor DESIGN STAMP: APPROVED.** Dual stamp incomplete until PM APPROVED pack + stories. **Not** Build. **Not** prove-out. **Not** Eng. No app code. No SQL. No qa-loop. No git. **QAS did not pick DB-A/B/C.**

**Role:** Phase 1–2 real-world intent for CEO 2026-09-17 Diary Journal day-browse. Own hats / entry / full lifecycle / multiplicity / reverse / non-goals that **any legal pack** must satisfy. Stamp APPROVED only if those are complete without inventing chrome. Do **not** design option packs. Do **not** staff Eng or ditl-scribe.

**CEO lock (2026-09-17):** Diary browsing uses Calendar-*like* day-select and multi-day scroll. **Look/feel** for browsing may resemble Calendar. **Functions stay separate** — Calendar events/layers/composer ≠ Diary journal entries/composer.

**Live baseline (code-grounded, not design lock):**
- Journal: From/To YYYY-MM-DD TextFields + Apply; Newest/Oldest; list grouped by `entry_date` SectionHeader; no visual day-pick / multi-day browse chrome.
- Calendar: MonthGrid / DayColumn / MultiDayStepper / YearGrid / AgendaList / view chips — **reference kinds only**.
- Teacher tray already includes Diary peer under ST-A composition in live `trayTabs.ts` (Desk · Needs Attention · Diary · Kelyra); day-browse chrome inside Journal is still missing.
- Parent multi-child chips + fail-closed empty live; teacher soft student pointer live (orthogonal to day chrome).

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Diary Journal day-browse (Calendar-like chrome, separate product)
Quality goals: Visual day-pick + multi-day Journal entry scroll for owner seats; Journal-only browse (Ledger list+range kept); Calendar-*like* kinds without Calendar functions; teacher tray / parent+office hamburger entry per ST-A; twins fail-closed never mix; presence owner-only neutral (no roleTint); empty day + Today + reverse filters; create/edit/delete stay Diary composer (not Calendar +); student zero Diary; dual-hat = signed-in chrome seat only; pack pick is PM’s; dual stamp before Eng
PM: UNSTAMPED  date: —  profile-session: pending product-manager · expected notes/company/diary-day-browse-spec.md (or pm-lock)
QA Supervisor: APPROVED  date: 2026-09-17  profile-session: t_d717511a / qa-supervisor · notes/company/diary-day-browse-intent.md
Intent gaps remaining: none (QAS real-world intent). Dual stamp blocked on PM pack pick (DB-A|DB-B|DB-C + PR/RG/SR/EM/FW atoms) + stories/AC covering DB-01..N below. Designer packs present — QAS did not invent chrome. Chrome entry already dual-stamped ST-A (not reopened here).
```

**QA Supervisor stamp meaning:** Real-world intent for Journal **day-browse** is fully specified (not happy-path only). Survive laws below bind **regardless** of which pack PM locks. Does **not** authorize Engineering. Eng stays dark until **PM + QAS** both APPROVED on the dual stamp lines. Does **not** declare product-complete. Phase 4 prove-out OBJECTIVE is a later card after implement.

**PM alignment rule (restamp triggers):** When PM lock/spec lands, QAS re-reads. **REJECT** restamp if PM:

1. Puts **Calendar events**, layers, dues, sports, Hidden badges, CalendarsSheet, EventComposer, or `CalendarItem` rows on Diary Journal.
2. Puts **Diary body / journal entries** on Calendar as a browse mode.
3. Makes **Ledger** the default day-grid / strip / stepper home (RR-L without research reopen + dual stamp).
4. Adds a **6th tray** tab or restores teacher Class/Capture tray for this feature.
5. Imports **FullCalendar / Wix** or ships a **Reminders** product.
6. Opens **student Diary** (violates DIARY L7 + ST-A GAP-S1).
7. Makes journal body **Office-visible** (model C / owner-only broken).
8. Merges **Ask NL Dear Diary** (`t_cecf2af0`) into this epic.
9. Uses **roleTint / multi-tint / dayTintSeeds** presence (event-layer tints) on Journal days.
10. Drops **Today** jump, **empty-day** honest state, or **reverse/clear** of day focus back to a named default.
11. Routes empty-day **New entry** through **Calendar +** / EventComposer instead of Diary composer (+ DATE-P1 prefill).
12. Lets parent **2+ children** presence or list mix twins (fail-closed broken).
13. Folds **child chips** or **teacher student pointer** into day cells / view chips as identity chrome.
14. Claims **teacher hamburger Diary** as the primary day path after ST-A (tray owns teacher entry) without a CEO override note.
15. Silences dual-hat by sharing one diary across seats (must stay **signed-in chrome seat** only).
16. Invents freestyle View-stroke glyphs outside the icon recipe pipeline.
17. Picks a pack **thinner** than CEO day-pick + multi-day scroll (e.g. text From/To only with a cosmetic strip that does not change focus/list) without naming it a non-ship / research reopen.

If PM lock matches laws + must-includes here → no restamp; dual stamp met when PM line is APPROVED on parent `t_ea554343` + lock note.

**Designer pack gap verdict:** Packs **DB-A / DB-B / DB-C** + delta + mockups are **complete enough** for chrome choice. QAS does **not** REJECT for missing designer work. Open product choice (lean strip vs month grid vs view chips; presence PR-*; range leftover RG-*; sort SR-*; empty EM-*; fork weight FW-*) is **PM**, not a designer hole.  
**Note only (not a gap):** Designer hat tables still say teacher hamburger in places; **ST-A tray Diary** supersedes that for teacher entry. Day-browse lives **inside** `/diary` Journal after entry — packs’ in-screen chrome still apply. Do not restaff designer solely for that wording; PM lock must cite ST-A entry.

**Chrome invent ban:** QAS does not invent a fifth pack, Ledger day-grid, tray sixth, or Calendar merge path. If PM wants chrome outside DB-A/B/C + orthogonal atoms, CoS restaffs designer — QAS REJECTS until packs exist.

---

## 0. One-line law

| Surface | Job | Not |
|---|---|---|
| **Diary app** (`/diary`) | Owner private Journal + immutable Ledger | Calendar; Needs; student To-do; Office Activity firehose |
| **Journal segment** | Write / read / photo / STT private entries by `entry_date` | Shared school events; layers; publish; Reminders |
| **Journal day-browse chrome** | **Pick a day** and **scroll entries across days** with Calendar-*like* navigation **kinds** | Calendar **functions** (events, layers, dues, sports, CalendarsSheet, EventComposer, role tints) |
| **Ledger segment** | List + range + family chips of *my* action log | Default day grids / steppers / month pick (RR-L out) |
| **Teacher tray Diary** (ST-A) | Day-job entry to `/diary` | Privacy-only Settings tab; sixth tray; Class restore |
| **Hamburger Diary** | Office + parent entry to `/diary`; teacher dual path **dropped** under ST-A | Student row; teacher primary after ST-A |
| **Parent child chips** | Scope Journal (+ presence) to **one** linked child | Twin merge; other children's dots |
| **Teacher soft student pointer** | Private search filter on Journal entries | ACL; grade; Calendar student layers; day-cell identity |
| **Diary composer** | create/edit/delete entries; DATE-P1 date field | Calendar +; EventComposer |
| **Calendar app** | School/family events + layers | Journal bodies; diary day-browse host |

**Combined law:** Same *kinds* of day-pick / multi-day scroll as Calendar; **different product and data**. Fork look; never share event model.

---

## 1. Hats

### 1.1 Teacher (primary Journal owner)

| Intent | Must | Notes |
|---|---|---|
| Open Diary from **teacher tray Diary** (ST-A) | Yes | Desk · Needs Attention · **Diary** · Kelyra; no 6th |
| Land on Journal with **day-browse chrome** (chosen pack) | Yes | Not text-From/To as primary phone path |
| Pick day / change day / multi-day scroll own entries | Yes | Seat=`teacher` owner-only |
| Soft class/student pointer **orthogonal** to day chrome | Yes | Below or disclosed under day chrome; never in presence dots |
| Empty day → New entry opens **Diary** composer, date=focus | Yes | Not Calendar |
| Edit/delete existing entries stay Diary | Yes | DIARY IQG |
| Ledger segment reachable; **no** day-grid default | Yes | Research Journal-only browse |
| Dual-hat teacher→parent: parent seat diary only after seat switch | Yes | §1.5 |
| No teacher hamburger Diary as required primary after ST-A | Yes | ST-20; deep `/diary` OK |

### 1.2 Staff / office / superintendent

| Intent | Must | Notes |
|---|---|---|
| Open Diary from **hamburger Diary** | Yes | No Diary tray slot |
| Same Journal day-browse chrome post-entry | Yes | Seat=`staff`; personal journal only |
| **Not** school-wide staff journal; not Office Activity | Yes | Activity ≠ Diary |
| No Office-visible **other** teachers’ journal bodies | Yes | Owner RLS model C |
| Ledger = **my** office actions when present | Yes | DIARY IQG; browse chrome still Journal-only |

### 1.3 Parent

| Intent | Must | Notes |
|---|---|---|
| Open Diary from **hamburger Diary** | Yes | No parent Diary tray (ST-C rejected) |
| **2+ children:** child chips **above** day chrome; fail-closed empty until focus | Yes | Twin law |
| Day-browse + presence **scoped to focused child only** | Yes | Never mix twins |
| Single child: default focus; same chrome | Yes | |
| Parent Ledger deferred stays deferred | Yes | DIARY L-6; not this epic |

### 1.4 Student

| Intent | Must | Notes |
|---|---|---|
| **No** Diary tray, hamburger row, Open Diary CTA, ledger, Ask diary tool | Yes | DIARY L7 + ST-A GAP-S1 |
| day-browse does **not** create a student path | Yes | Explicit non-goal |

### 1.5 Dual-hat (signed-in chrome only)

| Intent | Must | Notes |
|---|---|---|
| Diary seat = **active chrome seat** only (`diarySeatForChrome`) | Yes | Teacher diary ≠ parent diary |
| Teacher-who-is-parent on parent seat: parent entry + child chips + parent journal | Yes | No teacher tray Diary on parent seat |
| Office-who-is-teacher: seat remount; journal reloads for seat | Yes | |
| Processing/working-K orthogonal; no second diary glyph | Yes | Soft K epic separate |
| No “combined household diary” across seats | Yes | |

### 1.6 Role none / signed-out

| Intent | Must | Notes |
|---|---|---|
| No Diary day-browse | Yes | Auth wall |

---

## 2. Chrome entry (no hidden dead-end)

| Hat | Entry path | After entry | Not |
|---|---|---|---|
| **Teacher** | Tray **Diary** → `/diary` | Journal segment + day-browse; PersonTabs Journal \| Ledger | Settings Diary privacy tab as sole app door; hamburger Diary primary (ST-A drop); Class tray |
| **Staff / office** | Hamburger **Diary** → `/diary` | Same Journal day-browse | Tray Diary; Activity route confusion |
| **Parent** | Hamburger **Diary** → `/diary` | Child chips (if 2+) then day-browse | Parent tray Diary; household shared |
| **Student** | **None** | — | Any working Diary chrome |
| **Dual-hat** | Entry for **active seat** only | Seat switch remounts list + chrome | Cross-seat bleed |
| **Deep link** `/diary` | Kept if `canOpenDiary` | Same seat gates | Bypass student lock |

**Journal vs Ledger entry inside app:**
- Day-browse chrome mounts on **Journal** only.
- Switching to **Ledger** hides day-browse (or leaves it unmounted); Ledger keeps list + text range + family chips.
- Switching back to Journal restores last focused day / pack default (PM may name memory policy; must not lose unsaved composer — composer already gated).

**Settings Diary tab (ST-A):** Privacy education only — optional ghost “Open Diary” must not replace tray/hamburger entry and must not host day-browse.

---

## 3. Full lifecycle (must-include behaviors)

IDs **DB-01…** are QAS must-includes for PM stories/AC. Pack may vary **how**; not **whether**.

### 3.1 Focus & pick

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-01** | User can establish an explicit **focused/selected day** without typing ISO as the primary phone path | Strip cell / month cell / day mode — pack choice |
| **DB-02** | Changing focused day updates the visible entry set for that day (and pack’s multi-day window) without a separate Apply tap on the primary path | Auto-apply on select |
| **DB-03** | **Today** control jumps focus to local today and scrolls/reveals today’s entries (or empty state) | All packs |
| **DB-04** | Month-scale or week-scale jump exists **or** is an explicit pack non-goal with CEO-acceptable tradeoff named in PM lock | DB-A may omit month; DB-B/C include month |

### 3.2 Multi-day scroll

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-05** | User can **scroll or page entries across consecutive days** (not only a single flat filtered list with no day motion) | Stream / agenda / Days columns — pack choice |
| **DB-06** | Day boundaries remain readable while scrolling (sticky SectionHeader or day column header) | All packs |
| **DB-07** | Multi-day window is **entries**, never timed school-event blocks / hour gutter timeline | Function-out DayColumn hours |

### 3.3 Empty / create / edit / delete

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-08** | Focused day with zero entries shows honest **empty** (“No entries yet” or equal) — not silent skip-only | All packs |
| **DB-09** | Empty state primary **New entry** opens **Diary** composer with `entry_date` prefilled to focused day (DATE-P1 field still editable in composer) | Not Calendar + |
| **DB-10** | Existing New entry / edit / delete / photo / STT paths remain Diary-internal | DIARY IQG |
| **DB-11** | After save, new entry appears under the correct day in browse without requiring app restart | |

### 3.4 Filters, sort, search (coexist)

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-12** | Newest/Oldest (or pack-equivalent order) still defined for multi-day streams | May hide in single-day-only mode if PM says |
| **DB-13** | Text search / tag filter (if live) compose with day focus without wiping seat/child scope | Keep unless PM explicit Drop with reason |
| **DB-14** | Primary path does **not** require From/To text; leftover range is Drop / disclosure / web-only per RG-* | Demote or drop primary |

### 3.5 Reverse / cancel / already-in-flow

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-15** | User can **clear or reset** day focus / advanced range back to pack default (e.g. Today-centered or newest window) without force-quit | Named control or equivalent |
| **DB-16** | Switching Journal → Ledger → Journal does not corrupt seat/child focus; day focus restores per PM memory rule (default: last Journal focus or Today) | |
| **DB-17** | Switching day while composer open: either keep composer date sticky until dismiss **or** prompt — PM picks; must not silently save to wrong day | No data loss |
| **DB-18** | Cancel composer discard does not change focused day | |
| **DB-19** | Parent child chip change **reloads** journal for that child and resets or re-scopes day presence; never shows prior child’s entries | Fail-closed if none focused |
| **DB-20** | Teacher student-pointer clear returns to all-own-entries for seat without clearing day chrome | Orthogonal filters |
| **DB-21** | View/mode chip change (DB-C) or hide-grid toggle (DB-B optional) is reversible without losing the focused calendar day | |
| **DB-22** | Already on Today + tap Today = stable no-op (no navigation spin) | |

### 3.6 Leave product

| ID | Behavior | Any legal pack |
|---|---|---|
| **DB-23** | Leave via tray/hamburger to other apps; return to `/diary` restores browse (session memory OK; cold start → pack default) | |
| **DB-24** | Sign-out clears private journal from UI | Auth |

---

## 4. Multiplicity

| Dimension | Law | Must |
|---|---|---|
| **2+ children (parent)** | Chips above day chrome; identity > date; presence + list = focused child only | Yes — never mix twins |
| **0 focused child when 2+** | Fail-closed empty Journal (no entries, no presence dots) | Yes |
| **Teacher multi-class** | Soft pointer is filter only; day chrome not a class switcher | Yes |
| **Teacher multi-student chips** | Orthogonal under/beside day chrome; not day-cell labels | Yes |
| **Dual-hat seats** | Separate journals; chrome seat only | Yes |
| **Phone vs web** | Phone: compact strip/grid + stream; web: wider targets / optional split (month \| stream) per pack | Yes — both ship |
| **Multi-device** | Same owner RLS; no device-specific second diary | Yes |
| **Presence multiplicity** | At most owner-scope neutral dot/count; never other users’ events | Yes |

---

## 5. Presence indicators (owner-only)

| Rule | Must |
|---|---|
| Dot/count means “**I** (or focused child journal scope) have ≥1 journal entry that day” | Yes |
| **Never** `roleTint` / multi-tint stacks / Calendar `dayTintSeeds` / layer colors | Yes |
| Parent presence ignores non-focused children | Yes |
| Teacher pointer does not paint another teacher’s or student’s private marks on the grid | Yes — pointer is filter, not tint source |
| Empty cell = no mark (not “blocked”) | Yes |
| FERPA: presence must not leak via shared widgets outside owner session | Yes |

---

## 6. Pack-agnostic chrome inventory (PM picks one)

| Pack | Day pick | Multi-day scroll | View chips | Eng size | CEO “kinds” fit |
|---|---|---|---|---|---|
| **DB-A** Lean day-pager | Week strip + ◀▶ + Today | Continuous agenda stream around focus | None | S | Low–med |
| **DB-B** Month + agenda | Month grid + Today + month ◀▶ | Agenda under/beside month | None (optional List hide-grid only) | M | Med–high (designer advisory #1) |
| **DB-C** Parity browse | Day · Days · Month (+ optional List) | Days stepper/columns + agenda | Journal-local chips | L | High (misread risk) |

**QAS does not rank for lock.** PM chooses. All three can satisfy DB-01…24 if stories cover empty/Today/reverse/twins/composer.  
**Illegal “pack”:** text From/To only; Calendar embed; Ledger month as default Journal.

Orthogonal atoms (PM after pack): **PR-*** presence · **RG-*** range leftover · **SR-*** sort home · **EM-*** empty CTA · **FW-*** fork weight · **RR-L** Ledger day chrome = rejected default.

---

## 7. Explicit non-goals

| Non-goal | Why |
|---|---|
| **Calendar events on Diary** | CEO products separate |
| **Diary body on Calendar** | CEO products separate |
| **Ledger day-grid / strip / stepper as default** | Research Journal-only; RR-L only if reopen |
| **6th tray tab** | Tray law ≤4 teacher; ST-A |
| **FullCalendar / Wix** | Stack ban |
| **Reminders product** | CAL-R3 DROP; not Diary map |
| **Student Diary** | DIARY L7 |
| **Office-visible journal bodies** | Model C owner-only |
| **Ask NL Dear Diary** | Parked `t_cecf2af0` |
| **roleTint presence on Journal days** | FERPA + function-out |
| **EventComposer / CalendarsSheet / layers / Hidden dues / sports on Diary** | Calendar functions |
| **Hour-gutter timed timeline as Journal day body** | Entries ≠ period blocks |
| **TeacherWeekGrid class periods in Diary** | Calendar/teach function |
| **Merging routes / IA / composers** | Product wall |
| **Invented View-stroke glyphs** | AGENTS icon pipeline |
| **Re-picking ST-A/TC-A/KL-A or Needs tabs** | Separate stamps |
| **DATE-P1 redesign inside browse chrome** | Composer field stays DATE-P1 |
| **Parent Ledger enablement** | DIARY deferral |
| **E2E encryption theater copy** | Model C honesty |
| **This card: Eng / qa-loop / SQL / git** | Docs only |

---

## 8. Must-include acceptance matrix (for PM stories)

| # | Must-include | Hats |
|---|---|---|
| M1 | Visual primary day-pick (not ISO text primary on phone) | T/O/P |
| M2 | Multi-day entry scroll/pager with readable day boundaries | T/O/P |
| M3 | Today jump | T/O/P |
| M4 | Empty day + New entry → Diary composer date=focus | T/O/P |
| M5 | Reverse/reset day focus + advanced range if any | T/O/P |
| M6 | Journal-only chrome; Ledger list+range unchanged | T/O/P |
| M7 | Parent 2+ chips above chrome; fail-closed; no twin mix | P |
| M8 | Teacher pointer orthogonal; not presence tint | T |
| M9 | Teacher entry tray Diary (ST-A); office/parent hamburger | T/O/P |
| M10 | Student zero Diary | S |
| M11 | Dual-hat chrome seat only | dual |
| M12 | No Calendar functions/data on Diary; no Diary body on Calendar | all |
| M13 | Owner-only neutral presence only (if shown) | T/O/P |
| M14 | Phone + web layouts for chosen pack | T/O/P |
| M15 | Create/edit/delete stay Diary composer | T/O/P |
| M16 | Copy/empty states say entries/journal — not “calendar events” | all |

---

## 9. Gaps vs thin design (stamp discipline)

| Check | Verdict |
|---|---|
| Research complete? | **Yes** `diary-day-browse-research.md` |
| Designer packs DB-A/B/C + mockups? | **Yes** — enough to pick |
| Chrome entry for hats? | **Yes** via ST-A dual stamp + DIARY L7 — **not invented here** |
| PM pack + stories? | **Absent** — dual stamp incomplete; QAS intent still APPROVED |
| Real-world lifecycle (pick/change/scroll/empty/Today/reverse/composer)? | **Specified** §3 |
| Multiplicity twins + pointer + phone/web? | **Specified** §4 |
| Non-goals explicit? | **Specified** §7 |
| Invent chrome to fill holes? | **No** |
| REJECT designer? | **No** |
| REJECT PM yet? | **N/A** until lock; restamp triggers § stamp block |

**If PM ships a lock that only demotes From/To without true multi-day scroll → REJECT (gap DB-05).**  
**If PM imports Calendar modules carrying events → REJECT (non-goal + FERPA).**

---

## 10. DITL IMPACT

```
DITL IMPACT
Change: Diary Journal gains Calendar-like day-pick + multi-day entry browse chrome (pack TBD); Ledger unchanged; Calendar product unchanged; chrome entry already ST-A
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-T-04 (teacher diary beats — add day-browse / Today / empty / multi-day; keep Ask draft-then-Save); DITL-T-01 only if tray/Diary entry wording drifts (already ST-A synced 2026-09-17) — verify no From/To-only assumption; parent plans if/when a parent Diary day exists (none named today — add beat under future parent diary plan or T-adjacent parent seat note); office personal diary if covered under office plans (scan for /diary)
Cases touched: DITL-T-04 cases for diary create/filter; any case asserting text From/To as sole Journal date UI; DITL-S-02 still claims student Diary — **honesty**: student Diary remains NON-GOAL (L7); day-browse must not revive S-02 journal beats — ditl-scribe should keep S-02 diary as GAP/unsupported vs L7 (pre-existing debt; this feature must not mark student diary SUPPORTED)
New DITL needed: no (no new role/day shape). Optional later: parent multi-child Journal day-browse focused beat if parent plans gain a Diary day — not NEW_DITL required to ship browse on existing owner seats
Seed/artifacts: none required for doc sync; no new F-ARTIFACTS for browse chrome alone
Notes: CoS staffs ditl-scribe (cheap flash) with idempotency ditl-update:diary-day-browse:UPDATE_PLANS_CASES after dual stamp or immediately per DITL_OS (IMPACT ≠ NONE → staff doc sync; do not wait Chuck). QAS does not staff ditl-scribe. Do not auto-start DITL EXEC. Do not reopen Eng for docs.
```

**Verdict summary:** **UPDATE_PLANS | UPDATE_CASES** (not NONE, not NEW_DITL).

---

## 11. Out of scope / handoff

| Do | Don't |
|---|---|
| PM lock pack DB-* + atoms + stories/AC mapped to DB-01..24 / M1..M16 | Eng before dual stamp |
| Comment dual stamp lines on parent `t_ea554343` when both APPROVED | Parent workers onto sticky parent |
| CoS staff ditl-scribe for IMPACT | QAS staff ditl-scribe / Eng / QE |
| Phase 4 prove-out OBJECTIVE after implement | Claim product-complete on loop `passed` alone |
| Keep Calendar R2/R3 and DIARY IQG laws | Merge Calendar + Diary |

**RECOMMENDED NEXT ACTION:** Stop. CoS holds Eng until dual stamp (PM lock + this QAS APPROVED). If DITL ≠ NONE, CoS files sticky `DITL-UPDATE:` → `ditl-scribe` (cheap). PM parallel completes pack pick + stories. QAS restamps only on restamp triggers.

---

## 12. Checklist (this card)

- [x] Intent file written: `notes/company/diary-day-browse-intent.md`
- [x] Hats (T/O/P/S/dual) + entry (tray/hamburger/none)
- [x] Full lifecycle pick/change/scroll/empty/Today/reverse/composer
- [x] Multiplicity twins / pointer / phone-web
- [x] Explicit non-goals (Calendar events, Diary on Cal, Ledger grid, 6th tray, FullCalendar, Reminders, student, Office-visible, Ask NL, roleTint)
- [x] Must-includes + gap verdict (no designer REJECT; PM pack open)
- [x] DITL IMPACT named
- [x] DESIGN STAMP QA Supervisor **APPROVED**; PM UNSTAMPED
- [x] No app code / SQL / qa-loop / git
- [x] Comment parent `t_ea554343` with stamp block

*End DIARY DAY-BROWSE IQG intent — QA Supervisor DESIGN STAMP APPROVED 2026-09-17 (`t_d717511a`). Dual stamp pending PM. Designer packs DB-A/B/C consumed without chrome invent. ST-A entry survive. No app code. No prove-out on this card.*
