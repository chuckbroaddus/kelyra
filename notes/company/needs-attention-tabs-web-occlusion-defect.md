# DEFECT disposition + PM restamp — Needs Attention job tabs always visible

**Card (disposition):** `t_1f98012a`  
**Card (restamp):** `t_a9ff6c0a`  
**Date:** 2026-09-17  
**Author:** product-manager  
**Feature stamp base:** NT-A · `notes/company/needs-attention-tabs-spec.md`  
**This restamp SoT:** this file + NT-CHROME-02/05 patch in the base spec  
**IQG tracker (do not parent):** `t_7ebaea27`  
**Noun:** Needs Attention (route `/inbox`; never “Inbox” in Chuck UI)  
**PR hold:** https://github.com/chuckbroaddus/kelyra/pull/115 — **OPEN, do not merge**

---

## DESIGN STAMP (this restamp)

```
DESIGN STAMP
Feature/bug: NT-A Needs Attention job tabs (Needs a name · Review · Waiting to split) must stay ALWAYS FULLY VISIBLE and tappable on Teach web ≥720, web <720, and Teach phone — never covered by the system tray; never opacity-0 / translated off / scroll-hidden with the tray. Supersedes prior “hides with tray (§3.6)” for this row only. PR 115 shared-hide (tray+ContextMenuRow one Animated wrapper) is REJECT.
Quality goals: Occlusion/sliver-under-tray gone; primary Teach hat can always read and tap all three job tabs; tray may still hide on its own physics; filters stay ContextMenuRow on /inbox (not tray keys); Teach tray stays 4 (Desk · Needs Attention · Diary · Kelyra); dual-hat Parent zero desk/tabs; no Capture restore; noun Needs Attention
PM: APPROVED  date: 2026-09-17  profile-session: product-manager / t_a9ff6c0a · notes/company/needs-attention-tabs-web-occlusion-defect.md · base NT-A needs-attention-tabs-spec.md
QA Supervisor: APPROVED  date: 2026-09-17  profile-session: qa-supervisor / t_c71f439a · notes/company/needs-attention-tabs-always-visible-intent.md
Intent gaps remaining: none
```

**Dual stamp:** **MET** (PM `t_a9ff6c0a` + QAS `t_c71f439a` / prior intent `t_b57ebbdf`).  
**PR 115:** Shared-hide shape **REJECT**ed; **rework MERGED** 2026-09-17 as always-visible sibling stack (no shared `trayOpacity`/`trayTranslate` unit) — commit `49049aa0` on `origin/main`. Live Teach `/inbox` still **UNVERIFIED** (this prove-out).

**Designer:** **Not required.** Chuck’s lock is binary (always visible). No option pack. Do not invent competing chrome.

**PM stamp meaning:** Binding AC below + base-spec NT-CHROME-02/05 supersede hide-with-tray for NT-A only. Does **not** self-staff Eng. Does **not** merge/close PR 115.

---

## DISPOSITION (binding — supersedes prior AC-WEB-03.4)

```
SEVERITY: P1  (confirmed — unchanged)
DISPOSITION: FIX-NOW  (unchanged priority; IMPLEMENT LAW CHANGED)
Reason: Stamped NT-A job tab row is occluded / unusable under Teach system tray on web
(primary Teach hat). Prior disposition + PR 115 treated “hides with tray” as keep and
implemented shared-hide — CEO/CoS 2026-09-17 REJECT that intent. Correct law:
tabs ALWAYS fully visible; tray hide must NOT take the job row with it; occlusion still
must be fixed without shared-hide.
Next owner now: QAS dual-stamp (parallel). After dual APPROVED → CoS staffs Engineering
against AC-NTA-VIS-* below (qa-loop). No ui-ux-designer.
Do not parent onto blocked IQG t_7ebaea27.
Do not merge PR 115.
```

### Supersession table

| Prior (wrong for CEO lock) | Now (binding) |
|---|---|
| NT-CHROME-02 / US-NT-01: job row **hides with tray** (§3.6) | Job row **always visible**; §3.6 hide physics does **not** apply to NT-A `/inbox` job tabs |
| AC-WEB-03.4: “still hides with tray… must not leave orphan sticky tabs” | **Struck.** Always-on job row is intentional; tray may hide alone |
| PR 115: stack tray + `ContextMenuRow` in one Animated wrapper (`trayOpacity` / `trayTranslate`) | **REJECT** shared-hide. Occlusion fix must keep tabs fully painted + hit-testable while tray animates on its own |
| Prove-out / testplan NT-16 “hides w/ tray” | Superseded after dual stamp — QAS/QE retarget to always-visible |

---

## Live layout (grounded — do not invent chrome)

| Piece | Live (pre-correct fix) |
|---|---|
| `AppShell` | `showTopBar` → tray **above** body; else tray **inside** body after `ContextMenuRow` |
| `ContextMenuRow` (NT-A tabs) | `position:absolute; top:0; left/right:0; zIndex:12` |
| `FloatingTabTray` float | `position:absolute; zIndex:16` (bottom) |
| `FloatingTabTray` topBar | in-flow top strip when `width >= 720` |
| `layout.showTopBar` | `width >= 720` |
| Teach tray L→R | Desk · Needs Attention · Diary · Kelyra (4; ST-A·TC-A·KL-A) |

CEO/CoS live miss: on web Teach Needs Attention, job tab row was **occluded** by the system tray (only a sliver of the **bottom** of the tabs visible).  
CEO correction: he does **not** want the tab row hidden — not on web, not on mobile.

---

## Implement acceptance criteria (Eng — after dual stamp only)

