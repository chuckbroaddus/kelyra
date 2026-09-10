# UX Audit PM Proposals — Spec Consistency Fixes

**Date:** 2026-09-09
**Author:** product-manager (UX-AUDIT-P1 / t_ddc7c2b8)
**Inputs:** `notes/company/ux-audit-report.md` (Q1), `docs/ui-design.md` (canonical), Ride locks (`notes/company/ride-icon-decision.md`, car-rider track)
**Authority:** Proposed kanban items only. CoS files sticky blocked cards after CEO/CoS accept. This card does **not** create Engineering/Designer tasks.

---

## 1. Mission and method

Goal: product **consistent across hats** and **matches** `docs/ui-design.md`.

Method:
- Reviewed only **MISMATCH** and **INCONSISTENT** findings from the QA audit.
- Cross-checked each against the **latest** chrome contracts (§34, §35, §36, §37, §31) when early §3 text conflicts with later deltas.
- Preferred **one chrome dialect** (header recipe, Ask-last trays, seat separation) over one-off fixes.
- **SPEC-GAP** rows are not fixed here — noted as blocked on designer D1 only.
- No app code, no option packs, no hermes child cards from this report.

Severity used for proposals: P0 product-wrong · P1 consistency/IA lock · P2 polish · P3 doc-only.

---

## 2. Decision principles (PM)

1. **Latest delta wins.** §34 / §36 / §37 override stale “shorter tray = fewer tabs” readings of §3.1 when they explicitly lock counts.
2. **Seats stay separate.** Office vs teacher trays must not merge (§31.4b, §37). Dual-hat is preference, not a blended tray.
3. **CEO product locks stand.** Parent **Ride** tray + office **Dismissal curb** (Manage altitude) are intentional different altitudes; glyph lock is `ride` (RIDE-ICON-P1).
4. **Spec documents shipped truth when product already locked.** Prefer spec-doc alignment over ripping CEO-shipped Ride out of parent chrome.
5. **No Engineering without a design decision** when the gap is visual/IA invention — mark *needs designer options first*.
6. **Consistency of shared chrome** (header cluster, Ask-last, drawer grammar) beats seat-local flourishes.

---

## 3. Proposed items

### P-01 — Student/parent header trailing cluster lock

| Field | Value |
|---|---|
| **Title** | Verify & lock student/parent header: no camera; search left of messages; hamburger last |
| **Why** | Audit §2 **MISMATCH (P1)**: student/parent header slot order not fully proven vs recipe. Spec **§3.2** and **§34.1**: camera teacher-only; on student/parent camera omitted and **search sits immediately left of messages**; hamburger far right (or back on push). School logo + wordmark remain left for all signed-in seats. |
| **Seats** | Student, parent (teacher/office camera path untouched except regression) |
| **Assignee class** | **engineering implement** |
| **Priority** | **P1** |
| **In scope** | Static layout proof + fix if `AppHeader` trailing order/conditionals drift; automated assertions on role flags (`showHeaderCapture` false for student/parent; search before mail); light visual QA both seats light/dark. |
| **Out of scope** | New header icons; restoring bell; Profile-in-header; redesign of search-slide motion; web-only alternate header IA. |
| **Needs designer options first?** | **No** — recipe already written. |
| **Acceptance** | On student and parent signed-in home chrome, camera control is absent; trailing order is search → messages (mail + unread-alert badge) → hamburger; teacher still shows camera between wordmark cluster and search; pushed screens hide hamburger per existing push rules; no change to school-logo-left rule. QA cites §3.2/§34.1. |

---

### P-02 — Spec-doc: parent tray Home · Ride · Ask

