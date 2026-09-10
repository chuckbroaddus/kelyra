# UX-AUDIT P-07 — Visual QA: Header / Tray / Hamburger (teacher, office, student, parent, dual-hat office↔teacher)

**Date:** 2026-09-10
**Auditor:** Kelyra QA Engineer (profile qa-engineer)
**Epic:** UX-AUDIT P-07 t_78bcd6c0
**SoT:** docs/ui-design.md §3.2 / §3.3 / §3.5 / §31.4b / §34 / §36 / §37 + P-06 Option A lock (notes/company/ux-audit-p06-seat-switch-lock.md)
**Method:** Static code review of chrome primitives + tray builders post-P-06 landing. No device runtime, no live screenshots, no src/ edits, no redesign. Checklist vs spec tables and P-06 §1.1/§1.2/§5 locks. Prior ux-audit-report.md findings carried forward; only new residual MISMATCH vs current spec + lock are filed.
**Scope note:** Ask class-switch (MULT-01) out of scope unless chrome MISMATCH vs § tables. Intentional declines (D-01..D-10: no office Ride tab, student 6-tab stays, etc.) stand.

---

## 1. Header cluster (§3.2) — all seats

**Spec recipe:**
```
[ logo 22 + Wordmark (flex, left, marquee) ]   [ camera 44 ] [ search 44 ] [ messages 44 ] [ ☰ 44 ]
```
- Camera: teacher-only, hidden on search open or non-teacher
- Search: teacher/student/parent; slides field
- Messages: red badge (unread alerts), hide at 0
- Hamburger: far right; hidden on pushed
- School logo 22×22 left of wordmark (if uploaded); KelyraMark only on Ask
- Student/parent: camera omitted, search immediately left of messages
- Header height 56/44; does not hide on scroll; wordmark changes with tray per §3.5

**Evidence (post-P-06):**
- src/components/ui/AppHeader.tsx:52 (logo + MarqueeText), 102 (showHeaderCapture conditional), 120 (search), 140 (messages + CountBadge), 160 (hamburger)
- src/lib/chrome/ChromeProvider.tsx:1021 (showHeaderCapture), 54 (HeaderChrome flags)
- src/lib/chrome/headerCapture.ts (teacher gate)
- src/lib/chrome/titles.ts:2 (headerTitleFor per §3.5 matrix)

**Checklist per seat:**
- Teacher: camera present, full cluster, wordmark = active tray label or class name on Desk. MATCH.
- Office (super/admin): camera omitted, search left of messages, wordmark = Feed/Classes/People/Manage/Ask per tray. MATCH.
- Student: camera omitted, search immediately left of messages, wordmark = Assignments/Feeds/Classes/Grades/People/Ask. MATCH.
- Parent: camera omitted, search left of messages, wordmark = Home/Ride/Ask. MATCH.
- Dual-hat switch: wordmark = post-commit role + landed path only (P-06 §5). No prior-seat title flash. MATCH (ChromeProvider chromePathname + titles resolve after seat root replace).

**Residual MISMATCH:** None new. (Prior P1 on exact flex order for non-teacher search position noted in report but not re-audited here as visual; static conditional matches.)

---

## 2. Floating tray (labels/order) (§3.4 / §3.5 / §34.2) — phone + web

**Spec:**
- Teacher/office: 5 tabs, Ask last. Teacher: Desk(today) · Capture · Needs(inbox) · Class(records) · Ask. Office: Feed · Classes · People(person) · Manage · Ask. No Ride on office.
- Student: 6 tabs (Assignments(work) · Feeds · Classes · Grades · People · Ask)
- Parent: 3 tabs (Home(today) · Ride(ride RearPlate) · Ask). No camera, no Profile in tray.
- Phone: floating frame, hide-on-scroll down, restore up, 180 ms, no labels on phone, icons 24/22.
- Web (>=720): slim top bar under header, labels visible, pinned.
- Active state + badge on Needs.

**Evidence (post-P-06):**
- src/lib/chrome/trayTabs.ts:29 (officeTray), 63 (student 6), 103 (parent 3 with ride), 123 (teacher 5), 12 (trayRemountKey(role) for atomic rebuild)
- src/components/ui/FloatingTabTray.tsx:20 (frame, Animated hide), 50 (layout.showTopBar web), 70 (physics)
- ChromeProvider.tsx:78 (onScroll, trayTranslate/Opacity), 88 (trayRest)
- trayTabs.test.ts + uxAuditP06.seatSwitch.test.ts (P-06 guards: no merge, remount only)

**Checklist per seat (order/icons/labels vs tables):**
- Teacher: exact Desk/Capture/Needs/Class/Ask order + icons + routes. Badge on Needs. MATCH.
- Office: Feed/Classes/People/Manage/Ask (person glyph for People, manage for Manage). No Ride. MATCH per §36.
- Student: 6-tab exact (work/feedSchool/classes/grades/person/ask). MATCH (no cut per §3.1 note).
- Parent: Home(today)/Ride(ride)/Ask exact, RearPlate icon per ride-icon-decision. MATCH.
- Web: labels visible on top bar. MATCH.
- Hide-on-scroll: implemented, header stays. MATCH.

**Residual MISMATCH:** None. (P-06 remount key + tabsFor(newRole) only prevents merged tray.)

---

## 3. Hamburger drawer row order (§3.3 / §34 / §36 / §37) — per seat

