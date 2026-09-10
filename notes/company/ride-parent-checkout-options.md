# RIDE-CO-D1 — Parent leave-line chrome option pack

**Date:** 2026-09-09  
**Author:** ui-ux-designer (Kelyra)  
**Card:** `t_924ddb5b` · Epic `t_bc63db16` · PM SoT: `notes/company/ride-parent-checkout-pm.md`  
**Status:** Options only — **PM chooses**. Do **not** patch `docs/ui-design.md` on this card. No app code / SQL / Edge / qa-loop / git.

---

## 0. Job of this chrome

| Surface | Job | Not |
|---|---|---|
| **Parent leave-line** on `/parent/ride` | While a live waiting trip exists, let the signed-in **parent seat** end **this line** for **this trip’s children** (`queue_events.kind = left`). Lightweight confirm. Then return to check-in-ready empty / staggered B. | Staff curb `released`; pickup; grade; neighbor data; household leave-all; partial leave; undo |

**Stories cited:** US-CO-01 … US-CO-10 (PM §8). **Law:** PM §1–7, §9 declines. **Chrome:** `docs/ui-design.md` §13.13b / §34.2; tray **Home · Ride · Ask**; IconName **`ride` LOCKED**.

---

## 1. Shared locks (all options)

### 1.1 Product (do not reopen)

| Lock | Value |
|---|---|
| Event kind | Parent writes **`left` only**. Never mint `released`. |
| Scope | **This `line_id` + this trip’s `student_ids` only.** No partial leave v1. |
| Confirm | **Lightweight yes** — sheet/dialog. **No** one-tap. **No** type-to-confirm. **No** hold-3s. |
| Undo | **None.** Re-check-in (photo ahead / I’m first) rebuilds order. |
| After leave | May check into another line. I’m first / empty **unchanged**. |
| Seat | **Parent-seat Ride only.** Dual-hat: parent tray only. Office Ride = Manage altitude; **no** office tray Ride tab. |
| Visibility | Own XX only while waiting; **no** totals; **no** neighbor plates. Twins never mixed across trips. |
| Icon | **`ride` LOCKED.** Prefer **no** new glyphs. |
| Noun | Prefer **Leave line** / **I’m not waiting**. **Avoid** Checkout / Released / Picked up. |

### 1.2 Primitives (prefer existing)

| Primitive | Use |
|---|---|
| `Card` + `Chip` / `ChipRow` | Line + children (already on Ride) |
| `PrimaryButton` / `GhostButton` / optional `SecondaryButton` | CTAs — **not** staff curb chrome |
| `ListRow` | Optional trip summary row (Option C) |
| Confirm pattern | Same **shape** as `ConfirmSheet` (§20.1): phone bottom sheet / web centered ≤400; scrim; title; body; primary confirm; Ghost **Cancel** |
| Tokens | `ink` / `mute` / `elevated` / `line` / `brand` / `danger` sparingly |

**Engineering note (not a design reopen):** today’s `ConfirmSheet` short-circuits for `chrome.role === 'parent'` and appends **This cannot be undone.** for delete law. Leave is **not** a grade/delete. Build must either (a) unlock a **simple parent-safe** confirm mode on the same component (no type-name; **no** forced delete coda; **not** teacher-only), or (b) ship a thin sibling that **visually matches** ConfirmSheet. Options below assume (a) or (b) without a new visual language.

### 1.3 Seats / motion / a11y (default for all)

| Dimension | Default |
|---|---|
| **Seats** | Parent seat only. Hide leave chrome on student / teacher / office / duty. Dual-hat: only when seat = parent and route family is `/parent/ride` (vehicles: see per-option). |
| **Motion** | **No theatrical morph.** Sheet: standard overlay enter/exit (≈180–260 ms ease, existing ScreenOverlay physics). Status card swap waiting → not-waiting is **instant content replace**, not a morph of XX into empty. No confetti, no slide-away plate animation. |
| **a11y** | Min **44×44** hits. One-handed: primary leave control in lower half when waiting. Confirm: **Cancel** and confirm **spatially separated** (Cancel below or opposite edge — never adjacent same-weight pills). `accessibilityLabel` states line name + child first names on confirm. VoiceOver order: trip status → leave → sheet title → body → confirm → cancel. Sun/glare: body ≥ `type.body`; avoid mute-on-wash for the confirm title. |

