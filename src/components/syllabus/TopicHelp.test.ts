/**
 * Syllabus inline help uses the shared "?" popover standard (no "Help on …" text buttons).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('syllabus TopicHelp standard', () => {
  test('shared TopicHelp module exports hit + pop + label', () => {
    const src = read('src/components/syllabus/TopicHelp.tsx');
    assert.match(src, /export function TopicHelpHit/);
    assert.match(src, /export function TopicHelpPop/);
    assert.match(src, /export function TopicHelpLabel/);
    assert.match(src, /export function useTopicHelp/);
    assert.match(src, /accessibilityLabel=\{`Help for \$\{label\}`\}/);
    assert.match(src, /\?/);
  });

  test('wizard shell uses TopicHelp for step headings', () => {
    const wiz = read('src/components/syllabus/SyllabusWizard.tsx');
    assert.match(wiz, /useTopicHelp\(STEP_HELP_KEYS\[step\]/);
    assert.match(wiz, /TopicHelpHit/);
    assert.match(wiz, /TopicHelpPop/);
    assert.doesNotMatch(wiz, /getBundledHelpTopic/);
  });

  test('no Help-on text buttons remain in step bodies; excused uses TopicHelpLabel', () => {
    const body = read('src/components/syllabus/WizardStepBody.tsx');
    assert.doesNotMatch(body, /Help on /);
    assert.doesNotMatch(body, /Hide .* help/);
    assert.match(body, /topicKey="help\.excused"/);
    assert.match(body, /title="Excused"/);
    // Section labels on multi-topic steps
    assert.match(body, /topicKey="help\.missing"/);
    assert.match(body, /topicKey="help\.late"/);
    assert.match(body, /topicKey="help\.extra_credit_b"/);
    assert.match(body, /topicKey="help\.drop_lowest"/);
  });
});
