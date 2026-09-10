# P-06 — Dual-hat office↔teacher seat-switch chrome (options)

**Card:** Kanban `t_7c4bbda2` · UX-AUDIT P-06  
**Author:** ui-ux-designer  
**Date:** 2026-09-10  
**Status:** Options only — **PM chooses; not locked**  
**Scope:** Office ↔ Teacher seat switch **affordance + transition + wordmark/title handoff** only.  
**Out:** Parent-as-seat / full parent tray (G3 later). No eng. No `docs/ui-design.md` patch until PM locks.

---

## 0. Job of this chrome

Dual-hat staff (office job-of-record + `also_teacher`) need one explicit, reversible way to sit in **Office** chrome or **Teacher** chrome on the same login — without ever blending trays, inventing a sixth tab, or leaving a wrong-altitude header title for even a beat.

This pack decides **where** the switch lives, **what** it says, and **how** chrome rebuilds (wordmark, logo/mark, tray, camera) so the active seat is always legible.

---

## 1. Locked behavior (do not reopen)

From `docs/ui-design.md` §31.4b, §37.1, §3.2, §3.5, §34.1:

| Law | Rule |
|---|---|
| Preference | Client-only `office` \| `teacher`. Not JWT, not SQL. |
| Default | Dual-hat default = **Office**. `also_teacher` never silent-forces teacher tray. |
| Teacher seat | Chrome === pure teacher: tray **Desk · Capture · Needs · Class · Ask**; header camera on; office People / Manage / matrix / school Activity **off** primary chrome. |
| Office seat | Tray **Feed · Classes · People · Manage · Ask**. **Still no Ride tray tab.** |
| Parent hat | Hamburger **My children** → `/parent` without switching to parent-only tray. **Not this pack** (G3). |
| Never | Merge trays. Sixth tab. Office People on pure teacher. Wrong stuck wordmark. |
| Wordmark | Destination label for **active** seat (§3.5). School logo left of wordmark when set. Ask = **KelyraMark** exception. Header does not hide. |
| Motion default | No theatrical morph (G3 note). Chrome motion dialect §35.1: cubic, no springs. Reduce Motion = snap/instant. |

**Current ship (read-only baseline, not a pick):**

- Drawer rows when `canChooseSeat`: target seat labels **Office** / **Teach** (hide current seat). Tap → `setChromeSeat` + `go('/', true)`.
- Parent hat row **My children** is separate and stays drawer-only.
- `headerTitleFor` is route/role-driven; seat flip + route replace can race if chrome rebuild is unordered — that race is what this pack closes.

---

## 2. Shared acceptance every option must pass

1. After switch settles, seat=teacher never shows office tray nouns (People/Manage as tray) or office People altitude.
2. After switch settles, seat=office never shows teacher Capture/Needs as tray or teacher camera unless product later locks otherwise (today: camera **teacher only**).
3. Wordmark at settle matches §3.5 for the **destination landed**, not the previous seat.
4. No merged 6+ tray flash at any frame Engineering ships.
5. Reduce Motion: **instant** chrome replace (0 ms crossfade).
6. Drawer close and tray rebuild do not leave a “stuck” office title on teacher Desk or teacher title on office Feed.
7. Parent **My children** path unchanged by this pack.

---

## 3. Options (mutually exclusive stances)

### Option A — Drawer destination rows + atomic instant chrome (shipped stance, tightened)

**Stance:** Seat switch is a **hamburger destination**, not ambient chrome. Flip is an **instant atomic rebuild** timed with drawer exit — no morph, no header chip.

#### Placement

- Only in **HamburgerDrawer**, dual-hat office+teacher only.
- Rows sit with other altitude controls (near Sign out / after My children), **not** in the floating tray, **not** in the header.
- Show **only the other seat** (current pattern): on office → **Teach**; on teacher → **Office**.
- Do **not** show a checked dual list of both seats in this option (that is Option B).

#### Copy (chrome strings only)

| Control | Label | Notes |
|---|---|---|
| Switch to teacher | **Teach** | Matches current drawer string; short; not “Teacher seat”. |
| Switch to office | **Office** | Matches §31.4b noun. |
| a11y | “Switch to Teach seat” / “Switch to Office seat” | Full phrase for screen readers. |
| Non-copy | No toast required. Optional one-line is **out** unless PM adds later. | |

#### Motion