| Field | Value |
|---|---|
| **Title** | Patch ui-design parent tray to **Home · Ride · Ask** (document CEO-shipped car-rider) |
| **Why** | Audit §8 **INCONSISTENT** + §1 parent tray notes: code ships parent tray `home/ride/ask` (`trayTabs.ts`) with icon `ride`, while **§34.2** and **§31.1** still say parent **Home · Ask** (2). Product + CEO locks (car-rider track, RIDE-ICON-P1) already placed Ride on the **parent** floating tray and office dismissal under **Manage**, not a fifth office tray tab. This is **spec drift behind product**, not a random eng freestyle. |
| **Seats** | Parent primary; dual-hat staff still use **My children** → `/parent` without merging office tray (§31.4b) |
| **Assignee class** | **spec-doc** (designer/docs owner of `docs/ui-design.md` — not Engineering chrome rewrite) |
| **Priority** | **P1** |
| **In scope** | Update §34.2 parent row, §31.1 parent tray cell, and any §3.4 parent “2-tab” leftover to **Home · Ride · Ask** with keys/icons/routes aligned to shipped `today` / `ride` / `ask` and hrefs `/parent`, `/parent/ride`, `/ask`. Cross-link car-rider notes. State explicitly: office has **no** Ride tray tab. |
| **Out of scope** | Re-opening Ride glyph options; moving Ride onto office tray; student tray changes; implementing new parent screens. |
| **Needs designer options first?** | **No** for documenting locked IA. (Glyph already locked.) |
| **Acceptance** | `docs/ui-design.md` parent tray tables match shipped three-tab parent chrome; audit re-read would classify parent Ride as **MATCH**, not INCONSISTENT; office tray table remains Feed · Classes · People · Manage · Ask. |

---

### P-03 — Spec-doc: §3.1 “shorter tray” vs §34 counts

| Field | Value |
|---|---|
| **Title** | Clarify §3.1 “shorter tray” language against §34.2 locked counts |
| **Why** | Audit §9 **INCONSISTENT (P1)**: student tray is 6 tabs (longest), parent 3, teacher/office 5 — auditor read §3.1 “shorter tray” as a density mandate. **§34.2** already locks student **Assignments · Feeds · Classes · Grades · People · Ask (6)** and calls it shipped; **§37.1** non-goal: no student-skin rewrite. The inconsistency is mostly **stale §3.1 wording**, not a product defect. |
| **Seats** | Wording only — student + parent chrome descriptions |
| **Assignee class** | **spec-doc** |
| **Priority** | **P2** |
| **In scope** | Replace or footnote §3.1 “shorter tray” so it means *no teacher Capture/Needs density and no camera*, not “fewer tabs than teacher.” Point to §34.2 counts. |
| **Out of scope** | Cutting student tabs; inventing a new student IA option pack. |
| **Needs designer options first?** | **No** |
| **Acceptance** | Future audits cannot mark student 6-tab tray as MISMATCH solely from §3.1; §3.1 and §34.2 agree on intent. |

---

### P-04 — Hamburger drawer order conformance (all seats)

| Field | Value |
|---|---|
| **Title** | Conformance pass: hamburger row order vs §3.3 / §36 / student / parent recipes |
| **Why** | Audit §3 **INCONSISTENT**: one `HamburgerDrawer` with role branches; auditor flags possible drift in order/hairlines vs enumerated teacher and superintendent lists. Spec is explicit: **§3.3** teacher/student/parent rows; **§36.2** superintendent Feed · Classes · People · Manage · Ask then My children / Sign out; teacher Menu tray + Settings grammar; danger Sign out. |
| **Seats** | Teacher, office (superintendent/administrator), student, parent; dual-hat seat switch |
| **Assignee class** | **engineering implement** |
| **Priority** | **P1** |
| **In scope** | Diff live drawer row order/labels against the tables; fix **order, missing hairlines, wrong altitude nouns on pure teacher, My children gating**; unit snapshots per role. Keep two-phase enter/exit (§34.3 / §35 tokens). |
| **Out of scope** | Redesigning drawer visual language; new destinations; merging office+teacher lists; Profile-in-tray. |
| **Needs designer options first?** | **No** — order is specified. If a row’s *existence* is ambiguous (administrator extras in §31.1 vs §36), **stop and escalate to CoS/spec-doc** rather than invent. |
| **Acceptance** | For each seat, drawer top-to-bottom matches the governing § table; pure teacher never shows office People/Manage/matrix nouns as primary chrome; parent cannot delete children; Sign out remains danger; dual-hat seat control still does not merge trays. |

---

### P-05 — Ask tray a11y / label noun consistency

