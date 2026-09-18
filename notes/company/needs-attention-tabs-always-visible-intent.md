# NEEDS — NT-A job tabs always visible (never hide) — IQG real-world intent

**Date:** 2026-09-17  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_b57ebbdf` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**IQG parent tracker (do not parent-link workers):** `t_7ebaea27`  
**CEO correction:** 2026-09-17 — Needs Attention NT-A job tabs must **never hide** (web or phone) and must **not** be occluded by the system tray.  
**Defect (prior):** `t_1f98012a` · `notes/company/needs-attention-tabs-web-occlusion-defect.md` (P1 FIX-NOW)  
**Eng in flight (HOLD):** PR 115 · `t_4e07ba6e` — in-flow stack + **shared hide** with tray (`trayOpacity` / `trayTranslate`)  
**Supersedes parked QAS:** `t_34c84cbe` OBJECTIVE written against old AC (including hide-with-tray)  
**Surviving product SoT:** NT-A pack (`needs-attention-tabs-spec.md` membership/icons/counts/default); tray 4 slots Desk · Needs Attention · Diary · Kelyra; no Capture; Parent zero; noun **Needs Attention**  
**Status:** Design-stage IQG intent + **QA Supervisor DESIGN STAMP: APPROVED** against CEO always-visible lock. **Not** Eng. **Not** merge. **No** app code, git, SQL. Dual stamp for Eng **not met** until PM restamps defect AC / chrome law that still says “hides with tray.”

**Role:** Own real-world intent for CEO correction of the web occlusion bug **and** the PR 115 misread. Do **not** invent chrome packs. Do **not** freeze the system tray. Do **not** move job filters into tray keys.

---

## CEO lock (binding — 2026-09-17)

| # | Lock |
|---|---|
| C1 | Original bug = tray **covering** the NT-A tab row on web (only a sliver of the bottom visible / untappable). |
| C2 | Teacher does **not** want the tab row **hidden** on web **or** mobile. |
| C3 | NT-A job tabs (**Needs a name · Review · Waiting to split**) stay **fully visible and tappable** for the entire visit on Needs Attention (`/inbox`), **including while the desk list scrolls**. |
| C4 | Tabs must **not** be occluded, clipped, or hit-test blocked by `FloatingTabTray` (top bar ≥720 **or** bottom float). |
| C5 | **Hold PR 115 shared-hide** — coupling tab visibility to tray hide (`trayOpacity` / `trayTranslate` shared fade/slide) misread “hid **by** the tray” as “hide **with** tray.” Do not merge that behavior as the fix. |
| C6 | System tray may keep its own scroll-hide / chrome collapse behavior — **do not freeze the tray itself** as a non-goal violation. Job tabs simply **do not join** that hide. |
| C7 | Do **not** move Name/Review/Waiting filters into tray keys or ClassTabs. Tray stays **4** Teach slots; **no** Capture restore. |

**One-line law:** On Teach Needs Attention, the job tab row is **always on** for the session on that desk; the tray must not cover it and the product must not deliberately hide it with the tray.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: NEEDS — NT-A job tabs never hide (web+phone); never occluded by system tray; hold PR 115 shared-hide; supersede hide-with-tray AC
Quality goals: Full visible+tappable Name·Review·Waiting entire /inbox visit incl. scroll; tray 4 slots unchanged; no Capture; filters stay ContextMenuRow; dual-hat Parent zero; no freeze-tray; no filter-into-tray; CEO C1–C7 binding
PM: UNSTAMPED  date: —  profile-session: must restamp defect AC + NT-CHROME-02 / US-NT-01.5 / NT-16 “hides with tray” → always-visible (see §8 gaps)
QA Supervisor: APPROVED  date: 2026-09-17  profile-session: t_b57ebbdf / qa-supervisor · notes/company/needs-attention-tabs-always-visible-intent.md
Intent gaps remaining: none on CEO always-visible real-world intent. Dual stamp blocked on PM restamp of conflicting hide-with-tray language in defect AC + NT-A chrome law before Eng rework / merge.
```

**QA Supervisor stamp meaning:** Real-world intent for **always-visible NT-A job tabs** is fully specified (hats, entry, lifecycle including scroll, reverse, non-goals). This **supersedes** prior QAS/PM/prove-out lines that required the job row to “hide with tray” (§3.6 coupling). Does **not** authorize Engineering or PR merge. Eng stays dark / PR 115 held until **PM restamp** of defect AC + chrome law + this QAS APPROVED (dual on the **correction**).

**Parked work:** `t_34c84cbe` prove-out OBJECTIVE against old AC (incl. hide-with-tray) is **superseded** by this intent. Do not execute that OBJECTIVE as-written.

---

## 0. What this corrects vs what stays