### 1.4 Shared non-goals

- Staff curb redesign; parent button that means picked-up  
- Office tray Ride tab; duty-list chrome bleed into parent Ride  
- New IconName / reopen RearPlate  
- GPS / map leave; one-tap leave; timed undo; partial leave  
- Reason codes on fail; totals; neighbor plates  
- Ask tool; gradebook row  
- Patching `docs/ui-design.md` before PM pick  
- Implementing `src/` on this card  

### 1.5 Before (shipped today)

`/parent/ride` vertical stack (`src/app/parent/ride.tsx`):

1. Title + lead (check-in instructions)  
2. Line chips  
3. Children this stop chips  
4. Ahead plate field + **Photo car ahead** (Primary) + **I'm first** (Ghost)  
5. Status string card (check-in result)  
6. If `trip.status === 'in_line'`: **You are {XX} vehicle in line** card  
7. Ghost **Manage vehicles**

**Gap:** No leave CTA while waiting (CEO override of L-08). Check-in controls stay fully available while already in line — hierarchy does not flip to “you are waiting.”

---

## 2. Option A — Trip card owns Leave (status-first)

**Stance:** Waiting is a **first-class trip card**. Leave is a **secondary** control on that card. Check-in tools **recede** (disabled or collapsed) while waiting so the parent is not invited to double-join the same line.

### 2.1 Job of the screen / chrome

- **Primary read while waiting:** own XX + this trip’s children + this line name.  
- **Primary action while waiting:** understand place in line (XX).  
- **Secondary action:** Leave line (opens confirm).  
- **Not waiting:** today’s check-in stack is primary (unchanged hierarchy).

### 2.2 Before → After (IA)

```
BEFORE (waiting)                    AFTER A (waiting)
─────────────────                   ─────────────────
Lead (always check-in)              Short lead: “You’re in this line.”
Line chips                          Line chips (selected locked to trip line*)
Children chips (pick)               Trip children (read-only chips / names)
Plate + Photo + I'm first           [collapsed or disabled check-in block]
Status string                       —
XX card                             TRIP CARD
                                      Line · {name}
                                      You are {XX}
                                      {Child}, {Child}
                                      [ Leave line ]   ← Ghost or Secondary
Manage vehicles                     Manage vehicles
```

\*Selecting another line chip while waiting on A shows **that** line’s empty/check-in frame for staggered B **without** implying the A trip moved — trip card for A stays until leave, or line switch only changes the check-in target below. **Recommendation within A:** keep trip card pinned for the live trip line; switching line chips scrolls/focuses check-in for B under a hairline “Another line” — do not hide Leave for A.

### 2.3 Placement

| Control | Where |
|---|---|
| Leave CTA | **Inside trip `Card`**, full-width Ghost (or Secondary) under XX + child names |
| Confirm | Bottom `ConfirmSheet`-shape |
| Success | Replace trip card with short inline status card; restore check-in stack |
| Vehicles | Leave **Ride hub only** (`/parent/ride`). `/parent/vehicles…` shows no Leave (avoids duty-like chrome on garage list) |

### 2.4 Copy (chrome)

| State | Copy |
|---|---|
| Trip card title | `{Line name}` or `In line` |
| XX | `You are {XX}` — **no** “of N” |
| Children | First names only, comma-separated or chips read-only |
| Leave CTA | **Leave line** |
| Confirm title | `Leave {line name}?` |
| Confirm body | `You’ll stop waiting on this line for {Child1}{, Child2}. You can check in again later. This is not pickup.` |
| Confirm primary | **Leave line** |
| Confirm cancel | **Cancel** |
| Success | `You’re out of {line name}.` |
| Fail | Generic fail (same posture as check-in fail) — **no reason** |
| Not waiting | No Leave control |

### 2.5 Confirm sheet

```
Leave Front curb?                         (rowTitle / ink)
You’ll stop waiting on this line for
Saydee. You can check in again later.
This is not pickup.                       (body / mute)
[ Leave line ]                            PrimaryButton (brand) — NOT Danger
[ Cancel ]                                GhostButton
```

- **No** type-name. **No** “This cannot be undone.” (re-check-in is the recovery; delete coda mis-frames leave as record destruction).  
- Cancel **below** primary (ConfirmSheet order today) — large vertical gap; both ≥44 tall.

