# ASK-P2: UI lock — pedagogy pack confirm + Ask assignment ground

**Date:** 2026-09-10  
**Author:** product-manager (Kelyra)  
**Card:** `t_e16f3b5c` · Designer options `t_f34baff2` · PM product `t_8946c670`  
**SoT product:** `notes/company/ask-assignment-context-pm.md`  
**SoT options:** `notes/company/ask-assignment-context-options.md` + `.html`  
**Status:** PM UI pick only — **no** `src/`, SQL, Edge, qa-loop, git. **Do not** patch `docs/ui-design.md` on this card (designer owns that next).

---

## 0. GO / NO-GO (UI)

| Decision | Verdict |
|---|---|
| **UI pick** | **A-Filing** (Option A + named micro-adoptions below) |
| **OK for Engineering after designer doc fold?** | **YES — UI GO** |
| **Like this chrome?** | **Yes.** Filing-first, soft student ground, parent explicit card. |
| **Send back to designer for rework?** | **No.** Spec-doc fold only. |
| **Staff Engineering from this card?** | **No.** CoS → designer `docs/ui-design.md` only → then Eng. |

---

## 1. Named pick: **A-Filing**

**Base stance:** Option **A** — Quiet strip + composer ground (filing-first).

**Named hybrid pieces (micro-adoptions only — not a competing pack):**

| Piece | Source | Lock |
|---|---|---|
| Teacher confirm at publish | **A** | Non-blocking **inline success strip** under assignment title (desk + phone detail). Not B modal gate. |
| Teacher revisit home | **A + C micro** | First-class **collapsed Tutor brief card** on assignment detail — findable after strip dismiss; not flash-only; not C always-expanded density panel as default. |
| Student ground place | **A** | Soft chip **directly above** `MessageComposer` (sticky with keyboard). Not B header band. |
| Student correct (≤3 titles) | **A** | Inline compact list + **Just chatting**. |
| Student correct (ambiguous two **or** >3 titles) | **C micro** | **Sheet** picker (titles + Just chatting). Never merge packs. |
| Parent ground | **A** | **Empty-state card** in thread well before first pack-using ground. Not B blocking modal. Not C system-bubble-only. |
| Parent child switch | **Shared / B note** | Always clears ground and **re-prompts** empty card. |
| Status / CTAs / teacher-only wall | **Shared all options** | See §3 copy + wall locks. |
| Tray no page assignment | **A** | No chip; optional one mute session hint → picker; never auto-pick. |

**Not chosen:** full **B** (gate-first), full **C** (panel-first). No PM-invented fourth stance.

---

## 2. Why this pick

### 2.1 Product law alignment (ASK-P1)

| Law | How A-Filing serves it |
|---|---|
| Confirm before inject (US-T2, P0-02) | Confirm is mandatory for inject; chrome is **preview + Confirm**, not auto-live. Unconfirmed = class-only Ask is **product OK**. |
| Skip allowed (US-T4) | Non-blocking strip + **Skip for now** matches law. B’s leave-gate raises Skip-as-dismiss theater without changing the legal outcome. |
| Student soft + tap-to-correct (US-S1/S4) | Composer-adjacent chip is correct-near-send; title only; no pack dump. |
| Parent explicit (US-P1) | Empty card is explicit **Which assignment?** — never “Looks like…”. Stronger integrity optics than student soft without B’s trap. |
| Tray no hard-assume (US-S5) | No chip / no auto pack. |
| Filing, not grade theater | Status pills Draft / Confirmed / Needs review — **never** Approve / grade nouns. |
| Minimal Ask chrome (§12) | Smallest delta; header band (B) fights empty-row / class-chip rules. |

### 2.2 Why not full B

- Publish **already succeeded**; a blocking modal fights teacher filing muscle and invites rush-Skip.
- Header ground competes with Ask’s minimal chrome and dual context row rules.
- Confirm-completion is **not** the #1 risk for MVP: unconfirmed pack is a safe fallback (class-only), not a integrity leak. Integrity risk is wrong ground / keys / twins — handled by soft correct, parent explicit, fail-closed — not by modal tax.

### 2.3 Why not full C

- Always-on expanded Tutor brief panel adds assignment-detail density before we know re-edit frequency.
- Parent system bubble is charming but scroll-away-able; empty card is a clearer first-open ground.
- Keep C’s **sheet** only where lists need room (ambiguous / long) and keep **collapsed card** findability without C’s full panel stance.

### 2.4 Like / OK

PM **likes** A-Filing chrome and **OKs** it for Engineering **after** designer folds the chosen option into `docs/ui-design.md` only. No competing PM drawings. No src on this card.

---

## 3. Locked chrome (chosen option)

Full interaction detail lives in designer options §2 (A) + §6 micro-adoptions. PM locks the following as **law for the UI fold** — do not reopen product §1 of ASK-P1.

### 3.1 Teacher confirm (7.1)