| Layer | Prior (wrong for this bug) | Now (CEO lock) |
|---|---|---|
| Occlusion | Tabs under tray / only sliver visible | Tabs fully visible; tray never covers tab hit targets |
| Hide coupling | “Hides with tray” (§3.6 / NT-16 / AC-WEB-03.4 / PR 115 shared opacity/translate) | Tabs **never hide** while on `/inbox` (web or phone), including scroll |
| Tray behavior | Shared hide with tabs | Tray may still scroll-hide **itself**; tabs do **not** follow |
| Placement | `ContextMenuRow` under header on `/inbox` only | **Keep** placement home; layout/stacking must satisfy always-visible + no occlusion |
| Membership / pack | NT-A · IC-A · CT-A · DF-A · OV-A | **Unchanged** |
| Tray inventory | 4 slots; no Capture | **Unchanged** |

---

## 1. Hats

| Hat | Always-visible job tabs | Notes |
|---|---|---|
| **Teacher (Teach seat)** | **Yes** — primary | C1–C7 on web ≥720, web &lt;720, phone |
| **Teacher + parent dual-hat (Teach seat)** | **Yes** | Same as teacher |
| **Teacher + parent dual-hat (Parent seat)** | **No** | Zero Needs desk / tabs / Teach badge (NT-SEAT-02 survives) |
| **Parent (non-teacher)** | **No** | |
| **Student / Office / Super** | **No** | No discovery |
| **Substitute / co-teacher** | **Yes** on own Teach seat | Same chrome; RLS-scoped queues |
| **Signed-out / foreign school** | **No** | |

**Dual-hat acceptance:** Seat switch Teach → Parent must not leave Parent with sticky Teach job tabs. Parent → Teach restores always-visible tabs on `/inbox` with no illegal Parent flash of Teach chrome.

---

## 2. Entry (chrome)

| Affordance | Where | Job |
|---|---|---|
| Enter Needs Attention | Teach tray **Needs Attention** (4th-slot inventory: Desk · Needs Attention · Diary · Kelyra) | Open `/inbox` desk |
| Job tab row | `ContextMenuRow` under header on `/inbox` only | Switch job family Name · Review · Waiting |
| Stay on desk | Same route while scrolling list / opening rows | Tabs remain painted + tappable (C3) |

**Not entry / not this fix:** Moving filters into tray keys; fifth tray Capture; ClassTabs; Parent tray Needs; freezing tray so it never collapses.

**Entry acceptance:**
1. Teach opens Needs → three job tabs fully visible under header (not under tray paint).  
2. Web top-tray mode (≥720) and bottom-float mode (&lt;720 / phone) both satisfy no occlusion.  
3. Parent seat cannot discover the row.

---

## 3. Full lifecycle

### 3.1 Start — enter desk

```
Teach seat → tray Needs Attention
  → /inbox
  → NT-A tab row fully visible + tappable (not under tray; not pre-hidden)
  → DF-A default tab + membership list (unchanged pack)
```

### 3.2 Change — scroll / work on desk (CEO core)

```
Teacher on /inbox with tab row painted
  → scrolls the Needs list (long queue)
  → system tray may animate hide/collapse per existing chrome
  → NT-A job tabs REMAIN fully visible and tappable (do not fade/slide away with tray)
  → taps Name | Review | Waiting still work end-to-end
```

**Must:** C3 + C4 for entire on-desk session. Scroll hide of **tabs** is a **defect** vs this stamp.

### 3.3 Change — switch tabs / open rows

Unchanged from NT-A: tab switch does not mutate rows; membership NT-MEM-*; open row → name/review/split paths per surviving laws.

### 3.4 Finish — leave desk

```
Navigate away from /inbox (other tray key, deep link, sign-out)
  → job tab row leaves with the desk (not a global sticky orphan on Desk/Diary/Kelyra)
  → Parent seat switch: zero residual tabs
```

**Must:** Always-visible applies **while on Needs Attention**, not as a permanent second tray across the app.

### 3.5 Reverse / cancel

| Action | Intent |
|---|---|
| Scroll reverse (tray may reappear) | Tabs were never gone; no “restore tabs” animation required beyond layout stability |
| Tab switch | No data loss; no Approve/dismiss |
| Leave `/inbox` | Tabs unmount with desk — correct; not “hide with tray” while still on desk |
| Back from Split (SC-A) | Return to Waiting membership; tabs still always-visible on desk |
| PR 115 shared-hide path | **Rejected** as solution shape (C5) |

**Multiplicity:** N/A beyond surviving NT-A (three tabs always present; multi-class Waiting teacher-wide). No new multiplicity surface in this correction.

**Reverse (product cancel of always-visible):** N/A — CEO lock is permanent for this chrome until a later CEO/PM restamp. No user “dismiss tab row” control in scope.

---

## 4. Must-include behaviors (acceptance seed)

