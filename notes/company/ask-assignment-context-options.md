# ASK-D1 — Pedagogy pack confirm + Ask assignment ground (options)

**Date:** 2026-09-10  
**Author:** ui-ux-designer (Kelyra)  
**Card:** `t_f34baff2` · Parent PM `t_8946c670` · SoT: `notes/company/ask-assignment-context-pm.md`  
**Status:** Options only — **PM chooses**. Do **not** patch `docs/ui-design.md` on this card. No app code / SQL / Edge / qa-loop / git. **CoS must not staff Engineering from this card.**

---

## 0. Job of this chrome

| Surface | Job | Not |
|---|---|---|
| **Teacher confirm** | Preview / edit / Confirm student-safe tutor brief before inject | Auto-live AI draft; grade state; key reveal; Help merge |
| **Student ground** | Soft “Looks like FoM 1.2 — tap if wrong” when page knows assignment | Hard forever assume; raw pack dump; solver UI |
| **Parent ground** | Explicit which-assignment (or none) before pack inject | Soft assume; Approve; twin bleed |
| **Empty / wrong / stale** | Quiet correctable states; tray no hard-assume | Error theater; student “missing pack” scold |

**PM law:** §1, §4 P0, §5 integrity, §7 brief. **Research cite only:** ASK-R3 §5–6. **Chrome SoT:** `docs/ui-design.md` §12 Ask, teacher desk IA, tokens §4. Match existing Ask / desk — do not expand MVP chrome.

---

## 1. Shared locks (all options)

### 1.1 Product (do not reopen)

| Lock | Value |
|---|---|
| Pack | Once-at-publish student-safe (objectives, misconceptions, hint depth, vocab; ≤~800 tok). No keys / worked solutions / `explain_draft` in safe slice |
| Confirm | Mandatory before any student inject. Unconfirmed = class-only Ask |
| Stale | Material edit → stale; inject stops until re-confirm or clear |
| Student | Soft assume + tap-to-correct |
| Parent | Explicit ground; no soft assume |
| Tray | No hard-assume pack when no page assignment |
| Twins | Fail closed; no cross-child ground |
| Dual-hat | Chrome seat is SoT |
| Help | Separate surface forever |
| Icons | Prefer existing. No new View-stroke invent. If glyph needed later → `npm run icons` only |

### 1.2 Primitives (prefer existing)

| Primitive | Use |
|---|---|
| `Card` / `ListRow` / `Chip` / `ChipRow` | Pack fields, status, ground chip |
| `PrimaryButton` / `GhostButton` / `SecondaryButton` | Confirm / Skip / Clear / Re-generate |
| ConfirmSheet shape | Destructive Clear; parent assignment pick optional |
| `MessageComposer` | Unchanged; ground sits **near** it, not inside send disc |
| Tokens | `ink` `mute` `elevated` `card` `line` `brand` `brandSoft` `warn`/`warnSoft` for stale (not grade) `good`/`goodSoft` for confirmed — **never** `danger` for draft/stale/asking |
| Teacher-only wall | Visual separation stronger than a label alone |

### 1.3 Shared non-goals

- Solver UI, key reveal, Help→Ask merge, full Ask IA redesign  
- Per-assignment answer skills chrome  
- Student-visible raw pack / JSON inspector  
- Parent Approve; twin merge  
- Patching `docs/ui-design.md` before PM pick  
- `src/`, SQL, qa-loop, git on this card  

### 1.4 Before (shipped today)

- Ask: role/class/student/screen live context — **no** `assignmentId` ground chrome  
- Publish assignment: no pedagogy pack confirm surface  
- Student/parent Ask: no FoM chip / explicit assignment ask  

---

## 2. Option A — Quiet strip + composer ground (filing-first)

**Stance:** Teacher confirm is a **non-blocking success strip** on the assignment after publish (and a quiet card on assignment detail). Student ground is a **composer-adjacent soft chip**. Parent ground is an **empty-state card** before the first turn. Status never looks like a grade — draft/confirmed/stale read as filing meta, not Approve chrome.

### 2.1 When A wins / risks

