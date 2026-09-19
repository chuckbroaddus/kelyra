# TEACH-PERF S1+S2 — Needs Attention first paint + chrome Needs cache — IQG real-world intent

**Date:** 2026-09-19  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_db3019ca` (this stamp) · Prior QAS draft: `t_f9465caa` (superseded for dual-stamp linkage)  
**PM lock (binding stories/AC/QG):** `notes/company/teach-sluggishness-s1s2-pm-lock.md` · PM card `t_ad80706f`  
**Architect SoT:** `t_b3fa0709` — remaining Teach sluggishness after host relief  
**Process:** `notes/company/INTENT_QUALITY_GATE.md`  
**Surviving product law:** `teach-ux-iqg-intent.md` · `needs-attention-tabs-always-visible-intent.md` · `teachUxLeftovers` L1/L2  
**Live baseline (RO):** `src/app/inbox.tsx` · `src/lib/captures/api.ts` · `src/lib/chrome/ChromeProvider.tsx` · `src/lib/chrome/teachUxLeftovers.test.ts` · `src/lib/chrome/trayTabs.ts`  
**Status:** Design-stage IQG intent for a **performance-correctness** bugfix (not a new visual feature). **No** `src` / SQL / Edge / qa-loop / git / designer pack / Eng from this card.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: TEACH-PERF S1+S2 — Needs Attention first paint (inbox waterfall) + chrome Needs TTL cache / tray-hop refetch relief
Quality goals: First WorkRow without waiting roster or signed thumbs; cold classId may show WorkingLine once; never flash empty before lists return; tray hop does not re-list all classes or re-count Needs on every pathname; dual-hat Office seat Needs=0; Parent seat 0; L2 badge predicates ≡ list predicates; mutation + class-switch invalidation; no new chrome; PersonTabs unchanged; S4 RPC not now (PM QG-01..08 · PERF-01..24 · US-PERF-01..12)
PM: APPROVED  date: 2026-09-19  profile-session: product-manager / t_ad80706f · notes/company/teach-sluggishness-s1s2-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-19  profile-session: qa-supervisor / t_db3019ca · notes/company/teach-sluggishness-s1s2-intent.md
Intent gaps remaining: none
```

**Dual stamp: MET.** Both PM and QA Supervisor APPROVED. Engineering may be staffed by CoS for **S1+S2 only** (optional S3 shared predicates same PR if cheap). Not self-staffed from this card.

**QA Supervisor stamp meaning:** Real-world intent for performance-correctness of existing Teach Needs Attention + tray Needs badge is fully specified — hats, chrome entry (existing only), full lifecycle (cold/refocus/hop/class switch/mutation/seat/leave), multiplicity, reverse/cancel, empty≠loading, L1/L2 survival, and explicit non-goals. Not happy-path only. Does **not** invent chrome. Does **not** authorize S4 RPC, PersonTabs change, Calendar Year, host ops as product fix, or designer restaff.

**PM stamp meaning (binding):** Stories + AC + QG on the PM lock cover quality goals. This intent file is the IQG Phase 1 real-world completeness companion; Eng implements **both**.

---

## 0. One-line law

On **Teach seat**, Needs Attention must show waiting work **as soon as the active class’s list queries return**, without holding first paint for roster photos, thumb signing, or a full `refreshTeacher` waterfall; and the Teach tray **Needs count** must be a **cheap class-keyed TTL snapshot** that is **not** re-fetched (and classes not re-listed + avatar-signed) on every tray hop when `classId` is unchanged and the cache is valid — while **never** lying about empty queues, dual-hat seats, or badge↔list predicates.

---

## 1. Hats (IQG Phase 1)