| ID | Behavior | Sev if miss |
|---|---|---|
| AV-01 | Teach web ≥720 `/inbox`: NT-A tabs fully visible below header; **not** covered/clipped by top `FloatingTabTray`. | P1 |
| AV-02 | Teach web &lt;720 `/inbox`: NT-A tabs at body top fully visible; bottom float tray does not cover tabs. | P1 |
| AV-03 | Teach phone `/inbox`: same as AV-02 spirit — tabs visible+tappable; float tray bottom; no shared hide of tabs. | P1 |
| AV-04 | While scrolling the Needs list on `/inbox`, job tabs **remain** fully visible and tappable (do **not** share tray hide opacity/translate). | P1 |
| AV-05 | Each tab (`name` / `review` / `waiting`) receives taps end-to-end; tray layer never steals presses over tab hits. | P1 |
| AV-06 | Leave `/inbox` → tab row does not orphan on other Teach routes as a sticky second tray. | P2 |
| AV-07 | Teach tray remains exactly **4** slots L→R: Desk · Needs Attention · Diary · Kelyra; **no** Capture; **no** fifth key. | P1 |
| AV-08 | Job filters stay on `ContextMenuRow` `/inbox` only — **not** moved into tray or ClassTabs. | P1 |
| AV-09 | Dual-hat Parent seat: zero Needs desk / job tabs / Teach badge from this chrome. | P1 |
| AV-10 | NT-A pack unchanged: three tabs, IC-A icons, CT-A counts, DF-A default, OV-A scroll, membership NT-MEM-*, noun Needs Attention. | P1 (reg) |
| AV-11 | PR 115 **shared-hide** (`trayOpacity`/`trayTranslate` driving tab hide) is **not** the shipped fix. Hold / rework. | P1 |
| AV-12 | System tray is **not** required to stay permanently expanded (non-goal: freeze tray). | — (non-goal) |

---

## 5. Explicit non-goals

1. **Freeze the system tray** — tray may still scroll-hide / collapse itself.  
2. **Move job filters into tray keys** or ClassTabs.  
3. Restore **Capture** as a fifth tray slot.  
4. Reopen NT-A membership, icons, DF-A, CT-A, Waiting≠unnamed, matcher, Approve.  
5. Rename Needs Attention → Inbox.  
6. Parent / Student / Office Needs desk.  
7. Class-tray drop / Settings-Diary IQG merges.  
8. New IconName / `npm run icons` on this card.  
9. App code / SQL / git / merge from **this** QAS card.  
10. Executing superseded prove-out `t_34c84cbe` against hide-with-tray AC.  
11. Designer option pack — layout fix inside stamped chrome home unless Eng proves placement impossible (then CoS→PM restamp; no freestyle).

---

## 6. PR 115 disposition (intent-level — CoS/Eng consume)

| Claim in PR 115 | Verdict vs CEO lock |
|---|---|
| In-flow stack so tabs are not under a static top tray | **Directionally OK** for occlusion (AV-01) — keep exploring layout that paints tabs in readable space |
| `contextReserve` 0 when `showTopBar` to avoid double-pad | Layout detail — OK if always-visible holds |
| **Shared hide** tabs with tray via `trayOpacity` / `trayTranslate` | **REJECT shape** (C5, AV-04, AV-11) — this is the misread |
| Phone / float path “unchanged” | Must still satisfy AV-03/AV-04 (never hide tabs on phone either) |

**CoS:** Hold merge of PR 115 until Eng implements against **this** intent + PM-restamped AC (no shared-hide). Do not parent workers onto `t_7ebaea27`.

---

## 7. Survive laws (unchanged)

1. Teach seat only for desk + tabs.  
2. Noun **Needs Attention** Chuck-facing.  
3. Waiting ≠ post-Confirm unnamed as one job meaning.  
4. Matcher never inserts; nothing is grade until Approve.  
5. Tray badge NB-A / `countNeedsAttention` SoT; Parent zero.  
6. Zero-count **job** tabs stay visible (NT-DEF-02) — orthogonal to tray-hide; both “don’t disappear empty tabs” and “don’t hide row with tray.”  
7. Placement home remains ContextMenuRow on `/inbox` (not a new surface).

---

## 8. Gaps checklist (QAS) + PM restamp required

| # | Question | Verdict |
|---|---|---|
| G1 | Hats (Teach always-visible; Parent zero)? | **Covered** |
| G2 | Entry tray + ContextMenuRow home? | **Covered** |
| G3 | Lifecycle enter → **scroll while tabs stay** → leave desk? | **Covered** (CEO core) |
| G4 | Multiplicity new surface? | **N/A** (NT-A survives) |
| G5 | Reverse / leave desk / no orphan sticky? | **Covered** |
| G6 | Non-goals freeze-tray + no filter-into-tray? | **Covered** |
| G7 | PR 115 shared-hide rejected? | **Covered** (C5) |
| G8 | Chrome invented by QAS? | **No** |
| G9 | Eng authorized from this card? | **No** |
| G10 | Prior hide-with-tray AC still in defect/spec? | **PM gap** — blocks dual stamp |