| Wins when | Risks |
|---|---|
| Teachers already live on assignment detail after publish; want Confirm without a blocking gate | Skip-happy teachers leave packs unconfirmed → class-only Ask (product OK, depth lost) |
| Students need lowest chrome delta on existing Ask | Composer-adjacent chip can fight keyboard / tray pad if not sticky-aware |
| Parents open Ask empty often; card-before-chat is natural | Empty-state card may feel like “another step” vs soft student path (intentional by PM) |

### 2.2 Teacher confirm (7.1)

**Where it lives**

| Moment | Chrome |
|---|---|
| Publish / material update success | **Inline success strip** under assignment title on desk (web) and phone assignment detail — not a full-screen takeover |
| Later revisit | Same **Tutor brief** card collapsed on assignment detail (Desk class → assignment). Findable without modal memory |
| Not | Blocking modal before route leave (that is B). Not a new tray tab. Not Help |

**Control hierarchy**

```
[status pill: Draft | Confirmed | Needs review]
Student-safe fields (edit in place)
── teacher-only wall ──
Internal notes (optional, never inject)
[ Confirm brief ]     Primary
[ Re-generate ]       Ghost
[ Skip for now ]      Ghost  (unconfirmed; publish already done)
[ Clear brief ]       Ghost mute — opens ConfirmSheet (destructive clarity)
```

| Control | Job |
|---|---|
| **Confirm brief** | Makes pack injectable. Label not “Approve” (grade noun reserved) |
| **Re-generate** | New AI draft; status → Draft; prior confirmed stays live until new Confirm or Clear (PM US-T5) |
| **Skip for now** | Leaves unconfirmed; dismisses strip emphasis; assignment stays published |
| **Clear brief** | Off pack without unpublish; ConfirmSheet: title `Clear tutor brief?` body `Ask will use class context only until you confirm a new brief.` primary **Clear brief** / Ghost **Keep brief** |

**Status presentation (not grade)**

| Status | Chrome |
|---|---|
| Draft | Pill `Draft` on `wash`/`mute` — no brand, no good |
| Confirmed | Pill `Confirmed` on `goodSoft` + `good` text — filing done, **not** “Approved” |
| Stale | Pill `Needs review` on `warnSoft` + `warn` text + one-line banner: `Assignment changed — review the tutor brief.` Non-blocking for grades/publish of student work |

**Field editor (phone + web)**

- Compact stacked `TextField` / multi-line for objectives, misconceptions, vocabulary (chip-add optional for vocab tokens)
- Hint depth: three `Chip` exclusive: **Next step** · **Conceptual** · **Scaffolding** (ASK-R2 labels only)
- Web desk: card max-width content column (existing desk width); phone: full width under title
- Over-cap: mute line `Brief is too long to confirm — shorten or re-generate.` Confirm disabled until under cap
- Generation failure: mute `Couldn’t draft a brief. Try re-generate, or skip for now.` No danger stack trace

**Teacher-only wall**

- Hairline + label **Only you** above internal notes
- Notes field sits in `wash` well (not `card` white) so safe fields and private notes never share one continuous white block
- No “show student” toggle on notes

### 2.3 Student chip (7.2)

**Placement:** Sticky band **directly above** `MessageComposer` (not under header, not inside bubbles). Survives scroll; sits with keyboard lift.

**Soft copy (FoM 1.2 samples)**

| State | Copy |
|---|---|
| Soft assume | `Looks like FoM 1.2` · trailing affordance `Not this` |
| a11y | `Looks like Foundations of Math 1.2. Double-tap to change assignment.` |
| None (tray) | No chip. Optional one mute empty hint once per session: `Working on a specific assignment?` → opens picker (never auto-picks) |
| Class-only (no confirmed pack) | Chip still shows title if page-bound; no extra “pack missing” UI |
| Ambiguous two | Replace soft chip with `Which assignment?` + two title chips — never merge packs |

**Tap-to-correct flow (A)**

1. Tap `Not this` → inline compact list (recent/open assignments for this class) + row **Just chatting** (clears ground)
2. Pick → chip updates; prior pack inject cleared
3. No full-screen route leave

