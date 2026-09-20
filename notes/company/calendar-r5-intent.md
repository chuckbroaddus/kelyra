# CAL-R5 IQG — Real-world intent (CEO 12-item polish)

**Date:** 2026-09-20  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_605c88c4` · IQG parent (sticky, do not parent-link): `t_ef9d63b1`  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` · DITL: `notes/company/DITL_OS.md`  
**Feature:** CAL-R5 — CEO 2026-09-20 twelve chrome/behavior locks on live Calendar (class app, mobile + web)  
**Status:** Design-stage IQG intent. Docs only. **No** `src/` / SQL / Edge / qa-loop / git / Eng from this card.

**CEO lock (2026-09-20):** 12 numbered items on parent `t_ef9d63b1` — do not thin.  
**Prior law still binds except R5 deltas:** `calendar-r4-intent.md` + `calendar-r4-pm-lock.md` (L-C+C-B); `calendar-chrome-row-intent.md` + `calendar-chrome-row-pm-lock.md` (CR-CalTabs); tray CT-A+G1 when live.  
**Designer pack:** `notes/company/calendar-r5-ux-options.md` (+ delta if present) — consumed; CEO outcomes locked; Day List density A/B offered → **PM locks A**.  
**PM lock (APPROVED):** `notes/company/calendar-r5-pm-lock.md` (`t_dc5b2ed6`) — laws CAL-R5-01…12, stories US-R5-*, density **A**.