- Duration: **0 ms** chrome morph. Instant replace of tray model, header extras (camera), and title source.
- Drawer: keep existing two-phase exit (§34 / §35). Seat commit may start on press; **visible** chrome outside the drawer must not show mixed seat while drawer is still open covering the shell — see sequence.
- Reduce Motion: already instant; no extra path.

#### Wordmark / logo / mark handoff sequence

Ordered commits (single frame from user POV after drawer no longer covers shell):

1. **Persist** preference `office` \| `teacher`.
2. **Resolve** `chrome.role` from preference (§31.4b).
3. **Replace route** to seat home (`/` office home or teacher landing with active class rules as today) **before or atomically with** tray key set — never leave prior seat’s path driving `headerTitleFor` after role flip.
4. **Rebuild tray** from `tabsFor(newRole)` only — full unmount/remount or key remount; no item-wise morph Feed→Desk.
5. **Header:** school logo unchanged (same school). Wordmark string = `headerTitleFor` for **new** pathname + **new** role. Camera slot mounts only if new role is teacher; unmounts if office.
6. Ask route special case: if user somehow lands `/ask`, mark = KelyraMark + wordmark rules for Ask — seat does not invent a second Ask title.

#### What the user sees (0–400 ms)

| t | Visible |
|---|---|
| 0 ms | Tap **Teach** / **Office** in drawer. |
| 0–~180–400 ms | Drawer exit animation only (existing tokens). Shell under scrim may already hold **target** seat chrome (preferred) or stays previous until drawer unmounts — **must not** paint half-old tray + half-new title. |
| Drawer gone | One coherent seat: correct 5 tabs, correct wordmark, camera on/off correct. No crossfade. |

#### Failure modes (must design against)

| Failure | Guard |
|---|---|
| Flash of merged tray (Feed+Capture etc.) | Remount tray with one `tabsFor(seat)`; never concatenate tab arrays. |
| Wrong wordmark 1–2 frames | Title function reads **post-commit** role+path only; no “keep previous title until navigation ends” without locking old role. |
| Office **People** on teacher | Teacher tray builder excludes People; drawer list rebuilds for teacher recipe after seat. |
| Teacher camera lingering on office | Camera gated on `role === 'teacher'` after seat, not `also_teacher`. |
| Teach row while already teacher | Hide current seat row (already). |

#### How it preserves §31.4b

Explicit preference; default Office untouched; pure teacher chrome when seat=teacher; office tray unchanged; no Ride tab; no tray merge; parent My children orthogonal.

#### Non-goals

- Header seat chip; identity-row segmented control; animated icon morph between seats; parent seat IA; new glyphs.

---

### Option B — Drawer seat pair (both seats listed) + 180 ms title/tray crossfade

**Stance:** Seat is a **mode chooser** inside the drawer: always see Office and Teach as a pair (check on active). Transition is a **short chrome crossfade** so the altitude change is readable without a theatrical morph.

#### Placement

- Hamburger only.
- A small **Seat** block after identity (or after class list / before Sign out — Engineering places with hairline; designer intent: **grouped pair**, not scattered single destination).
- Two rows always when dual-hat office+teacher: **Office** and **Teach**, checkmark on active (same check language as active class rows).
- Tap active seat = no-op (or close drawer only). Tap other = switch.

#### Copy

| Control | Label |
|---|---|
| Office row | **Office** |
| Teacher row | **Teach** |
| Section (optional, if hairline needs a name) | omit section title — rows only (avoid “Seats” jargon) |
| a11y active | “Office, selected” / “Teach, selected” |
| a11y inactive | “Switch to Office” / “Switch to Teach” |

#### Motion

- Chrome body (tray + wordmark text + camera slot): **180 ms** opacity crossfade, ease-out cubic (below §35 tray 260; intentional shorter “blink” not tray travel).
- Implementation sketch: old chrome opacity 1→0 and new 0→1 on the **same** 180 ms clock **after** preference+role commit and route replace scheduled; tray children swapped at t=0 of fade **under** opacity so labels never composite into six tabs.
- Drawer: start exit immediately on successful seat tap; crossfade may run under closing drawer.
- **Reduce Motion:** 0 ms — same atomic path as Option A.

#### Wordmark / logo / mark handoff sequence

