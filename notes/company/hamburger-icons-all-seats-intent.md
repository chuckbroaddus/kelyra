# Hamburger icons, every seat — IQG intent + PM lock

**Date:** 2026-09-25
**Author:** product-manager (Kelyra)
**Card:** `t_97e49580`
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**Live ground (read-only):** `src/components/ui/HamburgerDrawer.tsx`, `src/lib/chrome/seat.ts` (`otherOfficeTeacherSeatRow`), `src/components/ui/Icon.tsx` (`IconName`)
**CEO lock:** 2026-09-25 3:11 PM CT (icons on every hamburger row). **Position change (supersedes placement):** 2026-09-25 3:35 PM CT. No hotfix override. In the hamburger drawer only, the icon sits on the RIGHT of each text label, not the left. The drawer is on the right edge and the row text is right-justified, so a left icon does not line up. Every other menu in the app keeps its current icon side. Do not widen.
**Status:** PM DESIGN STAMP **APPROVED (re-approval, position change)** 2026-09-25 (`t_5b80720e`). Prior PM APPROVED `t_97e49580`. QA Supervisor DESIGN STAMP **APPROVED** (`t_61178f1f`, 2026-09-25) still covers the 29-row inventory, glyph table, danger Sign out, and right-of-label visual law. This card does not clear that QA stamp and does not build. Engineering `t_30e3ff53` stays blocked until Chief of Staff unblocks it after this re-approval.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Hamburger row icons, all seats. Position re-approval: icon on the RIGHT of the label, hamburger/drawer rows only.
Quality goals: Every DrawerRow that renders, on every seat and dual-hat branch, shows a 22px icon to the RIGHT of its label (after the words, toward the drawer's right edge). Not to the left. Other menus keep today's icon side. Same label = same glyph. Office Home/Diary/Calendar/Ask stay as they are (Ask stays KelyraMark, untinted) and stay right-of-label; do not move those four icons left. Sign out icon uses colors.danger. No new assets, no label/href/order/gate/search changes, no helper text, no WhoRow/ListRow/gear/search-field work. Phone and web share this component. Keep the `leading` prop name. Engineering may add a trailing-icon option on DrawerRow so the glyph renders after the label.
PM: APPROVED (re-approval, position change)  date: 2026-09-25  profile-session: t_5b80720e / product-manager · notes/company/hamburger-icons-all-seats-intent.md
QA Supervisor: APPROVED  date: 2026-09-25  profile-session: t_61178f1f / qa-supervisor · notes/company/hamburger-icons-all-seats-intent.md
Intent gaps remaining: none
```

## 0. One-line law

Copy the live office DrawerRow visual onto every other DrawerRow: icon after the words, row packed to the right edge. Do not redesign the menu. Do not put the icon on the left of the label. A row that is hidden by seat, grant, class, or search stays hidden. A row that renders must show its icon to the right of the label. This side rule is the hamburger drawer only. Other menus keep their current icon side.

## 1. Hats, entry, lifecycle, multiplicity, reverse

**Hats.** Superintendent, administrator, teacher, parent, student. Dual-hat rows already in the drawer must get the same treatment when they render: staff who is also a parent (My children); office who can switch to Teach; teacher who can switch to Office; parent who can switch to Office and/or Teach; parent switch from a staff seat. Do not add a row a hat does not already have.

**Entry.** The hamburger drawer only (`HamburgerDrawer`). Not the tab tray, not Settings, not the header wordmark, not Ask.

**Lifecycle.** Open the drawer: every visible DrawerRow has its icon. Tap the row: same href, same close, same seat switch, same sign-out as today. Search: a non-match hides the whole row (icon included); a match still shows the icon. Reopen clears the query (already). Sign out still signs out and leaves the signed-in drawer. Seat switch lands the other seat's root; the next open shows that seat's rows with icons, not the previous seat's rows.

**Multiplicity.** Administrator class list stays ListRow avatars (many classes). Do not add a DrawerRow icon per class. Teacher with no `classId` does not show the class section; do not invent those rows so they can have icons. Parent with several children still has one My children row; child pick stays on `/parent`.

**Reverse / already-in-flow.** Close, search-clear on reopen, and switching back to the prior seat are unchanged. Icons must be present on the destination seat too. No new cancel control.

**Conditional rows stay conditional.** An icon is not a reason to always show Activity, Responsibilities, My children, a seat switch, or the teacher class section.


## 2. Live inventory

Counted in `HamburgerDrawer.tsx` on this review: **29** `<DrawerRow` call sites. **4** already pass `leading`. **25** do not. Proposed spec's "~25 missing" matches. Do not stop at a sample.

Live layout (read 2026-09-25; do not "correct" it into a left slot): `DrawerRow` children are the label `Text`, then `{leading}`, then `{check}`. The row is `flexDirection: 'row'`, `justifyContent: 'flex-end'`, `gap: 8`. The label is `textAlign: 'right'`. The sheet is `right: 0`. Today's office icons already paint to the RIGHT of the words. The prop is named `leading`. That name is not a left-side order. Do not move `{leading}` to before the label. Do not rename `leading`.

Engineering may add an optional trailing-icon prop on `DrawerRow` only, rendered after the label (before `check`, same visual slot as today's `{leading}`). If they add it, hamburger rows may pass the glyph there and leave `leading` unused. Either path is acceptable. A left icon is not. ListRow's `trailing` is delete swipe on a different component. Do not reuse it. Do not add the new prop to any other menu.

No live row passes `check`. Keep that slot. Do not add checks.

**Already iconned. Do not change glyph, size, or color.**

| Seat | Label | Glyph today |
|---|---|---|
| Office (superintendent and administrator) | Home | `Icon` `today` `colors.ink` size 22 |
| Office | Diary | `Icon` `diary` `colors.ink` size 22 |
| Office | Calendar | `Icon` `calendar` `colors.ink` size 22 |
| Office | Ask Kelyra | `KelyraMark` size 22 (not `Icon` `ask`; do not tint) |

**Missing an icon. Add the right-side glyph only. Labels, hrefs, `matches()`, and gates stay. Do not add a left icon.**

| Seat branch | Label | Href (unchanged) | Gate (unchanged) |
|---|---|---|---|
| Administrator only | Activity | `/activity` | `role === 'administrator'` and `can(audit.view)` |
| Administrator only | Messages | `/messages` | `role === 'administrator'` and `matches('Messages')` — no extra `can()` today; do not add one |
| Administrator only | Responsibilities | `/admin/matrix` | `role === 'administrator'` and `can(school.matrix)` |
| Teacher | Classes | `/?switch=1` | `teacherSeat` |
| Teacher, class open | Students | `/class/{classId}/setup` | `classId && teacherSeat` |
| Teacher, class open | Grade book | `/class/{classId}/gradebook` plus `setContextTab('book', ...)` | same |
| Teacher, class open | Parents | `/class/{classId}/parents` | same |
| Teacher, class open | Family update | `/class/{classId}/family` | same |
| Teacher, class open | Class settings | `/class/{classId}/settings` | same |
| Staff also-parent | My children | `/parent` | `isAlsoParent(profile)` |
| Staff seat switch | Teach or Office | `chromeSeatRootHref(seat)`, replace | `canChooseSeat` and `otherOfficeTeacherSeatRow` and seat in `seats` |
| Staff seat switch | Parent | parent root, replace | `canChooseSeat` and `seats` includes parent and not already parent seat |
| Staff | Sign out | `signOut` then `router.replace('/')` | `matches('Sign out')`; `danger` |
| Student | Assignments | `/todo` | student role |
| Student | Feeds | `/student/feed` | student role |
| Student | Classes | `/student/class` | student role |
| Student | Grades | `/student/grades` | student role |
| Student | People | `/student/people` | student role |
| Student | Sign out | same sign-out | `danger` |
| Parent | My children | `/parent` | parent role |
| Parent | Grades | `/parent/grades` | parent role |
| Parent | Office | office root, replace | `canChooseSeat` and `seats` includes office |
| Parent | Teach | teacher root, replace | `canChooseSeat` and `seats` includes teacher |
| Parent | Diary | `/diary` | parent role and `matches('Diary')` |
| Parent | Sign out | same sign-out | `danger` |

Superintendent does **not** get Activity, Messages, Responsibilities, or the administrator class list. Teacher hamburger does **not** get Diary (ST-20). Student does **not** get Diary. Do not add those rows to "cover" the hat.

`otherOfficeTeacherSeatRow`: office seat label is Teach; teacher seat label is Office. Parent seat lists Office and Teach as separate rows. Same label, same glyph, whichever branch renders it.


## 3. Glyph lock

Every name below is already on `IconName`. Do not add an asset. Do not run a new icon recipe. Do not draw a View-stroke glyph. Size **22**. Color **`colors.ink`** except Sign out, which is **`colors.danger`** (locked, not optional). Same component, phone and web.

| Label | Icon name | Notes |
|---|---|---|
| Activity | `history` | Audit log. Not `records`. |
| Messages | `chat` | In-app threads. Not `mail`. |
| Responsibilities | `details` | Matrix. Not `manage` (that is Office). |
| Classes | `classes` | Teacher row and student row. Same label, same glyph. |
| Students | `person` | |
| Grade book | `grades` | |
| Grades | `grades` | Parent and student. Same concept as Grade book. |
| Parents | `parents` | |
| Family update | `family` | |
| Class settings | `settings` | Tray gear already uses `settings`. Leave the gear. Do not remove it. |
| My children | `children` | Staff also-parent row and parent-seat row. |
| Office | `manage` | Seat switch only. Not `settings`. |
| Teach | `classes` | Different label from Classes; sharing `classes` is intentional. Do not invent a Teach asset to "fix" it. |
| Parent | `parents` | Seat switch. Same glyph as the Parents row. |
| Sign out | `login` | All three call sites (staff, student, parent). `color={colors.danger}`. Keep the `danger` prop so the label stays danger-colored. |
| Assignments | `work` | |
| Feeds | `post` | Not `share`. |
| People | `person` | Same glyph as Students. Different label. Allowed. |
| Diary | `diary` | Parent row matches office Diary. Do not retint. |

Ask Kelyra stays `KelyraMark` size 22. Home / office Diary / Calendar stay as in section 2.

Accessibility: icon is decorative. Do not put the glyph name in `accessibilityLabel`. Seat-switch rows keep their existing `accessibilityLabel` ("Switch to …").


## 4. Stories and acceptance

**Stories**

1. As any signed-in seat, when I open the hamburger, every menu row I can see has an icon to the right of its words, not the left, the same size and spacing as office Home. Other menus in the app are unchanged.
2. As an administrator, Activity, Messages, and Responsibilities have icons when those rows show. As a superintendent, those rows still do not show.
3. As a teacher with a class open, Students, Grade book, Parents, Family update, and Class settings have icons. Classes has an icon even when no class is open.
4. As a parent, My children, Grades, and Diary have icons. Office and Teach have icons only when I can switch.
5. As a student, Assignments, Feeds, Classes, Grades, and People have icons. I still have no Diary row.
6. As anyone who can sign out from the drawer, Sign out stays danger-colored and its icon is danger-colored too.
7. As a dual-hat, the switch row and My children (when I am also a parent) have icons. Switching seats does not leave the old seat's rows on screen.

**Acceptance (HI-*)**

- HI-01. All 29 DrawerRow call sites show the locked glyph to the RIGHT of the label. A source-scan unit test fails if any `<DrawerRow` in `HamburgerDrawer.tsx` has no icon, or if `DrawerRow` renders the icon node before the label `Text`. Passing `leading` satisfies the test only while `{leading}` is rendered after the label. A trailing-icon prop rendered after the label also satisfies it. An icon to the left of the label fails it. Do not require a left/`leading` visual slot.
- HI-02. The four office rows keep today's glyphs (Home `today`, Diary `diary`, Calendar `calendar`, Ask `KelyraMark` size 22) and stay right of the label. Do not move them left.
- HI-03. The 25 missing sites use section 3. Sign out is `login` at size 22 with `colors.danger` on all three sites.
- HI-04. Labels, order, hrefs, `matches()` needles, `accessibilityLabel`s, and seat/grant/`classId` gates are unchanged. Search still hides non-matching rows.
- HI-05. No new `IconName`. No `npm run icons`. No helper text under a row. No rename of `leading`. A new optional trailing-icon prop on `DrawerRow` is allowed (section 2). Do not add that prop, and do not move icons, on any menu that is not a hamburger DrawerRow.
- HI-06. `node --test` for the touched test is green. Do not edit unrelated dirty-tree files to make `tsc` green. Do not raise the typecheck error count. PM did not re-run `tsc` on this docs card; the proposed "baseline stays 3 errors" is an Eng constraint, not a number this review re-measured.
- HI-07. Screenshots of the open hamburger for superintendent, administrator, teacher, parent, and student (phone Expo Go and web if the harness can; otherwise say which surface). Administrator is required: Activity / Messages / Responsibilities exist only there. If a seat cannot be signed in, write `unverified: <blocker>` for that seat. A single-hat screenshot does not cover dual-hat rows; HI-01 must still assert those call sites (My children on staff, Teach/Office/Parent switches).
- HI-08. Report PR URL and number. Merge stays with the default Hermes owner after QA and verify. This intent card does not open the PR.


## 5. Non-goals

- WhoRow (name + avatar). Already has a mark on the right. Not a DrawerRow.
- Administrator class ListRows (avatar, selected state, delete swipe `trailing` around line 382). Not the office DrawerRow pattern. Adding an icon there widens the CEO lock and collides with the avatar.
- Search field `Icon` `search`, and the Settings gear. Already iconned. Do not add a Settings DrawerRow.
- Section label ("This class" / class name) and hairlines. Not rows.
- Settings sheet contents. Out of drawer rows.
- Renaming `leading`. Forbidden. The name stays. A new optional trailing-icon prop on `DrawerRow` is allowed so the glyph renders after the label without treating the name as a left slot. Do not add that prop outside `HamburgerDrawer`. ListRow `trailing` stays delete actions. Do not move hamburger icons to the left to match the word "leading".
- Other menus. Tab tray, Settings sheet, ListRow (class avatars and swipe actions), WhoRow, search-field icon, header gear, wordmark, Heatmap `leading`, and any row that is not a hamburger `DrawerRow` keep today's icon side. This slice does not realign them.
- New Diary row on teacher or student. New Activity/Messages/Responsibilities on superintendent.
- New chrome, option pack, or designer restaff. The chosen option is the live office block. PM is not sketching a second pack.
- Helper copy, tooltips that are not already there, row subtitles.
- Changing sign-out, seat-switch, or navigation behavior.
- DITL doc updates on this slice (ditl-scribe owns that; do not staff Eng to also update DITL).

## 6. Engineering bar (after dual stamp only)

Prior dual stamp (2026-09-25, `t_97e49580` + `t_61178f1f`) still covers inventory, glyphs, and right-of-label. CEO position change 3:35 PM CT is PM-reapproved on this note (`t_5b80720e`). Engineering card `t_30e3ff53` already exists and is blocked. Chief of Staff unblocks it. This note does not staff Engineering. QA Supervisor does not staff it. Build from this note, not from the engineering card's older "leading slot" sentence if the two disagree. Right of the label wins.

When CoS files the engineering card, paste this note as the spec. Engine / workflow / pool stay as the proposed card: build (fallback grok-bot if SuperGrok DENY); `kelyra-qa-loop` (fallback `kelyra-bot-build-loop`); pool supergrok (fallback grok-bot). Worktree off `origin/main`. Do not switch branches in `~/projects/kelyra` (Metro serves the phone from it). No `ask_user_question`. No CloudAgent. Never run prettier.

Verify command name in the proposed card was `verify-kelyra` screenshots. This repo has no `verify-kelyra` script. Eng uses the loop's existing screenshot path and HI-07. Do not invent a new harness to satisfy the name.

**PM adjustments to the proposed spec (locked here, not left optional):**

- Full call-site list, not "~25".
- Sign out icon color is `colors.danger`, not "if it reads better".
- Do not rename `leading`. Do not read that name as a left slot.
- Hamburger/drawer rows only: icon on the RIGHT of the label. Other menus unchanged.
- A trailing-icon option on `DrawerRow` is allowed. Passing `leading` is allowed only if that node still renders after the label.
- Verify must include administrator, not only superintendent / teacher / parent / student.
- WhoRow and class ListRows are out.

**QA Supervisor restamp triggers (REJECT if Eng or a later PM edit does any of these):**

1. Ships a row with no icon, or puts the hamburger icon left of the label.
2. Adds or removes a row, href, gate, or search needle.
3. Adds an IconName or a hand-drawn glyph.
4. Tints KelyraMark, or swaps Ask to `Icon` `ask`.
5. Uses `colors.ink` on Sign out, or drops the `danger` label.
6. Adds Diary to teacher or student hamburger, or Activity/Messages/Responsibilities to superintendent.
7. Puts icons on WhoRow or class ListRows, or removes the tray gear.
8. Adds helper text.
9. Treats a happy-path superintendent screenshot as proof that administrator rows are done.
10. Moves an icon in a non-hamburger menu, or renames `leading`.

## 7. Handoff

OBJECTIVE: PM re-approval of hamburger icon position. Right of the label, drawer rows only.
CONTEXT: CEO 2026-09-25 3:35 PM CT supersedes any reading that put the glyph in a left/`leading` slot. Office rows already paint `{leading}` after the label on a right-packed row. Other menus stay as shipped.
REQUIREMENTS: sections 2–4 of this note, including HI-01 (right of label; trailing-icon option allowed; `leading` name kept).
CONSTRAINTS: section 5 and section 6. Do not build on this card. Do not unblock `t_30e3ff53` from this card.
FILES/AREAS: this note only. No `src/` edit.
WORK PERFORMED: Re-read `DrawerRow` render order and row styles. Restamped PM APPROVED (re-approval, position change). Adjusted HI-01 and HI-05 so they no longer require a left/`leading` slot.
VERIFICATION: Docs only. Live order confirmed: label Text, then `{leading}`, then check; row `justifyContent: 'flex-end'`; sheet `right: 0`. 29-row inventory and glyph table unchanged.
RESULT: PM: APPROVED (re-approval, position change) date 2026-09-25. QA Supervisor stamp `t_61178f1f` not cleared.
OPEN ISSUES: none for this position change. Prove-out is after implementation.
ESCALATION NEEDED: Chief of Staff unblocks `t_30e3ff53` and points Eng at this note. PM does not unblock Eng.
RECOMMENDED NEXT ACTION: CoS unblocks Eng. Eng builds hamburger right-of-label only.

## 8. QA Supervisor review (`t_61178f1f`)

Historical review, before the 3:35 PM position re-approval. Inventory, glyphs, gates, and "icon after the label" still stand. Do not read this section as requiring a left/`leading` slot. HI-01 in section 4 is the test contract.

Read-only against `HamburgerDrawer.tsx`, `seat.ts` (`otherOfficeTeacherSeatRow`, `isOfficeChromeRole`), and `IconName`. Did not edit `src/`. Did not launch a loop.

**Count.** 29 `<DrawerRow` call sites. 4 already pass `leading` (office Home `today`, Diary `diary`, Calendar `calendar`, Ask `KelyraMark` size 22). 25 do not. Matches the lock. `DrawerRow` renders `{leading}` after the label in a `justifyContent: 'flex-end'` row (`gap: 8`). No live row passes `check`.

**Hats.** Superintendent and administrator share the office block. Activity, Messages, Responsibilities, and class ListRows are inside `role === 'administrator'` only. Teacher class section stays behind `classId && teacherSeat`. Classes still shows with no class open. Student has no Diary (ST-20 keeps teacher Diary off the hamburger). Parent Diary is the only non-office Diary row.

**Dual-hat.** Staff My children is `isAlsoParent`. Office seat switch label is Teach; teacher seat switch label is Office. Staff Parent switch is separate. Parent seat lists Office and Teach separately, each gated by `canChooseSeat` and `seats`. No row added for a hat that does not already have it.

**Lifecycle and search.** Open shows an icon on every rendered DrawerRow. Tap keeps today's href, close, seat switch, and sign-out (`go` still closes; replace still replace). `matches()` wraps the row, so a non-match hides the icon with the row. Reopen clears the query. Sign out still signs out and leaves the signed-in drawer.

**Danger.** All three Sign out sites already pass `danger`. Icon color `colors.danger` on all three is locked, not optional. Label stays danger-colored.

**Glyphs.** Every section 3 name is on `IconName`. No new asset. Ask stays untinted `KelyraMark`. Teach shares `classes` with Classes; those two labels do not render on the same seat. Parent switch shares `parents` with the Parents row. A teacher who is also a parent can see both on one drawer. Accepted: no new asset, labels differ, switch `accessibilityLabel` stays "Switch to Parent seat".

**Chrome entry.** One drawer, mounted from `AppShell`, phone and web. Not the tray, Settings gear, search field, or wordmark. Parent card body already has the one Surface line (phone Expo Go + web) and Seat: all. Do not add a second Surface line. No Persona. No mock-up path.

**Multiplicity.** Many classes stay ListRow avatars. Several children stay one My children row. No class open means no class section. Do not invent rows so they can have icons.

**Non-goals hold.** WhoRow, class ListRows, gear, search field, helper text, `leading` rename, and behavior changes stay out. Drawer width stays `chrome.drawerWidth` (304). `package.json` has no `verify-kelyra` script; HI-07 uses the loop screenshot path. Administrator screenshot is required.

**Stamp meaning.** Real-world intent is fully specified, not only the happy path. Intent gaps remaining: none. Engineering may be staffed by Chief of Staff only.

## 9. DITL IMPACT

```
DITL IMPACT
Change: Decorative 22px icons on existing hamburger DrawerRow labels. No new row, href, gate, hat, or day.
Verdict: NONE
Plans touched: none
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: DITL plans already name hamburger as the entry for Sign out, Parent switch, My children, and Diary. They do not describe icon presence, absence, or which side the glyph sits on. The 3:35 PM position change (right of the label, hamburger only) does not change this verdict. accessibilityLabel stays the label (seat switches keep "Switch to …"). Cases that find those rows by label stay valid. No DITL-UPDATE card. Do not staff Eng to rewrite DITL.
```

## 10. Position re-approval (`t_5b80720e`)

CEO Chuck 2026-09-25 3:35 PM CT. This supersedes any reading that put the hamburger glyph on the left, or that treated the prop name `leading` as a left slot.

Locked, and nothing else moved:

- Hamburger drawer `DrawerRow` only: icon on the RIGHT of each text label, not the left.
- Reason: the drawer sits on the right edge and the row text is right-justified, so a left icon does not line up with the words.
- Every other menu keeps its current icon side. Do not realign them.
- Same 29 rows. Same glyph table. Same label = same glyph. Existing `IconName` set only. Sign out stays `colors.danger`.
- Keep the `leading` prop name. Do not rename it.
- Engineering may add a trailing-icon option on `DrawerRow` only, rendered after the label. Passing `leading` is still valid only while that node renders after the label, which is the live order.
- Do not move the four office icons to the left.

PM: APPROVED (re-approval, position change)  date: 2026-09-25  profile-session: t_5b80720e / product-manager · notes/company/hamburger-icons-all-seats-intent.md

No app code on this card. Do not build here. Chief of Staff unblocks engineering `t_30e3ff53`.