### 2.4 Parent explicit (7.3)

**Pattern:** On Ask open (parent seat), if no assignment ground yet: **empty-state card** in thread well (not modal):

```
Title: Which assignment?
Body: Pick one so Ask can help with that work — or just chat.
ListRow titles (enrolled child + class scoped)
Ghost: Just chatting
```

| Rule | Behavior |
|---|---|
| Before first pack-using turn | Card blocks pack inject; free chat still allowed after **Just chatting** |
| Child switch | Clears assignment ground; card returns |
| Copy voice | **Which assignment?** — never “Looks like…” |
| Co-teacher | After pick, same student-safe inject + parent seat policy — no teacher-only fields |

### 2.5 Wrong / empty / stale (7.4)

| Case | Student | Parent | Teacher |
|---|---|---|---|
| Corrected away | Chip → none or new; inject cleared; quiet | n/a (explicit) | — |
| Stale mid-session | Drop inject; optional one mute system line once: `Tutor brief was updated — using class help for now.` Not scary, not error | Same quiet if ground set | Banner Needs review |
| Unconfirmed pack | **No** student UI about missing pack | No missing-pack scold | Draft strip remains |
| Twin ambiguity | Fail closed: no pack; mute `Choose which child in Family` only if product already has child switcher — never invent twin picker here | Explicit child then assignment | — |
| Tray no page | No hard-assume | Explicit card if they want pack depth | — |

### 2.6 Mobile + web

| Seat | Phone | Web ≥720 |
|---|---|---|
| Teacher | Strip/card full width under assignment title; Confirm sticky bottom of card | Same card in desk content column; controls in-card not header overflow |
| Student | Chip above composer; portrait Ask | Chip above composer; maxWidth 640 column (§12.5) |
| Parent | Empty card in thread | Same card centered in 640 column |

### 2.7 Explicit non-goals (A)

- Blocking leave-publish modal  
- Header ground chip (B)  
- Dedicated always-expanded Tutor brief nav item  
- New glyphs for status  

### 2.8 Pros / cons

| Strong | Weak |
|---|---|
| Lowest Ask chrome delta; matches filing tone | Confirm easy to ignore (Skip) |
| Composer chip = correct-near-send mental model | Keyboard + tray padding must be tested |
| Parent card ≠ student soft (integrity optics) | Empty card friction for parents who only want free chat (mitigated by Just chatting) |

### 2.9 Mockup

HTML tab **A**: `notes/company/ask-assignment-context-options.html`

---

## 3. Option B — Modal gate + header ground (gate-first)

**Stance:** Teacher **cannot dismiss** the publish success path without an explicit **Confirm brief** or **Skip for now** (modal gate). Student ground lives in the **Ask header band** under the wordmark (thread-top, always visible while scrolling). Parent ground is a **centered modal / bottom sheet** on first Ask open until assignment or Just chatting is chosen. Maximizes confirm rate and ground legibility; higher friction.

### 3.1 When B wins / risks

| Wins when | Risks |
|---|---|
| Org wants near-100% teacher decision on pack at publish | Modal fatigue; teachers rush Skip |
| Ground must stay visible while reading long threads | Header band competes with class chip / dual context (§12 empty row rules) |
| Parent integrity optics need a hard stop before any turn | Modal on every Ask open feels heavy vs co-teacher chat |

### 3.2 Teacher confirm (7.1)

**Where it lives**

| Moment | Chrome |
|---|---|
| Publish / material update | **Modal gate** (phone bottom sheet / web centered ≤400, ConfirmSheet shape) before leaving success route |
| Later revisit | Compact **Tutor brief** entry on assignment detail opens same editor sheet |
| Stale | Same modal-capable editor; banner on detail still non-blocking for grades |

**Modal contents**

```
Title: Tutor brief for FoM 1.2
Status pill: Draft
Scroll: student-safe fields (edit)
── Only you ──
Internal notes (wash well)
[ Confirm brief ]  Primary
[ Re-generate ]    Ghost
[ Skip for now ]   Ghost
```