| Field | Value |
|---|---|
| **Title** | Standardize tray Ask noun: a11y **Ask** on every seat; wordmark stays **Kelyra** on `/ask` |
| **Why** | Cross-hat consistency (audit spirit §1/§4/§6). Code today uses tray `label: 'Kelyra'` on office/student/parent and `'Ask'` on teacher (`trayTabs.ts`). Spec **§34.2** tray tables name the slot **Ask**; **§3.2 / §3.5** say Ask route wordmark/mark is **Kelyra**. Phone hides tray text labels, but a11y and web ≥720 labels must not disagree by hat. |
| **Seats** | All signed-in trays |
| **Assignee class** | **engineering implement** |
| **Priority** | **P2** |
| **In scope** | Tray tab accessible name / web label **Ask** everywhere; keep Ask **last**; keep header/mark behavior on `/ask`. |
| **Out of scope** | Renaming the product; moving Ask; Profile tab. |
| **Needs designer options first?** | **No** |
| **Acceptance** | All roles expose Ask as the tray destination name for a11y/web; `/ask` still shows Kelyra mark/wordmark rules; Ask remains far-right on every tray that includes it. |

---

### P-06 — Dual-hat seat switch: wordmark + transition rules

| Field | Value |
|---|---|
| **Title** | Dual-hat seat switch chrome: wordmark and transition rules (options → choose → implement) |
| **Why** | Audit §2 **SPEC-GAP** and §A dual-hat wordmark; §9 dual-hat density notes. Spec locks **behavior** of seats (§31.4b, §37.1: explicit `office` \| `teacher`, default Office, never silent-force teacher tray) but **does not** specify transition motion, momentary chrome flash, or wordmark swap timing when seat flips. |
| **Seats** | Dual-hat office+teacher; parent-hat **My children** path (no full parent-tray merge) |
| **Assignee class** | **designer options** first → PM choose → **engineering implement** |
| **Priority** | **P1** (consistency when multi-hat staff dogfood) |
| **In scope** | Designer option pack for seat-switch affordance + wordmark/title handoff only; then eng against chosen option. Must preserve: no tray merge; default Office; teacher seat === pure teacher chrome. |
| **Out of scope** | JWT/SQL seat; sixth blended tray; inventing new office/teacher destinations. |
| **Needs designer options first?** | **Yes** |
| **Acceptance** | Written options exist; PM lock recorded; implementation matches lock; switching office↔teacher never shows a merged tray or office People on pure teacher seat; wordmark follows §3.5 destination labels for the **active** seat without a stuck wrong-altitude title. |

---

### P-07 — Visual QA pass on chrome P1s (static audit follow-up)

| Field | Value |
|---|---|
| **Title** | Device/web visual QA: header, trays, drawer on all four seats |
| **Why** | Audit **coverage limits**: no runtime/screenshots; P1 items recommended for visual QA. Confirms P-01/P-04/P-05 and parent Ride tab after P-02 doc lock. |
| **Seats** | Teacher, office, student, parent; sample dual-hat |
| **Assignee class** | **engineering implement** / QA (execution), not designer options |
| **Priority** | **P2** |
| **In scope** | Screenshot or dogfood checklist against §34/§36 recipes; file bugs only for true residual MISMATCH. |
| **Out of scope** | Expanding into full product dogfood; redesign. |
| **Needs designer options first?** | **No** |
| **Acceptance** | Short evidence note (paths/screenshots or checklist) attached to CoS follow-up; any new P0/P1 filed as separate sticky, not silent scope creep. |

---

## 4. Explicit declines

| ID | Finding (audit) | Decline reason | Disposition |
|---|---|---|---|
| **D-01** | Office vs teacher tray icons/labels differ (§1 INCONSISTENT) | **Intentional seat separation.** §34.2 / §36 / §37 lock different five-tab sets. §31.4b: never merge trays. | **No card.** Educate auditors via P-03 if needed. |
| **D-02** | Student tray longest vs “shorter tray” (§9) | **Not a defect.** §34.2 ships student 6; §37 non-goal “no student-skin rewrite.” | **Spec-doc only (P-03).** Do **not** cut student tabs in v1. |
| **D-03** | Put Ride on office floating tray for parity (§8) | **CEO altitude split.** Parent tray Ride; office dismissal under Manage / Ride office routes — dual-hat must not merge (§31.4b). RIDE-ICON surfaces already define parent tray + Manage curb only. | **No card** to add office Ride tab. |
| **D-04** | Remove parent Ride to match §34.2 Home·Ask only | **Would fight CEO car-rider lock and shipped IA.** Fix the **spec** (P-02), not the product. | Declined as eng “fix.” |
| **D-05** | Hide-on-scroll “180 ms” vs code (§4 / sufficiency) | **False mismatch.** §35 `chrome.motion.tray = 260` is the live contract; theme + ChromeProvider already use it. §9’s 180 is superseded. | **No eng card.** Optional D1 footnote when designer touches motion docs. |
| **D-06** | Pixel ListRow / shelf anatomy / every-screen shelf-vs-feed (§5) | **SPEC-GAP** — no pixel SoT. Engineering guessing would create new inconsistency. | **Blocked on D1 designer spec work.** No eng implement card now. |
| **D-07** | Exhaustive icon catalog / student icon names beyond locked sets | Partial **SPEC-GAP**; teacher/office icons locked in §34/§36; Ride glyph locked separately. Remaining catalog polish is designer. | **D1.** Do not spawn eng icon invention. |
| **D-08** | Web vs phone numeric header/tray gaps (§10 / §3.8) | **SPEC-GAP** on exact web numbers beyond §3.8 top bar 48 / labels visible. | **D1** before eng. |
| **D-09** | Full badge-source encyclopedia / person-tab web §32 polish | **SPEC-GAP** / P3 polish; not blocking chrome consistency MVP. | **D1 or later P3**; no P0/P1 eng now. |
| **D-10** | Camera proposal sheet micro-interaction beyond §14 | High-level **MATCH** in audit §7; residual detail is SPEC-GAP. | **D1** if designer wants tighter recipe; no eng churn now. |

