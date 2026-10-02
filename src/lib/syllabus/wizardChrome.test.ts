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
  assert.match(wiz, /of \{steps\.length\} —/);
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
  // Action tray owns icons + slide-into-system-tray-spot motion.
  assert.match(wiz, /syllabusInterview/);
  assert.match(wiz, /slideIntoTraySpot/);
  assert.match(wiz, /styles\.actionTray/);
  assert.match(wiz, /chevronBg/);
  assert.match(wiz, /accessibilityLabel=\"Continue\"/);
  // Even outer gaps: equal-width side slots + centered mid cluster (Save/Publish inside mid).
  assert.match(wiz, /styles\.sideSlot/);
  assert.match(wiz, /styles\.midCluster/);
  assert.doesNotMatch(wiz, /styles\.rightCluster/);
  assert.doesNotMatch(wiz, /styles\.midIcons/);
  assert.match(wiz, /sideSlot:\s*\{[^}]*width:\s*40/s);
  assert.match(wiz, /midCluster:\s*\{[^}]*justifyContent:\s*'center'/s);
  // Save draft / Publish live in midCluster (between chevrons), not glued to ›.
  const midIdx = wiz.indexOf('styles.midCluster');
  const saveIdx = wiz.indexOf("accessibilityLabel={busy ? 'Saving…' : 'Save draft'}");
  const continueIdx = wiz.indexOf('accessibilityLabel="Continue"');
  assert.ok(midIdx > 0 && saveIdx > midIdx && saveIdx < continueIdx);
  // Nav circles: primary brand fill (PrimaryButton token); identical when both enabled.
  assert.match(wiz, /chevronBg = c\.brand/);
  assert.match(wiz, /chevronBorder = c\.brand/);
  assert.match(wiz, /chevronInk = c\.brandInk/);
  assert.doesNotMatch(wiz, /chevronBg = c\.elevated/);
  // Stack on measured system tray height + safe bottom — never trayRestLift
  // (chrome.trayRest already includes syllabusActionTrayHeight when bump is on).
  assert.match(wiz, /systemTrayBottom/);
  assert.match(wiz, /systemTrayHeight/);
  assert.match(wiz, /systemTrayBottom \+ systemTrayHeight \+ stackGap/);
  assert.match(wiz, /slideIntoTraySpot = stacked \? systemTrayHeight \+ stackGap/);
  // Positioning must not read the lifted trayRest (comment may still name it).
  assert.doesNotMatch(wiz, /bottom = stacked \? chromeState\.trayRest/);
  assert.doesNotMatch(wiz, /chromeState\.trayRest \+/);
  assert.match(wiz, /status\?: string \| null/);
  assert.match(wiz, /error\?: string \| null/);
  assert.match(chromeProv, /syllabusActionTrayHeight/);
  // #389 separate action tray: Save draft is no longer under a tray bump overlay.
  assert.match(chromeProv, /bumpExtra = trayBump \? chrome\.syllabusActionTrayHeight \+ 12 : 0/);
  assert.match(wiz, /zIndex: 17/);
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
  assert.match(wiz, /styles\.float/);
  assert.match(wiz, /styles\.actionTray/);
  assert.match(wiz, /stackGap = 12/);
  assert.match(wiz, /backgroundColor: 'transparent'/);
  assert.doesNotMatch(wiz, /float:[^}]*backgroundColor:\s*c\./);
  assert.match(tray, /styles\.float/);
  assert.match(tray, /styles\.frame/);
  assert.match(tray, /backgroundColor: 'transparent'/);
  assert.doesNotMatch(tray, /float:[^}]*backgroundColor:\s*colors\./);
  // Syllabus hosts nav on a full-bleed transparent overlay (no band between trays).
  assert.match(ui, /styles\.navHost/);
  assert.match(ui, /backgroundColor: 'transparent'/);
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