- **No** silent X dismiss that equals Skip without copy — X = Skip for now (announce to a11y)
- Clear brief only from detail revisit (not first publish modal) to avoid destructive near Confirm
- Over-cap / gen fail: same mute copy as A; Confirm disabled when over cap

**Status:** Same Draft / Confirmed / Needs review pills as A — still **not** Approve / grade language.

**Controls hierarchy:** Confirm primary; Skip secondary; Re-generate tertiary; Clear only on detail with ConfirmSheet.

### 3.3 Student chip (7.2)

**Placement:** Under Ask header (title **Ask** / Kelyra mark slot per §3.5), a single ground row height ~32–36:

`Looks like FoM 1.2` · text button `Change`

| Tray none | Row hidden entirely (no empty chip) |
| Ambiguous | Row becomes `Which one?` + two tappable titles |
| Class-only pack absent | Row still shows title if bound; quiet |

**Tap-to-correct:** `Change` opens full-height sheet list (assignments + **Just chatting**). Sheet — not inline — because header space is tight.

**Copy samples**

| | |
|---|---|
| Soft | `Looks like FoM 1.2` |
| Change a11y | `Change assignment for Ask` |
| Cleared | Header row gone; no residual “wrong” banner |

### 3.4 Parent explicit (7.3)

**Pattern:** On first parent Ask open without ground → **modal**:

```
Which assignment?
Ask can go deeper on one assignment, or you can just chat.
[ List of titles ]
[ Just chatting ]
```

- Blocks interaction with composer until choice (stronger than A’s card)
- Child switch → modal returns
- Never “Looks like…”

### 3.5 Wrong / empty / stale (7.4)

| Case | Behavior |
|---|---|
| Student corrected | Header row updates or hides; inject cleared |
| Stale mid-session | Drop inject; one mute toast-equivalent line under header once: `Using class help for now` |
| Unconfirmed | No student chrome about pack |
| Twin fail closed | No pack; no cross-child title in header |
| Tray | No header ground row |

### 3.6 Mobile + web

| | Phone | Web |
|---|---|---|
| Teacher gate | Bottom sheet | Centered dialog ≤400 |
| Student ground | Header band full width | Header band inside 640 column |
| Parent | Bottom sheet | Centered dialog |

### 3.7 Non-goals (B)

- Non-blocking publish strip only (A)  
- Composer-adjacent chip  
- Always-on side panel without gate (C’s panel may coexist later but B’s defining move is the gate)

### 3.8 Pros / cons

| Strong | Weak |
|---|---|
| Highest Confirm decision rate | Modal tax; Skip-as-escape |
| Ground always on-screen while scrolling thread | Header congestion with class chip |
| Parent hard stop = integrity theater-resistant | Heavier than student soft path (intentional) |

### 3.9 Mockup

HTML tab **B**: `notes/company/ask-assignment-context-options.html`

---

## 4. Option C — Tutor-brief panel + sheet correct (panel-first)

**Stance:** Teacher chrome is a durable **Tutor brief** panel on assignment detail (always discoverable, not only at publish). Student soft chip sits above composer (like A) but **correct always opens a bottom sheet** with clear None / titles. Parent ground is a **system first bubble** in the thread (`Which assignment are you helping with?`) plus tappable title list — conversational, not modal chrome. Best for findability and teach-back; more surface area.

### 4.1 When C wins / risks

| Wins when | Risks |
|---|---|
| Teachers re-edit packs often; need a home for brief | Panel adds assignment detail density |
| Correct flow needs room (long assignment lists) | Sheet every correct = extra step vs A inline |
| Parent voice should feel like Ask talking, not a form gate | System bubble can be scrolled away; must re-offer if still ungrounded on send attempt with pack intent |

### 4.2 Teacher confirm (7.1)

**Where it lives**

| Moment | Chrome |
|---|---|
| Always on assignment detail | Section **Tutor brief** below body/objectives of assignment (Desk) |
| Publish success | Scroll-to or highlight that panel (no blocking modal) |
| Web wide | Optional right column panel if desk already splits; else stacked — **do not** invent new IA tabs |

**Panel chrome**