Named for CoS staffing. Replace prior AC-WEB-* where they conflict. **PR 115 shared-hide does not satisfy these.**

### AC-NTA-VIS-01 — Always fully visible (binding)

1. Teach seat, **web ≥720** (`showTopBar`): on `/inbox`, NT-A job tab row (Needs a name · Review · Waiting to split) is **fully visible** — not covered, clipped, or partially obscured by `FloatingTabTray` top bar or any tray chrome.  
2. Teach seat, **web <720** (bottom float tray): on `/inbox`, NT-A job tab row at top of body is **fully visible**; float tray stays bottom and does not cover tabs.  
3. Teach seat, **phone**: job tabs remain **fully visible** while using the desk; system tray hide-on-scroll / hide physics must **not** opacity-0, translate-off, or otherwise remove the job tab row.  
4. All three tabs remain readable: icon + label on ≥720 (NT-CHROME-03); phone/narrow keeps icon+label scroll (NT-CHROME-04 / OV-A).

### AC-NTA-VIS-02 — Always fully tappable

1. Each job tab (`name` / `review` / `waiting`) receives taps/clicks end-to-end at all times the desk is showing; no tray layer steals presses over tab hit targets.  
2. Selected underline / brand state still updates; filter membership unchanged (NT-MEM-*).  
3. Tabs remain tappable when the **tray is hidden** and when the **tray is visible**.

### AC-NTA-VIS-03 — Independent of tray hide (shared-hide OUT)

1. System tray may still use existing hide-on-scroll / hide physics for **itself**.  
2. NT-A `ContextMenuRow` on `/inbox` must **not** share tray hide animation drivers (`trayOpacity` / `trayTranslate` co-wrapping tray+tabs as one disappearing unit) — **PR 115 approach REJECT**.  
3. Hiding the tray must **not** hide, fade, or translate away the job tabs.  
4. Showing the tray must **not** re-cover or re-occlude the job tabs (regression of the sliver bug).  
5. Other screens’ context rows (if any) are out of scope unless they share the broken stack — do not freestyle global chrome.

### AC-NTA-VIS-04 — Placement + tray law

1. Job row stays `ContextMenuRow` on `/inbox` only (NT-CHROME-02 placement home).  
2. Do **not** move job filters into tray keys or ClassTabs.  
3. Teach system tray remains **exactly 4** slots L→R: **Desk · Needs Attention · Diary · Kelyra**.  
4. **No fifth tray key.** Do **not** restore Capture in the tray.  
5. Noun remains **Needs Attention**; route may stay `/inbox`; no Chuck-facing “Inbox.”

### AC-NTA-VIS-05 — Hats

1. **Teach web:** fixed (primary) — VIS-01/02/03.  
2. **Teach phone:** same always-visible law; float tray still 4 slots; no new occlusion.  
3. **Dual-hat Parent seat:** **zero** Needs desk, **zero** job tabs, **zero** Teach badge from this chrome (NT-SEAT-02). Parent must not gain desk.  
4. Student / Office / Super: no discovery of Teach job tabs.

### AC-NTA-VIS-06 — Non-goals

- No new tab labels, icons, membership, DF-A, or count rules (NT-A pack stays).  
- No designer option pack; no noun change.  
- No SQL / Edge / matcher / Approve path changes.  
- Do not reopen Class-tray or Settings/Diary locks.  
- Do **not** “fix” by merging PR 115 as-is.  
- Do not change ClassTabs collapse physics (desk panes) under this card — only NT-A `/inbox` job row vs Teach tray.

### AC-NTA-VIS-07 — Verify

1. Teach web ≥720 and <720 on `/inbox` — tabs fully visible + tappable with tray shown **and** tray hidden (if hide applies).  
2. Teach phone smoke: tabs stay fully visible/tappable; tray 4 slots; scroll does not steal the job row.  
3. Dual-hat Parent seat: no job tabs / no Needs desk chrome.  
4. Chuck-facing copy never says “Inbox” for this desk.  
5. Explicit regression: no shared Animated wrapper that zeros opacity / translates both tray and job tabs together.

---

## Base-spec patch pointer

Binding law IDs in `notes/company/needs-attention-tabs-spec.md`:

- **NT-CHROME-02** — restated: placement home + **always visible** (no hide-with-tray).  
- **NT-CHROME-05** — new: never tray-occluded; never co-animated off with tray; web≥720 / <720 / phone.  
- US-NT-01 AC line “hides with tray” → always visible.  
- US-NT-11 (or equivalent) stories for visibility restamp.

QAS must restamp intent NT-16 / §3.6 hide language for this row only after reviewing this note.

---

## CoS next

1. **QAS** dual-stamp child of `t_a9ff6c0a` (parallel — already expected). Intent note may patch `needs-attention-tabs-intent.md` NT-16 or land a short restamp intent.  
2. **Hold PR 115** — no devops-release, no merge.  
3. After dual APPROVED → staff **Engineering** (qa-loop) with **AC-NTA-VIS-01..07**; close or replace PR 115 branch work to match always-visible (not shared-hide).  
4. After implement terminal → QAS prove-out / QE retarget NT-PO-16 away from “hides w/ tray.”  
5. **Do not** staff `ui-ux-designer` unless Eng proves layout impossible without a pack (then CoS→PM — do not freestyle). Designer may later fold ui-design §3.6 carve-out after dual stamp (not Eng blocker if AC is clear).  
6. Do **not** parent onto `t_7ebaea27`.

---

*End PM restamp t_a9ff6c0a — PM DESIGN STAMP APPROVED 2026-09-17. Dual stamp NOT MET. PR 115 HOLD/REJECT shared-hide. No app code. No Eng on this card.*
