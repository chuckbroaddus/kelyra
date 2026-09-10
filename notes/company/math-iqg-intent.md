# MATH IQG — Real-world intent (retro · ASK+GAUTH display layer)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_b92ffdd0` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** MATH / LaTeX — KaTeX `MathText` + prose/math/list renderer on Ask / Explain / Help / notes  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED**. Implementation already shipped (LATEX-IMPL + MATHUI-IMPL + native fixups). This card does **not** self-certify product-complete. Prove-out still required.

**SoT read (pre-IQG stamp pack):**  
`gauth-latex-research.md` · `gauth-latex-spec.md` (LATEX-P1 `t_d1f63e6b`) · `gauth-latex-architecture.md` (A1) · `gauth-latex-security.md` (S1) · `gauth-latex-acceptance.md` (Q1) · `mathui-research.md` · `mathui-spec.md` (P1) · `mathui-architecture.md` (A1) · `mathui-security.md` (S1) · `mathui-acceptance.md` (Q1).

**Join (do not rewrite):** `notes/company/ask-iqg-intent.md` (stamped ASK A-Filing). GAUTH IQG (`gauth-iqg-intent.md`) may land later with MERGED ASK+GAUTH — MATH is **display law** on that same surface, not a third silo.

**Live ground (read-only this card):** `mathTextCore.ts`, `MathText.tsx`, `MathText.web.tsx`, `katexMinCss*`, `mathText.test.ts`, call sites `ask.tsx`, `ExplainDraftCard.tsx`, `todo/[submissionId].tsx`, `class/.../student/[studentId].tsx`, `MessageAttach.tsx`.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: MATH/LaTeX — KaTeX MathText + prose/math/list on Ask/Explain/Help/notes (display layer of ASK+GAUTH)
Quality goals: rendered math not source; mixed prose+math+lists baseline; one helper all surfaces; web+native (fonts, no empty slabs, display swipe); XSS trust:false tokenize-only; no EXPO_PUBLIC keys; GAUTH refuse + ASK pack/ground locks hold with math on screen; not a new tray/Diary silo
PM: APPROVED (pre-IQG LATEX-P1 + MATHUI-P1 product law)  date: 2026-09-04  profile-session: LATEX-P1 t_d1f63e6b + MATHUI-P1 t_877aa0c0 / product paper
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_b92ffdd0 / qa-supervisor
Intent gaps remaining: none
```

**QA Supervisor stamp meaning:** Real-world intent is fully specified in LATEX + MATHUI packs (hats, entry, lifecycle, multiplicity, reverse, security, explicit non-goals) — **not** happy-path only. Live impl matches display law. ASK IQG-OFF / IQG-RG / IQG-CL and GAUTH refuse/Explain/Help/parent-co-educator locks are **absorbed by reference**, not redefined. This stamp does **not** declare MATH product-complete or release-ready.

---

## 0. MERGED ASK + GAUTH + MATH (one product law)

CEO 2026-09-10: GAUTH post-mortem **merges** with ASK A-Filing (one Ask product law). **MATH/LaTeX is the display layer of that same Ask surface** — join ASK+GAUTH+MATH. Do **not** invent a third/fourth silo. Do **not** rewrite `ask-iqg-intent.md`.

| Layer | Owns | Does not own |
|---|---|---|
| **ASK** (A-Filing) | Pedagogy pack confirm; student soft / parent explicit ground; tray no hard-assume; twins; office/super **no pack**; re-ground (A); class switch clear; Confirm≠Approve | Glyph layout; KaTeX |
| **GAUTH** | Explain draft; Help Edge separate; parent co-educator; student graded refuse + photo refuse; `parent_of` / `class_teacher_of`; never grade until Approve; keys server-side | Chrome invent for math |
| **MATH** (this stamp) | Tokenize `$`/`$$`/`\(`/`\[`; KaTeX render; prose+list layout; web+native safe host; fallback source Text; theme ink | Pack inject; refuse policy; new tray tab; Diary; CAS; MathLive |

**Display law (MATH):** model/teacher text → split → KaTeX **only** on math spans → prose flow. Failure = original source as Text, never blank hole. One `MathText` helper everywhere GAUTH text shows.

**Behavior law (ASK+GAUTH, absorbed):** IQG-OFF-01…06, IQG-RG-01…07, IQG-CL-01…05, IQG-TCH-ASK-01, graded/photo refuse, Help≠Ask, parent≠Approve, family never SELECT teacher-only/keys/`explain_draft`. **Rendering math must not weaken any of these.** Student seeing a fraction is **not** getting the answer key.

**Silo ban:** no Math tray tab; no Diary-as-math-notebook; no separate “Math mode” product; no Author-studio-only engine for class app.

---

## 1. One-line law

| Surface | Job | Not |
|---|---|---|
| **MathText** | Show rendered math + readable prose/lists on GAUTH text | Grade, CAS, Snap & Solve, second engine |
| **Ask bubbles** | Same helper; student/parent/teacher/office ops text may contain TeX | Pedagogy-pack authoring; new ground chrome |
| **Explain** | Teacher (and parent ephemeral) draft steps + reteach as math | Approve / score write |
| **Help** | Practice hints / next step / check-work as math | Merge into Ask |
| **Notes / attach** | Teacher note + MessageAttach body/caption when body is content | Capture Inbox redesign |

Delimiters v1: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`. Unmatched → source.

---

## 2. Hats — who sees math (display only)

### 2.1 Student

| Intent | Spec | Live |
|---|---|---|
| Ask tutor replies may show fractions/equations | LATEX-P1 Ask; MATHUI | `ask.tsx` MathText |
| Practice Help prompts/hints when help_mode | LATEX-P1 Help | `todo/[submissionId].tsx` |
| Soft ground / pack inject still ASK laws | ask-iqg | Unchanged by MathText |
| Graded refuse + photo refuse still hold | LATEX Q1 H-01; MATHUI L-06 | Refusal stays plain `Text`, not MathText |
| Never gets answer/key **because** math rendered | S1 + ASK P0-09/10 | Display-only; no key path |

### 2.2 Teacher

| Intent | Spec | Live |
|---|---|---|
| Explain draft steps + reteach rendered | LATEX-P1 Explain | `ExplainDraftCard` MathText; steps joined as numbered prose |
| Attach-as-note / teacher_note | LATEX-P1 notes | student detail + MessageAttach |
| Teacher-seat Ask class-only (no pack inject) | ASK IQG-TCH-ASK-01 | Behavior unchanged; bubbles still MathText |
| Confirm brief stays assignment detail | ASK | Not a Math surface |

### 2.3 Parent (co-educator)

| Intent | Spec | Live |
|---|---|---|
| Ask / Help math visible | LATEX-P1 parent | Same MathText paths |
| Explicit Which assignment? / Just chatting | ASK IQG-RG | Unchanged |
| Parent Explain ephemeral | LATEX-P1 | Same helper |
| Never Approve / never Looks like | GAUTH + ASK | Unchanged |

### 2.4 Office / superintendent

| Intent | Spec | Live |
|---|---|---|
| Ops Ask may still **render** TeX if model emits it | Task req §1 | MathText on ask bubbles — no crash |
| **No** pedagogy pack / soft chip / parent card | IQG-OFF-01…03 | Behavior law; MATH must not invent pack chrome |
| No new math ops product | Non-goal | — |

### 2.5 Dual-hat

| Intent | Spec | Live |
|---|---|---|
| Chrome **seat** SoT | ASK + GAUTH | Unchanged |
| Office+teacher: Explain only on **teacher** seat | Task req §1 | ExplainDraftCard teacher path |
| Seat switch clears ASK ground | IQG-OFF-06 / seat clear family | MATH does not own ground |

### 2.6 Student family / twins

| Intent | Spec |
|---|---|
| Twins fail closed for pack/ground | ASK — display inherits thread isolation |
| Family never SELECT teacher-only / keys | ASK + GAUTH — MathText does not SELECT server fields |

---

## 3. Entry chrome (per hat)

| Hat | Where math appears | Not |
|---|---|---|
| Student | `/ask` bubbles; Practice Help on todo submission | New tray tab; Diary; gradebook cells; splash |
| Teacher | ExplainDraftCard; `/ask` bubbles; student notes; MessageAttach bodies | Confirm strip as TeX editor; composer live-preview required |
| Parent | `/ask`; Help helping; parent Explain if present | Soft “Looks like” invented by MATH |
| Office/super | `/ask` ops bubbles only if text has TeX | Tutor brief; assignment Confirm |
| All | Same surfaces as GAUTH text | Diary Ask NL (`t_cecf2af0` parked — do not reopen) |

Composer: editing raw TeX as plain text is OK (LATEX-P1 out of v1 for live render-in-input).

---

## 4. Full lifecycle

```
model/teacher string arrives in stream or draft
  → MathText(children)
  → splitProseBlocks (paragraph | list | display)
  → splitMathSegments inside paragraphs/items
  → KaTeX renderToString (trust:false, throwOnError:false, caps, macros:{})
  → success: glyphs on baseline (inline) or block (display, overflow-x)
  → failure / trust-gated cmd / unmatched $: original source as Text
  → follow-up turns: each bubble independent MathText
  → reverse: leave Ask / Just chatting / clear ground = ASK re-ground laws still apply
  → native: one offline WebView per bubble when math present; measure height; fail → Text (no empty slab)
```

| Stage | Intent | Live verdict |
|---|---|---|
| Stream / bubble body | Render | Pass · ask.tsx |
| Explain steps | Numbered list + math in items | Pass · join `1. step` then MathText |
| Help prompt + reply | MathText | Pass · todo + notes practice |
| Mixed prose + inline + list + display | MATHUI L-01…03 | Pass · prose renderer |
| Bad TeX / XSS payload | Source / escaped text | Pass · core + tests |
| Follow-up thread multi-bubble | Independent helpers | Pass · per-message MathText |
| Leave Ask / Just chatting | ASK reverse + re-ground | Behavior not owned by MATH; must not break |
| Class / seat / child switch | ASK clear family | Same |

**Finish covered:** render success, source fallback, native measure fail-safe, thread multi-bubble. **Not** “finish math mode” product — there is no math mode.

---

## 5. Multiplicity

| Case | Design | Live |
|---|---|---|
| Web vs native | One API; web DOM p/ol + KaTeX spans; native one WebView/bubble + embedded woff2 | Pass |
| KaTeX fonts native | data: woff2 in CSS (about:blank-safe) | Pass · `KATEX_MIN_CSS_NATIVE` |
| Empty / failed measure | No blank 2000px slab; Text fallback; height clamp | Pass · clamp + timeout fail |
| Long display equations | Horizontal swipe/overflow-x; page vertical scroll stays | Pass · CSS + scrollEnabled false |
| Multiple bubbles in thread | N MathText instances | Pass |
| Lists with inline math | Marker column + body wrap; math inside items | Pass |
| Many classes / children | No MATH-specific picker; inherits ASK multiplicity | N/A display |

---

## 6. Security (must-hold)

| ID | Rule | Live |
|---|---|---|
| S1-01 | Never whole-blob `dangerouslySetInnerHTML` / WebView html of model | Pass · only KaTeX span HTML |
| S1-02 | `trust: false` always | Pass |
| S1-03 | Tokenize first; KaTeX only math spans | Pass |
| S1-04 | Parse fail → Text, not KaTeX error HTML | Pass · null + no katex-error mount |
| S1-05 | maxSize≤20; maxExpand≤1000 | Pass |
| S1-06 | Native WebView offline; no model `injectedJavaScript`; block nav | Pass · about:blank + onShouldStartLoad |
| S1-07 | htmlClass/href/url/includegraphics inert | Pass · TRUST_GATED + tests |
| S1-08 | Do not log full student page + TeX in Edge | Process non-goal for display card |
| M-01…06 | MATHUI layout must not regress S1 | Pass · prose escape + same options |
| Keys | No `EXPO_PUBLIC_*` model keys | Unchanged · server-side only |
| Cheat walls | G0 refuse, parent_of, class_teacher_of | Unchanged · display-only |

---

## 7. Explicit non-goals (not “done”)

| Non-goal | Why |
|---|---|
| MathJax second engine | LATEX R1 |
| MathLive / handwriting / CAS / Snap & Solve | P1 non-goals |
| Full GFM tables/mermaid | MATHUI |
| New tray Math tab / Diary math notebook | CEO silo ban |
| Changing GAUTH refuse or ASK pack/ground | Display-only |
| Live TeX preview in composer | LATEX out of v1 |
| Lesson HTML player / gradebook TeX | LATEX out of v1 |
| SQL / new tables / EXPO_PUBLIC keys | A1 / AGENTS |
| Reopen Diary Ask NL `t_cecf2af0` | CEO park |
| Git ship / devops-release from this card | Prove-out first |

---

## 8. Must-include checklist (stamp)

1. `$\\frac{1}{2}$` (and `$$`, `\(`/`\[`) render on web Explain/Ask/Help/notes.  
2. Native same or safe Text fallback — no crash, no empty slab.  
3. Inline math on sentence baseline; display = own block; lists marker column.  
4. One helper all call sites (Ask, Explain, Help, notes, MessageAttach).  
5. XSS: tokenize + trust false + no whole-blob HTML.  
6. Bad TeX → source Text.  
7. Theme foreground; no new IconName.  
8. Student refuse path still plain Text; GAUTH walls hold.  
9. ASK IQG-OFF / RG / CL behavior locks hold with math on screen.  
10. Not a new product silo.

---

## 9. Live ground vs packs (read-only)

| Pack row | Verdict |
|---|---|
| LATEX D-01…D-04 surfaces + delimiters | **Met** (code + unit) |
| LATEX X-01…X-03 XSS | **Met** |
| LATEX H-01/H-02 walls | **Met** (static refuse path) |
| MATHUI L-01…L-06 | **Met** |
| Native fonts / swipe / no empty slab | **Met** (`t_17793eea`, `t_daa6a896`) |
| QE review rewrite | Shipped `t_d90da5fe` / `t_ae65a5f9` |

Unit evidence: `src/components/ui/mathText.test.ts` (LATEX-S1, MATHUI L-*, native clamp/fonts). **Not** a substitute for QE live dogfood on web+phone.

---

## 10. Intent gaps + defects

**Intent gaps remaining:** **none.** Packs + ASK join fully specify real-world display intent (not happy-path only). No PM or Designer restaff required for MATH chrome invent.

**Realization defects for CoS (this card):** **none new.** No DEFECT titles filed from this stamp. Prior native empty-slab / font issues were addressed on shipped cards. QE prove-out may still file DEFECT [sev] if live misses stamp.

If QE finds miss vs stamp → file:

```
Title: DEFECT [P0|P1|P2|P3]: <one-line MATH miss>
SEVERITY: …
PARENT: t_b92ffdd0 (or MATH feature tracker CoS names)
HAT / ROLE: …
EXPECTED (stamped design): …
ACTUAL: …
EVIDENCE: …
```

---

## 11. Prove-out OBJECTIVE (QA Engineer)

**Staffing:** CoS creates `qa-engineer` card after this stamp. **Plan + cases now**; **execute vs live** (LATEX + MATHUI already shipped). Do not declare MATH product-complete from this card. Do not run kelyra-qa-loop. Do not git. Do not SQL. Do not implement. Do not rewrite ask-iqg-intent.md. Do not reopen Diary Ask NL `t_cecf2af0`.

**OBJECTIVE (paste onto qa-engineer card):**

```
OBJECTIVE:
Write test plan + cases for MATH/LaTeX (KaTeX MathText + prose/math/list renderer on Ask / Explain / Help / notes) vs stamped IQG intent. Land notes/company/math-iqg-testplan.md (or notes/qa/). Execute against live impl (LATEX-IMPL + MATHUI-IMPL + native font/slab fixups already shipped). File defects on board kelyra with severity (P0–P3) vs stamp; do not bury misses only in comments. MATH is the display layer of MERGED ASK+GAUTH — prove render AND that ASK/GAUTH behavior locks still hold when math is on screen.

SoT: notes/company/math-iqg-intent.md (this stamp), gauth-latex-*.md (P1/A1/S1/Q1), mathui-*.md (P1/A1/S1/Q1), notes/company/ask-iqg-intent.md (absorb IQG-OFF / IQG-RG / IQG-CL + refuse walls — do not rewrite), live MathText + call sites.

SCOPE — must cover:
1. HATS: student Ask + Help math visible without keys; teacher Explain + notes + Ask bubbles; parent co-educator Ask/Help; office/super ops Ask still renders TeX if present (no pack chrome invent); dual-hat office+teacher Explain only on teacher seat; refuse bubbles stay non-MathText where designed.
2. CHROME ENTRY: same Ask/Explain/Help/notes/MessageAttach surfaces only — not a new tray tab, not Diary, not gradebook/splash. Composer raw TeX OK without live preview.
3. LIFECYCLE: stream/draft text → MathText → inline/display/list layout; follow-up multi-bubble; bad TeX → source Text (no blank hole); reverse leave Ask / Just chatting / re-ground still ASK laws; class/seat/child switch clear family still holds with math bubbles present.
4. MULTIPLICITY: web + native (embedded KaTeX fonts, horizontal swipe on long display, no empty WebView slabs, height clamp); multiple bubbles; lists with inline math; long equations.
5. SECURITY / INTEGRITY: LATEX-S1-01…07 + MATHUI-M-01…06 (tokenize only; trust:false; no whole-blob HTML; trust-gated cmds inert; native about:blank + nav block + no model injected JS); no EXPO_PUBLIC model keys; student graded refuse + photo refuse still hold with math elsewhere on screen; family never SELECT teacher-only/keys/explain_draft; Confirm≠Approve; Help Edge separate; IQG-OFF no pack on office/super; IQG-RG re-ground; IQG-CL class switch clear.
6. NON-GOALS guarded: no MathJax; no CAS/Snap&Solve/MathLive; no Math tray/Diary silo; no Help→Ask merge; no pack inject invented by display layer.

CASES (minimum IDs — expand in testplan):
- R-ASK-01..04 web Ask bubble frac / display / list+math / multi-bubble thread
- R-EXP-01..03 ExplainDraftCard steps+reteach rendered; numbered column
- R-HELP-01..03 Practice Help prompt+hint math (todo submission)
- R-NOTE-01..03 teacher_note + MessageAttach body/caption MathText
- R-NAT-01..05 native: fonts visible; no empty slab; measure fail→Text; long $$ swipe; one WebView per bubble
- R-WEB-01..03 web baseline inline; display block overflow-x; ol marker column
- X-01..08 XSS/S1 matrix (script text; htmlClass/href/includegraphics null; unmatched $; trust false; no whole-blob innerHTML on ask/explain/help)
- FB-01..03 bad TeX / empty math → source Text, no crash
- REG-G0-01 student graded refuse still Text path (title match) with other math bubbles OK
- REG-PHOTO-01 photo-quiz refuse still holds
- REG-OFF-01 office/super Ask: TeX may render; no soft chip / no pack inject / no parent card
- REG-RG-01 Just chatting / Choose assignment re-ground still works with math in prior bubbles
- REG-CL-01 class switch clears ground with math thread present
- REG-HELP-01 Help control separate from Ask
- REG-KEY-01 no answer key leaked via rendered math alone; no EXPO_PUBLIC AI keys
- THEME-01 foreground inherits theme; no new IconName

EVIDENCE: run mathText.test.ts + scripted UI web and at least one native path where available; screenshots or DOM asserts for D-01/L-01. Each P0 pack row → evidence path. Open P0/P1 misses → DEFECT [sev] cards parented to MATH feature / this stamp.

CONSTRAINTS: No eng implement on QE card; no git ship; no devops-release; no kelyra-qa-loop; do not rewrite ask-iqg-intent.md; do not reopen t_cecf2af0; do not invent gauth-iqg conflicts — join ASK+GAUTH+MATH.

RECOMMENDED NEXT ACTION after QE plan+execute: QA Supervisor release evidence only when open P0/P1 FIX-NOW closed or in-flight with evidence; then CoS may staff devops-release. PM auto-dispositions new DEFECT cards.
```

---

## 12. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_b92ffdd0` / qa-supervisor |
| **PM stamp** | **APPROVED** (pre-IQG) · LATEX-P1 `t_d1f63e6b` + MATHUI-P1 `t_877aa0c0` product law |
| **DESIGN STAMP (both)** | **Dual-APPROVED** for intent completeness — **not** product-complete |
| **Intent gaps remaining** | **none** |
| **MERGED** | ASK+GAUTH+MATH display layer — §0 |
| **Engineering** | No new MATH scope from this card. FIX-NOW only if QE files P0/P1. Do not self-certify. |
| **QA Engineer** | CoS staffs from §11 OBJECTIVE — plan + execute live prove-out |
| **gauth-iqg-intent.md** | May land later; do not fight MERGED ASK+GAUTH; MATH absorbs by reference |
| **Diary Ask NL** | Remains parked `t_cecf2af0` |
| **devops-release** | **Blocked** until QE prove-out + open P0/P1 clear + QA Sup release evidence |
| **RESULT** | Retro intent stamped APPROVED. Prove-out OBJECTIVE ready. Defects: none new from this stamp. |

### DESIGN STAMP (card copy)

```
DESIGN STAMP
Feature/bug: MATH/LaTeX — KaTeX MathText + prose/math/list on Ask/Explain/Help/notes (display layer of ASK+GAUTH)
Quality goals: rendered math; prose+lists baseline; one helper; web+native safe; XSS trust:false; ASK/GAUTH locks hold with math on screen; no new silo
PM: APPROVED (pre-IQG LATEX-P1 + MATHUI-P1)  date: 2026-09-04  profile-session: t_d1f63e6b + t_877aa0c0
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_b92ffdd0 / qa-supervisor
Intent gaps remaining: none
```

### RECOMMENDED NEXT ACTION (CoS)

1. **Staff `qa-engineer`** from §11 prove-out OBJECTIVE (child of this stamp / MATH feature). ARM as needed.
2. Do **not** staff new MATH eng unless QE files FIX-NOW defects.
3. Do **not** rewrite ask-iqg-intent.md; join GAUTH IQG when it lands under MERGED ASK+GAUTH+MATH.
4. Do **not** reopen `t_cecf2af0`.
5. No devops-release until QA Supervisor release stamp after prove-out.

---

*End MATH IQG intent — KaTeX MathText + prose renderer · DESIGN STAMP QA Supervisor APPROVED 2026-09-10 (`t_b92ffdd0`). Dual stamp met for intent; product-complete = prove-out + P0/P1 clear.*