```
Tutor brief                    [Draft|Confirmed|Needs review]
Objectives …
Misconceptions …
Hint depth chips
Vocabulary …
──── Only you ────
Internal notes (wash)
[ Confirm brief ] [ Re-generate ]
[ Skip for now ]  [ Clear brief ]
```

- Skip on panel = leave Draft; no route trap  
- Stale: panel border uses `warn` hairline + banner line inside panel  
- Teacher-only wall: full-width wash block + lock copy `Never sent to student Ask`

### 4.3 Student chip (7.2)

**Placement:** Composer-adjacent soft chip (same as A placement).

**Correct:** Always **sheet**:

```
Assignment for Ask
○ FoM 1.2
○ FoM 1.1 Practice
○ Just chatting
[ Done ]
```

Ambiguous two: auto-open sheet with those two only (no soft assume).

Tray empty: no chip; optional composer placeholder hint only — never default pack.

### 4.4 Parent explicit (7.3)

**Pattern:** First assistant bubble (system):

`Which assignment are you helping with? Pick one, or say you’re just chatting.`

Below bubble: title chips / ListRows. Choosing posts a quiet receipt bubble `Helping with FoM 1.2` (not a pack dump).

| Child switch | Clears ground; new system ask bubble |
| Just chatting | Receipt `Just chatting — class help only` |
| Copy | Explicit; never Looks like |

### 4.5 Wrong / empty / stale (7.4)

| Case | Behavior |
|---|---|
| Student corrected via sheet | Chip updates; inject cleared |
| Stale mid-session | Drop inject; quiet system bubble once optional |
| Unconfirmed | No student mention |
| Twin | Fail closed; no pack; no sheet listing other twin’s ids |
| Parent send without ground | If they typed first: allow send class-only OR gently re-show pick — **prefer** allow send + keep pick card available (no deadlock) |

### 4.6 Mobile + web

| | Phone | Web |
|---|---|---|
| Teacher panel | Full-width section | Stacked in detail; no new left rail |
| Student sheet | Bottom sheet | Same sheet or compact popover ≤400 |
| Parent system bubble | Normal left bubble style | Same |

### 4.7 Non-goals (C)

- Publish leave modal (B)  
- Header ground row (B)  
- Solver / key fields in panel  
- New tray destination “Briefs”  

### 4.8 Pros / cons

| Strong | Weak |
|---|---|
| Best long-term findability for teachers | More permanent UI weight on assignment detail |
| Sheet correct scales to many assignments | Extra tap vs A inline list |
| Parent system bubble matches Ask metaphor | Can be ignored/scrolled; needs send-path grace |

### 4.9 Mockup

HTML tab **C**: `notes/company/ask-assignment-context-options.html`

---

## 5. Head-to-head

| Dimension | A Quiet strip + composer | B Modal gate + header | C Panel + sheet + system bubble |
|---|---|---|---|
| Teacher confirm home | Inline strip/card after publish | Blocking modal at publish | Durable assignment detail panel |
| Confirm decision rate | Medium (skippable strip) | Highest (forced choice) | Medium-high if panel habit forms |
| Student ground place | Above composer | Under Ask header | Above composer |
| Student correct | Inline mini-list | Sheet from header | Always sheet |
| Parent ground | Empty-state card | Modal hard stop | System first bubble + list |
| Tray no-assume | Quiet / optional hint | Hidden header row | No chip; placeholder only |
| Stale teacher | Banner + pill | Banner + modal editor | Panel warn border + banner |
| Stale student | Mute one-liner | Mute under header | Optional system bubble |
| Grade-state confusion | Low | Low if copy holds | Low if panel ≠ Approve |
| Ask chrome delta | Smallest | Header band cost | Composer + sheet |
| Teacher desk density | Low | Low day-to-day | Higher on detail |
| Integrity optics (wrong assign) | Good (easy correct) | Strongest visible ground | Strong correct sheet |
| Mobile thumb | Composer chip near send | Header farther from thumb | Chip + sheet thumb-friendly |
| Web desk | Content column card | Dialog ≤400 | Stacked panel |

### 5.1 Shared copy matrix (FoM 1.2)

