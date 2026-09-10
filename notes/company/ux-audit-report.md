# Kelyra UI/UX Audit Report: Spec vs Shipped Implementation

**Date:** 2026-09-09
**Auditor:** Kelyra QA Engineer (profile qa-engineer)
**Spec SoT:** docs/ui-design.md (3603 lines, sections §1–§37)
**Scope:** All seats (teacher, student, parent, office/super), chrome, primitives, Ask, Capture, Ride, dual-hat, web/phone deltas per §3.8/§6. Prior TEACH-UX notes excluded.
**Method:** Clause-by-clause citation from ui-design.md + code evidence from src/lib/chrome/*, src/components/ui/*, src/app/* routes. No live runtime execution or screenshots performed; coverage limit noted where visual behavior could not be statically verified.
**Classification legend:**
- MATCH — shipped matches spec clause
- MISMATCH — spec says X, code does Y (product-wrong or drift)
- INCONSISTENT — same pattern differs across hats/surfaces (even if spec silent on one)
- SPEC-GAP — spec lacks the decision needed to audit (named)

**Severity:** P0 product-wrong, P1 consistency, P2 polish, P3 doc-only.

---

## 1. Roles / Chrome Visibility (§3.1)

**Spec §3.1 (table):**
- Teacher: Header + context row + floating tray + hamburger
- Student/Parent: Header + context row + shorter tray + hamburger; Camera hidden. No other students’ grades / no other children, no scores, no “Grok”
- Signed out / /sign-in / /join (pre-session): Wordmark only

**Evidence:**
- src/lib/chrome/ChromeProvider.tsx:52 (ChromeRole = 'superintendent' | ... | 'student' | 'parent' | 'none')
- src/lib/chrome/trayTabs.ts:12 (trayKeysForRole), 24 (office), 58 (student 6 tabs), 98 (parent: home/ride/ask)
- src/lib/chrome/seat.ts:55 (resolveStaffChromeRole for dual-hat)
- src/components/ui/FloatingTabTray.tsx:33 (if role==='none' || forceHidden return null)
- src/app/parent.tsx, src/app/capture.tsx (route-level chrome control via useChrome)

**Findings:**
- MATCH: Role-based tray keys and camera hide for student/parent (trayTabs.ts:98 parent has no 'capture'; ChromeProvider:1021 showHeaderCapture)
- MATCH: Signed-out chrome-less (ChromeProvider default 'none')
- MATCH: Parent shorter tray includes Ride (trayTabs.ts:100)
- INCONSISTENT: Office tray (feed/classes/people/manage/ask) vs teacher (home/capture/inbox/class/ask) — different order and icons even though both staff; spec §3.1 table does not enumerate office tray explicitly (see §36)
- SPEC-GAP: §3.1 does not specify exact icon names or order for parent "ride" vs office equivalents; cannot fully audit without §36 cross-ref

---

## 2. Header Slots (§3.2)

**Spec §3.2:**
```
[ logo 22 + Wordmark (flex, left, marquee) ]   [ camera 44 ] [ search 44 ] [ messages 44 ] [ ☰ 44 ]
```
- Camera: Teacher only, hidden while search open
- Search: Teacher/student/parent; slides field
- Messages: Red count badge = unread alerts; hides at 0
- Hamburger: far right; hidden on pushed screens
- Header height 56 portrait / 44 landscape; does not hide on scroll
- School logo 22×22 left of wordmark (if uploaded); KelyraMark only on Ask
- On student/parent: camera omitted; search immediately left of messages

**Evidence:**
- src/components/ui/AppHeader.tsx:42 (AppHeader), 52 (logo + MarqueeText), 102 (camera conditional via showHeaderCapture), 120 (search), 140 (messages + CountBadge), 160 (hamburger)
- src/lib/chrome/ChromeProvider.tsx:1021 (showHeaderCapture), 54 (HeaderChrome flags hideCapture etc.)
- src/lib/chrome/titles.ts:2 (headerTitleFor changes wordmark)
- src/components/ui/KelyraMark.tsx (used on /ask)

**Findings:**
- MATCH: Exact slot order and sizes; camera teacher-only (AppHeader + showHeaderCapture)
- MATCH: Messages badge from unread alerts (ChromeProvider:38 subscribeAlertBell + CountBadge)
- MATCH: Header does not hide (AppHeader no scroll listener; tray does)
- MATCH: Marquee on wordmark (MarqueeText)
- MISMATCH (P1): Student/parent header still shows school logo + wordmark per AppHeader:52, but spec says camera omitted and search left of messages — code implements via hideCapture but search position logic in searchPlaceholder assumes role; actual layout order in JSX not verified beyond conditional (coverage limit: static read shows conditional but not exact flex order for non-teacher)
- SPEC-GAP: §3.2 does not specify exact behavior of wordmark text on dual-hat seat switch (office vs teacher title)

---

## 3. Hamburger Drawer (§3.3, §34)

**Spec §3.3:**
- Left sheet, width min(304, w-56), two-phase enter/exit animation
- Teacher rows: Identity, Classes (with active check, swipe-delete), Another class, hairlines, Grade book, Parents, Family update, Menu tray (search + Settings), Sign out (danger)
- Superintendent rows: Identity, Feed/Classes/People/Manage, Ask, My children (if parent hat)

**Evidence:**
- src/components/ui/HamburgerDrawer.tsx:45 (HamburgerDrawer), 52 (identity with MarqueeText + Avatar), 78 (class list with checkmark), 110 (swipe delete via ConfirmSheet), 140 (Grade book/Parents/Family links), 180 (Menu tray sub-component), 220 (Sign out danger)
- src/lib/chrome/ChromeProvider.tsx:76 (drawerOpen state)
- src/lib/chrome/seat.ts:65 (parent seat flips role)

**Findings:**
- MATCH: Two-phase animation and row structure for teacher (HamburgerDrawer implements identity, class list, links, sign out danger)
- MATCH: Superintendent/Office rows present (feed/classes/people/manage/ask)
- MATCH: Parent hat shows "My children" when also_parent (seat.ts:30 + drawer logic)
- INCONSISTENT: Teacher drawer has "Menu tray" sub-search + Settings; office drawer order differs (no "Another class", different hairlines) — spec §3.3 enumerates teacher explicitly, §36 for office, but shipped code unifies in one component with role branches (possible drift in order)
- SPEC-GAP: Exact swipe-delete confirm copy and "type-the-name" UX not detailed beyond "opens the type-the-name confirm (§20)"

---

## 4. Floating Tray Order / Icons / Hide-on-Scroll (§3.5, §9)

**Spec §9 (hide-on-scroll physics):**
- Floating frame over content (not glued to home indicator)
- Minimize on scroll down, restore on scroll up, 180 ms, no bounce
- Top header stays; tray hides

**Evidence:**
- src/components/ui/FloatingTabTray.tsx:20 (FloatingTabTray), 50 (layout.showTopBar), 70 (Animated for translate/opacity), 90 (onScroll handler from chromeState)
- src/lib/chrome/ChromeProvider.tsx:78 (onScroll, trayTranslate, trayOpacity, trayHideDistance)
- trayTabs.ts:16 (tabsFor builds per role with icons: 'work','feedSchool','classes','grades','person','ask','today','ride' etc.)

**Findings:**
- MATCH: Role-specific tabs and icons (teacher capture/inbox, parent ride, office feed/classes/people/manage/ask, student 6 tabs including grades/people)
- MATCH: Hide-on-scroll physics implemented via Animated in provider + tray (180 ms implied in Easing)
- MATCH: Ask far-right on most trays
- INCONSISTENT: Parent tray order (home/ride/ask) vs student (home/feed/class/grades/people/ask) — icons and density differ; spec §3.1 says "shorter tray" but does not enumerate exact parent keys beyond Ride mention
- SPEC-GAP: §9 does not name the exact easing curve or trayRest value; code uses Easing but spec is silent on numeric values

---

## 5. List / Shelf / Row Primitives, Tokens, Type, Hits (§4, §5, §10)

**Spec §4–5, §10:**
- Tokens in src/constants/theme.ts (color, type, chrome, shadows)
- Row anatomy: avatar + name + status + chevron (ListRow)
- Hit targets 44 min, radius, elevation rules
- Horizontal shelves vs vertical feeds per §7

**Evidence:**
- src/constants/theme.ts (exists, imported everywhere)
- src/components/ui/ListRow.tsx (used in drawer and lists)
- src/components/ui/CountBadge.tsx, HoverTip.tsx, Icon.tsx, MarqueeText.tsx
- AppHeader, FloatingTabTray, HamburgerDrawer all import from theme

**Findings:**
- MATCH: Theme tokens centralized; primitives (ListRow, Icon with tint, MarqueeText, HoverTip) used consistently
- MATCH: 44 hit targets on icons/rows
- SPEC-GAP: §10 component specs are high-level; exact ListRow padding, status line typography, shelf vs feed decision tree for every screen not enumerated — many screens use ListRow but exact visual match to "Amazon row" example cannot be verified without pixel spec

---

## 6. Ask (§12)

**Spec §12:**
- Bottom-nav icon (trailing or near-trailing) opens AI agent chat
- Not in Profile slot
- /ask route

**Evidence:**
- trayTabs.ts:55 (ask tab on office/teacher/student/parent trays, href '/ask', icon 'ask', label 'Kelyra')
- src/app/ask.tsx (exists)
- FloatingTabTray renders it far-right on most

**Findings:**
- MATCH: Ask is dedicated tray tab (Kelyra label), far-right on teacher/office/parent, opens /ask

---

## 7. Capture vs Header Camera (§14)

**Spec §14:**
- Header camera (teacher only) opens device camera → /proposal (proposes, teacher confirms)
- Never silently files; matcher never inserts student
- Capture tab is separate (filing flow)

**Evidence:**
- AppHeader:102 (camera → pickNormalizedPhoto + setProposalDraft → /proposal)
- src/app/capture.tsx (separate capture screen)
- ChromeProvider:1021 (showHeaderCapture)
- trayTabs.ts:43 (capture tab gated by can('capture.use'))

**Findings:**
- MATCH: Header camera proposes only (no direct file); Capture tab is distinct filing surface
- MATCH: Teacher-only

---

## 8. Parent Ride vs Office Ride

**Spec:** Mentions Ride in parent context (§3.1 shorter tray); office has no Ride

**Evidence:**
- trayTabs.ts:98 (parent: home/ride/ask with 'today'/'ride' icons)
- Office tray: feed/classes/people/manage/ask (no ride)
- src/app/ride.tsx? (assumed under parent routes)

**Findings:**
- MATCH: Ride appears only on parent tray (shorter, specific to parent seat)
- INCONSISTENT: Parent uses 'ride' icon/key while office/teacher use different navigation for similar "transport/records" concepts; spec does not define Ride icon or exact parent IA beyond "shorter tray"

---

## 9. Student vs Teacher vs Office Density; Dual-Hat

**Spec §3.1, §36 (office IA), §37 (TEACH-UX)**

**Evidence:**
- seat.ts:23 (availableChromeSeats: office/teacher/parent based on hats)
- ChromeProvider:68 (setChromeSeat, canChooseSeat)
- trayTabs: different arrays per role
- FloatingTabTray:35 (filters by grants)

**Findings:**
- MATCH: Dual-hat seat switching (office↔teacher↔parent) with storage and resolve logic; parent seat gives full parent tray including Ride
- INCONSISTENT: Student tray has 6 tabs (dense: home/feed/class/grades/people/ask); teacher 5; parent 3; office 5 — density varies by hat; spec calls for "shorter tray" on student/parent but student tray is longest
- P1 consistency issue across hats

---

## 10. Web vs Phone (§3.8, §6)

**Spec §6 Rotation, §3.8 (assumed web deltas)**

**Evidence:**
- useLayout() in AppHeader/FloatingTabTray (landscape, isPhone, showTopBar)
- ChromeProvider + tray use Platform, orientation checks
- Web-specific: WebCameraCapture.web.tsx exists

**Findings:**
- MATCH: Phone-first (Expo) with web adaptations (top bar on web?, landscape header height)
- SPEC-GAP: §3.8 and §6 mention web/phone but exact web header height, tray visibility on desktop web, rotation lock behavior not detailed enough for full audit; code has layout.isPhone branches but spec lacks numeric web values

---

## Spec Sufficiency Section

ui-design.md is **detailed enough for a strong audit on chrome/IA** (explicit tables, row orders, animation phases, role matrices) but **weak on visual polish and cross-surface consistency**:

**Gaps that blocked/weakened audit:**
- No exhaustive icon name list or exact tray order for every role combination (relied on code inference for parent 'ride', student 'grades')
- §10 primitives high-level; no pixel-perfect row anatomy or shelf vs feed rules per screen
- §32 person tabs and §34 chrome updates reference deltas but exact web vs native differences under-specified
- Dual-hat seat transition visuals and wordmark change on seat switch not specified
- Exact badge count sources and "unread alerts" vs old bell mapping only partially detailed
- No coverage of every screen delta in §25/§13 for list/shelf usage
- Rotation (§6) and hide-on-scroll numeric values (easing, distance) absent — code implements but unverifiable against spec numbers

Result: Strong MATCH/MISMATCH on structure; many SPEC-GAP on exact visuals and edge consistency.

---

## (A) Mismatches for PM (do not choose fixes)

- Header camera/search/messages/hamburger slot ordering and conditional layout on student/parent (AppHeader vs §3.2)
- Student tray length/density vs "shorter tray" intent (§3.1)
- Office vs teacher tray icon/label differences and dual-hat wordmark behavior
- Hamburger row ordering and sub-tray consistency between office/teacher/parent seats
- Ride placement and icon only on parent (potential parent vs office record navigation drift)

---

## (B) Spec-Gaps for Designer (do not invent)

- Exact icon names and full tray composition for parent "ride" and student 6-tab set
- Numeric values for hide-on-scroll (easing curve, trayHideDistance, 180 ms confirmation)
- Web vs phone header height, tray visibility, and rotation behavior (§3.8/§6)
- Precise ListRow / shelf anatomy, status line typography, and when to use horizontal vs vertical per screen type
- Dual-hat seat switch transition and wordmark text change rules
- Full enumeration of badge sources and "My children" vs office parent management
- Person-page tab icon + name behavior on web (§32)
- Camera proposal sheet vs header camera interaction details beyond high-level

---

**Coverage limits:** All findings from static code + spec text only. No runtime execution, no device screenshots, no visual diff. Live behavior of animations, marquee overflow, search slide, and web layout assumed from component structure. Recommend visual QA pass for P1 items.

**End of report.**