1. Persist preference + resolve role.
2. At fade start (t=0): swap title string source to **target** seat destination; logo stays; camera target state selected.
3. During 0–180 ms: whole header title cluster and tray draw at fading opacity — **not** letter-morph, not sliding tab icons between nouns.
4. At 180 ms: only target chrome at opacity 1.
5. Never crossfade **wordmark text glyphs in place** from “People” → class name (that reads as wrong altitude mid-fade). Prefer fade **out old title block / fade in new title block** as one unit.

#### What the user sees (0–400 ms)

| t | Visible |
|---|---|
| 0 | Tap inactive seat row. |
| 0–180 | Previous seat chrome fades; new seat chrome fades in (5 tabs of one seat only). Drawer exiting. |
| 180–400 | Drawer finish; settled target seat. |

#### Failure modes

| Failure | Guard |
|---|---|
| Six-tab composite during fade | Opacity wrapper around **one** tray model at a time; swap model at t=0 under opacity 0 of incoming if double-buffered, or single buffer swap then fade in only (prefer **out-then-in 90+90** if double-buffer is hard — still ≤180 total). |
| Wrong wordmark readable mid-fade | Don’t leave old string at opacity 1 while role is new; fade title with chrome. |
| Checkmark lags seat | Check follows preference state at commit, not route settle. |
| Users hunt for missing “other” row | Both rows always listed — fixes discoverability vs A. |

#### How it preserves §31.4b

Still explicit preference; trays never merged; pair UI makes dual-hat visible without a sixth tray tab; camera/title follow seat.

#### Non-goals

- Header chip; springs; seat control on Profile page; parent in the pair (G3).

---

### Option C — Header seat chip (always visible) + instant replace, drawer rows removed for office↔teacher

**Stance:** Dual-hat altitude is **first-class ambient chrome**. A compact chip in the header cluster advertises current seat and switches without opening the hamburger. Drawer office↔teacher rows go away to avoid two competing controls.

#### Placement

- **Header**, trailing side of the **wordmark cluster** (right of wordmark text, **left of** camera/search) — chip is part of “who’s altitude,” not a sixth trailing icon in the mail/hamburger group.
- Chip only if `canChooseSeat` and available seats include both office and teacher.
- Hamburger **Office** / **Teach** rows **removed** for this pair (My children stays if parent hat).
- Tray unchanged (still no seat tab).

#### Copy

| State | Chip label | a11y |
|---|---|---|
| Office seat | **Office** | “Seat Office. Switch to Teach.” |
| Teacher seat | **Teach** | “Seat Teach. Switch to Office.” |
| Action | Single tap toggles to the other seat (only two seats in this pack). | |

Visual recipe (tokens only — no new glyph invention):

- Height 28 inside header 56; pad H 10; `radius.pill`; fill `brandSoft` or quiet `elevated`+`line` border; type `type.pill` / 600; ink `brand` or `ink`.
- Not tappable wordmark; chip is the only seat hit.
- Do **not** use a chrome IconName for seat unless PM later opens icons pipeline — **text chip only** in this option.

#### Motion

- **Instant** tray + camera + title replace on toggle (0 ms), same atomic rules as A.
- Optional 100 ms chip label swap fade **only on the chip text** (not whole chrome). Reduce Motion: instant chip text too.
- No drawer dependency.

#### Wordmark / logo / mark handoff sequence

1. Tap chip → persist opposite seat → resolve role.
2. Same-frame: route replace to seat home; tray remount `tabsFor`; camera gate; `headerTitleFor` for new path/role.
3. Logo stable. Wordmark updates with destination — **chip label updates to new seat** in same commit so chip and title never disagree (“Teach” chip + “People” title is a P0 flash).
4. If on a pushed screen: **pop or replace to seat home** on seat change (recommended) so pushed teacher student record cannot keep office title rules — specify: **seat change always lands seat root**, does not keep foreign pushed stack.

#### What the user sees (0–400 ms)

| t | Visible |
|---|---|
| 0 | Tap chip. |
| 0–16 ms | Chip label, wordmark, tray, camera all target seat (one frame). |
| ≤400 | Route body paints seat home; no staged morph. |

#### Failure modes

