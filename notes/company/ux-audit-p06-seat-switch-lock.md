# UX-AUDIT P-06 — Dual-hat office↔teacher seat-switch lock

**Date:** 2026-09-10  
**Author:** product-manager (Kelyra)  
**Epic:** `t_59e1a63e`  
**Options card:** `t_7c4bbda2` (done)  
**Sources:** `notes/company/ux-audit-p06-seat-switch-options.md` (A/B/C/D) · law `docs/ui-design.md` §31.4b / §37.1 / §3.2 / §3.5 / §34.1 / §35.1 (do not reopen)  
**Status:** **LOCKED pick** — chrome choice only. No `src/`, SQL, Edge, git, qa-loop, or kanban children on this card. **Do not** patch `docs/ui-design.md` here — that is a separate designer card.

---

## 1. Chosen option

| Field | Value |
|---|---|
| **Option id** | **A** — Drawer destination rows + atomic instant chrome (tightened) |
| **Base stance** | Seat switch is a **hamburger destination**, not ambient chrome. Flip is an **instant atomic rebuild** timed with drawer exit — no morph, no header chip, no seat pair check-list. |
| **Micro-adoptions** | **None.** Full A only. No named B/C/D adoptions. |

### 1.1 Locked chrome parameters (from pack §7 checklist)

| # | Parameter | Lock |
|---|---|---|
| 1 | Placement | **HamburgerDrawer** only; dual-hat office+teacher (`canChooseSeat`) only. Not tray, not header. |
| 2 | Rows | Show **only the other seat** (hide current): office → **Teach**; teacher → **Office**. |
| 3 | Copy | Labels **Teach** / **Office** (not “Teacher seat”). a11y: “Switch to Teach seat” / “Switch to Office seat”. No required toast. |
| 4 | Motion | **0 ms** chrome morph. Drawer keeps existing two-phase exit. Reduce Motion = already instant; no extra path. |
| 5 | Landing | Seat change **always lands seat root** (`/` / teacher landing with active-class rules as today). Do **not** try stay-on-compatible-route. |
| 6 | Parent hat | **My children** drawer path **unchanged** (G3 later; not this pack). |
| 7 | Preference | Client-only `office` \| `teacher`. Default dual-hat = **Office**. Not JWT/SQL. |

### 1.2 Ordered commit sequence (must ship)

Single coherent seat from user POV after drawer no longer covers shell:

1. **Persist** preference `office` \| `teacher`.
2. **Resolve** `chrome.role` from preference (§31.4b).
3. **Replace route** to seat home **before or atomically with** tray key set — never leave prior seat’s path driving `headerTitleFor` after role flip.
4. **Rebuild tray** from `tabsFor(newRole)` only — full unmount/remount or key remount; **never** concatenate tab arrays / item-wise morph.
5. **Header:** school logo unchanged (same school). Wordmark = `headerTitleFor` for **new** pathname + **new** role. Camera mounts only if new role is teacher; unmounts if office.
6. Ask special case unchanged: `/ask` → KelyraMark + Ask wordmark rules; seat does not invent a second Ask title.

Shell under scrim may already hold **target** seat chrome (preferred) or stay previous until drawer unmounts — **must not** paint half-old tray + half-new title at any frame.

### 1.3 Explicitly **not** adopted

| From | Declined element | Why |
|---|---|---|
| **B** | Drawer seat pair (both seats + check) + 180 ms title/tray crossfade | Adds composite-tray / mid-fade wordmark failure surface; second motion dialect vs “no theatrical morph.” Discoverability gain not worth P0 flash risk for this pack. |
| **C** | Header seat chip; remove drawer Office/Teach rows | Spends scarce header density; fights calm wordmark row; G3 three-mode chip becomes overcrowded later. Revisit only if dogfood proves drawer switch too slow. |
| **D** | WhoRow identity segments + close-first then apply | Safest sequencing story but laggiest dogfood; split preference-vs-applied-role barrier is extra eng without enough product win while A’s atomic path is specified. Fallback if A still flakes in QA — **not** locked now. |
| Any | Sixth tray tab; merged trays; office Ride tray tab; parent-as-seat; animated icon morph; new seat glyphs; toast stack | Law / pack non-goals. |

---

## 2. Why this pick

1. **Law purity without reopening:** §31.4b / §37.1 stay intact — default Office, pure teacher chrome when seat=teacher, office tray unchanged, no Ride tray tab, never merge trays, parent My children orthogonal (G3).
2. **Closest to shipped IA:** Current dual-hat already uses drawer **Office** / **Teach** destination rows. A **tightens** the atomic role+route+tray+title race instead of inventing ambient chrome.
3. **No theatrical morph:** 0 ms chrome replace + existing drawer exit matches §35.1 cubic dialect and Reduce Motion = snap. B’s 180 ms fade is optional feedback, not required for altitude clarity if settle state is correct.
4. **Lowest eng risk on P0 flashes:** Merged tray, wrong wordmark 1–2 frames, office People on teacher, teacher camera on office — all guarded by remount + post-commit title source + camera gated on `role === 'teacher'` (not `also_teacher`).
5. **G3 room:** Drawer destination rows extend naturally for parent later; header chip (C) and pair→trio (B) fight future parent-as-seat.
6. Designer non-binding recommend was **A**; PM agrees on product grounds above — not rubber-stamp alone.