| Moment | Chrome |
|---|---|
| Publish / material update success | **Inline success strip** under assignment title (web desk + phone assignment detail). Non-blocking. |
| Later revisit | **Tutor brief** collapsed card on assignment detail (Desk → assignment). First-class findability — not only a flash strip. |
| Not | Blocking leave-publish modal (B). New tray tab. Help merge. Always-expanded C panel as default density. |

**Controls (hierarchy):**

```
[status pill: Draft | Confirmed | Needs review]
Student-safe fields (edit in place)
── teacher-only wall ──
Internal notes (optional, never inject)
[ Confirm brief ]     Primary
[ Re-generate ]       Ghost
[ Skip for now ]      Ghost  (unconfirmed; publish already done)
[ Clear brief ]       Ghost mute → ConfirmSheet destructive
```

| Control | Job |
|---|---|
| **Confirm brief** | Makes pack injectable. **Never** label “Approve”. |
| **Re-generate** | New AI draft → Draft; prior confirmed stays live until new Confirm or Clear (US-T5). |
| **Skip for now** | Leaves unconfirmed; dismisses strip emphasis; assignment stays published. |
| **Clear brief** | Off pack without unpublish. ConfirmSheet title `Clear tutor brief?` body `Ask will use class context only until you confirm a new brief.` Primary **Clear brief** / Ghost **Keep brief**. |

**Status (not grade):**

| Status | Chrome |
|---|---|
| Draft | Pill `Draft` on wash/mute — no brand, no good |
| Confirmed | Pill `Confirmed` on `goodSoft` + `good` text — filing done, **not** “Approved” |
| Stale | Pill `Needs review` on `warnSoft` + `warn` text + one-line banner `Assignment changed — review the tutor brief.` Non-blocking for grades/publish of student work |

**Field editor:** stacked fields for objectives, misconceptions, vocabulary; hint depth exclusive chips **Next step** · **Conceptual** · **Scaffolding**. Over-cap: mute `Brief is too long to confirm — shorten or re-generate.` Confirm disabled. Gen fail: mute `Couldn’t draft a brief. Try re-generate, or skip for now.`

**Teacher-only wall:** hairline + **Only you**; notes in `wash` well (not continuous white with safe fields); lock copy `Never sent to student Ask`; no “show student” toggle.

### 3.2 Student chip (7.2)

**Placement:** Sticky band **directly above** `MessageComposer` (not under header, not inside bubbles). Survives scroll; keyboard-lift aware.

| State | Copy / chrome |
|---|---|
| Soft assume | `Looks like FoM 1.2` · trailing `Not this` |
| a11y | `Looks like Foundations of Math 1.2. Double-tap to change assignment.` |
| Tray none | No chip. Optional once/session mute `Working on a specific assignment?` → picker (never auto-picks) |
| Class-only (no confirmed pack) | Chip may still show page-bound title; **no** “pack missing” scold |
| Ambiguous two | No soft assume — open **sheet** with those two titles + Just chatting |
| Correct ≤3 titles | Inline compact list + **Just chatting** |
| Correct >3 titles | **Sheet** list + Just chatting |
| Pick / clear | Chip updates; prior pack inject cleared |

### 3.3 Parent explicit (7.3)

**Pattern:** Parent seat Ask open, no ground yet → **empty-state card** in thread well (not modal, not system-bubble-only):

```
Title: Which assignment?
Body: Pick one so Ask can help with that work — or just chat.
ListRow titles (enrolled child + class scoped)
Ghost: Just chatting
```

| Rule | Behavior |
|---|---|
| Before pack inject | Card required for pack path; free chat after **Just chatting** |
| Child switch | Clears assignment ground; card returns |
| Copy | **Which assignment?** — never “Looks like…” |
| After pick | Student-safe inject + parent seat policy — no teacher-only fields |

### 3.4 Wrong / empty / stale (7.4)

| Case | Student | Parent | Teacher |
|---|---|---|---|
| Corrected away | Chip → none or new; inject cleared; quiet | n/a (explicit) | — |
| Stale mid-session | Drop inject; optional one mute system line once: `Tutor brief was updated — using class help for now.` | Same quiet if ground set | Banner Needs review |
| Unconfirmed pack | **No** student UI about missing pack | No missing-pack scold | Draft strip/card remains |
| Twin ambiguity | Fail closed: no pack; never invent twin picker here | Explicit child then assignment | — |
| Tray no page | No hard-assume | Explicit card if they want pack depth | — |

### 3.5 Mobile + web

| Seat | Phone | Web ≥720 |
|---|---|---|
| Teacher | Strip/card full width under assignment title; controls in-card | Same card in desk content column |
| Student | Chip above composer | Chip above composer; maxWidth 640 column (§12.5) |
| Parent | Empty card in thread | Same card centered in 640 column |
| Correct sheet | Bottom sheet when required | Same sheet or compact popover ≤400 |

