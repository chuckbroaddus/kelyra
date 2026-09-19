# TEACH-PERF S1+S2 — Needs Attention first paint + chrome Needs cache (PM lock)

**Date:** 2026-09-19  
**Author:** product-manager (Kelyra)  
**Card:** `t_ad80706f`  
**Architect parent (diagnosis SoT):** `t_b3fa0709` — remaining Teach sluggishness after host relief  
**IQG process:** `notes/company/INTENT_QUALITY_GATE.md`  
**Prior product law (survives):** Teach UX IQG (`teach-ux-iqg-intent.md`), NT-A Needs Attention tabs always-visible (`needs-attention-tabs-always-visible-intent.md`), L1 dual-hat seat gate + L2 badge/list predicates (`teachUxLeftovers.test.ts`)  
**Live baseline (read-only):** `src/app/inbox.tsx` · `src/lib/captures/api.ts` · `src/lib/chrome/ChromeProvider.tsx` · `src/lib/chrome/teachUxLeftovers.test.ts`  
**Status:** BINDING product lock for **performance-correctness** of Teach Needs Attention first paint (S1) and app-wide chrome Needs snapshot (S2). Spec only — **no** `src/`, SQL, Edge, qa-loop, git, designer pack, or Eng staffing on this card.

**Parallel IQG:** QA Supervisor owns intent stamp against this lock (child of `t_ad80706f`). **Dual stamp required before CoS staffs Eng S1+S2.**

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: TEACH-PERF S1+S2 — Needs Attention first paint (inbox waterfall) + chrome Needs TTL cache / tray-hop refetch relief
Quality goals: First WorkRow without waiting roster or signed thumbs; cold classId may show WorkingLine once; never flash empty before lists return; tray hop does not re-list all classes or re-count Needs on every pathname; dual-hat Office seat Needs=0; L2 badge predicates ≡ list predicates; no new chrome; PersonTabs unchanged; S4 RPC not now
PM: APPROVED  date: 2026-09-19  profile-session: product-manager / t_ad80706f · notes/company/teach-sluggishness-s1s2-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-19  profile-session: qa-supervisor / t_db3019ca · notes/company/teach-sluggishness-s1s2-intent.md
Intent gaps remaining: none
```

**PM stamp meaning:** Stories + AC cover hats, Needs Attention entry, tray hops, cold vs refocus, empty vs loading, dual-hat Office=0 Needs, mutation invalidation, class switch, session honesty, L2 agreement, and explicit non-goals from Architect S1+S2. Does **not** invent chrome. Does **not** design a competing pack. Does **not** implement. Does **not** staff Eng. Does **not** authorize S4 RPC or PersonTabs revert.

**QA Supervisor stamp meaning:** Real-world intent complete (hats, entry, lifecycle, multiplicity, reverse, empty≠loading, dual-hat, L2, non-goals). Intent note: `notes/company/teach-sluggishness-s1s2-intent.md`.

**Dual stamp:** **MET** 2026-09-19. CoS may staff Eng S1+S2 (optional S3 same PR if cheap). No designer. No S4.

---

## 0. Binding scope (Architect S1+S2 only)

| Slice | In | Out |
|---|---|---|
| **S1 Inbox** | Resolve `classId` from existing `teacher.active_class_id` / `chrome.classId`; parallel `listInbox` + `listTurnedIn` ASAP; paint WorkRows (initials OK); defer `listRoster` to assign sheet; defer `signedThumbUrls` after first paint; WorkingLine only for true cold `classId`; never flash “Nothing waiting” before lists return; narrow list columns (no draft JSON on list path) | New chrome, new tabs, new empty-copy redesign, PersonTabs motion, host/tab hygiene as product fix |
| **S2 Chrome** | TTL ~10–15s cache `{ needsCount, fetchedAt }` keyed by `classId`; invalidate on inbox mutations / `refreshChrome` / class switch; pathname updates `pathClass`/`classId` without `listClasses`+avatar-sign or `countNeedsYou` unless class changed or cache miss; dedup chrome effect vs `refreshBell` same tick; keep 12s poll **or** AppState-active full cost, not both stacked full cost on every hop; `refreshTeacher` skip `setTeacher` when id + `active_class_id` unchanged | Redesign tray, new badge glyph, freeze tray hide, change NT-A tabs, S4 `count_needs_you` RPC |
| **S3 (optional same Eng PR if cheap)** | Shared `needsCaptureFilter` + `completedSubmissionFilter` so L2 cannot drift | Required separate card only if S1+S2 land without it and L2 would break |
| **S4** | **Not now** | Live EXPLAIN / new RPC until S1–S2 still leave count/list slow |

**CEO problem this locks (experience-first):** Needs Attention sat on `WorkingLine` a long time; tray/system felt sluggish across the board after host relief (extra Expo tabs closed). Remaining app cause is **inbox first-paint waterfall** + **chrome refetch on every hop / teacher identity thrash** — not host as primary remaining product fix.

---

## 1. Quality goals (binding)

| ID | Goal | Pass bar |
|---|---|---|
| **QG-01** | **First WorkRow without roster/thumbs** | On Teach `/inbox` cold visit with known `classId`, first capture or turned-in **WorkRow** paints after list queries return — **without** waiting for full `listRoster` photo hydrate or capture `signedThumbUrls`. Initials / placeholder thumb OK until second pass. |
| **QG-02** | **WorkingLine honesty** | `WorkingLine` only while `classId` is unknown **or** list queries for that `classId` have not returned. No indefinite WorkingLine after lists settle. |
| **QG-03** | **Empty ≠ loading** | Never show “Nothing waiting…” (or equivalent empty copy) until **both** inbox list and turned-in list have returned for the active `classId` (success or hard error path). `rowsReady` ≠ empty. |
| **QG-04** | **Tray hop cheap** | Teach seat hop Desk ↔ Needs ↔ Diary ↔ Calendar ↔ Ask does **not** re-run full `listClasses` + avatar-sign for every class **and** does **not** re-run `countNeedsYou` on every pathname when `classId` unchanged and Needs TTL cache hit. |
| **QG-05** | **Badge ≡ list predicates** | `countNeedsYou` and inbox lists stay on the **same** capture status set (`unassigned`/`attached`/`draft`) and turned-in `submissions.status = completed`. L2 leftover test remains true (symbols may move to shared helpers). |
| **QG-06** | **Dual-hat Office = 0 Needs** | Chrome seat `role !== 'teacher'` → Needs count **0** and no Teach Needs badge inflation. Office seat of dual-hat teacher stays 0 even if `also_teacher`. L1 law. |
| **QG-07** | **No new chrome** | No new tray slots, glyphs, tab row, or empty-state redesign. Performance of **existing** Needs Attention + tray badge only. |
| **QG-08** | **Mutation freshness** | After teacher actions that change Needs membership (assign, draft process, approve path that removes from Needs, return-to-inbox, etc.), badge and list refresh within the same session without waiting full TTL — invalidate cache / `refreshChrome` as Architect specified. |

---

## 2. Hats

| Hat | Needs Attention `/inbox` S1 | Needs badge / tray S2 | Notes |
|---|---|---|---|
| **Teacher (Teach seat)** | **Yes** — primary | **Yes** — `countNeedsYou(active class)` | Cold + refocus + empty/loading laws |
| **Teacher + parent (Teach seat)** | **Yes** | **Yes** | Same as teacher |
| **Teacher + parent (Parent seat)** | **No** desk | **0** Needs | No Teach flash; Parent tray unchanged |
| **Office / admin (Office seat), also_teacher** | **No** Teach Needs desk as Office | **0** Needs | L1: gate on `chrome.role === 'teacher'`, not `isOfficeRole` invert-wrong |
| **Office pure (not teacher)** | **No** | **0** | |
| **Parent (non-teacher)** | **No** | **0** Needs (parent bell separate) | |
| **Student** | **No** | Student todo badge path unchanged | Out of S1+S2 product change |
| **Superintendent** | **No** unless Teach seat | Seat law | |
| **Substitute / co-teacher on Teach seat** | **Yes** | **Yes** RLS-scoped | Same perf laws |
| **Signed-out** | Sign-in copy only | No Needs | |

**Dual-hat acceptance (binding):**  
- Teach → Office/Parent: Needs count drops to **0** immediately on seat chrome; no sticky Teach badge on Office.  
- Office/Parent → Teach: Needs may show cached or fresh count for active class; `/inbox` available on Teach tray only.

---

## 3. Entry (existing chrome — do not redesign)

| Affordance | Where | Job under S1+S2 |
|---|---|---|
| Tray **Needs Attention** | Teach tray (inventory unchanged: Desk · Needs Attention · Diary · Calendar · Ask per current tray law) | Open `/inbox`; first paint follows S1 |
| Needs **badge count** | Tray / chrome badge using `needsCount` | S2 TTL snapshot; not driven by hydrated thumbs |
| NT-A job tabs | Existing ContextMenuRow on `/inbox` | **Unchanged** visibility/occlusion law; not part of this perf card |
| Class context | `teacher.active_class_id` / `chrome.classId` / path class | S1 resolves without full `refreshTeacher` every focus |

**Not entry / not this card:** New chrome, Capture tray restore, filter-into-tray, PersonTabs pack change, Calendar Year, DITL.

---

## 4. Product laws (PERF-01…)

| Law | Statement |
|---|---|
| **PERF-01** | On `/inbox` focus, do **not** call full `refreshTeacher` (session + profile + grants + teacher reload) **every** time when Teach session + teacher id already known. |
| **PERF-02** | Resolve `classId` from **existing** `teacher.active_class_id` and/or `chrome.classId` (and path class if already chrome law) before any list fetch. |
| **PERF-03** | As soon as `classId` is known, start **`listInbox` ∥ `listTurnedIn`** in parallel. Do **not** wait on `listRoster` or thumb signing. |
| **PERF-04** | Paint WorkRows when list data arrives. Initials OK. Photo thumbs may fill in after first paint. |
| **PERF-05** | Load `listRoster` only when the **assign sheet** (or equivalent name-pick UI) opens — not on every inbox focus. |
| **PERF-06** | Defer `signedThumbUrls` (capture thumbs) to a **second pass** after first WorkRow-capable paint. |
| **PERF-07** | `WorkingLine` only for **true cold** unknown `classId` or in-flight first list fetch for that class. Refocus with known class + prior rows may soft-refresh without full-screen WorkingLine gate if product keeps rows visible (preferred); if soft-refresh not implemented, still must not flash empty. |
| **PERF-08** | **Never** flash empty copy before both list queries return for the active `classId`. |
| **PERF-09** | List queries **narrow columns**: captures without `model_draft` / `explain_draft` on the list path; submissions without `answers` / `model_draft` on the turned-in list path. Detail/review routes may still load drafts when opened. |
| **PERF-10** | Chrome holds Needs snapshot `{ needsCount, fetchedAt }` keyed by `classId` with TTL **10–15s**. |
| **PERF-11** | Invalidate Needs cache on: inbox membership mutations, explicit `refreshChrome()`, **class switch**, seat switch away/to Teach as needed for honesty. |
| **PERF-12** | Pathname-only navigation with **same** `classId` and **cache hit**: update path/class display state as required; **do not** `listClasses`+sign every class avatar; **do not** `countNeedsYou`. |
| **PERF-13** | `listClasses` + avatar sign run when classes unknown, class set stale, explicit refresh, or class membership change — **not** every tray hop. |
| **PERF-14** | Dedup: chrome pathname/tick effect and `refreshBell` must **not** both pay full `countNeedsYou` on the **same tick**. |
| **PERF-15** | Keep either **12s poll** or **AppState-active** full Needs refresh cost discipline — do not stack both at full cost on top of per-hop refetch (Architect: not both at full cost). Realtime alert subscribe may still nudge bell without forcing full class list. |
| **PERF-16** | `refreshTeacher` / teacher state: if `id` + `active_class_id` unchanged, **do not** `setTeacher(new object)` solely to thrash chrome deps. |
| **PERF-17** | Needs count gate remains **`chrome.role === 'teacher'`** only (L1). |
| **PERF-18** | Badge count and list membership use **identical predicates** (L2). Shared helpers (S3) preferred in same PR if cheap. |
| **PERF-19** | Do **not** drive tray badge from hydrated inbox rows (thumbs must not block tray). |
| **PERF-20** | Do **not** cap the turned-in **list** without the same cap on the **count** (badge/list agreement). Unbounded completed set stays until S4. |
| **PERF-21** | Session expiry: dropping per-focus `refreshTeacher` must not invent a second auth protocol; rely on existing auth/chrome session load paths. If session dead, signed-out / reauth behavior unchanged. |
| **PERF-22** | **PersonTabs / cm-linear:** no change on this card. |
| **PERF-23** | **S4 RPC / live EXPLAIN:** not authorized by this stamp. |
| **PERF-24** | **No new chrome** / no designer restaff unless QAS REJECT for missing entry (not expected). |

---

## 5. User stories

### US-PERF-01 — Cold Needs Attention first paint (primary CEO pain)

**As a** teacher on Teach seat  
**I want** Needs Attention to show my waiting work as soon as the class lists return  
**So that** I am not stuck on WorkingLine while roster photos and thumbs finish.

**Acceptance (AC-PERF-01):**  
1. Cold open `/inbox` with teacher session + known active class: lists start without waiting full roster hydrate.  
2. When either list has rows, WorkRows paint (initials OK).  
3. WorkingLine is not shown after lists have returned successfully.  
4. Thumbs may appear moments later without replacing the whole screen with WorkingLine.  
5. Assign sheet still has roster when opened (lazy load OK; sheet may show its own brief working state if roster not ready).

### US-PERF-02 — Never false empty

**As a** teacher  
**I want** the empty state only when there is truly nothing waiting  
**So that** I do not think work vanished during load.

**Acceptance (AC-PERF-02):**  
1. While list fetches in flight for active `classId`, empty copy is **hidden**.  
2. Empty copy shows only after both lists return empty (or equivalent combined empty).  
3. Hard error shows status/error path — not “Nothing waiting” pretending success.

### US-PERF-03 — Refocus / return to Needs

**As a** teacher who leaves Needs and comes back  
**I want** a fast return without re-paying the full cold waterfall  
**So that** tray use feels snappy.

**Acceptance (AC-PERF-03):**  
1. Refocus `/inbox` with same `classId` does **not** require full `refreshTeacher` + `listRoster` + thumb sign before showing existing or refreshed rows.  
2. Soft refresh of lists may run; must obey AC-PERF-02 (no empty flash).  
3. Preferred: keep prior rows visible during soft refresh; if not, WorkingLine only if no rowsReady yet for this class.

### US-PERF-04 — Tray hop without class census

**As a** teacher hopping tray destinations  
**I want** chrome not to re-download every class + avatars and re-count Needs on every hop  
**So that** the whole Teach app feels less sluggish.

**Acceptance (AC-PERF-04):**  
1. Pathname change with same Teach seat + same `classId` + fresh Needs TTL cache: **no** `countNeedsYou` network; **no** full `listClasses`+avatar-sign.  
2. Needs badge continues to show last good `needsCount` until TTL miss, invalidation, or class switch.  
3. First Teach session / cold chrome may still load classes once.

### US-PERF-05 — Class switch freshness

**As a** teacher switching active class  
**I want** Needs count and inbox lists for the **new** class  
**So that** I never grade/review the wrong class queue from a stale badge.

**Acceptance (AC-PERF-05):**  
1. Class switch invalidates Needs cache for prior key and loads count for new `classId`.  
2. `/inbox` lists bind to new `classId`; no cross-class row bleed.  
3. WorkingLine/empty laws apply per new class cold/first lists.

### US-PERF-06 — Mutation invalidation

**As a** teacher who assigns a name, processes drafts, or otherwise changes Needs membership  
**I want** the tray badge to update without waiting ~15s  
**So that** badge and desk stay trustworthy.

**Acceptance (AC-PERF-06):**  
1. Membership-changing inbox actions invalidate Needs TTL (or call `refreshChrome` / equivalent).  
2. Badge updates in-session after mutation settles (same bar as today’s refresh intent, without requiring full class list reload).  
3. List on `/inbox` reflects mutation after its own reload path (existing product behavior retained; may share invalidate).

### US-PERF-07 — Dual-hat Office Needs = 0

**As an** office administrator who is also a teacher  
**I want** Office seat chrome to show **0** Needs  
**So that** office work is not mixed with Teach queues.

**Acceptance (AC-PERF-07):**  
1. `chrome.role !== 'teacher'` ⇒ `needsCount === 0` (L1).  
2. Switching Teach → Office clears Teach Needs from badge.  
3. Switching Office → Teach restores Teach Needs path (cache or fetch).  
4. Parent seat of dual-hat: 0 Teach Needs (existing seat law).

### US-PERF-08 — Badge matches desk predicates

**As a** teacher  
**I want** the Needs number to match what Needs Attention lists  
**So that** I trust the tray.

**Acceptance (AC-PERF-08):**  
1. Count = captures in `unassigned|attached|draft` for class **+** submissions `completed` for class assignments (current product math).  
2. List shows the same membership families (captures via `listInbox`, turned-in via `listTurnedIn`).  
3. `teachUxLeftovers` L2 remains green; shared filters OK.  
4. Narrow columns must not drop rows that still belong in Needs.

### US-PERF-09 — Dedup chrome vs bell

**As a** teacher using the app with network cost in mind  
**I want** one Needs count work per tick, not double  
**So that** hops stay light.

**Acceptance (AC-PERF-09):**  
1. Same-tick pathname effect + `refreshBell` do not both issue full `countNeedsYou` when one would suffice.  
2. 12s poll and AppState-active do not stack **full** duplicate cost on top of per-hop refetch (Architect discipline).  
3. Alert realtime may update alert portion of badge without forcing class census.

### US-PERF-10 — refreshTeacher stability

**As a** teacher opening Needs  
**I want** inbox load not to thrash chrome by rewriting identical teacher state  
**So that** S2 cache is not defeated every focus.

**Acceptance (AC-PERF-10):**  
1. When teacher `id` + `active_class_id` unchanged, skip `setTeacher` identity thrash.  
2. Inbox focus alone does not force chrome `listClasses` + `countNeedsYou` via teacher object churn.  
3. Real teacher/class changes still propagate.

### US-PERF-11 — Assign sheet still works (deferred roster)

**As a** teacher naming a capture  
**I want** the roster when I open assign  
**So that** performance deferral does not break filing.

**Acceptance (AC-PERF-11):**  
1. Opening assign/name sheet loads roster if not present.  
2. Filter-by-name on sheet works once roster loaded.  
3. Failure to load roster shows error on sheet — does not silently empty-file a student (never invent student — existing law).

### US-PERF-12 — Non-Teach hats unchanged

**As a** parent or student  
**I want** my chrome unaffected by Teach perf work  
**So that** S1+S2 do not regress other seats.

**Acceptance (AC-PERF-12):**  
1. Parent bell path unchanged in product behavior.  
2. Student todo badge path unchanged.  
3. No Needs Attention tray key added for non-Teach seats.

---

## 6. Lifecycle matrix (IQG)

| Phase | Behavior under stamp |
|---|---|
| **Start (cold Teach, open Needs)** | Resolve classId → parallel lists → paint rows; WorkingLine only if needed; no empty flash |
| **Start (cold Teach, other tray first)** | Chrome may load classes once; Needs count via cache/fetch once per classId; hops reuse |
| **Change (tray hop)** | Path update; cache hit skips count + listClasses |
| **Change (class switch)** | Invalidate; new class count + inbox bind |
| **Change (mutation)** | Invalidate Needs; list reload as today |
| **Change (seat switch)** | Office/Parent Needs=0; Teach restores |
| **Finish (leave Needs)** | No requirement to clear rows; cache may retain count until TTL/invalidate |
| **Reverse (back to Needs)** | Refocus laws US-PERF-03 |
| **Cancel / error** | Error status ≠ empty success; badge catch stays safe (0 on hard chrome failure paths as today) |
| **Multiplicity (many classes)** | Active class only for Needs count/list; class switch required to see other class queue |
| **Multiplicity (large completed set)** | Still list+count unbounded (PERF-20); S4 later if slow |

---

## 7. Non-goals (explicit)

1. Host machine hygiene (closing Expo tabs, swap) as the product “fix.”  
2. New UI/UX chrome packs, tray redesign, badge redesign, empty-copy marketing rewrite.  
3. PersonTabs motion pack revert or change.  
4. S4 `count_needs_you` RPC / SQL / live EXPLAIN.  
5. Capping turned-in list without count lockstep.  
6. Driving badge from fully hydrated inbox rows.  
7. Calendar Year / DITL / Review-sum / Journal chrome.  
8. Changing NT-A tab always-visible law.  
9. Changing dual-hat L1 seat gate semantics.  
10. Author studio.  
11. Implementing on this card / qa-loop from PM.

---

## 8. Eng implementation notes (non-binding shape; Architect binding intent)

Engineers implement **stamped laws**, not a thinner happy path. Suggested shape from Architect (may vary if laws hold):

**S1 — `inbox.tsx` + `captures/api.ts`**  
- classId from existing teacher/chrome first.  
- Parallel lists immediately.  
- Split `loaded` into classReady / rowsReady (names flexible) so empty and WorkingLine obey PERF-07/08.  
- Defer roster + thumbs.  
- Narrow select columns on list path.

**S2 — `ChromeProvider.tsx`**  
- Module/state TTL cache per classId for needsCount.  
- Pathname effect: cheap path vs full refresh.  
- Dedup bell vs effect.  
- Stabilize refreshTeacher setState.

**S3 — optional same PR**  
- Shared predicate helpers; update L2 test if symbols move.

**Tests:** keep/adjust `teachUxLeftovers` L1/L2; add unit/integration for cache hit skip and empty-vs-loading if feasible without full E2E.

**Verify (prove-out later, not this card):** network panel on cold `/inbox` and one tray circuit; time-to-first-WorkRow; count of `countNeedsYou` / `listClasses` calls.

---

## 9. Stories ↔ Architect map

| Architect item | Stories / laws |
|---|---|
| S1 yield list, don’t wait for world | US-PERF-01, 02, 03, 11 · PERF-01–09 |
| S2 one Needs snapshot | US-PERF-04, 05, 06, 09, 10 · PERF-10–16 |
| L1 dual-hat | US-PERF-07 · PERF-17 |
| L2 predicates | US-PERF-08 · PERF-18–20 |
| S3 shared filters | PERF-18 optional same PR |
| S4 RPC not now | PERF-23 non-goal |
| PersonTabs no change | PERF-22 non-goal |

---

## 10. Open issues / assumptions

| # | Item | Disposition |
|---|---|---|
| O1 | Exact TTL seconds in 10–15 range | Eng pick; document constant |
| O2 | Soft-refresh keep-rows vs brief WorkingLine on refocus | Prefer keep-rows; both OK if no empty flash |
| O3 | Which mutations call invalidate | All Needs membership changes; Eng enumerate from inbox actions |
| O4 | Unbounded completed payload cost | Accept until post-S1+S2 measure; S4 later |
| O5 | Host swap floor | Out of product stamp |

**Intent gaps remaining (PM):** **none** for design-stage S1+S2 performance-correctness.

---

## 11. Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | Stories + AC + PM DESIGN STAMP for Architect S1+S2 Teach perf (Needs first paint + chrome Needs cache). |
| **CONTEXT** | CEO long WorkingLine + across-board sluggish after host relief; Architect `t_b3fa0709` ranked inbox waterfall + chrome refetch. |
| **WORK PERFORMED** | Wrote binding lock `notes/company/teach-sluggishness-s1s2-pm-lock.md` with hats, entry, lifecycle, 12 stories, PERF-01..24, QG-01..08, non-goals, dual-hat + L2, PM stamp APPROVED. |
| **VERIFICATION** | Static baseline read of inbox load, countNeedsYou/listInbox/listTurnedIn, ChromeProvider effect+refreshBell, L1/L2 leftovers; aligned to Architect comment; no src edits. |
| **RESULT** | PM DESIGN STAMP **APPROVED** 2026-09-19. QAS DESIGN STAMP **APPROVED** 2026-09-19 (`t_db3019ca`). Dual stamp **MET**. |
| **OPEN ISSUES** | O1–O5 minor Eng discretion only (not design gaps). |
| **ESCALATION NEEDED** | No. |
| **RECOMMENDED NEXT ACTION** | **CoS staffs Eng S1+S2** (optional S3 shared predicates same PR if cheap). No designer. No S4. After Eng loop terminal → QAS Phase 4 OBJECTIVE → `qa-engineer` prove-out. |

---

*End TEACH-PERF S1+S2 PM lock — product-manager `t_ad80706f`.*