**Role:** Phase 1 real-world intent + QAS DESIGN STAMP. **Dual stamp MET** with PM. Eng dark until Chuck says send on parent.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: KELYRA Calendar CAL-R5 (CEO 2026-09-20 12-item chrome/behavior polish)
Quality goals: First-tap Diary↔Calendar title match on every seat that has both (mobile+web); Year single chevron year row; Month chevron Month, Year; Week 3→mid-3 / 5→weekdays / 7 HOLD + range MM/DD/YYYY–MM/DD/YYYY; Settings DROP JUMP + academic preset row + footer helper copy; Clear Filters = deselect every selected chip; Calendars Done pops one level to Settings then Settings Done closes; Day List density A continuous multi-day activity scroll (mode, not second Calendar) without date chevron row; tight header→Y/M/W/D tabs gap; HOLD R4 L-C+C-B + CR-CalTabs + hats/twins/Hidden/assign≠publish/LF-A category chips remaining/lean/Desk≠Year/Diary≠Calendar/filters≠security
PM: APPROVED  date: 2026-09-20  profile-session: product-manager / t_dc5b2ed6 · notes/company/calendar-r5-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-20  profile-session: qa-supervisor / t_605c88c4 · notes/company/calendar-r5-intent.md
Intent gaps remaining: none
```

**Dual stamp: MET** — PM lock CAL-R5-01…12 + density A matches this intent (CEO 12 without thinning). Eng still dark until Chuck **send** on parent `t_ef9d63b1`.

**QA Supervisor stamp meaning:** Real-world intent for CAL-R5 is fully specified (not happy-path only): hats + dual-hat title lag, chrome entry, full Settings/Calendars/Day List/week lifecycle + reverse, multiplicity (3/5/7, continuous Day List, remaining filter chips after preset-row DROP), failure/empty honesty, and explicit non-goals. Items **1, 8, 9** are **correctness** (first-tap title; Clear Filters deselects; nested Done). Item **11** is a **Day mode**, not a second Calendar destination — density **A** (in-list date section headers; no chevron toolbar). Does **not** invent chrome outside CEO 12 + PM A. Does **not** authorize Engineering send. Does **not** declare product-complete. Phase 4 prove-out OBJECTIVE is a later card after implement. Loop `passed` alone is not stamp-met.

**PM alignment:** `calendar-r5-pm-lock.md` picks same 12 laws; JUMP DROP supersedes CAL-41 gear JUMP path without inventing replacement; academic preset row DROP; Clear = deselect all; nested Done; Day List A. Designer pack `calendar-r5-ux-options.md` maps KEEP/ADD/CHANGE/DROP — no competing product pack.

**Restamp triggers (post-stamp drift → REJECT until closed):**

1. Diary↔Calendar (or reverse) still shows prior title until second tap on any seat/device that has both.  
2. Year keeps duplicate bold year under chevron year row.  
3. Month chevron still shows day-of-month in the period label.  
4. Week 3/5 column sets wrong weekdays (3 not mid-week TUE–THU; 5 not MON–FRI); 7 regresses.  
5. Week range stays long Month Day, Year form instead of MM/DD/YYYY – MM/DD/YYYY.  
6. JUMP Agenda/Days section remains in Settings after R5.  
7. Academic preset row (All academic / School only / My sports / Reset) remains.  
8. Clear Filters selects chips or leaves any Show/category chip selected.  
9. Calendars Done closes entire Settings stack instead of returning to Settings.  
10. Settings footer helper copy about Day List / tab row remains.  
11. Day List still shows `<< Month Day, Year >>` chevron row, or is treated as a second Calendar route/product.  
12. Excess blank gap between header and Y/M/W/D tabs remains as shipped “done.”  
13. Soften hats / twins / Hidden / assign≠publish / Desk≠Year / Diary≠Calendar / filters≠security.  
14. Reopen L-C/C-B/CR-CalTabs pack wars or invent new chrome packs on this track.

---

## 0. One-line law (binding)

| Dimension | Lock | Not |
|---|---|---|
| **Scope** | Polish **live** Calendar chrome/behavior only (post R4 + CR-CalTabs + tray when live) | New Calendar product; Diary rewrite; event CRUD redesign |
| **Title** | Header/tray/screen title matches **destination on first tap** Diary↔Calendar (and reverse) mobile+web, every seat with both | Title lag until second tap; dual-hat seat exception |
| **Year** | One chevron year row only (`<< 2026 >>` spirit) | Extra bold year row under chevrons |
| **Month** | Chevron label **Month, Year** (e.g. September 2026) | Month Day, Year in chevron |
| **Week columns** | **3** = TUE WED THU; **5** = MON–FRI; **7** HOLD correct today set | Free-form N; wrong weekday sets |
| **Week range** | **MM/DD/YYYY – MM/DD/YYYY** | Month Day, Year – Month Day, Year |
| **Settings IA** | Gear Settings: modes + remaining Show chips + Calendars + Clear; **DROP** JUMP section; **DROP** academic preset chip row; **DROP** Day List helper footer copy | Keep JUMP/presets/helper as “still needed” without new lock |
| **Clear Filters** | Deselect **every** selected filter chip → none selected | Select several; reset-to-default that leaves chips on if UI shows selected |
| **Nested Done** | Settings → Calendars → **Done = Settings**; Settings **Done = close** | Single Done closes whole stack from Calendars |
| **Day List** | Day view **mode** density **A**: continuous multi-day activities; **in-list** date section headers OK; **no** date chevron row | Second Calendar; Agenda rename-only; chevron kept; density B without new lock |
| **Density** | Tighten header → PersonTabs Y/M/W/D gap (item 12) | Leave museum blank as polish-done |
| **HOLD** | R4 L-C spine; CR-CalTabs one-row; hats; twins CH-A; Hidden; assign≠publish; LF-A **category** chips that CEO did not drop; lean composer; Desk≠Year; Diary≠Calendar; filters≠security; no Inbox | Soften any HOLD |

**Supersedes prior intent only on the 12 CEO deltas.** R4/CR-CalTabs/tray laws otherwise HOLD.

---

## 1. Hats + dual-hat

### 1.1 Who uses R5 (same Calendar hats as R4/CR-CalTabs)

| Hat | R5 applies? | Notes |
|---|---|---|
| **Teacher (Teach seat)** | **Yes** | Full 12 on Calendar; Settings/Calendars; week/Day List; title if seat also has Diary |
| **Student** | **Yes** | Read-scoped; no Hidden leak via any R5 chrome; title if Diary present for seat |
| **Parent** | **Yes** | CH-A focused child; twins never merge on Day List continuous rows |
| **Office / superintendent** | **Yes** | School-visible; web Month default HOLD; title if Diary present |
| **Substitute / co-teacher** | **Yes on own seat** | RLS-scoped; same chrome laws |
| **Signed-out** | **No** | Auth wall only |

### 1.2 Dual-hat + title lag (item 1 — correctness)

| Intent | Specified? |
|---|---|
| Every dual-hat (teacher+parent, office+parent, office+teacher, etc.) Calendar follows **active seat** only — no cross-seat leak on Day List, filters, week, Settings | Yes — R4/CR HOLD |
| **Diary → Calendar** first tap: visible title (header / large title / tray label / web chrome — wherever product shows surface name) reads **Calendar**, not Diary | Yes — item 1 |
| **Calendar → Diary** first tap: title reads **Diary**, not Calendar | Yes — item 1 |
| Same first-tap law on **mobile and web** | Yes — item 1 |
| Same first-tap law for **every seat that has both** Diary and Calendar chrome (not teacher-only) | Yes — item 1 must-include |
| Seat switch mid-Calendar rebuilds scope; does not leave wrong-seat title or filters | Yes — dual-hat HOLD + item 1 |
| Never invent dual-hat-only title chrome or merged Diary+Calendar title | Yes — no invent |

**P1 if miss after Eng:** first-tap title lag on any hat/device that has both surfaces.

---

## 2. Chrome entry

| Affordance | Where | R5 job |
|---|---|---|
| **Calendar** | Tray Calendar (when CT-A live) and/or drawer CE-A heritage → `/calendar` | Land Calendar; title = Calendar on first entry from Diary or elsewhere |
| **Diary** | Tray Diary (separate product) | Leave Calendar; title = Diary on first tap; **not** this track’s product rewrite |
| **Gear Settings** | CR-CalTabs right cluster **gear** on Calendar row | Open Settings (ViewCustomizeSheet spirit): Month Compact\|List; Day Single\|List; Show category chips (remaining); Calendars; Clear Filters; Done |
| **Calendars nested** | Inside Settings → Calendars | Nested sheet; **Done returns to Settings** (item 9) |
| **Y/M/W/D tabs** | PersonTabs on Calendar | HOLD CR-CalTabs; tighten gap under header (item 12) |
| **Week 3/5/7** | Week view chips/stepper | Column sets per item 4; range label item 5 |
| **Day Single vs List** | Settings → Day | List = continuous multi-day mode (item 11), not new route |

**Not entry / not this slice:** new 6th tray; Desk = Year; Diary-on-Calendar; second Calendar app; invent JUMP replacement chrome beyond existing ≤2-tap Agenda/Days paths already stamped under R4/CR (CEO drops JUMP **section** in Settings — does not by itself delete Agenda/Days capability if another stamped path remains; do not invent a new JUMP UI here).

**Entry acceptance:** Every primary hat that already reaches Calendar still reaches it. Gear remains the Settings entry. Calendars remains nested under Settings. No dead end after JUMP/preset/helper DROP.

---

## 3. Full lifecycle (happy path alone = IQG reject)

| Phase | Behavior | CEO # |
|---|---|---|
| **Enter Calendar** | Tray/drawer/deep link → `/calendar`; title **Calendar** on first paint when coming from Diary | 1 |
| **Enter Diary** | From Calendar → Diary; title **Diary** on first paint | 1 |
| **Orient Year** | Chevron year row only; no duplicate bold year under it | 2 |
| **Orient Month** | Chevron shows Month, Year (no day-of-month) | 3 |
| **Orient Week** | 3/5/7 chips; columns per §0; range MM/DD/YYYY – MM/DD/YYYY | 4, 5 |
| **Open Settings** | Gear → Settings sheet | 6–10 |
| **Settings modes** | Month Compact\|List; Day Single\|List remain | HOLD + 11 |
| **DROP JUMP** | No Jump section (Agenda/Days chips block gone) | 6 |
| **DROP preset row** | No All academic / School only / My sports / Reset row | 7 |
| **Show chips remain** | Category chips CEO did not drop (Academic / School / Sport / Personal spirit) stay toggleable | HOLD LF-A |
| **Clear Filters** | One control → **zero** selected Show/category chips (deselect all selected) | 8 |
| **Open Calendars** | From Settings → nested Calendars sheet (sheet itself KEEP) | 9 |
| **Calendars Done** | Pops **one** level → Settings still open | 9 |
| **Settings Done** | Closes Settings; returns to Calendar canvas | 9 |
| **DROP helper copy** | No footer starting “Day List stays here in the customizer…” | 10 |
| **Day Single** | Timeline/hour gutter HOLD R4; period chrome as stamped outside item 11 | HOLD |
| **Day List mode** | Settings → Day → List: continuous vertical multi-day activity list; swipe/scroll across days; **no** `<< Month Day, Year >>` chevron row | 11 |
| **Week set change** | Tap 3 or 5 or 7 recounts columns per law; RM stepper still essential if multiday path used | 4 |
| **Tighten chrome** | Header to Y/M/W/D tabs gap reduced (padding/leftover row — Eng diagnoses; intent = no excess blank) | 12 |
| **Leave Calendar** | Platform/tray exit; title of destination correct first tap | 1 |
| **Re-enter** | Last view/mode prefs OK; factory phone Year HOLD R4 | HOLD |
| **Seat / child change** | Rebuilds week/Day List/filters/search; no sticky wrong scope | dual-hat HOLD |

### 3.1 Settings nested stack (binding)

```
Calendar canvas
  → gear Settings (level 1)
       → Calendars (level 2)
            Done → back to Settings (level 1 still visible)
       Done → dismiss Settings → canvas
