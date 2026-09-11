import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { prepareAskStudentBirthday } from './askStudentBirthday.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const now = new Date('2026-09-10T12:00:00.000Z');

test('prepareAskStudentBirthday: valid loose/ISO → set ISO (Ask update_student path)', () => {
  assert.deepEqual(prepareAskStudentBirthday('Mar 14 2017', now), {
    action: 'set',
    value: '2017-03-14',
  });
  assert.deepEqual(prepareAskStudentBirthday('2017-03-14', now), {
    action: 'set',
    value: '2017-03-14',
  });
  assert.deepEqual(prepareAskStudentBirthday('3/14/2017', now), {
    action: 'set',
    value: '2017-03-14',
  });
});

test('prepareAskStudentBirthday: empty → skip (no patchStudentMetadata)', () => {
  assert.deepEqual(prepareAskStudentBirthday('', now), { action: 'skip' });
  assert.deepEqual(prepareAskStudentBirthday('   ', now), { action: 'skip' });
});

test('prepareAskStudentBirthday: invalid or out-of-range → error (no write)', () => {
  const bad = prepareAskStudentBirthday('sometime in spring', now);
  assert.equal(bad.action, 'error');
  if (bad.action === 'error') assert.match(bad.error, /valid birthday/i);

  const tooOld = prepareAskStudentBirthday('1990-03-14', now);
  assert.equal(tooOld.action, 'error');

  const tooYoung = prepareAskStudentBirthday('2025-09-10', now);
  assert.equal(tooYoung.action, 'error');
});

test('askTools update_student wires prepareAskStudentBirthday before patch', () => {
  const ask = readFileSync(join(root, 'src/lib/ai/askTools.ts'), 'utf8');
  assert.match(ask, /prepareAskStudentBirthday/);
  const toolStart = ask.indexOf('update_student: {');
  const toolEnd = ask.indexOf('create_class:', toolStart);
  assert.ok(toolStart > 0 && toolEnd > toolStart);
  const tool = ask.slice(toolStart, toolEnd);
  const prep = tool.indexOf('prepareAskStudentBirthday(');
  const patch = tool.indexOf("patchStudentMetadata(next, key, prep.value)");
  assert.ok(prep > 0 && patch > prep, 'prepareAskStudentBirthday must guard before patch');
  assert.match(tool, /if \(prep\.action === 'error'\) return \{ error: prep\.error \}/);
  assert.match(tool, /if \(prep\.action === 'skip'\) continue/);
});