### 3.6 Primitives / tokens / icons

- Prefer existing: `Card` / `ListRow` / `Chip` / `ChipRow` / `PrimaryButton` / `GhostButton` / ConfirmSheet / `MessageComposer` unchanged (ground **near** composer, not inside send disc).
- Tokens: `ink` `mute` `elevated` `card` `line` `brand` `brandSoft` `warn`/`warnSoft` (stale) `good`/`goodSoft` (confirmed) — **never** `danger` for draft/stale/asking.
- **No new IconName** for MVP. Status = text pills. Later glyph → `scripts/build-icons.mjs` + `npm run icons` only.

---

## 4. Designer patch list → `docs/ui-design.md`

**Owner:** `ui-ux-designer` on a **follow-up CoS card** (not this card). Spec-doc only. No `src/`.

Fold **A-Filing only** (this lock). Do not leave A/B/C as open options in ui-design. Do not invent a fourth stance.

### 4.1 Where to patch

| Target | Action |
|---|---|
| **§12 Ask** | Add subsection **Assignment ground** (student chip above composer; parent empty-state card; tray no-assume; ambiguous/sheet rules; stale quiet line; twins fail-closed messaging defer to existing Family child switcher). Preserve §12 layout law: portrait composer sticky; landscape maxWidth 640; no side-pane composer. |
| **§12 empty / context row** | Explicit: student ground is **composer-adjacent**, **not** a new permanent header band under the mark. Do not add B’s header ground row. |
| **Teacher assignment detail / desk publish success** (assignment chrome near WorkRow / open assignment / desk) | Add **Tutor brief** strip-on-publish + collapsed card on detail: controls, status pills, teacher-only wall, Clear ConfirmSheet. Cross-link Ask inject rules. |
| **Tokens / status** (§4 or status glossary if present) | Document Draft / Confirmed / Needs review as **filing meta**, never grade Approve language; warn for stale, good for confirmed; never danger for draft/stale. |
| **Copy matrix** | Land FoM 1.2 samples from options §5.1 as canonical strings for this slice. |
| **Icons** | State: no new IconName required. |
| **Non-goals callout** | Solver UI, key reveal, Help→Ask merge, parent Approve, twin picker invention — out. |

### 4.2 Must-include interaction bullets (acceptance for designer fold)

1. Teacher: non-blocking publish strip + durable collapsed Tutor brief card on assignment detail.  
2. CTAs: Confirm brief · Re-generate · Skip for now · Clear brief (ConfirmSheet).  
3. Student: soft chip above composer; `Not this` → inline ≤3 or sheet if ambiguous/>3; Just chatting clears ground.  
4. Parent: empty-state **Which assignment?** card; child switch re-prompts; never Looks like.  
5. Unconfirmed / missing pack: **no** student scold UI.  
6. Stale: teacher Needs review banner; student optional one mute line; inject dropped until re-confirm.  
7. MessageComposer structure unchanged; ground sits near it.  
8. Help remains separate surface forever.

### 4.3 Out of designer fold card

- No Engineering implementation, SQL, Edge, qa-loop, git ship.  
- No reopening ASK-P1 product law.  
- No B modal gate or B header ground as alternate still-on-table.  
- No full C always-expanded panel or C system-bubble-only parent path.

---

## 5. Explicit non-picks / non-goals

| Item | Status |
|---|---|
| Full Option B | **Rejected** for this slice |
| Full Option C | **Rejected** as base stance; sheet + collapsed-card micros **kept** |
| PM competing option pack | **Forbidden** |
| Solver / key chrome / Help merge | **Forbidden** |
| Patching `docs/ui-design.md` on this PM card | **Out** — designer next |
| Staffing Engineering from this card | **Out** — CoS after designer fold |
| `src/`, SQL, qa-loop, git | **Out** |

---

## 6. Handoff

| Field | Value |
|---|---|
| **OBJECTIVE** | PM choose + OK UI for pedagogy pack confirm + Ask assignment ground |
| **RESULT** | **UI GO** on **A-Filing** (Option A + C sheet/findability micros) |
| **FILE** | `notes/company/ask-assignment-context-ui-lock.md` |
| **LIKE + OK** | Yes — OK for Engineering **after** ui-design fold |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | **CoS staffs `ui-ux-designer`**: fold A-Filing into `docs/ui-design.md` only (patch list §4). **Then** staff Engineering. **Do not** staff Eng from this card. |
| **Engineering still gated?** | **Yes** until designer ui-design fold completes |

**RESULT line for board:** UI GO — pick **A-Filing**; designer folds `docs/ui-design.md` next; Engineering still gated.

**Designer fold (ASK-D2 `t_560881c1`):** A-Filing landed in `docs/ui-design.md` §3.6 · §4 · §8.1 · §12.6 · §13.15 · §29.4a (2026-09-10). Engineering may be staffed by CoS after this fold.

---

*End ASK-P2 UI lock.*