**Rejected full B:** readable fade is nice; composite failure surface and extra dialect are not.  
**Rejected full C:** dogfood speed loses to header calm and G3 chip overcrowding.  
**Rejected full D:** clearest barrier, slowest feel; hold as QA fallback only if A races persist after eng.

---

## 3. Acceptance (one paragraph for engineering)

For dual-hat office+teacher only (`canChooseSeat`), seat switch lives solely as HamburgerDrawer destination rows that show the **other** seat label (**Teach** when seat=office, **Office** when seat=teacher) with a11y “Switch to {Teach\|Office} seat”; on tap, persist client preference `office`\|`teacher`, resolve `chrome.role`, replace route to **seat root**, remount tray from `tabsFor(newRole)` only (never concatenate or morph tab arrays), and update header so school logo stays, wordmark is `headerTitleFor` for the **new** path+role only, and camera mounts iff role is teacher — all as one atomic chrome commit with **0 ms** morph (Reduce Motion identical), such that after settle seat=teacher never shows office tray nouns (People/Manage) or office People altitude, seat=office never shows teacher Capture/Needs tray or teacher camera, no merged 6+ tray flash at any shipped frame, no stuck prior-seat wordmark under or after drawer exit, drawer Office/Teach rows are not duplicated by a header chip or WhoRow segment, parent **My children** path is untouched, default dual-hat remains **Office**, preference is not JWT/SQL, and office seat still has **no Ride tray tab**.

---

## 4. Out of scope (this pack / this card)

- **G3** parent-as-seat / parent-only tray / three-way seat chip
- Engineering implementation, `src/`, SQL, Edge, git, qa-loop
- Patching **`docs/ui-design.md`** on this card (designer separate card)
- Kanban children (CoS files)
- Toast / success one-liner for seat switch (optional later; not required)
- New IconName / seat glyphs; header chip; identity segments; 180 ms chrome crossfade
- Reopening §31.4b / §37.1 defaults, tray recipes, or Ride-on-office-tray
- Stay-on-compatible-route on seat change (locked to seat root)

Product law SoT remains `docs/ui-design.md` §31.4b / §37.1 and pack §1. This lock only chooses chrome among the option pack.

---

## 5. Chrome summary (for designer spec-doc of chosen option only)

| Element | Lock |
|---|---|
| Stance | Drawer destination + atomic instant chrome |
| Control | Single other-seat row in HamburgerDrawer |
| Labels | **Teach** / **Office** |
| a11y | “Switch to Teach seat” / “Switch to Office seat” |
| Motion | 0 ms chrome; existing drawer exit only; RM instant |
| Landing | Always seat root |
| Tray | `tabsFor(newRole)` remount only |
| Wordmark | Post-commit role+path; §3.5 matrix (pack §5) |
| Camera | Teacher seat only |
| Logo | Unchanged across office↔teacher |
| Parent | My children unchanged |
| Primitives | Existing drawer rows; no new glyphs; no header chip |

Exact drawer placement among Sign out / My children may follow existing altitude-control grouping in the ui-design patch as long as locks above hold.

**Illegal transient states (any frame Engineering ships):** seat=teacher + wordmark People/Manage; seat=office + tray Needs/Capture; merged trays; KelyraMark off-Ask when school logo should show.

---

## 6. Filing order (CoS owns cards — PM does not file kanban children)

1. **This lock** — `notes/company/ux-audit-p06-seat-switch-lock.md` (done on this card).  
2. **Spec-doc (next):** `ui-ux-designer` patches **`docs/ui-design.md`** to **Option A only** (chosen option; no B/C/D). Separate card. **PM does not patch `docs/ui-design.md` on this card.**  
3. **Engineering (later, after CoS grant):** implement atomic seat switch per this lock + pack failure guards; run **`kelyra-qa-loop`** only on that Build send.  
4. **Not on this card:** eng, git, qa-loop, kanban children, G3 parent seat.

---

## 7. Notify

**ui-ux-designer** must patch `docs/ui-design.md` to this pick on a **separate** card after CoS staffs it. Do not implement app code from this lock. Do not treat designer recommend as still open — **Option A is PM-locked** with no micro-adoptions.

---

## 8. Handoff

| Field | Value |
|---|---|
| OBJECTIVE | PM lock P-06 office↔teacher seat-switch among A/B/C/D |
| CONTEXT | Epic `t_59e1a63e`; options `t_7c4bbda2`; CEO accepted PM §6 designer-options-first; law §31.4b/§37.1 closed |
| RESULT | **Option A** locked — drawer destination rows + atomic instant chrome; no micro-adoptions |
| FILES | `notes/company/ux-audit-p06-seat-switch-lock.md` |
| VERIFICATION | Option id A; acceptance §3; OOS §4; no ui-design/src/SQL/git/qa-loop/kanban children |
| OPEN ISSUES | None blocking designer spec-doc. If eng still races under A after implement, CoS may reopen sequencing only (D-style apply barrier) — not this card. |
| ESCALATION NEEDED | No |
| RECOMMENDED NEXT ACTION | **CoS** completes this choose card, then staffs **designer spec-doc** (`docs/ui-design.md` → Option A only). Engineering later. |

---

*End of lock.*
