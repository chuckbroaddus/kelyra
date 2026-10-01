/**
 * School template picker + describe + handoff + syllabus chrome wiring.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  describeAllSchoolSyllabusTemplates,
  describeSchoolSyllabusTemplate,
} from './templateDescribe.ts';
import {
  putSyllabusTemplateHandoff,
  takeSyllabusTemplateHandoff,
} from './templateHandoff.ts';
import { listSchoolSyllabusTemplates } from './templates.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

test('describeSchoolSyllabusTemplate derives verbose lines from payload', () => {
  const list = listSchoolSyllabusTemplates();
  assert.equal(list.length, 3);
  const cards = describeAllSchoolSyllabusTemplates(list);
  assert.equal(cards.length, 3);

  const hw = list.find((t) => t.key === 'homework_cap_10')!;
  const text = describeSchoolSyllabusTemplate(hw);
  assert.match(text, /Grading engine:/);
  assert.match(text, /Categories & weights:/);
  assert.match(text, /Homework 10%/);
  assert.match(text, /drop lowest 1/i);
  assert.match(text, /weight capped at 10%/);
  assert.match(text, /Late work:.*per day/i);
  assert.match(text, /Missing work is left out/);
  assert.match(text, /Extra credit:/);
  assert.match(text, /Retakes:/);
  assert.match(text, /Periods:/);
  assert.match(text, /Rounding:/);

  const tx = list.find((t) => t.key === 'texas_70_retake_cap')!;
  const txText = describeSchoolSyllabusTemplate(tx);
  assert.match(txText, /Retakes: on/);
  assert.match(txText, /Cap at 70%/);
  assert.match(txText, /Lowest grade allowed \(floor\): 50%/);
});

test('template handoff is one-shot and class-scoped', () => {
  assert.equal(takeSyllabusTemplateHandoff('class-a'), null);
  putSyllabusTemplateHandoff('class-a', 'spring_isd_50_50');
  putSyllabusTemplateHandoff('class-b', 'homework_cap_10');
  assert.equal(takeSyllabusTemplateHandoff('class-a'), 'spring_isd_50_50');
  assert.equal(takeSyllabusTemplateHandoff('class-a'), null);
  assert.equal(takeSyllabusTemplateHandoff('class-b'), 'homework_cap_10');
});

test('syllabusTemplate icon recipe + assets land', () => {
  const recipes = read('scripts/build-icons.mjs');
  const assetsTs = read('src/components/ui/iconAssets.ts');
  const iconTs = read('src/components/ui/Icon.tsx');
  assert.match(recipes, /syllabusTemplate:\s*\(p\)\s*=>/);
  assert.match(assetsTs, /'syllabusTemplate':\s*syllabusTemplate/);
  assert.match(iconTs, /\| 'syllabusTemplate'/);
  assert.equal(existsSync(join(root, 'assets/icons/syllabusTemplate.png')), true);
});

test('syllabus screen: template icon right of capture; no chips/title/back/live preview', () => {
  const ui = read('src/app/class/[id]/syllabus.tsx');
  const wizard = read('src/components/syllabus/SyllabusWizard.tsx');
  const picker = read('src/app/class/[id]/syllabus-templates.tsx');
  const layout = read('src/app/class/[id]/_layout.tsx');

  assert.doesNotMatch(ui, /Grading Syllabus/);
  assert.doesNotMatch(ui, /Back to settings/);
  assert.doesNotMatch(ui, /Start from a school template<\/Text>/);
  assert.doesNotMatch(ui, /ChipRow|from '@\/components\/ui\/Chip'/);
  assert.doesNotMatch(ui, /sample grades update/);
  assert.match(ui, /name=\"capture\"/);
  assert.match(ui, /name=\"syllabusTemplate\"/);
  assert.match(ui, /styles\.iconPair/);
  assert.match(ui, /syllabus-templates/);
  assert.match(ui, /takeSyllabusTemplateHandoff/);
  assert.match(ui, /applyTemplateToDraft/);

  // Capture appears before template icon in source.
  const cap = ui.indexOf('name="capture"');
  const tpl = ui.indexOf('name="syllabusTemplate"');
  assert.ok(cap >= 0 && tpl > cap);

  assert.doesNotMatch(wizard, /What the rules do/);
  assert.doesNotMatch(wizard, /LivePreview|runLivePreview|livePreview/);
  assert.equal(existsSync(join(root, 'src/components/syllabus/livePreview.ts')), false);

  assert.match(picker, /accessibilityRole=\"radiogroup\"/);
  assert.match(picker, /accessibilityRole=\"radio\"/);
  assert.match(picker, /label=\"Cancel\"/);
  assert.match(picker, /label=\"Select\"/);
  assert.match(picker, /disabled=\{!selected\}/);
  assert.match(picker, /putSyllabusTemplateHandoff/);
  assert.match(picker, /describeSchoolSyllabusTemplate/);

  assert.match(layout, /name=\"syllabus-templates\"/);
});
