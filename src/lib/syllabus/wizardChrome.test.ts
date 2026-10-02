/**
 * Syllabus wizard chrome unit checks — badges, action tray, scroll slide.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createEmptyWizardDraft, setWizardStep, visibleSteps } from '../../components/syllabus/wizardModel.ts';
import {
  isStepContinued,
  markStepContinued,
  mergeBadgeMaps,
} from './stepBadgeStore.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('badge map marks Continue only; merge keeps visit greens', () => {
  let d = createEmptyWizardDraft('c1');
  d = { ...d, engine: 'total_points' };
  const steps = visibleSteps(d);
  assert.ok(steps.length >= 5);
  const painted = markStepContinued({}, steps[0]!);
  assert.equal(isStepContinued(painted, steps[0]!), true);
  assert.equal(isStepContinued(painted, steps[1]!), false);
  const m = mergeBadgeMaps({ engine: true }, { drops: true });
  assert.deepEqual(m, { engine: true, drops: true });
  // Tab tap (setWizardStep) does not touch the map.
  d = setWizardStep(d, 'review');
  assert.equal(d.step, 'review');
  assert.equal(isStepContinued({}, 'review'), false);
});

test('wizardPersonTabs wires numbered stepMark from map', () => {
  const wiz = read('src/components/syllabus/SyllabusWizard.tsx');
  assert.match(wiz, /stepMark: \{ n: i \+ 1, done: isStepContinued\(continued, id\) \}/);
  assert.match(wiz, /export function SyllabusWizardNav/);
  assert.match(wiz, /WizardActionTray/);
  assert.match(wiz, /!canSaveDraft\(draft\)/);
  assert.match(wiz, /!canFinishReview\(draft\)/);
  assert.match(wiz, /showSave = !published && !last/);
  assert.match(wiz, /showPublish = last/);
  // Feedback must live on the action tray — scroll body is under the fold on phone.
  assert.match(wiz, /status\?: string \| null/);
  assert.match(wiz, /error\?: string \| null/);
});

test('screen pins step row; separate action tray hosts nav + import icons', () => {
  const ui = read('src/app/class/[id]/syllabus.tsx');
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  const wiz = read('src/components/syllabus/SyllabusWizard.tsx');
  const action = read('src/components/wizard/WizardActionTray.tsx');
  const body = read('src/components/syllabus/WizardStepBody.tsx');
  const person = read('src/components/ui/PersonTabs.tsx');
  const chromeProv = read('src/lib/chrome/ChromeProvider.tsx');
  const screen = read('src/components/ui/Screen.tsx');
  assert.match(ui, /pin=\{stepTabs\}/);
  assert.doesNotMatch(ui, /sticky=\{stickyNav\}/);
  assert.match(ui, /classId=\{id\}/);
  assert.match(ui, /\{stickyNav\}/);
  assert.match(ui, /status=\{status\}/);
  assert.match(ui, /error=\{error\}/);
  // Step change (< > tray + tabs) snaps body ScrollView to top — no animated fight.
  assert.match(ui, /stepScrollRef = useRef<ScrollView>\(null\)/);
  assert.match(ui, /scrollRef=\{stepScrollRef\}/);
  assert.match(ui, /scrollTo\(\{\s*y:\s*0,\s*animated:\s*false\s*\}\)/);
  assert.match(ui, /\[draft\?\.step\]/);
  // id may arrive as string[] from expo-router — coerce before RPC.
  assert.match(ui, /Array\.isArray\(idParam\) \? idParam\[0\] : idParam/);
  assert.match(ui, /plainSyllabusWriteError/);
  assert.doesNotMatch(ui, /collapse=\{/);
  assert.doesNotMatch(ui, /Answer a few questions instead/);
  assert.match(ui, /setTrayBump\(true\)/);
  assert.match(ui, /markStepContinued/);
  assert.match(ui, /saveStepBadges/);
  // System tray no longer hosts the syllabus bump.
  assert.doesNotMatch(tray, /styles\.bump/);
  assert.doesNotMatch(tray, /showSyllabusBump/);
  assert.doesNotMatch(tray, /syllabusInterview/);
  // Shared action tray owns icons + slide-into-system-tray-spot motion.
  assert.match(wiz, /syllabusInterview/);
  assert.match(wiz, /WizardActionTray/);
  assert.match(action, /slideIntoTraySpot/);
  assert.match(action, /styles\.actionTray/);
  assert.match(action, /chevronBg/);
  assert.match(action, /accessibilityLabel="Continue"/);
  // Even tray peers: space-evenly row; no sideSlot/midCluster re-clustering.
  assert.match(action, /justifyContent:\s*'space-evenly'/);
  assert.doesNotMatch(action, /styles\.sideSlot/);
  assert.doesNotMatch(action, /styles\.midCluster/);
  assert.doesNotMatch(action, /styles\.rightCluster/);
  assert.doesNotMatch(action, /styles\.midIcons/);
  // Pill shrinks before gaps (no fixed minWidth crowding ›).
  assert.match(action, /mid:\s*\{[^}]*flexShrink:\s*1/s);
  assert.match(action, /mid:\s*\{[^}]*paddingHorizontal:\s*8/s);
  assert.doesNotMatch(action, /mid:\s*\{[^}]*minWidth:\s*104/s);
  // Save draft / Publish sit between icons and › as peers.
  const backIdx = action.indexOf('accessibilityLabel="Back"');
  const saveIdx = action.indexOf("accessibilityLabel={busy ? 'Saving…' : 'Save draft'}");
  const continueIdx = action.indexOf('accessibilityLabel="Continue"');
  assert.ok(backIdx > 0 && saveIdx > backIdx && saveIdx < continueIdx);
  // Nav circles: primary brand fill (PrimaryButton token); identical when both enabled.
  assert.match(action, /chevronBg = c\.brand/);
  assert.match(action, /chevronBorder = c\.brand/);
  assert.match(action, /chevronInk = c\.brandInk/);
  assert.doesNotMatch(action, /chevronBg = c\.elevated/);
  // Stack on measured system tray height + safe bottom — never trayRestLift
  // (chrome.trayRest already includes syllabusActionTrayHeight when bump is on).
  assert.match(action, /systemTrayBottom/);
  assert.match(action, /systemTrayHeight/);
  assert.match(action, /systemTrayBottom \+ systemTrayHeight \+ stackGap/);
  assert.match(action, /slideIntoTraySpot = stacked \? systemTrayHeight \+ stackGap/);
  // Positioning must not read the lifted trayRest (comment may still name it).
  assert.doesNotMatch(action, /bottom = stacked \? chromeState\.trayRest/);
  assert.doesNotMatch(action, /chromeState\.trayRest \+/);
  assert.match(action, /status\?: string \| null/);
  assert.match(action, /error\?: string \| null/);
  assert.match(chromeProv, /syllabusActionTrayHeight/);
  // #389 separate action tray: Save draft is no longer under a tray bump overlay.
  assert.match(chromeProv, /bumpExtra = trayBump \? chrome\.syllabusActionTrayHeight \+ 12 : 0/);
  assert.match(action, /zIndex: 17/);
  // Floating trays: scroll content pads bottom; FlushBody outer pad is always 0
  // so no opaque band clips content above action/system trays app-wide.
  assert.match(screen, /flushBottomPad = 0/);
  assert.match(screen, /paddingBottom=\{flushBottomPad\}/);
  assert.match(screen, /Math\.min\(16, paddingBottom\)/);
  assert.match(screen, /useScrollBottomPad/);
  assert.match(screen, /styles\.stickyHost/);
  assert.match(screen, /styles\.stickyPlate/);
  assert.doesNotMatch(screen, /styles\.bar\b/);
  // iOS KAV only while keyboard is up — residual padding was an opaque tray-gap band.
  assert.match(screen, /enabled=\{keyboardUp\}/);
  assert.match(screen, /backgroundColor: 'transparent'/);
  // Floating trays: wrappers transparent; only rounded cards paint elevated fill.
  assert.match(action, /styles\.float/);
  assert.match(action, /styles\.actionTray/);
  assert.match(action, /stackGap = 12/);
  assert.match(action, /backgroundColor: 'transparent'/);
  assert.doesNotMatch(action, /float:[^}]*backgroundColor:\s*c\./);
  assert.match(tray, /styles\.float/);
  assert.match(tray, /styles\.frame/);
  assert.match(tray, /backgroundColor: 'transparent'/);
  assert.doesNotMatch(tray, /float:[^}]*backgroundColor:\s*colors\./);
  // Syllabus hosts nav on a full-bleed transparent overlay (no band between trays).
  assert.match(ui, /styles\.navHost/);
  assert.match(ui, /backgroundColor: 'transparent'/);
  // Shared step swipe (LTR/RTL) — same handlers as tray ‹ › + first-step stack pop.
  assert.match(ui, /WizardStepSwipe/);
  assert.match(ui, /onBackStep=\{onBack\}/);
  assert.match(ui, /onNextStep=\{onContinue\}/);
  assert.match(ui, /onPopStack/);
  assert.doesNotMatch(body, /One choice\. The line under/);
  assert.match(person, /stepMark\?:/);
  assert.match(person, /StepMarkBadge/);
  // Step marks: Messages danger red / goodSoft fills, black numeral (not soft wash + colored ink).
  assert.match(
    person,
    /CountBadge count=\{mark\.n\} tone=\{mark\.done \? 'goodSoft' : 'danger'\} blackInk/,
  );
  assert.match(person, /glyphBadgeHost/);
  assert.doesNotMatch(person, /styles\.stepMark/);
  const badge = read('src/components/ui/CountBadge.tsx');
  assert.match(badge, /CountBadgeTone/);
  assert.match(badge, /blackInk/);
  assert.match(badge, /STEP_MARK_INK/);
  assert.match(badge, /goodSoft/);
  // Default Messages pip stays solid danger (same red step marks use when pending).
  assert.match(badge, /let backgroundColor = colors\.danger/);
});

test('interview glyph recipe exists and is registered', () => {
  const icons = read('scripts/build-icons.mjs');
  const assets = read('src/components/ui/iconAssets.ts');
  const iconTs = read('src/components/ui/Icon.tsx');
  assert.match(icons, /syllabusInterview:/);
  assert.match(assets, /syllabusInterview/);
  assert.match(iconTs, /'syllabusInterview'/);
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/icons/syllabusInterview.png')));
});