| Failure | Guard |
|---|---|
| Chip vs drawer duplicate | Remove drawer Office/Teach rows in this option. |
| Chip says Teach, tray still office | One setChromeSeat path; tray reads same preference. |
| Wordmark “People” under Teach chip | Atomic title+role; seat change forces seat-root route. |
| Crowded header on small phones | Chip max width ~72; marquee **not** on chip (truncate forbidden — keep **Office**/**Teach** short). If conflict with long class wordmark, wordmark flex shrinks first (existing marquee). |
| Accidental toggles | Confirm **not** required (too heavy); rely on short labels + undo by second tap. |

#### How it preserves §31.4b

Preference still explicit; default Office on first run; trays pure; no merge; faster dogfood for multi-hat staff without opening menu.

#### Non-goals

- Three-way Office/Teach/Parent chip (G3). Segmented control spanning full header. New seat icons via ad-hoc PNGs.

---

### Option D — Identity control seat switch (WhoRow) + drawer close-first, then instant chrome

**Stance:** Seat is part of **identity**, not navigation destinations and not header traffic. Switch lives on / next to the drawer identity block; chrome rebuild waits until the drawer has finished closing so the user never watches trays thrash under an open sheet.

#### Placement

- **Hamburger identity block** only (WhoRow region).
- Secondary line or trailing control under the name: text button **Office** | **Teach** as a two-segment quiet control (selected = `brand` / `brandSoft`, unselected = `mute`).
- No header chip. Drawer destination rows **Office**/**Teach** removed (avoid triple IA with identity).
- My children remains a normal row when parent hat.

#### Copy

| Piece | String |
|---|---|
| Segment | **Office** · **Teach** |
| a11y | “Chrome seat, Office” / “Chrome seat, Teach” |
| Helper (optional one `meta` line) | omit by default — segments are enough |

#### Motion

- **Close-first:** on segment tap → if already target, close only; else persist preference, **finish drawer exit fully**, **then** atomic instant chrome+route replace (0 ms morph).
- User-visible chrome swap happens in the open shell after drawer unmount (~drawerOutY+drawerOutX budget ≈ 240+220 ms worst case, existing tokens) — **not** mid-drawer.
- Reduce Motion: drawer snap close, then instant chrome.

#### Wordmark / logo / mark handoff sequence

1. Tap target segment → write preference immediately (so reopen drawer would show correct selection even if navigation delayed).
2. Run drawer exit to completion (modal unmount).
3. Then role resolve + route replace + tray remount + title + camera — **one commit**.
4. Logo unchanged. Wordmark only from new seat destination. No intermediate frame with old title after step 3.

#### What the user sees (0–400 ms and after)

| t | Visible |
|---|---|
| 0 | Segment switches selected state inside drawer (feedback). |
| 0–~400+ | Drawer closes (existing motion). Shell still **old** seat until drawer gone (acceptable **only if** old seat stays internally consistent — no half-new tray under scrim). |
| Drawer unmounted | Instant jump to new seat chrome + home route + correct wordmark. |

**Note:** Deliberate “old chrome until drawer gone” must **not** apply a new role to `headerTitleFor` early (that causes wrong-altitude title under the scrim). Preference may be stored; **role applied to chrome builders only at step 3**.

#### Failure modes

| Failure | Guard |
|---|---|
| Preference saved but role applied early → People title under closing drawer | Split “stored preference” vs “applied chrome seat” until drawer unmount barrier. |
| User reopens drawer mid-exit | Standard modal lock until exit finishes. |
| Feels slow vs A/C | Tradeoff: clearest sequencing, slower; dogfood cost. |
| Identity segment ignored (low discoverability) | Risk vs A/B; mitigate with always-visible dual segment whenever `canChooseSeat`. |

#### How it preserves §31.4b

Same preference model; strongest guard against mid-transition mixed chrome; pure trays at apply time.

#### Non-goals

- Editing profile from seat control; parent segment; toast stack.

---

## 4. Comparison table

| Dimension | A Drawer single row + instant | B Drawer pair + 180 ms fade | C Header chip + instant | D Identity segments + close-first |
|---|---|---|---|---|
| **Stance** | Destination in menu | Mode chooser in menu | Ambient altitude | Identity-scoped mode |
| **Placement** | Hamburger other-seat row | Hamburger both seats + check | Header chip by wordmark | WhoRow segments |
| **Discoverability** | Medium (must open menu, one row) | Higher (both seats visible) | Highest (always on-screen) | Medium (menu, but grouped) |
| **Header density** | Unchanged | Unchanged | +1 control | Unchanged |
| **Competing controls** | None | None | Removes drawer rows | Removes drawer rows |
| **Motion** | 0 ms chrome; drawer exit only | 180 ms chrome crossfade; RM instant | 0 ms chrome; optional 100 ms chip text | Drawer full exit, then 0 ms chrome |
| **Wrong-title risk** | Low if atomic route+role | Medium if fade mismanaged | Low if chip+title atomic | Lowest if apply-after-close |
| **Merged-tray risk** | Low with remount | Medium without opacity discipline | Low | Lowest |
| **Dogfood speed (office↔teach)** | Medium | Medium | Fast | Slowest |
| **Matches “no theatrical morph”** | Best | Acceptable short fade | Best | Best (delayed instant) |
| **Eng complexity** | Lowest (tighten current) | Medium | Medium (header layout + remove drawer rows) | Medium (apply barrier) |
| **G3 parent later** | Rows extend naturally | Pair becomes trio — careful | Chip becomes overcrowded — hard | Segments extend — natural |
| **§31.4b purity** | Yes | Yes | Yes | Yes |

---

## 5. Wordmark matrix aid (office↔teacher only; settle state)

Settled titles follow §3.5 — seat only changes **which tray/role map applies**, not a parallel title language.

| Seat | Example land route | Wordmark | Logo / mark |
|---|---|---|---|
| Office | `/` office home | School name (or School) | School logo if set |
| Office | Feed / Classes / People / Manage tabs | Same English noun | School logo |
| Office | `/ask` | Kelyra rules | **KelyraMark** |
| Office | Manage-altitude Ride office / dismissal | Manage-altitude titles per `titles.ts` (Dismissal / Ride office…) — **not** a Ride tray noun | School logo |
| Teacher | Desk `/class/{id}` | **Class name** | School logo |
| Teacher | Capture / Needs / Class setup | Capture / Needs / class name | School logo |
| Teacher | `/ask` | Kelyra rules | **KelyraMark** |
| Teacher | no active class edge | `Kelyra` per §3.5 Desk row | School logo / mark per Ask exception only on Ask |

**Illegal transient states (any option):**

- seat=teacher + wordmark **People** / **Manage** / school directory altitude  
- seat=office + tray **Needs** or **Capture**  
- seat=teacher + office People row as primary chrome  
- KelyraMark on non-Ask while school logo should show (except Ask exception)

---

## 6. Recommendation (not a lock)

**Recommended for PM: Option A — Drawer destination rows + atomic instant chrome (tightened).**

Why this recommendation:

1. Closest to **shipped** dual-hat IA and teacher-chrome skill (drawer Office / Teach, no header invention).
2. Honors **“no theatrical morph”** and §35 Reduce Motion = snap without a second motion dialect.
3. Lowest eng risk for the P0 flashes (merged tray / wrong wordmark / office People on teacher) if sequence is specified as **atomic role+route+tray+title**.
4. Leaves G3 parent-as-seat room without committing a header chip that becomes a three-mode mess later.
5. Option B’s fade is attractive for “I noticed the switch” feedback but adds failure surface for composite trays; only worth it if dogfood shows users missing the altitude change under A.
6. Option C is best for **power dual-hat dogfood speed** but spends scarce header space and fights “Facebook wordmark row” calm; revisit if PM prioritizes ambient seat over header purity.
7. Option D is the safest sequencing story but feels laggy; use as fallback if A still flakes on race bugs in QA.

**PM may still pick B/C/D.** This is recommendation only.

---

## 7. PM lock checklist (when choosing)

Record in the card / ui-design delta (designer patches **chosen only** after lock):

- [ ] Option letter A/B/C/D  
- [ ] Final copy: **Teach** vs **Teacher** (pack uses **Teach** to match current drawer)  
- [ ] Seat change landing: always seat root `/` (recommended) vs try stay-on-compatible-route  
- [ ] Reduce Motion = instant (already required)  
- [ ] Confirm parent My children unchanged  
- [ ] Eng AC: no merged tray frame; no office People on teacher; wordmark matches §3.5 at settle; camera teacher-only  

---

## 8. Handoff

| Field | Value |
|---|---|
| **OBJECTIVE** | P-06 office↔teacher seat-switch options pack |
| **RESULT** | 4 mutually exclusive options + comparison + recommendation A |
| **FILE** | `notes/company/ux-audit-p06-seat-switch-options.md` |
| **NOT DONE** | No eng, no `docs/ui-design.md` patch, no G3 parent seat |
| **ESCALATION** | None |
| **RECOMMENDED NEXT ACTION** | CoS → **product-manager** chooses; then designer patches ui-design to chosen option only; then engineering implement |

---

*End of pack.*