### 2.6 Waiting hierarchy (primary vs shutter)

| Priority | Element |
|---|---|
| 1 | Trip card: XX |
| 2 | Trip children |
| 3 | Leave line (secondary) |
| 4 | Check-in for **other** line / post-leave |
| Dim | Photo / I’m first on **same** line while waiting (disabled + mute helper: `Leave this line before checking in here again.`) |

### 2.7 Seats / motion / a11y

| | |
|---|---|
| Seats | Parent `/parent/ride` only; dual-hat parent seat; no vehicles Leave |
| Motion | Sheet standard; trip card content swap; **no** XX morph |
| a11y | Trip card is a single accessibility group; Leave labeled `Leave {line}, {children}` |

### 2.8 Explicit non-goals (A)

- Sticky footer competing with tray  
- Danger red Leave (looks like staff release / delete)  
- Header overflow Leave  
- Showing school queue depth  

### 2.9 Pros / cons

| Strong | Weak |
|---|---|
| Clearest “I am waiting” object; Leave co-located with XX + kids (US-CO-01, US-CO-03) | Check-in collapse needs careful empty-state after leave (US-CO-04 staggered) |
| Hard to confuse with curb checkout list | Leave slightly less thumb-reachable than sticky footer if card is mid-scroll |
| Matches Card grammar already on Ride | Requires disabling same-line re-check-in messaging |

### 2.10 Mockup

Desktop-preview HTML: `notes/company/ride-parent-checkout-options.html` — tab **A**.

---

## 3. Option B — Sticky Leave footer (action-first, car thumb)

**Stance:** While waiting, **Leave line** is a **persistent footer** above the floating tray (content pads bottom). Trip status stays a quiet card. Check-in stack remains visible but **secondary** (not disabled) so staggered line B is one scroll away — Leave is always the escape hatch under the thumb.

### 3.1 Job of the screen / chrome

- **Primary action while waiting:** Leave line (confirm) — one-handed at curb.  
- **Primary read:** still own XX (card near top).  
- **Secondary:** photo / I’m first for another stop after leave or for empty re-entry.

### 3.2 Before → After (IA)

```
AFTER B (waiting)
─────────────────
Lead (short)
Line chips
Children chips (still editable for *next* check-in intent — trip scope on leave remains server trip ids)
Plate + Photo + I'm first
XX status card (compact)
Manage vehicles
…… scroll ……
┌─────────────────────────┐
│  [ Leave line ]         │  ← fixed above tray, Secondary or Ghost fill elevated
└─────────────────────────┘
[ Home · Ride · Ask tray ]
```

**Trip children on confirm** still come from **server trip**, not from whatever chips are currently toggled (US-CO-03). UI must not imply chip toggles edit the live trip mid-wait (v1 no partial). **Helper under children while waiting:** `Leaving drops {trip names} from this line — chip picks are for your next check-in.`

### 3.3 Placement

| Control | Where |
|---|---|
| Leave CTA | **Sticky footer** full-width above tray safe area; only when `waiting` |
| Confirm | Bottom sheet (lifts above footer; footer hides while sheet open) |
| Success | Toast-or-inline: dismiss footer immediately; short status under XX area |
| Vehicles | Optional quiet **Leave** only if vehicles route shows live trip banner — **default in B: Ride hub + optional thin banner on vehicles with link “Open Ride to leave”** (no second confirm surface) |

### 3.4 Copy

| State | Copy |
|---|---|
| Footer CTA | **Leave line** |
| XX card | `You are {XX}` + line name meta |
| Confirm title | `Leave this line?` |
| Confirm body | `{Line name} · {Child1}, {Child2}. You’ll stop waiting. Not pickup — staff still confirms handoff.` |
| Confirm primary | **Leave line** |
| Success | `Out of line.` (no XX, no total) |
| Helper chips | as §3.2 |

### 3.5 Confirm sheet

```
Leave this line?
Front curb · Saydee, Sydnee
You’ll stop waiting. Not pickup — staff still confirms handoff.
[ Leave line ]     Primary
[ Keep waiting ]   Ghost   ← cancel noun clearer than Cancel under stress
```

Cancel far from primary (below). Optional rename Cancel → **Keep waiting** (still Ghost).

