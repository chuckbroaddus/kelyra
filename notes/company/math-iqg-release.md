# MATH IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_825f69e5 · qa-supervisor
**Feature:** MATH/LaTeX — KaTeX MathText + prose/math/list (display layer of MERGED ASK+GAUTH)
**Process:** notes/company/INTENT_QUALITY_GATE.md § verification

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: MATH/LaTeX — KaTeX MathText + prose/math/list on Ask/Explain/Help/notes
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_825f69e5 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met (hats/chrome/lifecycle/multiplicity/security/non-goals + ASK/GAUTH locks with math on screen)
P2 leftovers: none filed for MATH
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `math-iqg-intent.md` PM LATEX-P1 `t_d1f63e6b` + MATHUI-P1 `t_877aa0c0`; QA Sup `t_b92ffdd0` |
| Implementation | terminal shipped | LATEX-IMPL `t_01e989ee`; MATHUI rewrite `t_d90da5fe` / integrate `t_a72b474b` / `t_7017df44`; native fonts `t_17793eea`; no empty slab `t_daa6a896` |
| QE plan + execute | done **PASS** | QE1 `t_8f340b57` → `math-iqg-testplan.md` · 26/26 unit + inspection · 0 DEFECT |
| Open P0/P1 FIX-NOW | **none** | Board 2026-09-10: zero MATH DEFECT [P0]/[P1]; only open P1 is AVG unrelated |
| Independent recheck | **pass** | `npx tsx --test src/components/ui/mathText.test.ts` → **26/26 pass** this card |
| ASK behavior locks | absorbed released | ASK REL `ask-iqg-release.md` APPROVED; MATH does not rewrite ask-iqg-intent |

---

## 2. Stamp vs prove-out map

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats — student Ask + Help math, no keys | Yes | QE R-ASK/R-HELP; MathText on ask.tsx + todo Help; refuse stays Text (H-01/L-06) |
| Hats — teacher Explain + notes + Ask | Yes | ExplainDraftCard join steps→MathText; student notes teacher_note; MessageAttach body |
| Hats — parent co-educator | Yes | Same MathText paths; no parent Approve invent |
| Hats — office/super ops Ask | Yes | MathText on ask bubbles only; no pack chrome invent (display-only) |
| Dual-hat / seat | Yes | MATH does not own seat; Explain teacher path; ASK seat clear family holds |
| Chrome entry | Yes | Ask/Explain/Help/notes/MessageAttach only — no tray Math tab, no Diary silo |
| Full lifecycle | Yes | split→KaTeX; multi-bubble independent; bad TeX→Text; native measure fail→Text |
| Multiplicity web+native | Yes | L-01..03 web; R-NAT fonts/woff2/clamp/swipe/1-WebView unit green |
| Security S1 + MATHUI M | Yes | trust:false; tokenize-only; no whole-blob; trust-gated inert; WebView about:blank + nav block |
| ASK/GAUTH locks with math on screen | Yes | G0 refuse Text path; photo refuse wall tests; Confirm≠Approve not owned by MATH; ASK REL already APPROVED |
| Non-goals guarded | Yes | No MathJax/CAS/MathLive/tray/Diary silo/Help→Ask merge; no EXPO_PUBLIC keys |

QE: 0 new DEFECT cards. No P0/P1 miss vs stamp.

---

## 3. Code choke points verified (QA Sup recheck)

- `mathTextCore.ts`: `KATEX_BASE_OPTIONS.trust=false`, throwOnError false, maxSize≤20, maxExpand≤1000; split `$`/`$$`/`\(`/`\[`; unmatched → text
- `MathText.web.tsx`: prose p/ol/ul + KaTeX spans only; dangerouslySetInnerHTML on **html** spans not whole model blob; baseline inline; display overflow-x
- `MathText.tsx` native: one offline WebView/bubble; originWhitelist about:blank; injectedJavaScript undefined; onShouldStartLoad blocks nav; clampNativeWebViewHeight; fail → Text (no empty slab); woff2 CSS
- Call sites MathText: `ask.tsx`, `ExplainDraftCard.tsx`, `todo/[submissionId].tsx`, `class/.../student/[studentId].tsx`, `MessageAttach.tsx`
- Refuse: `ask.tsx` GAUTH_REFUSAL_TITLE branch uses plain `<Text>`, not MathText
- Unit this run: **26/26 pass** (LATEX-S1-01..07, D-01..04, H-01, MATHUI L-01..06, native clamp/fonts/swipe)

---

## 4. Defect trail

| Item | Sev | Status after REL |
|---|---|---|
| QE new DEFECT cards | — | **none** (0 filed; 0 required) |
| Prior MATHUI P3 link caption `t_b00b9c48` | P3 | **done** (MessagePayloadView) |
| Prior native empty-slab / fonts | — | **done** `t_daa6a896` / `t_17793eea` |
| Open board DEFECT [P0]/[P1] MATH | — | **none** |
| Unrelated open P1 AVG parent grades `t_afaaf1e1` | P1 | sticky elsewhere — **not** MATH |

No leftover elevates to P0/P1 miss vs stamped MATH display intent.

**Evidence honesty:** QE prove-out is unit + static surface inspection (strong matrix for display/XSS). Live interactive dogfood screenshots were not attached; stamp §9 already noted units alone are not full phone dogfood. Independent recheck confirms the same unit matrix + refuse/call-site wiring. Given display-only scope, ASK REL already APPROVED for behavior locks, and zero MATH defects, incomplete screenshot dogfood does **not** rise to RELEASE REJECT for this slice.

---

## 5. Verdict

**RELEASE: APPROVED**

CEO IQG condition met: dual design stamp + prove-out PASS + no open P0/P1 FIX-NOW for MATH + QA Sup release evidence.

**QA Supervisor does not staff DevOps.** Do not reopen ASK REL (`t_cecf2af0` Diary NL stays parked). Do not rewrite `ask-iqg-intent.md`.

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/math-iqg-release.md` |
| OPEN ISSUES | none MATH P0/P1 |
| ESCALATION | No |
| NEXT | CoS reports; staff `devops-release` **only if Chuck wants MATH on git** (no force-push; no secrets). Do not auto-ship from this card. |

### RELEASE STAMP (card copy)

```
RELEASE STAMP
Feature: MATH/LaTeX — KaTeX MathText + prose/math/list (ASK+GAUTH display layer)
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_825f69e5 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met
```

### RECOMMENDED NEXT ACTION (CoS)

1. Report MATH IQG RELEASE APPROVED to Chuck.
2. Staff `devops-release` only if Chuck wants MATH/LaTeX commits on git — not automatic.
3. Do not restaff MATH eng; do not reopen ASK REL or `t_cecf2af0`.
4. Unrelated AVG P1 `t_afaaf1e1` stays on its own track.

*End MATH IQG release evidence — APPROVED 2026-09-10 (`t_825f69e5`).*