| Hat | S1 `/inbox` first paint | S2 Needs badge / chrome cache | Notes |
|---|---|---|---|
| **Teacher (pure Teach seat)** | **Yes** — primary | **Yes** — primary | Cold, refocus, class switch, assign sheet |
| **Teacher + parent (Teach seat)** | **Yes** | **Yes** | Same while `chrome.role === 'teacher'` (L1) |
| **Teacher + parent (Parent seat)** | **No** desk | **Needs = 0** | No Teach inbox; no Teach Needs badge |
| **Office + teacher (Teach seat)** | **Yes** | **Yes** | Seat wall, not JWT |
| **Office + teacher (Office seat)** | **No** | **Needs = 0** | L1: gate on seat `role === 'teacher'`, not profile hats |
| **Office pure (not teacher)** | **No** | **0** | |
| **Parent (non-teacher)** | **No** | **0** (parent bell separate) | |
| **Student** | **No** | Student todo/alerts path unchanged | Out of S1+S2 product change |
| **Superintendent** | **No** unless Teach seat | Seat law | |
| **Substitute / co-teacher on Teach seat** | **Yes** | **Yes** | RLS-scoped; same perf laws |
| **Signed-out / no teacher row** | Sign-in copy only | No Teach Needs | Live: “Sign in to see work that still needs a name.” |

**Dual-hat acceptance (binding):**

1. L1: Needs count + Teach inbox gate on **`chrome.role === 'teacher'`** only — never `isOfficeRole(profile)` or “has teacher row while on Office/Parent.”  
2. Teach → Office/Parent: Needs drops to **0** immediately; no sticky Teach badge.  
3. Office/Parent → Teach: restore Needs for active class (cache miss OK; must not stay zero forever if work exists).  
4. Parent seat never gains Teach Needs desk chrome as a primary job surface.

---

## 2. Entry (existing chrome only — do not invent)

Live Teach tray keys (leftovers L1/L6): `home` · `inbox` · `diary` · `calendar` · `ask` → labels **Desk · Needs Attention · Diary · Calendar · Ask (Kelyra)**. Route for Needs stays `/inbox`.

| Affordance | Where | Perf job under S1+S2 |
|---|---|---|
| Tray **Needs Attention** | Teach tray | Open `/inbox`; S1 first paint |
| Needs **badge count** | Tray/chrome `needsCount` | S2 TTL snapshot; count-only; not driven by hydrated thumbs |
| Other Teach tray hops | Desk / Diary / Calendar / Ask | S2: pathname must not force full `listClasses`+avatar-sign + `countNeedsYou` on cache hit + same class |
| Class context | `teacher.active_class_id` / `chrome.classId` / path class | S1 resolve without full `refreshTeacher` every focus |
| NT-A job tabs | Existing ContextMenuRow on `/inbox` | **Unchanged** visibility/occlusion law — not this perf card |
| Assign / name sheet | From Needs row | S1: roster loads **then**, not on cold critical path |
| Bell / `refreshChrome` / AppState / 12s poll | Existing | May refresh Needs; **dedup** with pathname effect same tick |

**Not entry / not this slice:** new tray keys; Capture-in-tray restore; Parent Needs; Calendar Year; PersonTabs motion; new badge glyphs; empty-copy marketing rewrite; filter-into-tray.

**Entry acceptance:** Teach taps Needs → WorkRows or true empty without multi-second WorkingLine gated on roster+thumbs+refreshTeacher. Teach hops with stable class feel snappy (no full class census + Needs re-count every hop). Non-Teach seats: no Teach Needs entry; count 0.

---

## 3. Full lifecycle

### 3.1 Start — cold first paint (S1)

```
Teach seat, cold /inbox
  → resolve classId from existing teacher.active_class_id / chrome.classId
      (do NOT require full refreshTeacher waterfall before lists when class known)
  → as soon as classId known: parallel listInbox ∥ listTurnedIn
  → paint WorkRows (initials / avatarName OK if thumbs not ready)
  → WorkingLine only while classId truly unknown OR lists in flight
  → NEVER show “Nothing waiting…” until both list queries have returned
  → listRoster deferred until assign sheet opens
  → signedThumbUrls may second-pass after first paint
  → list path: narrow columns (no model_draft/explain_draft on list; no answers/model_draft on turned-in list)
```

### 3.2 Change — refocus `/inbox`

```
Leave Needs → other tray → return (useFocusEffect)
  → may soft-refresh lists
  → must NOT re-pay full cold waterfall (no mandatory refreshTeacher + listRoster + thumbs before rows)
  → preferred: keep prior rows visible during soft refresh
  → still never flash empty before refresh completes
```