### 3.6 Waiting hierarchy

| Priority | Element |
|---|---|
| 1 | Sticky Leave (action) |
| 2 | XX card (read) |
| 3 | Check-in tools (next stop) |
| Note | Risk: two strong CTAs (Photo primary + Leave sticky). Mitigate: Photo stays Primary only when **not** waiting; when waiting, Photo becomes Secondary/Ghost and Leave is the only brand-weight control in the footer |

### 3.7 Seats / motion / a11y

| | |
|---|---|
| Seats | Parent seat; footer only on `/parent/ride` waiting |
| Motion | Footer **appear/disappear** 180 ms opacity/translateY — **not** a morph of the trip card. Sheet standard. |
| a11y | Footer `accessibilityRole=button`; does not steal tray focus; sheet traps focus until dismiss |

### 3.8 Explicit non-goals (B)

- Floating Leave FAB overlapping tray icons  
- Footer on office/duty  
- One-tap footer without sheet  

### 3.9 Pros / cons

| Strong | Weak |
|---|---|
| Best one-handed curb reach (PM designer Q10) | Competes with tray; needs padding math |
| Always visible while waiting (US-CO-01) | Chip vs trip-scope confusion if children chips stay editable (must copy hard) |
| Fast staggered: leave → still on same screen for B check-in (US-CO-04) | Feels slightly more “app chrome” than paper-note parent tone |

### 3.10 Mockup

HTML tab **B**.

---

## 4. Option C — Quiet ListRow trip + overflow Leave (chrome-minimal)

**Stance:** Waiting is a single **Amazon/Facebook-style `ListRow`**: leading none or small status, title = line name, status = `You are {XX}`, meta = child first names. Leave is a **trailing ghost text button** on the row (or row tap opens a tiny action sheet with only Leave). Check-in stack stays fully primary above — Leave is discoverable but not loud.

### 4.1 Job of the screen / chrome

- **Primary job of screen remains check-in** even while waiting.  
- Leave is an **escape** for wrong line / staggered / leaving early — not the hero.  
- Matches parent “note home” calm; least like a duty checkout tool.

### 4.2 Before → After (IA)

```
AFTER C (waiting)
─────────────────
Lead + Line + Children + Photo + I'm first   (unchanged weight)
ListRow
  title: {Line name}
  status: You are {XX}
  meta: {Child1}, {Child2}
  trailing: Leave          ← Ghost text, mute or ink
Manage vehicles
```

Row does **not** navigate. Trailing Leave opens confirm. **No** swipe-to-leave (parent roles never get delete swipe — §10.8; leave is not swipe).

### 4.3 Placement

| Control | Where |
|---|---|
| Leave | Trailing control on trip `ListRow` **or** Ghost under the row full-width if trailing hit < 44 |
| Confirm | Centered dialog on web; bottom sheet on phone — same ConfirmSheet shape |
| Success | Row disappears; optional one-line status in existing status `Card` |
| Vehicles | **Ride hub only** |

### 4.4 Copy

| State | Copy |
|---|---|
| Row status | `You are {XX}` |
| Trailing | **Leave** (short) or **I’m not waiting** |
| Confirm title | `Stop waiting on {line}?` |
| Confirm body | `For {children} on this trip only. You can join a line again anytime. Not staff pickup.` |
| Confirm primary | **I’m not waiting** |
| Confirm cancel | **Cancel** |
| Success | `No longer waiting on {line}.` |

**Label pair:** CTA **I’m not waiting** pushes away from checkout vocabulary hardest (PM §5 noun question).

### 4.5 Confirm sheet

```
Stop waiting on Front curb?
For Saydee on this trip only. You can join a line again anytime.
Not staff pickup.
[ I’m not waiting ]   Primary
[ Cancel ]            Ghost
```

### 4.6 Waiting hierarchy

| Priority | Element |
|---|---|
| 1 | Check-in (Photo / I’m first) |
| 2 | XX ListRow |
| 3 | Leave trailing |

**Risk:** Fat-finger Photo while meaning to leave — mitigated by confirm on Leave only (Photo stays one-tap as today). Leave is harder to find under stress.

### 4.7 Seats / motion / a11y

