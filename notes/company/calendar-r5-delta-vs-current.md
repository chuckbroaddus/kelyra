# CAL-R5 delta vs current

**Date:** 2026-09-20  
**Card:** `t_04ef2c47`  
**Packs:** `calendar-r5-ux-options.md`  
**CEO:** 12 locks 2026-09-20 · parent `t_ef9d63b1`  
**Live SoT:** post R4 + CR-CalTabs `calendar.tsx` + gear sheets  
**Legend:** Keep · Add · Change · Drop

---

## 1. Per-item matrix

| # | Field | Current | R5 proposed | Verb |
|---|-------|---------|-------------|------|
| 1 | Header title Diary↔Calendar | Effect `usePushedTitle`; `/calendar` missing in `titles.ts` → first-tap lag | Static Calendar (+ Diary) path titles; first paint matches destination (phone+web, tray/seats) | **Change** + **Add** route |
| 2 | Year bold under `<< y >>` | `YearGrid` yearTitle 28pt + toolbar year | Toolbar year only | **Drop** grid title |
| 3 | Month chevron label | Month Name DD, YYYY | Month, Year (no day) | **Change** |
| 4 | Week 3/5/7 windows | 3/5 forward-from-anchor; 7 Sun week | 3 center on today; 5 Mon–Fri; 7 Keep | **Change** / **Keep** 7 |
| 5 | Week range label | Long Month Day, Year – … | M/D/YYYY – M/D/YYYY | **Change** |
| 6 | Gear JUMP | Agenda + Days section | Remove section | **Drop** |
| 7 | Gear presets | All academic / School only / My sports / Reset | Remove row | **Drop** |
| 8 | Clear Filters | `reset` → academic+school+personal selected | None selected (= unfiltered categories); default layers | **Change** |
| 9 | Calendars Done | Closes Settings too | Pop Calendars only; Settings Done closes Settings | **Change** |
| 10 | Gear footer blurb | Day List stays here… | Gone | **Drop** |
| 11 | Day List | Single-day AgendaList + date chevron | Multi-day continuous list; no chevron; headers in list; density A/B | **Change** + **Drop** chevron |
| 12 | Gap header→tabs | Screen pad + contextReserve empty band | Tight 0–4px target; pad not leftover row | **Change** |

---

## 2. Settings sheet IA

| Block | Current | R5 |
|-------|---------|-----|
| Month Compact/List | Live | **Keep** |
| Day Single/List | Live | **Keep** |
| JUMP Agenda/Days | Live | **Drop** |
| Show category chips | Live | **Keep** |
| Preset row | Live | **Drop** |
| Calendars entry | Closes gear | **Change** stack |
| Clear filters | reset multi-select | **Change** none |
| Helper copy | Live | **Drop** |
| Done | Closes gear | **Keep** |

---

## 3. Holds (do not touch in R5)

| Hold | Note |
|------|------|
| CR-CalTabs one-row Y/M/W/D + +·search·gear | Keep |
| R4 L-C Year-first hierarchy | Keep |
| Hats / twins / Hidden data / sports opt-in | Keep |
| LF-A Show chips set (minus presets) | Keep |
| Calendars sheet product | Keep (stack only) |
| Desk ≠ Calendar · Diary ≠ Calendar | Keep |
| No tray CT-A reopen · no §32.2 flip | Keep |

---

## 4. Web vs phone

| Item | Diff |
|------|------|
| 1–12 | **Same laws** both; web card vs phone sheet only for Calendars presentation |
| 12 | Tighten both widths (390 and ≥720) |

---

## 5. Open PM choice only

| Topic | Options |
|-------|---------|
| Day List empty-day density | **A** skip-empty (designer recommend) · **B** empty stubs |

All other items CEO-locked — no competing packs.

---

## 6. CoS / next

1. PM consumes this + `calendar-r5-ux-options.md` → `calendar-r5-pm-lock.md`  
2. QAS intent/stamp on parent `t_ef9d63b1`  
3. Eng dark until dual stamp + Chuck send  