### 3.3 Change — tray hop (S2)

```
Teach seat, stable classId
  → hop Desk ↔ Needs ↔ Diary ↔ Calendar ↔ Ask
  → path/class display update OK
  → cache hit: NO listClasses+avatar-sign; NO countNeedsYou
  → cache miss / class change / refreshChrome / invalidation: refresh Needs snapshot
  → chrome pathname effect OR refreshBell same tick — not both at full count cost
  → 12s poll OR AppState-active full cost discipline (not both stacked on top of per-hop refetch)
  → refreshTeacher: if id + active_class_id unchanged, do not setTeacher(new object) solely to thrash chrome
```

### 3.4 Change — class switch

```
Switch active class
  → invalidate Needs cache for prior classId
  → count + /inbox lists bind to new classId
  → no cross-class row bleed; no stale prior-class badge after settle
  → empty/WorkingLine laws apply per new class first lists
```

### 3.5 Change — mutation invalidation

```
Assign / delete / draft process / attach / return-to-inbox / paths that change
unassigned|attached|draft captures or completed submissions membership
  → invalidate Needs TTL (or refreshChrome / equivalent)
  → badge updates in-session without waiting full ~15s TTL only
  → list reload path retained
```

### 3.6 Change — assign sheet

```
Open name/assign sheet
  → load listRoster if absent (sheet may brief-work)
  → never invent student (matcher law)
  → failure = error on sheet, not silent empty-file
```

### 3.7 Finish / reverse / cancel

| Action | Intent |
|---|---|
| Leave `/inbox` | Desk unmounts; Needs badge may retain last good count until TTL/invalidate |
| Seat off Teach / sign-out | Needs = 0 for non-Teach chrome; no residual Teach queue on Parent/Office |
| Leave mid-load | No crash; no permanent false empty; next entry clean |
| Cancel assign sheet | Lists/badge unchanged |
| Back from student/review to Needs | No forced full cold waterfall if class known |
| Hard error | Error/status path — not “Nothing waiting” success empty |
| Stale TTL while work arrives | Poll/AppState/mutation eventually correct; mutations must not rely on poll alone |

---

## 4. Multiplicity

| Case | Law |
|---|---|
| Many captures in Needs statuses | List + badge same status set; first paint yields without whole-class roster |
| Many completed (turned-in) | List + count both include `completed`; **do not** cap list without capping count (PERF-20); S4 later if still slow |
| Multiple taught classes | Active class only for Needs count/list; switch required for other class queue |
| Dual-hat seats | One seat at a time; Teach multiplicity only on Teach seat |
| Large roster | Cost on assign sheet, not cold first paint |
| Many thumbs | Second pass OK; initials until signed URLs |
| Host swap floor | Out of product stamp |

---

## 5. Empty vs loading (binding product law)

| State | UI |
|---|---|
| `classId` unknown / session not ready | WorkingLine or sign-in — **not** empty success |
| Lists in flight (incl. refocus with no prior rows) | WorkingLine / loading — **not** “Nothing waiting…” |
| Both lists returned empty | **Then** empty copy (live text retained) + Teach ingest entry if applicable |
| Lists returned with rows | WorkRows; empty hidden |
| Thumbs/roster still loading after lists | Rows stay; no revert to empty |

**Reject:** single `loaded` flag meaning “entire waterfall including roster+thumbs” if that delays first row or empty decision. Split classReady / rowsReady (names flexible) so empty ≠ loading.

---

## 6. Must-include behaviors (prove-out seed)

Aligned to PM US-PERF-01..12 / PERF-01..24 / QG-01..08. Severity if miss after Eng:

| ID | Behavior | Sev |
|---|---|---|
| TP-01 | Cold `/inbox`: first WorkRow (or true empty) does not wait on `listRoster` / full roster photo hydrate | P1 |
| TP-02 | Cold `/inbox`: first WorkRow does not wait on full `signedThumbUrls` pass (initials OK) | P1 |
| TP-03 | Cold `/inbox`: does not require full `refreshTeacher` chain before list fetches when classId already known | P1 |
| TP-04 | Never flash empty copy before `listInbox` + `listTurnedIn` both settle | P1 |
| TP-05 | WorkingLine only for true cold classId / lists-in-flight — not “world not ready” | P1 |
| TP-06 | Assign sheet open is when roster loads | P1 |
| TP-07 | Narrow list columns OK; must not drop WorkRow-needed fields; drafts JSON off critical path | P2 |
| TP-08 | L2: badge predicates ≡ list membership (captures unassigned\|attached\|draft + completed submissions) | P1 |
| TP-09 | L1: Needs only when `chrome.role === 'teacher'`; Office/Parent dual-hat = 0 | P1 |
| TP-10 | Parent seat Teach Needs = 0; non-Teach seats unchanged | P1 |
| TP-11 | Tray hops stable class + TTL hit: no full `listClasses`+avatar-sign + no `countNeedsYou` every hop | P1 |
| TP-12 | Needs TTL ~10–15s keyed by classId | P1 |
| TP-13 | Invalidate on membership mutations, `refreshChrome()`, class switch | P1 |
| TP-14 | Pathname effect: cache hit skips Needs re-count | P1 |
| TP-15 | Dedup chrome effect vs `refreshBell` same tick; poll/AppState cost discipline | P2 |
| TP-16 | `refreshTeacher` identity stability: unchanged id + active_class_id does not thrash chrome | P1 |
| TP-17 | Class switch: no stale prior-class badge/rows after settle | P1 |
| TP-18 | Refocus with existing rows: no empty flash | P1 |
| TP-19 | No new chrome / NT-A always-visible law untouched | P1 (reg) |
| TP-20 | PersonTabs cm-linear unchanged; S4 `count_needs_you` RPC not in this slice | P1 (scope) |

---

## 7. Explicit non-goals

1. Host machine hygiene (closing Expo tabs, swap) as the product fix.  
2. New UI/UX chrome packs, tray redesign, badge redesign, empty-copy marketing rewrite.  
3. PersonTabs motion pack revert or change.  
4. S4 `count_needs_you` RPC / SQL / live EXPLAIN (only if S1–S2 still leave count/list slow — new IQG).  
5. Capping turned-in list without count lockstep.  
6. Driving badge from fully hydrated inbox rows (thumbs blocking tray).  
7. Calendar Year / DITL / Review-sum / Journal chrome.  
8. Changing NT-A tab always-visible law.  
9. Changing dual-hat L1 seat gate semantics.  
10. Alerts RPC redesign (`countAlertsForMe` list-as-count) — secondary; not required in S1+S2 unless free.  
11. Matcher / Approve / Capture product behavior changes.  
12. Author studio.  
13. App code, git, SQL, qa-loop from this QAS card.  
14. DITL IMPACT — after user-visible land, not this design stamp.

---

## 8. Survive laws (unchanged product)

1. Nothing is a grade until teacher **Approves**.  
2. Matcher never inserts a student.  
3. Capture may have `student_id` null.  
4. Needs noun + `/inbox` route; Teach tray inventory per live leftovers (Desk·Needs·Diary·Calendar·Ask).  
5. Seat ≠ JWT; dual-hat trays never merge.  
6. RLS / `class_teacher_of` walls stay server-side; column narrowing is policy-neutral.  
7. L1/L2 leftover tests remain the contract spine (update symbols in same Eng PR if helpers move).  
8. Session expiry: dropping per-focus `refreshTeacher` must not invent a second auth protocol.

---

## 9. Live baseline pain (why this stamp exists — RO verification)

Static read 2026-09-19 confirms Architect diagnosis still true:

1. **`inbox.tsx` `load()`:** serial `refreshTeacher` → extra `teachers.active_class_id` → `resolveCaptureClass` → **`listRoster`** → then `Promise.all([listInbox, listTurnedIn])`. UI gates on single `loaded` with `<WorkingLine />` until the whole chain finishes; empty copy also waits on `loaded`.  
2. **`listInbox`:** `captures.select('*')` + `hydrateCaptures` including `signedThumbUrls` on the list path.  
3. **`listTurnedIn`:** unbounded `submissions.select('*')` completed.  
4. **`ChromeProvider` effect** deps include `pathname` + `teacher`: every hop runs `listClasses` + avatar path + `countNeedsYou` on Teach seat; **`refreshBell`** also `countNeedsYou` on 12s / AppState / identity change — double-pay risk.  
5. **L1/L2 leftovers:** seat gate + listTurnedIn/countNeedsYou agreement must survive the fix.

S1+S2 are the correct minimal product slice. No designer entry gap (entry already exists).

---

## 10. Gaps / REJECT triggers

**Intent gaps remaining (QAS): none.**

**REJECT / unstaff Eng if later:**

1. Eng expands to S4 RPC or PersonTabs/Calendar without restamp.  
2. Implementation flashes empty before lists return.  
3. Badge driven from hydrated rows or L2 predicates drift.  
4. Dual-hat Office/Parent shows Teach Needs.  
5. Roster returns to cold critical path.  
6. PM revises stories below US-PERF / TP coverage without QAS restamp.  
7. New chrome invented without designer + dual restamp.

---

## 11. IQG Phase 1 checklist (this stamp)

| Question | Answer |
|---|---|
| Hats | §1 — Teach primary; dual-hat Office=0 Needs; Parent seat 0; Student/Office pure out |
| Entry | §2 — existing Needs Attention tray + badge; no new chrome |
| Full lifecycle | §3 — cold, refocus, hop, class switch, mutation, assign, leave, seat |
| Multiplicity | §4 — many rows, many classes, large roster/thumbs, unbounded completed lockstep |
| Reverse / cancel | §3.7 |
| Explicit non-goals | §7 |
| Empty ≠ loading | §5 |
| L2 badge ≡ list | TP-08 / PERF-18 / US-PERF-08 |
| S4 not now | PERF-23 / TP-20 |

---

## 12. Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | Design-stage IQG intent + QAS DESIGN STAMP for TEACH-PERF S1+S2 against PM lock |
| **CONTEXT** | CEO long WorkingLine + residual across-board sluggish after host relief; Architect `t_b3fa0709` S1+S2; PM APPROVED `t_ad80706f` |
| **WORK PERFORMED** | Read PM lock, IQG SoT, Architect note, prior intent draft, live inbox/api/ChromeProvider/leftovers/trayTabs; wrote/updated this intent; stamped QAS APPROVED; dual stamp MET |
| **VERIFICATION** | Static RO baseline confirms waterfall + per-hop chrome refetch; PM lock covers hats/entry/lifecycle/multiplicity/reverse/non-goals + required dual-hat/empty/hop/class/mutation/L2/no-chrome/S4; no intent gaps; no src edits |
| **RESULT** | `notes/company/teach-sluggishness-s1s2-intent.md` · QAS **APPROVED** 2026-09-19 · dual stamp **MET** with PM lock |
| **OPEN ISSUES** | Eng discretion O1–O5 on PM lock (TTL exact seconds, soft-refresh keep-rows preference, mutation enum, unbounded completed until measure, host floor) — not design gaps |
| **ESCALATION NEEDED** | No |
| **RECOMMENDED NEXT ACTION** | **CoS staffs Eng S1+S2** (optional S3 shared filters same PR if cheap). No designer. No S4. After Eng loop terminal → QAS writes Phase 4 prove-out OBJECTIVE → CoS staffs `qa-engineer` against TP-01..20 / US-PERF-01..12 |
| **DITL IMPACT** | **NONE** this card (design-only). Revisit after user-visible land |
| **Next QA Engineer card (name for CoS after impl — do not staff now)** | `QE prove-out: Teach perf S1+S2 (TP-01..20 / US-PERF-01..12)` — parent feature Eng card; execute after QAS Phase 4 OBJECTIVE |

---

*End TEACH-PERF S1+S2 IQG intent — QA Supervisor DESIGN STAMP APPROVED 2026-09-19 (`t_db3019ca`). Dual stamp MET with PM `t_ad80706f`. CoS may staff Eng S1+S2.*