### Intent gaps remaining (to PM — block Eng dual stamp)

1. **Restamp** `needs-attention-tabs-web-occlusion-defect.md` **AC-WEB-03.4** — delete “still hides with tray chrome per existing §3.6 / scroll-hide”; replace with always-visible while on `/inbox` (AV-01..05) + leave-desk unmount (AV-06).  
2. **Restamp** NT-A chrome law lines that say job row “hides with tray”: `needs-attention-tabs-spec.md` NT-CHROME-02, pack feel §0, US-NT-01 AC5; align with CEO C2–C4.  
3. **Amend** original intent NT-16 / prove-out NT-PO-16 / release language that required hide-with-tray — point to this file as superseding chrome-hide coupling only (membership stamp otherwise stands).  
4. **Hold** PR 115 merge until Eng matches restamped AC (no shared-hide).  
5. Parked QAS `t_34c84cbe` — mark superseded; do not run old OBJECTIVE.

**QAS real-world intent gaps: none.** Open work is **PM restamp** of conflicting AC/spec strings, then Eng rework under dual correction stamp.

---

## 9. DITL IMPACT

```
DITL IMPACT
Change: Teach Needs Attention (/inbox) NT-A job tabs (Name·Review·Waiting) stay always visible and tappable for the whole desk visit including scroll; must not be occluded by system tray; must not share tray hide animation; tray inventory unchanged (4 slots); dual-hat Parent still zero desk/tabs
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01 (Needs desk chrome — tab row remains visible while triaging/scrolling; not “hides with tray”); DITL-T-02 (web Needs → Review/Approve — tab row usable entire beat); DITL-T-03 (Needs triage — scroll + switch tabs without losing tab row); DITL-DH-01 (Parent zero unchanged; Teach always-visible only on Teach seat)
Cases touched: none at design (ditl-scribe plan wording only; case polish after implement if beats mention hide-with-tray)
New DITL needed: no
Seed/artifacts: none
Notes: User-visible Teach chrome behavior change vs prior stamped “hides with tray.” NOT NONE. Do not describe shared tray+tabs hide as desired. Tray may still self-hide — plans should not require freezing tray. Class-tray / Settings-Diary out of scope. CoS staffs ditl-scribe AFTER PM restamp + dual correction stamp path is clear; cheap draft only. No DITL EXEC from this card.
```

---

## 10. Acceptance evidence (this card)

- [x] Intent file `notes/company/needs-attention-tabs-always-visible-intent.md`  
- [x] Hats + dual-hat Parent zero  
- [x] Entry: tray Needs + ContextMenuRow `/inbox`  
- [x] Lifecycle: tabs remain on desk **including scroll**; leave desk unmounts row  
- [x] Multiplicity N/A; reverse/leave covered  
- [x] Non-goals: no freeze tray; no filters into tray; no Capture  
- [x] PR 115 shared-hide hold / reject shape  
- [x] Must-include AV-01..12  
- [x] Gaps to PM listed (hide-with-tray AC/spec restamp)  
- [x] DESIGN STAMP QA Supervisor **APPROVED**  
- [x] DITL IMPACT **UPDATE_PLANS**  
- [ ] PM restamp defect AC + NT chrome “hides with tray” (blocks dual stamp)  
- [ ] Eng / PR 115 rework+merge (forbidden until dual correction stamp)  
- [ ] Prove-out OBJECTIVE rewrite after implement (supersedes `t_34c84cbe`)

---

## 11. Recommended next action

1. **CoS** records QAS APPROVED on this card; **holds PR 115** merge (shared-hide).  
2. **CoS** staffs **product-manager** to restamp defect AC + NT-A chrome hide-with-tray lines → always-visible (cite this intent).  
3. After PM APPROVED on correction → **dual stamp MET** for Eng rework child of `t_1f98012a` (not parented to `t_7ebaea27`).  
4. **CoS** files `DITL-UPDATE:` → `ditl-scribe` from §9 (no Chuck gate).  
5. After implement terminal → **QAS** writes new prove-out OBJECTIVE (AV-* + live UI); CoS staffs `qa-engineer`. Do **not** run superseded `t_34c84cbe`.  
6. **No app code / no git / no merge from this card.**

---

*End intent — t_b57ebbdf QA Supervisor APPROVED 2026-09-17. CEO always-visible lock C1–C7. Hold PR 115 shared-hide. Supersedes hide-with-tray AC + parked t_34c84cbe OBJECTIVE. Dual stamp pending PM restamp. DITL IMPACT UPDATE_PLANS. No Eng. No merge.*
