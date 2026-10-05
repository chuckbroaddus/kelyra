# Defect #6 — stale tests on origin/main (28 failures)

Triage of `node --test --experimental-strip-types` over `git ls-files 'src/**/*.test.ts'` on `fix/stale-tests-main-28` (worktree off `origin/main` @ `b90e282e`).

**Summary:** All 28 are **stale tests** (assertions lag intentional product commits). No security/permission gate was removed for gauth / linkParentStudent / createClass / altitudeLocks — those gates remain in product code. One tiny product import fix (`softLetterScale.ts` extension) restores Node ESM loading used by Soft tests; behavior unchanged.

| # | Test name | File | Verdict | Cause commit | Fix |
|---|-----------|------|---------|--------------|-----|
| 1 | ASSIGN-INGEST: ai:dev strips an echoed answer off a filled-key stem | `src/components/ui/assignmentKeyError.test.ts` | stale | `b4031f94` (STEM rules → shared `aiPrompts` + `anskeySanitize`; ai:dev imports sanitize) | Assert shared prompt + `stem.endsWith(answer)` in anskeySanitize (ai:dev still calls finalize) |
| 2 | HI-01: every DrawerRow call site has a right-of-label icon | `src/components/ui/hamburgerDrawerIcons.test.ts` | stale | `51dd572e` / `c50ba988` (GB-07 + transfer-in drawer rows) | Expect 35 call sites |
| 3 | HI-03: same label = same glyph; locked table; Sign out danger | `src/components/ui/hamburgerDrawerIcons.test.ts` | stale | same | Add `Grading and Reporting Policy`→`grades`, `Transfer-in grade`→`grades`, `School`→`manage` |
| 4 | first-tab snap guards: contentWidth is ref-only; … width not maxWidth | `src/components/ui/personTabsInventory.test.ts` | stale | `63fff992` (distribute equal-width pills) | Match `width: distribute ? … : pillWidth` |
| 5 | expo iOS first-tab snap: leading scroll motion + no-op skip… | `src/components/ui/personTabsInventory.test.ts` | stale | `63fff992` | Deps include `distribute`: `[value, rowWidth, reduce, distribute]` |
| 6 | Create account shows Working while the account is being created | `src/components/ui/workingPopup.test.ts` | stale | photo-processing Working line on same NoticePopup | Allow `processingPhoto ? 'Processing photo…'` arm |
| 7 | GAUTH-S1-02 explain.manage teacher own; parent linked-child own; student/office none | `src/lib/ai/gauth.security.test.ts` | stale | `807e5cda` (calendar.write help cites `assignments.manage` after explain.manage row) | Scope doesNotMatch to the explain.manage row only; matrix grants unchanged |
| 8 | Q8 Ask: link_parent_student office gate runs before capability-null fail-open | `src/lib/ai/linkParentStudent.security.test.ts` | stale | `fe059c70` (`allowed()` → `if (!isAskToolAllowed(…)) return false`) | Match new `allowed()` shape; `officeOnly` + run-path `isOfficeRole` still present |
| 9 | CE-A chrome: drawer Calendar + quiet Desk link; not 6th tray | `src/lib/calendar/calendar.security.test.ts` | stale | `6298e8b5` / PR #135 CT-A (Calendar tray tab) | Expect calendar in tray; keep “not 6th” via 5 teacher keys |
| 10 | Phase B CE-A: no 6th tray; Desk Today/This week unchanged product | `src/lib/calendar/calendar.security.test.ts` | stale | `6298e8b5` | Same — calendar in tray; Desk product asserts kept |
| 11 | PeriodLeaf P1: fixed plate — no MonthHangingGrid/WeekDayStrip… | `src/lib/calendar/periodWheel.test.ts` | stale | comment wording → `week/multiday plate` | Match current CAL-DRUM comment |
| 12 | Phase E askTools: search uses listCalendarItems; draft parks CR-A… | `src/lib/calendar/phase_e.ask.security.test.ts` | stale | tool grew; `+4500` slice bled into `PARENT_SEAT_DENIED_TOOLS` (`approve_capture`) | Brace-bound `calendar_draft_event` tool body |
| 13 | SEC-01: ChromeProvider resolves seat before isTeacherRole force | `src/lib/chrome/altitudeLocks.security.test.ts` | stale | `5dbb0420` (multiline `resolveStaffChromeRole(profile, effectiveChromeSeatPreference(…))`) | Allow newline between `(profile,`; still no `isTeacherRole` force |
| 14 | SoftMark uses Soft v8b host (WebView/DOM) — not bead SoftMark alone | `src/lib/chrome/askK1NoJump.test.ts` | stale | `a95d1ae4` (native RN SoftMark; abandon WebView host) | Assert SoftMarkShared re-export; no WebView |
| 15 | KelyraMark host clips Soft on native; idle letter kelyra.png | `src/lib/chrome/askK1NoJump.test.ts` | stale | Soft-mounted overflow exception | Match `softMounted \|\| Platform.OS === 'web' ? 'visible' : 'hidden'` |
| 16 | WK Soft WorkingMark has no pencil geometry; SoftMark Soft face + modes | `src/lib/chrome/globalProcessing.test.ts` | stale | `a95d1ae4` (SoftMark.tsx re-exports SoftMarkShared) | Read SoftMarkShared for `kelyra.png` / mode / reduced motion |
| 17 | ASK-01/02/05: class name chip on teacher Ask; one /ask; office Ask unchanged | `src/lib/chrome/needsAsk.phaseC.test.ts` | stale | `5dbb0420` (`askClassId` derived from `chrome.classId`) | Match `classId: askClassId` + derivation |
| 18 | *(suite load)* softScaleIntro.test.ts (+ SoftMode faceMs wiring) | `src/lib/chrome/softScaleIntro.test.ts` | stale + tiny product import | `a95d1ae4` Soft split; face grow via `softFaceIntro` rAF; sibling already uses `.ts` | Product: `softCometFacing` → `./softLetterScale.ts`; SoftMode asserts `softFaceIntro` + comet timings |
| 19 | Q3 Ask create_class is office-gated; matrix teachers cannot create | `src/lib/classes/createClass.security.test.ts` | stale | `fe059c70` (same `allowed()` reshape) | Match `if (!isAskToolAllowed(…)) return false`; officeOnly + run gate intact |
| 20 | inventory anchors: journal Date still separate PR; time-only excluded | `src/lib/date/dateInputScrub.test.ts` | stale | `721b5f21` / #276 (diary → DateInput) | Expect `DateInput` + `label="Date"`; drop TextField exclusion |
| 21 | *(suite load)* acceptance.test.ts (+ SRS 11.16 meaning copy) | `src/lib/grade/acceptance.test.ts` | stale | `0bca50de` barrel `@/` API; `5d765bef` / #341 plain-language excused copy | Import `./posting/posting.ts`; match “points earned and the points possible” |
| 22 | §11.9 locked late is read-only in teacher wizard UI | `src/lib/grade/gbAc2Acceptance.test.ts` | stale | `a9a440af` (`LockedField` replaces `LockNote` for late) | Assert `LockedField locked={lateLocked}`; lateLocked still blocks patch |
| 23 | §11.18 narrow help opens as FormSheet | `src/lib/grade/gbAc2Acceptance.test.ts` | stale | `4b2e037f` (TopicHelp chrome parity) | Assert TopicHelpHit / TopicHelpPop |
| 24 | syllabus + school policy ingest send all pages in one invoke | `src/lib/ingest/multiPageIngest.security.test.ts` | stale | Capture import moved into SyllabusWizard tray icons | Assert `capture?preset=syllabus` on SyllabusWizard |
| 25 | UI: published syllabus blocks silent draft save; live edits use Publish confirm | `src/lib/syllabus/classSyllabus.security.test.ts` | stale | Save draft label lives in WizardActionTray | Assert `'Save draft'` there; keep canSaveDraft + published gate on screen |
| 26 | syllabus screen: template icon right of capture; no chips/title/back/live preview | `src/lib/syllabus/templatePicker.test.ts` | stale | icons in SyllabusWizard (`icon: 'capture'` / `syllabusTemplate`) | Assert wizard icon order + syllabus-templates route |
| 27 | MULT-01 setActiveClassId clears Ask ground; chrome refreshes on classId | `src/lib/tutorBrief/tutorBrief.security.test.ts` | stale | earlier `setTeacher((current)` in file broke indexOf order | Scope clear/updater indices inside `setActiveClassId` |
| 28 | P2 E1 hamburger class switch: setActiveClassId before refreshChrome/go | `src/lib/tutorBrief/tutorBrief.security.test.ts` | stale | `eb61ff23` (`go(\`/admin/class/${klass.id}\`, true)`) | Match new go target; order setActiveClassId → refresh → go |

## Security spot-check (not regressions)

- `create_class` / `link_parent_student`: `officeOnly: true` in askToolPolicy; run paths still `if (!isOfficeRole(ctx.profile)) return { error: … }`; SQL migrations office-only unchanged.
- `allowed()` still denies via `isAskToolAllowed` before tool defs are offered.
- ChromeProvider still uses `resolveStaffChromeRole` (no `isTeacherRole` force-to-teacher).
- `explain.manage` matrix row remains superintendent/administrator/student `none`, teacher/parent `own`.
