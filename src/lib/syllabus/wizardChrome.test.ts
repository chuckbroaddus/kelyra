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
  assert.match(wiz, /status\?: string \| null/);
  assert.match(wiz, /error\?: string \| null/);
  assert.match(chromeProv, /syllabusActionTrayHeight/);
  // #389 separate action tray: Save draft is no longer under a tray bump overlay.
  assert.match(chromeProv, /bumpExtra = trayBump \? chrome\.syllabusActionTrayHeight \+ 8 : 0/);
  assert.match(wiz, /zIndex: 17/);
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
