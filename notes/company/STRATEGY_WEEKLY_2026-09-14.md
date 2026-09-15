# Kelyra Strategy brief — week of 2026-09-14 (Chicago)

**Author:** strategy (Kelyra Strategy)
**Audience:** CoS weekly leadership sync
**Board SoT:** Hermes `kelyra` (done=461, blocked=138, running=4, ready=1 I4)
**No app code. No git. No SQL. Do not staff other roles.**

---

## OBJECTIVE

Recommend 3–5 company priorities for this Chicago week and name any strategy locks to escalate to CEO Chuck. Rank school-pilot readiness, BATCH-v1 remainder, IQG defect burn, DITL, Author studio, and parked Ask NL. Do not implement product or code.

## CONTEXT

- CoS weekly sync cron. SuperGrok week reset this morning (ARM 2026-09-14: weekly 100%; daily ~8% after 4 specialist-sync grants). Grok Bot weekly ~54%, daily 14%, reset Sat 2026-09-19 15:51 CT.
- CEO locks in force: BATCH-v1 = web stack + Split Review + TUS only; hot folder v2+; never send whole PDF to a model; REL APPROVED ≠ git ship; Ask NL (Dear Diary) parked until Chuck unparks; no kelyra.app DNS until Chuck says.
- IQG BATCH parent `t_50edbe72` still open/blocked as tracker. I3 done. I4 `t_a069938c` ready (senior-developer). ARM: retry I4 GRANT this week.
- DITL EXEC queue ~67 cards sticky blocked unassigned (Chuck gate). DITL Test Findings + seed SQL still gated.
- Product bar: Teacher chrome still cluttered vs Superintendent/Student. Mobile pre-auth portrait-only. School-pilot LessonWebView L1 applied 2026-09-03.

## REQUIREMENTS

1-page structured handoff. Ranked weekly bets. CEO-only irreversible/spend/legal called out. No unpark Ask NL. No DNS recommendation.

## CONSTRAINTS

Do not staff other roles. Do not unpark Ask NL. Do not recommend kelyra.app DNS. Do not pull hot folder into v1.

## FILES/AREAS

`notes/company/KELYRA_MAP.md`, `INTENT_QUALITY_GATE.md`, `EXECUTABLE_ORG.md`, `DITL_OS.md`, `ARM_WEEKLY_2026-09-14.md`, board `kelyra` (`t_50edbe72`, `t_a069938c`, `t_cecf2af0`, `t_7ebea568`, `t_6e04cbbd`).

## WORK PERFORMED

Read map, IQG, Executable Org, DITL OS, ARM weekly 2026-09-14, BATCH parent `t_50edbe72` (comments through I3 passed / I4 staffed), I4 body, Ask NL `t_cecf2af0`, DITL program `t_7ebea568`, Author TRACK `t_6e04cbbd`, PM weekly 2026-09-08 (chrome/HOLD baseline), `docs/mvp.md` core loop. Queried board `kelyra` kanban.db for status counts, BATCH/IQG/DITL/CAL/HOLD cards. No code, no git, no SQL.

## VERIFICATION

- Board 2026-09-14 ~09:33 CT: archived=12, blocked=138, done=461, running=4 (this sync: strategy / PM / architect; I4 is **ready** not running). Matches CoS “~598 / 461 done / ~137 blocked.”
- BATCH: I0–I3 done; parent tracker still blocked; I4 ready; I5 not staffed; hot folder absent from I0–I6. Dual stamp already met (PM + QAS 2026-09-12).
- DITL EXEC blocked unassigned: **67**. DITL-SEED execute/apply cards still blocked. Author studio TRACK blocked until Chuck.
- Ask NL `t_cecf2af0` remains blocked/unassigned. No DNS cards opened.

## RESULT

**Thesis:** This week’s company bet is **finish the teacher capture loop the school can actually run** (BATCH-v1 I4→I5 on the existing desk). Do not open new surfaces. School-pilot readiness is a **prove-out of that loop**, not a domain cutover.

### Ranked weekly bets (lead vs wait)

**1 — Lead: BATCH-v1 remainder (I4, then I5).**
I3 already turns Confirm into unassigned captures. I4 is the stamped NA-A close: Inbox lists batch packets; attach via existing tools; unnamed = no gap AI; <=4 page JPEGs; never class PDF to a model; never auto-Approve. I5 (partial fail + retry) is the rest of the stamped v1 slice, not a new epic. ARM already says retry I4 GRANT this week. SuperGrok daily is tight (~8% after this sync) — prefer I4 on SuperGrok; use Grok Bot wallet (~14% daily / ~54% weekly) if SuperGrok cannot GRANT, same constraints (no git, no live SQL, no hot folder). Do not staff I6 chrome recut or Drive/hot-folder. Leave BATCH P2/P3 leftovers sticky unless they block I4/I5.

