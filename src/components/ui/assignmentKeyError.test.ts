import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..', '..', '..');
const form = fs.readFileSync(path.join(root, 'src/components/ui/AssignmentForm.tsx'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'src/app/class/[id]/assignment/[assignmentId].tsx'), 'utf8');
const aiDev = fs.readFileSync(path.join(root, 'scripts/ai-dev-server.mjs'), 'utf8');

test('ASSIGN-INGEST: key read/reject error renders beside the key photo in danger color', () => {
  assert.match(form, /keyError\?: string \| null/);
  assert.match(form, /accessibilityRole="alert" style=\{\[type\.meta, \{ color: colors\.danger \}\]\}/);
  assert.match(editor, /keyError=\{keyError\}/);
  assert.match(editor, /setKeyError\(err instanceof Error \? err\.message : 'Could not read that key photo'\)/);
  assert.doesNotMatch(editor, /setStatus\(err instanceof Error \? err\.message : 'Could not read that key photo'\)/);
});

test('ASSIGN-INGEST: rejected key surfaces the model reason with a Not an answer key lead', () => {
  assert.match(editor, /`Not an answer key — \$\{analysis\.teacherNote\}`/);
  // no doubled lead when the server note already says it
  assert.match(editor, /\/\^not an answer key\/i\.test\(analysis\.teacherNote\)/);
});

test('ASSIGN-INGEST: ai:dev strips an echoed answer off a filled-key stem', () => {
  // b4031f94: STEM rules live in shared aiPrompts + anskeySanitize; ai:dev calls finalizeAnswerKeyAnalysis.
  const prompts = fs.readFileSync(path.join(root, 'supabase/functions/_shared/aiPrompts.ts'), 'utf8');
  const sanitize = fs.readFileSync(path.join(root, 'supabase/functions/_shared/anskeySanitize.mjs'), 'utf8');
  assert.match(prompts, /STEM vs ANSWER: stem is the printed question only/);
  assert.match(sanitize, /stem\.endsWith\(answer\)/);
  assert.match(aiDev, /finalizeAnswerKeyAnalysis/);
});