| Voice | Copy | Options |
|---|---|---|
| Student soft | `Looks like FoM 1.2` + `Not this` (A/C) or `Change` (B) | All |
| Student none | *(no chip)* · optional `Working on a specific assignment?` | A optional; B/C none by default |
| Student ambiguous | `Which assignment?` / `Which one?` | All |
| Parent explicit | `Which assignment?` | All |
| Parent body | `Pick one so Ask can help with that work — or just chat.` (A/B) · bubble variant in C | All |
| Parent none path | `Just chatting` | All |
| Parent receipt (C) | `Helping with FoM 1.2` / `Just chatting — class help only` | C |
| Teacher confirm CTA | **Confirm brief** — never Approve | All |
| Teacher skip | **Skip for now** | All |
| Teacher clear title | `Clear tutor brief?` | All |
| Teacher stale | `Assignment changed — review the tutor brief.` | All |
| Student stale quiet | `Tutor brief was updated — using class help for now.` / `Using class help for now` | A/B/C variants |
| Over-cap | `Brief is too long to confirm — shorten or re-generate.` | All |
| Gen fail | `Couldn’t draft a brief. Try re-generate, or skip for now.` | All |

### 5.2 Icons

No new IconName required for MVP of any option. Status = text pills. If later PM wants a “brief” glyph on assignment rows, route through `scripts/build-icons.mjs` + `npm run icons` — **do not invent** View-stroke assets on this card.

### 5.3 Desktop preview

Interactive comparison:

`notes/company/ask-assignment-context-options.html`

Open in Hermes Desktop preview (not Preview.app) for PM review.

---

## 6. Recommended (non-binding)

**Recommendation only — PM locks the pick. Designer does not choose.**

**Recommend Option A (Quiet strip + composer ground)** with these micro-adoptions:

1. From **C:** Student **ambiguous two** and long lists open a **sheet** (A’s inline list only when ≤3 titles).  
2. From **C:** Teacher **Tutor brief** remains findable as a **collapsed card** on assignment detail after first publish (A already says this — keep it first-class, not only a flash strip).  
3. From **B:** Parent **child switch** always re-prompts (all options); keep A’s empty card rather than B’s blocking modal so Just chatting stays one tap without trap.  
4. Copy: Confirm = **Confirm brief**; stale pill = **Needs review**; never Approve/grade nouns.  
5. Teacher-only = wash well + **Only you** / `Never sent to student Ask`.

**Why A over B:** Kelyra teacher chrome is filing, not gateware; blocking modal raises Skip-as-dismiss and fights “publish already succeeded.” Header ground competes with Ask’s minimal chrome (§12).  

**Why A over C:** C’s durable panel is excellent for power editors but adds permanent density before we know pack-edit frequency; system bubble is charming but easier to miss than a parent empty card.  

**If PM prioritizes confirm completion above all:** pick **B**, keep A’s composer chip for students (hybrid allowed only if PM writes it).  

**If PM prioritizes long-term teacher re-edit findability:** pick **C**, keep A’s parent empty card instead of system-bubble-only.

---

## 7. Handoff

| Field | Value |
|---|---|
| **OBJECTIVE** | Designer option packs for ASK-P1 pedagogy confirm + Ask assignment ground (§7.1–7.4) |
| **RESULT** | 3 stances A/B/C + non-binding rec **A** (+ micro-adoptions). **PM must pick.** |
| **FILES** | `notes/company/ask-assignment-context-options.md`, `notes/company/ask-assignment-context-options.html` |
| **CONSTRAINTS HONORED** | No ui-design patch; no src/SQL/qa-loop/git; no solver/Help merge; no product reopen; icons not invented |
| **VERIFICATION** | Covers teacher confirm, student chip, parent explicit, empty/wrong/stale; FoM copy matrix; mobile+web notes |
| **OPEN ISSUES** | None blocking PM choose |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | **CoS staffs `product-manager` to choose** among A/B/C (or hybrid). **Do not staff Engineering.** After PM OK, designer patches `docs/ui-design.md` to **chosen** option only, then Eng. |

**RESULT line for board:** PM must pick UI option; CoS must **not** send Engineering from this designer card.