```

Scrim/back on level 2 must not skip the return-to-Settings law if product uses hardware back — **minimum:** explicit Done on Calendars returns to Settings. Closing Settings from level 1 does not require a second phantom sheet.

### 3.2 Day List vs Day Single vs Agenda

| Surface | Job | R5 |
|---|---|---|
| **Day Single** | One-day timeline | HOLD; not removed |
| **Day List** | **Mode** of Day density **A**: continuous activities across days; in-list date section headers; empty-day muted header OK; **not** a chevron period row | Item 11 · PM §0.3 A |
| **Agenda / Days data** | May remain as code paths off-row | JUMP **chrome** DROP (PM CAL-R5-06 / supersession CAL-41 gear JUMP). **No invent** replacement JUMP UI on R5 |

**Item 11 is a mode, not a second Calendar** — no new tray tab, no `/calendars-list` product, no Diary merge.

---

## 4. Multiplicity

| Case | Intent law |
|---|---|
| **Week 3/5/7** | Three distinct day-sets: 3 = TUE WED THU; 5 = MON TUE WED THU FRI; 7 = full week as today (correct HOLD). User can switch among all three without dead end. |
| **Continuous Day List** | Many days in one scroll; empty days honest (skip or empty section — do not fake events); twins never unlabeled-merge across day sections; parent focused-child only |
| **Remaining filter chips after preset-row DROP** | Show/category chips (Academic, School, Sport, Personal) remain multi-select; Clear Filters clears **all** selected; filters still ≠ security (RLS/Hidden unchanged) |
| **Multi-child parent** | CH-A focus; Day List + week + Settings filters rebuild on child switch |
| **Dual-hat seats** | Title + data scope per active seat; prefs per seat+device (+ child spirit) HOLD |
| **Phone + web** | All 12 items both surfaces unless a row is phone-only chrome (none of the 12 are phone-only) |
| **Calendars layers ≥1** | Nested Calendars sheet still lists layers; Done stack law holds with many layers / search heritage |
| **RM / a11y** | 3/5/7 without pinch-required; VO names view/mode; Done controls labeled; Clear Filters state announced when practical |

---

## 5. Reverse / cancel / already-in-flow

| Action | Reverse |
|---|---|
| Diary → Calendar | Calendar → Diary (title correct both ways first tap) |
| Open Settings | Done / scrim dismiss; toggles only stick if user changed them |
| Open Calendars from Settings | **Done → Settings** (not canvas); then Settings Done → canvas |
| Hardware/back from Calendars | Prefer pop to Settings; must not strand user without Settings recover if Done exists |
| Select Show chips | Untoggle individual **or** Clear Filters → none selected |
| Clear Filters | User may re-select chips; empty canvas recovery may still offer Clear |
| Day Single → List | Settings → Single Day (or equivalent mode control); List is not permanent trap |
| Leave List mode | Back to Single; continuous list state does not corrupt Single day anchor dishonestly |
| Week 3 → 5 → 7 | Any chip returns other set; 7 remains valid |
| `<<` `>>` on Week range | Moves range; format stays MM/DD/YYYY – MM/DD/YYYY |
| Year/Month chevron nav | Prev/Next still work; labels obey items 2–3 |
| Filtered empty | Honest empty + Clear path; Clear deselects all |
| Sport layer on | Opt-out / Unsubscribe ≠ Delete HOLD |
| Focused child A | Switch B rebuilds Day List continuous content |
| Seat switch mid-Settings | Dismiss or rebuild honestly; no cross-seat filter leak |

---

## 6. Failure · empty · honesty (not happy-path)

| State | Intent |
|---|---|
| Clear Filters with nothing selected | Idempotent no-op or stays none — never bulk-selects |
| Clear Filters with all selected | Ends at **none** selected |
| Day List empty range | Honest empty — no fake activities |
| Day List offline / load fail | Fail closed; no fake multi-day success |
| Calendars Done while Settings unmounted | Must not crash; recover to canvas safely |
| Hidden teacher items | Never appear in Day List continuous rows for family seats |
| Search (HOLD row) | Seat-scoped; R5 does not expand privilege |
| Prefs corrupt | Safe defaults; phone Year HOLD; dayMode may fall back Single |
| Reduce Motion | Day List still scrolls; week chips still switch 3/5/7 |

---

## 7. Explicit non-goals (not built ≠ done)

1. **Engineering / qa-loop / bot-build / git / SQL** on this stamp card.  
2. **Chuck send** implied — Eng stays dark until parent dual stamp + explicit send.  
3. **New Calendar product** or second Calendar destination/tab.  
4. **Diary product rewrite**, Diary-on-Calendar, or merged titles chrome.  
5. **6th tray** invent; hamburger Calendar war restore.  
6. **Event CRUD / lean composer field redesign**; Reminders; Inbox; rich Apple fields.  
7. **Reopen L-C / C-B / CR-CalTabs** pack choice or §32.2 app-wide PersonTabs flip.  
8. **Desk home = Year/Month**.  
9. **Softening** Hidden / assign≠publish / twins / filters≠security.  
10. **Re-adding** JUMP section, academic preset row, or helper footer without new CEO lock.  
11. **Treating Day List as Agenda rename only** without continuous multi-day scroll, or keeping date chevron as “good enough.”  
12. **Clear Filters = Reset defaults that leave chips selected** in the UI.  
13. **Calendars Done = close all sheets** as acceptable.  
14. **DITL rewrite EXEC** on this card (verdict only).  
15. **Phase 4 prove-out / QE staffing** from this card (later after Eng terminal; CoS staffs).  
16. **Invent View-stroke glyphs** outside icons pipeline.  
17. **Pixel-perfect Apple clone** / iCal two-way / RSVP mesh.

---

## 8. Must-include behaviors (prove-out seeds — not Eng now)

Trace later to PM US-R5 / CAL-R5-01…12 when PM lock lands. Severity if miss after Eng:

| ID | Behavior | Sev | CEO |
|---|---|---|---|
| M-01 | First-tap title Diary↔Calendar correct mobile+web every seat with both | **P1** correctness | 1 |
| M-02 | Year: only chevron year row; no extra bold year under it | P2/P1 polish→correctness if duplicate confuses year nav | 2 |
| M-03 | Month chevron = Month, Year (no day) | P2 | 3 |
| M-04 | Week 3 = TUE WED THU; 5 = MON–FRI; 7 HOLD | P1 | 4 |
| M-05 | Week range MM/DD/YYYY – MM/DD/YYYY | P2 | 5 |
| M-06 | JUMP section absent from Settings | P1 vs stamp | 6 |
| M-07 | Academic preset row absent | P1 vs stamp | 7 |
| M-08 | Clear Filters deselects every selected chip (none left selected) | **P1** correctness | 8 |
| M-09 | Calendars Done → Settings; Settings Done closes | **P1** correctness | 9 |
| M-10 | Helper footer copy gone | P2 | 10 |
| M-11 | Day List continuous multi-day; no date chevron row; mode not second Calendar | P1 | 11 |
| M-12 | Header→tabs excess blank gone | P2 | 12 |
| M-13 | Remaining category Show chips still usable after preset DROP; filters≠security | P1 | HOLD |
| M-14 | Hats/dual-hat/twins/Hidden HOLD on Day List + week + Settings | P0/P1 | HOLD |
| M-15 | Non-goals §7 remain absent without being claimed done | — | — |

**Must-callout for CoS/PM:** items **1, 8, 9** are correctness; item **11** is a **mode**.

---

## 9. Gaps check (stamp gate)

| IQG question | Covered? | Verdict |
|---|---|---|
| Hats + dual-hat (title lag every seat with both) | Yes — §1 | **Pass** |
| Chrome entry (tray Calendar vs Diary; gear; nested Calendars) | Yes — §2 | **Pass** |
| Full lifecycle (Settings stack, Clear, Day modes, week 3/5/7) | Yes — §3 | **Pass** |
| Multiplicity (3/5/7; Day List many days; remaining chips) | Yes — §4 | **Pass** |
| Reverse / cancel (Done stack; Clear; leave List) | Yes — §5 | **Pass** |
| Failure / empty | Yes — §6 | **Pass** |
| Non-goals | Yes — §7 | **Pass** |
| CEO 12 fidelity without thinning | Yes — §0 + §8 map 1–12 | **Pass** |
| Items 1/8/9 correctness + 11 mode called out | Yes | **Pass** |
| Happy-path only? | **No** | **Pass** |
| Missing chrome forcing invent? | **No** — CEO list sufficient; designer optional | **Pass — do not REJECT** |
| Prior R4/CR holds explicit? | Yes | **Pass** |

**Intent gaps remaining:** **none** for design-stage. PM lock closed Agenda/JUMP tension: CAL-R5-06 DROP JUMP chrome; do not invent replacement; Week 3/5/7 stays on-grid; Agenda/Days data may remain off-row only if already reachable without JUMP (PM §1.1). Day List density **A** locked. Open Eng-only details (exact header gap padding vs leftover row; sticky section headers optional) do not block stamp.

---

## 10. DITL IMPACT

```
DITL IMPACT
Change: CAL-R5 CEO 12-item Calendar polish — first-tap Diary↔Calendar titles; Year/Month/Week label fixes; Settings DROP JUMP + academic presets + helper copy; Clear Filters = deselect all; Calendars nested Done→Settings; Day List continuous multi-day mode without date chevron; tighten header→tabs gap; HOLD R4/CR-CalTabs school laws
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01..T-05; DITL-P-01..P-03; DITL-O-01..O-07; DITL-S-01..S-03; DITL-DH-01..DH-02 — where Calendar chrome/Settings/Day List/week chips/title between Diary and Calendar appear, replace stale JUMP/preset/helper/chevron-Day-List/long week-range/title-lag copy with R5 laws; dual-hat title first-tap
Cases touched: matching cases after plan rewrite (CoS extends tracker; rewrite staffed per DITL_OS / ditl-scribe policy)
New DITL needed: no
Seed/artifacts: none required for design stamp; optional later if Day List continuous needs denser fixtures
Notes: Prefer existing sticky t_0a62f427 (Calendar NEW+UPDATE_PLANS). Extend with R5 delta — do not file a second Calendar DITL parent. Do not rewrite DITL files on this card. Specialists do not staff. CoS owns tracker comment/extend.
```

**Mapping note:** Task enum allows NONE | UPDATE_PLANS | NEW_DITL | NEW+UPDATE_PLANS. R5 is polish on existing Calendar surface already tracked — **UPDATE_PLANS** (not NEW_DITL). Sticky **`t_0a62f427`** preferred.

---

## 11. Next (CoS / Chuck / Eng hold)

1. **Dual stamp MET** — QAS APPROVED (`t_605c88c4` / this file) + PM APPROVED (`t_dc5b2ed6` / pm-lock). Comments on parent `t_ef9d63b1`.  
2. **Hold Engineering / qa-loop / bot-build** until Chuck explicit **send**. Do not parent-link workers to sticky parent.  
3. CoS extends sticky **`t_0a62f427`** with R5 DITL delta from §10 (no DITL file rewrite here).  
4. After Chuck send + implement terminal: QAS writes Phase 4 prove-out OBJECTIVE from §8; CoS staffs `qa-engineer` (not from this card).  
5. Defects vs stamp → board `kelyra` with severity; PM disposition.

**Related:** Parent `t_ef9d63b1` · PM `t_dc5b2ed6` / `calendar-r5-pm-lock.md` · UX `t_04ef2c47` / `calendar-r5-ux-options.md` · DITL sticky `t_0a62f427` · R4 `calendar-r4-intent.md` · CR-CalTabs `calendar-chrome-row-intent.md` · `INTENT_QUALITY_GATE.md` · `DITL_OS.md`.

---

*End CAL-R5 IQG intent — QA Supervisor DESIGN STAMP APPROVED 2026-09-20 (`t_605c88c4`). Dual MET with PM `t_dc5b2ed6`. DITL IMPACT UPDATE_PLANS prefer `t_0a62f427`. No app code. Eng dark until Chuck send.*