---

## 5. SPEC-GAP → D1 (not PM eng send)

Per brief: ignore SPEC-GAP rows except to note blocked on designer. D1 owns:

- Exact tray icon names for any still-unspecified student glyphs (if not already matching shipped).
- Motion numeric footnotes (§9 vs §35 cleanup).
- Web/phone numeric matrix (§3.8 / §6).
- ListRow / shelf pixel anatomy and per-screen shelf vs feed tree.
- Dual-hat **visual** transition options (feeds **P-06**).
- Badge source full enum; person-page tab web behavior (§32).
- Proposal sheet interaction detail beyond §14.

**PM rule:** no Engineering implement cards on the above until designer options (or pure spec-doc) land and PM chooses where choice is required.

---

## 6. Recommended CoS filing order

File as **sticky blocked** only after CEO/CoS accept. Suggested sequence:

| Order | Proposal | Why this order | Depends on |
|---|---|---|---|
| 1 | **P-02** spec-doc parent Ride tray | Stops false “parent drift” bugs; unblocks honest eng QA | CEO already locked Ride product |
| 2 | **P-03** spec-doc §3.1 shorter-tray language | Cheap; prevents student 6-tab thrash | None |
| 3 | **P-01** eng header cluster | Clear recipe; high user-visible consistency | None (parallel with 1–2) |
| 4 | **P-04** eng hamburger conformance | Shared chrome grammar across hats | Escalate if admin-row ambiguity |
| 5 | **P-05** eng Ask label consistency | Small; after tray nouns stable | P-02 nice-to-have first |
| 6 | **P-06** designer options (dual-hat transition) | Needs pack before eng | D1 staffing |
| 7 | **P-07** visual QA pass | Validates 1–5 on device/web | After P-01/P-04 land |

**Do not file** D-01…D-10 declines as fix cards.

**Do not auto-spawn** ready Engineering from this markdown.

---

## 7. Summary counts

| Bucket | Count |
|---|---|
| Propose eng implement | 4 (P-01, P-04, P-05, P-07) |
| Propose spec-doc | 2 (P-02, P-03) |
| Propose designer-options-first | 1 (P-06) |
| Explicit declines | 10 (D-01…D-10) |
| SPEC-GAP deferred to D1 | listed in §5 |

---

## 8. Handoff

**WORK PERFORMED:** Read Q1 audit + governing ui-design sections (§3, §31, §34–§37) + Ride lock notes; classified each MISMATCH/INCONSISTENT into propose vs decline; wrote this file.

**VERIFICATION:** Q1 path exists; proposals cite audit section + spec §; no kanban child creates; no code/SQL/ui-design edits from this worker.

**RESULT:** `notes/company/ux-audit-pm-proposals.md` ready for CEO/CoS accept.

**OPEN ISSUES:** Administrator hamburger extras (§31.1 vs §36) may need a one-line spec-doc clarification inside P-04 escalation — not pre-judged here.

**ESCALATION NEEDED:** None for this card. CoS owns accept → sticky file.

**RECOMMENDED NEXT ACTION:** `kanban_complete` this P1 card. CoS presents proposals to CEO; file sticky blocked cards in §6 order only after accept. D1 proceeds on SPEC-GAP track in parallel.