| | |
|---|---|
| Seats | Parent Ride only |
| Motion | Row mount/unmount; **no** theatrical |
| a11y | Trailing control min 44 wide; if layout tight, demote to full-width Ghost under row (still Option C stance) |

### 4.8 Explicit non-goals (C)

- Sticky footer  
- Disabling check-in while waiting  
- Swipe-to-leave  
- Duty walk-list visual  

### 4.9 Pros / cons

| Strong | Weak |
|---|---|
| Least duty-like; calm parent tone | Worst discoverability under curb stress |
| Minimal IA change to shipped Ride | Easy to miss Leave (US-CO-01) |
| ListRow is an existing primitive | Check-in + Leave both present → accidental re-check-in attempts (server should no-op/fail closed) |

### 4.10 Mockup

HTML tab **C**.

---

## 5. Cross-option matrix

| Dimension | A Trip card | B Sticky footer | C Quiet ListRow |
|---|---|---|---|
| Stance | Status-first | Action-first | Check-in-first |
| Leave weight | Secondary on card | Strong footer | Quiet trailing |
| Same-line check-in while waiting | Recede / disable | Allowed (secondary weight) | Allowed (full weight) |
| Noun | Leave line | Leave line | I’m not waiting |
| Confirm cancel | Cancel | Keep waiting | Cancel |
| Confirm primary tone | Brand Primary | Brand Primary | Brand Primary |
| Danger red | No | No | No |
| Vehicles Leave | No (hub only) | Banner → Ride | No (hub only) |
| Post-leave staggered B | Restore check-in stack | Already on screen | Already on screen |
| Duty confusion risk | Low | Medium (footer chrome) | Lowest |
| Thumb reach | Medium | Highest | Lowest |
| Stories fit | US-CO-01/03 clear | US-CO-01/04 speed | US-CO-08 calm |

**Shared success/fail/empty (all options)**

| | |
|---|---|
| Success | Short; out of **this line**; no XX; no total; no “picked up” |
| Fail | Generic; no reason (US-CO-07) |
| Not waiting | No Leave (US-CO-02) — check-in frame as today |
| Staff released first | Leave gone / no-op (US-CO-05) |
| Dual-hat | Parent tray only (US-CO-06) |

---

## 6. Desktop preview

Interactive comparison (waiting → confirm → left):

`notes/company/ride-parent-checkout-options.html`

Open in Hermes Desktop preview (not Preview.app) for CEO/PM review.

---

## 7. Recommended (non-binding)

**Recommendation only — PM locks the pick.**

**Recommend Option A (Trip card owns Leave)** with these micro-adoptions from B/C:

1. Confirm cancel label **Keep waiting** (from B) — clearer under stress than Cancel.  
2. Primary confirm label **Leave line** (A), not I’m not waiting — shorter, still not “checkout.”  
3. Vehicles: **hub only** (A/C).  
4. Same-line Photo/I’m first **disabled** while waiting with one mute helper (A) — prevents double-join confusion without inventing partial leave.  
5. Confirm = parent-safe ConfirmSheet shape, **brand Primary**, never Danger, never delete coda.

**Why A over B:** Parent screens should read like a note home, not a tool bar; sticky footer fights the floating tray and edges toward duty chrome.  
**Why A over C:** CEO asked for a real way to leave; quiet trailing fails discoverability when the parent is already stressed at the curb (US-CO-01).

**If PM prioritizes one-handed thumb above all else:** pick **B**, keep A’s trip-scope copy discipline and disabled same-line re-join.

**If PM prioritizes maximum calm / minimal chrome delta:** pick **C**, but accept support cost of “where is leave?”

---

## 8. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | Designer option pack — parent leave-line on `/parent/ride` |
| RESULT | 3 options A/B/C + non-binding recommendation A |
| FILES | `notes/company/ride-parent-checkout-options.md`, `notes/company/ride-parent-checkout-options.html` |
| VERIFICATION | Cites US-CO-*; honors left≠released; confirm yes; no undo; tray/icon locks; primitives only; no ui-design patch |
| OPEN ISSUES | None blocking PM choose. Eng must unlock parent-safe confirm primitive when building. |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | CoS: complete `t_924ddb5b` when satisfied. **PM chooses** (separate card). Then designer patches `docs/ui-design.md` §13.13b to **chosen** option only. No Engineering until GATE. |