**2 — Lead (prove, do not build): school-pilot readiness.**
LessonWebView L1 is already on (2026-09-03). Pilot this week = teacher can (a) phone-capture + Approve, (b) web stack ingest once I4 lands, (c) student Open in-app WebView — without kelyra.app DNS, public class URL, or App Store. Teacher chrome vs Super/Student remains a dogfood bar, not a rewrite: TEACH-UX already shipped; a CEO walk of Desk / Capture / Needs / Class / Ask is enough. Q18 lesson-assign stays acceptance-run, not a Build send (`t_7d367b42`).

**3 — Conditional: IQG P0/P1 defect burn only.**
IQG is standing law; PM auto-disposes defects. Burn SuperGrok on FIX-NOW P0/P1 that break a live school flow — not GAUTH/DIARY retro paperwork unless QAS already has a prove-out OBJECTIVE waiting. Known gated P0: DITL Test Finding username sign-in 401 (`t_cddd654c`) is farm-blocked until seed/email apply (CEO/DevOps), not an Eng freestyle. GAUTH-Q1 `t_ab9d7f9f` and DIARY post-mortem `t_b6b8e31b` stay on CoS/QAS track; do not let them jump I4. P2/P3 BATCH leftovers and CAL-R2 A leftovers wait the Sunday leftover window.

**4 — Wait: DITL EXEC + seed SQL.**
~67 EXEC cards sticky unassigned on a Chuck gate. Seed apply (`t_4229a0ea` and siblings) still gated. Running EXEC without a working ditl-* login is theater. Strategy does not recommend staffing the queue this week unless Chuck unblocks seed apply first. DITL-UPDATE for BATCH (`t_f4f237ab`) also waits Chuck — plans were already rewritten 2026-09-12 (`t_407a9f4a` done); do not restaff.

**5 — Wait: Author studio.**
TRACK `t_6e04cbbd` sticky until Chuck. Class-app farm pack-emit is DITL GAP #9, not a school-pilot blocker while LessonWebView L1 hosts existing packs. Do not pull Author into this week's 3-5.

**Parked — Ask NL Dear Diary (`t_cecf2af0`).**
Stay parked. Diary v1 already ships Save-in-composer. NL capture is convenience, not the capture loop. Do not unpark.

### Strategy locks to keep (already CEO)

- BATCH-v1 = web upload + Split Review + TUS + page JPEGs. Hot folder / Drive / QR / header OCR = v2+.
- Never send the class PDF to a model. Paid AI only. Matcher never inserts a student. Confirm != Approve.
- REL APPROVED is not git ship. Git ship + live SQL = devops-release after CEO/CoS auth.
- Ask NL stays parked. No kelyra.app DNS.

### CEO-only this week (irreversible / spend / legal)

Do not do without Chuck: kelyra.app DNS; public/pre-auth class URL; App Store / Play; DPA or "school official" FERPA claim; unpark Ask NL; pull hot folder / Full Disk Access into v1; unblock PPT `t_7fb77277` or Attendance `t_7b12ad6f`; apply DITL seed SQL or unblock the 67-card EXEC queue; any git merge/push or live SQL (even after REL APPROVED).

### CEO asks (two; else none)

1. **DITL farm:** Unblock seed SQL apply this week so EXEC can eventually run, or keep the farm dark? Strategy recommends keep dark until I4 lands — do not spend SuperGrok on 67 EXEC cards while ditl-* login 401s.
2. **School-pilot date:** Is there a named school/week, or is "readiness" still internal dogfood? If unnamed, do not staff landing-page / DNS / Author farm.

No ask to change BATCH-v1 slice, Ask NL, or DNS — those locks stay.

## OPEN ISSUES

- I4 is ready but not yet GRANTed/running this morning; CoS+ARM own the fill, not Strategy.
- CAL-R2 Phase E merged on class-app main while phase B-E cards still say "parked until prior phase" — CoS hygiene, not a new company bet. Calendar is not this week's lead.
- Teacher chrome clutter vs Super/Student is still the product bar; Strategy is not opening a TEACH-UX rewrite.
- RIDE 7-day photo TTL still ops-unproven (architect 2026-09-08); FERPA honesty, not this week's Build.

## ESCALATION NEEDED

- @chief-of-staff: roll this ranking into the sync report. Staff I4 (ARM GRANT already recommended by ARM weekly). Do not staff DITL EXEC, Author TRACK, or Ask NL from this card.
- CEO Chuck: only the two asks above. No new strategy lock.

## RECOMMENDED NEXT ACTION

CoS uses this brief as the Strategy section of the 2026-09-14 leadership sync. Company sequence: I4 (then I5) -> CEO dogfood of teacher desk + stack ingest -> IQG P0/P1 only if they block that loop. Everything else waits. Artifact: `notes/company/STRATEGY_WEEKLY_2026-09-14.md`.