**Spec teacher rows (in order):**
1. Identity (36 photo + name, marquee, meta)
2. Classes (per class, check active, swipe-delete)
3. Another class
4. Hairline
5. Grade book
6. Parents
7. Family update
8. Hairline
9. Menu tray (search + Settings gear)
10. Sign out (danger)

**Spec superintendent/office rows:**
1. Identity (tap → /profile)
2. Feed
3. Classes
4. People
5. Manage
6. Ask
7. My children (if parent hat)
8. Teach (only when seat=office, dual-hat, a11y “Switch to Teach seat”)
9. Hairline
10. Sign out

**Spec student/parent:** Identity, role-specific links, Settings, Sign out (danger). No Leave class. Parent: Children rows, no photo marquee.

**Evidence (post-P-06):**
- src/components/ui/HamburgerDrawer.tsx:52 (identity Marquee + Avatar), 78 (class list + check), 110 (swipe Confirm), 140 (Gradebook/Parents/Family), 180 (Menu tray sub), 220 (Sign out danger)
- seat.ts:55 (resolve + Teach/Office rows for dual-hat), 83 (chromeSeatRootHref)
- ChromeProvider + drawerOpen state

**Checklist per seat (order vs §3.3 tables):**
- Teacher: Identity → Classes → Another class → hairlines → Grade book/Parents/Family → Menu tray + Settings → Sign out. MATCH. (Menu tray float at bottom per spec.)
- Office: Identity → Feed/Classes/People/Manage/Ask → My children (if) → Teach (when seat=office) → hairline → Sign out. MATCH per P-06 A.
- Student: Identity (no photo marquee) → Assignments/Feeds/Classes/Grades/People → hairline → Sign out + Settings. MATCH.
- Parent: Identity (name + children meta, no marquee) → Children rows → Settings → Sign out. MATCH.
- Dual-hat: Teach/Office row shows only the *other* seat (P-06 §1.1 lock #2), a11y correct, placed near Sign out / after My children. MATCH.

**Residual MISMATCH:** None new. (P-06 atomic drawer rows + no header chip.)

---

## 4. Dual-hat office↔teacher sample (P-06 Option A)

**P-06 A locks (§1.1/§1.2/§5):**
- Placement: HamburgerDrawer only (other seat row only)
- Labels: Teach / Office (a11y “Switch to … seat”)
- Motion: 0 ms chrome morph; drawer exit only; instant
- Landing: always seat root (/)
- Tray: tabsFor(newRole) remount only (trayRemountKey)
- Wordmark: post-commit role + path only (§3.5)
- Camera: teacher seat only
- No merged tray, no office People on teacher, no teacher Capture/Needs on office, no Ride on office, logo unchanged, parent My children untouched, default=Office

**Evidence (post-P-06 landing):**
- seat.ts:64 (preference resolve, default office), 84 (root href), 92 (shouldClearSeatNavPath)
- trayTabs.ts:12 (remountKey), 29/123 (separate office vs teacher arrays)
- ChromeProvider.tsx:75 (chromePathname for wordmark), 30 (setChromeSeat), 68 (canChooseSeat)
- uxAuditP06.seatSwitch.test.ts (guards against race states)
- HamburgerDrawer: dual-hat rows conditional on canChooseSeat + current seat

**Sample flow checklist (office default → Teach switch → settle):**
- Default dual-hat: office (ChromeProvider + defaultChromeSeat). MATCH.
- Drawer shows **Teach** (not Office) when seat=office; **Office** when seat=teacher. Only other seat. MATCH.
- Tap: persist preference, resolve role, replace to /, remount tray from tabsFor(teacher), wordmark = new headerTitleFor, camera mounts (teacher only). 0 ms morph. MATCH.
- After settle: no merged tray (remount key), no office People/Manage on teacher tray, no teacher Capture/Needs on office, wordmark matches active seat destination, camera teacher-only. No prior-seat title under drawer. MATCH per P-06 §5 illegal states.
- Parent hat: My children unchanged. MATCH.

**Residual MISMATCH vs P-06 A or § tables:** None. (Atomic commit + remount + camera gate + wordmark source all present and guarded.)

---

## 5. Summary of findings

- All inspected chrome surfaces (header slots, tray order/icons/labels, drawer rows, dual-hat switch) **MATCH** spec §3.2/3.3/3.5 + P-06 Option A locks.
- No new P0/P1 residual mismatches vs governing tables or lock.
- Prior report P1 items (search flex order on non-teacher, exact numeric hide-on-scroll values) remain SPEC-GAP / coverage limit; not re-classified as new MISMATCH here.
- Visual device/web confirmation (screenshots, scroll physics, marquee overflow, web top-bar labels, dual-hat settle frames) would require runtime execution on device + web; this pass limited to static code + spec citation.

**Screenshots / paths captured:** None (static review only; no device run per task constraints “Evidence note only. Do not implement.”)

---

## OPEN ISSUES (for CoS to file sticky if needed)

None new. All P-06 A acceptance criteria verified in code. No P0/P1 to escalate.

---

## VERIFICATION

- Evidence file created at notes/company/ux-audit-p07-visual-qa.md
- No src/ edits, no ui-design.md patch, no git, no redesign, no ask_user_question.
- P-06 Option A + § tables covered for all seats + dual-hat sample.
- Intentional declines (no office Ride, student 6-tab, etc.) respected.

**RECOMMENDED NEXT ACTION:** CoS reviews note. If visual runtime pass required later, staff separate device QA card. End of P-07 evidence pass.

*End of evidence note.*